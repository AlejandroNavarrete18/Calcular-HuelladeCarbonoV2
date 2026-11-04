// Tipos de error de envío. Coinciden con el enum `envios_correo.tipo_error` de la base de datos.
export const TIPO_ERROR = Object.freeze({
  CUOTA: 'cuota',
  CREDENCIALES: 'credenciales',
  DESTINATARIO: 'destinatario',
  TEMPORAL: 'temporal',
});

// Solo el límite diario real de Gmail
const PATRON_CUOTA = /\b5\.4\.5\b|daily user sending/i;
// Rechazos definitivos del mensaje o del destinatario (5.1.x, 5.2.x, 5.7.x): reintentar no cambia el resultado.
const PATRON_PERMANENTE = /\b5\.[127]\.\d{1,3}\b|user unknown|no such user|invalid (recipient|address)|mailbox unavailable/i;

// Error cuando ninguna cuenta puede enviar (todas llenas, bloqueadas o desactivadas).
export class SinCuentasDisponiblesError extends Error {
  constructor() {
    super('No hay cuentas de correo disponibles: todas están llenas, pausadas o desactivadas.');
    this.name = 'SinCuentasDisponiblesError';
    this.code = 'NO_MAIL_ACCOUNTS';
  }
}

/**
 * Clasifica un error de Nodemailer/SMTP para decidir qué hacer con la cuenta y con el correo:
 *   credenciales : contraseña inválida, revocada o sin autenticar: se desactiva la cuenta y se usa otra.
 *   cuota        : la cuenta llegó al límite diario del proveedor: se pausa 24 h y se usa otra.
 *   destinatario : rechazo definitivo (correo inexistente, buzón lleno, política del receptor): no se reintenta.
 *   temporal     : cualquier 4xx, red o timeout: se prueba de nuevo más tarde sin penalizar la cuenta.
 *
 * @param {Error & {code?: string, responseCode?: number, response?: string}} err
 * @returns {string} uno de TIPO_ERROR
 */
export function clasificarError(err) {
  const codigo = err?.code ?? '';
  const respuesta = Number(err?.responseCode) || 0;
  const texto = `${err?.response ?? ''} ${err?.message ?? ''}`;

  if (codigo === 'EAUTH' || respuesta === 535 || respuesta === 534 || respuesta === 530) {
    return TIPO_ERROR.CREDENCIALES;
  }
  if (PATRON_CUOTA.test(texto)) {
    return TIPO_ERROR.CUOTA;
  }
  if (codigo === 'EENVELOPE' || PATRON_PERMANENTE.test(texto)) {
    return TIPO_ERROR.DESTINATARIO;
  }
  return TIPO_ERROR.TEMPORAL;
}
