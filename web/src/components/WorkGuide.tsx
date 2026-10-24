import { useLocation } from 'react-router-dom';
import { puedeEditarModulo } from '../roles';

const pantallas: Record<string, { dominio?: string; objetivo: string; consulta: string; accesos: [string, string, boolean?][] }> = {
  '/parcelas': { dominio: 'campo', objetivo: 'Registra los terrenos y consulta sus datos antes de iniciar una siembra.', consulta: 'Consulta los terrenos, su variedad y su estado.', accesos: [['Nueva parcela', 'registro-parcela', true], ['Parcelas registradas', 'lista-parcelas']] },
  '/siembras': { dominio: 'campo', objetivo: 'Registra una siembra y sigue su maduración hasta la cosecha.', consulta: 'Revisa la maduración, las mediciones y la disponibilidad para cosechar.', accesos: [['Registrar siembra', 'registro-siembra', true], ['Ciclos de cultivo', 'ciclos-cultivo']] },
  '/campo': { dominio: 'campo', objetivo: 'Elige una parcela y el tipo de registro que necesitas consultar o agregar.', consulta: 'Elige una parcela y consulta su historial por tipo de registro.', accesos: [['Elegir parcela', 'field-parcel']] },
  '/clima': { dominio: 'campo', objetivo: 'Elige una parcela para revisar lecturas, equipos y alertas de temperatura.', consulta: 'Revisa lecturas y alertas de la parcela seleccionada.', accesos: [['Elegir parcela', 'climate-parcel']] },
  '/produccion': { dominio: 'produccion', objetivo: 'Crea lotes, registra su elaboración y consulta las bodegas y el rendimiento.', consulta: 'Consulta el avance de los lotes, sus catas y el rendimiento por cosecha.', accesos: [['Crear lote', 'registro-lote', true], ['Lotes registrados', 'lista-lotes'], ['Bodegas', 'bodegas'], ['Reporte por cosecha', 'reporte-cosecha']] },
  '/logistica': { dominio: 'logistica', objetivo: 'Registra pedidos, sigue su preparación y embarca los que están listos.', consulta: 'Consulta pedidos, compradores y el estado de sus embarques.', accesos: [['Crear pedido', 'registro-pedido', true], ['Pedidos registrados', 'lista-pedidos'], ['Compradores', 'compradores']] },
  '/gestion': { dominio: 'gestion', objetivo: 'Revisa los indicadores y registra movimientos financieros y campañas.', consulta: 'Consulta los indicadores, las finanzas y las campañas registradas.', accesos: [['Indicadores', 'indicadores'], ['Finanzas', 'finanzas'], ['Campañas', 'campanias']] },
  '/usuarios': { objetivo: 'Revisa las cuentas existentes antes de crear una o cambiar su acceso.', consulta: '', accesos: [['Cuentas registradas', 'cuentas'], ['Crear usuario', 'crear-usuario']] },
  '/cuenta': { objetivo: 'Cambia tu contraseña personal. Al guardar tendrás que volver a ingresar.', consulta: '', accesos: [['Cambiar contraseña', 'current-password']] },
  '/ayuda': { objetivo: 'Consulta el proceso del vino, las responsabilidades de cada rol y el glosario.', consulta: '', accesos: [['Proceso del vino', 'proceso-vino'], ['Responsabilidades', 'responsabilidades'], ['Glosario', 'glosario']] },
};

export function WorkGuide({ rol }: { rol: string }) {
  const { pathname } = useLocation();
  const pantalla = pantallas[pathname];
  if (!pantalla) return null;
  const consulta = !!pantalla.dominio && !puedeEditarModulo(rol, pantalla.dominio);
  return <section className="work-guide" aria-label="Tareas de esta pantalla">
    <p><strong>{consulta ? 'Solo consulta' : 'Tu tarea'}</strong> {consulta ? pantalla.consulta : pantalla.objetivo}</p>
    <nav aria-label="Ir a una sección">{pantalla.accesos.filter(a => !consulta || !a[2]).map(([titulo, id]) => <a key={id} href={`#${id}`}>{titulo} <span aria-hidden="true">↓</span></a>)}</nav>
  </section>;
}
