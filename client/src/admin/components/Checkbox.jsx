// Casilla grande (cómoda de tocar en el celular) con etiqueta accesible.
export default function Checkbox({ label, checked, onChange, indeterminate = false }) {
  return (
    <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-navy-50 sm:h-8 sm:w-8">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
        ref={(element) => {
          if (element) {
            element.indeterminate = indeterminate;
          }
        }}
        className="h-5 w-5 cursor-pointer rounded"
      />
    </label>
  );
}
