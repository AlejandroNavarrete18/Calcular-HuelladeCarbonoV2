const ACCENTS = Object.freeze({
  navy: { bar: 'bg-navy-700', icon: 'bg-navy-50 text-navy-700' },
  gold: { bar: 'bg-gold-400', icon: 'bg-yellow-50 text-gold-500' },
  sun: { bar: 'bg-sun-500', icon: 'bg-orange-50 text-sun-600' },
  green: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-700' },
  red: { bar: 'bg-red-600', icon: 'bg-red-50 text-red-700' },
});

// Cifra destacada con su etiqueta; `icon` es un componente de lucide-react y `accent` el color de la franja.
export default function StatCard({ label, value, hint, icon: Icon, accent = 'navy' }) {
  const colors = ACCENTS[accent];
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-navy-100 bg-white p-3 shadow-sm sm:p-5">
      <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${colors.bar}`} />
      <div className="flex items-start justify-between gap-3 pl-1.5">
        <p className="min-w-0 text-xs font-semibold text-muted sm:text-sm">{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full max-[400px]:hidden sm:h-9 sm:w-9 ${colors.icon}`}>
            <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate pl-1.5 font-display text-xl font-extrabold text-navy-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 pl-1.5 text-[0.7rem] leading-snug text-muted sm:text-xs">{hint}</p>}
    </div>
  );
}
