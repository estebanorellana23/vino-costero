import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { modulosDeRol } from '../roles';

/**
 * Panel lateral de navegación. Muestra los módulos del rol actual.
 */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const modulos = modulosDeRol(usuario.rol || '');

  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.aside
            className="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            <div className="drawer-user">
              <div className="nombre">{usuario.nombre}</div>
              <div className="rol">{usuario.rol}</div>
            </div>

            <div className="drawer-seccion">Módulos</div>
            <nav className="drawer-nav">
              {modulos.map((m) => (
                <NavLink
                  key={m.path}
                  to={m.path}
                  onClick={onClose}
                  className={({ isActive }) => 'drawer-link' + (isActive ? ' activo' : '')}
                >
                  <span>{m.label}</span>
                  {m.estado === 'construccion' && <span className="etq">En construcción</span>}
                </NavLink>
              ))}
            </nav>

            <button className="btn secundario block" style={{ marginTop: 'auto' }} onClick={salir}>
              Cerrar sesión
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
