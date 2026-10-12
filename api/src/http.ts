import type { RequestHandler, ErrorRequestHandler } from 'express';

// Express 4 does not forward rejected async handlers. Wrap before registration.
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
}

// A bounded process-local guard. Multi-instance deployments must also rate-limit at the edge.
export function loginLimiter(): RequestHandler {
  return boundedLimiter(20,15 * 60_000);
}

export function boundedLimiter(limit: number, windowMs: number): RequestHandler {
  const attempts = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, item] of attempts) if (item.until <= now) attempts.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const item = attempts.get(key) || { count: 0, until: now + windowMs };
    if (item.count >= limit || (!attempts.has(key) && attempts.size >= 10_000)) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((item.until - now) / 1000)));
      res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
      return;
    }
    item.count++;
    attempts.set(key, item);
    next();
  };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) { _next(error); return; }
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  // Never emit SQL, credentials, request bodies or raw exception messages.
  if (status === 500) console.error(JSON.stringify({ event: 'request_failed' }));
  res.status(status).json({ error: status === 500 ? 'No se pudo completar la operación' : 'Solicitud inválida' });
};
