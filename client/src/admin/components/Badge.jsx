const TONES = Object.freeze({
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-navy-100 text-navy-800',
  gray: 'bg-gray-100 text-gray-700',
});

// Etiqueta pequeña de color para estados.
export default function Badge({ tone = 'gray', children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}
