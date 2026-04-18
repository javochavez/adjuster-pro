// ============================================================
// modal-sin.js — Modal de captura y edición de expedientes
// AdjusterPro JChA · Almaraz Ajustadores (AASA)
// Depende de: config.js, state.js, ui.js, db.js, rte.js,
//             offline.js, expediente.js
// ============================================================

import { g, v, toast } from './ui.js';
import { db } from './db.js';
import { data, currentSin } from './state.js';
import * as state from './state.js';
import { loadRteSin, loadBienesRte } from './rte.js';
import { offlineSaveSiniestro } from './offline.js';
import { renderDetalle, renderSiniestros } from './expediente.js';
import { loadAll } from './db.js';
import { buildCoberturaTableHTML } from './expediente.js';

const INTRO_DEFAULT = `El presente informe preliminar se elabora en seguimiento de la designación de [Compañía], por parte de su apreciable [Funcionario], relativa a la atención de la pérdida sufrida por el Asegurado por [Describir el tipo de daños y bienes afectados], hechos ocurridos el [Fecha del Siniestro] en su domicilio sito en [Dirección donde ocurrieron los daños].

Siguiendo las instrucciones de asignación, de inmediato procedimos a contactar a [Persona de Contacto], quien nos [Detallar acuerdo para la inspección, fecha, hora, etc.].

Como acordado, el [Fecha de inspección] a las [Hora], nos presentamos en [Sitio de la inspección], lugar en el que fuimos atendidos por [Persona que atendió] quien nos mostró los daños sufridos.

Con base en lo anterior y la información inicialmente recabada, presentamos a ustedes el presente Informe Preliminar.`;

const RECLAMACION_DEFAULT = `Por el momento el Asegurado no ha presentado su formal reclamación a la compañía de Seguros, sin embargo, estamos en proceso de recepción de documentos, mismos que están siendo analizados.`;

export function resetBuscadorSinModal() {
  ['sin-asdo-q','sin-pol-q'].forEach(f => { if(g(f)) g(f).value = ''; });
  ['sin-asdo-results','sin-pol-results'].forEach(f => { if(g(f)) g(f).innerHTML = ''; });
  ['sin-asdo-sel-id','sin-pol-sel-id'].forEach(f => { if(g(f)) g(f).value = ''; });
  if(g('sin-asdo-sel-display')) g('sin-asdo-sel-display').style.display = 'none';
  if(g('sin-pol-sel-display'))  g('sin-pol-sel-display').style.display  = 'none';
  if(g('sin-asdo-form'))        g('sin-asdo-form').style.display        = 'none';
  if(g('sin-pol-form'))         g('sin-pol-form').style.display         = 'none';
  if(g('sin-pol-step'))         g('sin-pol-step').style.display         = 'none';
}

export function resetModalSin() {
  const today = new Date().toISOString().slice(0, 10);
  resetBuscadorSinModal();
  [
    's-exp','s-numsin','s-subramo','s-causa','s-riesgo',
    's-clave-ajust','s-dest-nombre','s-dest-cargo','s-giro','s-notas',
    's-tramite-gnp','s-ot','s-fsin','s-hora-ocurr','s-finsp','s-finf',
    's-hora-asig','s-f1cont','s-h1cont','s-f1vis','s-h1vis',
    's-insp-persona','s-insp-cargo','s-insp-tel','s-insp-dom',
    's-autoridades-det','s-salv-valor','s-rec-terceros','s-rec-det',
    's-coas-det','s-reas-corredor','s-lugar-sin',
    's-gnp-jefe','s-gnp-oficina','s-gnp-clave-ajust',
    's-atlas-poliza','s-atlas-sin-gnp','s-atlas-pol-gnp',
    's-situacion-actual','s-fundamento','s-subrogacion','s-asesores',
    's-gnp-salv-persona','s-gnp-salv-tel','s-gnp-salv-email',
    's-gnp-salv-movil','s-gnp-salv-comprador',
    's-gnp-rec-recuperador','s-gnp-rec-carta-porte','s-gnp-rec-prescripcion',
    's-gnp-trans-tipo','s-gnp-trans-frontera','s-gnp-trans-placa',
    's-gnp-trans-destino','s-gnp-trans-compania',
    's-gnp-docs-faltantes','s-clave-evento',
    's-tramite-gnp-vis','s-numsin-gnp','s-gnp-clave-ajust-vis',
    's-gnp-jefe-vis','s-gnp-oficina-vis','s-giro-vis','s-clave-evento-vis',
    's-hora-ocurr-vis','s-hora-asig-vis','s-f1cont-vis','s-h1cont-vis',
    's-h1vis-vis','s-reas-corredor-vis','s-rec-terceros-vis',
  ].forEach(f => { if(g(f)) g(f).value = ''; });

  if(g('s-id'))           g('s-id').value           = '';
  if(g('s-fasig'))        g('s-fasig').value         = today;
  if(g('s-est'))          g('s-est').value           = 'asignado';
  if(g('s-procedencia'))  g('s-procedencia').value   = 'procedente';
  if(g('s-autoridades'))  g('s-autoridades').value   = '0';
  if(g('s-salvamento'))   g('s-salvamento').value    = 'por_determinar';
  if(g('s-recuperacion')) g('s-recuperacion').value  = '0';
  if(g('s-coaseguro'))    g('s-coaseguro').value     = '0';
  if(g('s-reaseguro'))    g('s-reaseguro').value     = '0';
  ['s-coaseguro-vis','s-reaseguro-vis','s-recuperacion-vis','s-autoridades-vis']
    .forEach(f => { if(g(f)) g(f).value = '0'; });

  const insp = g('s-inspeccion-narrativa') || g('s-inspeccion-narrativa-rte');
  if(insp) delete insp.dataset.editado;

  ['desc-riesgo','riesgos-cubiertos','localizacion','narracion',
   'naturaleza-alcance','desc','estrategias','observaciones',
   'actividades','considerandos','salv-det','bienes-amparados'].forEach(k => loadRteSin(k, ''));
  loadBienesRte('');
  loadRteSin('reclamacion',          RECLAMACION_DEFAULT);
  loadRteSin('introduccion',         INTRO_DEFAULT);
  loadRteSin('inspeccion-narrativa', '');
  loadSinLimTexto('');
  loadSinGiroAseg('');
  loadSinDescAseg('');

  if(g('seccion-gnp'))   g('seccion-gnp').style.display   = 'none';
  if(g('seccion-atlas')) g('seccion-atlas').style.display  = 'none';
  const lbl = g('s-modo-captura-lbl');
  if(lbl){ lbl.textContent = 'Modo: Institucional'; lbl.style.color = 'var(--text-ter)'; }

  if(g('s-poliza')){
    g('s-poliza').innerHTML = '<option value="">— Sin póliza aún —</option>' +
      data.pol.map(p => `<option value="${p.id}">${p.numero}</option>`).join('');
  }
  if(g('s-aseg-direct')) g('s-aseg-direct').value = '';
}

export function buscarAseguradoSin() {
  const q   = (g('sin-asdo-q').value || '').toLowerCase().trim();
  const res = g('sin-asdo-results');
  if(!q){ res.innerHTML = ''; return; }
  const matches = data.asdo
    .filter(a => (a.nombre||'').toLowerCase().includes(q) || (a.rfc||'').toLowerCase().includes(q))
    .slice(0, 6);
  if(!matches.length){
    res.innerHTML = `<div style="font-size:12px;color:var(--text-ter);padding:6px 0;">Sin resultados. Use "+ Crear asegurado".</div>`;
    return;
  }
  res.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border-md);border-radius:var(--r);overflow:hidden;margin-top:2px;">
    ${matches.map(a => `<div onclick="seleccionarAseguradoSin(${a.id},'${(a.nombre||'').replace(/'/g,"\\'")}' )"
      style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);transition:background .1s;"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <strong>${a.nombre||'—'}</strong>${a.rfc ? ` <span style="color:var(--text-ter);font-size:11px;">· ${a.rfc}</span>` : ''}
    </div>`).join('')}
  </div>`;
}

export function seleccionarAseguradoSin(id, nombre) {
  g('sin-asdo-sel-id').value  = id;
  g('sin-asdo-q').value       = nombre;
  g('sin-asdo-results').innerHTML = '';
  g('sin-asdo-sel-label').textContent = nombre;
  g('sin-asdo-sel-display').style.display = 'flex';
  g('sin-asdo-form').style.display  = 'none';
  g('sin-pol-step').style.display = 'block';
  g('sin-pol-q').value    = '';
  g('sin-pol-results').innerHTML = '';
  g('sin-pol-sel-id').value = '';
  if(g('sin-pol-sel-display')) g('sin-pol-sel-display').style.display = 'none';
  if(g('s-poliza'))      g('s-poliza').value      = '';
  if(g('s-aseg-direct')) g('s-aseg-direct').value = '';
}

export function limpiarAseguradoSin() {
  g('sin-asdo-sel-id').value  = '';
  g('sin-asdo-q').value       = '';
  g('sin-asdo-sel-display').style.display = 'none';
  g('sin-pol-step').style.display = 'none';
  limpiarPolizaSin();
}

export function toggleCrearAseguradoSin() {
  const f = g('sin-asdo-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

export function cancelarCrearAseguradoSin() {
  g('sin-asdo-form').style.display = 'none';
  ['sin-new-asdo-nombre','sin-new-asdo-rfc','sin-new-asdo-tel',
   'sin-new-asdo-email','sin-new-asdo-dir'].forEach(f => { if(g(f)) g(f).value = ''; });
}

export async function guardarNuevoAseguradoSin() {
  const nombre = (g('sin-new-asdo-nombre').value || '').trim();
  if(!nombre){ toast('El nombre es obligatorio.'); return; }
  const { data: rows, error } = await db.from('asegurados').insert({
    nombre,
    rfc:       g('sin-new-asdo-rfc').value   || null,
    tipo:      g('sin-new-asdo-tipo').value,
    telefono:  g('sin-new-asdo-tel').value   || null,
    correo:    g('sin-new-asdo-email').value || null,
    direccion: g('sin-new-asdo-dir').value   || null,
  }).select('id').single();
  if(error){ toast('Error: ' + error.message); return; }
  await loadAll();
  toast('Asegurado creado.');
  cancelarCrearAseguradoSin();
  g('sin-asdo-form').style.display = 'none';
  seleccionarAseguradoSin(rows.id, nombre);
}

export function buscarPolizaSin() {
  const q      = (g('sin-pol-q').value || '').toLowerCase().trim();
  const res    = g('sin-pol-results');
  const asdoId = parseInt(g('sin-asdo-sel-id').value) || 0;
  const pool = asdoId ? data.pol.filter(p => p.id_asegurado === asdoId) : data.pol;
  const matches = q
    ? pool.filter(p => (p.numero||'').toLowerCase().includes(q)).slice(0, 6)
    : pool.slice(0, 6);
  if(!matches.length){
    res.innerHTML = `<div style="font-size:12px;color:var(--text-ter);padding:6px 0;">Sin pólizas. Use "+ Crear póliza".</div>`;
    return;
  }
  const asegNombre = id => (data.aseg.find(a => a.id === id) || {}).nombre || '';
  res.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border-md);border-radius:var(--r);overflow:hidden;margin-top:2px;">
    ${matches.map(p => `<div onclick="seleccionarPolizaSin(${p.id},'${(p.numero||'').replace(/'/g,"\\'")}',${p.id_aseguradora||0})"
      style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <strong>${p.numero||'—'}</strong>
      <span style="color:var(--text-ter);font-size:11px;"> · ${asegNombre(p.id_aseguradora)} · ${p.ramo||''} · Vige: ${p.vigencia_ini||'?'} – ${p.vigencia_fin||'?'}</span>
    </div>`).join('')}
  </div>`;
}

export function seleccionarPolizaSin(polId, numero, asegId) {
  g('sin-pol-sel-id').value = polId;
  g('sin-pol-q').value      = numero;
  g('sin-pol-results').innerHTML = '';
  const aseg = data.aseg.find(a => a.id === asegId) || {};
  g('sin-pol-sel-label').textContent = numero + (aseg.nombre ? ' — ' + aseg.nombre : '');
  g('sin-pol-sel-display').style.display = 'flex';
  g('sin-pol-form').style.display = 'none';
  if(asegId){
    if(!g('s-aseg-direct').querySelector(`option[value="${asegId}"]`)){
      g('s-aseg-direct').innerHTML += `<option value="${asegId}">${aseg.nombre||''}</option>`;
    }
    g('s-aseg-direct').value = asegId;
    actualizarCamposAseg();
    poblarFuncionarioDestSin(asegId);
    mostrarDescAsegSin(polId);
  }
  if(!g('s-poliza').querySelector(`option[value="${polId}"]`)){
    g('s-poliza').innerHTML += `<option value="${polId}">${numero}</option>`;
  }
  g('s-poliza').value = polId;
}

export function limpiarPolizaSin() {
  g('sin-pol-sel-id').value = '';
  g('sin-pol-q').value      = '';
  g('sin-pol-results').innerHTML = '';
  if(g('sin-pol-sel-display')) g('sin-pol-sel-display').style.display = 'none';
  if(g('s-poliza'))      g('s-poliza').value      = '';
  if(g('s-aseg-direct')) g('s-aseg-direct').value = '';
}

export function toggleCrearPolizaSin() {
  const f = g('sin-pol-form');
  if(f.style.display === 'none'){
    f.style.display = 'block';
    g('sin-new-pol-aseg').innerHTML = '<option value="">— Selecciona —</option>' +
      data.aseg.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
  } else {
    f.style.display = 'none';
  }
}

export function cancelarCrearPolizaSin() {
  g('sin-pol-form').style.display = 'none';
}

export async function guardarNuevaPolizaSin() {
  const num    = (g('sin-new-pol-num').value || '').trim();
  const asegId = parseInt(g('sin-new-pol-aseg').value) || null;
  const asdoId = parseInt(g('sin-asdo-sel-id').value)  || null;
  if(!num)   { toast('El número de póliza es obligatorio.'); return; }
  if(!asegId){ toast('Selecciona una compañía aseguradora.'); return; }
  const { data: rows, error } = await db.from('polizas').insert({
    numero: num, id_aseguradora: asegId, id_asegurado: asdoId,
  }).select('id').single();
  if(error){ toast('Error: ' + error.message); return; }
  await loadAll();
  toast('Póliza creada.');
  cancelarCrearPolizaSin();
  g('sin-pol-form').style.display = 'none';
  seleccionarPolizaSin(rows.id, num, asegId);
}

export function actualizarCamposAseg() {
  const asegId = parseInt(g('s-aseg-direct')?.value) || 0;
  const aseg   = data.aseg.find(a => a.id === asegId) || {};
  const cod    = (aseg.codigo_sistema || '').toUpperCase();
  if(g('seccion-gnp'))   g('seccion-gnp').style.display   = cod === 'GNP'   ? 'block' : 'none';
  if(g('seccion-atlas')) g('seccion-atlas').style.display  = cod === 'ATLAS' ? 'block' : 'none';
  const noGnpSec = g('seccion-no-gnp');
  if(noGnpSec) noGnpSec.style.display = cod === 'GNP' ? 'none' : 'block';
  const introWrap = g('s-introduccion-wrap');
  if(introWrap) introWrap.style.display = cod === 'GNP' ? 'none' : 'block';
  if(cod !== 'GNP')
    ['s-tramite-gnp','s-gnp-clave-ajust','s-gnp-jefe','s-gnp-oficina']
      .forEach(f => { if(g(f)) g(f).value = ''; });
  if(cod !== 'ATLAS')
    ['s-ot','s-atlas-poliza','s-atlas-sin-gnp','s-atlas-pol-gnp']
      .forEach(f => { if(g(f)) g(f).value = ''; });
  const lbl = g('s-modo-captura-lbl');
  if(lbl){
    const modos = { GNP:'Modo: GNP', ATLAS:'Modo: Atlas' };
    lbl.textContent = modos[cod] || 'Modo: Institucional';
    lbl.style.color = cod === 'GNP'   ? '#ffcc80'
                    : cod === 'ATLAS' ? '#90caf9'
                    : 'var(--text-ter)';
  }
  const polFil = asegId ? data.pol.filter(p => p.id_aseguradora === asegId) : data.pol;
  if(g('s-poliza')){
    g('s-poliza').innerHTML = '<option value="">— Sin póliza aún —</option>' +
      polFil.map(p => `<option value="${p.id}">${p.numero}</option>`).join('');
  }
}

export function poblarFuncionarioDestSin(asegId) {
  const sel = g('s-funcionario-dest');
  if(!sel) return;
  const contsFil = asegId ? data.cont.filter(co => co.id_aseguradora === asegId) : data.cont;
  sel.innerHTML = '<option value="">— Seleccionar del directorio —</option>' +
    contsFil.map(co => `<option value="${co.id}">${co.nombre}${co.cargo ? ' — ' + co.cargo : ''}</option>`).join('');
}

export function actualizarFuncionarioDest() {
  const id   = parseInt(g('s-funcionario-dest')?.value) || 0;
  const cont = data.cont.find(co => co.id === id);
  if(cont){
    if(g('s-dest-nombre')) g('s-dest-nombre').value = cont.nombre || '';
    if(g('s-dest-cargo'))  g('s-dest-cargo').value  = cont.cargo  || '';
  }
}

export function rteCmdSinLim(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('sin-lim-texto-rte'); if(rte) rte.focus();
  syncSinLimTexto();
}
export function syncSinLimTexto() {
  const rte = g('sin-lim-texto-rte'), ta = g('sin-lim-texto');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadSinLimTexto(html) {
  const rte = g('sin-lim-texto-rte'), ta = g('sin-lim-texto');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

export function rteCmdSinGiro(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('sin-giro-aseg-rte'); if(rte) rte.focus();
  syncSinGiroAseg();
}
export function syncSinGiroAseg() {
  const rte = g('sin-giro-aseg-rte'), ta = g('sin-giro-aseg');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadSinGiroAseg(html) {
  const rte = g('sin-giro-aseg-rte'), ta = g('sin-giro-aseg');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

export function rteCmdSinDescAseg(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('sin-desc-aseg-rte'); if(rte) rte.focus();
  syncSinDescAseg();
}
export function syncSinDescAseg() {
  const rte = g('sin-desc-aseg-rte'), ta = g('sin-desc-aseg');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadSinDescAseg(html) {
  const rte = g('sin-desc-aseg-rte'), ta = g('sin-desc-aseg');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

export function mostrarDescAsegSin(polId) {
  if(!polId) return;
  const pol = data.pol.find(p => p.id === parseInt(polId));
  if(!pol) return;
  loadSinLimTexto(pol.limite_max_texto      || '');
  loadSinGiroAseg(pol.giro_asegurado        || '');
  loadSinDescAseg(pol.descripcion_asegurado || '');
}

export function renderEstimacionSinGrid() {
  const wrap = g('sin-estimacion-grid');
  if(!wrap || !state.currentSin) return;
  const rvs = data.res.filter(r => r.id_siniestro === state.currentSin.id);
  if(!rvs.length){
    wrap.innerHTML = '<div style="font-size:12px;color:var(--text-ter);padding:6px 0;">Sin coberturas de reserva registradas. Captura en la pestaña Reservas.</div>';
    return;
  }
  const pol = data.pol.find(p => p.id === state.currentSin.id_poliza) || {};
  wrap.innerHTML = buildCoberturaTableHTML(rvs, pol.moneda || 'MXN');
}

export async function guardarSiniestro() {
  const id = v('s-id');
  const d2 = {
    numero_exp:              v('s-exp'),
    numero_siniestro:        v('s-numsin')        || null,
    id_poliza:               parseInt(v('s-poliza')) || null,
    subramo:                 v('s-subramo')       || null,
    tipo_siniestro:          v('s-tipo')          || null,
    causa:                   v('s-causa')         || null,
    causa_comentario:        v('s-causa-com')     || null,
    riesgo_afectado:         v('s-riesgo')        || null,
    riesgos_cubiertos:       v('s-riesgos-cubiertos') || null,
    localizacion_html:       v('s-localizacion')  || null,
    narracion_html:          v('s-narracion')     || null,
    naturaleza_alcance_danios: v('s-naturaleza-alcance') || null,
    referencia_ajustadora:   v('s-exp')           || null,
    clave_ajustador_cia:     v('s-clave-ajust')   || null,
    id_contacto_dest:        parseInt(v('s-funcionario-dest')) || null,
    destinatario_nombre:     v('s-dest-nombre')   || null,
    destinatario_cargo:      v('s-dest-cargo')    || null,
    referencia_asegurado:    v('s-ref-aseg')      || null,
    giro_asegurado:          v('s-giro')          || null,
    descripcion:             v('s-desc'),
    descripcion_riesgo:      v('s-desc-riesgo')   || null,
    introduccion:            v('s-introduccion')  || null,
    inspeccion_narrativa:    v('s-inspeccion-narrativa') || null,
    notas:                   v('s-notas'),
    estatus:                 v('s-est'),
    fecha_siniestro:         v('s-fsin')          || null,
    hora_ocurrencia:         v('s-hora-ocurr')    || null,
    fecha_asignacion:        v('s-fasig')         || null,
    hora_asignacion:         v('s-hora-asig')     || null,
    fecha_primer_contacto:   v('s-f1cont')        || null,
    hora_primer_contacto:    v('s-h1cont')        || null,
    fecha_primera_visita:    v('s-f1vis')         || null,
    hora_primera_visita:     v('s-h1vis')         || null,
    fecha_inspeccion:        v('s-finsp')         || null,
    fecha_informe:           v('s-finf')          || null,
    inspeccion_persona:      v('s-insp-persona')  || null,
    inspeccion_cargo:        v('s-insp-cargo')    || null,
    inspeccion_telefono:     v('s-insp-tel')      || null,
    inspeccion_domicilio:    v('s-insp-dom')      || null,
    lugar_siniestro:         v('s-lugar-sin')     || null,
    procedencia:             v('s-procedencia')   || 'procedente',
    intervencion_autoridades: v('s-autoridades') === '1',
    salvamento:              v('s-salvamento')    || null,
    salvamento_valor:        parseFloat(v('s-salv-valor')) || null,
    salvamento_detalle_html: v('s-salv-det')      || null,
    recuperacion:            v('s-recuperacion') === '1',
    reclamacion_asegurado:   v('s-reclamacion')  || null,
    considerandos:           v('s-considerandos') || null,
    coaseguro:               v('s-coaseguro') === '1',
    coaseguro_detalle:       v('s-coas-det')      || null,
    reaseguro:               v('s-reaseguro') === '1',
    reaseguro_corredor:      v('s-reas-corredor') || null,
    descripcion_danios_html: v('s-bienes-danados') || null,
    bienes_amparados:        v('s-bienes-amparados') || null,
    situacion_actual:        v('s-situacion-actual') || null,
    fundamento:              v('s-fundamento')    || null,
    subrogacion:             v('s-subrogacion')   || 'N/A',
    asesores:                v('s-asesores')      || 'No aplican',
    observaciones:           v('s-observaciones') || null,
    actividades:             v('s-actividades')   || null,
    estrategias:             v('s-estrategias')   || null,
    estrategias_observaciones: v('s-estrategias') || null,
    tramite_gnp:             v('s-tramite-gnp')   || null,
    gnp_jefe_depto:          v('s-gnp-jefe')      || null,
    gnp_oficina:             v('s-gnp-oficina')   || null,
    gnp_clave_ajustador:     v('s-gnp-clave-ajust') || null,
    clave_evento:            v('s-clave-evento')  || null,
    gnp_salv_persona:        v('s-gnp-salv-persona') || null,
    gnp_salv_tel:            v('s-gnp-salv-tel')  || null,
    gnp_salv_email:          v('s-gnp-salv-email') || null,
    gnp_salv_movil:          v('s-gnp-salv-movil') || null,
    gnp_salv_comprador:      v('s-gnp-salv-comprador') || null,
    gnp_rec_recuperador:     v('s-gnp-rec-recuperador') || null,
    gnp_rec_carta_porte:     v('s-gnp-rec-carta-porte') || null,
    gnp_rec_prescripcion:    v('s-gnp-rec-prescripcion') || null,
    gnp_trans_tipo:          v('s-gnp-trans-tipo') || null,
    gnp_trans_frontera:      v('s-gnp-trans-frontera') || null,
    gnp_trans_placa:         v('s-gnp-trans-placa') || null,
    gnp_trans_destino:       v('s-gnp-trans-destino') || null,
    gnp_trans_compania:      v('s-gnp-trans-compania') || null,
    gnp_docs_faltantes:      v('s-gnp-docs-faltantes') || null,
    ot_atlas:                v('s-ot')            || null,
    atlas_poliza_coaseg:     v('s-atlas-poliza')  || null,
    atlas_sinies_coaseg:     v('s-atlas-sin-gnp') || null,
    atlas_pol_gnp:           v('s-atlas-pol-gnp') || null,
    modo_captura: (() => {
      const cod = (data.aseg.find(a => a.id === parseInt(g('s-aseg-direct')?.value))?.codigo_sistema || '').toUpperCase();
      return cod === 'GNP' ? 'gnp' : cod === 'ATLAS' ? 'atlas' : 'institucional';
    })(),
  };

  if(!navigator.onLine){ await guardarSiniestroOffline(id, d2); return; }
  if(id){
    await db.from('siniestros').update(d2).eq('id', id);
    toast('Expediente actualizado.');
  } else {
    await db.from('siniestros').insert(d2);
    toast('Expediente creado.');
  }
  const polIdUpd = parseInt(v('s-poliza')) || null;
  if(polIdUpd){
    const polUpd = {};
    if(g('sin-lim-texto')) polUpd.limite_max_texto      = v('sin-lim-texto') || null;
    if(g('sin-giro-aseg')) polUpd.giro_asegurado        = v('sin-giro-aseg') || null;
    if(g('sin-desc-aseg')) polUpd.descripcion_asegurado = v('sin-desc-aseg') || null;
    if(Object.keys(polUpd).length) await db.from('polizas').update(polUpd).eq('id', polIdUpd);
  }
  cerrarModal('modal-sin');
  await loadAll();
  if(state.currentSin) renderDetalle();
}

async function guardarSiniestroOffline(id, d2) {
  await offlineSaveSiniestro(id, d2);
  cerrarModal('modal-sin');
  renderSiniestros();
  if(state.currentSin){
    state.currentSin = data.sin.find(s => s.id === state.currentSin.id) || state.currentSin;
    renderDetalle();
  }
  toast('Guardado sin conexión ● — se sincronizará al recuperar red');
}

export function editarSiniestro(id) {
  const s = data.sin.find(x => x.id === id); if(!s) return;
  state.currentSin = s;
  g('sin-modal-title').textContent = 'Editar expediente';
  if(g('s-id')) g('s-id').value = s.id;
  [
    ['s-exp',          s.numero_exp            || ''],
    ['s-numsin',       s.numero_siniestro      || ''],
    ['s-subramo',      s.subramo               || ''],
    ['s-tipo',         s.tipo_siniestro        || ''],
    ['s-causa',        s.causa                 || ''],
    ['s-causa-com',    s.causa_comentario      || ''],
    ['s-riesgo',       s.riesgo_afectado       || ''],
    ['s-clave-ajust',  s.clave_ajustador_cia   || ''],
    ['s-giro',         s.giro_asegurado        || ''],
    ['s-dest-nombre',  s.destinatario_nombre   || ''],
    ['s-dest-cargo',   s.destinatario_cargo    || ''],
    ['s-notas',        s.notas                 || ''],
    ['s-est',          s.estatus               || 'asignado'],
    ['s-fsin',         s.fecha_siniestro       || ''],
    ['s-fasig',        s.fecha_asignacion      || ''],
    ['s-hora-ocurr',   s.hora_ocurrencia       || ''],
    ['s-hora-asig',    s.hora_asignacion       || ''],
    ['s-f1cont',       s.fecha_primer_contacto || ''],
    ['s-h1cont',       s.hora_primer_contacto  || ''],
    ['s-f1vis',        s.fecha_primera_visita  || ''],
    ['s-h1vis',        s.hora_primera_visita   || ''],
    ['s-finsp',        s.fecha_inspeccion      || ''],
    ['s-finf',         s.fecha_informe         || ''],
    ['s-insp-persona', s.inspeccion_persona    || ''],
    ['s-insp-cargo',   s.inspeccion_cargo      || ''],
    ['s-insp-tel',     s.inspeccion_telefono   || ''],
    ['s-insp-dom',     s.inspeccion_domicilio  || ''],
    ['s-lugar-sin',    s.lugar_siniestro       || ''],
    ['s-procedencia',  s.procedencia           || 'procedente'],
    ['s-autoridades',  s.intervencion_autoridades ? '1' : '0'],
    ['s-salvamento',   s.salvamento            || 'por_determinar'],
    ['s-salv-valor',   s.salvamento_valor      || ''],
    ['s-recuperacion', s.recuperacion ? '1' : '0'],
    ['s-coaseguro',    s.coaseguro     ? '1' : '0'],
    ['s-coas-det',     s.coaseguro_detalle     || ''],
    ['s-reaseguro',    s.reaseguro     ? '1' : '0'],
    ['s-reas-corredor',s.reaseguro_corredor    || ''],
    ['s-situacion-actual', s.situacion_actual  || ''],
    ['s-fundamento',   s.fundamento            || ''],
    ['s-subrogacion',  s.subrogacion           || 'N/A'],
    ['s-asesores',     s.asesores              || 'No aplican'],
    ['s-tramite-gnp',       s.tramite_gnp         || ''],
    ['s-gnp-jefe',          s.gnp_jefe_depto      || ''],
    ['s-gnp-oficina',       s.gnp_oficina         || ''],
    ['s-gnp-clave-ajust',   s.gnp_clave_ajustador || ''],
    ['s-clave-evento',      s.clave_evento         || ''],
    ['s-gnp-salv-persona',  s.gnp_salv_persona    || ''],
    ['s-gnp-salv-tel',      s.gnp_salv_tel        || ''],
    ['s-gnp-salv-email',    s.gnp_salv_email      || ''],
    ['s-gnp-salv-movil',    s.gnp_salv_movil      || ''],
    ['s-gnp-salv-comprador',s.gnp_salv_comprador  || ''],
    ['s-gnp-rec-recuperador',  s.gnp_rec_recuperador   || ''],
    ['s-gnp-rec-carta-porte',  s.gnp_rec_carta_porte   || ''],
    ['s-gnp-rec-prescripcion', s.gnp_rec_prescripcion  || ''],
    ['s-gnp-trans-tipo',       s.gnp_trans_tipo         || ''],
    ['s-gnp-trans-frontera',   s.gnp_trans_frontera     || ''],
    ['s-gnp-trans-placa',      s.gnp_trans_placa        || ''],
    ['s-gnp-trans-destino',    s.gnp_trans_destino      || ''],
    ['s-gnp-trans-compania',   s.gnp_trans_compania     || ''],
    ['s-gnp-docs-faltantes',   s.gnp_docs_faltantes     || ''],
    ['s-ot',           s.ot_atlas            || ''],
    ['s-atlas-poliza', s.atlas_poliza_coaseg || ''],
    ['s-atlas-sin-gnp',s.atlas_sinies_coaseg || ''],
    ['s-atlas-pol-gnp',s.atlas_pol_gnp       || ''],
  ].forEach(([fid, val]) => { const el = g(fid); if(el) el.value = val; });

  loadRteSin('desc',                  s.descripcion                 || '');
  loadRteSin('desc-riesgo',           s.descripcion_riesgo          || '');
  loadRteSin('riesgos-cubiertos',     s.riesgos_cubiertos           || '');
  loadRteSin('localizacion',          s.localizacion_html           || '');
  loadRteSin('narracion',             s.narracion_html              || '');
  loadRteSin('naturaleza-alcance',    s.naturaleza_alcance_danios   || '');
  loadRteSin('introduccion',          s.introduccion                || '');
  loadRteSin('inspeccion-narrativa',  s.inspeccion_narrativa        || '');
  loadRteSin('reclamacion',           s.reclamacion_asegurado       || RECLAMACION_DEFAULT);
  loadRteSin('considerandos',         s.considerandos               || '');
  loadRteSin('salv-det',              s.salvamento_detalle_html || s.salvamento_detalle || '');
  loadRteSin('estrategias',           s.estrategias || s.estrategias_observaciones || '');
  loadRteSin('observaciones',         s.observaciones               || '');
  loadRteSin('actividades',           s.actividades                 || '');
  loadRteSin('bienes-amparados',      s.bienes_amparados            || '');
  loadBienesRte(s.descripcion_danios_html || s.bienes_danados || '');

  resetBuscadorSinModal();
  const pol  = data.pol.find(p => p.id === s.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  if(asdo.id) seleccionarAseguradoSin(asdo.id, asdo.nombre || '—');
  if(pol.id){
    seleccionarPolizaSin(pol.id, pol.numero || '—', pol.id_aseguradora || 0);
    [
      ['s-tramite-gnp',     s.tramite_gnp         || ''],
      ['s-gnp-jefe',        s.gnp_jefe_depto      || ''],
      ['s-gnp-oficina',     s.gnp_oficina         || ''],
      ['s-gnp-clave-ajust', s.gnp_clave_ajustador || ''],
    ].forEach(([fid, val]) => { const el = g(fid); if(el) el.value = val; });
  }

  poblarFuncionarioDestSin(pol.id_aseguradora || 0);
  if(s.id_contacto_dest && g('s-funcionario-dest')){
    g('s-funcionario-dest').value = s.id_contacto_dest;
  }
  mostrarDescAsegSin(s.id_poliza);
  setTimeout(renderEstimacionSinGrid, 100);
  g('modal-sin').classList.add('open');
}

function cerrarModal(id) {
  const el = g(id);
  if(el) el.classList.remove('open');
}

export const modalSinPublic = {};
