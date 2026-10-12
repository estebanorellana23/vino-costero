// Glosario en lenguaje simple: se usa en los tooltips (componente Termino) y en la pantalla Ayuda.
export interface Entrada { titulo: string; texto: string; grupo: 'Campo' | 'Producción' | 'Logística' | 'Gestión' | 'Sensores' | 'Sistema'; }

export const GLOSARIO: Record<string, Entrada> = {
  parcela: { grupo: 'Campo', titulo: 'Parcela', texto: 'Un terreno del viñedo con su propio código (por ejemplo P-01). Cada parcela tiene una variedad de uva.' },
  variedad: { grupo: 'Campo', titulo: 'Variedad de uva', texto: 'El tipo de uva que se cultiva, como Chardonnay o Sauvignon Blanc. Cada una tiene su nivel de azúcar ideal para cosechar.' },
  siembra: { grupo: 'Campo', titulo: 'Siembra (ciclo)', texto: 'Un ciclo completo de una parcela: desde que se planta hasta que se cosecha. Al cosechar, el ciclo se cierra.' },
  brix: { grupo: 'Campo', titulo: 'Grados Brix (°Brix)', texto: 'Mide cuánto azúcar tiene la uva. Cuanto más azúcar, más madura está. Cada variedad tiene un objetivo, por ejemplo 22 °Brix: al llegar, la uva está lista.' },
  brotacion: { grupo: 'Campo', titulo: 'Brotación', texto: 'Primera etapa del año: la vid empieza a echar hojas y brotes nuevos.' },
  floracion: { grupo: 'Campo', titulo: 'Floración', texto: 'Aparecen las flores de la vid. De cada flor saldrá una uva.' },
  envero: { grupo: 'Campo', titulo: 'Envero', texto: 'Las uvas cambian de color (de verde a amarillo o morado) y se ablandan. Es el inicio de la maduración.' },
  maduracion: { grupo: 'Campo', titulo: 'Maduración', texto: 'La uva va acumulando azúcar. Se mide con °Brix hasta llegar al punto de cosecha.' },
  sanidad: { grupo: 'Campo', titulo: 'Estado sanitario', texto: 'Qué tan sano está el cultivo: Bueno, Regular o Malo. Solo se puede cosechar si está Bueno.' },
  ph: { grupo: 'Campo', titulo: 'pH del suelo', texto: 'Mide qué tan ácido o alcalino es el suelo. 7 es neutro; menos de 7 es ácido y más de 7 es alcalino.' },
  npk: { grupo: 'Campo', titulo: 'Nitrógeno, fósforo y potasio', texto: 'Los tres nutrientes principales del suelo. El análisis dice cuánto hay de cada uno para saber si la vid necesita abono.' },
  punto_control: { grupo: 'Campo', titulo: 'Punto de control', texto: 'Un lugar fijo de la parcela donde se mide algo cada cierto tiempo, para comparar cómo evoluciona.' },
  incidencia: { grupo: 'Campo', titulo: 'Incidencia sanitaria', texto: 'Aviso de que apareció una enfermedad en una siembra, con su gravedad y el tratamiento aplicado.' },
  cosecha: { grupo: 'Campo', titulo: 'Cosecha', texto: 'La recolección de la uva. Se registran los kilos y la calidad. Esa uva pasa a Producción para hacer vino.' },

  lote: { grupo: 'Producción', titulo: 'Lote', texto: 'Una tanda de vino elaborada con la uva de una cosecha. Cada lote tiene su código, su volumen y su fase.' },
  fases_vino: { grupo: 'Producción', titulo: 'Fases del vino', texto: 'Recepción de la uva, prensado, fermentación, crianza (el vino reposa), embotellado y terminado. El lote avanza una fase a la vez.' },
  fermentacion: { grupo: 'Producción', titulo: 'Fermentación', texto: 'El azúcar del jugo de uva se transforma en alcohol. Es lo que convierte el jugo en vino.' },
  crianza: { grupo: 'Producción', titulo: 'Crianza', texto: 'El vino reposa un tiempo, en barrica o tanque, para mejorar su sabor.' },
  cata: { grupo: 'Producción', titulo: 'Cata', texto: 'Degustación para evaluar la calidad del vino. Se anota un puntaje y comentarios sobre aroma y sabor.' },
  bodega: { grupo: 'Producción', titulo: 'Bodega de guarda', texto: 'El lugar donde el vino reposa. Tiene una capacidad en litros y una temperatura.' },

  pedido: { grupo: 'Logística', titulo: 'Pedido', texto: 'Una compra de un cliente (comprador), en cajas. Pasa por estados: pendiente, embotellado, listo y embarcado.' },
  embarque: { grupo: 'Logística', titulo: 'Embarque', texto: 'El envío del pedido: se anota el destino y el transporte. Solo se puede embarcar un pedido que está Listo.' },

  bi: { grupo: 'Gestión', titulo: 'BI (inteligencia de negocio)', texto: 'Un tablero con números y gráficos que resume cómo va el negocio: producción, ventas, finanzas y más.' },

  gateway: { grupo: 'Sensores', titulo: 'Gateway', texto: 'El equipo que recibe las lecturas de los sensores y las envía a la aplicación. Es como una puerta de entrada de los datos.' },
  lectura: { grupo: 'Sensores', titulo: 'Lectura', texto: 'Una medición de un sensor en un momento dado, por ejemplo la temperatura a las 10:30.' },
  umbral: { grupo: 'Sensores', titulo: 'Límite crítico (umbral)', texto: 'Una temperatura que no conviene superar o bajar. Si una lectura pasa el límite, se genera una alerta.' },
  utc: { grupo: 'Sensores', titulo: 'UTC (hora universal)', texto: 'La hora de referencia mundial. En Centroamérica la hora local es UTC menos 6 horas.' },
  humedad_aire: { grupo: 'Sensores', titulo: 'Humedad del aire', texto: 'Cuánta humedad hay en el aire. No es la humedad de la tierra: eso se mide con un sensor de suelo.' },

  humedad_suelo: { grupo: 'Sensores', titulo: 'Humedad del suelo', texto: 'Cuánta agua hay en la tierra, en porcentaje. Es lo que sirve para decidir cuándo regar. Se mide con un sensor enterrado, distinto del de aire.' },
  origen: { grupo: 'Sensores', titulo: 'Origen del dato', texto: '«Sensor» es una medición real. «Simulado» es un dato inventado por un programa de demostración, útil para probar la plataforma sin equipos.' },
  rol: { grupo: 'Sistema', titulo: 'Rol', texto: 'El tipo de usuario (agrónomo, enólogo, etc.). Define qué módulos puede ver y modificar.' },
  req: { grupo: 'Sistema', titulo: 'Código REQ', texto: 'Número del requisito del enunciado de la materia que esta pantalla cumple. Sirve para la entrega; no cambia cómo se usa.' },
};
