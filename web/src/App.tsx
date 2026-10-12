import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Login from './pages/Login';
import Parcelas from './pages/Parcelas';
import Siembras from './pages/Siembras';
import Produccion from './pages/Produccion';
import Logistica from './pages/Logistica';
import Gestion from './pages/Gestion';
import Campo from './pages/Campo';
import Cuenta from './pages/Cuenta';
import Usuarios from './pages/Usuarios';
import Clima from './pages/Clima';
import Ayuda from './pages/Ayuda';
import { Drawer } from './components/Drawer';
import { homeDeRol, rolPuedeVer } from './roles';

function sesion() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  return { token, usuario };
}

// Barra superior translúcida + botón de menú que abre el drawer.
function Layout({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const { usuario } = sesion();

  return (
    <div>
      <nav className="nav">
        <button className="menu-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
          <span /><span /><span />
        </button>
        <span className="marca">Vino Costero</span>
        <div className="spacer" />
        <div className="usuario">
          <div><b>{usuario.nombre}</b></div>
          <div>{usuario.rol}</div>
        </div>
      </nav>
      <Drawer open={abierto} onClose={() => setAbierto(false)} />
      <main className="contenido">{children}</main>
    </div>
  );
}

// Protege una ruta: exige sesión y que el rol tenga acceso al módulo.
function Privada({ children, path }: { children: React.ReactNode; path: string }) {
  const { token, usuario } = sesion();
  if (!token) return <Navigate to="/login" replace />;
  if (!rolPuedeVer(usuario.rol, path)) return <Navigate to={homeDeRol(usuario.rol)} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { token, usuario } = sesion();
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/parcelas" element={<Privada path="/parcelas"><Parcelas /></Privada>} />
        <Route path="/siembras" element={<Privada path="/siembras"><Siembras /></Privada>} />
        <Route path="/campo" element={<Privada path="/campo"><Campo /></Privada>} />
        <Route path="/cuenta" element={<Privada path="/cuenta"><Cuenta /></Privada>} />
        <Route path="/usuarios" element={<Privada path="/usuarios"><Usuarios /></Privada>} />
        <Route path="/ayuda" element={<Privada path="/ayuda"><Ayuda /></Privada>} />
        <Route path="/clima" element={<Privada path="/clima"><Clima /></Privada>} />
        <Route path="/produccion" element={<Privada path="/produccion"><Produccion /></Privada>} />
        <Route path="/logistica" element={<Privada path="/logistica"><Logistica /></Privada>} />
        <Route path="/gestion" element={<Privada path="/gestion"><Gestion /></Privada>} />
        <Route path="*" element={<Navigate to={token ? homeDeRol(usuario.rol) : '/login'} replace />} />
      </Routes>
    </MotionConfig>
  );
}
