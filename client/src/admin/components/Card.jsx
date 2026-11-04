// Tarjeta blanca con título opcional y un espacio a la derecha para acciones.
export default function Card({ title, action, children, className = '', flush = false }) {
  let bodyPadding = 'p-4 sm:p-5';
  if (flush) {
    bodyPadding = '';
  }
  return (
    <section className={`min-w-0 rounded-2xl border border-navy-100 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-4 py-3.5 sm:px-5">
          <h2 className="min-w-0 border-l-4 border-gold-400 pl-3 font-display text-base font-bold text-navy-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyPadding}>{children}</div>
    </section>
  );
}
