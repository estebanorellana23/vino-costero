import { useId, useState } from 'react';
import { REQUISITOS } from '../requisitos';

/**
 * Insignia de requerimiento: muestra el número (ej. REQ_C_12) con un punto de
 * color (verde = ya está en el prototipo, gris = diseñado/pendiente) y, al pasar
 * el mouse o al enfocar con teclado, un tooltip con la descripción breve.
 */
export function ReqBadge({ codigo }: { codigo: string }) {
  const [abierto, setAbierto] = useState(false);
  const tooltipId = useId();
  const req = REQUISITOS[codigo];
  if (!req) return null;

  return (
    <span
      className="reqbadge-wrap"
      role="button"
      aria-label={`${codigo}: ver requisito`}
      aria-expanded={abierto}
      aria-describedby={abierto ? tooltipId : undefined}
      onClick={e => { e.preventDefault(); setAbierto(true); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(true); }
      }}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)}
      onBlur={() => setAbierto(false)}
      tabIndex={0}
    >
      <span className={`reqbadge ${req.estado}`}>
        <span className="dot" />
        {codigo}
      </span>
        {abierto && (
          <span
            className="reqtip"
            id={tooltipId}
            role="tooltip"
          >
            <b>{codigo} · requisito del enunciado ({req.estado === 'listo' ? 'ya está en el prototipo' : 'diseñado, aún no construido'})</b>
            {req.desc}
            <span className="flecha" />
          </span>
        )}
    </span>
  );
}
