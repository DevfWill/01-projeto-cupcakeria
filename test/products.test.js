process.env.CUPCAKERIA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const { withServer } = require('./testUtils');

// HU01 - CA#1: Fotos visíveis em alta qualidade / CA#2: Cada produto tem ao menos 1 foto
test('GET /api/products retorna o catálogo com fotos (HU01)', async () => {
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/products`);
    assert.strictEqual(res.status, 200);

    const products = await res.json();
    assert.ok(Array.isArray(products), 'a resposta deve ser uma lista');
    assert.ok(products.length >= 1, 'o catálogo deve ter ao menos 1 cupcake (CA#2)');

    for (const product of products) {
      assert.ok(product.image && product.image.length > 0, `${product.name} deve ter uma foto (RN#1)`);
      assert.ok(product.name, 'cada cupcake deve ter nome');
      assert.strictEqual(typeof product.price, 'number', 'o preço deve ser numérico');
    }
  });
});

test('GET /api/products/:id retorna 404 para cupcake inexistente', async () => {
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/products/9999`);
    assert.strictEqual(res.status, 404);
  });
});

test('GET /api/products/:id retorna um cupcake específico', async () => {
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/products/1`);
    assert.strictEqual(res.status, 200);
    const product = await res.json();
    assert.strictEqual(product.id, 1);
  });
});
