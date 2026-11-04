import { createAdministradoresRepository } from './administradores.repository.js';
import { createBitacoraRepository } from './bitacora.repository.js';
import { createCatalogoRepository } from './catalogo.repository.js';
import { createColaCorreoRepository } from './colaCorreo.repository.js';
import { createCorreoAdminRepository } from './correoAdmin.repository.js';
import { createCuentasCorreoRepository } from './cuentasCorreo.repository.js';
import { createCuestionarioRepository } from './cuestionario.repository.js';
import { createEnviosCorreoRepository } from './enviosCorreo.repository.js';
import { createParticipacionesRepository } from './participaciones.repository.js';
import { createReportesRepository } from './reportes.repository.js';

/**
 * Reúne todos los repositorios en un solo objeto. Son la ÚNICA parte del código que escribe SQL.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createRepositories(pool) {
  return {
    catalogo: createCatalogoRepository(pool),
    cuestionario: createCuestionarioRepository(pool),
    participaciones: createParticipacionesRepository(pool),
    cuentasCorreo: createCuentasCorreoRepository(pool),
    enviosCorreo: createEnviosCorreoRepository(pool),
    colaCorreo: createColaCorreoRepository(pool),
    administradores: createAdministradoresRepository(pool),
    bitacora: createBitacoraRepository(pool),
    reportes: createReportesRepository(pool),
    correoAdmin: createCorreoAdminRepository(pool),
  };
}
