import { useEffect, useState } from 'react';
import { api } from '../api';
import { puedeEditarCampo } from '../roles';

interface Field { key: string; label: string; type?: string; required?: boolean; options?: string[]; min?: number; max?: number; step?: string; }
interface Section { label: string; requirement: string; fields: Field[]; columns: string[]; }
const date: Field = { key:'fecha', label:'Fecha', type:'date', required:true };
const cycle: Field = { key:'id_siembra', label:'Siembra', type:'cycle', required:true };
const sections: Record<string, Section> = {
  variedades: { label:'Variedades de uva', requirement:'REQ_C_06', columns:['nombre','caracteristicas','azucar_objetivo'], fields:[
    {key:'nombre',label:'Nombre de la variedad',required:true},{key:'caracteristicas',label:'Características'},
    {key:'azucar_objetivo',label:'Azúcar objetivo (°Brix)',type:'number',required:true,min:0.1,max:99.9,step:'0.1'}] },
  tierra: { label:'Análisis de suelo', requirement:'REQ_C_02', columns:['fecha','ph','humedad','nitrogeno','fosforo','potasio','observacion'], fields:[date,
    {key:'ph',label:'pH',type:'number',required:true,min:0,max:14,step:'0.01'},
    {key:'humedad',label:'Humedad (%)',type:'number',required:true,min:0,max:100,step:'0.01'},
    ...['nitrogeno','fosforo','potasio'].map(key=>({key,label:key==='nitrogeno'?'Nitrógeno':key==='fosforo'?'Fósforo':'Potasio',type:'number',min:0,step:'0.01'})),
    {key:'observacion',label:'Observación'}] },
  dimensiones: { label:'Dimensiones', requirement:'REQ_C_04', columns:['fecha','superficie_ha','hileras','cant_plantas','densidad'], fields:[date,
    {key:'superficie_ha',label:'Superficie (ha)',type:'number',required:true,min:0.01,step:'0.01'},
    {key:'hileras',label:'Hileras',type:'number',required:true,min:1,step:'1'},
    {key:'cant_plantas',label:'Plantas',type:'number',required:true,min:1,step:'1'}] },
  controles: { label:'Seguimiento de siembra', requirement:'REQ_C_07', columns:['fecha','id_siembra','etapa','riego','fertilizacion','observacion'], fields:[cycle,date,
    {key:'etapa',label:'Etapa observada',required:true,options:['Brotación','Floración','Envero','Maduración']},
    {key:'riego',label:'Riego realizado'},{key:'fertilizacion',label:'Fertilización'},{key:'observacion',label:'Observación'}] },
  enfermedades: { label:'Catálogo de enfermedades', requirement:'REQ_C_08', columns:['nombre','sintomas','tratamiento'], fields:[
    {key:'nombre',label:'Enfermedad',required:true},{key:'sintomas',label:'Síntomas',required:true},{key:'tratamiento',label:'Tratamiento recomendado',required:true}] },
  incidencias: { label:'Incidencias sanitarias', requirement:'REQ_C_09', columns:['fecha_deteccion','id_siembra','enfermedad','severidad','tratamiento'], fields:[cycle,
    {key:'id_enfermedad',label:'Enfermedad',type:'disease',required:true},
    {...date,key:'fecha_deteccion',label:'Fecha de detección'},
    {key:'severidad',label:'Severidad',required:true,options:['bajo','medio','alto']},{key:'tratamiento',label:'Tratamiento aplicado',required:true}] },
  sanidad: { label:'Estado sanitario', requirement:'REQ_C_10', columns:['fecha','id_siembra','calificacion','pct_afectado'], fields:[cycle,date,
    {key:'calificacion',label:'Calificación',required:true,options:['Bueno','Regular','Malo']},
    {key:'pct_afectado',label:'Superficie afectada (%)',type:'number',required:true,min:0,max:100,step:'0.01'}] },
  puntos: { label:'Puntos de control', requirement:'REQ_C_18', columns:['nombre','fecha_prog','vencido'], fields:[
    {key:'nombre',label:'Control previsto',required:true},{...date,key:'fecha_prog',label:'Fecha programada'}] },
  'mediciones-puntos': { label:'Resultados de controles', requirement:'REQ_C_18', columns:['fecha','punto','valor','id_usuario'], fields:[
    {key:'id_punto_control',label:'Punto de control',type:'point',required:true},date,{key:'valor',label:'Resultado de la medición',required:true}] },
};
const labels: Record<string,string> = { fecha:'Fecha', fecha_deteccion:'Detección', fecha_prog:'Programado', ph:'pH', humedad:'Humedad (%)', nitrogeno:'N', fosforo:'P', potasio:'K', observacion:'Observación', superficie_ha:'Superficie (ha)', hileras:'Hileras', cant_plantas:'Plantas', densidad:'Plantas / ha', id_siembra:'Siembra', etapa:'Etapa', riego:'Riego', fertilizacion:'Fertilización', nombre:'Nombre', sintomas:'Síntomas', tratamiento:'Tratamiento', enfermedad:'Enfermedad', severidad:'Severidad', calificacion:'Calificación', pct_afectado:'Afectado (%)', vencido:'Pendiente vencido', punto:'Control', valor:'Resultado', id_usuario:'Registrado por' };
const today = () => new Date().toLocaleDateString('en-CA');
const initialForm = (section: Section) => Object.fromEntries(section.fields.map(field=>[field.key,field.type==='date'?today():'']));

export default function Campo() {
  const [parcels,setParcels] = useState<any[]>([]);
  const [cycles,setCycles] = useState<any[]>([]);
  const [diseases,setDiseases] = useState<any[]>([]);
  const [points,setPoints] = useState<any[]>([]);
  const [parcel,setParcel] = useState('');
  const [resource,setResource] = useState('tierra');
  const [rows,setRows] = useState<any[]>([]);
  const [page,setPage] = useState(0);
  const [nextPage,setNextPage] = useState<number|null>(null);
  const [form,setForm] = useState<Record<string,string>>(initialForm(sections.tierra));
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const editable = puedeEditarCampo(JSON.parse(localStorage.getItem('usuario')||'{}').rol || '');
  const section = sections[resource];

  useEffect(()=>{
    let active = true;
    Promise.all([api.get('/parcelas'),api.get('/siembras'),api.get('/campo/enfermedades')]).then(([p,s,d])=>{
      if (!active) return;
      setParcels(p.data); setCycles(s.data); setDiseases(d.data.rows);
      if(p.data.length) setParcel(String(p.data[0].id_parcela));
    }).catch(()=>{ if(active) setError('No se pudieron cargar las parcelas y sus controles. Intenta nuevamente.'); });
    return ()=>{ active=false; };
  },[]);

  useEffect(()=>{
    if(!parcel && !['enfermedades','variedades'].includes(resource)) { setRows([]); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    api.get(`/campo/${resource}`,{params:{id_parcela:parcel,page},signal:controller.signal})
      .then(result=>{setRows(result.data.rows);setNextPage(result.data.nextPage);})
      .catch(err=>{if(!controller.signal.aborted)setError(err.response?.data?.error||'No se pudo cargar el historial.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    if(parcel) api.get('/campo/puntos',{params:{id_parcela:parcel},signal:controller.signal})
      .then(result=>setPoints(result.data.rows)).catch(()=>{});
    return ()=>controller.abort();
  },[parcel,resource,page]);

  const selectResource = (value: string) => {setResource(value);setRows([]);setForm(initialForm(sections[value]));setPage(0);setNotice('');};
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if(saving) return;
    setSaving(true);setError('');setNotice('');
    try {
      const body:Record<string,string>={...form};
      if(!['enfermedades','variedades','controles','incidencias','sanidad','mediciones-puntos'].includes(resource))body.id_parcela=parcel;
      await api.post(`/campo/${resource}`,body);
      setForm(initialForm(section));setNotice('Registro guardado en el historial.');setPage(0);
      const result=await api.get(`/campo/${resource}`,{params:{id_parcela:parcel,page:0}});
      setRows(result.data.rows);setNextPage(result.data.nextPage);
      if(resource==='enfermedades')setDiseases(result.data.rows);
      if(resource==='puntos')setPoints(result.data.rows);
    } catch(err:any){setError(err.response?.data?.error||'No se pudo confirmar la operación. Consulta el historial antes de reintentar.');}
    finally{setSaving(false);}
  };

  return <div className="field-workspace">
    <header className="hero"><h1 className="display">Cuaderno de Campo</h1><p className="lead">El historial de cada parcela: suelo, cultivo, sanidad y controles.</p></header>
    <div className="field-toolbar"><label htmlFor="field-parcel">Parcela<select id="field-parcel" disabled={saving} value={parcel} onChange={e=>{setParcel(e.target.value);setPage(0);setForm(initialForm(section));setNotice('');}}>
      <option value="">Selecciona una parcela</option>{parcels.map(p=><option key={p.id_parcela} value={p.id_parcela}>{p.codigo} · {p.nombre}</option>)}</select></label></div>
    <nav className="field-sections" aria-label="Registros de Campo">{Object.entries(sections).map(([key,item])=><button type="button" key={key} aria-pressed={key===resource} disabled={saving} onClick={()=>selectResource(key)}>{item.label}</button>)}</nav>
    {error&&<div className="error" role="alert">{error}</div>}{notice&&<p className="field-notice" role="status">{notice}</p>}
    <section className="card" aria-busy={loading}><h2>{section.label}</h2><p>Se conservan las entradas anteriores. Los nuevos controles no reemplazan el historial.</p>
      {loading?<p role="status">Cargando historial…</p>:<div className="field-table"><table><thead><tr>{section.columns.map(key=><th key={key}>{labels[key]||key}</th>)}</tr></thead><tbody>
        {rows.map((row,index)=><tr key={index}>{section.columns.map(key=><td key={key}>{key==='vencido'?(row[key]?'Sí':'No'):row[key]??'—'}</td>)}</tr>)}
        {!rows.length&&<tr><td colSpan={section.columns.length}>Todavía no hay registros. {editable?'Agrega el primero con el formulario.':'El agrónomo puede registrar este control.'}</td></tr>}
      </tbody></table></div>}
      <div className="field-pagination"><button type="button" className="btn secundario" disabled={page===0||loading} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1}</span><button type="button" className="btn secundario" disabled={nextPage==null||loading} onClick={()=>setPage(nextPage!)}>Siguiente</button></div>
    </section>
    {editable&&(parcel||['enfermedades','variedades'].includes(resource))?<section className="card suave"><h2>Agregar registro</h2><form onSubmit={save}>
      <div className="field-form">{section.fields.map(field=>{
        const options=field.type==='cycle'?cycles.filter(s=>String(s.id_parcela)===parcel&&s.estado==='activa').map(s=>({value:String(s.id_siembra),label:`Siembra ${s.id_siembra} · ${s.variedad} · ${s.fecha_siembra}`})):
          field.type==='disease'?diseases.map(d=>({value:String(d.id_enfermedad),label:d.nombre})):
          field.type==='point'?points.map(p=>({value:String(p.id_punto_control),label:`${p.nombre} · ${p.fecha_prog}`})):
          field.options?.map(value=>({value,label:value}));
        const id=`field-${field.key}`;
        return <label htmlFor={id} key={field.key}>{field.label}{field.required?' *':''}
          {options?<select id={id} required={field.required} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}><option value="">Selecciona una opción</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
            <input id={id} type={field.type||'text'} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={255} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}/>}
        </label>;
      })}</div><button className="btn primario" type="submit" disabled={saving}>{saving?'Guardando…':'Guardar registro'}</button>
    </form></section>:!editable&&<p className="modo-consulta">Modo consulta · solo lectura</p>}
  </div>;
}
