import { useEffect, useState } from 'react';
import { api } from '../api';

const roles=['Administrador','Gerente','Agronomo','Enologo','Logistica','Marketing'];
interface User {id_usuario:number;nombre:string;usuario:string;rol:string;estado:string;}
const empty={nombre:'',usuario:'',contrasena:'',rol:'Agronomo'};

export default function Usuarios() {
  const [users,setUsers]=useState<User[]>([]);
  const [drafts,setDrafts]=useState<Record<number,{rol:string;estado:string}>>({});
  const [form,setForm]=useState(empty);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const current=JSON.parse(localStorage.getItem('usuario')||'{}').id;
  const load=async()=>{
    const result=await api.get('/usuarios');setUsers(result.data);
    setDrafts(Object.fromEntries(result.data.map((user:User)=>[user.id_usuario,{rol:user.rol,estado:user.estado}])));
  };
  useEffect(()=>{load().catch(()=>setError('No se pudo cargar la lista de usuarios')).finally(()=>setLoading(false));},[]);
  const create=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{await api.post('/usuarios',form);setForm(empty);await load();setNotice('Usuario creado. Comparte la contraseña por el canal acordado y solicita que la cambie.');}
    catch(err:any){setError(err.response?.data?.error||'No se pudo confirmar el alta. Consulta la lista antes de reintentar.');}
    finally{setBusy(false);}
  };
  const update=async(user:User)=>{
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{await api.put(`/usuarios/${user.id_usuario}`,drafts[user.id_usuario]);await load();setNotice('Acceso actualizado. Las sesiones anteriores de esa cuenta ya no son válidas.');}
    catch(err:any){setError(err.response?.data?.error||'No se pudo actualizar el acceso');}
    finally{setBusy(false);}
  };
  return <div><header className="hero"><h1 className="display">Usuarios y accesos</h1><p className="lead">Asigna el rol que necesita cada persona y retira el acceso cuando corresponda.</p></header>
    {error&&<div className="error" role="alert">{error}</div>}{notice&&<p className="field-notice" role="status">{notice}</p>}
    <section className="card" aria-busy={loading}><h2>Cuentas registradas</h2><p>Cambiar un rol o desactivar una cuenta cierra sus sesiones anteriores. Otro administrador debe modificar tu propio acceso.</p>
      {loading?<p role="status">Cargando usuarios…</p>:<div className="field-table"><table><thead><tr><th>Persona</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{users.map(user=><tr key={user.id_usuario}>
        <td>{user.nombre}</td><td>{user.usuario}</td><td><select aria-label={`Rol de ${user.nombre}`} disabled={busy||user.id_usuario===current} value={drafts[user.id_usuario]?.rol||user.rol} onChange={e=>setDrafts({...drafts,[user.id_usuario]:{...drafts[user.id_usuario],rol:e.target.value}})}>{roles.map(rol=><option key={rol}>{rol}</option>)}</select></td>
        <td><select aria-label={`Estado de ${user.nombre}`} disabled={busy||user.id_usuario===current} value={drafts[user.id_usuario]?.estado||user.estado} onChange={e=>setDrafts({...drafts,[user.id_usuario]:{...drafts[user.id_usuario],estado:e.target.value}})}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></td>
        <td><button className="btn secundario" type="button" disabled={busy||user.id_usuario===current} onClick={()=>update(user)}>Guardar acceso</button></td>
      </tr>)}</tbody></table></div>}
    </section>
    <section className="card suave"><h2>Crear usuario</h2><form onSubmit={create}><div className="field-form">
      <label htmlFor="user-name">Nombre<input id="user-name" required maxLength={80} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
      <label htmlFor="user-login">Usuario<input id="user-login" autoComplete="off" required minLength={3} maxLength={50} pattern={'[a-z0-9._\\-]+'} value={form.usuario} onChange={e=>setForm({...form,usuario:e.target.value})}/><span>Minúsculas, números, punto, guion o guion bajo.</span></label>
      <label htmlFor="user-role">Rol<select id="user-role" value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}>{roles.map(rol=><option key={rol}>{rol}</option>)}</select></label>
      <label htmlFor="user-password">Contraseña inicial<input id="user-password" type="password" autoComplete="new-password" required minLength={16} value={form.contrasena} onChange={e=>setForm({...form,contrasena:e.target.value})}/><span>Frase larga; entre 16 y 72 bytes UTF-8.</span></label>
    </div><button className="btn primario" type="submit" disabled={busy}>{busy?'Guardando…':'Crear usuario'}</button></form></section>
  </div>;
}
