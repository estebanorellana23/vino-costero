import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { verificarToken, permitirRoles, type AuthRequest } from '../auth.js';
import { asyncHandler } from '../http.js';
import { audit } from '../audit.js';
import { validNewPassword, validUsername, USER_ROLES } from '../passwordPolicy.js';

const router=Router();
router.use(verificarToken,permitirRoles('Administrador'));

router.get('/',asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query('SELECT id_usuario,nombre,usuario,rol,estado FROM usuario ORDER BY nombre,id_usuario');
  res.json(rows);
}));

router.post('/',asyncHandler(async(req:AuthRequest,res)=>{
  const {nombre,usuario,contrasena,rol}=req.body || {};
  if(typeof nombre!=='string' || !nombre.trim() || nombre.length>80 || !validUsername(usuario) || !validNewPassword(contrasena) || !USER_ROLES.includes(rol)) {
    res.status(400).json({error:'Revisa nombre, usuario, rol y contraseña (16–72 bytes UTF-8)'});return;
  }
  const hash=await bcrypt.hash(contrasena,12);
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [actor]:any=await conn.query('SELECT rol,estado,token_version FROM usuario WHERE id_usuario=? FOR UPDATE',[req.user!.id]);
    if(!actor.length || actor[0].rol!=='Administrador' || actor[0].estado!=='activo' || actor[0].token_version!==req.user!.version) {
      await conn.rollback();res.status(401).json({error:'Sesión inválida o expirada'});return;
    }
    const [result]:any=await conn.query('INSERT INTO usuario (nombre,usuario,contrasena,rol,estado) VALUES (?,?,?,?,?)',[nombre.trim(),usuario,hash,rol,'activo']);
    await audit(conn,req,'Seguridad','crear:usuario',result.insertId);
    await conn.commit();res.status(201).json({id_usuario:result.insertId});
  } catch(error:any){await conn.rollback();if(error.code==='ER_DUP_ENTRY'){res.status(409).json({error:'Ese nombre de usuario ya existe'});return;}throw error;}
  finally{conn.release();}
}));

router.put('/:id',asyncHandler(async(req:AuthRequest,res)=>{
  const id=Number(req.params.id), {rol,estado}=req.body || {};
  if(!Number.isSafeInteger(id) || id<1 || !USER_ROLES.includes(rol) || !['activo','inactivo'].includes(estado)) {res.status(400).json({error:'Usuario, rol o estado inválidos'});return;}
  if(id===req.user!.id) {res.status(409).json({error:'Otro administrador debe modificar tu rol o estado'});return;}
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Serializes administrator removals, so two concurrent requests cannot remove both.
    const [admins]:any=await conn.query("SELECT id_usuario FROM usuario WHERE rol='Administrador' AND estado='activo' ORDER BY id_usuario FOR UPDATE");
    const [actor]:any=await conn.query('SELECT rol,estado,token_version FROM usuario WHERE id_usuario=? FOR UPDATE',[req.user!.id]);
    if(!actor.length || actor[0].rol!=='Administrador' || actor[0].estado!=='activo' || actor[0].token_version!==req.user!.version) {
      await conn.rollback();res.status(401).json({error:'Sesión inválida o expirada'});return;
    }
    const [rows]:any=await conn.query('SELECT rol,estado FROM usuario WHERE id_usuario=? FOR UPDATE',[id]);
    if(!rows.length){await conn.rollback();res.status(404).json({error:'Usuario no encontrado'});return;}
    if(rows[0].rol==='Administrador' && rows[0].estado==='activo' && (rol!=='Administrador' || estado!=='activo') && admins.length<=1) {
      await conn.rollback();res.status(409).json({error:'Debe conservarse al menos un administrador activo'});return;
    }
    await conn.query('UPDATE usuario SET rol=?,estado=?,token_version=token_version+1 WHERE id_usuario=?',[rol,estado,id]);
    await audit(conn,req,'Seguridad','actualizar:acceso',id);
    await conn.commit();res.json({ok:true});
  } catch(error){await conn.rollback();throw error;}
  finally{conn.release();}
}));

export default router;
