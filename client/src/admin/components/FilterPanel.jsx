import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/**
 * Panel de filtros. En escritorio siempre está abierto; en el celular se pliega para no ocupar toda la pantalla
 * y muestra cuántos filtros hay activos.
 */
export default function FilterPanel({ activeCount = 0, children }) {
  const [open, setOpen] = useState(false);
  let panelState = 'max-md:hidden';
  let chevron = '';
  if (open) {
    panelState = '';
    chevron = 'rotate-180';
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3.5 font-display text-sm font-bold text-navy-900 md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-navy-700" aria-hidden="true" />
          Filtros
          {activeCount > 0 && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-xs font-extrabold text-navy-950">{activeCount}</span>}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${chevron}`} aria-hidden="true" />
      </button>
      <div className={`p-4 sm:p-5 max-md:border-t max-md:border-navy-100 ${panelState}`}>{children}</div>
    </div>
  );
}
