import { lazy, Suspense } from 'react';
import App from './App.jsx';

// El panel de administración se descarga aparte
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const appBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const adminBase = `${appBase}/admin`;

const isAdminArea =
  window.location.pathname === adminBase ||
  window.location.pathname.startsWith(`${adminBase}/`);

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
