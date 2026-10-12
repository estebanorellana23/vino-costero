import 'dotenv/config';

export const production = process.env.NODE_ENV === 'production';
export const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32 || /^(dev_secret|change|replace)/i.test(jwtSecret)) {
  throw new Error('JWT_SECRET debe contener una clave aleatoria de al menos 32 bytes');
}
if (production) {
  for (const name of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'WEB_ORIGIN']) {
    if (!process.env[name]) throw new Error(`Falta configuración de producción: ${name}`);
  }
  if (process.env.DB_USER === 'root') throw new Error('Producción requiere un usuario MySQL sin permisos administrativos');
  if (!process.env.WEB_ORIGIN!.split(',').every((origin) => {
    try { const url = new URL(origin.trim()); return url.protocol === 'https:' && url.origin === origin.trim(); } catch { return false; }
  })) throw new Error('WEB_ORIGIN debe contener orígenes HTTPS separados por comas');
}

export const allowedOrigins = (process.env.WEB_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim());
export const demoMode = !production && process.env.DEMO_MODE === 'true';
