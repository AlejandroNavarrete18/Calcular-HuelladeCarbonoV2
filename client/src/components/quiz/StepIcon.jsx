import { Tv, Flame, Lightbulb, Car, Clock, Plane, Beef, Recycle, Shirt, Smartphone } from 'lucide-react';

// Ícono de cada pregunta, segun su clave
const ICONS_BY_QUESTION = {
  electrodomesticos: Tv,
  gas: Flame,
  focos: Lightbulb,
  transporte: Car,
  tiempo_recorrido: Clock,
  vuelos: Plane,
  carne_matriz: Beef,
  plasticos: Recycle,
  ropa: Shirt,
  dispositivos_matriz: Smartphone,
};

// Las preguntas nuevas, sin ícono propio, usan una bombilla
export default function StepIcon({ questionId, className = 'w-7 h-7 text-navy-700' }) {
  const Icon = ICONS_BY_QUESTION[questionId] ?? Lightbulb;
  return <Icon className={className} />;
}
