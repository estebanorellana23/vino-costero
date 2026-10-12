import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';
import { asyncHandler } from '../http.js';
import { audit } from '../audit.js';

const router = Router();
router.use(verificarToken, permitirRoles('Administrador','Agronomo'));
router.post('/', asyncHandler(async (req, res) => {
  const { id_parcela, id_siembra, brix, responsable } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [parcels]: any = await conn.query('SELECT id_parcela FROM parcela WHERE id_parcela=? FOR UPDATE', [id_parcela]);
    const [cycles]: any = await conn.query('SELECT id_parcela,fecha_siembra,estado FROM siembra WHERE id_siembra=? FOR UPDATE', [id_siembra]);
    const [clock]: any = await conn.query('SELECT CURRENT_DATE AS hoy');
    const fecha = req.body.fecha || clock[0].hoy;
    if (!parcels.length || !cycles.length || Number(cycles[0].id_parcela)!==Number(id_parcela) || cycles[0].estado!=='activa' || fecha<cycles[0].fecha_siembra || fecha>clock[0].hoy) {
      await conn.rollback(); res.status(409).json({ error: 'La medición requiere la siembra activa de esa parcela y una fecha dentro del ciclo' }); return;
    }
    const [result]: any = await conn.query('INSERT INTO medicion_azucar (id_parcela,id_siembra,fecha,brix,responsable) VALUES (?,?,?,?,?)', [id_parcela,id_siembra,fecha,brix,responsable || null]);
    await audit(conn,req,'Campo','registrar:medicion',result.insertId);
    await conn.commit();
    res.status(201).json({ id_medicion: result.insertId });
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}));
export default router;