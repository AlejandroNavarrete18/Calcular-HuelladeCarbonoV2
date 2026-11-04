import { RefreshCw } from 'lucide-react';
import { LIST_STATUS } from '../../constants.js';

// Texto de la primera opción (deshabilitada) según el estado de la lista.
function getPlaceholder({ status, placeholder, waitingText }) {
  if (status === LIST_STATUS.IDLE) {
    return waitingText;
  }
  if (status === LIST_STATUS.LOADING) {
    return 'Cargando…';
  }
  if (status === LIST_STATUS.ERROR) {
    return 'No se pudo cargar la lista';
  }
  return placeholder;
}

// Id del mensaje que describe al campo (para lectores de pantalla); undefined si no hay mensaje.
function getDescribedBy(hasMessage, messageId) {
  if (hasMessage) {
    return messageId;
  }
  return undefined;
}

/**
 * Lista desplegable cuyas opciones vienen del servidor.
 * Muestra "Cargando…", un botón de reintento si la descarga falló y el mensaje de error de validación.
 *
 * @param {object} props
 * @param {string} props.id Se usa como id y como name del <select>.
 * @param {string} props.value Id seleccionado ('' si ninguno).
 * @param {Array<{id: number, nombre: string}>} props.options
 * @param {string} props.status Uno de LIST_STATUS.
 * @param {string} props.placeholder Texto cuando la lista está lista y no hay selección.
 * @param {string} [props.waitingText] Texto cuando la lista depende de otro campo que aún no se elige.
 * @param {() => void} [props.onRetry] Se llama al pulsar "Reintentar" tras un error de descarga.
 */
export default function SelectField({
  id,
  label,
  value,
  options,
  status,
  placeholder,
  waitingText = 'Primero completa el campo anterior',
  error = '',
  disabled = false,
  className = '',
  onChange,
  onBlur,
  onRetry,
}) {
  const errorId = `${id}-error`;
  const isReady = status === LIST_STATUS.READY;
  const showRetry = status === LIST_STATUS.ERROR && Boolean(onRetry);

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled || !isReady}
        aria-busy={status === LIST_STATUS.LOADING}
        aria-invalid={Boolean(error)}
        aria-describedby={getDescribedBy(Boolean(error), errorId)}
        className="field-input bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {getPlaceholder({ status, placeholder, waitingText })}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nombre}
          </option>
        ))}
      </select>

      {showRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-navy-700 underline underline-offset-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
