import { useEffect, useState } from 'react';
import { api } from '../api';
import { FadeIn, Reveal, MotionButton } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
import { Termino } from '../components/Termino';
import { puedeEditarModulo } from '../roles';

const hoy = () => new Date().toLocaleDateString('en-CA');
const FASES = ['Recepción', 'Prensado', 'Fermentación', 'Crianza', 'Embotellado', 'Terminado'];

interface Cata { id_cata: number; fecha: string; puntaje: number | null; notas: string | null; responsable: string | null; }
interface Lote {
  id_lote: number; codigo: string; id_cosecha: number | null; id_variedad: number | null;
  fecha_inicio: string; fase: string; litros: number | null; botellas: number | null;
  id_bodega: number | null; responsable: string | null; variedad: string | null; bodega: string | null;
  fase_index: number; catas: Cata[];
}
interface Variedad { id_variedad: number; nombre: string; }
interface Bodega { id_bodega: number; nombre: string; ubicacion: string | null; capacidad_litros: number | null; temperatura: number | null; lotes: number; }
interface Cosecha { id_cosecha: number; parcela_codigo?: string; fecha_cosecha: string; variedad?: string; }
interface FilaReporte { id_cosecha: number; fecha_cosecha: string; kilogramos: string | null; variedad: string | null; litros: string; botellas: string; }

const CLAVE_FASE: Record<string, string> = { 'Fermentación': 'fermentacion', 'Crianza': 'crianza' };

/* Línea de fases de elaboración (reusa el estilo de la fenología de Campo). */
function FaseLote({ index }: { index: number }) {
  const terminado = index >= FASES.length - 1;
  return (
    <div className="fenologia">
      {FASES.map((nombre, i) => {
        let cls = 'fase';
        if (terminado && i === FASES.length - 1) cls += ' cosecha-ok';
        else if (i < index) cls += ' hecha';
        else if (i === index) cls += ' actual';
        return <div key={nombre} className={cls}><div className="bolita" />{CLAVE_FASE[nombre] ? <Termino k={CLAVE_FASE[nombre]}>{nombre}</Termino> : nombre}</div>;
      })}
    </div>
  );
}

export default function Produccion() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [variedades, setVariedades] = useState<Variedad[]>([]);
  const [cosechas, setCosechas] = useState<Cosecha[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [reporte, setReporte] = useState<FilaReporte[]>([]);
  const [form, setForm] = useState<any>({ codigo: '', id_cosecha: '', id_variedad: '', fecha_inicio: hoy(), litros: '', responsable: '' });
  const [datos, setDatos] = useState<Record<number, any>>({});
  const [cata, setCata] = useState<Record<number, any>>({});
  const [bodegaForm, setBodegaForm] = useState<any>({ nombre: '', ubicacion: '', capacidad_litros: '', temperatura: '', observacion: '' });
  const [error, setError] = useState('');

  const rol = JSON.parse(localStorage.getItem('usuario') || '{}').rol || '';
  const editable = puedeEditarModulo(rol, 'produccion');

  const cargar = async () => {
    const [l, v, c, b, r] = await Promise.all([
      api.get('/lotes'), api.get('/variedades'), api.get('/cosecha'), api.get('/bodegas'), api.get('/lotes/reporte'),
    ]);
    setLotes(l.data); setVariedades(v.data); setCosechas(c.data); setBodegas(b.data); setReporte(r.data);
    const d: Record<number, any> = {};
    l.data.forEach((x: Lote) => { d[x.id_lote] = { litros: x.litros ?? '', botellas: x.botellas ?? '', id_bodega: x.id_bodega ?? '' }; });
    setDatos(d);
  };

  useEffect(() => { cargar(); }, []);

  const crearLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/lotes', form);
      setForm({ codigo: '', id_cosecha: '', id_variedad: '', fecha_inicio: hoy(), litros: '', responsable: '' });
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el lote');
    }
  };

  const avanzar = async (l: Lote) => {
    await api.put(`/lotes/${l.id_lote}/avanzar`);
    cargar();
  };

  const guardarDatos = async (l: Lote) => {
    await api.put(`/lotes/${l.id_lote}`, datos[l.id_lote]);
    cargar();
  };

  const agregarCata = async (l: Lote) => {
    const c = cata[l.id_lote] || {};
    if (!c.puntaje && !c.notas) return;
    await api.post(`/lotes/${l.id_lote}/cata`, { fecha: hoy(), ...c });
    setCata({ ...cata, [l.id_lote]: { puntaje: '', notas: '' } });
    cargar();
  };

  const crearBodega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodegaForm.nombre) return;
    await api.post('/bodegas', bodegaForm);
    setBodegaForm({ nombre: '', ubicacion: '', capacidad_litros: '', temperatura: '', observacion: '' });
    cargar();
  };

  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Producción / Enología</h1>
          <p className="lead">Convierte la uva cosechada en vino y controlá su elaboración (cada tanda es un <Termino k="lote">lote</Termino>), su calidad y su guarda.</p>
          <div className="req-row">
            <ReqBadge codigo="REQ_C_01" />
            <ReqBadge codigo="REQ_C_14" />
            <ReqBadge codigo="REQ_C_19" />
            <ReqBadge codigo="REQ_C_21" />
            <ReqBadge codigo="REQ_C_22" />
          </div>
          {!editable && <div className="modo-consulta">Modo consulta · solo lectura</div>}
        </header>
      </FadeIn>

      {/* Crear lote */}
      {editable && (
        <Reveal>
          <div className="card suave">
            <h3>Nuevo lote de producción <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_21" /></span></h3>
            <form onSubmit={crearLote}>
              <div className="row">
                <div>
                  <label>Código *</label>
                  <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="L-002" />
                </div>
                <div>
                  <label>Variedad *</label>
                  <select value={form.id_variedad} onChange={(e) => setForm({ ...form, id_variedad: e.target.value })}>
                    <option value="">— Elegí una —</option>
                    {variedades.map((v) => <option key={v.id_variedad} value={v.id_variedad}>{v.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label>Cosecha de origen</label>
                  <select value={form.id_cosecha} onChange={(e) => setForm({ ...form, id_cosecha: e.target.value })}>
                    <option value="">— Sin asignar —</option>
                    {cosechas.map((c) => (
                      <option key={c.id_cosecha} value={c.id_cosecha}>
                        {(c.parcela_codigo || 'Cosecha')} · {c.fecha_cosecha?.slice(0, 10)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Fecha de inicio *</label>
                  <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label>Litros iniciales</label>
                  <input type="number" step="0.1" value={form.litros} onChange={(e) => setForm({ ...form, litros: e.target.value })} placeholder="1500" />
                </div>
                <div>
                  <label>Responsable</label>
                  <input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Enólogo" />
                </div>
              </div>
              {error && <div className="error">{error}</div>}
              <div style={{ marginTop: 22 }}>
                <MotionButton className="btn primario" type="submit">Crear lote</MotionButton>
              </div>
            </form>
          </div>
        </Reveal>
      )}

      {/* Lotes */}
      {lotes.map((l, i) => {
        const terminado = l.fase === 'Terminado';
        return (
          <Reveal key={l.id_lote} delay={i * 0.05}>
            <div className="card">
              <div className="siembra-head">
                <div>
                  <div className="titulo">{l.codigo} · {l.variedad || 'Sin variedad'}</div>
                  <div className="meta">
                    Inicio {l.fecha_inicio?.slice(0, 10)}
                    {l.bodega ? ` · ${l.bodega}` : ''}
                    {l.responsable ? ` · ${l.responsable}` : ''}
                  </div>
                </div>
                <span className={`estado-pill ${terminado ? 'lista' : 'madurando'}`}>
                  <span className="punto" />
                  {terminado ? 'Terminado' : `Fase: ${l.fase}`}
                </span>
              </div>

              <FaseLote index={l.fase_index} />

              <div className="brix-info">
                <span>{l.litros != null ? <>Volumen: <b>{l.litros} L</b></> : 'Sin volumen registrado'}</span>
                <span>{l.botellas != null ? <>{l.botellas} botellas</> : ''}</span>
              </div>

              {/* Catas / calidad */}
              {l.catas.length > 0 && (
                <div className="trayectoria">
                  {l.catas.map((c) => (
                    <span key={c.id_cata} className="paso" title={c.notas || ''}>
                      {c.puntaje != null ? `${c.puntaje} pts` : 'cata'}{c.notas ? ` · ${c.notas}` : ''}
                    </span>
                  ))}
                </div>
              )}

              {editable && (
                <>
                  <div className="medir">
                    {!terminado && (
                      <MotionButton className="btn primario" type="button" onClick={() => avanzar(l)}>
                        Avanzar a {FASES[l.fase_index + 1]}
                      </MotionButton>
                    )}
                  </div>

                  <div className="row" style={{ marginTop: 14 }}>
                    <div>
                      <label>Litros</label>
                      <input type="number" step="0.1" value={datos[l.id_lote]?.litros ?? ''}
                        onChange={(e) => setDatos({ ...datos, [l.id_lote]: { ...datos[l.id_lote], litros: e.target.value } })} />
                    </div>
                    <div>
                      <label>Botellas</label>
                      <input type="number" value={datos[l.id_lote]?.botellas ?? ''}
                        onChange={(e) => setDatos({ ...datos, [l.id_lote]: { ...datos[l.id_lote], botellas: e.target.value } })} />
                    </div>
                    <div>
                      <label><Termino k="bodega">Bodega de guarda</Termino> <ReqBadge codigo="REQ_C_22" /></label>
                      <select value={datos[l.id_lote]?.id_bodega ?? ''}
                        onChange={(e) => setDatos({ ...datos, [l.id_lote]: { ...datos[l.id_lote], id_bodega: e.target.value } })}>
                        <option value="">— Sin asignar —</option>
                        {bodegas.map((b) => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <MotionButton className="btn secundario" type="button" onClick={() => guardarDatos(l)}>Guardar datos</MotionButton>
                  </div>

                  <div className="medir">
                    <label>Nueva <Termino k="cata">cata</Termino> <ReqBadge codigo="REQ_C_19" /></label>
                    <input type="number" step="0.1" placeholder="pts" style={{ width: 90 }}
                      value={cata[l.id_lote]?.puntaje ?? ''}
                      onChange={(e) => setCata({ ...cata, [l.id_lote]: { ...cata[l.id_lote], puntaje: e.target.value } })} />
                    <input placeholder="notas" style={{ width: 200 }}
                      value={cata[l.id_lote]?.notas ?? ''}
                      onChange={(e) => setCata({ ...cata, [l.id_lote]: { ...cata[l.id_lote], notas: e.target.value } })} />
                    <MotionButton className="btn secundario" type="button" onClick={() => agregarCata(l)}>Registrar cata</MotionButton>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        );
      })}

      {/* Bodegas */}
      <Reveal>
        <div className="card">
          <h3>Bodegas de guarda <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_22" /></span></h3>
          <table>
            <thead><tr><th>Bodega</th><th>Ubicación</th><th>Capacidad</th><th>Temp.</th><th>Lotes</th></tr></thead>
            <tbody>
              {bodegas.map((b) => (
                <tr key={b.id_bodega}>
                  <td><b>{b.nombre}</b></td>
                  <td>{b.ubicacion || '—'}</td>
                  <td>{b.capacidad_litros != null ? `${b.capacidad_litros} L` : '—'}</td>
                  <td>{b.temperatura != null ? `${b.temperatura} °C` : '—'}</td>
                  <td>{b.lotes}</td>
                </tr>
              ))}
              {bodegas.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-2)' }}>Sin bodegas aún.</td></tr>}
            </tbody>
          </table>

          {editable && (
            <form onSubmit={crearBodega} style={{ marginTop: 18 }}>
              <div className="row">
                <div><label>Nombre *</label><input value={bodegaForm.nombre} onChange={(e) => setBodegaForm({ ...bodegaForm, nombre: e.target.value })} placeholder="Bodega Sur" /></div>
                <div><label>Ubicación</label><input value={bodegaForm.ubicacion} onChange={(e) => setBodegaForm({ ...bodegaForm, ubicacion: e.target.value })} /></div>
                <div><label>Capacidad (L)</label><input type="number" step="0.1" value={bodegaForm.capacidad_litros} onChange={(e) => setBodegaForm({ ...bodegaForm, capacidad_litros: e.target.value })} /></div>
                <div><label>Temp. (°C)</label><input type="number" step="0.1" value={bodegaForm.temperatura} onChange={(e) => setBodegaForm({ ...bodegaForm, temperatura: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 14 }}>
                <MotionButton className="btn secundario" type="submit">Agregar bodega</MotionButton>
              </div>
            </form>
          )}
        </div>
      </Reveal>

      {/* Reporte por cosecha */}
      <Reveal delay={0.05}>
        <div className="card">
          <h3>Reporte por cosecha <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_20" /></span></h3>
          <p style={{ color: 'var(--text-2)', marginTop: -6 }}>Rendimiento: kilos de uva cosechada frente a litros y botellas de vino producidos.</p>
          <table>
            <thead><tr><th>Cosecha</th><th>Variedad</th><th>Kg uva</th><th>Litros</th><th>Botellas</th></tr></thead>
            <tbody>
              {reporte.map((f) => (
                <tr key={f.id_cosecha}>
                  <td>{f.fecha_cosecha?.slice(0, 10)}</td>
                  <td>{f.variedad || '—'}</td>
                  <td>{f.kilogramos ?? '—'}</td>
                  <td>{f.litros}</td>
                  <td>{f.botellas}</td>
                </tr>
              ))}
              {reporte.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-2)' }}>Todavía no hay cosechas registradas en Campo.</td></tr>}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
