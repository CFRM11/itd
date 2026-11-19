// Router por hash (#/ruta) + vistas a partir de <template>.
// Hash routing: funciona igual en hosting estático, file:// y dentro de Tauri sin reescrituras.
import { api, ApiError } from './api.js';
import { defaultApiUrl, getApiUrl, setApiUrl } from './config.js';

const main = document.querySelector('main');

// ---------- utilidades de plantillas ----------
function view(name) {
  return document.getElementById(`tpl-${name}`).content.cloneNode(true);
}

// Rellena todos los [data-field] del fragmento con los valores del objeto.
function fill(root, data) {
  for (const el of root.querySelectorAll('[data-field]')) {
    const v = data[el.dataset.field];
    el.textContent = v === undefined || v === null || v === '' ? '—' : v;
    if (el instanceof HTMLDataElement) el.value = v ?? '';
  }
  return root;
}

function errorView(title, message) {
  return fill(view('error'), { title, message });
}

// ---------- vistas ----------
async function home() {
  const stats = await api.get('/stats');
  return { title: 'Inicio', node: fill(view('home'), { total: stats.total, ...stats.byStatus }) };
}

async function itemList(query) {
  const q = query.get('q') || '';
  const items = await api.get(`/items${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const node = fill(view('items'), { count: items.length });

  const form = node.querySelector('form[data-form="search"]');
  form.q.value = q;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = form.q.value.trim();
    location.hash = value ? `#/items?q=${encodeURIComponent(value)}` : '#/items';
  });

  const list = node.querySelector('section');
  for (const item of items) {
    const card = fill(view('item-card'), item);
    card.querySelector('article').dataset.status = item.status;
    card.querySelector('a').href = `#/items/${item.id}`;
    list.append(card);
  }
  node.querySelector('section + p').hidden = items.length > 0;
  return { title: 'Elementos', node };
}

async function itemDetail(_query, id) {
  const item = await api.get(`/items/${id}`);
  const node = fill(view('item-detail'), item);
  node.querySelector('article').dataset.status = item.status;

  const del = node.querySelector('[data-action="delete"]');
  del.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    del.setAttribute('aria-busy', 'true');
    try {
      await api.del(`/items/${id}`);
      location.hash = '#/items';
    } catch (err) {
      alert(err.message);
      del.removeAttribute('aria-busy');
    }
  });
  return { title: item.name, node };
}

function itemForm() {
  const node = view('item-form');
  const form = node.querySelector('form');
  const nameInput = form.elements.namedItem('name');

  // Estados de error con aria-invalid (Pico los pinta en rojo, sin clases).
  const showErrors = (errors = {}) => {
    for (const small of form.querySelectorAll('[data-error]')) {
      const msg = errors[small.dataset.error] || '';
      small.textContent = msg;
      small.hidden = !msg;
    }
    if (errors.name) nameInput.setAttribute('aria-invalid', 'true');
    else nameInput.removeAttribute('aria-invalid');
    form.querySelector('fieldset').toggleAttribute('aria-invalid', Boolean(errors.status));
  };
  showErrors();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    try {
      const created = await api.post('/items', Object.fromEntries(new FormData(form)));
      location.hash = `#/items/${created.id}`;
    } catch (err) {
      showErrors(err instanceof ApiError && err.status === 422 ? err.body.errors : { form: err.message });
    } finally {
      submit.removeAttribute('aria-busy');
      submit.disabled = false;
    }
  });
  return { title: 'Nuevo elemento', node };
}

function settings() {
  const node = view('settings');
  const form = node.querySelector('form');
  const result = form.querySelector('[data-field="result"]');
  form.apiUrl.value = getApiUrl();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    setApiUrl(form.apiUrl.value.trim());
    result.textContent = '✔ Guardado';
  });
  form.querySelector('[data-action="reset"]').addEventListener('click', () => {
    setApiUrl('');
    form.apiUrl.value = defaultApiUrl();
    result.textContent = 'Restablecido al valor por defecto';
  });
  const testBtn = form.querySelector('[data-action="test"]');
  testBtn.addEventListener('click', async () => {
    testBtn.setAttribute('aria-busy', 'true');
    try {
      await api.get('/health', { baseUrl: form.apiUrl.value.trim(), cache: false });
      result.textContent = '✔ Conexión correcta';
    } catch (err) {
      result.textContent = `✖ ${err.message}`;
    } finally {
      testBtn.removeAttribute('aria-busy');
    }
  });
  return { title: 'Ajustes', node };
}

// ---------- router ----------
const routes = [
  [/^\/$/, home],
  [/^\/items$/, itemList],
  [/^\/items\/new$/, itemForm],
  [/^\/items\/(\d+)$/, itemDetail],
  [/^\/settings$/, settings],
];

// Solo los hashes "#/..." son rutas; otros (p. ej. #contenido del skip-link) son anclas normales.
const isRoute = (hash) => hash === '' || hash.startsWith('#/');

function parseHash() {
  const hash = isRoute(location.hash) ? location.hash : '#/';
  const [path, qs = ''] = (hash.slice(1) || '/').split('?');
  return { path: path || '/', query: new URLSearchParams(qs) };
}

function updateNav(path) {
  for (const a of document.querySelectorAll('body > header nav a')) {
    const target = a.getAttribute('href').slice(1);
    const active = target === path || (target === '/items' && /^\/items\/\d+$/.test(path));
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

let renderId = 0;
async function render() {
  const id = ++renderId;
  const { path, query } = parseHash();
  updateNav(path);
  main.setAttribute('aria-busy', 'true');

  let result;
  const route = routes.find(([re]) => re.test(path));
  try {
    result = route
      ? await route[1](query, ...path.match(route[0]).slice(1))
      : { title: 'No encontrado', node: errorView('404', 'La página no existe.') };
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    result = {
      title: 'Error',
      node: errorView(status === 404 ? '404' : 'Ups', status === 404 ? 'No encontrado.' : err.message),
    };
  }
  if (id !== renderId) return; // llegó otra navegación mientras esperábamos

  main.replaceChildren(result.node);
  main.removeAttribute('aria-busy');
  document.title = `${result.title} · snapCart`;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  if (isRoute(location.hash)) render();
});
render();
