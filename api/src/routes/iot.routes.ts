import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { asyncHandler, boundedLimiter } from '../http.js';
import { verificarToken, permitirRoles, type AuthRequest } from '../auth.js';
import { audit } from '../audit.js';
import { InputError, parseFields } from '../fieldRules.js';
import { climateInput, temperatureAlert } from '../climateRules.js';

const router=Router();

// Opaque gateway credentials have only this write capability, never a user role.
router.post('/lecturas',boundedLimiter(120,60000),asyncHandler(async(req,res)=>{
  const authorization=req.headers.authorization || '';
  if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)){res.status(401).json({error:'Credencial de dispositivo inválida'});return;}
  const tokenHash=createHash('sha256').update(authorization.slice(7)).digest('hex');
  let input:ReturnType<typeof climateInput>;
  try{input=climateInput(req.body);}catch(error){if(error instanceof InputError){res.status(400).json({error:error.message});return;}throw error;}
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [gateway]:any=await conn.query('SELECT g.id_gateway,g.temperatura_min_c,g.temperatura_max_c,p.estado AS estado_parcela FROM iot_gateway g JOIN parcela p ON p.id_parcela=g.id_parcela WHERE g.token_hash=? AND g.activo=1 FOR UPDATE',[tokenHash]);
    if(!gateway.length){await conn.rollback();res.status(401).json({error:'Credencial de dispositivo inválida'});return;}
    const id=gateway[0].id_gateway;
    if(gateway[0].estado_parcela!=='activa'){await conn.rollback();res.status(409).json({error:'La parcela no está activa'});return;}
    const [existing]:any=await conn.query('SELECT secuencia_uno,(capturada_en=?) AS misma_fecha,temperatura_c,humedad_aire_pct,humedad_suelo_pct,origen FROM iot_clima WHERE id_gateway=? AND lectura_uuid=?',[input.timestamp,id,input.uuid]);
    if(existing.length){
      const old=existing[0];
      const same=Number(old.secuencia_uno)===input.sequence && Number(old.misma_fecha)===1 && Number(old.temperatura_c)===input.temperature && Number(old.humedad_aire_pct)===input.airHumidity && (old.humedad_suelo_pct==null?input.soilHumidity==null:input.soilHumidity!=null && Number(old.humedad_suelo_pct)===input.soilHumidity) && old.origen===input.origin;
      await conn.rollback();
      res.status(same?200:409).json(same?{ok:true,lectura_uuid:input.uuid}:{error:'La identidad de lectura ya tiene otro contenido'});return;
    }
    await conn.query('INSERT INTO iot_clima (id_gateway,lectura_uuid,secuencia_uno,capturada_en,recibida_en,temperatura_c,humedad_aire_pct,humedad_suelo_pct,origen) VALUES (?,?,?,?,UTC_TIMESTAMP(3),?,?,?,?)',[id,input.uuid,input.sequence,input.timestamp,input.temperature,input.airHumidity,input.soilHumidity,input.origin]);
    const min=gateway[0].temperatura_min_c,max=gateway[0].temperatura_max_c;
    const kind=temperatureAlert(input.temperature,min==null?null:Number(min),max==null?null:Number(max));
    if(kind) await conn.query('INSERT INTO iot_alerta (id_gateway,lectura_uuid,tipo,limite_c) VALUES (?,?,?,?)',[id,input.uuid,kind,kind==='helada'?min:max]);
    await conn.query('INSERT INTO bitacora (id_usuario,modulo,accion,detalle) VALUES (NULL,?,?,?)',['IoT','registrar:clima',`gateway=${id} lectura=${input.uuid}`]);
    await conn.commit();res.status(201).json({ok:true,lectura_uuid:input.uuid});
  } catch(error){await conn.rollback();throw error;}finally{conn.release();}
}));

router.use(verificarToken,permitirRoles('Administrador','Gerente','Agronomo'));
const write=permitirRoles('Administrador','Agronomo');

router.get('/gateways',asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query(`SELECT g.id_gateway,g.id_parcela,g.codigo,g.activo,g.temperatura_min_c,g.temperatura_max_c,g.intervalo_max_s,p.codigo AS parcela,
    TIMESTAMPDIFF(SECOND,MAX(c.recibida_en),UTC_TIMESTAMP(3)) AS segundos_desde_recepcion,
    TIMESTAMPDIFF(SECOND,MAX(c.capturada_en),UTC_TIMESTAMP(3)) AS segundos_desde_captura
    FROM iot_gateway g JOIN parcela p ON p.id_parcela=g.id_parcela LEFT JOIN iot_clima c ON c.id_gateway=g.id_gateway
    GROUP BY g.id_gateway,g.id_parcela,g.codigo,g.activo,g.temperatura_min_c,g.temperatura_max_c,g.intervalo_max_s,p.codigo ORDER BY g.id_gateway`);
  res.json(rows);
}));

router.put('/gateways/:id/umbrales',write,asyncHandler(async(req:AuthRequest,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:'Gateway inválido'});return;}
  let data:Record<string,string|number|null>;
  try{data=parseFields({temperatura_min_c:{kind:'number',required:true,min:-40,max:80},temperatura_max_c:{kind:'number',required:true,min:-40,max:80},intervalo_max_s:{kind:'number',required:true,min:30,max:3600,integer:true}},req.body);}catch(error){if(error instanceof InputError){res.status(400).json({error:error.message});return;}throw error;}
  if(Number(data.temperatura_min_c)>=Number(data.temperatura_max_c)){res.status(400).json({error:'La temperatura mínima debe ser menor que la máxima'});return;}
  if(['temperatura_min_c','temperatura_max_c'].some(key=>Math.abs(Number(data[key])*100-Math.round(Number(data[key])*100))>0.000001)){res.status(400).json({error:'Los umbrales admiten hasta dos decimales'});return;}
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]:any=await conn.query('SELECT activo FROM iot_gateway WHERE id_gateway=? FOR UPDATE',[id]);
    if(!rows.length||!rows[0].activo){await conn.rollback();res.status(409).json({error:'Se requiere un gateway activo'});return;}
    await conn.query('UPDATE iot_gateway SET temperatura_min_c=?,temperatura_max_c=?,intervalo_max_s=? WHERE id_gateway=?',[data.temperatura_min_c,data.temperatura_max_c,data.intervalo_max_s,id]);
    await audit(conn,req,'IoT','configurar:umbrales',id);await conn.commit();res.json({ok:true});
  }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}));

router.get('/alertas',asyncHandler(async(req,res)=>{
  const parcel=Number(req.query.id_parcela),page=Number(req.query.page||0);
  if(!Number.isSafeInteger(parcel)||parcel<1||!Number.isSafeInteger(page)||page<0||page>10000){res.status(400).json({error:'Parcela o página inválidas'});return;}
  const [rows]:any=await pool.query(`SELECT a.lectura_uuid,a.tipo,a.limite_c,c.temperatura_c,c.capturada_en,g.codigo AS gateway
    FROM iot_alerta a JOIN iot_clima c ON c.id_gateway=a.id_gateway AND c.lectura_uuid=a.lectura_uuid
    JOIN iot_gateway g ON g.id_gateway=a.id_gateway WHERE g.id_parcela=? ORDER BY a.id_alerta DESC LIMIT 101 OFFSET ?`,[parcel,page*100]);
  res.json({rows:rows.slice(0,100),nextPage:rows.length>100?page+1:null});
}));

router.post('/gateways',write,asyncHandler(async(req:AuthRequest,res)=>{
  let data:Record<string,string|number|null>;
  try{data=parseFields({id_parcela:{kind:'id',required:true},codigo:{kind:'text',required:true,max:30}},req.body);}catch(error){if(error instanceof InputError){res.status(400).json({error:error.message});return;}throw error;}
  if(!/^[a-z0-9_-]{3,30}$/.test(String(data.codigo))){res.status(400).json({error:'Código de gateway inválido'});return;}
  const token=randomBytes(32).toString('base64url');
  const hash=createHash('sha256').update(token).digest('hex');
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [result]:any=await conn.query('INSERT INTO iot_gateway (id_parcela,codigo,token_hash) VALUES (?,?,?)',[data.id_parcela,data.codigo,hash]);
    await audit(conn,req,'IoT','crear:gateway',result.insertId);
    await conn.commit();res.status(201).json({id_gateway:result.insertId,token});
  }catch(error:any){await conn.rollback();if(error.code==='ER_DUP_ENTRY'){res.status(409).json({error:'Ese código ya existe'});return;}if(error.code==='ER_NO_REFERENCED_ROW_2'){res.status(400).json({error:'La parcela no existe'});return;}throw error;}finally{conn.release();}
}));

router.post('/gateways/:id/revocar',write,asyncHandler(async(req:AuthRequest,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:'Gateway inválido'});return;}
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]:any=await conn.query('SELECT activo FROM iot_gateway WHERE id_gateway=? FOR UPDATE',[id]);
    if(!rows.length){await conn.rollback();res.status(404).json({error:'Gateway no encontrado'});return;}
    if(rows[0].activo){await conn.query('UPDATE iot_gateway SET activo=0 WHERE id_gateway=?',[id]);await audit(conn,req,'IoT','revocar:gateway',id);}
    await conn.commit();res.json({ok:true});
  }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}));

router.get('/clima',asyncHandler(async(req,res)=>{
  const parcel=Number(req.query.id_parcela),page=Number(req.query.page||0);
  if(!Number.isSafeInteger(parcel)||parcel<1||!Number.isSafeInteger(page)||page<0||page>10000){res.status(400).json({error:'Parcela o página inválidas'});return;}
  const [rows]:any=await pool.query('SELECT c.lectura_uuid,c.capturada_en,c.recibida_en,c.temperatura_c,c.humedad_aire_pct,c.humedad_suelo_pct,c.origen,g.codigo AS gateway FROM iot_clima c JOIN iot_gateway g ON g.id_gateway=c.id_gateway WHERE g.id_parcela=? ORDER BY c.id_lectura DESC LIMIT 101 OFFSET ?',[parcel,page*100]);
  res.json({rows:rows.slice(0,100),nextPage:rows.length>100?page+1:null});
}));

export default router;
