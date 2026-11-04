import { formatInteger } from '../format.js';

/**
 * Barras horizontales comparables entre sí.
 *
 * @param {{items: Array<{key: string|number, label: string, value: number, detail?: string, barClass?: string}>}} props
 */
export default function BarList({ items, emptyText = 'Sin datos todavía.' }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-muted">
              <strong className="text-navy-900">{formatInteger(item.value)}</strong>
              {item.detail && <span className="ml-2 text-xs">{item.detail}</span>}
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-navy-50" role="presentation">
            <div className={`h-full rounded-full ${item.barClass ?? 'bg-navy-700'}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
