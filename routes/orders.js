const express = require('express');
const { getDb } = require('../utils/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { calcularFrete } = require('./frete');
const { computeDiscount, findActiveCoupon } = require('../utils/coupons');
const { sendNotification } = require('../utils/notify');

const router = express.Router();

const VALID_STATUSES = ['recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado'];
const VALID_PAYMENTS = ['cartao', 'pix'];

function isFutureDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

function fullOrder(db, orderRow) {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderRow.id).map(i => ({
    productId: i.product_id,
    name: i.product_name,
    unitPrice: i.unit_price,
    qty: i.qty,
    lineTotal: i.line_total,
    ...(i.customization_message || i.customization_color
      ? { customization: { message: i.customization_message || undefined, color: i.customization_color || undefined } }
      : {})
  }));
  const statusHistory = db.prepare('SELECT status, changed_at AS date FROM order_status_history WHERE order_id = ? ORDER BY id').all(orderRow.id);

  return {
    id: orderRow.id,
    userId: orderRow.user_id,
    items,
    subtotal: orderRow.subtotal,
    couponCode: orderRow.coupon_code,
    discount: orderRow.discount,
    frete: orderRow.frete,
    freteRegion: orderRow.frete_region,
    total: orderRow.total,
    cep: orderRow.cep,
    address: orderRow.address,
    deliveryDate: orderRow.delivery_date,
    paymentMethod: orderRow.payment_method,
    status: orderRow.status,
    statusHistory,
    createdAt: orderRow.created_at
  };
}

// HU05/HU06/HU07/HU08/HU11/HU12 - criação do pedido a partir do carrinho
router.post('/', requireAuth, (req, res) => {
  const { items, cep, address, deliveryDate, paymentMethod, couponCode } = req.body || {};
  const db = getDb();

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'O carrinho está vazio.' });
  }
  if (!cep) {
    return res.status(400).json({ error: 'Informe o CEP para calcular o frete (HU07).' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ error: 'Informe o endereço de entrega.' });
  }
  if (!deliveryDate || !isFutureDate(deliveryDate)) {
    return res.status(400).json({ error: 'Escolha uma data de entrega válida (hoje ou uma data futura).' });
  }
  if (!VALID_PAYMENTS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Forma de pagamento deve ser "cartao" ou "pix".' });
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(item.productId));
    if (!product) {
      return res.status(400).json({ error: `Produto ${item.productId} não encontrado.` });
    }
    const qty = Number(item.qty) || 0;
    if (qty <= 0) {
      return res.status(400).json({ error: `Quantidade inválida para "${product.name}".` });
    }
    if (product.stock_quantity < qty) {
      return res.status(409).json({ error: `Estoque insuficiente para "${product.name}" (disponível: ${product.stock_quantity}).` });
    }

    // HU12 - Como cliente, quero personalizar cupcakes com mensagens ou cores específicas.
    const customization = item.customization && (item.customization.message || item.customization.color)
      ? { message: item.customization.message ? String(item.customization.message).slice(0, 60) : null, color: item.customization.color || null }
      : { message: null, color: null };

    const lineTotal = +(product.price * qty).toFixed(2);
    subtotal += lineTotal;

    orderItems.push({ productId: product.id, name: product.name, unitPrice: product.price, qty, lineTotal, customization });
  }
  subtotal = +subtotal.toFixed(2);

  // HU07 - frete calculado pelo CEP
  const freteInfo = calcularFrete(cep);
  if (!freteInfo) {
    return res.status(400).json({ error: 'CEP inválido. Use o formato 00000-000.' });
  }

  // HU04 - aplicação de cupom de desconto, se informado
  let discount = 0;
  let freteDiscount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = findActiveCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'Cupom inválido ou expirado.' });
    }
    const result = computeDiscount(coupon, subtotal, freteInfo.price);
    if (!result.valid) {
      return res.status(400).json({ error: result.reason });
    }
    discount = result.discount;
    freteDiscount = result.freteDiscount;
    appliedCoupon = coupon.code;
  }

  const freteFinal = +Math.max(0, freteInfo.price - freteDiscount).toFixed(2);
  const total = +Math.max(0, subtotal - discount + freteFinal).toFixed(2);

  // Transação: baixa de estoque + criação do pedido, tudo ou nada.
  const now = new Date().toISOString();
  let orderId;

  db.exec('BEGIN');
  try {
    for (const item of orderItems) {
      db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.qty, item.productId);
    }

    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, subtotal, coupon_code, discount, frete, frete_region, total,
                           cep, address, delivery_date, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recebido', ?)
    `).run(req.user.id, subtotal, appliedCoupon, discount, freteFinal, freteInfo.region, total,
      freteInfo.cep, String(address).trim(), deliveryDate, paymentMethod, now);
    orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, qty, line_total,
                                customization_message, customization_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of orderItems) {
      insertItem.run(orderId, item.productId, item.name, item.unitPrice, item.qty, item.lineTotal,
        item.customization.message, item.customization.color);
    }

    db.prepare(`INSERT INTO order_status_history (order_id, status, changed_at) VALUES (?, 'recebido', ?)`).run(orderId, now);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Não foi possível concluir o pedido. Tente novamente.' });
  }

  // HU10 - notificação simulada de confirmação do pedido
  sendNotification({
    userId: req.user.id,
    channel: 'email',
    message: `Pedido #${orderId} recebido! Total: R$ ${total.toFixed(2)}. Entrega prevista para ${deliveryDate}.`
  });

  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.status(201).json(fullOrder(db, orderRow));
});

// HU09 - Como cliente, quero acompanhar o status do meu pedido (histórico)
router.get('/my', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC').all(req.user.id);
  res.json(rows.map(row => fullOrder(db, row)));
});

// HU19 - Como administrador, quero acompanhar e atualizar o status dos pedidos.
router.get('/', requireAdmin, (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (req.query.status) {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY datetime(created_at) DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(row => fullOrder(db, row)));
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Você não tem acesso a este pedido.' });
  }
  res.json(fullOrder(db, row));
});

// HU19 - atualização de status pelo administrador (+ HU10 notificação)
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status deve ser um de: ${VALID_STATUSES.join(', ')}.` });
  }

  const db = getDb();
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  db.prepare('INSERT INTO order_status_history (order_id, status, changed_at) VALUES (?, ?, ?)').run(id, status, now);

  const STATUS_LABELS = {
    recebido: 'recebido', preparando: 'em preparação', saiu_para_entrega: 'saiu para entrega',
    entregue: 'entregue', cancelado: 'cancelado'
  };
  sendNotification({
    userId: row.user_id,
    channel: 'whatsapp',
    message: `Seu pedido #${row.id} agora está: ${STATUS_LABELS[status]}.`
  });

  res.json(fullOrder(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
});

module.exports = router;
