import { pool } from './db.js';

// Startup checks structure without changing records or running migrations.
export async function schemaCheck() {
  await pool.query('SELECT token_hash,temperatura_min_c,temperatura_max_c,intervalo_max_s FROM iot_gateway LIMIT 0');
  await pool.query('SELECT lectura_uuid,humedad_suelo_pct,origen FROM iot_clima LIMIT 0');
  await pool.query('SELECT lectura_uuid FROM iot_alerta LIMIT 0');
  await pool.query('SELECT token_version FROM usuario LIMIT 0');
  await pool.query('SELECT id_siembra FROM medicion_azucar LIMIT 0');
  await pool.query('SELECT id_siembra FROM estado_sanitario LIMIT 0');
  await pool.query('SELECT id_siembra,id_medicion,id_estado_sanitario,brix_objetivo FROM cosecha LIMIT 0');
  for (const table of ['control_tierra','dimension_parcela','control_siembra','enfermedad','siembra_enferma','punto_control','medicion_punto_control','bitacora']) {
    await pool.query(`SELECT 1 FROM ${table} LIMIT 0`);
  }
  const [engines]:any=await pool.query('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=?',['BASE TABLE']);
  if(engines.some((row:any)=>row.ENGINE!=='InnoDB')) throw new Error('Transactional schema requires InnoDB');
}
