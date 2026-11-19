// Cliente de la API con fetch.
// - Timeout por petición.
// - Las respuestas GET se cachean en localStorage: si el backend no responde,
//   se devuelven los últimos datos y se muestra el aviso <aside role="status">.
import { getApiUrl } from './config.js';

const TIMEOUT_MS = 8000;
const CACHE_PREFIX = 'cache:';

export class ApiError extends Error {
  constructor(status, body, message) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function setOffline(offline) {
  const banner = document.querySelector('body > aside[role="status"]');
  if (banner) banner.hidden = !offline;
}

function readCache(path) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeCache(path, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    /* cuota llena o almacenamiento bloqueado: se ignora */
  }
}

async function request(method, path, body, { baseUrl = getApiUrl(), cache = true } = {}) {
  const url = baseUrl.replace(/\/+$/, '') + path;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    if (method === 'GET' && cache) {
      const cached = readCache(path);
      if (cached !== undefined) {
        setOffline(true);
        return cached;
      }
    }
    setOffline(true);
    throw new ApiError(0, null, 'No se pudo conectar con el servidor.');
  }

  setOffline(false);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data, data?.error || `Error ${res.status}`);
  if (method === 'GET' && cache) writeCache(path, data);
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  del: (path, opts) => request('DELETE', path, undefined, opts),
};
