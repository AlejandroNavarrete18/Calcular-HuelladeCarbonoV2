import { formatInteger, formatShortDay } from '../format.js';

const HEIGHT = 140;
const MIN_VISIBLE_PERCENT = 3;
const MAX_LABELS = 6;

// Altura de la barra en porcentaje; los días con datos siempre se ven, aunque sean muy pocos.
function barHeight(total, max) {
  if (total === 0) {
    return 0;
  }
  return Math.max((total / max) * 100, MIN_VISIBLE_PERCENT);
}

// Barras de participaciones por día. Cada barra explica su valor para lectores de pantalla y al pasar el cursor.
export default function DailyChart({ days }) {
  const max = Math.max(1, ...days.map((day) => day.total));
  const labelEvery = Math.max(1, Math.ceil(days.length / MAX_LABELS));

  return (
    <div className="min-w-0">
      <div className="flex items-end gap-px sm:gap-0.5" style={{ height: HEIGHT }} role="img" aria-label="Participaciones por día">
        {days.map((day) => (
          <div key={day.dia} className="group flex h-full min-w-0 flex-1 items-end" title={`${formatShortDay(day.dia)}: ${formatInteger(day.total)}`}>
            <div className="w-full rounded-t bg-navy-700 transition-colors group-hover:bg-sun-500" style={{ height: `${barHeight(day.total, max)}%` }} />
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-4 text-[10px] text-muted" aria-hidden="true">
        {days.map((day, index) => {
          if (index % labelEvery !== 0) {
            return null;
          }
          let position = '-translate-x-1/2';
          let left = ((index + 0.5) / days.length) * 100;
          if (index === 0) {
            position = '';
            left = 0;
          }
          return (
            <span key={day.dia} className={`absolute top-0 whitespace-nowrap ${position}`} style={{ left: `${left}%` }}>
              {formatShortDay(day.dia)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
