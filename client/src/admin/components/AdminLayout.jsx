import { useEffect, useRef, useState } from 'react';
import { KeyRound, LayoutDashboard, LogOut, Mail, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import { ROLES, SECCIONES } from '../constants.js';
import BrandLogos from './BrandLogos.jsx';

const ICONS = Object.freeze({
  resumen: LayoutDashboard,
  participaciones: Users,
  correo: Mail,
  administradores: ShieldCheck,
  bitacora: ScrollText,
  cuenta: KeyRound,
});

const DESKTOP_QUERY = '(min-width: 1024px)';

function NavLink({ section, active, onNavigate, onDone }) {
  const Icon = ICONS[section.key];
  const base = 'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors';
  let state = 'text-navy-100 hover:bg-white/10 hover:text-white';
  let ariaCurrent;
  if (active) {
    state = 'bg-gold-400 text-navy-950 shadow-sm';
    ariaCurrent = 'page';
  }

  return (
    <a
      href={`/admin/${section.key}`}
      aria-current={ariaCurrent}
      className={`${base} ${state}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(section.key);
        onDone();
      }}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      {section.label}
    </a>
  );
}

// Franja de colores de la calculadora (azul, dorado, naranja).
function ColorStripe({ className = 'h-1.5' }) {
  return <div aria-hidden="true" className={`${className} bg-gradient-to-r from-navy-900 via-gold-400 to-sun-500`} />;
}

/**
 * Estructura del panel.
 *  - Escritorio: menú lateral fijo a la izquierda.
 *  - Móvil: barra superior con el botón de tres franjas a la izquierda; abre el menú como cajón por el lado izquierdo.
 */
export default function AdminLayout({ admin, section, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstLinkArea = useRef(null);
  const toggleButton = useRef(null);
  const visibles = SECCIONES.filter((item) => !item.soloSuperadmin || admin.rol === 'superadmin');

  // El cajón se cierra con Escape, al pasar a pantalla ancha y se devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleButton.current?.focus();
      }
    };
    const media = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => {
      if (media.matches) {
        setMenuOpen(false);
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    media.addEventListener('change', closeOnDesktop);
    firstLinkArea.current?.querySelector('a')?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', closeOnEscape);
      media.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  let drawerState = 'max-lg:-translate-x-full max-lg:invisible';
  let backdropState = 'pointer-events-none opacity-0';
  let MenuIcon = Menu;
  let menuLabel = 'Abrir menú';
  if (menuOpen) {
    drawerState = 'max-lg:translate-x-0 max-lg:visible';
    backdropState = 'opacity-100';
    MenuIcon = X;
    menuLabel = 'Cerrar menú';
  }

  return (
    <div className="admin-root min-h-dvh bg-paper">
      {/* Barra superior (solo móvil) */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-30 bg-navy-900 text-white shadow-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-14 items-center gap-3 px-3">
          <button
            ref={toggleButton}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            aria-label={menuLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white hover:bg-white/10 active:bg-white/20 cursor-pointer"
          >
            <MenuIcon className="w-7 h-7" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.14em] text-gold-400 truncate">Universidad Autónoma de Sinaloa</p>
            <p className="font-display text-sm font-extrabold truncate">Panel de administración</p>
          </div>
        </div>
        <ColorStripe className="h-1" />
      </header>

      {/* Fondo oscuro detrás del cajón (solo móvil) */}
      <div
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${backdropState}`}
      />

      {/* Menú: cajón por la izquierda en móvil, columna fija en escritorio */}
      <aside
        id="menu-principal"
        aria-label="Menú principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[88vw] flex-col bg-navy-900 text-white shadow-2xl transition-[transform,visibility] duration-300 ease-out lg:z-20 lg:max-w-none lg:translate-x-0 lg:shadow-none ${drawerState}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ColorStripe className="h-1.5 shrink-0" />
        <div className="shrink-0 bg-white px-4 py-4">
          <BrandLogos className="h-9" gap="gap-2.5" />
        </div>
        <div className="shrink-0 border-b border-white/10 px-5 py-4">
          <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-gold-400">Universidad Autónoma de Sinaloa</p>
          <p className="mt-1 font-display text-lg font-extrabold leading-tight">Huella de Carbono</p>
          <p className="text-xs text-navy-100/80">Panel de administración</p>
        </div>

        <nav ref={firstLinkArea} aria-label="Secciones del panel" className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
          {visibles.map((item) => (
            <NavLink key={item.key} section={item} active={item.key === section} onNavigate={onNavigate} onDone={() => setMenuOpen(false)} />
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-400 font-display text-base font-extrabold text-navy-950" aria-hidden="true">
              {admin.nombre.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{admin.nombre}</p>
              <p className="truncate text-xs text-navy-100/80">{ROLES[admin.rol]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold text-navy-100 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-h-dvh min-w-0 flex-col pt-[calc(3.75rem+env(safe-area-inset-top))] lg:pl-[19rem] lg:pt-0">
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
        </main>
        <footer className="bg-navy-950 text-navy-100">
          <ColorStripe className="h-1" />
          <div className="flex flex-col items-center justify-between gap-1 px-4 py-4 text-center sm:flex-row sm:px-8 sm:text-left">
            <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-gold-400">Sursum Versus</p>
            <p className="text-xs text-navy-100/70">Universidad Autónoma de Sinaloa · Calculadora de Huella de Carbono</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
