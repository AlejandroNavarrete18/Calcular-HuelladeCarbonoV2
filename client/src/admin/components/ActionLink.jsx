// Botón con aspecto de enlace para acciones dentro de tablas
export default function ActionLink({ children, tone = 'blue', ...props }) {
  let color = 'text-navy-700';
  if (tone === 'red') {
    color = 'text-red-700';
  }
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center gap-1.5 text-sm font-bold hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
      {...props}
    >
      {children}
    </button>
  );
}
