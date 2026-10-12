import { useEffect, useState } from 'react';
import { api } from '../api';
import { puedeEditarCampo } from '../roles';
import { Termino } from '../components/Termino';

interface Gateway {id_gateway:number;id_parcela:number;codigo:string;activo:number;parcela:string;temperatura_min_c:string|null;temperatura_max_c:string|null;intervalo_max_s:number;segundos_desde_recepcion:number|null;segundos_desde_captura:number|null;}
interface Reading {lectura_uuid:string;capturada_en:string;recibida_en:string;temperatura_c:string;humedad_aire_pct:string;humedad_suelo_pct:string|null;origen:'sensor'|'simulado';gateway:string;}

function gatewayState(gateway:Gateway) {
  if(!gateway.activo)return 'Revocado';
  if(gateway.segundos_desde_recepcion==null)return 'Sin lecturas';
  if(gateway.segundos_desde_recepcion>gateway.intervalo_max_s)return 'Fuera de línea · sin recepción reciente';
  if(gateway.segundos_desde_captura==null||gateway.segundos_desde_captura>gateway.intervalo_max_s)return 'Lecturas retrasadas';
  return 'Lecturas recientes';
}

export default function Clima() {
  const [parcels,setParcels]=useState<any[]>([]);
  const [parcel,setParcel]=useState('');
  const [gateways,setGateways]=useState<Gateway[]>([]);
  const [readings,setReadings]=useState<Reading[]>([]);
  const [page,setPage]=useState(0);
  const [nextPage,setNextPage]=useState<number|null>(null);
  const [code,setCode]=useState('');
  const [credential,setCredential]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [alerts,setAlerts]=useState<any[]>([]);
  const [alertPage,setAlertPage]=useState(0);
  const [nextAlertPage,setNextAlertPage]=useState<number|null>(null);
  const [configuring,setConfiguring]=useState<Gateway|null>(null);
  const [thresholds,setThresholds]=useState({temperatura_min_c:'',temperatura_max_c:'',intervalo_max_s:'60'});
  const editable=puedeEditarCampo(JSON.parse(localStorage.getItem('usuario')||'{}').rol||'');

  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([api.get('/parcelas',{signal:controller.signal}),api.get('/iot/gateways',{signal:controller.signal})])
      .then(([p,g])=>{setParcels(p.data);setGateways(g.data);if(p.data.length)setParcel(String(p.data[0].id_parcela));})
      .catch(()=>{if(!controller.signal.aborted)setError('No se pudieron cargar parcelas y gateways.');});
    return()=>controller.abort();
  },[]);

  useEffect(()=>{
    if(!parcel)return;
    const controller=new AbortController();
    setLoading(true);
    api.get('/iot/clima',{params:{id_parcela:parcel,page},signal:controller.signal})
      .then(result=>{setReadings(result.data.rows);setNextPage(result.data.nextPage);setError('');})
      .catch(()=>{if(!controller.signal.aborted)setError('No se pudo actualizar el historial de clima.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[parcel,page,refresh]);

  useEffect(()=>{const timer=setInterval(()=>setRefresh(value=>value+1),30000);return()=>clearInterval(timer);},[]);

  useEffect(()=>{
    if(!parcel)return;
    const controller=new AbortController();
    Promise.all([api.get('/iot/gateways',{signal:controller.signal}),api.get('/iot/alertas',{params:{id_parcela:parcel,page:alertPage},signal:controller.signal})])
      .then(([g,a])=>{setGateways(g.data);setAlerts(a.data.rows);setNextAlertPage(a.data.nextPage);})
      .catch(()=>{if(!controller.signal.aborted)setError('No se pudieron actualizar el estado y las alertas de los sensores.');});
    return()=>controller.abort();
  },[parcel,alertPage,refresh]);

  const configure=async(event:React.FormEvent)=>{
    event.preventDefault();if(!configuring||busy)return;setBusy(true);setError('');
    try{await api.put(`/iot/gateways/${configuring.id_gateway}/umbrales`,thresholds);setConfiguring(null);setNotice('Umbrales actualizados para las próximas lecturas.');setRefresh(value=>value+1);}
    catch(err:any){setError(err.response?.data?.error||'No se pudieron guardar los umbrales');}
    finally{setBusy(false);}
  };

  const register=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');setCredential('');
    try{
      const result=await api.post('/iot/gateways',{id_parcela:parcel,codigo:code});
      setCredential(result.data.token);setCode('');setNotice('Gateway registrado. Guarda su credencial antes de ocultarla.');
      const list=await api.get('/iot/gateways');setGateways(list.data);
    }catch(err:any){setError(err.response?.data?.error||'No se pudo confirmar el registro. Consulta la lista antes de reintentar.');}
    finally{setBusy(false);}
  };
  const revoke=async(gateway:Gateway)=>{
    if(busy)return;setBusy(true);setError('');
    try{await api.post(`/iot/gateways/${gateway.id_gateway}/revocar`);const result=await api.get('/iot/gateways');setGateways(result.data);setNotice('Acceso del gateway revocado. Su historial permanece disponible.');setCredential('');}
    catch(err:any){setError(err.response?.data?.error||'No se pudo revocar el acceso');}
    finally{setBusy(false);}
  };

  return <div><header className="hero"><h1 className="display">Clima del viñedo</h1><p className="lead">Temperatura, humedad del aire y humedad del suelo de cada parcela.</p></header>
    <p>La humedad del suelo se registra cuando el equipo la envía. Las filas marcadas «Simulado» son datos de demostración, no mediciones reales. El control automático de las bombas de riego todavía no está incluido.</p>
    <div className="field-toolbar"><label htmlFor="climate-parcel">Parcela<select id="climate-parcel" disabled={busy} value={parcel} onChange={event=>{setParcel(event.target.value);setPage(0);setAlertPage(0);setReadings([]);setAlerts([]);setConfiguring(null);}}><option value="">Selecciona una parcela</option>{parcels.map(p=><option key={p.id_parcela} value={p.id_parcela}>{p.codigo} · {p.nombre}</option>)}</select></label></div>
    {error&&<div className="error" role="alert">{error}</div>}{notice&&<p className="field-notice" role="status">{notice}</p>}
    {credential&&<section className="card suave"><h2>Credencial del gateway</h2><p>Se muestra al registrar el gateway. Guárdala en la configuración privada del equipo que recibe las lecturas del sensor; no la compartas en capturas.</p><label htmlFor="gateway-credential">Credencial<textarea id="gateway-credential" className="gateway-credential" readOnly value={credential}/></label><button className="btn secundario" type="button" onClick={()=>setCredential('')}>Ocultar credencial</button></section>}
    <section className="card" aria-busy={loading}><h2>Historial de lecturas</h2><p>Las horas están en <Termino k="utc">UTC (hora universal)</Termino>. «Captura» es cuándo midió el sensor; «Recepción», cuándo la aplicación guardó el dato.</p><button className="btn secundario" type="button" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Actualizar</button>
      <div className="field-table"><table><thead><tr><th>Captura UTC</th><th>Recepción UTC</th><th><Termino k="gateway">Gateway</Termino></th><th>Temperatura (°C)</th><th><Termino k="humedad_aire">Humedad del aire (%)</Termino></th><th><Termino k="humedad_suelo">Humedad del suelo (%)</Termino></th><th><Termino k="origen">Origen</Termino></th></tr></thead><tbody>{readings.map(r=><tr key={`${r.gateway}:${r.lectura_uuid}`}><td>{r.capturada_en}</td><td>{r.recibida_en}</td><td>{r.gateway}</td><td>{r.temperatura_c}</td><td>{r.humedad_aire_pct}</td><td>{r.humedad_suelo_pct??'—'}</td><td><span className={'origen '+r.origen}>{r.origen==='simulado'?'Simulado':'Sensor'}</span></td></tr>)}{!readings.length&&<tr><td colSpan={7}>{loading?'Cargando…':'Todavía no hay lecturas recibidas de esta parcela.'}</td></tr>}</tbody></table></div>
      <div className="field-pagination"><button className="btn secundario" type="button" disabled={page===0||loading} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1}</span><button className="btn secundario" type="button" disabled={nextPage==null||loading} onClick={()=>setPage(nextPage!)}>Siguiente</button></div>
    </section>
    <section className="card"><h2>Gateways de la parcela</h2><p>Un <Termino k="gateway">gateway</Termino> es el equipo que recibe las lecturas de los sensores y las envía a la aplicación. Si se revoca su credencial (su contraseña propia), deja de aceptar lecturas nuevas. Sin <Termino k="umbral">límites críticos</Termino> configurados no se generan alertas de temperatura.</p><div className="field-table"><table><thead><tr><th>Código</th><th>Estado de lecturas</th><th>Límites (°C)</th>{editable&&<th>Acción</th>}</tr></thead><tbody>{gateways.filter(g=>String(g.id_parcela)===parcel).map(g=><tr key={g.id_gateway}><td>{g.codigo}</td><td>{gatewayState(g)}</td><td>{g.temperatura_min_c==null||g.temperatura_max_c==null?'Sin configurar':`${g.temperatura_min_c} a ${g.temperatura_max_c}`}</td>{editable&&<td><button className="btn secundario" type="button" disabled={busy||!g.activo} onClick={()=>{setConfiguring(g);setThresholds({temperatura_min_c:g.temperatura_min_c??'',temperatura_max_c:g.temperatura_max_c??'',intervalo_max_s:String(g.intervalo_max_s)});}}>Configurar límites</button><button className="btn secundario" type="button" disabled={busy||!g.activo} onClick={()=>revoke(g)}>Revocar acceso</button></td>}</tr>)}</tbody></table></div></section>
    {configuring&&<section className="card suave"><h2>Límites de {configuring.codigo}</h2><p>Define los límites críticos con el agrónomo. La alerta aparece por debajo de la mínima o por encima de la máxima.</p><form onSubmit={configure}><div className="field-form">
      <label htmlFor="critical-min">Mínima crítica (°C)<input id="critical-min" required type="number" min={-40} max={80} step="0.01" value={thresholds.temperatura_min_c} onChange={e=>setThresholds({...thresholds,temperatura_min_c:e.target.value})}/></label>
      <label htmlFor="critical-max">Máxima crítica (°C)<input id="critical-max" required type="number" min={-40} max={80} step="0.01" value={thresholds.temperatura_max_c} onChange={e=>setThresholds({...thresholds,temperatura_max_c:e.target.value})}/></label>
      <label htmlFor="critical-gap">Tiempo máximo sin lecturas (segundos)<input id="critical-gap" required type="number" min={30} max={3600} step="1" value={thresholds.intervalo_max_s} onChange={e=>setThresholds({...thresholds,intervalo_max_s:e.target.value})}/></label>
    </div><button className="btn primario" type="submit" disabled={busy}>Guardar límites</button><button className="btn secundario" type="button" disabled={busy} onClick={()=>setConfiguring(null)}>Cancelar</button></form></section>}
    <section className="card"><h2>Alertas de temperatura</h2><p>Historial de umbrales superados, con el límite vigente al recibir cada lectura. No describe automáticamente el estado actual de la parcela.</p><div className="field-table"><table><thead><tr><th>Captura UTC</th><th>Gateway</th><th>Alerta</th><th>Temperatura</th><th>Límite aplicado</th></tr></thead><tbody>{alerts.map(a=><tr key={`${a.gateway}:${a.lectura_uuid}:${a.tipo}`}><td>{a.capturada_en}</td><td>{a.gateway}</td><td>{a.tipo==='helada'?'Bajo umbral crítico':'Sobre umbral crítico'}</td><td>{a.temperatura_c} °C</td><td>{a.limite_c} °C</td></tr>)}{!alerts.length&&<tr><td colSpan={5}>No hay alertas registradas en esta página.</td></tr>}</tbody></table></div><div className="field-pagination"><button className="btn secundario" type="button" disabled={alertPage===0} onClick={()=>setAlertPage(alertPage-1)}>Anterior</button><span>Página {alertPage+1}</span><button className="btn secundario" type="button" disabled={nextAlertPage==null} onClick={()=>setAlertPage(nextAlertPage!)}>Siguiente</button></div></section>
    {editable&&parcel&&<section className="card suave"><h2>Registrar gateway</h2><form className="account-form" onSubmit={register}><label htmlFor="gateway-code">Código de la PC o estación<input id="gateway-code" required minLength={3} maxLength={30} pattern={'[a-z0-9_\\-]+'} value={code} onChange={e=>setCode(e.target.value)}/><span>Minúsculas, números, guion o guion bajo.</span></label><button className="btn primario" type="submit" disabled={busy}>{busy?'Registrando…':'Registrar gateway'}</button></form></section>}
  </div>;
}
