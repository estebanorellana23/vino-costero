import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { REQUISITOS } from '../requisitos';

/**
 * Insignia de requerimiento: muestra el número (ej. REQ_C_12) con un punto de
 * color (verde = ya está en el prototipo, gris = diseñado/pendiente) y, al pasar
 * el mouse o al enfocar con teclado, un tooltip con la descripción breve.
 */
export function ReqBadge({ codigo }: { codigo: string }) {
  const [abierto, setAbierto] = useState(false);
  const req = REQUISITOS[codigo];
  if (!req) return null;

  return (
    <span
      className="reqbadge-wrap"
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
      <AnimatePresence>
        {abierto && (
          <motion.span
            className="reqtip"
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            style={{ transformOrigin: 'bottom center' }}
          >
            <b>{codigo} · requisito del enunciado ({req.estado === 'listo' ? 'ya está en el prototipo' : 'diseñado, aún no construido'})</b>
            {req.desc}
            <span className="flecha" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
