import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';
import { harvestReady } from '../fieldRules.js';
import { audit } from '../audit.js';

const router = Router();
router.use(verificarToken);
// La cosecha es el traspaso Campo → Producción: también la lee el Enólogo.
router.use(permitirRoles('Administrador', 'Gerente', 'Agronomo', 'Enologo'));
const soloEscritura = permitirRoles('Administrador', 'Agronomo');

// GET /api/cosecha  → historial de cosechas
router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id_cosecha, c.id_parcela, c.fecha_cosecha, c.kilogramos,
            c.clasificacion, c.responsable,
            p.codigo AS parcela_codigo, p.nombre AS parcela_nombre,
            v.nombre AS variedad
     FROM cosecha c
     JOIN parcela p      ON p.id_parcela  = c.id_parcela
     JOIN variedad_uva v ON v.id_variedad = c.id_variedad
     ORDER BY c.fecha_cosecha DESC, c.id_cosecha DESC`
  );
  res.json(rows);
}));

// POST /api/cosecha  → registrar la cosecha y cerrar la siembra de esa parcela
router.post('/', soloEscritura, asyncHandler(async (req, res) => {
  const { id_parcela, id_siembra, id_variedad, fecha_cosecha, kilogramos, clasificacion, responsable } = req.body;
  if (!id_parcela || !id_variedad || !fecha_cosecha) {
    res.status(400).json({ error: 'Parcela, variedad y fecha son obligatorios' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [parcela]: any = await conn.query('SELECT id_parcela FROM parcela WHERE id_parcela=? FOR UPDATE', [id_parcela]);
    const [activas]: any = await conn.query("SELECT id_siembra, id_variedad, fecha_siembra FROM siembra WHERE id_parcela=? AND estado='activa' FOR UPDATE", [id_parcela]);
    if (!parcela.length || activas.length !== 1 || Number(activas[0].id_siembra) !== Number(id_siembra) || Number(activas[0].id_variedad) !== Number(id_variedad) || fecha_cosecha < activas[0].fecha_siembra) {
      await conn.rollback(); res.status(409).json({ error: 'Se requiere una siembra activa de esa variedad y una fecha posterior a la siembra' }); return;
    }
    const [clock]: any = await conn.query('SELECT CURRENT_DATE AS hoy');
    if (fecha_cosecha > clock[0].hoy) { await conn.rollback(); res.status(400).json({ error: 'La cosecha no puede tener fecha futura' }); return; }
    const [measurements]: any = await conn.query('SELECT id_medicion,brix FROM medicion_azucar WHERE id_siembra=? AND fecha<=? ORDER BY fecha DESC,id_medicion DESC LIMIT 1 FOR UPDATE', [id_siembra, fecha_cosecha]);
    const [health]: any = await conn.query('SELECT id_estado,calificacion FROM estado_sanitario WHERE id_siembra=? AND fecha<=? ORDER BY fecha DESC,id_estado DESC LIMIT 1 FOR UPDATE', [id_siembra, fecha_cosecha]);
    const [variety]: any = await conn.query('SELECT azucar_objetivo FROM variedad_uva WHERE id_variedad=? FOR UPDATE', [id_variedad]);
    const target = variety[0]?.azucar_objetivo == null ? null : Number(variety[0].azucar_objetivo);
    if (!harvestReady(measurements[0]?.brix == null ? null : Number(measurements[0].brix), target, health[0]?.calificacion || null, true)) {
      await conn.rollback(); res.status(409).json({ error: 'La cosecha requiere azúcar objetivo alcanzado y estado sanitario Bueno de esta siembra' }); return;
    }
    const [r]: any = await conn.query(
      `INSERT INTO cosecha (id_parcela,id_siembra,id_variedad,fecha_cosecha,kilogramos,clasificacion,responsable,id_medicion,id_estado_sanitario,brix_objetivo)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id_parcela,id_siembra,id_variedad,fecha_cosecha,kilogramos,clasificacion || null,responsable || null,measurements[0].id_medicion,health[0].id_estado,target]
    );
    // Al cosechar, la siembra activa de esa parcela se cierra.
    await conn.query(
      `UPDATE siembra SET estado='cerrada' WHERE id_siembra=?`,
      [activas[0].id_siembra]
    );
    await audit(conn, req, 'Campo', 'registrar:cosecha', r.insertId);
    await conn.commit();
    res.status(201).json({ id_cosecha: r.insertId });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error al registrar la cosecha' });
  } finally {
    conn.release();
  }
}));

export default router;
