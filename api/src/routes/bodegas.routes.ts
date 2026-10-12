import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';

const router = Router();
router.use(verificarToken);
router.use(permitirRoles('Administrador', 'Gerente', 'Enologo')); // módulo Producción
const soloEscritura = permitirRoles('Administrador', 'Enologo');

// GET /api/bodegas  → bodegas de guarda con el conteo de lotes almacenados (REQ_C_22)
router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, COUNT(l.id_lote) AS lotes
     FROM bodega b
     LEFT JOIN lote l ON l.id_bodega = b.id_bodega
     GROUP BY b.id_bodega
     ORDER BY b.nombre`
  );
  res.json(rows);
}));

// POST /api/bodegas  → registrar una bodega
router.post('/', soloEscritura, asyncHandler(async (req, res) => {
  const { nombre, ubicacion, capacidad_litros, temperatura, observacion } = req.body;
  if (!nombre) {
    res.status(400).json({ error: 'El nombre de la bodega es obligatorio' });
    return;
  }
  const [r]: any = await auditedQuery(req, 'Producción', 
    `INSERT INTO bodega (nombre, ubicacion, capacidad_litros, temperatura, observacion)
     VALUES (?,?,?,?,?)`,
    [nombre, ubicacion || null, capacidad_litros || null, temperatura || null, observacion || null]
  );
  res.status(201).json({ id_bodega: r.insertId });
}));

export default router;
