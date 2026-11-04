import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Table } from 'lucide-react';

const OPTIONS = Object.freeze([
  { format: 'xlsx', label: 'Excel (.xlsx)', hint: 'Con formato, fechas y hoja de resumen', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', hint: 'Reporte listo para imprimir o compartir', icon: FileText },
  { format: 'csv', label: 'CSV', hint: 'Datos simples para otros programas', icon: Table },
]);

/**
 * Botón "Exportar" con la lista de formatos. Se cierra al tocar fuera o con Escape.
 *
 * @param {{busyFormat: string, onExport: (format: string) => void}} props `busyFormat` es el formato que se está generando ('' si ninguno).
 */
export default function ExportMenu({ busyFormat, onExport }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const busy = Boolean(busyFormat);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const closeOutside = (event) => {
      if (container.current && !container.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button type="button" className="btn-primary btn-sm w-full" aria-haspopup="menu" aria-expanded={open} disabled={busy} onClick={() => setOpen((current) => !current)}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {!busy && <Download className="w-4 h-4" aria-hidden="true" />}
        {busy && 'Generando…'}
        {!busy && 'Exportar'}
        {!busy && <ChevronDown className="w-4 h-4" aria-hidden="true" />}
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl max-sm:right-auto max-sm:left-0 max-sm:w-full">
          {OPTIONS.map(({ format, label, hint, icon: Icon }) => (
            <li key={format} role="none">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-navy-50"
                onClick={() => {
                  setOpen(false);
                  onExport(format);
                }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy-900">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
