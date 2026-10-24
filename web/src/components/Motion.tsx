import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Las pantallas operativas muestran su contenido de inmediato. Se conserva
// la API de los componentes para que las páginas no dependan de animaciones.
export function Reveal({ children }: { children: ReactNode; delay?: number }) {
  return <div>{children}</div>;
}

export function FadeIn({ children }: { children: ReactNode; delay?: number }) {
  return <div>{children}</div>;
}

export function MotionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}

export const filaVariants = {
  oculto: { opacity: 1 },
  visible: (_index: number) => ({ opacity: 1, transition: { duration: 0 } }),
};

export { motion };
