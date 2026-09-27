const { getDb } = require('./database');

function computeDiscount(coupon, subtotal, freteAtual) {
  if (subtotal < (coupon.minSubtotal || 0)) {
    return { valid: false, reason: `Válido a partir de R$ ${coupon.minSubtotal.toFixed(2)} em produtos.` };
  }
  if (coupon.type === 'percent') {
    return { valid: true, discount: +(subtotal * (coupon.value / 100)).toFixed(2), freteDiscount: 0 };
  }
  if (coupon.type === 'fixed') {
    return { valid: true, discount: Math.min(coupon.value, subtotal), freteDiscount: 0 };
  }
  if (coupon.type === 'frete') {
    const freteDiscount = Math.min(freteAtual || 0, freteAtual * (coupon.value / 100));
    return { valid: true, discount: 0, freteDiscount: +freteDiscount.toFixed(2) };
  }
  return { valid: false, reason: 'Tipo de cupom desconhecido.' };
}

function findActiveCoupon(code) {
  const row = getDb().prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(code).toUpperCase());
  if (!row) return null;
  return { code: row.code, description: row.description, type: row.type, value: row.value, minSubtotal: row.min_subtotal };
}

module.exports = { computeDiscount, findActiveCoupon };
