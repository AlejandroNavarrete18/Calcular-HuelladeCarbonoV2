import { OTHER_INSTITUTION, calculateFootprint } from '@huella/shared';
import { badRequest } from '../utils/errors.js';
import { maskEmail } from '../utils/maskEmail.js';

// Estado del correo que se informa a la persona.
const ESTADO_CORREO = Object.freeze({
  EN_COLA: 'queued', // se enviará en segundo plano
  NO_ENVIADO: 'not_sent', // no se intentó (límite de correos por destinatario)
});

const MENSAJES_REFERENCIA = Object.freeze({
  pais: { field: 'codigoPais', message: 'El país seleccionado no existe.' },
  estado: { field: 'idEstado', message: 'El estado seleccionado no existe.' },
  municipio: { field: 'idMunicipio', message: 'El municipio no pertenece al estado elegido.' },
  unidad: { field: 'idUnidadRegional', message: 'La unidad regional seleccionada no existe.' },
  escuela: { field: 'idEscuelaFacultad', message: 'La escuela o facultad no pertenece a la unidad regional elegida.' },
});

/**
 * Servicio principal: guarda la participación con sus respuestas, calcula los resultados y envía el correo.
 *
 * Orden de las operaciones:
 *   1. Confirmar que país, estado, municipio, unidad y escuela existen y son consistentes entre sí.
 *   2. Calcular los resultados EN EL SERVIDOR con los pesos de MySQL (nunca se confía en cifras del navegador).
 *   3. Guardar participación + respuestas en una transacción.
 *   4. Guardar el correo en la cola PERSISTENTE (misma transacción) y devolver los resultados.
 *
 * El correo NO se espera dentro de la petición: lo envía el despachador (ver mail/despachador.service.js) en
 * segundo plano. Como la cola está en MySQL, si el servidor se reinicia el correo sale cuando vuelve a arrancar.
 *
 * @param {object} deps
 * @param {ReturnType<import('../repositories/index.js').createRepositories>} deps.repositories
 * @param {ReturnType<import('./cuestionario.service.js').createCuestionarioService>} deps.cuestionarioService
 * @param {{despertar: Function}} deps.despachador Despachador de la cola de correos.
 * @param {{tryConsume: Function, release: Function}} deps.recipientLimiter
 * @param {{info: Function, warn: Function, error: Function}} deps.logger
 */
export function createParticipacionesService({ repositories, cuestionarioService, despachador, recipientLimiter, logger }) {
  async function verificarReferencias(datos) {
    const existe = await repositories.catalogo.validarReferencias(datos);
    const errores = [];
    for (const clave of Object.keys(MENSAJES_REFERENCIA)) {
      if (!existe[clave]) {
        errores.push(MENSAJES_REFERENCIA[clave]);
      }
    }
    if (errores.length > 0) {
      throw badRequest('INVALID_REFERENCE', 'Revisa tu ubicación y tu institución.', errores);
    }
  }

  return {
    /**
     * @param {object} datos Datos ya validados por el middleware (ver participacion.validator.js).
     * @param {{questions: object[], indice: Map}} cuestionario El cuestionario con el que se validó (req.cuestionario).
     * @returns {Promise<{results: object, email: {state: string, to: string}}>}
     * @throws {import('../utils/errors.js').HttpError} 400 si las referencias del catálogo no son válidas.
     */
    async registrar(datos, cuestionario) {
      await verificarReferencias(datos);

      // "Otros" (fuera de la UAS) se guarda sin unidad regional: la institución va en institucionExterna.
      let idUnidadRegional = datos.idUnidadRegional;
      if (idUnidadRegional === OTHER_INSTITUTION) {
        idUnidadRegional = null;
      }

      const results = calculateFootprint(datos.answers, cuestionario.questions);
      const respuestas = cuestionarioService.mapearRespuestas(datos.answers, cuestionario);

      // El límite por destinatario se cobra antes de guardar, para que el correo entre a la cola junto con la participación.
      const correoPermitido = recipientLimiter.tryConsume(datos.correo);

      try {
        await repositories.participaciones.guardar({
          participacion: {
            nombre: datos.nombre,
            apellidos: datos.apellidos,
            correo: datos.correo,
            telefono: datos.telefono,
            fechaNacimiento: datos.fechaNacimiento,
            codigoPais: datos.codigoPais,
            idEstado: datos.idEstado,
            idMunicipio: datos.idMunicipio,
            ciudadProvincia: datos.ciudadProvincia,
            localidadComunidad: datos.localidadComunidad,
            idUnidadRegional: idUnidadRegional,
            idEscuelaFacultad: datos.idEscuelaFacultad,
            institucionExterna: datos.institucionExterna,
            hogarKg: results.breakdown.hogar,
            transporteKg: results.breakdown.transporte,
            consumoKg: results.breakdown.consumo,
            totalKg: results.totalKg,
            nivel: results.levelKey,
            respuestasJson: JSON.stringify(datos.answers),
          },
          respuestas,
          encolarCorreo: correoPermitido,
        });
      } catch (error) {
        // No se guardó nada: el envío reservado se devuelve.
        if (correoPermitido) {
          recipientLimiter.release(datos.correo);
        }
        throw error;
      }

      if (!correoPermitido) {
        logger.warn(`Correo no enviado a ${maskEmail(datos.correo)}: límite por destinatario alcanzado.`);
        return { results, email: { state: ESTADO_CORREO.NO_ENVIADO, to: datos.correo } };
      }

      despachador.despertar();
      return { results, email: { state: ESTADO_CORREO.EN_COLA, to: datos.correo } };
    },
  };
}
