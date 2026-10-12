import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler, loginLimiter, errorHandler } from '../src/http.js';
import { validateInput } from '../src/validation.js';

function response() {
  return { statusCode: 200, body: undefined as any, headers: {} as Record<string, unknown>, headersSent: false,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    setHeader(key: string, value: unknown) { this.headers[key] = value; } };
}

test('Express 4 async rejection reaches error middleware', async () => {
  const failure = new Error('private SQL details');
  let received: unknown;
  asyncHandler(async () => { throw failure; })({} as any, response() as any, error => { received = error; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(received, failure);
  const res = response();
  errorHandler(failure, {} as any, res as any, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(JSON.stringify(res.body).includes('SQL'), false);
});

test('login throttles repeated attempts per client without sharing their budget', () => {
  const middleware = loginLimiter();
  let allowed = 0;
  for (let i = 0; i < 21; i++) {
    const res = response();
    middleware({ ip: '192.0.2.1', socket: {} } as any, res as any, () => { allowed++; });
    if (i === 20) { assert.equal(res.statusCode, 429); assert.ok(res.headers['Retry-After']); }
  }
  assert.equal(allowed, 20);
  middleware({ ip: '192.0.2.2', socket: {} } as any, response() as any, () => { allowed++; });
  assert.equal(allowed, 21);
});

test('malformed and impossible dates, invalid identifiers and negative quantities are rejected', () => {
  for (const body of [
    { id_parcela: 1, id_siembra: 1, id_variedad: 1, fecha_cosecha: '2026-02-30', kilogramos: 10 },
    { id_parcela: {}, id_siembra: 1, id_variedad: 1, fecha_cosecha: '2026-02-20', kilogramos: 10 },
    { id_parcela: 1, id_siembra: 1, id_variedad: 1, fecha_cosecha: '2026-02-20', kilogramos: -10 },
    { id_parcela: 1, id_siembra: 1, id_variedad: 1, fecha_cosecha: '2026-02-20' },
  ]) {
    const res = response(); let called = false;
    validateInput({ method: 'POST', path: '/cosecha', body } as any, res as any, () => { called = true; });
    assert.equal(called, false); assert.equal(res.statusCode, 400);
  }
});

test('zero Brix is valid and validation does not invoke side effects', () => {
  const res = response(); let called = false;
  validateInput({ method: 'POST', path: '/mediciones', body: { id_parcela: 1, id_siembra: 1, brix: 0 } } as any, res as any, () => { called = true; });
  assert.equal(called, true); assert.equal(res.statusCode, 200);
});
