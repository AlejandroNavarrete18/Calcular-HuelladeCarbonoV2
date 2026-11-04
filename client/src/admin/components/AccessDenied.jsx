import { Lock } from 'lucide-react';
import PageHeader from './PageHeader.jsx';

// Se muestra cuando una persona abre una sección que su rol no permite (el servidor también la rechaza).
export default function AccessDenied() {
  return (
    <>
      <PageHeader title="Sin permiso" />
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted">
        <Lock className="w-10 h-10" aria-hidden="true" />
        <p className="font-semibold">Esta sección es solo para superadministradores.</p>
      </div>
    </>
  );
}
