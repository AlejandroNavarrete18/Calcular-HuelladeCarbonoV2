/*
 * Crea un administrador del panel, o restablece la contraseña de uno existente (tambien lo desbloquea).
 * Es la única forma de crear al primer superadministrador; los demás se crean desde el panel.
 * La contraseña se escribe en la terminal sin mostrarse y no queda en el historial ni en ningun archivo.
 */
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { loadDatabaseConfig } from '../src/config/index.js';
import { createDatabasePool } from '../src/database/pool.js';
import { createAdministradoresRepository } from '../src/repositories/administradores.repository.js';
import { createBitacoraRepository } from '../src/repositories/bitacora.repository.js';
import { findPasswordProblem, hashPassword, PASSWORD_MIN_LENGTH } from '../src/utils/passwords.js';

const MAX_INTENTOS_CONTRASENA = 3;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let silenciado = false;
const salida = new Writable({
  write(fragmento, codificacion, siguiente) {
    if (!silenciado) {
      process.stdout.write(fragmento, codificacion);
    }
    siguiente();
  },
});
const lector = readline.createInterface({ input: process.stdin, output: salida, terminal: true });

const preguntar = (texto) => new Promise((resolve) => lector.question(texto, resolve));

async function preguntarOculto(texto) {
  process.stdout.write(texto);
  silenciado = true;
  const respuesta = await preguntar('');
  silenciado = false;
  process.stdout.write('\n');
  return respuesta;
}

async function pedirContrasena(correo) {
  for (let intento = 1; intento <= MAX_INTENTOS_CONTRASENA; intento += 1) {
    const contrasena = await preguntarOculto(`Contraseña (mínimo ${PASSWORD_MIN_LENGTH} caracteres): `);
    const problema = findPasswordProblem(contrasena, { correo });
    if (problema) {
      console.log(problema);
    } else if (contrasena !== (await preguntarOculto('Repite la contraseña: '))) {
      console.log('Las contraseñas no coinciden.');
    } else {
      return contrasena;
    }
  }
  throw new Error('Demasiados intentos. No se hizo ningún cambio.');
}

async function pedirRol(hayAdministradores) {
  if (!hayAdministradores) {
    console.log('Es el primer administrador: se creará como superadmin.');
    return 'superadmin';
  }
  const respuesta = (await preguntar('Rol (superadmin/admin) [admin]: ')).trim().toLowerCase();
  if (respuesta === 'superadmin') {
    return 'superadmin';
  }
  return 'admin';
}

async function main(administradores, bitacora) {
  if (!process.stdin.isTTY) {
    throw new Error('Ejecuta este script en una terminal interactiva (con Docker: docker compose exec, sin -T).');
  }

  const correo = (await preguntar('Correo: ')).trim().toLowerCase();
  if (!EMAIL.test(correo) || correo.length > 254) {
    throw new Error('El correo no es válido.');
  }

  const existente = await administradores.buscarParaLogin(correo);
  if (existente) {
    const confirmar = (await preguntar(`Ya existe ${existente.nombre}. ¿Restablecer su contraseña y reactivar la cuenta? (s/N): `)).trim().toLowerCase();
    if (confirmar !== 's') {
      throw new Error('No se hizo ningún cambio.');
    }
    const contrasenaHash = await hashPassword(await pedirContrasena(correo));
    await administradores.cambiarContrasena(existente.id, contrasenaHash);
    await administradores.actualizar(existente.id, { activo: 1 });
    await administradores.revocarSesionesDe(existente.id);
    await bitacora.registrar({ accion: 'restablecer_contrasena_terminal', entidad: 'administrador', idEntidad: existente.id });
    console.log('Contraseña restablecida. Se cerraron todas sus sesiones abiertas.');
    return;
  }

  const nombre = (await preguntar('Nombre completo: ')).trim();
  if (nombre.length === 0 || nombre.length > 100) {
    throw new Error('El nombre es obligatorio y no puede pasar de 100 caracteres.');
  }
  const rol = await pedirRol((await administradores.listar()).length > 0);
  const contrasenaHash = await hashPassword(await pedirContrasena(correo));

  const id = await administradores.crear({ nombre, correo, contrasenaHash, rol });
  await bitacora.registrar({ accion: 'crear_administrador_terminal', entidad: 'administrador', idEntidad: id, detalle: { correo, rol } });
  console.log(`Administrador creado (${rol}). Ya puede entrar al panel en /admin.`);
}

let pool;
let codigoSalida = 0;
try {
  pool = createDatabasePool(loadDatabaseConfig());
  await main(createAdministradoresRepository(pool), createBitacoraRepository(pool));
} catch (err) {
  codigoSalida = 1;
  console.error(err.message ?? err);
} finally {
  lector.close();
  await pool?.end();
}
process.exit(codigoSalida);
