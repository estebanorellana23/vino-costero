import { asyncHandler } from '../http.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { jwtSecret } from '../config.js';
import { loginLimiter } from '../http.js';
import { verificarToken, type AuthRequest } from '../auth.js';
import { audit } from '../audit.js';
import { validNewPassword } from '../passwordPolicy.js';

const router = Router();
router.use('/login', loginLimiter());

// POST /api/auth/login  → { usuario, contrasena }
router.post('/login', asyncHandler(async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (typeof usuario !== 'string' || !usuario.trim() || usuario.length > 50 || typeof contrasena !== 'string' || !contrasena || Buffer.byteLength(contrasena) > 72) {
    res.status(400).json({ error: 'Usuario y contraseña son obligatorios y deben ser válidos' }); return;
  }
  const [rows]: any = await pool.query(
    // Single quotes via a parameter: some hosts run MySQL with ANSI_QUOTES, where "activo" means a column.
    'SELECT * FROM usuario WHERE usuario = ? AND estado = ?',
    [usuario, 'activo']
  );
  if (rows.length === 0) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    return;
  }
  const u = rows[0];
  const ok = await bcrypt.compare(contrasena || '', u.contrasena);
  if (!ok) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    return;
  }
  const token = jwt.sign(
    { id: u.id_usuario, rol: u.rol, nombre: u.nombre, ver: u.token_version },
    jwtSecret!,
    { expiresIn: '1h', algorithm: 'HS256', issuer: 'vino-costero', audience: 'vino-costero-web' }
  );
  res.json({ token, usuario: { id: u.id_usuario, nombre: u.nombre, rol: u.rol } });
}));

router.get('/me', verificarToken, (req: any, res) => res.json({ usuario: req.user }));

router.post('/password', verificarToken, loginLimiter(), asyncHandler(async (req: AuthRequest,res) => {
  const { actual, nueva } = req.body || {};
  if(typeof actual!=='string' || Buffer.byteLength(actual)>72 || !validNewPassword(nueva)) {
    res.status(400).json({error:'La contraseña nueva debe tener entre 16 y 72 bytes UTF-8'}); return;
  }
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]:any=await conn.query('SELECT contrasena,token_version,estado FROM usuario WHERE id_usuario=? FOR UPDATE',[req.user!.id]);
    if(!rows.length || rows[0].estado!=='activo' || rows[0].token_version!==req.user!.version) {
      await conn.rollback();res.status(401).json({error:'Sesión inválida o expirada'});return;
    }
    if(!await bcrypt.compare(actual,rows[0].contrasena)) {await conn.rollback();res.status(403).json({error:'La contraseña actual no coincide'});return;}
    if(await bcrypt.compare(nueva,rows[0].contrasena)) {await conn.rollback();res.status(400).json({error:'Elige una contraseña distinta de la actual'});return;}
    const hash=await bcrypt.hash(nueva,12);
    await conn.query('UPDATE usuario SET contrasena=?,token_version=token_version+1 WHERE id_usuario=?',[hash,req.user!.id]);
    await audit(conn,req,'Seguridad','cambiar:contraseña',req.user!.id);
    await conn.commit();res.json({ok:true});
  } catch(error){await conn.rollback();throw error;}
  finally{conn.release();}
}));

export default router;
