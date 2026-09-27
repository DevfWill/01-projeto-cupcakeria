// HU13 - Como cliente, quero criar uma conta para salvar meus dados e
// agilizar futuras compras.

function showLoggedInView() {
  const user = Auth.getUser();
  document.getElementById('logged-in-view').hidden = false;
  document.getElementById('auth-view').hidden = true;
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-email').textContent = user.email;
}

function showAuthView() {
  document.getElementById('logged-in-view').hidden = true;
  document.getElementById('auth-view').hidden = false;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('login-alert');
  try {
    const result = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: {
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value
      }
    });
    Auth.setSession(result.token, result.user);
    renderNav(result.user.role === 'admin' ? 'admin' : 'conta');
    showLoggedInView();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('register-alert');
  try {
    const result = await api('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        name: document.getElementById('register-name').value.trim(),
        email: document.getElementById('register-email').value.trim(),
        password: document.getElementById('register-password').value
      }
    });
    Auth.setSession(result.token, result.user);
    renderNav('conta');
    showLoggedInView();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (e) {
    // mesmo se falhar no servidor, limpamos a sessão local
  }
  Auth.clearSession();
  renderNav('conta');
  showAuthView();
});

renderNav('conta');
if (Auth.isLoggedIn()) {
  showLoggedInView();
} else {
  showAuthView();
}
