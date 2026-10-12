import type { RequestHandler } from 'express';

const lengths: Record<string, number> = {
  codigo: 20, nombre: 80, ubicacion: 120, responsable: 100, clasificacion: 40,
  notas: 255, observacion: 255, pais: 60, contacto: 120, destino: 120,
  transporte: 80, concepto: 120, canal: 60,
};
const numeric: Record<string, [number, number, boolean]> = {
  cantidad: [1, 2147483647, true], botellas: [0, 2147483647, true], cajas: [1, 2147483647, true],
  kilogramos: [0.01, 99999999.99, false], litros: [0, 99999999.99, false],
  capacidad_litros: [0.01, 99999999.99, false], monto: [0.01, 9999999999.99, false],
  presupuesto: [0, 9999999999.99, false], brix: [0, 99.9, false],
  puntaje: [0, 99.9, false], temperatura: [-99.9, 99.9, false],
};
const required: Record<string, string[]> = {
  '/parcelas': ['codigo'], '/siembras': ['id_parcela', 'id_variedad', 'fecha_siembra'],
  '/mediciones': ['id_parcela', 'id_siembra', 'brix'], '/cosecha': ['id_parcela', 'id_siembra', 'id_variedad', 'fecha_cosecha', 'kilogramos'],
  '/lotes': ['codigo', 'id_variedad', 'fecha_inicio'], '/bodegas': ['nombre'],
  '/logistica/compradores': ['nombre'], '/logistica/pedidos': ['codigo', 'fecha', 'id_comprador', 'cajas'],
  '/gestion/finanzas': ['concepto', 'tipo', 'monto'], '/gestion/campanias': ['nombre'],
};
export const validateInput: RequestHandler = (req, res, next) => {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method) || req.path.startsWith('/auth/') || req.path.startsWith('/campo/') || req.path.startsWith('/usuarios') || req.path.startsWith('/iot/')) { next(); return; }
  const fail = (field: string) => res.status(400).json({ error: `Valor inválido en ${field}` });
  for (const segment of req.path.split('/')) {
    if (/^-?\d/.test(segment) && (!/^[1-9]\d*$/.test(segment) || !Number.isSafeInteger(Number(segment)))) { fail('identificador'); return; }
  }
  if (req.method === 'DELETE') { next(); return; }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) { fail('solicitud'); return; }
  const body = req.body as Record<string, unknown>;
  if (req.method === 'POST') {
    for (const field of required[req.path] || []) {
      if (body[field] == null || body[field] === '') { fail(field); return; }
    }
  }
  if (req.method === 'PUT' && /^\/parcelas\/\d+$/.test(req.path)) {
    if (!body.codigo || !body.estado) { fail('código o estado'); return; }
  }
  for (const [field, value] of Object.entries(body)) {
    if (value == null || value === '') continue;
    if (typeof value === 'object' || typeof value === 'boolean') { fail(field); return; }
    if (field.startsWith('id_')) {
      if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) { fail(field); return; }
    }
    if (lengths[field] && (typeof value !== 'string' || !value.trim() || value.length > lengths[field])) { fail(field); return; }
    if (numeric[field]) {
      const n = Number(value), [min, max, integer] = numeric[field];
      if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n))) { fail(field); return; }
    }
    if (field === 'fecha' || field.startsWith('fecha_')) {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { fail(field); return; }
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) { fail(field); return; }
    }
    if (field === 'tipo' && !['Ingreso', 'Egreso'].includes(String(value))) { fail(field); return; }
    if (field === 'estado') {
      const allowed = req.path.startsWith('/parcelas') ? ['activa', 'descanso', 'en_preparacion'] : ['Planificada', 'Activa', 'Finalizada'];
      if (!allowed.includes(String(value))) { fail(field); return; }
    }
  }
  next();
};
