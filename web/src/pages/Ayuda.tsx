import { GLOSARIO } from '../glosario';
import { FadeIn } from '../components/Motion';

const PASOS = [
  { n: 1, titulo: 'Parcela', texto: 'Se registra cada terreno del viñedo y qué uva se cultiva.' },
  { n: 2, titulo: 'Siembra y maduración', texto: 'Se siguen las etapas de la uva y se mide su azúcar (°Brix).' },
  { n: 3, titulo: 'Cosecha', texto: 'Cuando la uva llegó al azúcar objetivo y está sana, se registra la cosecha.' },
  { n: 4, titulo: 'Lote de vino', texto: 'El enólogo elabora vino con esa uva: fermenta, cría, cata y embotella.' },
  { n: 5, titulo: 'Pedido', texto: 'Un comprador pide cajas de vino terminado.' },
  { n: 6, titulo: 'Embarque', texto: 'Cuando el pedido está listo se envía, con destino y transporte.' },
  { n: 7, titulo: 'Tablero', texto: 'La gerencia ve números de todo el proceso en un solo lugar.' },
];

const ROLES = [
  ['Agrónomo', 'Parcelas, siembras, mediciones de azúcar, estado sanitario y cosecha.', 'Campo'],
  ['Enólogo', 'Lotes de vino, fases, catas y bodegas.', 'Producción / Enología'],
  ['Logística', 'Compradores, pedidos y embarques.', 'Logística / Comercial'],
  ['Marketing', 'Finanzas, campañas y tablero.', 'Gestión / BI'],
  ['Gerente', 'Consulta todo para decidir (no modifica).', 'Todos, solo lectura'],
  ['Administrador', 'Todo lo anterior, más crear usuarios y cambiar permisos.', 'Todos + Usuarios y accesos'],
];

export default function Ayuda() {
  const grupos = Array.from(new Set(Object.values(GLOSARIO).map((e) => e.grupo)));
  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Ayuda: cómo se usa</h1>
          <p className="lead">El recorrido de una uva, de la parcela a la exportación, y qué significa cada palabra técnica.</p>
        </header>
      </FadeIn>

      <section className="card">
        <h2 id="proceso-vino">El recorrido en 7 pasos</h2>
        <ol className="ayuda-pasos">
          {PASOS.map((p) => (
            <li key={p.n}><b>{p.titulo}.</b> {p.texto}</li>
          ))}
        </ol>
        <p className="ayuda-nota">En las pantallas, las palabras con subrayado punteado explican su significado al pasar el mouse, enfocarlas con Tab o tocarlas. Las etiquetas REQ conservan la referencia a cada requisito.</p>
      </section>

      <section className="card">
        <h2 id="responsabilidades">Quién hace qué</h2>
        <div className="field-table">
          <table>
            <thead><tr><th>Rol</th><th>Qué hace</th><th>Módulo</th></tr></thead>
            <tbody>{ROLES.map(([r, q, m]) => <tr key={r}><td><b>{r}</b></td><td>{q}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div id="glosario" />
      {grupos.map((g) => (
        <section className="card" key={g}>
          <h2>Glosario · {g}</h2>
          <dl className="ayuda-glosario">
            {Object.values(GLOSARIO).filter((e) => e.grupo === g).map((e) => (
              <div key={e.titulo}><dt>{e.titulo}</dt><dd>{e.texto}</dd></div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
