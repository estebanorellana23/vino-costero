import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { motion, MotionButton } from '../components/Motion';
import { ReqBadge } from '../components/ReqBadge';
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
    <div className="login-wrap">
      <motion.form
        className="login-card"
        onSubmit={entrar}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.7 }}
      >
        <h1>Vino Costero</h1>
        <p className="sub">Sistema de Control de Producción Vitivinícola</p>

        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" autoComplete="username" required maxLength={50} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />

        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" autoComplete="current-password" required type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />

        {error && <div className="error" role="alert">{error}</div>}
        {typeof notice==='string' && <p role="status">{notice}</p>}

        <MotionButton disabled={ocupado} className="btn primario block" style={{ marginTop: 26 }} type="submit">
          {ocupado ? 'Ingresando…' : 'Ingresar'}
        </MotionButton>

        <div className="req-row" style={{ marginTop: 14 }}>
          <ReqBadge codigo="REQ_NF_02" />
          <ReqBadge codigo="REQ_NF_03" />
        </div>
      </motion.form>
    </div>
  );
}
