import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Dummy configuration, no ambient database or real identity is used.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-key-with-at-least-thirty-two-bytes';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'fixture';
process.env.DB_PASSWORD = 'fixture';
process.env.DB_NAME = 'fixture';
const { verificarToken, permitirRoles } = await import('../src/auth.js');
const { pool } = await import('../src/db.js');
const options: jwt.SignOptions = { algorithm: 'HS256', issuer: 'vino-costero', audience: 'vino-costero-web', expiresIn: '1h' };
function response() {
  return { statusCode: 200, status(code: number) { this.statusCode = code; return this; }, json(_value: unknown) { return this; } };
}

test('signed role is replaced by current database role; revoked account is rejected', async () => {
  const original = pool.query;
  const token = jwt.sign({ id: 1, ver: 0, rol: 'Administrador', nombre: 'Fixture' }, process.env.JWT_SECRET!, options);
  try {
    (pool as any).query = async () => [[{ id_usuario: 1, rol: 'Gerente', nombre: 'Fixture', token_version: 0 }]];
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    let next = false;
    await verificarToken(req, response() as any, () => { next = true; });
    assert.equal(next, true); assert.equal(req.user.rol, 'Gerente');
    const denied = response();
    permitirRoles('Administrador', 'Agronomo')(req, denied as any, () => assert.fail('Gerente may not write'));
    assert.equal(denied.statusCode, 403);
    (pool as any).query = async () => [[{ id_usuario: 1, rol: 'Administrador', nombre: 'Fixture', token_version: 1 }]];
    const rotated=response();
    await verificarToken(req,rotated as any,()=>assert.fail('Old credential version accepted'));
    assert.equal(rotated.statusCode,401);
    (pool as any).query = async () => [[]];
    const revoked = response();
    await verificarToken(req, revoked as any, () => assert.fail('Inactive account accepted'));
    assert.equal(revoked.statusCode, 401);
  } finally { pool.query = original; }
});

test('wrong audience, expiry, signing key or authorization scheme is rejected before querying database', async () => {
  const original = pool.query;
  try {
    (pool as any).query = async () => assert.fail('Invalid JWT must not reach database');
    const invalid = [
      `Bearer ${jwt.sign({ id: 1, ver: 0 }, process.env.JWT_SECRET!, { ...options, audience: 'other-app' })}`,
      `Bearer ${jwt.sign({ id: 1, ver: 0 }, process.env.JWT_SECRET!, { ...options, expiresIn: -1 })}`,
      `Bearer ${jwt.sign({ id: 1, ver: 0 }, 'wrong-key', options)}`,
      `Basic ${jwt.sign({ id: 1, ver: 0 }, process.env.JWT_SECRET!, options)}`,
      `Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET!, options)}`,
    ];
    for (const authorization of invalid) {
      const res = response();
      await verificarToken({ headers: { authorization } } as any, res as any, () => assert.fail('Invalid JWT accepted'));
      assert.equal(res.statusCode, 401);
    }
  } finally { pool.query = original; }
});
