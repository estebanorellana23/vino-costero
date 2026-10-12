import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './db.js';
import { jwtSecret } from './config.js';

export const JWT_OPTIONS = { algorithms: ['HS256'] as jwt.Algorithm[], issuer: 'vino-costero', audience: 'vino-costero-web' };

export interface AuthRequest extends Request {
  user?: { id: number; rol: string; nombre: string; version?: number };
}

// Middleware: exige un token válido en la cabecera Authorization.
export async function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !/^Bearer [^\s]+$/.test(header)) {
    res.status(401).json({ error: 'Falta el token de sesión' });
    return;
  }
  const token = header.slice(7);
  let id: number;
  let version: number;
  try {
    const claims = jwt.verify(token, jwtSecret!, JWT_OPTIONS);
    if (typeof claims === 'string' || !Number.isSafeInteger(claims.id) || claims.id <= 0 || !Number.isSafeInteger(claims.ver) || claims.ver < 0) throw new Error('Invalid subject');
    id = claims.id;
    version = claims.ver;
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
    return;
  }
  try {
    const [rows]: any = await pool.query('SELECT id_usuario, rol, nombre, token_version FROM usuario WHERE id_usuario=? AND estado=?', [id, 'activo']);
    if (!rows.length || rows[0].token_version !== version) { res.status(401).json({ error: 'Sesión inválida o expirada' }); return; }
    req.user = { id: rows[0].id_usuario, rol: rows[0].rol, nombre: rows[0].nombre, version };
    next();
  } catch (error) {
    next(error);
  }
}

// Middleware: exige que el rol del usuario esté entre los permitidos.
// Se usa después de verificarToken para proteger un módulo por rol.
export function permitirRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'Tu rol no tiene acceso a este módulo' });
      return;
    }
    next();
  };
}
