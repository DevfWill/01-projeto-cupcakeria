const crypto = require('crypto');

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(plainPassword, storedHash) {
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

module.exports = { hashPassword, verifyPassword };
