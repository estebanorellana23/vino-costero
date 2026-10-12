import { InputError } from './fieldRules.js';

export function temperatureAlert(value: number, min: number | null, max: number | null): 'helada' | 'calor' | null {
  if(min!=null && value<min)return 'helada';
  if(max!=null && value>max)return 'calor';
  return null;
}

export function climateInput(body: unknown, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Trama inválida');
  const value = body as Record<string, unknown>;
  const fields = ['lectura_uuid','secuencia_uno','capturada_en','temperatura_c','humedad_aire_pct','humedad_suelo_pct','origen'];
  if (Object.keys(value).some(key=>!fields.includes(key))) throw new InputError('Campo desconocido');
  if (typeof value.lectura_uuid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.lectura_uuid)) throw new InputError('Identidad de lectura inválida');
  if (!Number.isSafeInteger(value.secuencia_uno) || Number(value.secuencia_uno)<1 || Number(value.secuencia_uno)>0xffffffff) throw new InputError('Secuencia inválida');
  if (typeof value.capturada_en!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.capturada_en)) throw new InputError('Fecha UTC inválida');
  const date=new Date(value.capturada_en);
  if (!Number.isFinite(date.getTime()) || date.toISOString()!==value.capturada_en || date.getTime()>now+60000 || date.getTime()<now-86400000) throw new InputError('Fecha fuera del período de recepción');
  for (const [key,min,max] of [['temperatura_c',-40,80],['humedad_aire_pct',0,100]] as const) {
    const n=value[key];
    if(typeof n!=='number' || !Number.isFinite(n) || n<min || n>max || Math.abs(n*100-Math.round(n*100))>0.000001) throw new InputError(`Valor inválido: ${key}`);
  }
  // Soil moisture is optional, but the sender must declare where the number comes from,
  // so simulated data can never be mistaken for a physical sensor reading.
  let soilHumidity: number | null = null;
  let origin: 'sensor' | 'simulado' = 'sensor';
  if (value.origen !== undefined) {
    if (value.origen !== 'sensor' && value.origen !== 'simulado') throw new InputError('Origen inválido');
    origin = value.origen;
  }
  if (value.humedad_suelo_pct !== undefined) {
    const n = value.humedad_suelo_pct;
    if (value.origen === undefined) throw new InputError('La humedad del suelo requiere declarar el origen');
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100 || Math.abs(n*100-Math.round(n*100)) > 0.000001) throw new InputError('Valor inválido: humedad_suelo_pct');
    soilHumidity = n;
  }
  return {uuid:value.lectura_uuid,sequence:Number(value.secuencia_uno),timestamp:value.capturada_en.replace('T',' ').slice(0,-1),temperature:Number(value.temperatura_c),airHumidity:Number(value.humedad_aire_pct),soilHumidity,origin};
}
