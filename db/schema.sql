-- ============================================================
--  Vino Costero — Esquema de base de datos (MySQL)
--  Se ejecuta automáticamente al arrancar la API.
--  Módulos incluidos en este incremento: Núcleo (seguridad) + Campo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS vino_costero
  CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;

USE vino_costero;

-- ---------- NÚCLEO: seguridad y trazabilidad ----------

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  usuario      VARCHAR(50)  NOT NULL UNIQUE,
  contrasena   VARCHAR(255) NOT NULL,
  rol          ENUM('Administrador','Gerente','Agronomo',
                    'Enologo','Logistica','Marketing') NOT NULL,
  estado       ENUM('activo','inactivo') DEFAULT 'activo',
  creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bitacora (
  id_bitacora  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT,
  modulo       VARCHAR(50),
  accion       VARCHAR(100),
  detalle      VARCHAR(255),
  fecha_hora   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ---------- MÓDULO CAMPO Y VIÑEDO ----------

CREATE TABLE IF NOT EXISTS variedad_uva (
  id_variedad     INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL UNIQUE,
  caracteristicas VARCHAR(255),
  azucar_objetivo DECIMAL(4,1)
);

CREATE TABLE IF NOT EXISTS parcela (
  id_parcela   INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(20) NOT NULL UNIQUE,
  nombre       VARCHAR(80),
  ubicacion    VARCHAR(120),
  id_variedad  INT,
  estado       ENUM('activa','descanso','en_preparacion') DEFAULT 'activa',
  FOREIGN KEY (id_variedad) REFERENCES variedad_uva(id_variedad)
);

CREATE TABLE IF NOT EXISTS siembra (
  id_siembra    INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela    INT NOT NULL,
  id_variedad   INT NOT NULL,
  fecha_siembra DATE NOT NULL,
  cantidad      INT,
  responsable   VARCHAR(100),
  estado        ENUM('activa','cerrada') DEFAULT 'activa',
  FOREIGN KEY (id_parcela)  REFERENCES parcela(id_parcela),
  FOREIGN KEY (id_variedad) REFERENCES variedad_uva(id_variedad)
);

CREATE TABLE IF NOT EXISTS medicion_azucar (
  id_medicion INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela  INT NOT NULL,
  fecha       DATE NOT NULL,
  brix        DECIMAL(4,1),
  responsable VARCHAR(100),
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
);

CREATE TABLE IF NOT EXISTS estado_sanitario (
  id_estado    INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela   INT NOT NULL,
  fecha        DATE NOT NULL,
  calificacion ENUM('Bueno','Regular','Malo'),
  pct_afectado DECIMAL(5,2),
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
);

CREATE TABLE IF NOT EXISTS cosecha (
  id_cosecha    INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela    INT NOT NULL,
  id_variedad   INT NOT NULL,
  fecha_cosecha DATE NOT NULL,
  kilogramos    DECIMAL(10,2),
  clasificacion VARCHAR(40),
  responsable   VARCHAR(100),
  FOREIGN KEY (id_parcela)  REFERENCES parcela(id_parcela),
  FOREIGN KEY (id_variedad) REFERENCES variedad_uva(id_variedad)
);

-- ---------- MÓDULO PRODUCCIÓN / ENOLOGÍA ----------

CREATE TABLE IF NOT EXISTS bodega (
  id_bodega        INT AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(80) NOT NULL,
  ubicacion        VARCHAR(120),
  capacidad_litros DECIMAL(10,2),
  temperatura      DECIMAL(4,1),
  observacion      VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS lote (
  id_lote      INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(20) NOT NULL UNIQUE,
  id_cosecha   INT,
  id_variedad  INT,
  fecha_inicio DATE NOT NULL,
  fase         ENUM('Recepción','Prensado','Fermentación','Crianza','Embotellado','Terminado')
                 DEFAULT 'Recepción',
  litros       DECIMAL(10,2),
  botellas     INT,
  id_bodega    INT,
  responsable  VARCHAR(100),
  FOREIGN KEY (id_cosecha)  REFERENCES cosecha(id_cosecha),
  FOREIGN KEY (id_variedad) REFERENCES variedad_uva(id_variedad),
  FOREIGN KEY (id_bodega)   REFERENCES bodega(id_bodega)
);

CREATE TABLE IF NOT EXISTS cata (
  id_cata     INT AUTO_INCREMENT PRIMARY KEY,
  id_lote     INT NOT NULL,
  fecha       DATE NOT NULL,
  puntaje     DECIMAL(4,1),
  notas       VARCHAR(255),
  responsable VARCHAR(100),
  FOREIGN KEY (id_lote) REFERENCES lote(id_lote)
);

-- ---------- MÓDULO LOGÍSTICA / COMERCIAL ----------

CREATE TABLE IF NOT EXISTS comprador (
  id_comprador INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  pais         VARCHAR(60),
  contacto     VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS pedido (
  id_pedido    INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(20) NOT NULL UNIQUE,
  id_comprador INT,
  fecha        DATE NOT NULL,
  cajas        INT,
  estado       ENUM('Pendiente','Embotellado','Listo','Embarcado') DEFAULT 'Pendiente',
  FOREIGN KEY (id_comprador) REFERENCES comprador(id_comprador)
);

CREATE TABLE IF NOT EXISTS embarque (
  id_embarque INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido   INT NOT NULL,
  fecha       DATE NOT NULL,
  destino     VARCHAR(120),
  transporte  VARCHAR(80),
  FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido)
);

-- ---------- MÓDULO GESTIÓN / BI / FINANZAS ----------

CREATE TABLE IF NOT EXISTS finanza (
  id_finanza INT AUTO_INCREMENT PRIMARY KEY,
  fecha      DATE NOT NULL,
  concepto   VARCHAR(120) NOT NULL,
  tipo       ENUM('Ingreso','Egreso') NOT NULL,
  monto      DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS campania (
  id_campania INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  canal       VARCHAR(60),
  presupuesto DECIMAL(12,2),
  estado      ENUM('Planificada','Activa','Finalizada') DEFAULT 'Planificada'
);

-- ---------- DATOS DE PRUEBA (no se duplican) ----------

INSERT IGNORE INTO variedad_uva (id_variedad, nombre, caracteristicas, azucar_objetivo) VALUES
 (1, 'Sauvignon Blanc', 'Fresco, citrico', 22.0),
 (2, 'Chardonnay',      'Cuerpo medio, frutal', 23.5);

INSERT IGNORE INTO parcela (id_parcela, codigo, nombre, ubicacion, id_variedad, estado) VALUES
 (1, 'P-01', 'Ladera Norte', 'Leyda sector 1', 1, 'activa'),
 (2, 'P-02', 'Bajo del Rio',  'Leyda sector 2', 2, 'activa');

-- Siembras de ejemplo (una por parcela)
INSERT IGNORE INTO siembra (id_siembra, id_parcela, id_variedad, fecha_siembra, cantidad, responsable, estado) VALUES
 (1, 1, 1, '2026-08-10', 500, 'Ing. Agronomo', 'activa'),
 (2, 2, 2, '2026-08-12', 480, 'Ing. Agronomo', 'activa');

-- Mediciones de azúcar (°Brix). La parcela 1 aún madura; la 2 ya superó su objetivo.
INSERT IGNORE INTO medicion_azucar (id_medicion, id_parcela, fecha, brix, responsable) VALUES
 (1, 1, '2026-09-01', 18.0, 'Ing. Agronomo'),
 (2, 1, '2026-09-15', 20.2, 'Ing. Agronomo'),
 (3, 1, '2026-09-29', 21.4, 'Ing. Agronomo'),
 (4, 2, '2026-09-10', 21.0, 'Ing. Agronomo'),
 (5, 2, '2026-09-24', 23.8, 'Ing. Agronomo');

-- Bodegas de guarda
INSERT IGNORE INTO bodega (id_bodega, nombre, ubicacion, capacidad_litros, temperatura, observacion) VALUES
 (1, 'Bodega Norte', 'Nave principal', 20000.00, 14.0, 'Guarda en barrica de roble'),
 (2, 'Bodega de Frío', 'Sector refrigerado', 8000.00, 8.0, 'Para blancos jóvenes');

-- Lote de producción de ejemplo (uva ya recibida del campo)
INSERT IGNORE INTO lote (id_lote, codigo, id_cosecha, id_variedad, fecha_inicio, fase, litros, botellas, id_bodega, responsable) VALUES
 (1, 'L-001', NULL, 2, '2026-10-01', 'Fermentación', 1500.00, NULL, 1, 'Enólogo');

-- Logística: compradores, pedidos
INSERT IGNORE INTO comprador (id_comprador, nombre, pais, contacto) VALUES
 (1, 'Importadora Andina', 'Perú', 'compras@andina.pe'),
 (2, 'Wine House', 'EE. UU.', 'orders@winehouse.com');

INSERT IGNORE INTO pedido (id_pedido, codigo, id_comprador, fecha, cajas, estado) VALUES
 (1, 'PED-001', 1, '2026-10-03', 120, 'Embotellado'),
 (2, 'PED-002', 2, '2026-10-04', 80, 'Pendiente');

-- Gestión: finanzas y campañas
INSERT IGNORE INTO finanza (id_finanza, fecha, concepto, tipo, monto) VALUES
 (1, '2026-09-30', 'Venta exportación lote L-000', 'Ingreso', 18500.00),
 (2, '2026-09-15', 'Compra de insumos de bodega', 'Egreso', 4200.00);

INSERT IGNORE INTO campania (id_campania, nombre, canal, presupuesto, estado) VALUES
 (1, 'Lanzamiento Sauvignon Blanc', 'Redes sociales', 5000.00, 'Activa');
