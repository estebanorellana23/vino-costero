import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { VineyardJourney } from '../components/VineyardJourney';
import { homeDeRol } from '../roles';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const notice=useLocation().state?.notice;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { usuario, contrasena });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      navigate(homeDeRol(data.usuario.rol));
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo conectar con el servidor');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="login-wrap vineyard-login">
      <VineyardJourney />
      <form
        className="login-card"
        onSubmit={entrar}
      >
        <p className="journey-eyebrow">Tu espacio de trabajo</p>
        <h2>Ingresar a Vino Costero</h2>
        <p className="sub">Entra con tu cuenta para ver los módulos de tu trabajo.</p>

        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" autoComplete="username" required maxLength={50} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />

        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" autoComplete="current-password" required type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />

        {error && <div className="error" role="alert">{error}</div>}
        {typeof notice==='string' && <p role="status">{notice}</p>}

        <button disabled={ocupado} className="btn primario block" style={{ marginTop: 26 }} type="submit">
          {ocupado ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="login-hint">¿No tienes acceso? Solicita tu cuenta al administrador.</p>
      </form>
    </div>
  );
}
