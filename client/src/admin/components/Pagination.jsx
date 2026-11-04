import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatInteger } from '../format.js';

// Controles de página con el total de resultados.
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min((page - 1) * pageSize + 1, total);
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Paginación" className="flex flex-col items-center gap-3 border-t border-navy-100 px-4 py-3.5 text-sm sm:flex-row sm:justify-between sm:px-5">
      <p className="text-muted">
        {formatInteger(first)}–{formatInteger(last)} de {formatInteger(total)}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className="btn-ghost btn-sm !px-3" aria-label="Página anterior">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="min-w-[8.5rem] text-center font-semibold text-navy-900">
          Página {page} de {pages}
        </span>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} className="btn-ghost btn-sm !px-3" aria-label="Página siguiente">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
