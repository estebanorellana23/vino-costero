import type { PoolConnection } from 'mysql2/promise';
import type { AuthRequest } from './auth.js';
import { pool } from './db.js';

export async function audit(conn: PoolConnection, req: AuthRequest, modulo: string, accion: string, id?: number) {
  if (!req.user) throw new Error('Authenticated actor required');
  await conn.query('INSERT INTO bitacora (id_usuario, modulo, accion, detalle) VALUES (?,?,?,?)',
    [req.user.id, modulo, accion.slice(0, 100), id == null ? null : `registro=${id}`]);
}

export async function auditedQuery(req: AuthRequest, modulo: string, sql: string, values: unknown[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await conn.query(sql, values);
    const changed = result[0] as any;
    if (changed.affectedRows > 0) await audit(conn, req, modulo, req.method, changed.insertId || Number(req.params.id) || undefined);
    await conn.commit();
    return result;
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
