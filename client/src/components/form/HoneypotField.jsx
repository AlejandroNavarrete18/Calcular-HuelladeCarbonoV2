/**
 * Campo trampa: invisible para las personas, pero los bots suelen llenarlo.
 * Si el servidor lo recibe con texto, descarta la petición.
 */
export default function HoneypotField({ value, onChange }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="website">No llenar este campo</label>
      <input
        id="website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
