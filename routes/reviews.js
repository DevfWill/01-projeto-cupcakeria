const express = require('express');
const { getDb } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// HU14 - Como cliente, quero avaliar os cupcakes que comprei.
router.post('/', requireAuth, (req, res) => {
  const { productId, rating, comment } = req.body || {};
  const pid = Number(productId);
  const stars = Number(rating);
  const db = getDb();

  if (!pid) {
    return res.status(400).json({ error: 'Informe o produto avaliado.' });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'A nota deve ser um número inteiro de 1 a 5.' });
  }

  // Só pode avaliar cupcakes que já comprou
  const hasPurchased = db.prepare(`
    SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ? AND oi.product_id = ? LIMIT 1
  `).get(req.user.id, pid);
  if (!hasPurchased) {
    return res.status(403).json({ error: 'Você só pode avaliar cupcakes que já comprou.' });
  }

  const alreadyReviewed = db.prepare('SELECT 1 FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, pid);
  if (alreadyReviewed) {
    return res.status(409).json({ error: 'Você já avaliou este cupcake.' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)
  `).run(pid, req.user.id, stars, comment ? String(comment).slice(0, 300) : '', now);

  res.status(201).json({
    id: result.lastInsertRowid, productId: pid, userId: req.user.id, userName: req.user.name,
    rating: stars, comment: comment || '', createdAt: now
  });
});

router.get('/:productId', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? ORDER BY datetime(r.created_at) DESC
  `).all(Number(req.params.productId));

  const reviews = rows.map(r => ({
    id: r.id, productId: r.product_id, userId: r.user_id, userName: r.user_name,
    rating: r.rating, comment: r.comment, createdAt: r.created_at
  }));
  const average = reviews.length ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;
  res.json({ reviews, average, count: reviews.length });
});

module.exports = router;
