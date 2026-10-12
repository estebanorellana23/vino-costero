import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/* Spring crítico (sin rebote) — el valor "por defecto" que recomienda Apple.
   Las secciones y tarjetas entran con este movimiento suave. */
const spring = { type: 'spring' as const, bounce: 0, duration: 0.6 };

/**
 * Reveal: muestra a sus hijos cuando entran en pantalla al hacer scroll.
 * Sube un poco (y) y aparece (opacity). Si el usuario pidió "menos
 * movimiento" en su sistema, solo hace un fundido sin desplazamiento.
 */
export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const sinMovimiento = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: sinMovimiento ? 0 : 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeIn: entrada al montar el componente (sin esperar scroll).
 * Útil para el encabezado de cada pantalla.
 */
export function FadeIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const sinMovimiento = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: sinMovimiento ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Botón con micro-interacción: se hunde un poco al presionar (feedback en pointer-down). */
export function MotionButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      className={className}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

/** Fila de tabla que aparece escalonada (stagger) al cargar la lista. */
export const filaVariants = {
  oculto: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.5, delay: i * 0.05 },
  }),
};

export { motion };
