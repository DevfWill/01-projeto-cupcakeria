// HU16 - cadastrar cupcakes | HU17 - gerenciar estoque
// HU18 - cupons e promoções | HU19 - status de pedidos
// HU20 - relatórios de vendas | HU21 - gerenciar clientes

const STATUS_LABELS = {
  recebido: 'Recebido',
  preparando: 'Em preparação',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- Produtos & Estoque (HU16/HU17) ----------
async function loadProducts() {
  const products = await api('/products', { auth: false });
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.flavor}</td>
      <td>${p.category}</td>
      <td>${formatPrice(p.price)}</td>
      <td>
        <div class="qty-input">
          <input type="number" min="0" value="${p.stockQuantity}" data-id="${p.id}" class="stock-input" style="width:64px;">
          <button type="button" class="btn btn-sm btn-secondary save-stock-btn" data-id="${p.id}">Salvar</button>
        </div>
      </td>
      <td></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.save-stock-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const input = tbody.querySelector(`.stock-input[data-id="${id}"]`);
      try {
        await api(`/products/${id}/stock`, { method: 'PATCH', body: { stockQuantity: Number(input.value) } });
        btn.textContent = 'Salvo ✓';
        setTimeout(() => { btn.textContent = 'Salvar'; }, 1200);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('product-form-alert');
  try {
    await api('/products', {
      method: 'POST',
      body: {
        name: document.getElementById('p-name').value.trim(),
        flavor: document.getElementById('p-flavor').value.trim(),
        category: document.getElementById('p-category').value,
        price: Number(document.getElementById('p-price').value),
        description: document.getElementById('p-description').value.trim(),
        image: document.getElementById('p-image').value.trim(),
        stockQuantity: Number(document.getElementById('p-stock').value) || 0,
        allergens: document.getElementById('p-allergens').value
          .split(',').map(s => s.trim()).filter(Boolean)
      }
    });
    alertEl.innerHTML = '<div class="alert alert-success">Cupcake cadastrado com sucesso!</div>';
    document.getElementById('product-form').reset();
    await loadProducts();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

// ---------- Pedidos (HU19) ----------
async function loadOrders() {
  const status = document.getElementById('order-status-filter').value;
  const orders = await api(`/orders${status ? `?status=${status}` : ''}`);
  const customers = await api('/users');
  const nameById = Object.fromEntries(customers.map(c => [c.id, c.name]));

  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${nameById[o.userId] || `cliente #${o.userId}`}</td>
      <td>${formatPrice(o.total)}</td>
      <td>${o.deliveryDate}</td>
      <td><span class="order-status ${o.status}">${STATUS_LABELS[o.status]}</span></td>
      <td>
        <div class="qty-input">
          <select data-id="${o.id}" class="status-select">
            ${Object.entries(STATUS_LABELS).map(([value, label]) =>
              `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm btn-secondary save-status-btn" data-id="${o.id}">Salvar</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="muted">Nenhum pedido encontrado.</td></tr>';

  tbody.querySelectorAll('.save-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const select = tbody.querySelector(`.status-select[data-id="${id}"]`);
      try {
        await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: select.value } });
        btn.textContent = 'Salvo ✓';
        setTimeout(() => loadOrders(), 600);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.getElementById('order-status-filter').addEventListener('change', loadOrders);

// ---------- Cupons (HU18) ----------
async function loadCoupons() {
  const coupons = await api('/coupons/admin/all');
  const tbody = document.querySelector('#coupons-table tbody');
  tbody.innerHTML = coupons.map(c => `
    <tr>
      <td>${c.code}</td>
      <td>${c.description}</td>
      <td>${c.type}</td>
      <td>${c.type === 'fixed' ? formatPrice(c.value) : `${c.value}%`}</td>
      <td>${c.active ? 'Ativo' : 'Inativo'}</td>
      <td><button type="button" class="btn btn-sm btn-danger delete-coupon-btn" data-code="${c.code}">Excluir</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-coupon-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Excluir o cupom ${btn.dataset.code}?`)) return;
      await api(`/coupons/${btn.dataset.code}`, { method: 'DELETE' });
      await loadCoupons();
    });
  });
}

document.getElementById('coupon-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('coupon-form-alert');
  try {
    await api('/coupons', {
      method: 'POST',
      body: {
        code: document.getElementById('c-code').value.trim(),
        type: document.getElementById('c-type').value,
        value: Number(document.getElementById('c-value').value),
        minSubtotal: Number(document.getElementById('c-min').value) || 0,
        description: document.getElementById('c-description').value.trim()
      }
    });
    alertEl.innerHTML = '<div class="alert alert-success">Cupom criado!</div>';
    document.getElementById('coupon-form').reset();
    await loadCoupons();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

// ---------- Clientes (HU21) ----------
async function loadCustomers() {
  const customers = await api('/users');
  const tbody = document.querySelector('#customers-table tbody');
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.status === 'ativo' ? 'Ativo' : 'Bloqueado'}</td>
      <td>
        <button type="button" class="btn btn-sm ${c.status === 'ativo' ? 'btn-danger' : 'btn-secondary'} toggle-status-btn"
                data-id="${c.id}" data-next="${c.status === 'ativo' ? 'bloqueado' : 'ativo'}">
          ${c.status === 'ativo' ? 'Bloquear' : 'Ativar'}
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="muted">Nenhum cliente cadastrado ainda.</td></tr>';

  tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api(`/users/${btn.dataset.id}`, { method: 'PATCH', body: { status: btn.dataset.next } });
      await loadCustomers();
    });
  });
}

// ---------- Relatórios (HU20) ----------
document.getElementById('report-generate-btn').addEventListener('click', async () => {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  const report = await api(`/reports/sales?${query.toString()}`);

  document.getElementById('report-summary').innerHTML = `
    <div class="summary-line"><span>Receita total</span><span>${formatPrice(report.totalRevenue)}</span></div>
    <div class="summary-line"><span>Total de pedidos</span><span>${report.totalOrders}</span></div>
    <div class="summary-line total"><span>Ticket médio</span><span>${formatPrice(report.averageTicket)}</span></div>
  `;

  document.querySelector('#top-products-table tbody').innerHTML = report.topProducts.map(p => `
    <tr><td>${p.name}</td><td>${p.qty}</td><td>${formatPrice(p.revenue)}</td></tr>
  `).join('') || '<tr><td colspan="3" class="muted">Sem vendas no período.</td></tr>';

  document.querySelector('#revenue-by-day-table tbody').innerHTML = report.revenueByDay.map(d => `
    <tr><td>${d.date}</td><td>${formatPrice(d.total)}</td></tr>
  `).join('') || '<tr><td colspan="2" class="muted">Sem vendas no período.</td></tr>';
});

// ---------- Inicialização ----------
async function init() {
  renderNav('admin');
  if (!Auth.isAdmin()) {
    document.getElementById('admin-denied').hidden = false;
    return;
  }
  document.getElementById('admin-content').hidden = false;
  await Promise.all([loadProducts(), loadOrders(), loadCoupons(), loadCustomers()]);
  document.getElementById('report-generate-btn').click();
}

init();
