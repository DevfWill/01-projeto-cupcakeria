const express = require('express');
const { getDb } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// HU10 - Como cliente, quero receber notificações por e-mail ou WhatsApp.
// Como não integramos um provedor externo real, o cliente confere aqui as
// notificações que teriam sido enviadas.
router.get('/my', requireAuth, (req, res) => {
  const rows = getDb().prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY datetime(created_at) DESC
  `).all(req.user.id);
  res.json(rows.map(r => ({ id: r.id, userId: r.user_id, channel: r.channel, message: r.message, createdAt: r.created_at })));
});

module.exports = router;
