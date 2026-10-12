import { useEffect, useState } from 'react';
import { api } from '../api';
import { motion, FadeIn, Reveal, MotionButton, filaVariants } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
import { puedeEditarCampo } from '../roles';

interface Parcela {
  id_parcela: number;
  codigo: string;
  nombre: string;
  ubicacion: string;
  estado: string;
  id_variedad: number | null;
  variedad: string | null;
}
interface Variedad { id_variedad: number; nombre: string; }

const vacio = { codigo: '', nombre: '', ubicacion: '', id_variedad: '', estado: 'activa' };

export default function Parcelas() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [variedades, setVariedades] = useState<Variedad[]>([]);
  const [form, setForm] = useState<any>(vacio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const rol = JSON.parse(localStorage.getItem('usuario') || '{}').rol || '';
  const editable = puedeEditarCampo(rol);

  const cargar = async () => {
    const [p, v] = await Promise.all([api.get('/parcelas'), api.get('/variedades')]);
    setParcelas(p.data);
    setVariedades(v.data);
  };

  useEffect(() => { cargar(); }, []);

  const cambiar = (campo: string, valor: string) => setForm({ ...form, [campo]: valor });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editandoId) {
        await api.put(`/parcelas/${editandoId}`, form);
      } else {
        await api.post('/parcelas', form);
      }
      setForm(vacio);
      setEditandoId(null);
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const editar = (p: Parcela) => {
    setEditandoId(p.id_parcela);
    setForm({
      codigo: p.codigo, nombre: p.nombre || '', ubicacion: p.ubicacion || '',
      id_variedad: p.id_variedad || '', estado: p.estado,
    });
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta parcela?')) return;
    try {
      await api.delete(`/parcelas/${id}`);
      cargar();
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const cancelar = () => { setForm(vacio); setEditandoId(null); setError(''); };

  return (
    <div>
      <FadeIn>
        <header className="hero">
          <h1 className="display">Parcelas del viñedo</h1>
          <p className="lead">Catálogo maestro del módulo Campo</p>
          <div className="req-row">
            <ReqBadge codigo="REQ_C_03" />
            <ReqBadge codigo="REQ_C_06" />
          </div>
          {!editable && <div className="modo-consulta">Modo consulta · solo lectura</div>}
        </header>
      </FadeIn>

      {editable && (
      <Reveal>
        <div className="card">
          <h3>
            {editandoId ? 'Editar parcela' : 'Nueva parcela'}
            <span style={{ marginLeft: 10 }}><ReqBadge codigo="REQ_C_03" /></span>
          </h3>
          <form onSubmit={guardar}>
            <div className="row">
              <div>
                <label>Código *</label>
                <input value={form.codigo} onChange={(e) => cambiar('codigo', e.target.value)} placeholder="P-03" />
              </div>
              <div>
                <label>Nombre</label>
                <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="Ladera Sur" />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Ubicación</label>
                <input value={form.ubicacion} onChange={(e) => cambiar('ubicacion', e.target.value)} placeholder="Leyda sector 3" />
              </div>
              <div>
                <label>Variedad <ReqBadge codigo="REQ_C_06" /></label>
                <select value={form.id_variedad} onChange={(e) => cambiar('id_variedad', e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {variedades.map((v) => (
                    <option key={v.id_variedad} value={v.id_variedad}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Estado</label>
                <select value={form.estado} onChange={(e) => cambiar('estado', e.target.value)}>
                  <option value="activa">Activa</option>
                  <option value="descanso">Descanso</option>
                  <option value="en_preparacion">En preparación</option>
                </select>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 22 }}>
              <MotionButton className="btn primario" type="submit">
                {editandoId ? 'Guardar cambios' : 'Agregar parcela'}
              </MotionButton>
              {editandoId && (
                <MotionButton type="button" className="chip" style={{ marginLeft: 12 }} onClick={cancelar}>
                  Cancelar
                </MotionButton>
              )}
            </div>
          </form>
        </div>
      </Reveal>
      )}

      <Reveal delay={0.08}>
        <div className="card">
          <h3>Parcelas registradas ({parcelas.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Ubicación</th>
                <th>Variedad</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => (
                <motion.tr
                  key={p.id_parcela}
                  custom={i}
                  variants={filaVariants}
                  initial="oculto"
                  animate="visible"
                >
                  <td><b>{p.codigo}</b></td>
                  <td>{p.nombre}</td>
                  <td>{p.ubicacion}</td>
                  <td>{p.variedad || <span style={{ color: 'var(--text-2)' }}>—</span>}</td>
                  <td><span className="badge">{p.estado}</span></td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {editable ? (
                      <>
                        <button className="chip" onClick={() => editar(p)}>Editar</button>
                        <button className="chip peligro" onClick={() => eliminar(p.id_parcela)}>Eliminar</button>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-2)' }}>—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
              {parcelas.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--text-2)' }}>Aún no hay parcelas. Agregá una arriba.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
