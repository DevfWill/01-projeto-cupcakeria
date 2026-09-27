const crypto = require('crypto');

// Armazenamento simples de tokens em memória (suficiente para um projeto
// acadêmico rodando em um único processo). Reiniciar o servidor invalida
// as sessões — o usuário simplesmente faz login novamente.
const tokens = new Map(); // token -> userId

function createToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, userId);
  return token;
}

function getUserIdFromToken(token) {
  return tokens.get(token);
}

function revokeToken(token) {
  tokens.delete(token);
}

module.exports = { createToken, getUserIdFromToken, revokeToken };
