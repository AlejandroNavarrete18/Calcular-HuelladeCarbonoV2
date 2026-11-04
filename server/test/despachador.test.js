import test from 'node:test';
import assert from 'node:assert/strict';
import { createDespachadorCorreo } from '../src/services/mail/despachador.service.js';

const logger = { info() {}, warn() {}, error() {} };

async function esperarHasta(condicion, limiteMs = 2000) {
  const inicio = Date.now();
  while (!condicion()) {
    if (Date.now() - inicio > limiteMs) {
      throw new Error('Se agotó la espera de la condición.');
    }
    await new Promise((resolver) => setTimeout(resolver, 10));
  }
}

const pausa = (milisegundos) => new Promise((resolver) => setTimeout(resolver, milisegundos));

function filaDe(extra = {}) {
  return {
    id: 7,
    nombre: 'Ana',
    apellidos: 'Pérez',
    correo: 'ana@example.com',
    respuestas: {},
    hogarKg: 1000,
    transporteKg: 500,
    consumoKg: 700,
    totalKg: 2200,
    nivel: 'medio',
    correoEnviado: 0,
    ...extra,
  };
}

// Arma el despachador con repositorios en memoria. La cola simulada sigue ofreciendo un trabajo mientras no se cierre
function crearEntorno({ trabajos, fila = filaDe(), cuentas = { cuentas: 2, cupo: 100 }, yaEnBitacora = false, enviar }) {
  const abiertos = new Map(trabajos.map((trabajo) => [trabajo.id, trabajo]));
  const registro = { enviados: 0, reclamos: 0, confirmados: [], omitidos: [], fallidos: [], reprogramados: [], liberados: [] };
  const control = { confirmarFalla: false, cuentas, yaEnBitacora };

  const colaCorreo = {
    async reclamar(limite, _arriendo, excluir = []) {
      registro.reclamos += 1;
      return [...abiertos.values()].filter((trabajo) => !excluir.includes(trabajo.id)).slice(0, limite);
    },
    async renovar() {},
    async confirmarEnvio(id, idParticipacion) {
      if (control.confirmarFalla) {
        throw new Error('MySQL no responde');
      }
      abiertos.delete(id);
      registro.confirmados.push([id, idParticipacion]);
    },
    async marcarOmitido(id, motivo) {
      abiertos.delete(id);
      registro.omitidos.push([id, motivo]);
    },
    async marcarFallido(id, motivo) {
      abiertos.delete(id);
      registro.fallidos.push([id, motivo]);
    },
    async reprogramar(id, espera, motivo, devolverIntento) {
      abiertos.delete(id);
      registro.reprogramados.push({ id, espera, motivo, devolverIntento });
    },
    async contarPorEstado() {
      return { pendiente: abiertos.size, enviando: 0, enviado: 0, fallido: 0, omitido: 0 };
    },
  };

  const repositories = {
    colaCorreo,
    cuentasCorreo: { resumenDisponible: async () => control.cuentas },
    enviosCorreo: { existeEnviado: async () => control.yaEnBitacora },
    participaciones: { buscarParaReenvio: async () => fila },
  };

  const mailService = {
    async sendResultsEmail(datos) {
      registro.enviados += 1;
      return enviar(datos);
    },
  };

  const despachador = createDespachadorCorreo({
    repositories,
    mailService,
    recipientLimiter: { release: (correo) => registro.liberados.push(correo) },
    logger,
    reintentos: { veces: 2, esperaMs: 1 },
  });

  return { despachador, registro, control };
}

const envioExitoso = async () => ({ messageId: 'id-1', dryRun: false });

function errorSmtp(responseCode, response, code = '') {
  const error = new Error(response);
  error.responseCode = responseCode;
  error.response = response;
  error.code = code;
  return error;
}

test('envía el correo una sola vez y lo confirma', async () => {
  const { despachador, registro } = crearEntorno({ trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }], enviar: envioExitoso });
  await despachador.iniciar();
  await esperarHasta(() => registro.confirmados.length === 1);
  await despachador.detener();

  assert.equal(registro.enviados, 1);
  assert.deepEqual(registro.confirmados, [[1, 7]]);
});

test('no envía si la bitácora ya lo tiene como enviado, solo repara el registro', async () => {
  const { despachador, registro } = crearEntorno({
    trabajos: [{ id: 1, idParticipacion: 7, intentos: 2 }],
    yaEnBitacora: true,
    enviar: envioExitoso,
  });
  await despachador.iniciar();
  await esperarHasta(() => registro.confirmados.length === 1);
  await despachador.detener();

  assert.equal(registro.enviados, 0);
});

test('omite el trabajo si la participación ya tiene el correo enviado', async () => {
  const { despachador, registro } = crearEntorno({
    trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }],
    fila: filaDe({ correoEnviado: 1 }),
    enviar: envioExitoso,
  });
  await despachador.iniciar();
  await esperarHasta(() => registro.omitidos.length === 1);
  await despachador.detener();

  assert.equal(registro.enviados, 0);
});

test('si el correo sale pero falla anotarlo, no se vuelve a enviar y se anota después', async () => {
  const { despachador, registro, control } = crearEntorno({ trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }], enviar: envioExitoso });
  control.confirmarFalla = true;

  await despachador.iniciar();
  await esperarHasta(() => registro.enviados === 1);
  await pausa(100);
  // La cola sigue ofreciendo el mismo trabajo pero el despachador no lo toma otra vez.
  despachador.despertar();
  despachador.despertar();
  await pausa(100);
  assert.equal(registro.enviados, 1);
  assert.equal(registro.confirmados.length, 0);

  control.confirmarFalla = false;
  despachador.despertar();
  await esperarHasta(() => registro.confirmados.length === 1);
  await despachador.detener();

  assert.equal(registro.enviados, 1);
  assert.deepEqual(registro.confirmados, [[1, 7]]);
});

test('un envío lento no es reclamado de nuevo mientras sigue en marcha', async () => {
  const terminaciones = [];
  const envioLento = () =>
    new Promise((resolver) => {
      terminaciones.push(() => resolver({ messageId: 'id-lento', dryRun: false }));
    });
  const { despachador, registro } = crearEntorno({ trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }], enviar: envioLento });

  await despachador.iniciar();
  await esperarHasta(() => registro.enviados >= 1);
  despachador.despertar();
  despachador.despertar();
  despachador.despertar();
  await pausa(150);

  const envios = registro.enviados;
  terminaciones.forEach((terminar) => terminar());
  await esperarHasta(() => registro.confirmados.length >= 1);
  await despachador.detener();

  assert.equal(envios, 1, 'el correo se envió más de una vez mientras el primer envío seguía en marcha');
});

test('error de cuota: el correo espera sin gastar intento ni quedar fallido', async () => {
  const enviar = async () => {
    throw errorSmtp(550, '550-5.4.5 Daily user sending limit exceeded');
  };
  const { despachador, registro } = crearEntorno({ trabajos: [{ id: 1, idParticipacion: 7, intentos: 3 }], enviar });
  await despachador.iniciar();
  await esperarHasta(() => registro.reprogramados.length === 1);
  await despachador.detener();

  assert.equal(registro.reprogramados[0].devolverIntento, true);
  assert.equal(registro.fallidos.length, 0);
});

test('destinatario inexistente: queda fallido y se libera su límite por hora', async () => {
  const enviar = async () => {
    throw errorSmtp(550, '550-5.1.1 The email account does not exist');
  };
  const { despachador, registro } = crearEntorno({ trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }], enviar });
  await despachador.iniciar();
  await esperarHasta(() => registro.fallidos.length === 1);
  await despachador.detener();

  assert.deepEqual(registro.liberados, ['ana@example.com']);
  assert.equal(registro.reprogramados.length, 0);
});

test('error temporal: se reprograma gastando intento; con intentos agotados queda fallido', async () => {
  const enviar = async () => {
    throw errorSmtp(421, '421 4.7.0 Try again later');
  };
  const { despachador, registro } = crearEntorno({
    trabajos: [
      { id: 1, idParticipacion: 7, intentos: 2 },
      { id: 2, idParticipacion: 7, intentos: 10 },
    ],
    enviar,
  });
  await despachador.iniciar();
  await esperarHasta(() => registro.reprogramados.length === 1 && registro.fallidos.length === 1);
  await despachador.detener();

  assert.equal(registro.reprogramados[0].id, 1);
  assert.ok(!registro.reprogramados[0].devolverIntento);
  assert.equal(registro.fallidos[0][0], 2);
});

test('sin cuentas con cupo no toca la cola', async () => {
  const { despachador, registro } = crearEntorno({
    trabajos: [{ id: 1, idParticipacion: 7, intentos: 1 }],
    cuentas: { cuentas: 0, cupo: 0 },
    enviar: envioExitoso,
  });
  await despachador.iniciar();
  await pausa(200);
  await despachador.detener();

  assert.equal(registro.reclamos, 0);
  assert.equal(registro.enviados, 0);
});
