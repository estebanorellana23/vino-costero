import { useId, useState, type ReactNode } from 'react';
import { GLOSARIO } from '../glosario';

/**
 * Palabra técnica con explicación simple: subrayado punteado y, al pasar el mouse
 * (o enfocar con el teclado), un globo con qué significa. El texto viene de glosario.ts.
 */
export function Termino({ k, children }: { k: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const tooltipId = useId();
  const entrada = GLOSARIO[k];
  if (!entrada) return <>{children}</>;
  return (
    <span className="termino" tabIndex={0} role="button" data-open={abierto} aria-label={`${entrada.titulo}: ver explicación`} aria-expanded={abierto} aria-describedby={abierto ? tooltipId : undefined}
      onClick={e => { e.preventDefault(); setAbierto(true); }} onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
      onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); } if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(true); } }}>
      {children}
      <span className="termino-tip" id={tooltipId} role="tooltip" aria-hidden={!abierto}>
        <b>{entrada.titulo}</b>
        {entrada.texto}
      </span>
    </span>
  );
}
