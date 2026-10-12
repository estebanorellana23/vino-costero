import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './initDb.js';
import authRoutes from './routes/auth.routes.js';
import parcelasRoutes from './routes/parcelas.routes.js';
import variedadesRoutes from './routes/variedades.routes.js';
import siembrasRoutes from './routes/siembras.routes.js';
import medicionesRoutes from './routes/mediciones.routes.js';
import cosechaRoutes from './routes/cosecha.routes.js';
import lotesRoutes from './routes/lotes.routes.js';
import bodegasRoutes from './routes/bodegas.routes.js';
import logisticaRoutes from './routes/logistica.routes.js';
import gestionRoutes from './routes/gestion.routes.js';
import { demoMode, allowedOrigins } from './config.js';
import { pool } from './db.js';
import { errorHandler } from './http.js';
import { validateInput } from './validation.js';
import { productionCheck } from './productionCheck.js';
import campoRoutes from './routes/campo.routes.js';
import { schemaCheck } from './schemaCheck.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import iotRoutes from './routes/iot.routes.js';
import { trustProxyHops } from './deployConfig.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', trustProxyHops(process.env.TRUST_PROXY));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(cors({ origin: (origin, done) => done(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json({ limit: '32kb', strict: true }));
app.use('/api', validateInput);

// Prueba de vida de la API
app.get('/api/health', (_req, res) => res.json({ ok: true, api: 'vino-costero', modulo: 'campo' }));
app.get('/api/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

// Rutas por módulo
app.use('/api/auth', authRoutes);
app.use('/api/parcelas', parcelasRoutes);
app.use('/api/variedades', variedadesRoutes);
app.use('/api/siembras', siembrasRoutes);
app.use('/api/mediciones', medicionesRoutes);
app.use('/api/cosecha', cosechaRoutes);
app.use('/api/lotes', lotesRoutes);
app.use('/api/bodegas', bodegasRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/gestion', gestionRoutes);
app.use('/api/campo', campoRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/iot', iotRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;

// Arranque normal sin DDL; la carga de muestras requiere modo demo explícito.
(demoMode ? initDb() : pool.query('SELECT id_usuario FROM usuario LIMIT 0'))
  .then(() => schemaCheck())
  .then(() => productionCheck())
  .then(() => {
    const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => console.log(`API lista en puerto ${PORT}`));
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    const shutdown = () => {
      const deadline = setTimeout(() => process.exit(1), 10000);
      deadline.unref();
      server.close(() => { pool.end().then(() => process.exit(0)).catch(() => process.exit(1)); });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  })
  .catch(() => {
    console.error('No se pudo iniciar: verifica configuración y esquema instalado');
    process.exit(1);
  });
