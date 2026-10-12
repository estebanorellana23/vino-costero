-- Explicit migration, after 003. Optional soil moisture and the declared source of each reading.
-- Existing rows keep NULL soil moisture and are marked as coming from a sensor.
ALTER TABLE iot_clima
  ADD COLUMN humedad_suelo_pct DECIMAL(5,2) NULL,
  ADD COLUMN origen ENUM('sensor','simulado') NOT NULL DEFAULT 'sensor';
