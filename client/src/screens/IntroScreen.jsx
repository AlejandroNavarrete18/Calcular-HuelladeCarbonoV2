import { Leaf, House, Car, ShoppingBag, ArrowRight } from 'lucide-react';

// Factores que explica la introducción, por qué se hacen las preguntas
const FACTORS = [
  {
    icon: House,
    title: 'Hogar',
    text: 'Los aparatos, el gas y los focos consumen energía, y producirla libera CO₂.',
  },
  {
    icon: Car,
    title: 'Transporte',
    text: 'Cada trayecto en auto, camión o avión quema combustible y emite gases.',
  },
  {
    icon: ShoppingBag,
    title: 'Consumo',
    text: 'Lo que comes, usas y compras gasta recursos y energía al producirse.',
  },
];

// Pantalla de bienvenida: explica qué es la huella de carbono y da paso al cuestionario
export default function IntroScreen({ onStart }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy-900 text-white shadow-xl">
      <div
        aria-hidden="true"
        className="sun-spin absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25"
        style={{
          background: 'repeating-conic-gradient(from 0deg, var(--color-sun-500) 0deg 8deg, transparent 8deg 22deg)',
          maskImage: 'radial-gradient(circle, transparent 28%, black 29%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 28%, black 29%)',
        }}
      />
      <div aria-hidden="true" className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-sun-500/20" />

      <div className="relative p-6 sm:p-10">
        <div className="flex items-center gap-2 text-gold-400">
          <Leaf className="w-5 h-5" />
          <span className="font-display text-xs font-bold tracking-[0.2em] uppercase">Introducción</span>
        </div>

        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold leading-tight">
          ¿Cuánto <span className="text-gold-400">CO₂</span> genera tu día a día?
        </h1>

        <p className="mt-4 max-w-2xl text-navy-100 leading-relaxed">
          La <strong className="text-white">huella de carbono</strong> es la cantidad de gases de efecto invernadero que
          emitimos, directa o indirectamente, por nuestras actividades. Se mide en kilogramos de CO₂ equivalente (kg
          CO₂e) al año.
        </p>

        <h2 className="mt-8 font-display text-sm font-bold tracking-[0.15em] uppercase text-gold-300">
          Por qué te preguntamos esto
        </h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FACTORS.map(({ icon: Icon, title, text }, index) => (
            <div
              key={title}
              className="pop-in rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-sm"
              style={{ animationDelay: `${0.25 + index * 0.12}s` }}
            >
              <Icon className="w-6 h-6 text-gold-400" />
              <h3 className="mt-2 font-display font-bold">{title}</h3>
              <p className="mt-1 text-sm text-navy-100 leading-snug">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border-l-4 border-gold-400 bg-white/5 p-4">
          <h2 className="font-display text-sm font-bold tracking-[0.15em] uppercase text-gold-300">
            ¿Para qué sirve esta calculadora?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-navy-100 leading-relaxed">
            Con unas preguntas sencillas estimarás tu huella individual. Conocerla es el primer paso para saber en qué
            parte de tu rutina puedes cambiar algo y reducir tu impacto en el planeta. Es una estimación orientativa, no
            una medición exacta.
          </p>
        </div>

        <div className="mt-8 flex justify-center sm:justify-start">
          <button type="button" onClick={onStart} className="btn-primary text-lg">
            Empezar
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
