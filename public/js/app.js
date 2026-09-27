// HU01 - Como cliente, quero visualizar fotos dos cupcakes disponíveis.
// HU02 - Como cliente, quero filtrar cupcakes por sabores.
// HU05 - Como cliente, quero adicionar cupcakes ao carrinho.
// HU08 - Kits prontos aparecem misturados ao catálogo (categoria "kit").

const statusEl = document.getElementById('catalog-status');
const gridEl = document.getElementById('catalog-grid');
const filterEl = document.getElementById('flavor-filter');

let allProducts = [];
let activeFlavor = 'todos';

function createCupcakeCard(product) {
  const card = document.createElement('article');
  card.className = 'cupcake-card';

  const photoWrap = document.createElement('div');
  photoWrap.className = 'cupcake-photo-wrap';

  const link = document.createElement('a');
  link.href = `produto.html?id=${product.id}`;
  link.setAttribute('aria-label', `Ver detalhes de ${product.name}`);

  const img = document.createElement('img');
  img.className = 'cupcake-photo';
  img.src = `images/${product.image}`;
  img.alt = product.alt || product.name;
  img.loading = 'lazy';

  img.addEventListener('error', () => {
    photoWrap.classList.add('photo-missing');
    photoWrap.innerHTML = `<span class="photo-missing-msg">Foto de "${product.name}" ainda não foi adicionada.<br>Veja o README para baixar as imagens.</span>`;
  });

  link.appendChild(img);
  photoWrap.appendChild(link);

  const info = document.createElement('div');
  info.className = 'cupcake-info';

  const inStock = product.stockQuantity > 0;
  const stockLabel = inStock
    ? '<span class="stock-badge in-stock">Disponível</span>'
    : '<span class="stock-badge out-of-stock">Esgotado</span>';
  const kitLabel = product.category === 'kit' ? '<span class="cupcake-flavor-tag" style="background:#fff4d9;color:#916a00;margin-left:4px;">KIT</span>' : '';

  info.innerHTML = `
    <span class="cupcake-flavor-tag">${product.flavor}</span>${kitLabel}
    <h3><a href="produto.html?id=${product.id}" style="color:inherit;text-decoration:none;">${product.name}</a></h3>
    <p class="cupcake-desc">${product.description}</p>
    <div class="cupcake-footer">
      <span class="cupcake-price">${formatPrice(product.price)}</span>
      ${stockLabel}
    </div>
  `;

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary btn-block btn-sm';
  addBtn.style.marginTop = '10px';
  addBtn.textContent = inStock ? 'Adicionar ao carrinho' : 'Esgotado';
  addBtn.disabled = !inStock;
  addBtn.addEventListener('click', () => {
    Cart.add(product, 1);
    addBtn.textContent = 'Adicionado ✓';
    setTimeout(() => { addBtn.textContent = 'Adicionar ao carrinho'; }, 1200);
  });
  info.appendChild(addBtn);

  card.appendChild(photoWrap);
  card.appendChild(info);
  return card;
}

function renderFilter(flavors) {
  const chips = ['todos', ...flavors];
  filterEl.innerHTML = chips.map(f => `
    <button class="flavor-chip ${f === activeFlavor ? 'active' : ''}" data-flavor="${f}">
      ${f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
    </button>
  `).join('');

  filterEl.querySelectorAll('.flavor-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFlavor = chip.dataset.flavor;
      renderFilter(flavors);
      renderGrid();
    });
  });
}

function renderGrid() {
  const filtered = activeFlavor === 'todos'
    ? allProducts
    : allProducts.filter(p => p.flavor === activeFlavor);

  gridEl.innerHTML = '';
  if (filtered.length === 0) {
    gridEl.innerHTML = '<p class="empty-state">Nenhum cupcake encontrado para esse filtro.</p>';
  } else {
    filtered.forEach(product => gridEl.appendChild(createCupcakeCard(product)));
  }
}

async function loadCatalog() {
  try {
    const [products, flavors] = await Promise.all([
      api('/products', { auth: false }),
      api('/products/flavors', { auth: false })
    ]);

    allProducts = products;

    if (!Array.isArray(products) || products.length === 0) {
      statusEl.textContent = 'Nenhum cupcake disponível no momento.';
      return;
    }

    renderFilter(flavors);
    renderGrid();

    statusEl.hidden = true;
    gridEl.hidden = false;
  } catch (err) {
    statusEl.textContent = 'Não foi possível carregar o catálogo. Verifique se o servidor está rodando e tente novamente.';
    statusEl.classList.add('error');
    console.error('Erro ao carregar catálogo:', err);
  }
}

renderNav('catalogo');
loadCatalog();
