// Resolución de la URL de la API (de mayor a menor prioridad):
//   1. Valor guardado por el usuario en Ajustes (localStorage)
//   2. <meta name="api-url"> del index.html (se cambia al desplegar, sin tocar JS)
const KEY = 'apiUrl';

export function defaultApiUrl() {
  return document.querySelector('meta[name="api-url"]')?.content || '/api';
}

export function getApiUrl() {
  try {
    return localStorage.getItem(KEY) || defaultApiUrl();
  } catch {
    return defaultApiUrl();
  }
}

export function setApiUrl(url) {
  try {
    if (url && url !== defaultApiUrl()) localStorage.setItem(KEY, url);
    else localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible: se usa el valor por defecto */
  }
}
