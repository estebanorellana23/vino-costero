import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';
import { demoMode } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Crea la base de datos y las tablas (si no existen) ejecutando db/schema.sql,
 * y siembra los usuarios iniciales con la contraseña cifrada (bcrypt).
 * Se llama automáticamente al arrancar la API.
 */
export async function initDb() {
  if (!demoMode) throw new Error('La inicialización con datos demo requiere DEMO_MODE=true fuera de producción');
  const sqlPath = join(__dirname, '..', '..', 'db', 'schema.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  // Conexión SIN base de datos y con multipleStatements para correr todo el archivo.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query(sql);

  // Sembrar un usuario por cada rol (uno por módulo). Se agrega solo el que
  // falte, así funciona tanto en base nueva como en una que ya tenía usuarios.
  const usuarios: [string, string, string, string][] = [
    ['Administrador', 'admin', 'admin123', 'Administrador'],
    ['Gerencia (Familia Garcés)', 'gerente', 'gerente123', 'Gerente'],
    ['Ing. Agrónomo', 'agronomo', 'agro123', 'Agronomo'],
    ['Enólogo', 'enologo', 'enologo123', 'Enologo'],
    ['Encargado de Logística', 'logistica', 'logistica123', 'Logistica'],
    ['Encargado de Marketing', 'marketing', 'marketing123', 'Marketing'],
  ];
  for (const [nombre, usuario, clave, rol] of usuarios) {
    const [ex]: any = await conn.query(
      'SELECT id_usuario FROM vino_costero.usuario WHERE usuario = ?',
      [usuario]
    );
    if (ex.length === 0) {
      const hash = await bcrypt.hash(clave, 10);
      await conn.query(
        'INSERT INTO vino_costero.usuario (nombre, usuario, contrasena, rol) VALUES (?,?,?,?)',
        [nombre, usuario, hash, rol]
      );
    }
  }
  console.log('✓ Usuarios verificados (6 roles: admin, gerente, agronomo, enologo, logistica, marketing)');

  await conn.end();
  console.log('✓ Base de datos lista (vino_costero)');
}
