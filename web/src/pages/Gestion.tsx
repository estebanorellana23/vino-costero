import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageNotice } from '../components/PageNotice';
import { FadeIn, Reveal, MotionButton, motion } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
import { Termino } from '../components/Termino';
import { Spark, BarLine } from '../components/Charts';
import { puedeEditarModulo } from '../roles';

const hoy = () => new Date().toLocaleDateString('en-CA');
const money = (n: any) => 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n: any) => Number(n || 0).toLocaleString('es-GT');

interface Finanza { id_finanza: number; fecha: string; concepto: string; tipo: string; monto: string; }
interface Campania { id_campania: number; nombre: string; canal: string | null; presupuesto: string | null; estado: string; }
interface Usuario { id_usuario: number; nombre: string; usuario: string; rol: string; estado: string; }
interface Dash {
  periodo: string;
  objetivos: { label: string; valor: number; objetivo: number; unidad: string; cambio: number }[];
  serie: { mes: string; produccion: number; ingresos: number }[];
  rendimiento: { label: string; valor: string; cambio: number; spark: number[] }[];
  canales: { nombre: string; actual: number; previo: number; cambio: number; spark: number[] }[];
  mercados: { nombre: string; pct: number }[];
}

function Cambio({ v }: { v: number }) {
  if (v == null) return <span>Sin comparación histórica</span>;
  const up = v >= 0;
  return <span className={'cambio ' + (up ? 'up' : 'down')}><span className="flecha">{up ? '▲' : '▼'}</span> {Math.abs(v)}%</span>;
}

export default function Gestion() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [finForm, setFinForm] = useState<any>({ fecha: hoy(), concepto: '', tipo: 'Ingreso', monto: '' });
  const [campForm, setCampForm] = useState<any>({ nombre: '', canal: '', presupuesto: '', estado: 'Planificada' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const rol = JSON.parse(localStorage.getItem('usuario') || '{}').rol || '';
  const editable = puedeEditarModulo(rol, 'gestion');

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
    const [d, f, c, u] = await Promise.all([
      api.get('/gestion/dashboard'), api.get('/gestion/finanzas'),
      api.get('/gestion/campanias'), api.get('/gestion/usuarios'),
    ]);
    setDash(d.data); setFinanzas(f.data); setCampanias(c.data); setUsuarios(u.data);
    } catch { setError('No se pudieron cargar los datos. Comprueba la conexión y pulsa Actualizar datos.'); } finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const crearFinanza = async (e: React.FormEvent) => {
    setError('');
    setSuccess('');
    try {
    e.preventDefault();
    if (!finForm.concepto || !finForm.monto) return;
    await api.post('/gestion/finanzas', finForm);
    setFinForm({ fecha: hoy(), concepto: '', tipo: 'Ingreso', monto: '' });
    setSuccess('Movimiento financiero registrado.');
      cargar();
    } catch (err: any) { setError(err.response?.data?.error || 'No se pudo confirmar la operación. Actualiza los datos antes de volver a intentarlo.'); }
  };

  const crearCampania = async (e: React.FormEvent) => {
    setError('');
    setSuccess('');
    try {
    e.preventDefault();
    if (!campForm.nombre) return;
    await api.post('/gestion/campanias', campForm);
    setCampForm({ nombre: '', canal: '', presupuesto: '', estado: 'Planificada' });
    setSuccess('Campaña agregada.');
      cargar();
    } catch (err: any) { setError(err.response?.data?.error || 'No se pudo confirmar la operación. Actualiza los datos antes de volver a intentarlo.'); }
  };

  const valorObj = (o: Dash['objetivos'][0]) =>
    o.unidad === 'Q' ? money(o.valor) : num(o.valor) + (o.unidad ? ` ${o.unidad}` : '');

  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Gestión / BI</h1>
          <p className="lead">El tablero del negocio (<Termino k="bi">BI</Termino>): números y gráficos de todo el sistema, finanzas, marketing y usuarios.</p>
          <div className="req-row">
            <ReqBadge codigo="REQ_C_26" /><ReqBadge codigo="REQ_C_28" />
            <ReqBadge codigo="REQ_C_27" /><ReqBadge codigo="REQ_C_30" />
          </div>
          {!editable && <div className="modo-consulta">Modo consulta · solo lectura</div>}
        </header>
      </FadeIn>
      <PageNotice error={error} onRetry={cargar} />
      {success && <p className="operation-success" role="status">{success}</p>}
      {loading && <p className="loading-note" role="status">Cargando registros…</p>}

      {dash && (
        <>
          {/* Tarjetas con objetivo */}
          <Reveal>
            <div className="dash-section-title">{dash.periodo}</div>
            {dash.objetivos.length === 0 && <p>No hay objetivos aprobados configurados.</p>}
            <div className="obj-grid">
              {dash.objetivos.map((o) => {
                const p = o.objetivo ? Math.min(100, (o.valor / o.objetivo) * 100) : 0;
                const ok = o.valor >= o.objetivo;
                return (
                  <div className="obj-card" key={o.label}>
                    <div className="label">{o.label}</div>
                    <div className="valor-row"><div className="valor">{valorObj(o)}</div><Cambio v={o.cambio} /></div>
                    <div className="barra">
                      <motion.span className={ok ? 'ok' : 'bajo'} initial={{ width: 0 }} whileInView={{ width: `${p}%` }}
                        viewport={{ once: true }} transition={{ type: 'spring', bounce: 0, duration: 0.8 }} />
                    </div>
                    <div className="objetivo-txt">Objetivo: {o.unidad === 'Q' ? money(o.objetivo) : num(o.objetivo) + (o.unidad ? ` ${o.unidad}` : '')}</div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* Gráfico principal + panel de rendimiento */}
          <Reveal>
            <div className="dash-section-title">Lotes e ingresos por mes</div>
            <div className="dash-row">
              <div className="card">
                <h3 id="indicadores">Evolución <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_26" /></span></h3>
                <p style={{ color: 'var(--text-2)', marginTop: -8, fontSize: 13 }}>Barras: saldo de litros por inicio del lote · línea: ingresos registrados (Q)</p>
                <BarLine labels={dash.serie.map((s) => s.mes)} bars={dash.serie.map((s) => s.produccion)} line={dash.serie.map((s) => s.ingresos)} />
              </div>
              <div className="card">
                <h3>Rendimiento</h3>
                <div className="rend-list">
                  {dash.rendimiento.map((r) => (
                    <div className="rend-item" key={r.label}>
                      <div className="top"><span className="label">{r.label}</span><span className="valor">{r.valor}</span></div>
                      <div className="bottom"><Spark data={r.spark} width={150} height={28} /><Cambio v={r.cambio} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Canales + mercados */}
          <Reveal>
            <div className="dash-row">
              <div className="card">
                <h3>Canales de venta</h3>
                {dash.canales.length === 0 && <p>No hay ventas vinculadas a canales en los registros actuales.</p>}
                <div className="table-scroll" role="region" aria-label="Tabla de registros" tabIndex={0}><table className="canales-tbl">
                  <thead><tr><th>Canal</th><th>Ventas</th><th>Previo</th><th>Cambio</th><th>Tendencia</th></tr></thead>
                  <tbody>
                    {dash.canales.map((c) => (
                      <tr key={c.nombre}>
                        <td><b>{c.nombre}</b></td>
                        <td>{num(c.actual)}</td>
                        <td style={{ color: 'var(--text-2)' }}>{num(c.previo)}</td>
                        <td><Cambio v={c.cambio} /></td>
                        <td><div className="spark-cell"><Spark data={c.spark} width={110} height={26} color={c.cambio >= 0 ? '#1a7f4b' : '#d6202a'} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
              <div className="card">
                <h3>Ventas por mercado</h3>
                {dash.mercados.length === 0 && <p>No hay ingresos vinculados a mercados en los registros actuales.</p>}
                <div className="mercados">
                  {dash.mercados.map((m) => (
                    <div className="mercado" key={m.nombre}>
                      <div className="nombre">{m.nombre}</div>
                      <div className="pct">{m.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </>
      )}

      {/* Finanzas */}
      <Reveal>
        <div className="card">
          <h3 id="finanzas">Finanzas <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_28" /></span></h3>
          <div className="table-scroll" role="region" aria-label="Tabla de registros" tabIndex={0}><table>
            <thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
            <tbody>
              {finanzas.map((f) => (
                <tr key={f.id_finanza}>
                  <td>{f.fecha?.slice(0, 10)}</td>
                  <td>{f.concepto}</td>
                  <td><span className="badge">{f.tipo}</span></td>
                  <td style={{ textAlign: 'right', color: f.tipo === 'Egreso' ? 'var(--danger)' : '#1a7f4b' }}>
                    {f.tipo === 'Egreso' ? '-' : '+'}{money(f.monto)}
                  </td>
                </tr>
              ))}
              {finanzas.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--text-2)' }}>Sin movimientos aún.</td></tr>}
            </tbody>
          </table></div>
          {editable && (
            <form onSubmit={crearFinanza} style={{ marginTop: 18 }}>
              <div className="row">
                <div><label>Fecha<input type="date" value={finForm.fecha} onChange={(e) => setFinForm({ ...finForm, fecha: e.target.value })} /></label></div>
                <div><label>Concepto *<input required value={finForm.concepto} onChange={(e) => setFinForm({ ...finForm, concepto: e.target.value })} placeholder="Venta de lote" /></label></div>
                <div>
                  <label>Tipo
                  <select value={finForm.tipo} onChange={(e) => setFinForm({ ...finForm, tipo: e.target.value })}>
                    <option value="Ingreso">Ingreso</option>
                    <option value="Egreso">Egreso</option>
                  </select></label>
                </div>
                <div><label>Monto *<input required type="number" step="0.01" value={finForm.monto} onChange={(e) => setFinForm({ ...finForm, monto: e.target.value })} placeholder="1000.00" /></label></div>
              </div>
              <div style={{ marginTop: 14 }}><MotionButton className="btn secundario" type="submit">Registrar movimiento</MotionButton></div>
            </form>
          )}
        </div>
      </Reveal>

      {/* Campañas */}
      <Reveal delay={0.05}>
        <div className="card">
          <h3 id="campanias">Campañas de marketing <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_27" /></span></h3>
          <div className="table-scroll" role="region" aria-label="Tabla de registros" tabIndex={0}><table>
            <thead><tr><th>Campaña</th><th>Canal</th><th>Presupuesto</th><th>Estado</th></tr></thead>
            <tbody>
              {campanias.map((c) => (
                <tr key={c.id_campania}>
                  <td><b>{c.nombre}</b></td><td>{c.canal || '—'}</td>
                  <td>{c.presupuesto != null ? money(c.presupuesto) : '—'}</td>
                  <td><span className="badge">{c.estado}</span></td>
                </tr>
              ))}
              {campanias.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--text-2)' }}>Sin campañas aún.</td></tr>}
            </tbody>
          </table></div>
          {editable && (
            <form onSubmit={crearCampania} style={{ marginTop: 18 }}>
              <div className="row">
                <div><label>Nombre *<input required value={campForm.nombre} onChange={(e) => setCampForm({ ...campForm, nombre: e.target.value })} /></label></div>
                <div><label>Canal<input value={campForm.canal} onChange={(e) => setCampForm({ ...campForm, canal: e.target.value })} placeholder="Redes sociales" /></label></div>
                <div><label>Presupuesto<input type="number" step="0.01" value={campForm.presupuesto} onChange={(e) => setCampForm({ ...campForm, presupuesto: e.target.value })} /></label></div>
                <div>
                  <label>Estado
                  <select value={campForm.estado} onChange={(e) => setCampForm({ ...campForm, estado: e.target.value })}>
                    <option value="Planificada">Planificada</option>
                    <option value="Activa">Activa</option>
                    <option value="Finalizada">Finalizada</option>
                  </select></label>
                </div>
              </div>
              <div style={{ marginTop: 14 }}><MotionButton className="btn secundario" type="submit">Agregar campaña</MotionButton></div>
            </form>
          )}
        </div>
      </Reveal>

      {/* Usuarios y roles */}
      <Reveal delay={0.1}>
        <div className="card">
          <h3>Usuarios y roles <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_30" /></span></h3>
          <div className="table-scroll" role="region" aria-label="Tabla de registros" tabIndex={0}><table>
            <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td><b>{u.nombre}</b></td><td>{u.usuario}</td>
                  <td><span className="badge">{u.rol}</span></td><td>{u.estado}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </Reveal>
    </div>
  );
}
