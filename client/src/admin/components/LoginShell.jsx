import Footer from '../../components/layout/Footer.jsx';
import Header from '../../components/layout/Header.jsx';

// Estructura de las pantallas previas al panel: el mismo header y footer de la calculadora, con el contenido centrado.
export default function LoginShell({ children }) {
  return (
    <div className="admin-root flex min-h-dvh flex-col">
      <Header title="Panel de administración" />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center overflow-x-hidden px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
