import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles, type AuthRequest } from '../auth.js';
import { asyncHandler } from '../http.js';
import { resources, parseFields, InputError } from '../fieldRules.js';
import { audit } from '../audit.js';

const router = Router();
router.use(verificarToken, permitirRoles('Administrador', 'Gerente', 'Agronomo'));
const write = permitirRoles('Administrador', 'Agronomo');

router.get('/:recurso', asyncHandler(async (req, res) => {
  if (!Object.hasOwn(resources, req.params.recurso)) { res.status(404).json({ error: 'Registro no disponible' }); return; }
  const resource = resources[req.params.recurso as keyof typeof resources];
  const page = Number(req.query.page || 0);
  const parcel = Number(req.query.id_parcela);
  const catalog = ['enfermedades','variedades'].includes(req.params.recurso);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000 || (!catalog && (!Number.isSafeInteger(parcel) || parcel < 1))) {
    res.status(400).json({ error: 'Parcela y página deben ser válidas' }); return;
  }
  let join = '', where = '', extra = '';
  const values: unknown[] = [];
  if (!catalog) {
    if ('id_siembra' in resource.fields) {
      join = ' JOIN siembra s ON s.id_siembra=r.id_siembra'; where = ' WHERE s.id_parcela=?';
      extra = ', s.fecha_siembra';
      if (req.params.recurso === 'incidencias') { join += ' JOIN enfermedad e ON e.id_enfermedad=r.id_enfermedad'; extra += ', e.nombre AS enfermedad'; }
    } else if (req.params.recurso === 'mediciones-puntos') {
      join = ' JOIN punto_control p ON p.id_punto_control=r.id_punto_control'; where = ' WHERE p.id_parcela=?'; extra = ', p.nombre AS punto';
    } else where = ' WHERE r.id_parcela=?';
    values.push(parcel);
  }
  if (req.params.recurso === 'dimensiones') extra += ', ROUND(r.cant_plantas/r.superficie_ha, 2) AS densidad';
  if (req.params.recurso === 'puntos') extra += `, (r.fecha_prog<CURRENT_DATE AND NOT EXISTS (SELECT 1 FROM medicion_punto_control m WHERE m.id_punto_control=r.id_punto_control)) AS vencido`;
  const [rows]: any = await pool.query(`SELECT r.*${extra} FROM ${resource.table} r${join}${where} ORDER BY r.${resource.key} DESC LIMIT 101 OFFSET ?`, [...values, page * 100]);
  res.json({ rows: rows.slice(0,100), nextPage: rows.length > 100 ? page + 1 : null });
}));

router.post('/:recurso', write, asyncHandler(async (req: AuthRequest, res) => {
  if (!Object.hasOwn(resources, req.params.recurso)) { res.status(404).json({ error: 'Registro no disponible' }); return; }
  const resource = resources[req.params.recurso as keyof typeof resources];
  let data: Record<string, string | number | null>;
  try { data = parseFields(resource.fields, req.body); }
  catch (error) { if (error instanceof InputError) { res.status(400).json({ error: error.message }); return; } throw error; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let parcel = data.id_parcela;
    if (data.id_siembra) {
      const [cycles]: any = await conn.query('SELECT id_parcela FROM siembra WHERE id_siembra=?', [data.id_siembra]);
      if (!cycles.length) throw new InputError('La siembra no existe');
      parcel = cycles[0].id_parcela;
    }
    if (data.id_punto_control) {
      const [points]: any = await conn.query('SELECT id_parcela FROM punto_control WHERE id_punto_control=?', [data.id_punto_control]);
      if (!points.length) throw new InputError('El punto de control no existe');
      parcel = points[0].id_parcela;
      data.id_usuario = req.user!.id;
    }
    if (parcel) {
      const [parcels]: any = await conn.query('SELECT id_parcela FROM parcela WHERE id_parcela=? FOR UPDATE', [parcel]);
      if (!parcels.length) throw new InputError('La parcela no existe');
    }
    const eventDate = String(data.fecha || data.fecha_deteccion || '');
    if (data.id_siembra) {
      const [cycles]: any = await conn.query('SELECT estado, fecha_siembra FROM siembra WHERE id_siembra=? FOR UPDATE', [data.id_siembra]);
      if (cycles[0].estado !== 'activa' || eventDate < cycles[0].fecha_siembra) throw new InputError('El control requiere una siembra activa y una fecha posterior a su inicio');
      if (req.params.recurso === 'sanidad') data.id_parcela = parcel;
    }
    if (eventDate) {
      const [clock]: any = await conn.query('SELECT CURRENT_DATE AS hoy');
      if (eventDate > clock[0].hoy) throw new InputError('No se pueden registrar controles con fecha futura');
    }
    const keys = Object.keys(data);
    const [result]: any = await conn.query(`INSERT INTO ${resource.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map(key => data[key]));
    await audit(conn, req, 'Campo', `registrar:${req.params.recurso}`, result.insertId);
    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (error: any) {
    await conn.rollback();
    if (error instanceof InputError) { res.status(409).json({ error: error.message }); return; }
    if (error.code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Ese registro ya existe' }); return; }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') { res.status(400).json({ error: 'La referencia seleccionada no existe' }); return; }
    throw error;
  } finally { conn.release(); }
}));

export default router;
