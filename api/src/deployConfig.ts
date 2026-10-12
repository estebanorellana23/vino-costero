import { readFileSync } from 'node:fs';

// Behind a hosting proxy (Render, Cloudflare) every request arrives from the proxy's address, so the
// login limiter would count all users together. TRUST_PROXY states how many proxy hops to trust.
export function trustProxyHops(value: string | undefined): number | false {
  if (value === undefined || value === '') return false;
  if (!/^[1-5]$/.test(value)) throw new Error('TRUST_PROXY debe ser un número de saltos entre 1 y 5');
  return Number(value);
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

// TLS to a remote database. The certificate authority comes from DB_SSL_CA (PEM text, "\n" allowed)
// or DB_SSL_CA_FILE (path). Certificates are always verified; there is no switch to disable that.
export function dbSsl(env: NodeJS.ProcessEnv, read: (path: string) => string = (path) => readFileSync(path, 'utf8')) {
  const inline = env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
  const ca = inline || (env.DB_SSL_CA_FILE ? read(env.DB_SSL_CA_FILE).trim() : '');
  if (ca) {
    if (!ca.includes('BEGIN CERTIFICATE')) throw new Error('La autoridad certificadora de la base no tiene formato PEM');
    return { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' as const };
  }
  if (env.NODE_ENV === 'production' && env.DB_HOST && !LOCAL_HOSTS.has(env.DB_HOST)) {
    throw new Error('Una base remota en producción requiere DB_SSL_CA o DB_SSL_CA_FILE');
  }
  return undefined;
}
