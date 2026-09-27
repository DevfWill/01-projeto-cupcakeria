process.env.CUPCAKERIA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const { withServer } = require('./testUtils');

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function json(res) {
  const body = await res.json();
  return body;
}

test('fluxo completo do backlog (HU01 a HU21)', async () => {
  await withServer(app, async (base) => {
    const email = `maria.${Date.now()}@teste.com`;

    // --- HU13: cadastro de cliente ---
    let res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maria Cliente', email, password: 'senha123' })
    });
    assert.strictEqual(res.status, 201, 'cadastro deve funcionar');
    const registerBody = await json(res);
    const customerToken = registerBody.token;
    assert.ok(customerToken);

    // e-mail duplicado deve falhar
    res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maria Duplicada', email, password: 'outrasenha' })
    });
    assert.strictEqual(res.status, 409);

    // --- HU13: login ---
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'senha123' })
    });
    assert.strictEqual(res.status, 200);

    const authHeader = { Authorization: `Bearer ${customerToken}` };

    // --- HU02: filtrar por sabor ---
    res = await fetch(`${base}/api/products?flavor=chocolate`);
    const chocolateProducts = await json(res);
    assert.ok(chocolateProducts.every(p => p.flavor.includes('chocolate')));
    assert.ok(chocolateProducts.length >= 1);

    // --- HU03: informações nutricionais e alergênicas ---
    res = await fetch(`${base}/api/products/1`);
    const product1 = await json(res);
    assert.ok(product1.nutritionalInfo, 'produto deve ter informação nutricional');
    assert.ok(Array.isArray(product1.allergens) && product1.allergens.length > 0);
    const stockBefore = product1.stockQuantity;

    // --- HU08: kit pronto existe no catálogo ---
    res = await fetch(`${base}/api/products?category=kit`);
    const kits = await json(res);
    assert.ok(kits.length >= 1, 'deve haver ao menos 1 kit pronto (HU08)');

    // --- HU04: listar cupons ativos ---
    res = await fetch(`${base}/api/coupons`);
    const coupons = await json(res);
    assert.ok(coupons.some(c => c.code === 'BEMVINDO10'));

    // validar cupom
    res = await fetch(`${base}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BEMVINDO10', subtotal: 100, frete: 15 })
    });
    const validated = await json(res);
    assert.strictEqual(validated.discount, 10);

    // --- HU07: calcular frete por CEP ---
    res = await fetch(`${base}/api/frete/calc?cep=01310-100`);
    const frete = await json(res);
    assert.ok(frete.price > 0);
    assert.strictEqual(frete.cep, '01310100');

    // CEP inválido
    res = await fetch(`${base}/api/frete/calc?cep=123`);
    assert.strictEqual(res.status, 400);

    // --- HU05/HU06/HU07/HU08/HU11/HU12: criar pedido ---
    res = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        items: [
          { productId: 1, qty: 2 },
          { productId: 9, qty: 1, customization: { message: 'Parabéns!', color: 'rosa' } }
        ],
        cep: '01310-100',
        address: 'Rua das Flores, 123',
        deliveryDate: tomorrow(),
        paymentMethod: 'pix',
        couponCode: 'BEMVINDO10'
      })
    });
    assert.strictEqual(res.status, 201, 'pedido deve ser criado');
    const order = await json(res);
    assert.strictEqual(order.status, 'recebido');
    assert.ok(order.total > 0);
    assert.strictEqual(order.items[1].customization.message, 'Parabéns!');

    // estoque deve ter sido decrementado (HU17 ligado ao pedido)
    res = await fetch(`${base}/api/products/1`);
    const product1After = await json(res);
    assert.strictEqual(product1After.stockQuantity, stockBefore - 2);

    // pedido sem CEP deve falhar
    res = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ items: [{ productId: 1, qty: 1 }], address: 'X', deliveryDate: tomorrow(), paymentMethod: 'pix' })
    });
    assert.strictEqual(res.status, 400);

    // --- HU09: acompanhar meus pedidos ---
    res = await fetch(`${base}/api/orders/my`, { headers: authHeader });
    const myOrders = await json(res);
    assert.ok(myOrders.some(o => o.id === order.id));

    // outro cliente não pode ver o pedido
    res = await fetch(`${base}/api/orders/${order.id}`);
    assert.strictEqual(res.status, 401);

    // --- login como administrador ---
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cupcakeria.com', password: 'admin123' })
    });
    assert.strictEqual(res.status, 200);
    const adminBody = await json(res);
    const adminHeader = { Authorization: `Bearer ${adminBody.token}` };

    // --- HU19: admin lista e atualiza status do pedido ---
    res = await fetch(`${base}/api/orders`, { headers: adminHeader });
    const allOrders = await json(res);
    assert.ok(allOrders.some(o => o.id === order.id));

    res = await fetch(`${base}/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({ status: 'preparando' })
    });
    assert.strictEqual(res.status, 200);
    const updatedOrder = await json(res);
    assert.strictEqual(updatedOrder.status, 'preparando');
    assert.strictEqual(updatedOrder.statusHistory.length, 2);

    // cliente comum não pode alterar status
    res = await fetch(`${base}/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ status: 'entregue' })
    });
    assert.strictEqual(res.status, 403);

    // --- HU10: notificações simuladas recebidas pelo cliente ---
    res = await fetch(`${base}/api/notifications/my`, { headers: authHeader });
    const notifications = await json(res);
    assert.ok(notifications.length >= 2, 'deve ter notificação de pedido recebido + status atualizado');

    // --- HU14: avaliar cupcake comprado ---
    res = await fetch(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ productId: 1, rating: 5, comment: 'Delicioso!' })
    });
    assert.strictEqual(res.status, 201);

    // não pode avaliar duas vezes
    res = await fetch(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ productId: 1, rating: 4, comment: 'De novo' })
    });
    assert.strictEqual(res.status, 409);

    // não pode avaliar cupcake que não comprou
    res = await fetch(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ productId: 5, rating: 5, comment: 'Não comprei este' })
    });
    assert.strictEqual(res.status, 403);

    res = await fetch(`${base}/api/reviews/1`);
    const productReviews = await json(res);
    assert.strictEqual(productReviews.average, 5);

    // --- HU16: admin cadastra novo cupcake ---
    res = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({
        name: 'Cupcake de Maracujá', flavor: 'maracujá', price: 9.0,
        description: 'Novo sabor tropical.', image: 'cupcake-maracuja.jpg', stockQuantity: 10
      })
    });
    assert.strictEqual(res.status, 201);

    // sem foto deve falhar (RN#1)
    res = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({ name: 'Sem Foto', flavor: 'x', price: 5 })
    });
    assert.strictEqual(res.status, 400);

    // cliente comum não pode cadastrar produto
    res = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: 'Hack', flavor: 'x', price: 5, image: 'a.jpg' })
    });
    assert.strictEqual(res.status, 403);

    // --- HU17: admin atualiza estoque ---
    res = await fetch(`${base}/api/products/2/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({ stockQuantity: 99 })
    });
    assert.strictEqual(res.status, 200);
    const stockUpdated = await json(res);
    assert.strictEqual(stockUpdated.stockQuantity, 99);

    // --- HU18: admin cria cupom ---
    res = await fetch(`${base}/api/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({ code: 'TESTE20', description: '20% off', type: 'percent', value: 20 })
    });
    assert.strictEqual(res.status, 201);

    // --- HU20: relatório de vendas ---
    res = await fetch(`${base}/api/reports/sales`, { headers: adminHeader });
    const report = await json(res);
    assert.ok(report.totalOrders >= 1);
    assert.ok(report.totalRevenue >= order.total);
    assert.ok(Array.isArray(report.topProducts));

    // cliente comum não acessa relatórios
    res = await fetch(`${base}/api/reports/sales`, { headers: authHeader });
    assert.strictEqual(res.status, 403);

    // --- HU21: admin gerencia conta de cliente (bloquear) ---
    res = await fetch(`${base}/api/users`, { headers: adminHeader });
    const customers = await json(res);
    const maria = customers.find(u => u.email === email);
    assert.ok(maria);

    res = await fetch(`${base}/api/users/${maria.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeader },
      body: JSON.stringify({ status: 'bloqueado' })
    });
    assert.strictEqual(res.status, 200);

    // cliente bloqueado não consegue mais logar
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'senha123' })
    });
    assert.strictEqual(res.status, 403);
  });
});
