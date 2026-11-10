import { Minus, Plus } from 'lucide-react';
import { QUANTITY_LIMITS, normalizeQuantity } from '@huella/shared';

const STEP_BUTTON =
  'w-8 h-8 shrink-0 rounded-lg border-2 border-navy-100 bg-white text-navy-800 flex items-center justify-center ' +
  'cursor-pointer transition-colors hover:border-navy-700 hover:bg-navy-50 ' +
  'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:border-navy-100 disabled:hover:bg-white ' +
  'focus-visible:outline-3 focus-visible:outline-navy-700 focus-visible:outline-offset-2';

/**
 * Campo de cantidad de una opción (cuántos aparatos o focos)
 * @param {{label: string, value: number|string|undefined, onChange: (value: number|string) => void,
 *          onCommit: () => void}} props `label` es el nombre de la opción (para lectores de pantalla).
 */
export default function QuantityControl({ label, value, onChange, onCommit }) {
  const shown = value ?? QUANTITY_LIMITS.min;
  const current = normalizeQuantity(shown);

  const handleType = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, String(QUANTITY_LIMITS.max).length);
    if (digits === '') {
      onChange('');
      return;
    }
    onChange(Number(digits));
  };

  return (
    <div className="flex items-center gap-1.5 pr-3 shrink-0">
      <button
        type="button"
        aria-label={`Quitar una unidad de ${label}`}
        disabled={current <= QUANTITY_LIMITS.min}
        onClick={() => onChange(current - 1)}
        className={STEP_BUTTON}
      >
        <Minus className="w-4 h-4" aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`Cantidad de ${label}`}
        value={shown}
        onChange={handleType}
        onBlur={onCommit}
        className="w-12 h-8 rounded-lg border-2 border-navy-100 bg-white text-center font-display font-bold text-navy-900 text-sm focus:border-navy-700 focus:outline-none"
      />
      <button
        type="button"
        aria-label={`Agregar una unidad de ${label}`}
        disabled={current >= QUANTITY_LIMITS.max}
        onClick={() => onChange(current + 1)}
        className={STEP_BUTTON}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
