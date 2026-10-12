import { useEffect, useState } from 'react';
import { api } from '../api';
import { FadeIn, Reveal, MotionButton } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
import { Termino } from '../components/Termino';
import { puedeEditarModulo } from '../roles';

const hoy = () => new Date().toLocaleDateString('en-CA');
const ESTADOS = ['Pendiente', 'Embotellado', 'Listo', 'Embarcado'];

interface Comprador { id_comprador: number; nombre: string; pais: string | null; contacto: string | null; }
interface Pedido {
  id_pedido: number; codigo: string; id_comprador: number | null; fecha: string; cajas: number | null;
  estado: string; estado_index: number; comprador: string | null; pais: string | null;
  embarque_fecha: string | null; destino: string | null; transporte: string | null;
}

function EstadoPedido({ index }: { index: number }) {
  const embarcado = index >= ESTADOS.length - 1;
  return (
    <div className="fenologia">
      {ESTADOS.map((nombre, i) => {
        let cls = 'fase';
        if (embarcado && i === ESTADOS.length - 1) cls += ' cosecha-ok';
        else if (i < index) cls += ' hecha';
        else if (i === index) cls += ' actual';
        return <div key={nombre} className={cls}><div className="bolita" />{nombre}</div>;
      })}
    </div>
  );
}

export default function Logistica() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoForm, setPedidoForm] = useState<any>({ codigo: '', id_comprador: '', fecha: hoy(), cajas: '' });
  const [compradorForm, setCompradorForm] = useState<any>({ nombre: '', pais: '', contacto: '' });
  const [embarque, setEmbarque] = useState<Record<number, any>>({});
  const [error, setError] = useState('');

  const rol = JSON.parse(localStorage.getItem('usuario') || '{}').rol || '';
  const editable = puedeEditarModulo(rol, 'logistica');

  const cargar = async () => {
    const [c, p] = await Promise.all([api.get('/logistica/compradores'), api.get('/logistica/pedidos')]);
    setCompradores(c.data);
    setPedidos(p.data);
  };
  useEffect(() => { cargar(); }, []);

  const crearPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/logistica/pedidos', pedidoForm);
      setPedidoForm({ codigo: '', id_comprador: '', fecha: hoy(), cajas: '' });
      cargar();
    } catch (err: any) { setError(err.response?.data?.error || 'Error al crear el pedido'); }
  };

  const crearComprador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compradorForm.nombre) return;
    await api.post('/logistica/compradores', compradorForm);
    setCompradorForm({ nombre: '', pais: '', contacto: '' });
    cargar();
  };

  const avanzar = async (p: Pedido) => { await api.put(`/logistica/pedidos/${p.id_pedido}/avanzar`); cargar(); };

  const embarcar = async (p: Pedido) => {
    const e = embarque[p.id_pedido] || {};
    try {
      await api.post(`/logistica/pedidos/${p.id_pedido}/embarque`, { fecha: hoy(), ...e });
      setEmbarque({ ...embarque, [p.id_pedido]: {} });
      cargar();
    } catch (err: any) { alert(err.response?.data?.error || 'No se pudo registrar el embarque'); }
  };

  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Logística / Comercial</h1>
          <p className="lead">Pedidos de los compradores, embotellado, <Termino k="embarque">embarque</Termino> y transporte del vino terminado.</p>
          <div className="req-row">
            <ReqBadge codigo="REQ_C_23" /><ReqBadge codigo="REQ_C_29" />
            <ReqBadge codigo="REQ_C_24" /><ReqBadge codigo="REQ_C_25" />
          </div>
          {!editable && <div className="modo-consulta">Modo consulta · solo lectura</div>}
        </header>
      </FadeIn>

      {/* Nuevo pedido */}
      {editable && (
        <Reveal>
          <div className="card suave">
            <h3>Nuevo pedido <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_23" /></span></h3>
            <form onSubmit={crearPedido}>
              <div className="row">
                <div>
                  <label>Código *</label>
                  <input value={pedidoForm.codigo} onChange={(e) => setPedidoForm({ ...pedidoForm, codigo: e.target.value })} placeholder="PED-003" />
                </div>
                <div>
                  <label>Comprador</label>
                  <select value={pedidoForm.id_comprador} onChange={(e) => setPedidoForm({ ...pedidoForm, id_comprador: e.target.value })}>
                    <option value="">— Elegí uno —</option>
                    {compradores.map((c) => <option key={c.id_comprador} value={c.id_comprador}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label>Fecha *</label>
                  <input type="date" value={pedidoForm.fecha} onChange={(e) => setPedidoForm({ ...pedidoForm, fecha: e.target.value })} />
                </div>
                <div>
                  <label>Cajas</label>
                  <input type="number" value={pedidoForm.cajas} onChange={(e) => setPedidoForm({ ...pedidoForm, cajas: e.target.value })} placeholder="100" />
                </div>
              </div>
              {error && <div className="error">{error}</div>}
              <div style={{ marginTop: 20 }}><MotionButton className="btn primario" type="submit">Crear pedido</MotionButton></div>
            </form>
          </div>
        </Reveal>
      )}

      {/* Pedidos */}
      {pedidos.map((p, i) => {
        const embarcado = p.estado === 'Embarcado';
        return (
          <Reveal key={p.id_pedido} delay={i * 0.05}>
            <div className="card">
              <div className="siembra-head">
                <div>
                  <div className="titulo">{p.codigo} · {p.comprador || 'Sin comprador'}</div>
                  <div className="meta">
                    {p.pais ? `${p.pais} · ` : ''}{p.fecha?.slice(0, 10)}{p.cajas ? ` · ${p.cajas} cajas` : ''}
                    {embarcado && p.destino ? ` · Embarcado a ${p.destino}` : ''}
                  </div>
                </div>
                <span className={`estado-pill ${embarcado ? 'lista' : 'madurando'}`}>
                  <span className="punto" />{p.estado}
                </span>
              </div>

              <EstadoPedido index={p.estado_index} />

              {editable && !embarcado && (
                <>
                  {p.estado !== 'Listo' ? (
                    <div className="medir">
                      <MotionButton className="btn primario" type="button" onClick={() => avanzar(p)}>
                        Avanzar a {ESTADOS[p.estado_index + 1]}
                      </MotionButton>
                    </div>
                  ) : (
                    <div className="medir">
                      <label>Embarcar <ReqBadge codigo="REQ_C_24" /></label>
                      <input placeholder="destino" style={{ width: 160 }}
                        value={embarque[p.id_pedido]?.destino ?? ''}
                        onChange={(e) => setEmbarque({ ...embarque, [p.id_pedido]: { ...embarque[p.id_pedido], destino: e.target.value } })} />
                      <input placeholder="transporte" style={{ width: 150 }}
                        value={embarque[p.id_pedido]?.transporte ?? ''}
                        onChange={(e) => setEmbarque({ ...embarque, [p.id_pedido]: { ...embarque[p.id_pedido], transporte: e.target.value } })} />
                      <MotionButton className="btn primario" type="button" onClick={() => embarcar(p)}>Registrar embarque</MotionButton>
                    </div>
                  )}
                </>
              )}

              {embarcado && (
                <div className="cosechada">
                  Embarcado el {p.embarque_fecha?.slice(0, 10)}{p.destino ? ` a ${p.destino}` : ''}{p.transporte ? ` · ${p.transporte}` : ''}.
                </div>
              )}
            </div>
          </Reveal>
        );
      })}

      {/* Compradores */}
      <Reveal>
        <div className="card">
          <h3>Compradores <span style={{ marginLeft: 8 }}><ReqBadge codigo="REQ_C_25" /></span></h3>
          <table>
            <thead><tr><th>Comprador</th><th>País</th><th>Contacto</th></tr></thead>
            <tbody>
              {compradores.map((c) => (
                <tr key={c.id_comprador}><td><b>{c.nombre}</b></td><td>{c.pais || '—'}</td><td>{c.contacto || '—'}</td></tr>
              ))}
              {compradores.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--text-2)' }}>Sin compradores aún.</td></tr>}
            </tbody>
          </table>
          {editable && (
            <form onSubmit={crearComprador} style={{ marginTop: 18 }}>
              <div className="row">
                <div><label>Nombre *</label><input value={compradorForm.nombre} onChange={(e) => setCompradorForm({ ...compradorForm, nombre: e.target.value })} /></div>
                <div><label>País</label><input value={compradorForm.pais} onChange={(e) => setCompradorForm({ ...compradorForm, pais: e.target.value })} /></div>
                <div><label>Contacto</label><input value={compradorForm.contacto} onChange={(e) => setCompradorForm({ ...compradorForm, contacto: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 14 }}><MotionButton className="btn secundario" type="submit">Agregar comprador</MotionButton></div>
            </form>
          )}
        </div>
      </Reveal>
    </div>
  );
}
