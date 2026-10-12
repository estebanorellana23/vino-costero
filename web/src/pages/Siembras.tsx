import { useEffect, useState } from 'react';
import { api } from '../api';
import { motion, FadeIn, Reveal, MotionButton } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
import { Termino } from '../components/Termino';
import { puedeEditarCampo } from '../roles';

interface Medicion { fecha: string; brix: number; }
interface Siembra {
  id_siembra: number;
  id_parcela: number;
  id_variedad: number;
  fecha_siembra: string;
  cantidad: number | null;
  responsable: string | null;
  estado: string;
  parcela_codigo: string;
  parcela_nombre: string;
  variedad: string;
  azucar_objetivo: number | null;
  mediciones: Medicion[];
  ultimo_brix: number | null;
  lista_cosecha: boolean;
  falta: number | null;
  estado_sanitario: string | null;
  etapa: string | null;
}
interface Parcela { id_parcela: number; codigo: string; nombre: string; }
interface Variedad { id_variedad: number; nombre: string; }

const hoy = () => new Date().toLocaleDateString('en-CA');

// Etapas fenológicas de la vid (cómo va creciendo la uva).
const FASES = ['Brotación', 'Floración', 'Envero', 'Maduración', 'Cosecha'];
const CLAVE_FASE: Record<string, string> = { 'Brotación': 'brotacion', 'Floración': 'floracion', 'Envero': 'envero', 'Maduración': 'maduracion', 'Cosecha': 'cosecha' };

function faseActual(s: Siembra): number {
  if (s.estado === 'cerrada') return 4;
  return s.etapa ? FASES.indexOf(s.etapa) : -1;
}

/* Línea de fases: control visual de cómo va creciendo la uva. */
function Fenologia({ actual, cosechada }: { actual: number; cosechada: boolean }) {
  return (
    <div className="fenologia">
      {FASES.map((nombre, i) => {
        let cls = 'fase';
        if (cosechada && i === 4) cls += ' cosecha-ok';
        else if (i < actual) cls += ' hecha';
        else if (i === actual) cls += ' actual';
        return (
          <div key={nombre} className={cls}>
            <div className="bolita" />
            <Termino k={CLAVE_FASE[nombre]}>{nombre}</Termino>
          </div>
        );
      })}
    </div>
  );
}

/* Mini gráfica de la trayectoria de azúcar (SVG, sin librerías). */
function Sparkline({ datos, objetivo }: { datos: number[]; objetivo: number | null }) {
  if (datos.length < 2) return null;
  const w = 120, h = 34, pad = 4;
  const min = Math.min(...datos, objetivo ?? datos[0]);
  const max = Math.max(...datos, objetivo ?? datos[datos.length - 1]);
  const rango = max - min || 1;
  const x = (i: number) => pad + (i / (datos.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / rango) * (h - pad * 2);
  const d = datos.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {objetivo != null && (
        <line x1={pad} x2={w - pad} y1={y(objetivo)} y2={y(objetivo)}
          stroke="#d2d2d7" strokeWidth="1" strokeDasharray="3 3" />
      )}
      <motion.path
        d={d} fill="none" stroke="#0071e3" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <circle cx={x(datos.length - 1)} cy={y(datos[datos.length - 1])} r="3" fill="#0071e3" />
    </svg>
  );
}

export default function Siembras() {
  const [siembras, setSiembras] = useState<Siembra[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [variedades, setVariedades] = useState<Variedad[]>([]);
  const [form, setForm] = useState<any>({ id_parcela: '', id_variedad: '', fecha_siembra: hoy(), cantidad: '', responsable: '' });
  const [error, setError] = useState('');
  const [nuevoBrix, setNuevoBrix] = useState<Record<number, string>>({});
  const [cosechando, setCosechando] = useState<number | null>(null);
  const [cosechaForm, setCosechaForm] = useState<any>({ kilogramos: '', clasificacion: 'Primera' });
  const rol = JSON.parse(localStorage.getItem('usuario') || '{}').rol || '';
  const editable = puedeEditarCampo(rol);

  const cargar = async () => {
    const [s, p, v] = await Promise.all([
      api.get('/siembras'), api.get('/parcelas'), api.get('/variedades'),
    ]);
    setSiembras(s.data);
    setParcelas(p.data);
    setVariedades(v.data);
  };

  useEffect(() => { cargar(); }, []);

  const cambiar = (campo: string, valor: string) => setForm({ ...form, [campo]: valor });

  const guardarSiembra = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/siembras', form);
      setForm({ id_parcela: '', id_variedad: '', fecha_siembra: hoy(), cantidad: '', responsable: '' });
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la siembra');
    }
  };

  const medir = async (s: Siembra) => {
    const brix = nuevoBrix[s.id_siembra];
    if (!brix) return;
    try {
      await api.post('/mediciones', { id_parcela: s.id_parcela, id_siembra: s.id_siembra, fecha: hoy(), brix });
      setNuevoBrix({ ...nuevoBrix, [s.id_siembra]: '' });
      cargar();
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo guardar la medición');
    }
  };

  const registrarCosecha = async (s: Siembra) => {
    try {
      await api.post('/cosecha', {
        id_parcela: s.id_parcela,
        id_siembra: s.id_siembra,
        id_variedad: s.id_variedad,
        fecha_cosecha: hoy(),
        kilogramos: cosechaForm.kilogramos || null,
        clasificacion: cosechaForm.clasificacion,
        responsable: s.responsable || null,
      });
      setCosechando(null);
      setCosechaForm({ kilogramos: '', clasificacion: 'Primera' });
      cargar();
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo registrar la cosecha');
    }
  };

  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Siembras y maduración</h1>
          <p className="lead">
            Seguí cómo crece la uva y cuánta azúcar tiene (<Termino k="brix">grados Brix</Termino>). El sistema avisa solo cuando llega al punto óptimo de cosecha.
          </p>
          <div className="req-row">
            <ReqBadge codigo="REQ_C_05" />
            <ReqBadge codigo="REQ_C_11" />
            <ReqBadge codigo="REQ_C_12" />
            <ReqBadge codigo="REQ_C_13" />
          </div>
          {!editable && <div className="modo-consulta">Modo consulta · solo lectura</div>}
        </header>
      </FadeIn>

      {editable && (
      <Reveal>
        <div className="card suave">
          <h3>
            Registrar siembra
            <span style={{ marginLeft: 10 }}><ReqBadge codigo="REQ_C_05" /></span>
          </h3>
          <form onSubmit={guardarSiembra}>
            <div className="row">
              <div>
                <label>Parcela *</label>
                <select value={form.id_parcela} onChange={(e) => cambiar('id_parcela', e.target.value)}>
                  <option value="">— Elegí una —</option>
                  {parcelas.map((p) => (
                    <option key={p.id_parcela} value={p.id_parcela}>{p.codigo} · {p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Variedad * <ReqBadge codigo="REQ_C_06" /></label>
                <select value={form.id_variedad} onChange={(e) => cambiar('id_variedad', e.target.value)}>
                  <option value="">— Elegí una —</option>
                  {variedades.map((v) => (
                    <option key={v.id_variedad} value={v.id_variedad}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Fecha de siembra *</label>
                <input type="date" value={form.fecha_siembra} onChange={(e) => cambiar('fecha_siembra', e.target.value)} />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Cantidad (plantas)</label>
                <input type="number" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} placeholder="500" />
              </div>
              <div>
                <label>Responsable</label>
                <input value={form.responsable} onChange={(e) => cambiar('responsable', e.target.value)} placeholder="Ing. Agrónomo" />
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 22 }}>
              <MotionButton className="btn primario" type="submit">Registrar siembra</MotionButton>
            </div>
          </form>
        </div>
      </Reveal>
      )}

      {siembras.map((s, i) => {
        const objetivo = s.azucar_objetivo;
        const ultimo = s.ultimo_brix;
        const pct = objetivo && ultimo != null ? Math.min(100, (ultimo / objetivo) * 100) : 0;
        const cerrada = s.estado === 'cerrada';
        const estadoClase = cerrada ? 'madurando' : s.lista_cosecha ? 'lista' : 'madurando';
        const etiqueta = cerrada ? 'Ciclo cerrado' : s.lista_cosecha ? 'Lista para cosecha' : 'En seguimiento';
        return (
          <Reveal key={s.id_siembra} delay={i * 0.05}>
            <div className={'card' + (cerrada ? ' siembra-cerrada' : '')}>
              <div className="siembra-head">
                <div>
                  <div className="titulo">{s.parcela_codigo} · {s.parcela_nombre}</div>
                  <div className="meta">
                    {s.variedad} · sembrada el {s.fecha_siembra.slice(0, 10)}
                    {s.cantidad ? ` · ${s.cantidad} plantas` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ReqBadge codigo="REQ_C_12" />
                  <span className={`estado-pill ${s.lista_cosecha && !cerrada ? 'lista' : 'madurando'}`}>
                    <span className="punto" />
                    {etiqueta}
                  </span>
                </div>
              </div>

              {/* Control visual del crecimiento de la uva */}
              {s.etapa && !cerrada ? <Fenologia actual={faseActual(s)} cosechada={false} /> : <p>{cerrada ? 'Ciclo cerrado' : 'Etapa de crecimiento sin registrar'}</p>}
              <p><Termino k="sanidad">Estado sanitario</Termino>: <b>{s.estado_sanitario || 'Sin control registrado'}</b>. La cosecha requiere estado Bueno y azúcar objetivo alcanzado.</p>

              {ultimo != null ? (
                <>
                  <div className="barra">
                    <motion.span
                      className={s.lista_cosecha ? 'lista' : 'madurando'}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.9 }}
                    />
                  </div>
                  <div className="brix-info">
                    <span>Último: <b>{ultimo} <Termino k="brix">°Bx</Termino></b></span>
                    <span>
                      {s.lista_cosecha
                        ? `Alcanzó el objetivo (${objetivo} °Bx)`
                        : s.falta === 0 ? 'Azúcar alcanzada; falta estado sanitario Bueno' : `Faltan ${s.falta} °Bx para el objetivo (${objetivo} °Bx)`}
                    </span>
                  </div>

                  <div className="trayectoria">
                    {s.mediciones.map((m, k) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {k > 0 && <span className="flecha">→</span>}
                        <span className="paso">{m.brix}</span>
                      </span>
                    ))}
                    <span style={{ marginLeft: 'auto' }}>
                      <Sparkline datos={s.mediciones.map((m) => m.brix)} objetivo={objetivo} />
                    </span>
                  </div>
                </>
              ) : (
                !cerrada && (
                  <p style={{ color: 'var(--text-2)', marginTop: 16 }}>
                    Todavía no hay mediciones de azúcar. Agregá la primera abajo.
                  </p>
                )
              )}

              {/* Cargar medición (si sigue activa y el rol puede editar) */}
              {!cerrada && editable && (
                <div className="medir">
                  <label>Nueva medición <ReqBadge codigo="REQ_C_11" /></label>
                  <input
                    type="number" step="0.1" placeholder="°Bx"
                    value={nuevoBrix[s.id_siembra] || ''}
                    onChange={(e) => setNuevoBrix({ ...nuevoBrix, [s.id_siembra]: e.target.value })}
                  />
                  <MotionButton className="btn secundario" type="button" onClick={() => medir(s)}>
                    Guardar medición
                  </MotionButton>
                </div>
              )}

              {/* Registrar cosecha (solo si está lista, activa y el rol puede editar) */}
              {s.lista_cosecha && !cerrada && editable && (
                <div className="cosecha-box">
                  <div className="cosecha-aviso">
                    <span className="punto" style={{ width: 8, height: 8, borderRadius: '50%', background: '#30a46c' }} />
                    La uva alcanzó el punto óptimo. Ya podés registrar la cosecha.
                    <ReqBadge codigo="REQ_C_13" />
                  </div>
                  {cosechando === s.id_siembra ? (
                    <div>
                      <div className="row">
                        <div>
                          <label>Kilogramos</label>
                          <input type="number" step="0.1" value={cosechaForm.kilogramos}
                            onChange={(e) => setCosechaForm({ ...cosechaForm, kilogramos: e.target.value })}
                            placeholder="1250" />
                        </div>
                        <div>
                          <label>Clasificación</label>
                          <select value={cosechaForm.clasificacion}
                            onChange={(e) => setCosechaForm({ ...cosechaForm, clasificacion: e.target.value })}>
                            <option value="Primera">Primera</option>
                            <option value="Segunda">Segunda</option>
                            <option value="Descarte">Descarte</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginTop: 18 }}>
                        <MotionButton className="btn primario" type="button" onClick={() => registrarCosecha(s)}>
                          Confirmar cosecha
                        </MotionButton>
                        <MotionButton className="chip" type="button" style={{ marginLeft: 12 }}
                          onClick={() => setCosechando(null)}>
                          Cancelar
                        </MotionButton>
                      </div>
                    </div>
                  ) : (
                    <MotionButton className="btn primario" type="button" onClick={() => setCosechando(s.id_siembra)}>
                      Registrar cosecha
                    </MotionButton>
                  )}
                </div>
              )}

              {cerrada && (
                <div className="cosechada">Esta siembra ya fue cosechada y cerrada.</div>
              )}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
