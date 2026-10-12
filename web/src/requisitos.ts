// Mapa de requerimientos del módulo Campo (y seguridad) para mostrarlos como
// insignias con tooltip en la interfaz. "estado" marca lo que ya cubre el
// prototipo (listo) vs. lo que está especificado pero aún no construido (pendiente).
// Ver vault: 07 - Validación y Trazabilidad de Requerimientos.

export interface Requisito { desc: string; estado: 'listo' | 'pendiente'; }

export const REQUISITOS: Record<string, Requisito> = {
  REQ_C_02: { desc: 'Registrar los controles de tierra (análisis de suelo por parcela).', estado: 'pendiente' },
  REQ_C_03: { desc: 'Registrar las parcelas del fundo con un código único.', estado: 'listo' },
  REQ_C_04: { desc: 'Registrar las dimensiones de cada parcela (superficie, hileras, plantas).', estado: 'pendiente' },
  REQ_C_05: { desc: 'Registrar la siembra: qué se plantó en cada parcela, cuándo y cuánto.', estado: 'listo' },
  REQ_C_06: { desc: 'Catálogo de variedades de uva con su azúcar objetivo (°Brix).', estado: 'listo' },
  REQ_C_07: { desc: 'Registrar los controles periódicos de cada siembra.', estado: 'pendiente' },
  REQ_C_08: { desc: 'Catálogo de enfermedades de la uva con su tratamiento.', estado: 'pendiente' },
  REQ_C_09: { desc: 'Registrar siembras enfermas y el tratamiento aplicado.', estado: 'pendiente' },
  REQ_C_10: { desc: 'Registrar el estado sanitario de la parcela (Bueno/Regular/Malo).', estado: 'pendiente' },
  REQ_C_11: { desc: 'Registrar el azúcar de la uva (mediciones de °Brix por parcela).', estado: 'listo' },
  REQ_C_12: { desc: 'Punto óptimo de cosecha: avisa cuando el azúcar llega al objetivo.', estado: 'listo' },
  REQ_C_13: { desc: 'Registrar los datos de la cosecha (kilos, calidad) y cerrar la siembra.', estado: 'listo' },
  REQ_C_15: { desc: 'Registrar las lecturas de los sensores de temperatura.', estado: 'pendiente' },
  REQ_C_16: { desc: 'Registrar las lecturas de los sensores de humedad (aire y suelo). Funciona con datos simulados; falta conectar un sensor real.', estado: 'listo' },
  REQ_C_17: { desc: 'Controlar las bombas de agua automáticas según la humedad.', estado: 'pendiente' },
  REQ_C_18: { desc: 'Registrar los puntos de control por parcela.', estado: 'pendiente' },
  REQ_NF_02: { desc: 'Seguridad: las contraseñas se guardan cifradas, nadie puede leerlas.', estado: 'listo' },
  REQ_NF_03: { desc: 'Permisos por rol: cada acción se valida según el rol de quien la pide.', estado: 'listo' },

  // --- Producción / Enología (Integrante 1) ---
  REQ_C_01: { desc: 'Control de producción (elaboración del vino desde la uva).', estado: 'listo' },
  REQ_C_14: { desc: 'Control de fases de producción (fermentación, crianza, embotellado).', estado: 'listo' },
  REQ_C_19: { desc: 'Datos de catas y control de calidad por lote.', estado: 'listo' },
  REQ_C_20: { desc: 'Reportes por cosecha (rendimiento de vino).', estado: 'listo' },
  REQ_C_21: { desc: 'Lotes de vino producidos y su trazabilidad.', estado: 'listo' },
  REQ_C_22: { desc: 'Bodegas de guarda de la viña.', estado: 'listo' },

  // --- Logística / Comercial (Integrante 3) ---
  REQ_C_23: { desc: 'Registrar órdenes de compra. Pendiente contrastar el flujo de pedidos de compradores con las compras a proveedores del enunciado.', estado: 'pendiente' },
  REQ_C_24: { desc: 'Embarques y transporte de los pedidos.', estado: 'listo' },
  REQ_C_25: { desc: 'Registro de compradores.', estado: 'listo' },
  REQ_C_29: { desc: 'Logística de embotellamiento (etapa del pedido).', estado: 'listo' },

  // --- Gestión / BI / Seguridad (Integrante 4) ---
  REQ_C_26: { desc: 'Tablero con números y gráficos para analizar el negocio.', estado: 'listo' },
  REQ_C_27: { desc: 'Campañas de marketing.', estado: 'listo' },
  REQ_C_28: { desc: 'Datos financieros de producción.', estado: 'listo' },
  REQ_C_30: { desc: 'Roles de seguridad: acceso por rol a cada módulo.', estado: 'listo' },
};
