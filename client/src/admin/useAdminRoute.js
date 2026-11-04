import { useCallback, useSyncExternalStore } from 'react';
import { SECCIONES } from './constants.js';

const BASE_PATH = '/admin';
const NAVIGATE_EVENT = 'admin:navigate';

function subscribe(callback) {
  window.addEventListener('popstate', callback);
  window.addEventListener(NAVIGATE_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}

const getPath = () => window.location.pathname;

// Partes de la dirección: /admin/<sección>/<subsección>.
function partsFromPath(path) {
  return path.replace(/^\/admin\/?/, '').split('/');
}

// Sección que corresponde a la dirección actual; cualquier otra va al resumen.
function sectionFromPath(path) {
  const [key] = partsFromPath(path);
  if (SECCIONES.some((section) => section.key === key)) {
    return key;
  }
  return 'resumen';
}

// Navegación mínima del panel con la API de historial del navegador
export function useAdminRoute() {
  const path = useSyncExternalStore(subscribe, getPath);

  const navigate = useCallback((section, sub = '') => {
    let target = `${BASE_PATH}/${section}`;
    if (sub) {
      target += `/${sub}`;
    }
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
    window.scrollTo(0, 0);
  }, []);

  const [, sub = ''] = partsFromPath(path);
  return { section: sectionFromPath(path), sub, navigate };
}
