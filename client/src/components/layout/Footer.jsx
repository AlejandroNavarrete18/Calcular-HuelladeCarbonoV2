// Pie de página institucional.
export default function Footer() {
  return (
    <footer className="bg-navy-950 text-navy-100 mt-auto">
      <div className="h-1 bg-gradient-to-r from-sun-500 via-gold-400 to-sun-500" />
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="font-display text-gold-400 font-bold tracking-[0.3em] text-sm uppercase">Sursum Versus</p>
        <p className="text-xs text-navy-100/70">Universidad Autónoma de Sinaloa · Calculadora de Huella de Carbono</p>
      </div>
    </footer>
  );
}
