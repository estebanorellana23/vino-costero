/**
 * Reinicia los datos de ejemplo del módulo Campo a una historia limpia:
 *   - P-01 (Sauvignon Blanc): madurando, 18 → 20.2 → 21.4 °Bx (objetivo 22).
 *   - P-02 (Chardonnay): ya LISTA para cosecha, 21.0 → 23.8 °Bx (objetivo 23.5).
 *
 * Uso:  cd api  &&  npm run seed
 */
import 'dotenv/config';
import { pool } from './db.js';
import { demoMode } from './config.js';

async function main() {
  throw new Error('Reset demo deshabilitado: conservar los datos existentes; preparar una base desechable aparte');
  // Borro en orden seguro (lo que depende primero) y reinicio los contadores.
  for (const t of ['embarque', 'pedido', 'comprador', 'cata', 'lote', 'cosecha', 'medicion_azucar', 'estado_sanitario', 'siembra', 'parcela', 'finanza', 'campania']) {
    await pool.query(`DELETE FROM ${t}`);
    await pool.query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
  }

  // Aseguro variedades y parcelas base (por si la base está vacía).
  await pool.query(
    `INSERT INTO variedad_uva (id_variedad, nombre, caracteristicas, azucar_objetivo) VALUES
       (1,'Sauvignon Blanc','Fresco, citrico',22.0),
       (2,'Chardonnay','Cuerpo medio, frutal',23.5)
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), azucar_objetivo=VALUES(azucar_objetivo)`
  );
  await pool.query(
    `INSERT INTO parcela (id_parcela, codigo, nombre, ubicacion, id_variedad, estado) VALUES
       (1,'P-01','Ladera Norte','Leyda sector 1',1,'activa'),
       (2,'P-02','Bajo del Rio','Leyda sector 2',2,'activa')
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), id_variedad=VALUES(id_variedad)`
  );

  // Siembras
  await pool.query(
    `INSERT INTO siembra (id_siembra, id_parcela, id_variedad, fecha_siembra, cantidad, responsable, estado) VALUES
       (1,1,1,'2026-08-10',500,'Ing. Agronomo','activa'),
       (2,2,2,'2026-08-12',480,'Ing. Agronomo','activa')`
  );

  // Mediciones de azúcar (trayectoria)
  await pool.query(
    `INSERT INTO medicion_azucar (id_parcela, fecha, brix, responsable) VALUES
       (1,'2026-09-01',18.0,'Ing. Agronomo'),
       (1,'2026-09-15',20.2,'Ing. Agronomo'),
       (1,'2026-09-29',21.4,'Ing. Agronomo'),
       (2,'2026-09-10',21.0,'Ing. Agronomo'),
       (2,'2026-09-24',23.8,'Ing. Agronomo')`
  );

  // Bodegas (upsert) y un lote de producción de ejemplo.
  await pool.query(
    `INSERT INTO bodega (id_bodega, nombre, ubicacion, capacidad_litros, temperatura, observacion) VALUES
       (1,'Bodega Norte','Nave principal',20000.00,14.0,'Guarda en barrica de roble'),
       (2,'Bodega de Frío','Sector refrigerado',8000.00,8.0,'Para blancos jóvenes')
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)`
  );
  await pool.query(
    `INSERT INTO lote (id_lote, codigo, id_cosecha, id_variedad, fecha_inicio, fase, litros, botellas, id_bodega, responsable)
     VALUES (1,'L-001',NULL,2,'2026-10-01','Fermentación',1500.00,NULL,1,'Enólogo')`
  );

  // Logística: compradores y pedidos
  await pool.query(
    `INSERT INTO comprador (id_comprador, nombre, pais, contacto) VALUES
       (1,'Importadora Andina','Perú','compras@andina.pe'),
       (2,'Wine House','EE. UU.','orders@winehouse.com')`
  );
  await pool.query(
    `INSERT INTO pedido (id_pedido, codigo, id_comprador, fecha, cajas, estado) VALUES
       (1,'PED-001',1,'2026-10-03',120,'Embotellado'),
       (2,'PED-002',2,'2026-10-04',80,'Pendiente')`
  );

  // Gestión: finanzas y campañas
  await pool.query(
    `INSERT INTO finanza (id_finanza, fecha, concepto, tipo, monto) VALUES
       (1,'2026-09-30','Venta exportación lote L-000','Ingreso',18500.00),
       (2,'2026-09-15','Compra de insumos de bodega','Egreso',4200.00)`
  );
  await pool.query(
    `INSERT INTO campania (id_campania, nombre, canal, presupuesto, estado) VALUES
       (1,'Lanzamiento Sauvignon Blanc','Redes sociales',5000.00,'Activa')`
  );

  console.log('✓ Datos de ejemplo reiniciados (Campo · Producción · Logística · Gestión).');
  await pool.end();
}

main().catch((e) => {
  console.error('✗ No se pudieron reiniciar los datos:', e.message);
  process.exit(1);
});
