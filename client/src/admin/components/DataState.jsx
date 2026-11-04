import { Loader2, RefreshCw } from 'lucide-react';
import { LIST_STATUS } from '../../constants.js';

/**
 * Muestra "Cargando…" o un error con botón de reintento mientras los datos no están listos;
 * cuando lo están, muestra a sus hijos.
 */
export default function DataState({ status, onRetry, children }) {
  if (status === LIST_STATUS.ERROR) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-semibold text-red-700">No se pudieron cargar los datos.</p>
        <button type="button" onClick={onRetry} className="btn-ghost inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    );
  }
  if (status !== LIST_STATUS.READY) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted" role="status">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        Cargando…
      </div>
    );
  }
  return children;
}
