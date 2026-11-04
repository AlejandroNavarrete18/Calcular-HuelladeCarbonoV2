import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import Root from './Root.jsx';

const RELOAD_KEY = 'recarga-por-version-nueva';

// Si se publica una versión mientras la página estaba abierta, un archivo que ya no existe falla al cargarse.
// Se recarga una sola vez para traer la versión nueva; la marca evita un ciclo si el fallo es otro.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) {
      return;
    }
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return;
  }
  window.location.reload();
});

// Tras cargar bien unos segundos, la marca se borra para que una publicación posterior también pueda recargar
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      // sin almacenamiento disponible: no hay marca que borrar
    }
  }, 10000);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
