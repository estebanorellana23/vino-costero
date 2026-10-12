import { auditedQuery } from '../audit.js';
import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';

const router = Router();
router.use(verificarToken);
router.use(permitirRoles('Administrador', 'Gerente', 'Marketing')); // lectura del módulo Gestión
const soloEscritura = permitirRoles('Administrador', 'Marketing');

const uno = async (sql: string): Promise<number> => {
  const [r]: any = await pool.query(sql);
  return Number(r[0].n);
};

// ---------- Tablero BI (REQ_C_26): números de todo el sistema ----------
router.get('/resumen', asyncHandler(async (_req, res) => {
  const [parcelas, siembrasActivas, cosechas, lotes, lotesTerminados, pedidos, embarques, ingresos, egresos] =
    await Promise.all([
      uno('SELECT COUNT(*) n FROM parcela'),
      uno("SELECT COUNT(*) n FROM siembra WHERE estado='activa'"),
      uno('SELECT COUNT(*) n FROM cosecha'),
      uno('SELECT COUNT(*) n FROM lote'),
      uno("SELECT COUNT(*) n FROM lote WHERE fase='Terminado'"),
      uno('SELECT COUNT(*) n FROM pedido'),
      uno('SELECT COUNT(*) n FROM embarque'),
      uno("SELECT COALESCE(SUM(monto),0) n FROM finanza WHERE tipo='Ingreso'"),
      uno("SELECT COALESCE(SUM(monto),0) n FROM finanza WHERE tipo='Egreso'"),
    ]);
  res.json({
    parcelas, siembrasActivas, cosechas, lotes, lotesTerminados, pedidos, embarques,
    ingresos, egresos, balance: ingresos - egresos,
  });
}));

// ---------- Dashboard BI enriquecido (REQ_C_26) ----------
// Se muestran agregados persistidos; no se generan tendencias ni objetivos ficticios.
router.get('/dashboard', asyncHandler(async (_req, res) => {
  const [ingresos, egresos, litros, pedidos, embarques, capacidad, botellas] = await Promise.all([
    uno("SELECT COALESCE(SUM(monto),0) n FROM finanza WHERE tipo='Ingreso'"),
    uno("SELECT COALESCE(SUM(monto),0) n FROM finanza WHERE tipo='Egreso'"),
    uno('SELECT COALESCE(SUM(litros),0) n FROM lote'),
    uno('SELECT COUNT(*) n FROM pedido'),
    uno('SELECT COUNT(*) n FROM embarque'),
    uno('SELECT COALESCE(SUM(capacidad_litros),0) n FROM bodega'),
    uno('SELECT COALESCE(SUM(botellas),0) n FROM lote'),
  ]);
  const balance = ingresos - egresos;

  const [monthlyIncome]: any = await pool.query(`
    SELECT DATE_FORMAT(fecha, '%Y-%m') mes, SUM(monto) ingresos FROM finanza
    WHERE tipo='Ingreso' AND fecha >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 11 MONTH)
      AND fecha <= CURRENT_DATE
    GROUP BY DATE_FORMAT(fecha, '%Y-%m')`);
  const [monthlyProduction]: any = await pool.query(`
    SELECT DATE_FORMAT(fecha_inicio, '%Y-%m') mes, SUM(litros) produccion FROM lote
    WHERE fecha_inicio >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 11 MONTH)
      AND fecha_inicio <= CURRENT_DATE
    GROUP BY DATE_FORMAT(fecha_inicio, '%Y-%m')`);
  const income = new Map<string, number>(monthlyIncome.map((row: any) => [row.mes, Number(row.ingresos)]));
  const production = new Map<string, number>(monthlyProduction.map((row: any) => [row.mes, Number(row.produccion)]));
  const [clock]: any = await pool.query("SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m') mes");
  const [year, month] = clock[0].mes.split('-').map(Number);
  const serie = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 12 + i, 1));
    const mes = date.toISOString().slice(0, 7);
    return { mes, produccion: production.get(mes) || 0, ingresos: income.get(mes) || 0 };
  });
  const pct = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 + '%' : 'Sin base de cálculo';
  res.json({
    periodo: 'Últimos 12 meses · registros de la base',
    objetivos: [], // No hay objetivos aprobados/configurados en el modelo.
    serie,
    rendimiento: [
      { label: 'Margen sobre ingresos registrados', valor: pct(balance, ingresos), cambio: null, spark: [] },
      { label: 'Pedidos con embarque', valor: pct(embarques, pedidos), cambio: null, spark: [] },
      { label: 'Litros en bodega / capacidad', valor: pct(litros, capacidad), cambio: null, spark: [] },
      { label: 'Botellas registradas', valor: String(botellas), cambio: null, spark: [] },
    ],
    canales: [], // El modelo no vincula ventas a canales.
    mercados: [], // El país del comprador no demuestra ingresos por mercado.
  });
}));

// ---------- Usuarios y roles (REQ_C_30) ----------
router.get('/usuarios', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT id_usuario, nombre, usuario, rol, estado FROM usuario ORDER BY id_usuario');
  res.json(rows);
}));

// ---------- Finanzas (REQ_C_28) ----------
router.get('/finanzas', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM finanza ORDER BY fecha DESC, id_finanza DESC');
  res.json(rows);
}));

router.post('/finanzas', soloEscritura, asyncHandler(async (req, res) => {
  const { fecha, concepto, tipo, monto } = req.body;
  if (!concepto || !tipo || monto == null || monto === '') {
    res.status(400).json({ error: 'Concepto, tipo y monto son obligatorios' });
    return;
  }
  const [r]: any = await auditedQuery(req, 'Gestión', 
    'INSERT INTO finanza (fecha, concepto, tipo, monto) VALUES (?,?,?,?)',
    [fecha || new Date().toISOString().slice(0, 10), concepto, tipo, monto]
  );
  res.status(201).json({ id_finanza: r.insertId });
}));

// ---------- Campañas de marketing (REQ_C_27) ----------
router.get('/campanias', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM campania ORDER BY id_campania DESC');
  res.json(rows);
}));

router.post('/campanias', soloEscritura, asyncHandler(async (req, res) => {
  const { nombre, canal, presupuesto, estado } = req.body;
  if (!nombre) { res.status(400).json({ error: 'El nombre de la campaña es obligatorio' }); return; }
  const [r]: any = await auditedQuery(req, 'Gestión', 
    'INSERT INTO campania (nombre, canal, presupuesto, estado) VALUES (?,?,?,?)',
    [nombre, canal || null, presupuesto || null, estado || 'Planificada']
  );
  res.status(201).json({ id_campania: r.insertId });
}));

export default router;
