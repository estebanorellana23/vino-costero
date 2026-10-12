import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Cuenta() {
  const navigate=useNavigate();
  const [actual,setActual]=useState('');
  const [nueva,setNueva]=useState('');
  const [confirmacion,setConfirmacion]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(saving)return;setError('');
    if(nueva!==confirmacion){setError('Las contraseñas nuevas no coinciden');return;}
    setSaving(true);
    try {
      await api.post('/auth/password',{actual,nueva});
      localStorage.removeItem('token');localStorage.removeItem('usuario');
      navigate('/login',{replace:true,state:{notice:'Contraseña actualizada. Inicia sesión nuevamente.'}});
    } catch(err:any){setError(err.response?.data?.error||'No se pudo cambiar la contraseña');}
    finally{setSaving(false);}
  };
  return <div><header className="hero"><h1 className="display">Mi cuenta</h1><p className="lead">Cambia tu contraseña y protege tus sesiones.</p></header>
    <section className="card"><h2>Cambiar contraseña</h2><p>Usa una frase larga de al menos 16 caracteres. El límite es 72 bytes; algunos caracteres ocupan más de un byte. Al guardar se cerrarán tus sesiones anteriores.</p>
      <form onSubmit={save} className="account-form">
        <label htmlFor="current-password">Contraseña actual<input id="current-password" type="password" autoComplete="current-password" required value={actual} onChange={e=>setActual(e.target.value)}/></label>
        <label htmlFor="new-password">Contraseña nueva<input id="new-password" type="password" autoComplete="new-password" required minLength={16} value={nueva} onChange={e=>setNueva(e.target.value)}/></label>
        <label htmlFor="confirm-password">Repite la contraseña nueva<input id="confirm-password" type="password" autoComplete="new-password" required value={confirmacion} onChange={e=>setConfirmacion(e.target.value)}/></label>
        {error&&<div className="error" role="alert">{error}</div>}<button className="btn primario" type="submit" disabled={saving}>{saving?'Guardando…':'Cambiar contraseña'}</button>
      </form>
    </section>
  </div>;
}
