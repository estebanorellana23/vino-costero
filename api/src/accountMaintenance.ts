import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { validUsername, validNewPassword } from './passwordPolicy.js';

// Operator-only command. Never imported or invoked by the HTTP application.
async function main() {
  const operation=process.env.ACCOUNT_OPERATION;
  const username=process.env.ACCOUNT_USERNAME;
  const password=process.env.ACCOUNT_NEW_PASSWORD;
  // Reasons are fixed texts: they say which input failed, never what it contained.
  const problems:string[]=[];
  if(!['bootstrap','recover-admin'].includes(operation || ''))problems.push('operación inválida');
  if(process.env.ACCOUNT_CONFIRM!==operation)problems.push('la confirmación debe ser igual a la operación');
  if(!validUsername(username))problems.push('usuario inválido (minúsculas, números, punto, guion o guion bajo; 3 a 50 caracteres)');
  if(!validNewPassword(password))problems.push('contraseña inválida (debe tener entre 16 y 72 bytes UTF-8)');
  if(problems.length)throw new Error('Rechazado: '+problems.join('; '));
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

const KNOWN=/^(Rechazado: |Bootstrap solo|La recuperación requiere|Otra operación)/;
main().catch((error:any)=>{
  console.error(error instanceof Error && KNOWN.test(error.message) ? error.message : `Operación fallida (${error?.code ?? 'ERROR'}). Revisa la conexión y el esquema.`);
  process.exitCode=1;
}).finally(()=>pool.end());
