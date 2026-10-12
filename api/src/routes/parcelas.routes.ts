import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';

const router = Router();
router.use(verificarToken); // todas las rutas de parcelas requieren sesión
router.use(permitirRoles('Administrador', 'Gerente', 'Agronomo')); // lectura del módulo Campo

// Escritura (crear/editar/eliminar): solo quien opera el campo.
const soloEscritura = permitirRoles('Administrador', 'Agronomo');

// GET /api/parcelas  → lista de parcelas con el nombre de su variedad
router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id_parcela, p.codigo, p.nombre, p.ubicacion, p.estado,
            p.id_variedad, v.nombre AS variedad
     FROM parcela p
     LEFT JOIN variedad_uva v ON v.id_variedad = p.id_variedad
     ORDER BY p.codigo`
  );
  res.json(rows);
}));

// POST /api/parcelas  → crear (CU-02)
router.post('/', soloEscritura, asyncHandler(async (req, res) => {
  const { codigo, nombre, ubicacion, id_variedad, estado } = req.body;
  if (!codigo) {
    res.status(400).json({ error: 'El código es obligatorio' });
    return;
  }
  try {
    const [r]: any = await auditedQuery(req, 'Campo', 
      'INSERT INTO parcela (codigo, nombre, ubicacion, id_variedad, estado) VALUES (?,?,?,?,?)',
      [codigo, nombre || null, ubicacion || null, id_variedad || null, estado || 'activa']
    );
    res.status(201).json({ id_parcela: r.insertId });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Ese código de parcela ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error al guardar la parcela' });
  }
}));

// PUT /api/parcelas/:id  → actualizar
router.put('/:id', soloEscritura, asyncHandler(async (req, res) => {
  const { codigo, nombre, ubicacion, id_variedad, estado } = req.body;
  await auditedQuery(req, 'Campo', 
    `UPDATE parcela SET codigo=?, nombre=?, ubicacion=?, id_variedad=?, estado=?
     WHERE id_parcela=?`,
    [codigo, nombre || null, ubicacion || null, id_variedad || null, estado, req.params.id]
  );
  res.json({ ok: true });
}));

// DELETE /api/parcelas/:id  → eliminar
router.delete('/:id', soloEscritura, asyncHandler(async (req, res) => {
  try {
    await auditedQuery(req, 'Campo', 'DELETE FROM parcela WHERE id_parcela=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: 'No se puede eliminar: la parcela tiene datos asociados' });
  }
}));

export default router;
