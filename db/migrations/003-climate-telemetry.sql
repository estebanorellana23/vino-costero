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
