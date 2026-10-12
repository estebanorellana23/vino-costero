import mysql from 'mysql2/promise';
import 'dotenv/config';
import { dbSsl } from './deployConfig.js';

// Pool de conexiones a MySQL. La conexión es "perezosa":
// no se conecta hasta la primera consulta, así que la base ya existe para entonces.
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  ssl: dbSsl(process.env),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 5000,
  timezone: 'Z',
  dateStrings: true,
});
