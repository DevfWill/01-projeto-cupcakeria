const express = require('express');
const { getDb } = require('../utils/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.created_at };
}

// HU21 - Como administrador, quero gerenciar contas de clientes
// (ativar, bloquear, editar).
router.get('/', requireAdmin, (req, res) => {
  const rows = getDb().prepare("SELECT * FROM users WHERE role = 'cliente' ORDER BY id").all();
  res.json(rows.map(publicUser));
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }
  if (existing.role === 'admin') {
    return res.status(400).json({ error: 'Não é possível editar uma conta de administrador por aqui.' });
  }

  const { name, email, status } = req.body || {};
  if (status && !['ativo', 'bloqueado'].includes(status)) {
    return res.status(400).json({ error: 'Status deve ser "ativo" ou "bloqueado".' });
  }

  db.prepare('UPDATE users SET name = ?, email = ?, status = ? WHERE id = ?').run(
    name || existing.name,
    email ? email.toLowerCase() : existing.email,
    status || existing.status,
    id
  );

  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

module.exports = router;
