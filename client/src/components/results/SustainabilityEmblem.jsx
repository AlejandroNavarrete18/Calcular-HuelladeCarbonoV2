import { Sprout } from 'lucide-react';

/**
 * Adorno de la tarjeta de resumen: un brote dentro de círculos concéntricos.
 * Solo aparece desde `xl`, que es cuando el texto deja libre el lado derecho de la tarjeta;
 * en pantallas más pequeñas no se renderiza visualmente y no afecta el diseño.
 */
export default function SustainabilityEmblem() {
  return (
    <div
      aria-hidden="true"
      style={{ animationDelay: '0.3s' }}
      className="pop-in pointer-events-none absolute bottom-10 right-16 hidden h-44 w-44 items-center justify-center xl:flex"
    >
      <div className="absolute inset-0 rounded-full border-2 border-gold-400/25" />
      <div className="absolute inset-5 rounded-full border border-white/15 bg-white/5" />
      <Sprout className="relative h-20 w-20 text-gold-400" strokeWidth={1.4} />
    </div>
  );
}
