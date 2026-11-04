const DOS_DIGITOS = (numero) => String(numero).padStart(2, '0');

// AAAA-MM-DD con la zona horaria del servidor (la misma que usa la base de datos).
export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${DOS_DIGITOS(fecha.getMonth() + 1)}-${DOS_DIGITOS(fecha.getDate())}`;
}

// DD/MM/AAAA HH:MM con la zona horaria del servidor, para encabezados de archivos exportados.
export function fechaHoraLegible(fecha = new Date()) {
  const dia = `${DOS_DIGITOS(fecha.getDate())}/${DOS_DIGITOS(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  return `${dia} ${DOS_DIGITOS(fecha.getHours())}:${DOS_DIGITOS(fecha.getMinutes())}`;
}

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;

/**
 * Convierte "AAAA-MM-DD" o "AAAA-MM-DD HH:MM:SS" (como entrega MySQL) en una fecha real.
 * Se arma en UTC con los mismos números para que Excel muestre exactamente la misma hora de pared,
 * sin corrimientos por zona horaria.
 *
 * @param {string|null|undefined} texto
 * @returns {Date|null} null si el texto no tiene el formato esperado.
 */
export function textoAFechaExcel(texto) {
  const partes = PATRON_FECHA.exec(String(texto ?? ''));
  if (!partes) {
    return null;
  }
  const [, anio, mes, dia, hora = '0', minuto = '0', segundo = '0'] = partes;
  return new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo)));
}

// "2026-10-31 14:05:09" -> "31/10/2026 14:05"; "2000-01-15" -> "15/01/2000". Devuelve "" si no hay fecha válida.
export function textoAFechaLegible(texto) {
  const partes = PATRON_FECHA.exec(String(texto ?? ''));
  if (!partes) {
    return '';
  }
  const [, anio, mes, dia, hora, minuto] = partes;
  const fecha = `${dia}/${mes}/${anio}`;
  if (hora === undefined) {
    return fecha;
  }
  return `${fecha} ${hora}:${minuto}`;
}
