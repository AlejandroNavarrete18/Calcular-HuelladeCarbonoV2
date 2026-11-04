import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);


//Parámetros de scrypt. Se guardan dentro del propio hash,
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 128 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  'contrasena123',
  'password1234',
  'administrador',
  'administrador123',
  '123456789012',
  'qwertyuiop12',
  'huellacarbono',
  'huella123456',
  'uas123456789',
  'uasculiacan1',
  'password12345',
  'admin1234567',
  'bienvenido123',
  'qwerty123456',
]);

function derive(password, salt, cost, blockSize, parallelism) {
  return scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: MAX_MEMORY,
  });
}

// Genera el texto que se guarda en administradores.contrasena_hash: "scrypt$N$r$p$sal$hash".
export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), hash.toString('base64')].join('$');
}

// Compara una contraseña con un hash guardado en tiempo constante.
export async function verifyPassword(password, stored) {
  const [scheme, cost, blockSize, parallelism, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false;
  }
  try {
    const expected = Buffer.from(hash, 'base64');
    const actual = await derive(password, Buffer.from(salt, 'base64'), Number(cost), Number(blockSize), Number(parallelism));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Hash de una contraseña que nadie conoce. Se usa cuando el correo no existe para que el login tarde lo mismo que con un correo válido y no permita descubrir qué cuentas existen.
export const DUMMY_HASH = await hashPassword(randomBytes(24).toString('hex'));

/**
 * Reglas de una contraseña nueva. Devuelve el mensaje del primer problema, o una cadena vacía si es válida.
 *
 * @param {string} password
 * @param {{correo?: string}} [contexto]
 */
export function findPasswordProblem(password, { correo = '' } = {}) {
  if (typeof password !== 'string') {
    return 'La contraseña es obligatoria.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede pasar de ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (classes < 3) {
    return 'Usa al menos tres tipos de caracteres: minúsculas, mayúsculas, números o símbolos.';
  }
  const lower = password.toLowerCase();
  const usuario = correo.split('@')[0].toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || (usuario.length >= 4 && lower.includes(usuario))) {
    return 'La contraseña es demasiado fácil de adivinar.';
  }
  return '';
}
