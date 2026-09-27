// HU03 - informações nutricionais e alergênicas
// HU12 - personalizar cupcakes com mensagens/cores
// HU14 - avaliar cupcakes comprados

const params = new URLSearchParams(location.search);
const productId = Number(params.get('id'));

const statusEl = document.getElementById('product-status');
const detailEl = document.getElementById('product-detail');
const reviewsSection = document.getElementById('reviews-section');
const reviewFormWrap = document.getElementById('review-form-wrap');

let currentProduct = null;

function renderProduct(product) {
  currentProduct = product;
  const inStock = product.stockQuantity > 0;

  const allergensHtml = product.allergens && product.allergens.length
    ? `<p class="muted"><strong>Contém:</strong> ${product.allergens.join(', ')}</p>`
    : '';

  const nutritionalHtml = product.nutritionalInfo ? `
    <table class="data-table" style="max-width:360px;">
      <tbody>
        <tr><th>Calorias</th><td>${product.nutritionalInfo.kcal} kcal</td></tr>
        <tr><th>Carboidratos</th><td>${product.nutritionalInfo.carboidratos_g} g</td></tr>
        <tr><th>Açúcares</th><td>${product.nutritionalInfo.acucares_g} g</td></tr>
        <tr><th>Gorduras</th><td>${product.nutritionalInfo.gorduras_g} g</td></tr>
        <tr><th>Proteínas</th><td>${product.nutritionalInfo.proteinas_g} g</td></tr>
      </tbody>
    </table>
  ` : '';

  const isKit = product.category === 'kit';
  const customizationHtml = !isKit ? `
    <div class="form-row two-cols" style="margin-top:14px;">
      <div class="form-group">
        <label for="custom-message">Mensagem personalizada (opcional)</label>
        <input type="text" id="custom-message" maxlength="60" placeholder="Ex: Feliz aniversário!">
      </div>
      <div class="form-group">
        <label for="custom-color">Cor da cobertura (opcional)</label>
        <select id="custom-color">
          <option value="">Padrão da receita</option>
          <option value="rosa">Rosa</option>
          <option value="azul">Azul</option>
          <option value="branco">Branco</option>
          <option value="dourado">Dourado</option>
        </select>
      </div>
    </div>
  ` : '<p class="muted">Kits prontos vêm com a decoração padrão da casa.</p>';

  detailEl.innerHTML = `
    <div class="panel" style="display:grid;grid-template-columns:1fr;gap:20px;">
      <div class="cupcake-photo-wrap" id="detail-photo-wrap" style="border-radius:12px;max-width:420px;">
        <img src="images/${product.image}" alt="${product.alt || product.name}" class="cupcake-photo" id="detail-photo">
      </div>
      <div>
        <span class="cupcake-flavor-tag">${product.flavor}</span>
        <h2 style="margin:6px 0;">${product.name}</h2>
        <p>${product.description}</p>
        <p class="cupcake-price" style="font-size:1.4rem;">${formatPrice(product.price)}</p>
        <p>${inStock ? `<span class="stock-badge in-stock">Disponível (${product.stockQuantity} un.)</span>` : '<span class="stock-badge out-of-stock">Esgotado</span>'}</p>

        ${nutritionalHtml}
        ${allergensHtml}
        ${customizationHtml}

        <div class="qty-input" style="margin-top:14px;">
          <button type="button" id="qty-minus">−</button>
          <input type="number" id="qty-value" value="1" min="1" max="${Math.max(product.stockQuantity, 1)}">
          <button type="button" id="qty-plus">+</button>
        </div>

        <button id="add-to-cart-btn" class="btn btn-primary" style="margin-top:14px;" ${inStock ? '' : 'disabled'}>
          ${inStock ? 'Adicionar ao carrinho' : 'Esgotado'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('detail-photo').addEventListener('error', () => {
    const wrap = document.getElementById('detail-photo-wrap');
    wrap.classList.add('photo-missing');
    wrap.innerHTML = `<span class="photo-missing-msg">Foto de "${product.name}" ainda não foi adicionada.<br>Veja o README para baixar as imagens.</span>`;
  });

  document.getElementById('qty-minus').addEventListener('click', () => {
    const input = document.getElementById('qty-value');
    input.value = Math.max(1, Number(input.value) - 1);
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    const input = document.getElementById('qty-value');
    input.value = Math.min(product.stockQuantity, Number(input.value) + 1);
  });
  document.getElementById('qty-value').addEventListener('change', (e) => {
    const clamped = Math.min(product.stockQuantity, Math.max(1, Number(e.target.value) || 1));
    e.target.value = clamped;
  });

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const qty = Number(document.getElementById('qty-value').value) || 1;
    let customization = null;
    if (!isKit) {
      const message = document.getElementById('custom-message').value.trim();
      const color = document.getElementById('custom-color').value;
      if (message || color) customization = { message: message || undefined, color: color || undefined };
    }
    Cart.add(product, qty, customization);
    const btn = document.getElementById('add-to-cart-btn');
    btn.textContent = 'Adicionado ✓';
    setTimeout(() => { btn.textContent = 'Adicionar ao carrinho'; }, 1200);
  });
}

function starString(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

async function loadReviews() {
  const data = await api(`/reviews/${productId}`, { auth: false });
  reviewsSection.hidden = false;

  const summaryEl = document.getElementById('reviews-summary');
  summaryEl.textContent = data.count > 0
    ? `${data.average} de 5 · ${data.count} avaliação(ões)`
    : 'Ainda não há avaliações para este cupcake.';

  const listEl = document.getElementById('reviews-list');
  listEl.innerHTML = data.reviews.map(r => `
    <div style="padding:10px 0;border-bottom:1px solid var(--color-border);">
      <span class="stars">${starString(r.rating)}</span>
      <strong style="margin-left:6px;">${r.userName}</strong>
      ${r.comment ? `<p style="margin:4px 0 0;">${r.comment}</p>` : ''}
    </div>
  `).join('') || '';

  if (!Auth.isLoggedIn()) {
    reviewFormWrap.innerHTML = '<p class="muted">Faça <a href="conta.html">login</a> para avaliar este cupcake (só é possível avaliar cupcakes que você já comprou).</p>';
  }
}

document.getElementById('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('review-alert');
  alertEl.innerHTML = '';

  try {
    await api('/reviews', {
      method: 'POST',
      body: {
        productId,
        rating: Number(document.getElementById('review-rating').value),
        comment: document.getElementById('review-comment').value.trim()
      }
    });
    alertEl.innerHTML = '<div class="alert alert-success">Avaliação enviada, obrigado!</div>';
    document.getElementById('review-form').reset();
    await loadReviews();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

async function init() {
  if (!productId) {
    statusEl.textContent = 'Cupcake não especificado.';
    return;
  }
  try {
    const product = await api(`/products/${productId}`, { auth: false });
    renderProduct(product);
    statusEl.hidden = true;
    detailEl.hidden = false;
    await loadReviews();
  } catch (err) {
    statusEl.textContent = err.status === 404 ? 'Cupcake não encontrado.' : 'Erro ao carregar o cupcake.';
  }
}

renderNav('catalogo');
init();
