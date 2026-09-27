const express = require('express');
const { getDb } = require('../utils/database');
const { requireAdmin } = require('../middleware/auth');
const { computeDiscount, findActiveCoupon } = require('../utils/coupons');

const router = express.Router();

function toCoupon(row) {
  return {
    code: row.code, description: row.description, type: row.type,
    value: row.value, active: Boolean(row.active), minSubtotal: row.min_subtotal
  };
}

// HU04 - Como cliente, quero acessar promoções e cupons de desconto.
router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM coupons WHERE active = 1').all();
  res.json(rows.map(toCoupon));
});

// Usado no carrinho/checkout para validar e calcular o desconto em tempo real.
router.post('/validate', (req, res) => {
  const { code, subtotal, frete } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Informe o código do cupom.' });
  }

  const coupon = findActiveCoupon(code);
  if (!coupon) {
    return res.status(404).json({ error: 'Cupom inválido ou expirado.' });
  }

  const result = computeDiscount(coupon, Number(subtotal) || 0, Number(frete) || 0);
  if (!result.valid) {
    return res.status(400).json({ error: result.reason });
  }

  res.json({
    code: coupon.code, description: coupon.description, type: coupon.type,
    value: coupon.value, minSubtotal: coupon.minSubtotal || 0, ...result
  });
});

// HU18 - Como administrador, quero criar e gerenciar promoções e cupons.
router.post('/', requireAdmin, (req, res) => {
  const { code, description, type, value, minSubtotal } = req.body || {};
  if (!code || !type || typeof value !== 'number') {
    return res.status(400).json({ error: 'Informe código, tipo e valor do cupom.' });
  }
  if (!['percent', 'fixed', 'frete'].includes(type)) {
    return res.status(400).json({ error: 'Tipo deve ser percent, fixed ou frete.' });
  }

  const db = getDb();
  const codeUpper = code.toUpperCase();
  const existing = db.prepare('SELECT code FROM coupons WHERE code = ?').get(codeUpper);
  if (existing) {
    return res.status(409).json({ error: 'Já existe um cupom com esse código.' });
  }

  db.prepare(`
    INSERT INTO coupons (code, description, type, value, active, min_subtotal) VALUES (?, ?, ?, ?, 1, ?)
  `).run(codeUpper, description || '', type, value, minSubtotal || 0);

  res.status(201).json(toCoupon(db.prepare('SELECT * FROM coupons WHERE code = ?').get(codeUpper)));
});

router.put('/:code', requireAdmin, (req, res) => {
  const db = getDb();
  const codeUpper = req.params.code.toUpperCase();
  const existing = db.prepare('SELECT * FROM coupons WHERE code = ?').get(codeUpper);
  if (!existing) {
    return res.status(404).json({ error: 'Cupom não encontrado.' });
  }

  const merged = { ...toCoupon(existing), ...req.body };
  db.prepare(`
    UPDATE coupons SET description=?, type=?, value=?, active=?, min_subtotal=? WHERE code=?
  `).run(merged.description, merged.type, merged.value, merged.active ? 1 : 0, merged.minSubtotal, codeUpper);

  res.json(toCoupon(db.prepare('SELECT * FROM coupons WHERE code = ?').get(codeUpper)));
});

router.delete('/:code', requireAdmin, (req, res) => {
  const db = getDb();
  const codeUpper = req.params.code.toUpperCase();
  const existing = db.prepare('SELECT * FROM coupons WHERE code = ?').get(codeUpper);
  if (!existing) {
    return res.status(404).json({ error: 'Cupom não encontrado.' });
  }
  db.prepare('DELETE FROM coupons WHERE code = ?').run(codeUpper);
  res.json(toCoupon(existing));
});

// Admin lista todos (inclusive inativos)
router.get('/admin/all', requireAdmin, (req, res) => {
  res.json(getDb().prepare('SELECT * FROM coupons').all().map(toCoupon));
});

module.exports = router;
