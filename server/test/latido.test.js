import test from 'node:test';
import assert from 'node:assert/strict';
import { ARRIENDO_SEGUNDOS, iniciarLatido } from '../src/services/mail/latido.js';

test('latido: renueva el arriendo cada 30 s y se detiene', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const renovados = [];
  const colaCorreo = {
    async renovar(id, segundos) {
      renovados.push([id, segundos]);
    },
  };

  const detener = iniciarLatido(colaCorreo, 42, { warn() {} });
  t.mock.timers.tick(30_000);
  t.mock.timers.tick(30_000);
  assert.deepEqual(renovados, [
    [42, ARRIENDO_SEGUNDOS],
    [42, ARRIENDO_SEGUNDOS],
  ]);

  detener();
  t.mock.timers.tick(60_000);
  assert.equal(renovados.length, 2);
});
