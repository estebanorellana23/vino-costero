import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';
import { harvestReady } from '../fieldRules.js';
import { audit } from '../audit.js';

const router = Router();
router.use(verificarToken);
router.use(permitirRoles('Administrador', 'Gerente', 'Agronomo')); // lectura del módulo Campo
const soloEscritura = permitirRoles('Administrador', 'Agronomo');

// GET /api/siembras
// Devuelve cada siembra con su parcela, variedad y objetivo de azúcar.
// Adjunta las mediciones de azúcar de la parcela (trayectoria) y calcula
// automáticamente si la uva ya alcanzó el punto óptimo de cosecha.
router.get('/', asyncHandler(async (_req, res) => {
  const [siembras]: any = await pool.query(
    `SELECT s.id_siembra, s.id_parcela, s.id_variedad, s.fecha_siembra,
            s.cantidad, s.responsable, s.estado,
            p.codigo AS parcela_codigo, p.nombre AS parcela_nombre,
            v.nombre AS variedad, v.azucar_objetivo,
            (SELECT e.calificacion FROM estado_sanitario e WHERE e.id_siembra=s.id_siembra AND e.fecha<=CURRENT_DATE ORDER BY e.fecha DESC, e.id_estado DESC LIMIT 1) AS estado_sanitario,
            (SELECT cs.etapa FROM control_siembra cs WHERE cs.id_siembra=s.id_siembra AND cs.fecha<=CURRENT_DATE ORDER BY cs.fecha DESC, cs.id_control_siembra DESC LIMIT 1) AS etapa
     FROM siembra s
     JOIN parcela p      ON p.id_parcela  = s.id_parcela
     JOIN variedad_uva v ON v.id_variedad = s.id_variedad
     ORDER BY s.fecha_siembra DESC, s.id_siembra DESC`
  );

  const [mediciones]: any = await pool.query(
    `SELECT id_siembra, fecha, brix
     FROM medicion_azucar
     WHERE id_siembra IS NOT NULL AND fecha<=CURRENT_DATE AND brix IS NOT NULL
     ORDER BY fecha ASC, id_medicion ASC`
  );

  // Agrupo las mediciones por parcela para armar la trayectoria de cada siembra.
  const porParcela: Record<number, { fecha: string; brix: number }[]> = {};
  for (const m of mediciones) {
    (porParcela[m.id_siembra] ||= []).push({ fecha: m.fecha, brix: Number(m.brix) });
  }

  const resultado = siembras.map((s: any) => {
    const trayectoria = porParcela[s.id_siembra] || [];
    const ultimo = trayectoria.length ? trayectoria[trayectoria.length - 1].brix : null;
    const objetivo = s.azucar_objetivo != null ? Number(s.azucar_objetivo) : null;
    const lista_cosecha = harvestReady(ultimo, objetivo, s.estado_sanitario, s.estado === 'activa');
    return {
      ...s,
      azucar_objetivo: objetivo,
      mediciones: trayectoria,
      ultimo_brix: ultimo,
      lista_cosecha,
      // cuánto falta para el objetivo (0 si ya está lista)
      falta: ultimo != null && objetivo != null ? Math.max(0, +(objetivo - ultimo).toFixed(1)) : null,
    };
  });

  res.json(resultado);
}));

// POST /api/siembras  → registrar una nueva siembra
router.post('/', soloEscritura, asyncHandler(async (req, res) => {
  const { id_parcela, id_variedad, fecha_siembra, cantidad, responsable } = req.body;
  if (!id_parcela || !id_variedad || !fecha_siembra) {
    res.status(400).json({ error: 'Parcela, variedad y fecha son obligatorios' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [parcelas]: any = await conn.query('SELECT estado, id_variedad FROM parcela WHERE id_parcela=? FOR UPDATE', [id_parcela]);
    if (!parcelas.length || parcelas[0].estado !== 'activa' || Number(parcelas[0].id_variedad) !== Number(id_variedad)) {
      await conn.rollback(); res.status(409).json({ error: 'La parcela debe estar activa y tener esa variedad' }); return;
    }
    const [activas]: any = await conn.query("SELECT id_siembra FROM siembra WHERE id_parcela=? AND estado='activa' FOR UPDATE", [id_parcela]);
    if (activas.length) { await conn.rollback(); res.status(409).json({ error: 'La parcela ya tiene una siembra activa' }); return; }
    const [r]: any = await conn.query(
      `INSERT INTO siembra (id_parcela, id_variedad, fecha_siembra, cantidad, responsable)
       VALUES (?,?,?,?,?)`,
      [id_parcela, id_variedad, fecha_siembra, cantidad || null, responsable || null]
    );
    await audit(conn, req, 'Campo', 'registrar:siembra', r.insertId);
    await conn.commit();
    res.status(201).json({ id_siembra: r.insertId });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error al registrar la siembra' });
  } finally {
    conn.release();
  }
}));

// PUT /api/siembras/:id/cerrar  → marcar como cerrada (p. ej. tras la cosecha)
router.put('/:id/cerrar', soloEscritura, asyncHandler(async (req, res) => {
  await auditedQuery(req, 'Campo', `UPDATE siembra SET estado='cerrada' WHERE id_siembra=?`, [req.params.id]);
  res.json({ ok: true });
}));

export default router;
