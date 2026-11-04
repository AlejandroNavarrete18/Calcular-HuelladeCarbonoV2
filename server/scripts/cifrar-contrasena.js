/*
 * Uso: node scripts/cifrar-contrasena.js "abcd efgh ijkl mnop"
 * Imprime el texto cifrado que va en cuentas_correo.contrasena_cifrada
 * Requiere MAIL_SECRET_KEY en el archivo .env
 */
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { cifrar } from '../src/utils/cifrado.js';

const APP_PASSWORD_LENGTH = 16;

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

// Google muestra la contraseña en 4 grupos separados por espacios.
const contrasena = (process.argv[2] ?? '').replace(/\s+/g, '');
if (contrasena.length !== APP_PASSWORD_LENGTH) {
  console.error(`Pasa la contraseña de aplicación de ${APP_PASSWORD_LENGTH} letras como argumento.`);
  process.exit(1);
}
console.log(cifrar(contrasena, process.env.MAIL_SECRET_KEY));