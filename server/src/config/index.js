import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carga server/.env sin importar desde qué carpeta se arranque el proceso.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

// Error de configuración con la lista de problemas encontrados
export class ConfigError extends Error {
  constructor(problems) {
    super(`Configuración inválida:\n - ${problems.join('\n - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

const TRUE_VALUES = ['1', 'true', 'yes', 'si', 'sí'];
const SECRET_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;
const REQUIRED_DB_VARIABLES = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const DEFAULT_PORT = 3001;
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_CONNECTION_LIMIT = 10;
const DEFAULT_QUESTIONNAIRE_CACHE_SECONDS = 60;
const DEFAULT_ADMIN_SESSION_HOURS = 8;
const DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const DEFAULT_ADMIN_LOCK_MINUTES = 15;
const DEFAULT_ADMIN_IDLE_MINUTES = 15;
const DEFAULT_ADMIN_CLOSE_GRACE_SECONDS = 45;
const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Convierte "true"/"1"/"si" en booleano. Si la variable no existe, devuelve false 
function toBool(value) {
  if (value === undefined || value === '') {
    return false;
  }
  return TRUE_VALUES.includes(String(value).toLowerCase());
}

// Convierte a entero positivo; si no es válido, usa `fallback`
function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

// Lista separada por comas 
function toList(value, fallback) {
  const source = value ?? fallback;
  return source
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

// Variable booleana con un valor por defecto cuando no está definida
function toBoolWithDefault(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }
  return toBool(value);
}

// Número de proxies de confianza, o `false` si no se usa proxy.
function parseTrustProxy(value) {
  if (!value) {
    return false;
  }
  return toPositiveInt(value, 1);
}

// Problemas con las variables de la base de datos siempre obligatorias, todo se guarda en la base de datos
function findDatabaseProblems(env) {
  const problems = [];
  for (const name of REQUIRED_DB_VARIABLES) {
    if (!env[name]) {
      problems.push(`Falta la variable ${name}.`);
    }
  }
  if (env.DB_PASSWORD === undefined) {
    problems.push('Falta la variable DB_PASSWORD (puede quedar vacía solo en desarrollo local).');
  }
  return problems;
}

// Problemas con las variables que solo se exigen cuando se envían correos de verdad
function findMailProblems(env) {
  if (!SECRET_KEY_PATTERN.test(env.MAIL_SECRET_KEY ?? '')) {
    return ['MAIL_SECRET_KEY debe tener exactamente 64 caracteres hexadecimales (32 bytes).'];
  }
  return [];
}

function buildDatabaseConfig(env) {
  return Object.freeze({
    host: env.DB_HOST,
    port: toPositiveInt(env.DB_PORT, DEFAULT_DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: toPositiveInt(env.DB_CONNECTION_LIMIT, DEFAULT_DB_CONNECTION_LIMIT),
  });
}

/**
 * Solo la configuración de la base de datos, para los scripts que no necesitan el resto (ver scripts/).
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @throws {ConfigError} si falta alguna variable de la base de datos
 */
export function loadDatabaseConfig(env = process.env) {
  const problems = findDatabaseProblems(env);
  if (problems.length > 0) {
    throw new ConfigError(problems);
  }
  return buildDatabaseConfig(env);
}

/**
 * Lee las variables de entorno y las valida.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @throws {ConfigError} si falta alguna variable obligatoria
 */
export function loadConfig(env = process.env) {
  const dryRun = toBool(env.MAIL_DRY_RUN);

  const problems = findDatabaseProblems(env);
  if (!dryRun) {
    problems.push(...findMailProblems(env));
  }
  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return Object.freeze({
    port: toPositiveInt(env.PORT, DEFAULT_PORT),
    // Orígenes (páginas web) autorizados a llamar a esta API.
    allowedOrigins: toList(env.ALLOWED_ORIGINS, 'http://localhost:5173'),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    serveClient: toBool(env.SERVE_CLIENT),
    clientDistDir: fileURLToPath(new URL('../../../client/dist/', import.meta.url)),
    db: buildDatabaseConfig(env),
    // Cada cuántos segundos se vuelve a leer el cuestionario de la base de datos, si es 0, se lee siempre.
    questionnaireCacheMs: toPositiveInt(env.CUESTIONARIO_CACHE_SECONDS, DEFAULT_QUESTIONNAIRE_CACHE_SECONDS) * 1000,
    admin: Object.freeze({
      sessionHours: toPositiveInt(env.ADMIN_SESSION_HOURS, DEFAULT_ADMIN_SESSION_HOURS),
      // La cookie de sesión solo viaja por https. En producción es obligatorio salvo que se desactive a propósito.
      secureCookies: toBoolWithDefault(env.ADMIN_COOKIE_SECURE, env.NODE_ENV === 'production'),
      loginMaxAttempts: toPositiveInt(env.ADMIN_LOGIN_MAX_ATTEMPTS, DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS),
      lockMinutes: toPositiveInt(env.ADMIN_LOCK_MINUTES, DEFAULT_ADMIN_LOCK_MINUTES),
      // Minutos sin actividad de la persona tras los cuales la sesión se cierra sola.
      idleMinutes: toPositiveInt(env.ADMIN_IDLE_MINUTES, DEFAULT_ADMIN_IDLE_MINUTES),
      // Segundos de espera tras avisar que se cerró la ventana: si la página no vuelve a dar señales, la sesión termina.
      closeGraceSeconds: toPositiveInt(env.ADMIN_CLOSE_GRACE_SECONDS, DEFAULT_ADMIN_CLOSE_GRACE_SECONDS),
    }),
    mail: Object.freeze({
      dryRun,
      secretKey: env.MAIL_SECRET_KEY,
      fromName: (env.MAIL_FROM_NAME ?? 'Calculadora de Huella de Carbono').replace(/[\r\n<>"]/g, '').trim(),
      replyTo: (env.MAIL_REPLY_TO ?? '').trim(),
    }),
    limits: Object.freeze({
      // Todas las personas de un mismo salón pueden compartir la ip de la red, pero no pueden enviar infinitas participaciones ni infinitos correos a la misma direccion
      apiWindowMs: FIFTEEN_MINUTES_MS,
      apiRequestsPerIp: toPositiveInt(env.LIMIT_API_PER_IP_PER_15MIN, 600),
      windowMs: ONE_HOUR_MS,
      submissionsPerIpPerHour: toPositiveInt(env.LIMIT_SUBMISSIONS_PER_IP_PER_HOUR, 30),
      emailsPerRecipientPerHour: toPositiveInt(env.LIMIT_EMAILS_PER_RECIPIENT_PER_HOUR, 5),
      adminLoginPerIpPer15Min: toPositiveInt(env.LIMIT_ADMIN_LOGIN_PER_IP_PER_15MIN, 20),
      adminExportsPerHour: toPositiveInt(env.LIMIT_ADMIN_EXPORTS_PER_HOUR, 20),
    }),
  });
}
