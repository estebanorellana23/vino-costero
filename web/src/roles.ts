// Qué módulos ve cada rol. El menú del drawer y la pantalla de inicio tras el
// login se arman a partir de esto. "construccion" = módulo especificado pero
// todavía sin pantallas (otro integrante / sprint siguiente).

export interface Modulo {
  label: string;
  path: string;
  estado: 'listo' | 'construccion';
  integrante?: string;
}

const CAMPO: Modulo[] = [
  { label: 'Parcelas', path: '/parcelas', estado: 'listo' },
  { label: 'Siembras y maduración', path: '/siembras', estado: 'listo' },
  { label: 'Cuaderno de Campo', path: '/campo', estado: 'listo' },
  { label: 'Clima y sensores', path: '/clima', estado: 'listo' },
];
const PRODUCCION: Modulo = { label: 'Producción / Enología', path: '/produccion', estado: 'listo', integrante: 'Integrante 1' };
const LOGISTICA: Modulo = { label: 'Logística / Comercial', path: '/logistica', estado: 'listo', integrante: 'Integrante 3' };
const GESTION: Modulo = { label: 'Gestión / BI', path: '/gestion', estado: 'listo', integrante: 'Integrante 4' };
const CUENTA: Modulo = { label: 'Mi cuenta', path: '/cuenta', estado: 'listo' };
const AYUDA: Modulo = { label: 'Ayuda: cómo se usa', path: '/ayuda', estado: 'listo' };
const USUARIOS: Modulo = { label: 'Usuarios y accesos', path: '/usuarios', estado: 'listo' };

export const MODULOS_POR_ROL: Record<string, Modulo[]> = {
  Administrador: [...CAMPO, PRODUCCION, LOGISTICA, GESTION, USUARIOS, CUENTA, AYUDA],
  Gerente: [...CAMPO, PRODUCCION, LOGISTICA, GESTION, CUENTA, AYUDA],
  Agronomo: [...CAMPO, CUENTA, AYUDA],
  Enologo: [PRODUCCION, CUENTA, AYUDA],
  Logistica: [LOGISTICA, CUENTA, AYUDA],
  Marketing: [GESTION, CUENTA, AYUDA],
};

export function modulosDeRol(rol: string): Modulo[] {
  return MODULOS_POR_ROL[rol] || [];
}

// A dónde entra cada rol después del login (su primer módulo).
export function homeDeRol(rol: string): string {
  const m = modulosDeRol(rol);
  return m.length ? m[0].path : '/login';
}

// ¿Este rol puede ver esta ruta?
export function rolPuedeVer(rol: string, path: string): boolean {
  return modulosDeRol(rol).some((m) => m.path === path);
}

// Quién OPERA (edita) cada módulo. El resto que lo ve entra en modo consulta.
const EDITORES: Record<string, string[]> = {
  campo: ['Administrador', 'Agronomo'],
  produccion: ['Administrador', 'Enologo'],
  logistica: ['Administrador', 'Logistica'],
  gestion: ['Administrador', 'Marketing'],
};

export function puedeEditarModulo(rol: string, modulo: string): boolean {
  return (EDITORES[modulo] || []).includes(rol);
}

// Atajo para el módulo Campo (se mantiene por compatibilidad).
export function puedeEditarCampo(rol: string): boolean {
  return puedeEditarModulo(rol, 'campo');
}
