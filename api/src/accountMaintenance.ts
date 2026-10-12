import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { validUsername, validNewPassword } from './passwordPolicy.js';

// Operator-only command. Never imported or invoked by the HTTP application.
async function main() {
  const operation=process.env.ACCOUNT_OPERATION;
  const username=process.env.ACCOUNT_USERNAME;
  const password=process.env.ACCOUNT_NEW_PASSWORD;
  if(!['bootstrap','recover-admin'].includes(operation || '') || process.env.ACCOUNT_CONFIRM!==operation || !validUsername(username) || !validNewPassword(password)) {
    throw new Error('Se requiere operación y confirmación explícitas, usuario válido y contraseña nueva de 16–72 bytes UTF-8');
  }
  const hash=await bcrypt.hash(password,12);
  const conn=await pool.getConnection();
  let locked=false;
  try {
    const [lock]:any=await conn.query("SELECT GET_LOCK('vino-account-maintenance',5) AS acquired");
    if(lock[0].acquired!==1)throw new Error('Otra operación de cuentas está en curso');
    locked=true;
    await conn.beginTransaction();
    let id:number;
    if(operation==='bootstrap'){
      const [existing]:any=await conn.query('SELECT id_usuario FROM usuario LIMIT 1 FOR UPDATE');
      if(existing.length)throw new Error('Bootstrap solo se permite sobre una tabla de usuarios vacía');
      const [result]:any=await conn.query('INSERT INTO usuario (nombre,usuario,contrasena,rol,estado) VALUES (?,?,?,?,?)',['Administrador inicial',username,hash,'Administrador','activo']);
      id=result.insertId;
    } else {
      const [rows]:any=await conn.query('SELECT id_usuario,rol FROM usuario WHERE usuario=? FOR UPDATE',[username]);
      if(!rows.length || rows[0].rol!=='Administrador')throw new Error('La recuperación requiere una cuenta administrativa existente');
      id=rows[0].id_usuario;
      await conn.query("UPDATE usuario SET contrasena=?,estado='activo',token_version=token_version+1 WHERE id_usuario=?",[hash,id]);
    }
    await conn.query('INSERT INTO bitacora (id_usuario,modulo,accion,detalle) VALUES (NULL,?,?,?)',['Seguridad',`operador:${operation}`,`registro=${id}`]);
    await conn.commit();
    console.log('Operación de cuenta completada. No se muestran credenciales.');
  } catch(error){await conn.rollback();throw error;}
  finally{
    try{if(locked)await conn.query("SELECT RELEASE_LOCK('vino-account-maintenance')");}
    finally{conn.release();}
  }
}

main().catch(()=>{console.error('Operación rechazada o fallida. Revisa los requisitos y el esquema sin compartir secretos.');process.exitCode=1;}).finally(()=>pool.end());
