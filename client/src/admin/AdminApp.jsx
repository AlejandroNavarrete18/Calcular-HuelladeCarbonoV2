import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LIST_STATUS } from '../constants.js';
import { useRemoteData } from '../hooks/useRemoteData.js';
import { cerrarSesion, loaders, setSessionLostHandler } from './adminApi.js';
import { SECCIONES } from './constants.js';
import { useAdminRoute } from './useAdminRoute.js';
import { useSessionPresence } from './useSessionPresence.js';
import AccessDenied from './components/AccessDenied.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import LoginShell from './components/LoginShell.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminsPage from './pages/AdminsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MailPage from './pages/MailPage.jsx';
import ParticipantsPage from './pages/ParticipantsPage.jsx';

const PAGES = Object.freeze({
  resumen: DashboardPage,
  participaciones: ParticipantsPage,
  correo: MailPage,
  administradores: AdminsPage,
  bitacora: AuditPage,
  cuenta: AccountPage,
});

const SESSION_ENDED = 'Tu sesión terminó. Inicia sesión de nuevo.';

// el panel no debe ser indexado por buscadores
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.append(meta);
    const previousTitle = document.title;
    document.title = 'Panel de administración';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);
}

// Revisa la sesión y muestra el inicio de sesión o la sección elegida.
export default function AdminApp() {
  useNoIndex();
  const remote = useRemoteData(loaders.sesion, 'sesion');
  // Resultado de un inicio o cierre de sesión hecho en esta pantalla
  const [local, setLocal] = useState(null);
  const { section, sub, navigate } = useAdminRoute();

  useEffect(() => {
    setSessionLostHandler(() => setLocal({ notice: SESSION_ENDED }));
    return () => setSessionLostHandler(() => {});
  }, []);

  let session = null;
  if (local) {
    session = local.admin ?? null;
  } else if (remote.status === LIST_STATUS.READY) {
    session = remote.data.admin;
  }

  useSessionPresence(Boolean(session));

  if (!local && remote.status !== LIST_STATUS.READY && remote.status !== LIST_STATUS.ERROR) {
    return (
      <LoginShell>
        <div className="grid min-h-[40vh] place-items-center text-navy-700" role="status">
          <Loader2 className="h-8 w-8 animate-spin" aria-label="Cargando" />
        </div>
      </LoginShell>
    );
  }

  if (!session) {
    return <LoginPage notice={local?.notice} onLoggedIn={(data) => setLocal({ admin: data.admin })} />;
  }

  async function handleLogout() {
    try {
      await cerrarSesion();
    } finally {
      setLocal({});
    }
  }

  const Page = PAGES[section];
  const allowed = !SECCIONES.find((item) => item.key === section).soloSuperadmin || session.rol === 'superadmin';
  return (
    <AdminLayout admin={session} section={section} onNavigate={navigate} onLogout={handleLogout}>
      {allowed && <Page key={section} admin={session} sub={sub} onNavigate={navigate} />}
      {!allowed && <AccessDenied />}
    </AdminLayout>
  );
}
