const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Convierte un valor en una celda CSV segura.
 * Las celdas que empiezan con =, +, - o @ las interpreta Excel como fórmulas; se les antepone una comilla
 * para que un dato capturado por el público no pueda ejecutarse al abrir el archivo.
 */
export function toCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  let text = String(value);
  if (FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Une una fila de valores en una línea CSV.
export function toCsvRow(values) {
  return values.map(toCsvCell).join(',');
}
