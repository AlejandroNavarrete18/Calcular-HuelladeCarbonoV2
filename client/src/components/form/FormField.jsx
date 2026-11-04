// Id del mensaje de error (para lectores de pantalla); undefined si el campo no tiene error.
function getDescribedBy(error, errorId) {
  if (error) {
    return errorId;
  }
  return undefined;
}

/**
 * Campo de formulario con etiqueta y mensaje de error opcional.
 * El `id` también se usa como `name`. El resto de propiedades pasan directo al <input>.
 */
export default function FormField({ id, label, error = '', className = '', ...inputProps }) {
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={getDescribedBy(error, errorId)}
        className="field-input"
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
