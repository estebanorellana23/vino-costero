export class InputError extends Error {}
export interface Field { kind: 'text' | 'number' | 'id' | 'date' | 'enum'; required?: boolean; max?: number; min?: number; integer?: boolean; choices?: readonly string[]; }
const id: Field = { kind: 'id', required: true };
const date: Field = { kind: 'date', required: true };
const text = (max: number, required = false): Field => ({ kind: 'text', max, required });
const number = (min: number, max: number, required = false, integer = false): Field => ({ kind: 'number', min, max, required, integer });
export const resources = {
  variedades: { table: 'variedad_uva', key: 'id_variedad', fields: { nombre: text(80,true), caracteristicas: text(255), azucar_objetivo: number(0.1,99.9,true) } },
  tierra: { table: 'control_tierra', key: 'id_control', fields: { id_parcela: id, fecha: date, ph: number(0,14,true), humedad: number(0,100,true), nitrogeno: number(0,999999.99), fosforo: number(0,999999.99), potasio: number(0,999999.99), observacion: text(255) } },
  dimensiones: { table: 'dimension_parcela', key: 'id_dimension', fields: { id_parcela: id, fecha: date, superficie_ha: number(0.01,999999.99,true), hileras: number(1,2147483647,true,true), cant_plantas: number(1,2147483647,true,true) } },
  controles: { table: 'control_siembra', key: 'id_control_siembra', fields: { id_siembra: id, fecha: date, etapa: { kind: 'enum', required: true, choices: ['Brotación','Floración','Envero','Maduración'] } as Field, riego: text(60), fertilizacion: text(60), observacion: text(255) } },
  enfermedades: { table: 'enfermedad', key: 'id_enfermedad', fields: { nombre: text(80,true), sintomas: text(255,true), tratamiento: text(255,true) } },
  incidencias: { table: 'siembra_enferma', key: 'id_incidencia', fields: { id_siembra: id, id_enfermedad: id, fecha_deteccion: date, severidad: { kind: 'enum', required: true, choices: ['bajo','medio','alto'] } as Field, tratamiento: text(255,true) } },
  sanidad: { table: 'estado_sanitario', key: 'id_estado', fields: { id_siembra: id, fecha: date, calificacion: { kind: 'enum', required: true, choices: ['Bueno','Regular','Malo'] } as Field, pct_afectado: number(0,100,true) } },
  puntos: { table: 'punto_control', key: 'id_punto_control', fields: { id_parcela: id, nombre: text(80,true), fecha_prog: date } },
  'mediciones-puntos': { table: 'medicion_punto_control', key: 'id_medicion_punto', fields: { id_punto_control: id, fecha: date, valor: text(80,true) } },
} as const;

// SQL identifiers are exclusively defined above; request keys never become SQL.
export function parseFields(fields: Record<string, Field>, body: unknown): Record<string, string | number | null> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Solicitud inválida');
  const input = body as Record<string, unknown>;
  for (const key of Object.keys(input)) if (!Object.hasOwn(fields, key)) throw new InputError(`Campo desconocido: ${key}`);
  const result: Record<string, string | number | null> = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = input[key];
    if (value == null || value === '') {
      if (field.required) throw new InputError(`Falta ${key}`);
      result[key] = null; continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number') throw new InputError(`Valor inválido en ${key}`);
    if (field.kind === 'number' || field.kind === 'id') {
      const n = Number(value);
      if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value)) throw new InputError(`Número inválido en ${key}`);
      if (!Number.isFinite(n) || (field.kind === 'id' && (!Number.isSafeInteger(n) || n < 1)) ||
        (field.integer && !Number.isSafeInteger(n)) || (field.min != null && n < field.min) || (field.max != null && n > field.max)) throw new InputError(`Fuera de rango: ${key}`);
      result[key] = n;
    } else {
      if (typeof value !== 'string' || !value.trim()) throw new InputError(`Texto inválido en ${key}`);
      const clean = value.trim();
      if (field.max && clean.length > field.max) throw new InputError(`Texto demasiado largo: ${key}`);
      if (field.kind === 'enum' && !field.choices!.includes(clean)) throw new InputError(`Opción inválida: ${key}`);
      if (field.kind === 'date') {
        const d = new Date(`${clean}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(clean) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== clean) throw new InputError(`Fecha inválida: ${key}`);
      }
      result[key] = clean;
    }
  }
  return result;
}

export function harvestReady(brix: number | null, target: number | null, health: string | null, active: boolean): boolean {
  return active && brix != null && target != null && Number.isFinite(brix) && Number.isFinite(target) && target > 0 && brix >= target && health === 'Bueno';
}
