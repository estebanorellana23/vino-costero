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
