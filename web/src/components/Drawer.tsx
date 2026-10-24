import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { modulosDeRol } from '../roles';

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const panel = useRef<HTMLElement>(null);
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const modulos = modulosDeRol(usuario.rol || '');
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, [open]);
  if (!open) return null;
  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };
  return <>
    <div className="drawer-backdrop" onClick={onClose} />
    <aside className="drawer" id="menu-principal" role="dialog" aria-modal="true" aria-label="Menú de Vino Costero" ref={panel}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const controls = panel.current?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <button type="button" className="chip drawer-close" onClick={onClose}>Cerrar menú ×</button>
      <div className="drawer-user"><div className="nombre">{usuario.nombre}</div><div className="rol">{usuario.rol}</div></div>
      <div className="drawer-seccion">Módulos</div>
      <nav className="drawer-nav" aria-label="Módulos del menú">{modulos.map(m => <NavLink key={m.path} to={m.path} onClick={onClose} className={({ isActive }) => 'drawer-link' + (isActive ? ' activo' : '')}><span>{m.label}</span>{m.estado === 'construccion' && <span className="etq">En construcción</span>}</NavLink>)}</nav>
      <button type="button" className="btn secundario block" style={{ marginTop: 'auto' }} onClick={salir}>Cerrar sesión</button>
    </aside>
  </>;
}
