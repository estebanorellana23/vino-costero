import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { production } from './config.js';

export async function productionCheck() {
  if (!production) return;
  for (const table of ['medicion_azucar','estado_sanitario','cosecha']) {
    const [legacy]:any=await pool.query(`SELECT 1 FROM ${table} WHERE id_siembra IS NULL LIMIT 1`);
    if(legacy.length) throw new Error('Existen registros históricos sin ciclo verificado; completar conciliación antes de producción');
  }
  // Do not silently carry public demonstration passwords into production.
  const demo = [
    ['admin', 'admin123'], ['gerente', 'gerente123'], ['agronomo', 'agro123'],
    ['enologo', 'enologo123'], ['logistica', 'logistica123'], ['marketing', 'marketing123'],
  ];
  for (const [user, password] of demo) {
    const [rows]: any = await pool.query('SELECT contrasena FROM usuario WHERE usuario=? AND estado=?', [user, 'activo']);
    if (rows.length && await bcrypt.compare(password, rows[0].contrasena)) {
      throw new Error('Existen cuentas demo activas; requiere revisión y rotación antes de producción');
    }
  }
}
