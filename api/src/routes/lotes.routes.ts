import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';

const router = Router();
router.use(verificarToken);
router.use(permitirRoles('Administrador', 'Gerente', 'Enologo')); // lectura del módulo Producción
const soloEscritura = permitirRoles('Administrador', 'Enologo');

// Fases de elaboración en orden (REQ_C_14).
const FASES = ['Recepción', 'Prensado', 'Fermentación', 'Crianza', 'Embotellado', 'Terminado'];

// GET /api/lotes  → lotes con variedad, bodega, cosecha de origen y sus catas
router.get('/', asyncHandler(async (_req, res) => {
  const [rows]: any = await pool.query(
    `SELECT l.id_lote, l.codigo, l.id_cosecha, l.id_variedad, l.fecha_inicio, l.fase,
            l.litros, l.botellas, l.id_bodega, l.responsable,
            v.nombre AS variedad, b.nombre AS bodega,
            c.fecha_cosecha, c.kilogramos AS kg_cosecha
     FROM lote l
     LEFT JOIN variedad_uva v ON v.id_variedad = l.id_variedad
     LEFT JOIN bodega b       ON b.id_bodega   = l.id_bodega
     LEFT JOIN cosecha c      ON c.id_cosecha  = l.id_cosecha
     ORDER BY l.fecha_inicio DESC, l.id_lote DESC`
  );
  const [catas]: any = await pool.query('SELECT * FROM cata ORDER BY fecha ASC, id_cata ASC');
  const porLote: Record<number, any[]> = {};
  for (const c of catas) (porLote[c.id_lote] ||= []).push({ ...c, puntaje: c.puntaje != null ? Number(c.puntaje) : null });

  res.json(rows.map((l: any) => ({
    ...l,
    fase_index: FASES.indexOf(l.fase),
    total_fases: FASES.length,
    catas: porLote[l.id_lote] || [],
  })));
}));

// GET /api/lotes/reporte  → por cosecha: kg de uva vs. litros/botellas de vino (REQ_C_20)
router.get('/reporte', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id_cosecha, c.fecha_cosecha, c.kilogramos, v.nombre AS variedad,
            COALESCE(SUM(l.litros), 0)   AS litros,
            COALESCE(SUM(l.botellas), 0) AS botellas
     FROM cosecha c
     LEFT JOIN variedad_uva v ON v.id_variedad = c.id_variedad
     LEFT JOIN lote l         ON l.id_cosecha  = c.id_cosecha
     GROUP BY c.id_cosecha, c.fecha_cosecha, c.kilogramos, v.nombre
     ORDER BY c.fecha_cosecha DESC`
  );
  res.json(rows);
}));

// POST /api/lotes  → crear un lote (REQ_C_21)
router.post('/', soloEscritura, asyncHandler(async (req, res) => {
  const { codigo, id_cosecha, id_variedad, fecha_inicio, litros, responsable } = req.body;
  if (!codigo || !id_variedad || !fecha_inicio) {
    res.status(400).json({ error: 'Código, variedad y fecha son obligatorios' });
    return;
  }
  try {
    const [r]: any = await auditedQuery(req, 'Producción', 
      `INSERT INTO lote (codigo, id_cosecha, id_variedad, fecha_inicio, litros, responsable)
       VALUES (?,?,?,?,?,?)`,
      [codigo, id_cosecha || null, id_variedad, fecha_inicio, litros || null, responsable || null]
    );
    res.status(201).json({ id_lote: r.insertId });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Ese código de lote ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error al crear el lote' });
  }
}));

// PUT /api/lotes/:id/avanzar  → pasa a la siguiente fase de elaboración (REQ_C_14)
router.put('/:id/avanzar', soloEscritura, asyncHandler(async (req, res) => {
  const [rows]: any = await pool.query('SELECT fase FROM lote WHERE id_lote = ?', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Lote no encontrado' });
    return;
  }
  const idx = FASES.indexOf(rows[0].fase);
  if (idx >= FASES.length - 1) {
    res.json({ ok: true, fase: rows[0].fase }); // ya terminado
    return;
  }
  const siguiente = FASES[idx + 1];
  const [changed]: any = await auditedQuery(req, 'Producción', 'UPDATE lote SET fase = ? WHERE id_lote = ? AND fase = ?', [siguiente, req.params.id, rows[0].fase]);
  if (!changed.affectedRows) { res.status(409).json({ error: 'El lote cambió. Actualiza la pantalla.' }); return; }
  res.json({ ok: true, fase: siguiente });
}));

// POST /api/lotes/:id/cata  → registrar una cata / control de calidad (REQ_C_19)
router.post('/:id/cata', soloEscritura, asyncHandler(async (req, res) => {
  const { fecha, puntaje, notas, responsable } = req.body;
  await auditedQuery(req, 'Producción', 
    `INSERT INTO cata (id_lote, fecha, puntaje, notas, responsable) VALUES (?,?,?,?,?)`,
    [req.params.id, fecha || new Date().toISOString().slice(0, 10), puntaje || null, notas || null, responsable || null]
  );
  res.status(201).json({ ok: true });
}));

// PUT /api/lotes/:id  → actualizar litros, botellas y bodega (REQ_C_22)
router.put('/:id', soloEscritura, asyncHandler(async (req, res) => {
  const { litros, botellas, id_bodega } = req.body;
  await auditedQuery(req, 'Producción', 
    'UPDATE lote SET litros = ?, botellas = ?, id_bodega = ? WHERE id_lote = ?',
    [litros || null, botellas || null, id_bodega || null, req.params.id]
  );
  res.json({ ok: true });
}));

export default router;
