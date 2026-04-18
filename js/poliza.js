// ============================================================
// poliza.js — Pólizas, sublímites/coberturas, catálogos
// AdjusterPro JChA · Almaraz Ajustadores (AASA)
// Depende de: ui.js, db.js, state.js
// ============================================================

import { g, v, toast, fmtMXN, fmtD } from './ui.js';
import { db, loadAll } from './db.js';
import { data } from './state.js';
import { renderDetalle } from './expediente.js';

// ── Constantes locales ───────────────────────────────────────────────
const RAMOS = {
  incendio:'Incendio y/o Riesgos Adicionales', rc:'Responsabilidad Civil',
  transporte:'Transporte', equipo_cont:'Equipo de Contratistas',
  rotura_maq:'Rotura de Maquinaria', todo_riesgo:'Todo Riesgo',
  robo:'Robo con Violencia', vidrios:'Vidrios',
  dinero_valores:'Dinero y Valores', multiriesgo:'Multiriesgo Empresarial',
  agricola:'Agrícola / Ganadero', credito:'Crédito',
};
const MON_CLS = { MXN:'badge-mxn', USD:'badge-usd', EUR:'badge-eur' };

// ============================================================
// GRID DE COBERTURAS / SUBLÍMITES (modal-pol)
// ============================================================
export let polCobFilas = []; // estado mutable exportado

export function renderPolCobGrid() {
  const tbody = g('pol-cob-tbody');
  if(!tbody) return;
  if(!polCobFilas.length){
    polCobFilas = [{ concepto:'', moneda:'MXN', monto:'', deducible:'', coaseguro_pct:'' }];
  }
  tbody.innerHTML = '';
  const inpStyle = 'width:100%;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:12px;font-family:inherit;box-sizing:border-box;';

  polCobFilas.forEach((f, i) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';

    // Concepto
    const tdC = document.createElement('td'); tdC.style.padding = '4px 6px';
    const inpC = document.createElement('input'); inpC.type = 'text'; inpC.value = f.concepto || '';
    inpC.placeholder = 'ej. Edificio, Contenidos, Maquinaria'; inpC.style.cssText = inpStyle;
    inpC.addEventListener('input', () => { polCobFilas[i].concepto = inpC.value; });
    tdC.appendChild(inpC); tr.appendChild(tdC);

    // Moneda
    const tdM = document.createElement('td'); tdM.style.padding = '4px 6px';
    const sel = document.createElement('select'); sel.style.cssText = inpStyle;
    ['MXN','USD','EUR'].forEach(m => {
      const o = document.createElement('option'); o.value = m; o.textContent = m;
      if(f.moneda === m) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener('change', () => { polCobFilas[i].moneda = sel.value; recalcPolCobTotal(); });
    tdM.appendChild(sel); tr.appendChild(tdM);

    // Suma asegurada
    const tdS = document.createElement('td'); tdS.style.padding = '4px 6px';
    const inpS = document.createElement('input'); inpS.type = 'number'; inpS.value = f.monto || '';
    inpS.placeholder = '0.00'; inpS.step = '0.01'; inpS.style.cssText = inpStyle + 'text-align:right;';
    inpS.addEventListener('input', () => { polCobFilas[i].monto = inpS.value; recalcPolCobTotal(); });
    tdS.appendChild(inpS); tr.appendChild(tdS);

    // Deducible
    const tdD = document.createElement('td'); tdD.style.padding = '4px 6px';
    const inpD = document.createElement('input'); inpD.type = 'text'; inpD.value = f.deducible || '';
    inpD.placeholder = 'ej. 10% s/daño, mín. USD 5,000'; inpD.style.cssText = inpStyle;
    inpD.addEventListener('input', () => { polCobFilas[i].deducible = inpD.value; });
    tdD.appendChild(inpD); tr.appendChild(tdD);

    // Coaseguro %
    const tdCo = document.createElement('td'); tdCo.style.cssText = 'padding:4px 6px;text-align:center;white-space:nowrap;';
    const inpCo = document.createElement('input'); inpCo.type = 'number'; inpCo.value = f.coaseguro_pct || '';
    inpCo.placeholder = '0'; inpCo.min = '0'; inpCo.max = '100'; inpCo.step = '0.01';
    inpCo.style.cssText = 'width:65px;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:12px;font-family:inherit;text-align:center;box-sizing:border-box;';
    inpCo.addEventListener('input', () => { polCobFilas[i].coaseguro_pct = inpCo.value; });
    const pct = document.createElement('span'); pct.textContent = '%';
    pct.style.cssText = 'font-size:11px;color:var(--text-ter);margin-left:2px;';
    tdCo.appendChild(inpCo); tdCo.appendChild(pct); tr.appendChild(tdCo);

    // Eliminar
    const tdX = document.createElement('td'); tdX.style.cssText = 'padding:4px 6px;text-align:center;';
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '✕';
    btn.className = 'btn btn-sm btn-danger'; btn.style.cssText = 'padding:2px 7px;font-size:11px;';
    btn.addEventListener('click', () => { eliminarFilaCobertura(i); });
    tdX.appendChild(btn); tr.appendChild(tdX);

    tbody.appendChild(tr);
  });
  recalcPolCobTotal();
}

export function agregarFilaCobertura() {
  polCobFilas.push({
    concepto: '', moneda: polCobFilas.length ? polCobFilas[0].moneda : 'MXN',
    monto: '', deducible: '', coaseguro_pct: '',
  });
  renderPolCobGrid();
}

export function eliminarFilaCobertura(i) {
  polCobFilas.splice(i, 1);
  if(!polCobFilas.length)
    polCobFilas = [{ concepto:'', moneda:'MXN', monto:'', deducible:'', coaseguro_pct:'' }];
  renderPolCobGrid();
}

export function recalcPolCobTotal() {
  const filas     = polCobFilas.filter(f => parseFloat(f.monto) > 0);
  const totalRow  = g('pol-cob-total-row');
  const totalCell = g('pol-cob-total');
  if(filas.length > 1 && totalRow && totalCell){
    totalRow.style.display = '';
    const byMon = {};
    filas.forEach(f => { const m = f.moneda || 'MXN'; byMon[m] = (byMon[m] || 0) + parseFloat(f.monto); });
    totalCell.textContent = Object.entries(byMon).map(([m,t]) => m + ' ' + fmtMXN(t)).join('  /  ');
    const firstMon = Object.keys(byMon)[0];
    if(g('p-suma')) g('p-suma').value = byMon[firstMon];
    if(g('p-mon'))  g('p-mon').value  = firstMon;
  } else {
    if(totalRow) totalRow.style.display = 'none';
    const monto = parseFloat(filas[0]?.monto) || 0;
    if(g('p-suma')) g('p-suma').value = monto || '';
    if(filas[0]?.moneda && g('p-mon')) g('p-mon').value = filas[0].moneda;
  }
}

export function cargarPolCobGrid(polId) {
  const sls = data.sublim.filter(s => s.id_poliza === polId);
  if(sls.length){
    polCobFilas = sls.map(s => ({
      concepto:     s.concepto     || '',
      moneda:       s.moneda       || 'MXN',
      monto:        s.monto        || '',
      deducible:    s.deducible    || '',
      coaseguro_pct: s.coaseguro_pct || '',
    }));
  } else {
    polCobFilas = [{ concepto:'', moneda:'MXN', monto:'', deducible:'', coaseguro_pct:'' }];
  }
  renderPolCobGrid();
}

export async function guardarPolCobGrid(polId) {
  await db.from('sublimites').delete().eq('id_poliza', polId);
  const filas = polCobFilas.filter(f => f.concepto.trim() || parseFloat(f.monto));
  if(filas.length){
    await db.from('sublimites').insert(filas.map(f => ({
      id_poliza:     polId,
      concepto:      f.concepto.trim() || 'Sin concepto',
      moneda:        f.moneda  || 'MXN',
      monto:         parseFloat(f.monto) || 0,
      deducible:     f.deducible || null,
      coaseguro_pct: parseFloat(f.coaseguro_pct) || 0,
    })));
  }
}

// ============================================================
// RTEs AUXILIARES DE PÓLIZA
// ── Límite máximo responsabilidad ────────────────────────────
export function rteCmdPolLim(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('p-lim-texto-rte'); if(rte) rte.focus();
  syncPolLimTexto();
}
export function syncPolLimTexto() {
  const rte = g('p-lim-texto-rte'), ta = g('p-lim-texto');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadPolLimTexto(html) {
  const rte = g('p-lim-texto-rte'), ta = g('p-lim-texto');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

// ── Giro asegurado ───────────────────────────────────────────
export function rteCmdPolGiro(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('p-giro-aseg-rte'); if(rte) rte.focus();
  syncPolGiroAseg();
}
export function syncPolGiroAseg() {
  const rte = g('p-giro-aseg-rte'), ta = g('p-giro-aseg');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadPolGiroAseg(html) {
  const rte = g('p-giro-aseg-rte'), ta = g('p-giro-aseg');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

// ── Descripción del asegurado ────────────────────────────────
export function rteCmdPol2(cmd) {
  document.execCommand(cmd, false, null);
  const rte = g('p-desc-aseg-rte'); if(rte) rte.focus();
  syncPolDescAseg();
}
export function syncPolDescAseg() {
  const rte = g('p-desc-aseg-rte'), ta = g('p-desc-aseg');
  if(rte && ta) ta.value = rte.innerHTML;
}
export function loadPolDescAseg(html) {
  const rte = g('p-desc-aseg-rte'), ta = g('p-desc-aseg');
  if(rte) rte.innerHTML = html || '';
  if(ta)  ta.value      = html || '';
}

// ============================================================
// RENDER TABLA DE PÓLIZAS
// ============================================================
export function renderPolizas() {
  const q   = (v('pol-search') || '').toLowerCase();
  const fil = data.pol.filter(p =>
    (p.numero || '').toLowerCase().includes(q) ||
    (data.asdo.find(a => a.id === p.id_asegurado)?.nombre || '').toLowerCase().includes(q) ||
    (data.aseg.find(a => a.id === p.id_aseguradora)?.nombre || '').toLowerCase().includes(q)
  );
  g('pol-body').innerHTML = fil.map(p => {
    const asdo  = data.asdo.find(a => a.id === p.id_asegurado)  || {};
    const aseg  = data.aseg.find(a => a.id === p.id_aseguradora) || {};
    const nSublim = data.sublim.filter(sl => sl.id_poliza === p.id).length;
    return `<tr>
      <td><strong>${p.numero}</strong>${p.tipo_seguro ? `<div class="td-sub">${p.tipo_seguro}</div>` : ''}</td>
      <td>${asdo.nombre || '—'}</td>
      <td>${aseg.nombre || '—'}</td>
      <td>${RAMOS[p.ramo] || p.ramo || '—'}</td>
      <td>${fmtD(p.vigencia_ini)} – ${fmtD(p.vigencia_fin)}</td>
      <td>${p.moneda ? `<span class="badge ${MON_CLS[p.moneda] || ''}">${p.moneda}</span>` : '—'}
          ${p.suma_asegurada ? ' ' + fmtMXN(p.suma_asegurada) : ''}
          ${nSublim ? `<div class="td-sub">${nSublim} cobertura${nSublim > 1 ? 's' : ''}</div>` : ''}</td>
      <td>${p.moneda || '—'}</td>
      <td><div class="td-acts">
        <button class="btn btn-sm" onclick="editarPoliza(${p.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminar('polizas',${p.id})">Eliminar</button>
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="empty">Sin pólizas.</td></tr>';
}

// ============================================================
// GUARDAR PÓLIZA
// ============================================================
export async function guardarPoliza() {
  const id      = v('p-id');
  const ramoSel = v('p-ramo');
  const ramo    = ramoSel === '__otro__' ? (v('p-ramo-otro').trim() || 'otro') : ramoSel;

  const d2 = {
    numero:               v('p-num'),
    id_aseguradora:       parseInt(v('p-aseg'))        || null,
    id_asegurado:         parseInt(v('p-asdo'))        || null,
    ramo,
    tipo_seguro:          v('p-tipo-seguro')           || null,
    subramo:              v('p-subramo')               || null,
    agente:               v('p-agente')                || null,
    oficina:              v('p-oficina')               || null,
    vigencia_ini:         v('p-vini')                  || null,
    vigencia_fin:         v('p-vfin')                  || null,
    suma_asegurada:       parseFloat(v('p-suma'))      || 0,
    moneda:               v('p-mon'),
    tipo_cambio:          parseFloat(v('p-tc'))        || 1,
    limite_max_resp:      parseFloat(v('p-lim-max'))   || 0,
    limite_max_mon:       v('p-lim-mon')               || 'MXN',
    val_total_edificio:   parseFloat(v('p-val-tot-edif'))  || 0,
    val_total_contenidos: parseFloat(v('p-val-tot-cont'))  || 0,
    val_ubic_edificio:    parseFloat(v('p-val-ubic-edif')) || 0,
    val_ubic_contenidos:  parseFloat(v('p-val-ubic-cont')) || 0,
    val_ubic_existencias: parseFloat(v('p-val-ubic-exist'))|| 0,
    domicilio_legal:      v('p-dom-legal')             || null,
    ubicacion_riesgo:     v('p-ubic-riesgo')           || null,
    interes_asegurado:    v('p-interes')               || null,
    giro_asegurado:       v('p-giro-aseg')             || null,
    limite_max_texto:     v('p-lim-texto')             || null,
    descripcion_asegurado: v('p-desc-aseg')            || null,
    condiciones_especiales: v('p-condiciones')         || null,
    notas:                v('p-notas'),
  };

  if(id){
    await db.from('polizas').update(d2).eq('id', id);
    await guardarPolCobGrid(parseInt(id));
    toast('Póliza actualizada.');
  } else {
    const { data: ins } = await db.from('polizas').insert(d2).select('id').single();
    if(ins?.id) await guardarPolCobGrid(ins.id);
    toast('Póliza creada.');
  }
  cerrarModal('modal-pol');
  await loadAll();
}

// ============================================================
// EDITAR PÓLIZA — precarga modal
// ============================================================
export function editarPoliza(id) {
  const p = data.pol.find(x => x.id === id); if(!p) return;
  g('pol-modal-title').textContent = 'Editar póliza';
  g('p-id').value  = p.id;
  g('p-num').value = p.numero || '';
  g('p-aseg').value = p.id_aseguradora || '';
  g('p-asdo').value = p.id_asegurado   || '';
  g('p-tipo-seguro').value = p.tipo_seguro || '';
  g('p-subramo').value     = p.subramo    || '';
  g('p-agente').value      = p.agente     || '';
  g('p-oficina').value     = p.oficina    || '';
  g('p-vini').value        = p.vigencia_ini || '';
  g('p-vfin').value        = p.vigencia_fin || '';
  g('p-suma').value        = p.suma_asegurada || '';
  g('p-mon').value         = p.moneda    || 'MXN';
  g('p-tc').value          = p.tipo_cambio || 1;
  g('p-lim-max').value     = p.limite_max_resp || '';
  g('p-lim-mon').value     = p.limite_max_mon  || 'MXN';
  g('p-val-tot-edif').value  = p.val_total_edificio   || '';
  g('p-val-tot-cont').value  = p.val_total_contenidos || '';
  g('p-val-ubic-edif').value = p.val_ubic_edificio    || '';
  g('p-val-ubic-cont').value = p.val_ubic_contenidos  || '';
  g('p-val-ubic-exist').value= p.val_ubic_existencias || '';
  g('p-dom-legal').value     = p.domicilio_legal      || '';
  g('p-ubic-riesgo').value   = p.ubicacion_riesgo     || '';
  g('p-interes').value       = p.interes_asegurado    || '';
  g('p-condiciones').value   = p.condiciones_especiales || '';
  g('p-notas').value         = p.notas || '';

  // RTEs
  loadPolLimTexto(p.limite_max_texto       || '');
  loadPolGiroAseg(p.giro_asegurado         || '');
  loadPolDescAseg(p.descripcion_asegurado  || '');

  // Ramo — manejo de valor personalizado
  const ramoOpt = g('p-ramo').querySelector(`option[value="${p.ramo}"]`);
  if(ramoOpt){
    g('p-ramo').value = p.ramo;
    if(g('ramo-otro-wrap')) g('ramo-otro-wrap').style.display = 'none';
  } else {
    g('p-ramo').value = '__otro__';
    if(g('p-ramo-otro'))    g('p-ramo-otro').value = p.ramo || '';
    if(g('ramo-otro-wrap')) g('ramo-otro-wrap').style.display = 'block';
  }

  cargarPolCobGrid(p.id);
  g('modal-pol').classList.add('open');
}

// ============================================================
// buildCoberturaTableHTML — tabla multi-cobertura HTML (para PDF/informes)
// ============================================================
const CONCEPTO_LABEL = {
  edificio:'Edificio', contenidos:'Contenidos', existencias:'Existencias',
  maquinaria:'Maquinaria y Equipo', equipo_electronico:'Equipo Electrónico',
  rc:'Responsabilidad Civil', lucro_cesante:'Lucro Cesante',
  transporte:'Transporte', valores:'Dinero y Valores',
};

export function buildCoberturaTableHTML(rvList, moneda) {
  if(!rvList || !rvList.length) return '';
  rvList = rvList.map(r => ({ ...r, concepto: CONCEPTO_LABEL[r.concepto] || r.concepto || 'Cobertura' }));
  const fN = n => fmtMXN(n || 0);

  const calc = rvList.map(r => {
    const bruta    = r.monto || 0;
    const perdida  = r.monto_perdida_estimada || r.monto || 0;
    const dep      = r.depreciacion_pct  || 0;
    const ded      = r.deducible         || 0;
    const coasPct  = r.coaseguro_pct     || 0;
    const coas     = r.monto_coaseguro   || ((perdida - ded) * (coasPct / 100));
    const bajo     = r.monto_bajo_seguro || 0;
    const neta     = perdida - bajo - ded - coas;
    return { r, bruta, perdida, dep, ded, coasPct, coas, bajo, neta, indemniz: perdida - ded };
  });

  let totBruta=0, totPerdida=0, totDed=0, totCoas=0, totBajo=0, totNeta=0;
  calc.forEach(x => { totBruta+=x.bruta; totPerdida+=x.perdida; totDed+=x.ded; totCoas+=x.coas; totBajo+=x.bajo; totNeta+=x.neta; });

  const th  = (t, extra='') => `<th style="background:#1F3864;color:#fff;font-size:9px;font-weight:700;padding:4px 7px;border:1px solid #1F3864;text-align:center;${extra}">${t}</th>`;
  const td  = (t, bg='#fff', bold=false, right=false) =>
    `<td style="border:1px solid #ccc;padding:3px 7px;font-size:9px;background:${bg};font-weight:${bold?'700':'400'};text-align:${right?'right':'left'};">${t}</td>`;

  const showTotal = rvList.length > 1;

  const rows = calc.map(x => `<tr>
    ${td(x.r.concepto)}
    ${td(fN(x.bruta),    '#fff', false, true)}
    ${td(fN(x.perdida),  '#fff', false, true)}
    ${td(x.dep ? x.dep+'%' : '—', '#fff', false, true)}
    ${td(fN(x.ded),      '#fff', false, true)}
    ${td(x.coasPct ? x.coasPct+'%' : '—', '#fff', false, true)}
    ${td(fN(x.coas),     '#fff', false, true)}
    ${td(fN(x.bajo),     '#fff', false, true)}
    ${td(fN(x.neta),     '#eaf4fb', true, true)}
  </tr>`).join('');

  const totalRow = showTotal ? `<tr>
    ${td('<strong>TOTAL</strong>', '#f0f4f8')}
    ${td(fN(totBruta),   '#f0f4f8', true, true)}
    ${td(fN(totPerdida), '#f0f4f8', true, true)}
    ${td('—',            '#f0f4f8', false, true)}
    ${td(fN(totDed),     '#f0f4f8', true, true)}
    ${td('—',            '#f0f4f8', false, true)}
    ${td(fN(totCoas),    '#f0f4f8', true, true)}
    ${td(fN(totBajo),    '#f0f4f8', true, true)}
    ${td(fN(totNeta),    '#d0eaf8', true, true)}
  </tr>` : '';

  return `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr>
      ${th('Cobertura')}${th('Suma Aseg.')}${th('Pérd. Est.')}${th('Dep.')}
      ${th('Deducible')}${th('Coas.')}${th('Coas. $')}${th('Bajo Seg.')}${th('Pérd. Neta')}
    </tr></thead>
    <tbody>${rows}${totalRow}</tbody>
  </table>`;
}

// ============================================================
// CATÁLOGOS — Aseguradoras
// ============================================================
export async function guardarAseguradora() {
  const id = v('ae-id');
  const d2 = {
    clave:          v('ae-clave'),
    nombre:         v('ae-nombre'),
    telefono:       v('ae-tel'),
    correo:         v('ae-email'),
    notas:          v('ae-notas'),
    codigo_sistema: v('ae-codigo') || null,
  };
  if(id){ await db.from('aseguradoras').update(d2).eq('id', id); toast('Aseguradora actualizada.'); }
  else  { await db.from('aseguradoras').insert(d2);              toast('Aseguradora creada.');     }
  cerrarModal('modal-aseg');
  await loadAll();
}

export function editarAseguradora(id) {
  const a = data.aseg.find(x => x.id === id); if(!a) return;
  g('ae-id').value     = a.id;
  g('ae-clave').value  = a.clave   || '';
  g('ae-nombre').value = a.nombre  || '';
  g('ae-tel').value    = a.telefono || '';
  g('ae-email').value  = a.correo  || '';
  g('ae-notas').value  = a.notas   || '';
  g('ae-codigo').value = a.codigo_sistema || '';
  g('modal-aseg').classList.add('open');
}

// ============================================================
// CATÁLOGOS — Asegurados
// ============================================================
export async function guardarAsegurado() {
  const id = v('ad-id');
  const d2 = {
    nombre:    v('ad-nombre'),
    rfc:       v('ad-rfc')   || null,
    tipo:      v('ad-tipo'),
    telefono:  v('ad-tel')   || null,
    correo:    v('ad-email') || null,
    direccion: v('ad-dir')   || null,
  };
  if(id){ await db.from('asegurados').update(d2).eq('id', id); toast('Asegurado actualizado.'); }
  else  { await db.from('asegurados').insert(d2);              toast('Asegurado creado.');     }
  cerrarModal('modal-asdo');
  await loadAll();
}

export function editarAsegurado(id) {
  const a = data.asdo.find(x => x.id === id); if(!a) return;
  g('ad-id').value     = a.id;
  g('ad-nombre').value = a.nombre    || '';
  g('ad-rfc').value    = a.rfc       || '';
  g('ad-tel').value    = a.telefono  || '';
  g('ad-email').value  = a.correo    || '';
  g('ad-dir').value    = a.direccion || '';
  g('ad-tipo').value   = a.tipo      || 'moral';
  g('modal-asdo').classList.add('open');
}

export function renderAsegurados() {
  g('asdo-body').innerHTML = data.asdo.map(a => `<tr>
    <td><strong>${a.nombre}</strong></td>
    <td>${a.rfc || '—'}</td>
    <td>${a.tipo === 'fisica' ? 'Persona física' : 'Persona moral'}</td>
    <td>${a.telefono || '—'}</td>
    <td>${a.correo   || '—'}</td>
    <td><div class="td-acts">
      <button class="btn btn-sm" onclick="editarAsegurado(${a.id})">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="eliminar('asegurados',${a.id})">Eliminar</button>
    </div></td>
  </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin asegurados.</td></tr>';
}

// ============================================================
// CATÁLOGOS — Contactos
// ============================================================
export async function guardarContacto() {
  const id = v('co-id') || null;
  const d2 = {
    nombre:         v('co-nombre'),
    cargo:          v('co-cargo')  || null,
    tipo:           v('co-tipo'),
    id_aseguradora: parseInt(v('co-aseg')) || null,
    id_asegurado:   parseInt(v('co-asdo')) || null,
    telefono:       v('co-tel')   || null,
    correo:         v('co-email') || null,
  };
  if(id){ await db.from('contactos').update(d2).eq('id', id); toast('Contacto actualizado.'); }
  else  { await db.from('contactos').insert(d2);              toast('Contacto creado.');     }
  cerrarModal('modal-cont');
  await loadAll();
}

export function renderContactos() {
  g('cont-body').innerHTML = data.cont.map(c => {
    const aseg = data.aseg.find(a => a.id === c.id_aseguradora);
    const asdo = data.asdo.find(a => a.id === c.id_asegurado);
    return `<tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.cargo || '—'}</td>
      <td><span style="font-size:11px;${c.tipo==='funcionario_cia'?'color:var(--accent-lt);font-weight:600;':''}">${c.tipo==='funcionario_cia'?'Funcionario compañía':c.tipo||'General'}</span></td>
      <td>${aseg ? aseg.nombre : asdo ? asdo.nombre : '—'}</td>
      <td>${c.telefono || '—'}</td>
      <td>${c.correo   || '—'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminar('contactos',${c.id})">Eliminar</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="empty">Sin contactos.</td></tr>';
}

// ============================================================
// CATÁLOGOS — Tipos de cambio
// ============================================================
export async function guardarTC() {
  const d2 = {
    moneda:   v('tc-mon'),
    tasa_mxn: parseFloat(v('tc-tasa')) || 0,
    fecha:    v('tc-fecha') || null,
    fuente:   v('tc-fuente') || null,
  };
  await db.from('tipos_cambio').insert(d2);
  toast('Tipo de cambio registrado.');
  cerrarModal('modal-tc');
  await loadAll();
}

export function renderTC() {
  g('tc-body').innerHTML = data.tc.map(t => `<tr>
    <td><span class="badge ${MON_CLS[t.moneda] || ''}">${t.moneda}</span></td>
    <td><strong>${t.tasa_mxn}</strong></td>
    <td>${fmtD(t.fecha)}</td>
    <td>${t.fuente || '—'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="eliminar('tipos_cambio',${t.id})">Eliminar</button></td>
  </tr>`).join('') || '<tr><td colspan="5" class="empty">Sin tipos de cambio.</td></tr>';
}

// ── Helper local ─────────────────────────────────────────────────────
function cerrarModal(id) {
  const el = g(id);
  if(el) el.classList.remove('open');
}

export const polizaPublic = {};
