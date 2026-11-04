import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Ventana emergente accesible: se cierra con Escape o al pulsar el fondo, devuelve el foco a donde estaba
 * y evita que la página de atrás se desplace.
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  let width = 'max-w-lg';
  if (wide) {
    width = 'max-w-3xl';
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto overscroll-contain bg-navy-950/60 sm:items-start sm:p-8"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`flex max-h-[92dvh] w-full ${width} flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:my-auto sm:max-h-none sm:rounded-2xl`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div aria-hidden="true" className="h-1.5 shrink-0 rounded-t-2xl bg-gradient-to-r from-navy-900 via-gold-400 to-sun-500" />
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-navy-100 px-4 py-3.5 sm:px-5">
          <h2 className="min-w-0 break-words font-display text-lg font-bold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-navy-50 cursor-pointer">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
