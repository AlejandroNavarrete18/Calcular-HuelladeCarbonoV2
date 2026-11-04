/**
 * Oculta casi toda la parte local de un correo para no dejarlo completo en los logs:
 * "maria.lopez@gmail.com" -> "m***@gmail.com".
 *
 * @param {string} email
 */
export function maskEmail(email = '') {
  const [local = '', domain = ''] = String(email).split('@');
  if (!domain) {
    return '***';
  }
  return `${local.slice(0, 1)}***@${domain}`;
}
