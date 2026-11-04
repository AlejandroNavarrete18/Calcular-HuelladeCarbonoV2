// Título de una sección del panel, con acciones opcionales (en móvil ocupan todo el ancho).
export default function PageHeader({ title, description, kicker = 'Panel de administración', children }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-sun-600 sm:text-xs">{kicker}</p>
        <h1 className="mt-0.5 font-display text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">{title}</h1>
        <div aria-hidden="true" className="mt-2 h-1 w-14 rounded-full bg-gradient-to-r from-gold-400 to-sun-500" />
        {description && <p className="mt-2.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">{children}</div>}
    </div>
  );
}
