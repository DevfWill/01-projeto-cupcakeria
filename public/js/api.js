// Módulo compartilhado por todas as páginas: chamadas à API, sessão do
// usuário (token salvo no localStorage) e carrinho de compras.

const Auth = {
  getToken() {
    return localStorage.getItem('cupcakeria_token');
  },
  getUser() {
    const raw = localStorage.getItem('cupcakeria_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('cupcakeria_token', token);
    localStorage.setItem('cupcakeria_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('cupcakeria_token');
    localStorage.removeItem('cupcakeria_user');
  },
  isLoggedIn() {
    return Boolean(this.getToken());
  },
  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  }
};

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.getToken()) {
    headers.Authorization = `Bearer ${Auth.getToken()}`;
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.error) || `Erro ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

const Cart = {
  KEY: 'cupcakeria_cart',
  get() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  },
  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },
  add(product, qty = 1, customization = null) {
    const items = this.get();
    const existing = items.find(i => i.productId === product.id && !i.customization && !customization);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty,
        ...(customization ? { customization } : {})
      });
    }
    this.save(items);
  },
  updateQty(index, qty) {
    const items = this.get();
    if (qty <= 0) {
      items.splice(index, 1);
    } else {
      items[index].qty = qty;
    }
    this.save(items);
  },
  remove(index) {
    const items = this.get();
    items.splice(index, 1);
    this.save(items);
  },
  clear() {
    this.save([]);
  },
  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },
  subtotal() {
    return +this.get().reduce((sum, i) => sum + i.price * i.qty, 0).toFixed(2);
  },
  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = this.count();
      badge.textContent = count;
      badge.hidden = count === 0;
    }
  }
};

function formatPrice(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Monta o cabeçalho de navegação, igual em todas as páginas.
function renderNav(activePage) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const user = Auth.getUser();
  const accountLabel = user ? user.name.split(' ')[0] : 'Entrar';

  nav.innerHTML = `
    <a href="index.html" class="${activePage === 'catalogo' ? 'active' : ''}">Catálogo</a>
    <a href="carrinho.html" class="${activePage === 'carrinho' ? 'active' : ''}">
      Carrinho <span id="cart-badge" class="cart-badge" hidden>0</span>
    </a>
    <a href="pedidos.html" class="${activePage === 'pedidos' ? 'active' : ''}">Meus pedidos</a>
    <a href="conta.html" class="${activePage === 'conta' ? 'active' : ''}">${accountLabel}</a>
    ${Auth.isAdmin() ? `<a href="admin.html" class="${activePage === 'admin' ? 'active' : ''}">Admin</a>` : ''}
  `;
  Cart.updateBadge();
}

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
});
