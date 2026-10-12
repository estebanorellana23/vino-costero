import type { ReactNode } from 'react';
import { GLOSARIO } from '../glosario';

/**
 * Palabra técnica con explicación simple: subrayado punteado y, al pasar el mouse
 * (o enfocar con el teclado), un globo con qué significa. El texto viene de glosario.ts.
 */
export function Termino({ k, children }: { k: string; children: ReactNode }) {
  const entrada = GLOSARIO[k];
  if (!entrada) return <>{children}</>;
  return (
    <span className="termino" tabIndex={0} role="note" aria-label={`${entrada.titulo}: ${entrada.texto}`}>
      {children}
      <span className="termino-tip" aria-hidden="true">
        <b>{entrada.titulo}</b>
        {entrada.texto}
      </span>
    </span>
  );
}
