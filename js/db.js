import { SUPA_URL, SUPA_KEY } from './config.js';
import { data } from './state.js';
import { g, toast } from './ui.js';
import * as state from './state.js';
import { offlineLoadAll, offlineSaveSnapshot } from './offline.js';
import { renderDetalle } from './detalle.js';
import {
  renderDash, renderAlertas, renderSiniestros, renderPolizas,
  renderAseguradoras, renderAsegurados, renderContactos,
  renderTC, renderAjustadores,
} from './render.js';

export const db = supabase.createClient(SUPA_URL, SUPA_KEY);

export async function loadAll(){
  if(!navigator.onLine){
    await offlineLoadAll();
    return;
  }
  try {
    const [sin,pol,aseg,asdo,cont,res,pag,hon,viat,act,doc,tc,bit,inf,sublim,coas,ajust,ofic,sinajust,todos,graf] = await Promise.all([
      db.from('siniestros').select('*').order('id',{ascending:false}),
      db.from('polizas').select('*').order('id',{ascending:false}),
      db.from('aseguradoras').select('*').order('nombre'),
      db.from('asegurados').select('*').order('nombre'),
      db.from('contactos').select('*').order('nombre'),
      db.from('reservas').select('*').order('fecha',{ascending:false}),
      db.from('pagos').select('*').order('fecha',{ascending:false}),
      db.from('honorarios').select('*').order('id',{ascending:false}),
      db.from('viaticos').select('*').order('fecha',{ascending:false}),
      db.from('actividades').select('*').order('fecha',{ascending:false}),
      db.from('documentos').select('*').order('fecha',{ascending:false}),
      db.from('tipos_cambio').select('*').order('fecha',{ascending:false}),
      db.from('bitacora_ajustador').select('*').order('fecha',{ascending:false}),
      db.from('informes').select('*').order('fecha_envio',{ascending:false}),
      db.from('sublimites').select('*').order('id'),
      db.from('coaseguradoras').select('*').order('porcentaje',{ascending:false}),
      db.from('ajustadores').select('*,id_oficina(nombre,ciudad)').order('nombre'),
      db.from('oficinas').select('*').order('nombre'),
      db.from('siniestro_ajustadores').select('*').order('id'),
      db.from('todos').select('*').order('fecha_limite',{ascending:true}),
      db.from('graficos_expediente').select('*').order('created_at'),
    ]);
    data.sin     = sin.data||[];    data.pol      = pol.data||[];
    data.aseg    = aseg.data||[];   data.asdo     = asdo.data||[];
    data.cont    = cont.data||[];   data.res      = res.data||[];
    data.pag     = pag.data||[];    data.hon      = hon.data||[];
    data.viat    = viat.data||[];   data.act      = act.data||[];
    data.doc     = doc.data||[];    data.tc       = tc.data||[];
    data.bit     = bit.data||[];    data.inf      = inf.data||[];
    data.sublim  = sublim.data||[]; data.coas     = coas.data||[];
    data.ajust   = ajust.data||[];  data.ofic     = ofic.data||[];
    data.sinajust= sinajust.data||[];
    data.todos   = todos.data||[];
    data.graf    = graf.data||[];
    const [solRes, solItemsRes, solSegRes, solCatRes] = await Promise.all([
      db.from('solicitudes_info').select('*').order('created_at',{ascending:false}),
      db.from('solicitud_items').select('*').order('orden'),
      db.from('solicitud_seguimiento').select('*').order('fecha'),
      db.from('catalogo_documentos').select('*').order('orden'),
    ]);
    data.solicitudes  = solRes.data||[];
    data.sol_items    = solItemsRes.data||[];
    data.sol_seg      = solSegRes.data||[];
    data.sol_catalogo = solCatRes.data||[];
    renderAll();
    setTimeout(offlineSaveSnapshot, 1500);
  } catch(e){
    console.warn('loadAll error, falling back to IDB:', e);
    await offlineLoadAll();
  }
}

export function renderAll(){
  renderDash(); renderAlertas(); renderSiniestros(); renderPolizas();
  renderAseguradoras(); renderAsegurados(); renderContactos();
  renderTC(); renderAjustadores(); poblarSelectores();
}

export function poblarSelectores(){
  const aOpts  = data.aseg.map(a=>`<option value="${a.id}" data-cod="${a.codigo_sistema||''}">${a.nombre}</option>`).join('');
  const dOpts  = data.asdo.map(a=>`<option value="${a.id}">${a.nombre}</option>`).join('');
  const pOpts  = data.pol.map(p=>`<option value="${p.id}">${p.numero}</option>`).join('');
  const ajOpts = data.ajust.map(a=>`<option value="${a.id}">${a.nombre}${a.iniciales?' ('+a.iniciales+')':''}</option>`).join('');
  const ofOpts = data.ofic.map(o=>`<option value="${o.id}">${o.nombre} — ${o.ciudad||''}</option>`).join('');
  g('p-aseg').innerHTML = aOpts;
  g('p-asdo').innerHTML = dOpts;
  g('co-aseg').innerHTML = '<option value="">—</option>' + aOpts;
  g('co-asdo').innerHTML = '<option value="">—</option>' + dOpts;
  g('s-poliza').innerHTML = '<option value="">— Sin póliza aún —</option>' + pOpts;
  g('s-aseg-direct').innerHTML = '<option value="">— Selecciona la compañía —</option>' + aOpts;
  g('r-caso').innerHTML = '<option value="">— Selecciona —</option>' + data.sin.map(s=>{
    const pol  = data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo = data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    const label = s.numero_exp + (asdo.nombre ? ' — '+asdo.nombre : '');
    return `<option value="${s.id}">${label}</option>`;
  }).join('');
  if(g('aj-oficina')) g('aj-oficina').innerHTML = '<option value="">— Sin asignar —</option>' + ofOpts;
  if(g('sa-ajust'))   g('sa-ajust').innerHTML   = '<option value="">— Selecciona —</option>' + ajOpts;
}

export async function eliminar(tabla, id){
  if(!confirm('¿Eliminar este registro?')) return;
  await db.from(tabla).delete().eq('id', id);
  toast('Registro eliminado.');
  await loadAll();
  if(state.currentSin) renderDetalle();
}
