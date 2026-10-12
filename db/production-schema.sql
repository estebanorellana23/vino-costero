-- ============================================================
--  Vino Costero — Esquema de base de datos (MySQL)
--  Instalación explícita sobre una base NUEVA; no se ejecuta al arrancar.
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bitacora (
  id_bitacora  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT,
  modulo       VARCHAR(50),
  accion       VARCHAR(100),
  detalle      VARCHAR(255),
  fecha_hora   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- ---------- MÓDULO CAMPO Y VIÑEDO ----------

CREATE TABLE IF NOT EXISTS variedad_uva (
  id_variedad     INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL UNIQUE,
  caracteristicas VARCHAR(255),
  azucar_objetivo DECIMAL(4,1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parcela (
  id_parcela   INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(20) NOT NULL UNIQUE,
  nombre       VARCHAR(80),
  ubicacion    VARCHAR(120),
  id_variedad  INT,
  estado       ENUM('activa','descanso','en_preparacion') DEFAULT 'activa',
  FOREIGN KEY (id_variedad) REFERENCES variedad_uva(id_variedad)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medicion_azucar (
  id_medicion INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela  INT NOT NULL,
  fecha       DATE NOT NULL,
  brix        DECIMAL(4,1),
  responsable VARCHAR(100),
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estado_sanitario (
  id_estado    INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela   INT NOT NULL,
  fecha        DATE NOT NULL,
  calificacion ENUM('Bueno','Regular','Malo'),
  pct_afectado DECIMAL(5,2),
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- ---------- MÓDULO PRODUCCIÓN / ENOLOGÍA ----------

CREATE TABLE IF NOT EXISTS bodega (
  id_bodega        INT AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(80) NOT NULL,
  ubicacion        VARCHAR(120),
  capacidad_litros DECIMAL(10,2),
  temperatura      DECIMAL(4,1),
  observacion      VARCHAR(255)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cata (
  id_cata     INT AUTO_INCREMENT PRIMARY KEY,
  id_lote     INT NOT NULL,
  fecha       DATE NOT NULL,
  puntaje     DECIMAL(4,1),
  notas       VARCHAR(255),
  responsable VARCHAR(100),
  FOREIGN KEY (id_lote) REFERENCES lote(id_lote)
) ENGINE=InnoDB;

-- ---------- MÓDULO LOGÍSTICA / COMERCIAL ----------

CREATE TABLE IF NOT EXISTS comprador (
  id_comprador INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  pais         VARCHAR(60),
  contacto     VARCHAR(120)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido (
  id_pedido    INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(20) NOT NULL UNIQUE,
  id_comprador INT,
  fecha        DATE NOT NULL,
  cajas        INT,
  estado       ENUM('Pendiente','Embotellado','Listo','Embarcado') DEFAULT 'Pendiente',
  FOREIGN KEY (id_comprador) REFERENCES comprador(id_comprador)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS embarque (
  id_embarque INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido   INT NOT NULL,
  fecha       DATE NOT NULL,
  destino     VARCHAR(120),
  transporte  VARCHAR(80),
  FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido)
) ENGINE=InnoDB;

-- ---------- MÓDULO GESTIÓN / BI / FINANZAS ----------

CREATE TABLE IF NOT EXISTS finanza (
  id_finanza INT AUTO_INCREMENT PRIMARY KEY,
  fecha      DATE NOT NULL,
  concepto   VARCHAR(120) NOT NULL,
  tipo       ENUM('Ingreso','Egreso') NOT NULL,
  monto      DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campania (
  id_campania INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  canal       VARCHAR(60),
  presupuesto DECIMAL(12,2),
  estado      ENUM('Planificada','Activa','Finalizada') DEFAULT 'Planificada'
) ENGINE=InnoDB;


-- Apply explicitly after backup. MySQL DDL commits implicitly: this is not an atomic migration.
-- Existing records remain unassigned until an owner verifies their original crop cycle.
ALTER TABLE medicion_azucar ADD COLUMN id_siembra INT NULL,
  ADD CONSTRAINT fk_medicion_siembra FOREIGN KEY (id_siembra) REFERENCES siembra(id_siembra),
  ADD INDEX idx_medicion_ciclo_fecha (id_siembra, fecha, id_medicion);
ALTER TABLE estado_sanitario ADD COLUMN id_siembra INT NULL,
  ADD CONSTRAINT fk_sanidad_siembra FOREIGN KEY (id_siembra) REFERENCES siembra(id_siembra),
  ADD INDEX idx_sanidad_ciclo_fecha (id_siembra, fecha, id_estado);
ALTER TABLE cosecha ADD COLUMN id_siembra INT NULL,
  ADD COLUMN id_medicion INT NULL,
  ADD COLUMN id_estado_sanitario INT NULL,
  ADD COLUMN brix_objetivo DECIMAL(4,1) NULL,
  ADD CONSTRAINT fk_cosecha_siembra FOREIGN KEY (id_siembra) REFERENCES siembra(id_siembra),
  ADD CONSTRAINT fk_cosecha_medicion FOREIGN KEY (id_medicion) REFERENCES medicion_azucar(id_medicion),
  ADD CONSTRAINT fk_cosecha_sanidad FOREIGN KEY (id_estado_sanitario) REFERENCES estado_sanitario(id_estado),
  ADD UNIQUE KEY uq_cosecha_ciclo (id_siembra);

CREATE TABLE dimension_parcela (
  id_dimension INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela INT NOT NULL, fecha DATE NOT NULL,
  superficie_ha DECIMAL(8,2) NOT NULL, hileras INT NOT NULL, cant_plantas INT NOT NULL,
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela),
  INDEX idx_dimension_parcela (id_parcela, fecha)
) ENGINE=InnoDB;
CREATE TABLE control_tierra (
  id_control INT AUTO_INCREMENT PRIMARY KEY, id_parcela INT NOT NULL, fecha DATE NOT NULL,
  ph DECIMAL(4,2) NOT NULL, humedad DECIMAL(5,2) NOT NULL,
  nitrogeno DECIMAL(8,2), fosforo DECIMAL(8,2), potasio DECIMAL(8,2),
  observacion VARCHAR(255),
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela),
  INDEX idx_tierra_parcela (id_parcela, fecha)
) ENGINE=InnoDB;
CREATE TABLE control_siembra (
  id_control_siembra INT AUTO_INCREMENT PRIMARY KEY, id_siembra INT NOT NULL, fecha DATE NOT NULL,
  etapa ENUM('Brotación','Floración','Envero','Maduración') NOT NULL,
  riego VARCHAR(60), fertilizacion VARCHAR(60), observacion VARCHAR(255),
  FOREIGN KEY (id_siembra) REFERENCES siembra(id_siembra),
  INDEX idx_control_ciclo (id_siembra, fecha)
) ENGINE=InnoDB;
CREATE TABLE enfermedad (
  id_enfermedad INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(80) NOT NULL UNIQUE,
  sintomas VARCHAR(255) NOT NULL, tratamiento VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE siembra_enferma (
  id_incidencia INT AUTO_INCREMENT PRIMARY KEY, id_siembra INT NOT NULL,
  id_enfermedad INT NOT NULL, fecha_deteccion DATE NOT NULL,
  severidad ENUM('bajo','medio','alto') NOT NULL, tratamiento VARCHAR(255) NOT NULL,
  FOREIGN KEY (id_siembra) REFERENCES siembra(id_siembra),
  FOREIGN KEY (id_enfermedad) REFERENCES enfermedad(id_enfermedad),
  INDEX idx_incidencia_ciclo (id_siembra, fecha_deteccion)
) ENGINE=InnoDB;
CREATE TABLE punto_control (
  id_punto_control INT AUTO_INCREMENT PRIMARY KEY, id_parcela INT NOT NULL,
  nombre VARCHAR(80) NOT NULL, fecha_prog DATE NOT NULL,
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
) ENGINE=InnoDB;
CREATE TABLE medicion_punto_control (
  id_medicion_punto INT AUTO_INCREMENT PRIMARY KEY, id_punto_control INT NOT NULL,
  fecha DATE NOT NULL, valor VARCHAR(80) NOT NULL, id_usuario INT NOT NULL,
  FOREIGN KEY (id_punto_control) REFERENCES punto_control(id_punto_control),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- Apply explicitly after backup and after 001-field-history.sql.
-- Existing JWTs become invalid; users must sign in again.
ALTER TABLE usuario ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0;

-- Explicit migration, after 001 and 002; no seeds or automatic provisioning.
CREATE TABLE iot_gateway (
  id_gateway INT AUTO_INCREMENT PRIMARY KEY,
  id_parcela INT NOT NULL,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  temperatura_min_c DECIMAL(5,2) NULL,
  temperatura_max_c DECIMAL(5,2) NULL,
  intervalo_max_s INT NOT NULL DEFAULT 60,
  FOREIGN KEY (id_parcela) REFERENCES parcela(id_parcela)
) ENGINE=InnoDB;
CREATE TABLE iot_clima (
  id_lectura BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_gateway INT NOT NULL,
  lectura_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  secuencia_uno BIGINT UNSIGNED NOT NULL,
  capturada_en DATETIME(3) NOT NULL,
  recibida_en DATETIME(3) NOT NULL,
  temperatura_c DECIMAL(5,2) NOT NULL,
  humedad_aire_pct DECIMAL(5,2) NOT NULL,
  humedad_suelo_pct DECIMAL(5,2) NULL,
  origen ENUM('sensor','simulado') NOT NULL DEFAULT 'sensor',
  UNIQUE KEY uq_gateway_lectura (id_gateway, lectura_uuid),
  INDEX idx_clima_gateway_fecha (id_gateway, capturada_en, id_lectura),
  FOREIGN KEY (id_gateway) REFERENCES iot_gateway(id_gateway)
) ENGINE=InnoDB;
CREATE TABLE iot_alerta (
  id_alerta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_gateway INT NOT NULL,
  lectura_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  tipo ENUM('helada','calor') NOT NULL,
  limite_c DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (id_gateway,lectura_uuid) REFERENCES iot_clima(id_gateway,lectura_uuid),
  UNIQUE KEY uq_alerta_lectura (id_gateway,lectura_uuid,tipo)
) ENGINE=InnoDB;
