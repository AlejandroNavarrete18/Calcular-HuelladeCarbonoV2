import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPO_ERROR, clasificarError } from '../src/services/mail/errores.js';

const casos = [
  ['421 4.7.0 "Try again later" es pasajero', { responseCode: 421, response: '421-4.7.0 Try again later, closing connection.' }, TIPO_ERROR.TEMPORAL],
  ['452 4.5.3 demasiados destinatarios es pasajero', { responseCode: 452, response: '452 4.5.3 Too many recipients' }, TIPO_ERROR.TEMPORAL],
  ['550 5.4.5 es el límite diario de Gmail', { responseCode: 550, response: '550-5.4.5 Daily user sending limit exceeded' }, TIPO_ERROR.CUOTA],
  ['550 5.7.1 rechazo por política es definitivo', { responseCode: 550, response: '550 5.7.1 Message rejected as spam by policy' }, TIPO_ERROR.DESTINATARIO],
  ['552 5.2.2 buzón lleno es definitivo', { responseCode: 552, response: '552 5.2.2 Mailbox full' }, TIPO_ERROR.DESTINATARIO],
  ['550 5.1.1 cuenta inexistente es definitiva', { responseCode: 550, response: '550 5.1.1 The email account does not exist' }, TIPO_ERROR.DESTINATARIO],
  ['EENVELOPE de Nodemailer es definitivo', { code: 'EENVELOPE', message: 'No recipients defined' }, TIPO_ERROR.DESTINATARIO],
  ['535 credenciales rechazadas', { code: 'EAUTH', responseCode: 535, response: '535 5.7.8 Username and Password not accepted' }, TIPO_ERROR.CREDENCIALES],
  ['530 autenticación requerida', { responseCode: 530, response: '530-5.7.0 Authentication Required' }, TIPO_ERROR.CREDENCIALES],
  ['timeout de red es pasajero', { code: 'ETIMEDOUT', message: 'Connection timeout' }, TIPO_ERROR.TEMPORAL],
  ['conexión reiniciada es pasajera', { code: 'ECONNRESET', message: 'read ECONNRESET' }, TIPO_ERROR.TEMPORAL],
];

for (const [nombre, error, esperado] of casos) {
  test(`clasificarError: ${nombre}`, () => {
    assert.equal(clasificarError(error), esperado);
  });
}
