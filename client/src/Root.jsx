import { lazy, Suspense } from 'react';
import App from './App.jsx';

// El panel de administración se descarga aparte
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const isAdminArea = /^\/admin(\/|$)/.test(window.location.pathname);

// Elige qué aplicación mostrar según la dirección: /admin es el panel; cualquier otra es la calculadora.
export default function Root() {
  if (isAdminArea) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }
  return <App />;
}
