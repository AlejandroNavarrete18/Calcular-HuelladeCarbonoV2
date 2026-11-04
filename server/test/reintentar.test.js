import test from 'node:test';
import assert from 'node:assert/strict';
import { reintentar } from '../src/utils/reintentar.js';

test('reintentar: devuelve el resultado cuando un intento posterior funciona', async () => {
  let llamadas = 0;
  const resultado = await reintentar(
    async () => {
      llamadas += 1;
      if (llamadas < 3) {
        throw new Error('falla');
      }
      return 'listo';
    },
    { veces: 5, esperaMs: 1 }
  );
  assert.equal(resultado, 'listo');
  assert.equal(llamadas, 3);
});

test('reintentar: lanza el error del último intento si todos fallan', async () => {
  let llamadas = 0;
  await assert.rejects(
    reintentar(
      async () => {
        llamadas += 1;
        throw new Error(`falla ${llamadas}`);
      },
      { veces: 3, esperaMs: 1 }
    ),
    /falla 3/
  );
  assert.equal(llamadas, 3);
});
