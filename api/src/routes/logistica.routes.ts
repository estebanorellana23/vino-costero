import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';
import { audit } from '../audit.js';

const router = Router();
router.use(verificarToken);
router.use(permitirRoles('Administrador', 'Gerente', 'Logistica')); // lectura del módulo Logística
const soloEscritura = permitirRoles('Administrador', 'Logistica');

// Estados del pedido (el embotellado es una etapa del ciclo, REQ_C_29).
const ESTADOS = ['Pendiente', 'Embotellado', 'Listo', 'Embarcado'];

// ---------- Compradores (REQ_C_25) ----------
router.get('/compradores', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM comprador ORDER BY nombre');
  res.json(rows);
}));

router.post('/compradores', soloEscritura, asyncHandler(async (req, res) => {
  const { nombre, pais, contacto } = req.body;
  if (!nombre) { res.status(400).json({ error: 'El nombre es obligatorio' }); return; }
  const [r]: any = await auditedQuery(req, 'Logística', 
    'INSERT INTO comprador (nombre, pais, contacto) VALUES (?,?,?)',
    [nombre, pais || null, contacto || null]
  );
  res.status(201).json({ id_comprador: r.insertId });
}));

// ---------- Pedidos (REQ_C_23) + embotellamiento (REQ_C_29) + embarque (REQ_C_24) ----------
router.get('/pedidos', asyncHandler(async (_req, res) => {
  const [rows]: any = await pool.query(
    `SELECT p.id_pedido, p.codigo, p.id_comprador, p.fecha, p.cajas, p.estado,
            c.nombre AS comprador, c.pais,
            e.fecha AS embarque_fecha, e.destino, e.transporte
     FROM pedido p
     LEFT JOIN comprador c ON c.id_comprador = p.id_comprador
     LEFT JOIN embarque e  ON e.id_pedido    = p.id_pedido
     ORDER BY p.fecha DESC, p.id_pedido DESC`
  );
  res.json(rows.map((p: any) => ({ ...p, estado_index: ESTADOS.indexOf(p.estado) })));
}));

router.post('/pedidos', soloEscritura, asyncHandler(async (req, res) => {
  const { codigo, id_comprador, fecha, cajas } = req.body;
  if (!codigo || !fecha) { res.status(400).json({ error: 'Código y fecha son obligatorios' }); return; }
  try {
    const [r]: any = await auditedQuery(req, 'Logística', 
      'INSERT INTO pedido (codigo, id_comprador, fecha, cajas) VALUES (?,?,?,?)',
      [codigo, id_comprador || null, fecha, cajas || null]
    );
    res.status(201).json({ id_pedido: r.insertId });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') { res.status(400).json({ error: 'Ese código de pedido ya existe' }); return; }
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
}));

// Avanza Pendiente → Embotellado → Listo (el paso a Embarcado lo hace el embarque).
router.put('/pedidos/:id/avanzar', soloEscritura, asyncHandler(async (req, res) => {
  const [rows]: any = await pool.query('SELECT estado FROM pedido WHERE id_pedido = ?', [req.params.id]);
  if (rows.length === 0) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
  const idx = ESTADOS.indexOf(rows[0].estado);
  if (idx >= 2) { res.json({ ok: true, estado: rows[0].estado }); return; } // Listo o Embarcado: no avanza por acá
  const siguiente = ESTADOS[idx + 1];
  const [changed]: any = await auditedQuery(req, 'Logística', 'UPDATE pedido SET estado = ? WHERE id_pedido = ? AND estado = ?', [siguiente, req.params.id, rows[0].estado]);
  if (!changed.affectedRows) { res.status(409).json({ error: 'El pedido cambió. Actualiza la pantalla.' }); return; }
  res.json({ ok: true, estado: siguiente });
}));

// Registrar embarque: solo si el pedido está "Listo" (REQ_C_24).
router.post('/pedidos/:id/embarque', soloEscritura, asyncHandler(async (req, res) => {
  const { fecha, destino, transporte } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]: any = await conn.query('SELECT estado FROM pedido WHERE id_pedido = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await conn.rollback(); res.status(404).json({ error: 'Pedido no encontrado' }); return; }
    if (rows[0].estado !== 'Listo') { await conn.rollback(); res.status(409).json({ error: 'El pedido debe estar Listo para embarcar' }); return; }
    await conn.query(
      'INSERT INTO embarque (id_pedido, fecha, destino, transporte) VALUES (?,?,?,?)',
      [req.params.id, fecha || new Date().toISOString().slice(0, 10), destino || null, transporte || null]
    );
    await conn.query('UPDATE pedido SET estado = ? WHERE id_pedido = ?', ['Embarcado', req.params.id]);
    await audit(conn,req,'Logística','registrar:embarque',Number(req.params.id));
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: 'Error al registrar el embarque' });
  } finally {
    conn.release();
  }
}));

export default router;
