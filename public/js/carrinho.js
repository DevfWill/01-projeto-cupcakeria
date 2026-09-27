// HU04 - cupons de desconto | HU05 - carrinho | HU06 - pagamento
// HU07 - frete por CEP | HU11 - data de entrega | HU12 - personalização

let appliedCoupon = null;
let freteInfo = null;

function renderCartItems() {
  const items = Cart.get();
  const panel = document.getElementById('cart-items-panel');

  if (items.length === 0) {
    document.getElementById('cart-empty').hidden = false;
    document.getElementById('cart-content').hidden = true;
    return;
  }

  document.getElementById('cart-empty').hidden = true;
  document.getElementById('cart-content').hidden = false;

  panel.innerHTML = items.map((item, index) => `
    <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--color-border);">
      <img src="images/${item.image}" alt="${item.name}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;background:#fbeef1;"
           onerror="this.style.display='none'">
      <div style="flex:1;min-width:0;">
        <strong>${item.name}</strong>
        ${item.customization ? `<div class="muted">${[item.customization.message ? `"${item.customization.message}"` : '', item.customization.color ? `cor: ${item.customization.color}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="muted">${formatPrice(item.price)} cada</div>
      </div>
      <div class="qty-input">
        <button type="button" data-action="minus" data-index="${index}">−</button>
        <span>${item.qty}</span>
        <button type="button" data-action="plus" data-index="${index}">+</button>
      </div>
      <button type="button" class="link-btn" data-action="remove" data-index="${index}">Remover</button>
    </div>
  `).join('');

  panel.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      const items = Cart.get();
      if (btn.dataset.action === 'minus') Cart.updateQty(index, items[index].qty - 1);
      if (btn.dataset.action === 'plus') Cart.updateQty(index, items[index].qty + 1);
      if (btn.dataset.action === 'remove') Cart.remove(index);
      renderCartItems();
      renderSummary();
    });
  });
}

// Recalcula o desconto do cupom aplicado com base no subtotal/frete atuais
// (evita mostrar um valor de desconto "congelado" se o cliente mudar as
// quantidades do carrinho depois de aplicar o cupom).
function recomputeAppliedCoupon(subtotal, freteBase) {
  if (!appliedCoupon) return { discount: 0, freteDiscount: 0 };

  if (subtotal < (appliedCoupon.minSubtotal || 0)) {
    document.getElementById('coupon-alert').innerHTML =
      `<div class="alert alert-error">O cupom "${appliedCoupon.code}" não se aplica mais (pedido mínimo de ${formatPrice(appliedCoupon.minSubtotal)}).</div>`;
    appliedCoupon = null;
    return { discount: 0, freteDiscount: 0 };
  }

  if (appliedCoupon.type === 'percent') {
    return { discount: +(subtotal * (appliedCoupon.value / 100)).toFixed(2), freteDiscount: 0 };
  }
  if (appliedCoupon.type === 'fixed') {
    return { discount: Math.min(appliedCoupon.value, subtotal), freteDiscount: 0 };
  }
  if (appliedCoupon.type === 'frete') {
    const freteDiscount = Math.min(freteBase || 0, (freteBase || 0) * (appliedCoupon.value / 100));
    return { discount: 0, freteDiscount: +freteDiscount.toFixed(2) };
  }
  return { discount: 0, freteDiscount: 0 };
}

function renderSummary() {
  const subtotal = Cart.subtotal();
  const freteBase = freteInfo ? freteInfo.price : 0;
  const { discount, freteDiscount } = recomputeAppliedCoupon(subtotal, freteBase);
  const freteFinal = Math.max(0, freteBase - freteDiscount);
  const total = Math.max(0, subtotal - discount + freteFinal);

  document.getElementById('order-summary').innerHTML = `
    <div class="summary-line"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    ${appliedCoupon ? `<div class="summary-line"><span>Cupom (${appliedCoupon.code})</span><span>- ${formatPrice(discount)}</span></div>` : ''}
    <div class="summary-line"><span>Frete${freteInfo ? ` (${freteInfo.region})` : ''}</span><span>${freteInfo ? formatPrice(freteFinal) : 'calcule abaixo'}</span></div>
    <div class="summary-line total"><span>Total</span><span>${formatPrice(total)}</span></div>
  `;
}

document.getElementById('apply-coupon-btn').addEventListener('click', async () => {
  const alertEl = document.getElementById('coupon-alert');
  const code = document.getElementById('coupon-code').value.trim();
  if (!code) return;

  try {
    const result = await api('/coupons/validate', {
      method: 'POST',
      auth: false,
      body: { code, subtotal: Cart.subtotal(), frete: freteInfo ? freteInfo.price : 0 }
    });
    appliedCoupon = result;
    alertEl.innerHTML = `<div class="alert alert-success">Cupom "${result.code}" aplicado: ${result.description}</div>`;
    renderSummary();
  } catch (err) {
    appliedCoupon = null;
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    renderSummary();
  }
});

document.getElementById('calc-frete-btn').addEventListener('click', async () => {
  const resultEl = document.getElementById('frete-result');
  const cep = document.getElementById('cep-input').value.trim();
  if (!cep) return;

  try {
    const result = await api(`/frete/calc?cep=${encodeURIComponent(cep)}`, { auth: false });
    freteInfo = result;
    resultEl.hidden = false;
    resultEl.className = 'alert alert-info';
    resultEl.textContent = `Frete para ${result.region}: ${formatPrice(result.price)} (entrega em até ${result.estimatedDays} dia(s) útil(is))`;
    renderSummary();
  } catch (err) {
    freteInfo = null;
    resultEl.hidden = false;
    resultEl.className = 'alert alert-error';
    resultEl.textContent = err.message;
    renderSummary();
  }
});

document.getElementById('checkout-btn').addEventListener('click', async () => {
  const alertEl = document.getElementById('checkout-alert');
  alertEl.innerHTML = '';

  if (!Auth.isLoggedIn()) {
    alertEl.innerHTML = '<div class="alert alert-error">Você precisa <a href="conta.html">entrar ou criar uma conta</a> para finalizar o pedido.</div>';
    return;
  }
  if (!freteInfo) {
    alertEl.innerHTML = '<div class="alert alert-error">Calcule o frete informando seu CEP.</div>';
    return;
  }
  const address = document.getElementById('address-input').value.trim();
  if (!address) {
    alertEl.innerHTML = '<div class="alert alert-error">Informe o endereço de entrega.</div>';
    return;
  }
  const deliveryDate = document.getElementById('delivery-date').value;
  if (!deliveryDate) {
    alertEl.innerHTML = '<div class="alert alert-error">Escolha a data de entrega.</div>';
    return;
  }
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  const items = Cart.get().map(item => ({
    productId: item.productId,
    qty: item.qty,
    ...(item.customization ? { customization: item.customization } : {})
  }));

  try {
    const order = await api('/orders', {
      method: 'POST',
      body: {
        items,
        cep: document.getElementById('cep-input').value.trim(),
        address,
        deliveryDate,
        paymentMethod,
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {})
      }
    });

    Cart.clear();
    document.getElementById('cart-content').hidden = true;
    const successEl = document.getElementById('order-success');
    successEl.hidden = false;
    successEl.innerHTML = `
      <div class="alert alert-success">
        Pedido #${order.id} realizado com sucesso! Total: ${formatPrice(order.total)}.
        Entrega prevista para ${order.deliveryDate}.
      </div>
      <a href="pedidos.html" class="btn btn-primary">Acompanhar meu pedido</a>
    `;
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

function setMinDeliveryDate() {
  const input = document.getElementById('delivery-date');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  input.min = tomorrow.toISOString().slice(0, 10);
}

renderNav('carrinho');
setMinDeliveryDate();
renderCartItems();
renderSummary();
