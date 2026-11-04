const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const shortDay = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const integer = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// La API entrega fechas como "AAAA-MM-DD HH:MM:SS" en la hora del servidor
function parse(value) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatDateTime(value) {
  const date = parse(value);
  if (!date) {
    return '—';
  }
  return dateTime.format(date);
}

export function formatDate(value) {
  const date = parse(value);
  if (!date) {
    return '—';
  }
  return dateOnly.format(date);
}

export function formatShortDay(value) {
  const date = parse(`${value}T12:00:00`);
  if (!date) {
    return '';
  }
  return shortDay.format(date);
}

export const formatInteger = (value) => integer.format(Number(value) || 0);
export const formatKg = (value) => `${decimal.format(Number(value) || 0)} kg`;
