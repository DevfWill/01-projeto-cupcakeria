// HU09 - Como cliente, quero acompanhar o status do meu pedido.
// HU10 - Como cliente, quero receber notificações por e-mail ou WhatsApp.

const STATUS_LABELS = {
  recebido: 'Recebido',
  preparando: 'Em preparação',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const STATUS_STEPS = ['recebido', 'preparando', 'saiu_para_entrega', 'entregue'];

function renderOrderCard(order) {
  const itemsHtml = order.items.map(item => `
    <div class="muted">${item.qty}x ${item.name} — ${formatPrice(item.lineTotal)}
      ${item.customization ? `<em>(${[item.customization.message, item.customization.color].filter(Boolean).join(', ')})</em>` : ''}
    </div>
  `).join('');

  const timelineHtml = order.statusHistory.map(h => `
    <div class="muted">${STATUS_LABELS[h.status] || h.status} — ${new Date(h.date).toLocaleString('pt-BR')}</div>
  `).join('');

  return `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <strong>Pedido #${order.id}</strong>
        <span class="order-status ${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
      </div>
      <p class="muted">Feito em ${new Date(order.createdAt).toLocaleString('pt-BR')} · Entrega prevista: ${order.deliveryDate}</p>
      <div style="margin:10px 0;">${itemsHtml}</div>
      <div class="summary-line"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
      ${order.discount ? `<div class="summary-line"><span>Desconto (${order.couponCode})</span><span>- ${formatPrice(order.discount)}</span></div>` : ''}
      <div class="summary-line"><span>Frete</span><span>${formatPrice(order.frete)}</span></div>
      <div class="summary-line total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;">Histórico do pedido</summary>
        <div style="margin-top:6px;">${timelineHtml}</div>
      </details>
    </div>
  `;
}

async function loadOrders() {
  const statusEl = document.getElementById('orders-status');
  const listEl = document.getElementById('orders-list');

  if (!Auth.isLoggedIn()) {
    statusEl.textContent = '';
    listEl.innerHTML = '<p class="empty-state">Faça <a href="conta.html">login</a> para ver seus pedidos.</p>';
    return;
  }

  try {
    const orders = await api('/orders/my');
    if (orders.length === 0) {
      listEl.innerHTML = '<p class="empty-state">Você ainda não fez nenhum pedido. <a href="index.html">Ver catálogo</a></p>';
    } else {
      listEl.innerHTML = orders.map(renderOrderCard).join('');
    }
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = 'Não foi possível carregar seus pedidos.';
  }
}

async function loadNotifications() {
  if (!Auth.isLoggedIn()) return;
  try {
    const notifications = await api('/notifications/my');
    if (notifications.length === 0) return;
    document.getElementById('notifications-panel').hidden = false;
    document.getElementById('notifications-list').innerHTML = notifications.map(n => `
      <div class="muted" style="padding:6px 0;border-bottom:1px solid var(--color-border);">
        <strong>${n.channel === 'email' ? '📧 E-mail' : '📱 WhatsApp'}</strong> — ${n.message}
        <div style="font-size:0.78rem;">${new Date(n.createdAt).toLocaleString('pt-BR')}</div>
      </div>
    `).join('');
  } catch (err) {
    // silencioso: notificações são um extra, não bloqueia a página
  }
}

renderNav('pedidos');
loadOrders();
loadNotifications();
