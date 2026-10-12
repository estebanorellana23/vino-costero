import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';
import { dbSsl } from './deployConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Operator-only command: installs db/production-schema.sql into the database named by DB_NAME.
// It refuses to touch a database that already contains tables, and it never creates accounts or data.
async function main() {
  const database = process.env.DB_NAME;
  if (!database || !process.env.DB_HOST || !process.env.DB_USER) throw new Error('Faltan DB_HOST, DB_USER o DB_NAME');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database,
    ssl: dbSsl(process.env),
    multipleStatements: true,
    connectTimeout: 15000,
  });
  try {
    const [existing]: any = await conn.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    if (existing[0].n > 0) throw new Error('La base ya tiene tablas; la instalación solo se permite sobre una base vacía');
    const sql = readFileSync(join(__dirname, '..', '..', 'db', 'production-schema.sql'), 'utf8')
      .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
      .replace(/^\s*USE\s+[^;]*;/im, '');
    // The script normally creates its own database with this collation; here the database already exists.
    await conn.query('ALTER DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci', [database]);
    await conn.query(sql);
    const [after]: any = await conn.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    console.log(`Esquema instalado: ${after[0].n} tablas. Falta crear el primer administrador con el comando de cuentas.`);
  } finally {
    await conn.end();
  }
}

main().catch((error: any) => {
  console.error(error instanceof Error && error.message.startsWith('La base') ? error.message : `Instalación fallida (${error?.code ?? 'ERROR'}). Revisa la conexión y los permisos.`);
  process.exitCode = 1;
});
