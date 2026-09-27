const express = require('express');
const { getDb } = require('../utils/database');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createToken, revokeToken } = require('../utils/tokenStore');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return {
    id: rest.id, name: rest.name, email: rest.email, role: rest.role,
    status: rest.status, createdAt: rest.created_at
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// HU13 - Como cliente, quero criar uma conta para salvar meus dados e
// agilizar futuras compras.
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Informe seu nome.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });
  }

  const db = getDb();
  const emailLower = email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLower);
  if (existing) {
    return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
  }

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'cliente', 'ativo')
  `).run(name.trim(), emailLower, hashPassword(password));

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = createToken(newUser.id);
  res.status(201).json({ token, user: publicUser(newUser) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  if (user.status === 'bloqueado') {
    return res.status(403).json({ error: 'Esta conta está bloqueada. Entre em contato com o suporte.' });
  }

  const token = createToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (token) revokeToken(token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

module.exports = router;
