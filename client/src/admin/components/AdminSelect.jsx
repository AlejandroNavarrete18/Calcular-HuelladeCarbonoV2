// Lista desplegable con etiqueta; `options` es una lista de { value, label }.
export default function AdminSelect({ id, label, value, options, onChange, className = '', ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} name={id} value={value} onChange={onChange} className="field-input bg-white disabled:bg-gray-100" {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
