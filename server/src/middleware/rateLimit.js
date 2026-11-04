import { rateLimit } from 'express-rate-limit';

const tooManyRequests = (code, message) => (_req, res) => res.status(429).json({ ok: false, code, message });

// Límite general para toda la API: protege de ráfagas de peticiones.
export function createGeneralLimiter({ apiWindowMs, apiRequestsPerIp }) {
  return rateLimit({
    windowMs: apiWindowMs,
    limit: apiRequestsPerIp,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests('RATE_LIMITED', 'Demasiadas peticiones. Inténtalo más tarde.'),
  });
}

// Límite de participaciones guardadas por dirección IP (evita que un script llene la base de datos).
export function createSubmissionIpLimiter({ windowMs, submissionsPerIpPerHour }) {
  return rateLimit({
    windowMs,
    limit: submissionsPerIpPerHour,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests('RATE_LIMITED', 'Has alcanzado el límite de envíos por hora. Inténtalo más tarde.'),
  });
}

/**
 * Límite de intentos de inicio de sesión del panel por dirección IP. Solo cuentan los intentos fallidos:
 * quien entra bien no gasta su cupo. Además cada cuenta se bloquea sola tras varios fallos (ver adminAuth.service).
 */
export function createAdminLoginLimiter({ adminLoginPerIpPer15Min, apiWindowMs }) {
  return rateLimit({
    windowMs: apiWindowMs,
    limit: adminLoginPerIpPer15Min,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests('RATE_LIMITED', 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.'),
  });
}

// Límite de exportaciones de datos personales por IP.
export function createAdminExportLimiter({ adminExportsPerHour, windowMs }) {
  return rateLimit({
    windowMs,
    limit: adminExportsPerHour,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests('RATE_LIMITED', 'Has alcanzado el límite de exportaciones por hora.'),
  });
}
