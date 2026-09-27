const express = require('express');
const { getDb } = require('../utils/database');
const { getProductById, listProducts, setAllergens, setKitItems } = require('../utils/productRepo');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// HU02 - Como cliente, quero filtrar cupcakes por sabores.
// GET /api/products?flavor=chocolate&category=individual&inStock=true
router.get('/', (req, res) => {
  try {
    const { flavor, category, inStock } = req.query;
    res.json(listProducts({ flavor, category, inStock }));
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar o catálogo de cupcakes.' });
  }
});

// Lista os sabores distintos disponíveis, para montar o filtro (HU02)
router.get('/flavors', (req, res) => {
  const db = getDb();
  const flavors = db.prepare('SELECT DISTINCT flavor FROM products ORDER BY flavor').all().map(r => r.flavor);
  res.json(flavors);
});

// HU03 - informações nutricionais e alergênicas + detalhe do produto
router.get('/:id', (req, res) => {
  const product = getProductById(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Cupcake não encontrado.' });
  }
  res.json(product);
});

function validateProductPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push('Nome é obrigatório.');
  }
  if (!partial || body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price <= 0) errors.push('Preço deve ser um número maior que zero.');
  }
  if (!partial || body.image !== undefined) {
    // RN#1: Cada produto deve ter foto obrigatório
    if (!body.image || !String(body.image).trim()) errors.push('Foto (nome do arquivo de imagem) é obrigatória.');
  }
  if (!partial || body.flavor !== undefined) {
    if (!body.flavor || !String(body.flavor).trim()) errors.push('Sabor é obrigatório.');
  }
  return errors;
}

// HU16 - Como administrador, quero cadastrar novos cupcakes com fotos,
// preços e descrições.
router.post('/', requireAdmin, (req, res) => {
  const errors = validateProductPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const db = getDb();
  const n = req.body.nutritionalInfo || {};
  const category = req.body.category === 'kit' ? 'kit' : 'individual';

  const result = db.prepare(`
    INSERT INTO products (name, flavor, category, price, description, image, alt, stock_quantity,
                           kcal, carboidratos_g, acucares_g, gorduras_g, proteinas_g)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.body.name.trim(), req.body.flavor.trim(), category, req.body.price,
    req.body.description || '', req.body.image.trim(), req.body.alt || req.body.name.trim(),
    Number.isFinite(req.body.stockQuantity) ? req.body.stockQuantity : 0,
    n.kcal ?? null, n.carboidratos_g ?? null, n.acucares_g ?? null, n.gorduras_g ?? null, n.proteinas_g ?? null
  );

  const newId = result.lastInsertRowid;
  if (Array.isArray(req.body.allergens)) setAllergens(newId, req.body.allergens);
  if (Array.isArray(req.body.kitItems)) setKitItems(newId, req.body.kitItems);

  res.status(201).json(getProductById(newId));
});

// HU16/HU17 - editar cadastro e/ou estoque de um cupcake existente
router.put('/:id', requireAdmin, (req, res) => {
  const errors = validateProductPayload(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Cupcake não encontrado.' });
  }

  const merged = { ...existing, ...req.body };
  const n = merged.nutritionalInfo || {};
  const db = getDb();
  db.prepare(`
    UPDATE products SET name=?, flavor=?, category=?, price=?, description=?, image=?, alt=?,
           stock_quantity=?, kcal=?, carboidratos_g=?, acucares_g=?, gorduras_g=?, proteinas_g=?
    WHERE id=?
  `).run(
    merged.name, merged.flavor, merged.category, merged.price, merged.description, merged.image, merged.alt,
    merged.stockQuantity, n.kcal ?? null, n.carboidratos_g ?? null, n.acucares_g ?? null, n.gorduras_g ?? null,
    n.proteinas_g ?? null, id
  );

  if (Array.isArray(req.body.allergens)) setAllergens(id, req.body.allergens);
  if (Array.isArray(req.body.kitItems)) setKitItems(id, req.body.kitItems);

  res.json(getProductById(id));
});

// HU17 - Como administrador, quero gerenciar estoque para controlar
// disponibilidade dos produtos.
router.patch('/:id/stock', requireAdmin, (req, res) => {
  const { stockQuantity } = req.body || {};
  if (typeof stockQuantity !== 'number' || stockQuantity < 0) {
    return res.status(400).json({ error: 'Informe uma quantidade de estoque válida (>= 0).' });
  }

  const id = Number(req.params.id);
  const db = getDb();
  const result = db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(stockQuantity, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Cupcake não encontrado.' });
  }
  res.json(getProductById(id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Cupcake não encontrado.' });
  }
  try {
    getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json(existing);
  } catch (err) {
    res.status(409).json({ error: 'Não é possível excluir: este cupcake já foi usado em pedidos ou avaliações.' });
  }
});

module.exports = router;
