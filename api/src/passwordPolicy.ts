export function validNewPassword(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Buffer.byteLength(value,'utf8') >= 16 && Buffer.byteLength(value,'utf8') <= 72;
}

export const USER_ROLES = ['Administrador','Gerente','Agronomo','Enologo','Logistica','Marketing'] as const;

export function validUsername(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9._-]{3,50}$/.test(value);
}
