const { getDb } = require('../utils/database');
const { getUserIdFromToken } = require('../utils/tokenStore');

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// Preenche req.user quando um token válido é enviado, mas NÃO bloqueia
// a requisição — útil para rotas públicas que mudam de comportamento
// quando o usuário está logado.
function attachUser(req, res, next) {
  const token = getTokenFromHeader(req);
  if (token) {
    const userId = getUserIdFromToken(token);
    if (userId) {
      const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (user && user.status === 'ativo') {
        req.user = user;
      }
    }
  }
  next();
}

// Exige login válido
function requireAuth(req, res, next) {
  attachUser(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'É necessário fazer login para continuar.' });
    }
    next();
  });
}

// Exige login válido E papel de administrador
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    next();
  });
}

module.exports = { attachUser, requireAuth, requireAdmin };
