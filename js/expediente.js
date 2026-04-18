import { EST, MON_CLS, HON_EST, CONCEPTO_LABEL, INF_TIPOS } from './config.js';
import { data, currentSin } from './state.js';
import * as state from './state.js';
import { g, v, toast, fmtD, fmtMXN, toMXN } from './ui.js';
import { db, loadAll, renderAll } from './db.js';
import { loadRteSin, syncRteSin, loadBienesRte, loadSinLimTexto, loadSinGiroAseg, loadSinDescAseg } from './rte.js';
import { offlineSaveSiniestro } from './offline.js';
import { cerrarModal } from './modal.js';
import { renderDash, renderSiniestros, reservaVigente, renderTodoGrid } from './dashboard.js';
import { renderGrafGallery } from './graf.js';
import { renderSolicitudesTab } from './solicitudes.js';
import { switchMain } from './nav.js';
import { previsualizarReporte, buildCoberturaTableHTML } from './reportes.js';
import { resetBuscadorSinModal, seleccionarAseguradoSin, seleccionarPolizaSin } from './modal.js';

export function verSiniestro(id){
  state.currentSin = data.sin.find(s=>s.id===id);
  if(!state.currentSin) return;
  g('sin-list-view').style.display='none';
  const dv=g('sin-detail-view'); dv.style.display='block';
  renderDetalle();
}

export function irAExpediente(id){
  switchMain('siniestros', document.getElementById('nav-siniestros'));
  verSiniestro(id);
}

export function renderDetalle(){
  const s=currentSin;
  const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
  const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
  const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{};
  const rv=reservaVigente(s.id);
  const pags=data.pag.filter(p=>p.id_siniestro===s.id).reduce((a,p)=>a+toMXN(p.monto,p.moneda,p.tipo_cambio_mxn),0);
  const hons=data.hon.filter(h=>h.id_siniestro===s.id).reduce((a,h)=>a+toMXN(h.monto,h.moneda,h.tipo_cambio_mxn),0);
  const viats=data.viat.filter(v=>v.id_siniestro===s.id).reduce((a,v2)=>a+toMXN(v2.monto,v2.moneda,v2.tipo_cambio_mxn),0);
  const saldo=rv-pags;
  const exp=rv+hons+viats;

  g('sin-detail-view').innerHTML=`
  <button class="back-btn" onclick="volverLista()">← Volver a expedientes</button>
  <div class="exp-header">
    <div>
      <div class="exp-title">${s.numero_exp}</div>
      <div class="exp-sub">${asdo.nombre||'—'} &mdash; ${aseg.nombre||'—'} &mdash; ${s.tipo_siniestro||'—'}</div>
      ${s.numero_siniestro?'<div style="font-size:11px;color:var(--text-sec);margin-top:3px;">No. siniestro: <strong style="color:var(--text)">'+s.numero_siniestro+'</strong></div>':''}
      ${s.tramite_gnp?'<div style="font-size:11px;margin-top:2px;">Trámite GNP: <strong style="color:#ffcc80;">'+s.tramite_gnp+'</strong>'+(s.gnp_jefe_depto?' &nbsp;·&nbsp; Jefe Depto: <span style="color:var(--text-sec)">'+s.gnp_jefe_depto+'</span>':'')+'</div>':''}
      ${s.ot?'<div style="font-size:11px;margin-top:2px;">OT Atlas: <strong style="color:#90caf9;">'+s.ot+'</strong>'+(s.atlas_poliza_coaseg?' &nbsp;·&nbsp; Póliza Atlas: <span style="color:var(--text-sec)">'+s.atlas_poliza_coaseg+'</span>':'')+'</div>':''}
      ${renderAjustBadges(s.id)}
      <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:var(--text-ter);">Estatus:</span>
        <select onchange="cambiarEstatus(this.value)" style="font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid var(--border-md);background:var(--surface2);color:var(--text);font-family:inherit;cursor:pointer;">
          ${Object.entries(EST).map(([k,v])=>`<option value="${k}" ${s.estatus===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-sm" onclick="editarSiniestro(${s.id})">Editar expediente</button>
    </div>
  </div>
  <div class="fin-grid">
    <div class="fin-card"><div class="fin-lbl">Reserva vigente</div><div class="fin-val info">${fmtMXN(rv)}</div></div>
    <div class="fin-card"><div class="fin-lbl">Pagos acumulados</div><div class="fin-val">${fmtMXN(pags)}</div></div>
    <div class="fin-card"><div class="fin-lbl">Saldo técnico</div><div class="fin-val ${saldo>0?'warn':'ok'}">${fmtMXN(saldo)}</div></div>
    <div class="fin-card"><div class="fin-lbl">Exposición total</div><div class="fin-val warn">${fmtMXN(exp)}</div></div>
  </div>
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab2('t-res',this)">Reservas</button>
    <button class="tab-btn" onclick="switchTab2('t-pag',this)">Pagos</button>
    <button class="tab-btn" onclick="switchTab2('t-hon',this)">Honorarios</button>
    <button class="tab-btn" onclick="switchTab2('t-viat',this)">Viáticos</button>
    <button class="tab-btn" onclick="switchTab2('t-act',this)">Actividades</button>
    <button class="tab-btn" onclick="switchTab2('t-todo',this)">📋 ToDos</button>
    <button class="tab-btn" onclick="switchTab2('t-bit',this)">Bitácora</button>
    <button class="tab-btn" onclick="switchTab2('t-inf',this)">Informes</button>
    <button class="tab-btn" onclick="switchTab2('t-coas',this)">Coaseguro</button>
    <button class="tab-btn" onclick="switchTab2('t-ajust-sin',this)">Ajustadores</button>
    <button class="tab-btn" onclick="switchTab2('t-doc',this)">Documentos</button>
    <button class="tab-btn" onclick="switchTab2('t-notas',this)">📝 Notas</button>
    <button class="tab-btn" onclick="switchTab2('t-graf',this)">📷 Gráficos</button>
    <button class="tab-btn" onclick="switchTab2('t-sol',this);renderSolicitudesTab()">📋 Solicitudes</button>
  </div>

  <div id="t-res" class="tab-pane active" style="overflow-y:auto;max-height:calc(100vh - 420px);">
    <div class="toolbar" style="align-items:center;gap:10px;">
      <button class="btn btn-primary" onclick="abrirModal('modal-res')">+ Nueva cobertura</button>
      <span style="font-size:11px;color:var(--text-ter);">Hasta 4 coberturas por siniestro</span>
    </div>
    <!-- Cuadrícula de coberturas -->
    <div id="res-grid-wrap" style="overflow-x:auto;width:100%;"></div>
    <!-- Tabla detalle clásica (oculta por defecto cuando hay grid) -->
    <div id="res-table-wrap" style="margin-top:12px;">
      <div class="tbl-wrap"><table><thead><tr><th>Cobertura</th><th>Reserva bruta</th><th>Pérdida estimada</th><th>Deducible</th><th>Coaseguro %</th><th>Reserva neta</th><th>Moneda</th><th>Fecha</th><th></th></tr></thead>
      <tbody id="res-body"></tbody></table></div>
    </div>
  </div>
  <div id="t-pag" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-pago')">+ Nuevo pago</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Tipo</th><th>Beneficiario</th><th>Monto</th><th>Moneda</th><th>Base MXN</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${renderSubTable(data.pag.filter(p=>p.id_siniestro===s.id),'pago',['tipo','beneficiario','monto','moneda','monto_base_mxn','fecha'])}</tbody></table></div>
  </div>
  <div id="t-hon" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-hon')">+ Nuevo honorario</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Concepto</th><th>Pactado</th><th>Pagado</th><th>Moneda</th><th>Estatus</th><th>Fecha pacto</th><th></th></tr></thead>
    <tbody>${renderSubTable(data.hon.filter(h=>h.id_siniestro===s.id),'hon',['concepto','monto','pagado','moneda','estatus','fecha_pacto'])}</tbody></table></div>
  </div>
  <div id="t-viat" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-viat')">+ Nuevo viático</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Descripción</th><th>Monto</th><th>Moneda</th><th>Base MXN</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${renderSubTable(data.viat.filter(v=>v.id_siniestro===s.id),'viat',['descripcion','monto','moneda','monto_base_mxn','fecha'])}</tbody></table></div>
  </div>
  <div id="t-act" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-act')">+ Nueva actividad</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Tipo</th><th>Fecha</th><th>Descripción</th><th></th></tr></thead>
    <tbody>${renderSubTable(data.act.filter(a=>a.id_siniestro===s.id),'act',['tipo','fecha','descripcion'])}</tbody></table></div>
  </div>
  <div id="t-todo" class="tab-pane">
    <div class="toolbar" style="align-items:center;gap:10px;">
      <button class="btn btn-primary" onclick="abrirModal('modal-todo')">+ Nuevo ToDo</button>
      <span style="font-size:11px;color:var(--text-ter);">Actividades pendientes con fecha límite</span>
    </div>
    <div id="todo-grid-${s.id}"></div>
  </div>
  <div id="t-bit" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-bit')">+ Nueva nota</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Tiempo</th><th>Nota de actividad</th><th></th></tr></thead>
    <tbody>${renderBitacoraRows(data.bit.filter(b=>b.id_siniestro===s.id))}</tbody></table></div>
  </div>
  <div id="t-inf" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-inf')">+ Nuevo informe</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Tipo</th><th>Versión</th><th>Fecha envío</th><th>Hora</th><th>Destinatario</th><th>Asunto</th><th></th></tr></thead>
    <tbody>${renderInformesRows(data.inf.filter(i=>i.id_siniestro===s.id))}</tbody></table></div>
  </div>
  <div id="t-coas" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-coas')">+ Nueva coaseguradora</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Compañía</th><th>Participación %</th><th>Reserva neta</th><th>Moneda</th><th>Rol</th><th></th></tr></thead>
    <tbody>${renderCoasRows(data.coas.filter(c=>c.id_siniestro===s.id))}</tbody></table></div>
  </div>
  <div id="t-doc" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-doc')">+ Nuevo documento</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Tipo</th><th>Versión</th><th>Archivo</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${renderSubTable(data.doc.filter(d=>d.id_siniestro===s.id),'doc',['tipo','numero_version','nombre_archivo','fecha'])}</tbody></table></div>
  </div>
  <div id="t-graf" class="tab-pane" style="overflow-y:auto;max-height:calc(100vh - 420px);">
    <div style="padding:10px 0;">
      <!-- Upload zone -->
      <div id="graf-upload-area" style="border:2px dashed var(--border-hi);border-radius:var(--r);padding:20px 24px;text-align:center;margin-bottom:14px;transition:border-color .2s,background .2s;"
        ondragover="event.preventDefault();this.style.borderColor='var(--accent-lt)';this.style.background='rgba(100,160,255,.05)'"
        ondragleave="this.style.borderColor='var(--border-hi)';this.style.background=''"
        ondrop="grafOnDrop(event)">
        <div style="font-size:24px;margin-bottom:6px;">📷</div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">Agregar imagen al expediente</div>
        <div style="font-size:11px;color:var(--text-ter);margin-bottom:10px;">
          Arrastra imágenes aquí o usa el botón. Puedes seleccionar varias a la vez.<br>
          Deberás indicar el <strong>tipo</strong> y una <strong>descripción</strong> para cada imagen antes de subir.
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="g('graf-file-input').click()">Seleccionar imagen(es)…</button>
        <input type="file" id="graf-file-input" accept="image/jpeg,image/png,image/jpg,image/gif" multiple style="display:none" onchange="grafOnFileSelect(this)">
      </div>
      <!-- Queue -->
      <div id="graf-queue" style="display:none;margin-bottom:16px;"></div>
      <!-- Filter bar -->
      <div id="graf-filter-bar" style="display:none;display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        <button type="button" class="btn btn-sm" id="graf-f-all"    onclick="grafFiltrar('all')"             style="font-size:11px;">Todos</button>
        <button type="button" class="btn btn-sm" id="graf-f-loc"    onclick="grafFiltrar('localizacion')"     style="font-size:11px;">🗺 Localización</button>
        <button type="button" class="btn btn-sm" id="graf-f-insp"   onclick="grafFiltrar('foto_inspeccion')"  style="font-size:11px;">🔍 Inspección</button>
        <button type="button" class="btn btn-sm" id="graf-f-aseg"   onclick="grafFiltrar('foto_asegurado')"   style="font-size:11px;">👤 Asegurado</button>
        <button type="button" class="btn btn-sm" id="graf-f-bien"   onclick="grafFiltrar('foto_bien')"        style="font-size:11px;">📦 Bien asegurado</button>
      </div>
      <!-- Gallery -->
      <div id="graf-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;"></div>
      <div id="graf-empty" style="display:none;font-size:12px;color:var(--text-ter);padding:8px 0;">Sin imágenes registradas para este expediente.</div>
    </div>
  </div>
  <div id="t-sol" class="tab-pane" style="overflow-y:auto;max-height:calc(100vh - 420px);">
    <div style="padding:10px 0;" id="sol-tab-content">
      <div style="font-size:12px;color:var(--text-ter);padding:20px;text-align:center;">Cargando solicitudes…</div>
    </div>
  </div>
  <div id="t-ajust-sin" class="tab-pane">
    <div class="toolbar"><button class="btn btn-primary" onclick="abrirModal('modal-sin-ajust')">+ Asignar ajustador</button></div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>Ajustador</th><th>Iniciales</th><th>Rol</th><th>Oficina</th><th>Correo</th><th>Teléfono</th><th>Fecha asignación</th><th></th>
    </tr></thead>
    <tbody>${renderSinAjustRows(data.sinajust.filter(a=>a.id_siniestro===s.id))}</tbody></table></div>
  </div>
  <div id="t-notas" class="tab-pane" style="overflow-y:auto;max-height:calc(100vh - 420px);">
    <div style="padding:12px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-ter);text-transform:uppercase;letter-spacing:.07em;">Notas internas</div>
        <button class="btn btn-sm" onclick="editarSiniestro(${s.id})" style="font-size:11px;">✏️ Editar</button>
      </div>
      ${s.notas
        ? `<pre style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px;font-size:12px;color:var(--text-sec);white-space:pre-wrap;line-height:1.6;font-family:inherit;margin:0;">${s.notas}</pre>`
        : `<div style="color:var(--text-ter);font-size:12px;padding:20px 0;">Sin notas internas.</div>`}
    </div>
  </div>`;
  // Render the coberturas grid after DOM is set
  renderReservaGrid(data.res.filter(r=>r.id_siniestro===s.id));
  // Render ToDos grid
  const todoWrap = g('todo-grid-'+s.id);
  if(todoWrap) renderTodoGrid(data.todos.filter(t=>t.id_siniestro===s.id), todoWrap);
  renderGrafGallery(s.id);
}

export function renderSubTable(rows,type,cols){
  if(!rows.length) return `<tr><td colspan="${cols.length+1}" class="empty">Sin registros.</td></tr>`;
  return rows.map(r=>{
    const cells=cols.map(c=>{
      let val=r[c];
      if(c==='monto'||c==='monto_base_mxn'||c==='pagado') val=fmtMXN(val);
      else if(c==='fecha'||c==='fecha_pacto') val=fmtD(val);
      else if(c==='moneda') val=`<span class="badge ${MON_CLS[val]||''}">${val||'—'}</span>`;
      else if(c==='estatus') val=`<span class="badge ${HON_EST[val]||''}">${val||'—'}</span>`;
      else val=val||'—';
      return `<td>${val}</td>`;
    }).join('');
    return `<tr>${cells}<td><button class="btn btn-sm btn-danger" onclick="eliminar('${tableFor(type)}',${r.id})">Eliminar</button></td></tr>`;
  }).join('');
}

export function tableFor(t){ return {res:'reservas',pago:'pagos',hon:'honorarios',viat:'viaticos',act:'actividades',doc:'documentos'}[t]; }

export function renderBitacoraRows(rows){
  if(!rows.length) return `<tr><td colspan="5" class="empty">Sin notas registradas.</td></tr>`;
  return rows.map(r=>{
    const tiempo=`${r.horas||0}h ${r.minutos||0}min`;
    return `<tr>
      <td>${fmtD(r.fecha)}</td>
      <td>${r.hora?r.hora.slice(0,5):'—'}</td>
      <td><span style="background:var(--surface2);padding:2px 8px;border-radius:6px;font-size:11px;">${tiempo}</span></td>
      <td style="max-width:400px;white-space:pre-wrap;line-height:1.5;">${r.nota||'—'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminar('bitacora_ajustador',${r.id})">Eliminar</button></td>
    </tr>`;}).join('');
}

export function normConcepto(c){ return CONCEPTO_LABEL[c]||c||'Cobertura'; }

export function renderReservaGrid(allRows){
  const wrap    = g('res-grid-wrap');
  const tblWrap = g('res-table-wrap');
  if(!wrap) return;

  const vigMap={};
  allRows.forEach(r=>{ if(!vigMap[r.concepto]||r.id>vigMap[r.concepto].id) vigMap[r.concepto]=r; });
  const rows = Object.values(vigMap);

  if(!rows.length){
    wrap.innerHTML='';
    if(tblWrap) tblWrap.style.display='block';
    return;
  }

  const fN = n=>fmtMXN(n||0);
  let totBruta=0, totPerdida=0, totDed=0, totCoas=0, totBajo=0, totNeta=0;
  const calc = rows.map(r=>{
    const bruta   = r.monto||0;
    const perdida = r.monto_perdida_estimada||r.monto||0;
    const dep     = r.depreciacion_pct||0;
    const ded     = r.deducible||0;
    const coasPct = r.coaseguro_pct||0;
    const coas    = r.monto_coaseguro||((perdida-ded)*(coasPct/100));
    const bajo    = r.monto_bajo_seguro||0;
    const neta    = perdida-bajo-ded-coas;
    totBruta+=bruta; totPerdida+=perdida; totDed+=ded; totCoas+=coas; totBajo+=bajo; totNeta+=neta;
    return {r, bruta, perdida, dep, ded, coasPct, coas, bajo, neta};
  });

  const moneda   = rows[0]?.moneda||'MXN';
  const showTotal = rows.length > 1;
  const labelW   = 180;
  const colW     = 160;

  let html = `<div style="overflow-x:auto;"><table style="border-collapse:collapse;font-size:12px;width:100%;">
  <thead><tr>
    <th style="padding:8px 12px;text-align:left;border-bottom:2px solid var(--border-hi);color:var(--text-sec);font-weight:600;min-width:${labelW}px;">Concepto</th>`;
  calc.forEach(item=>{
    html += `<th style="padding:8px 12px;text-align:center;border-bottom:2px solid var(--accent-lt);color:var(--accent-lt);font-weight:600;min-width:${colW}px;">${normConcepto(item.r.concepto)}</th>`;
  });
  if(showTotal) html += `<th style="padding:8px 12px;text-align:center;border-bottom:2px solid var(--border-hi);color:var(--text-sec);font-weight:700;min-width:${colW}px;">TOTAL</th>`;
  html += `</tr></thead><tbody>`;

  const ROWS_DEF = [
    { label:'Reserva bruta',              key:'bruta',    fmt:'money', tot:totBruta                  },
    { label:'Depreciación %',             key:'dep',      fmt:'pct',   tot:''                        },
    { label:'Monto Pérdida Ajustada',     key:'perdida',  fmt:'money', tot:totPerdida                },
    { label:'Deducible',                  key:'ded',      fmt:'money', tot:totDed                    },
    { label:'Monto Pérdida Indemnizable', key:'indemniz', fmt:'money', tot:totPerdida-totDed         },
    { label:'Coaseguro a cargo del Asegurado', key:'coas',     fmt:'money', tot:totCoas                   },
    { label:'Bajo Seguro',                key:'bajo',     fmt:'money', tot:totBajo                   },
    { label:'Reserva Neta',               key:'neta',     fmt:'money', tot:totNeta, bold:true, accent:true },
  ];

  ROWS_DEF.forEach((rd, ri)=>{
    const rowStyle = rd.accent
      ? 'background:var(--surface2);border-top:2px solid var(--accent);'
      : ri%2===0 ? 'background:var(--surface);' : 'background:var(--bg2);';
    const labelStyle = `${rowStyle}padding:6px 12px;border-bottom:1px solid var(--border);font-weight:${rd.bold?'700':'400'};color:var(--text);white-space:nowrap;`;
    const valStyle   = `${rowStyle}padding:6px 12px;border-bottom:1px solid var(--border);text-align:right;font-weight:${rd.bold?'700':'400'};color:${rd.accent?'var(--accent-lt)':'var(--text)'};`;
    html += `<tr><td style="${labelStyle}">${rd.label}</td>`;
    calc.forEach(item=>{
      let val = rd.key==='indemniz' ? item.perdida-item.ded : item[rd.key];
      const disp = rd.fmt==='pct'
        ? (val===0?'—':val.toFixed(2)+'%')
        : (val===0&&rd.key!=='ded'&&rd.key!=='coas'&&rd.key!=='bajo'?'—':(moneda+' '+fN(val)));
      html += `<td style="${valStyle}">${disp}</td>`;
    });
    if(showTotal){
      const tDisp = rd.fmt==='pct' ? '—' : (rd.tot===''||rd.tot===0&&rd.key!=='ded'&&rd.key!=='coas'?'—':(moneda+' '+fN(rd.tot)));
      html += `<td style="${valStyle}font-weight:700;">${tDisp}</td>`;
    }
    html += `</tr>`;
  });

  html += `<tr><td style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-sec);">Bases de la reserva</td>`;
  calc.forEach(item=>{
    html += `<td style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-sec);">${item.r.bases_determinacion||'—'}</td>`;
  });
  if(showTotal) html += `<td style="border-bottom:1px solid var(--border);"></td>`;
  html += `</tr>`;

  html += `<tr><td style="padding:6px 12px;font-size:11px;color:var(--text-ter);">Acciones</td>`;
  calc.forEach(item=>{
    html += `<td style="padding:6px 12px;text-align:center;"><button class="btn btn-sm btn-danger" onclick="eliminar('reservas',${item.r.id})">Eliminar</button></td>`;
  });
  if(showTotal) html += `<td></td>`;
  html += `</tr></tbody></table></div>`;

  wrap.innerHTML = html;
  if(tblWrap) tblWrap.style.display='none';
}

export function renderReservaRows(rows){
  if(!rows.length) return `<tr><td colspan="9" class="empty">Sin coberturas registradas.</td></tr>`;
  return rows.map(r=>{
    const perdida=r.monto_perdida_estimada||r.monto||0;
    const ded=r.deducible||0;
    const coasMonto=r.monto_coaseguro||(((perdida-ded)*(r.coaseguro_pct||0))/100);
    const bajo=r.monto_bajo_seguro||0;
    const neta=perdida-bajo-ded-coasMonto;
    return `<tr>
      <td>${r.concepto||'—'}</td>
      <td style="text-align:right;">${fmtMXN(r.monto)}</td>
      <td style="text-align:right;">${fmtMXN(perdida)}</td>
      <td style="text-align:right;">${fmtMXN(ded)}</td>
      <td style="text-align:center;">${r.coaseguro_pct||0}%</td>
      <td style="text-align:right;font-weight:600;">${fmtMXN(neta)}</td>
      <td><span class="badge ${MON_CLS[r.moneda]||''}">${r.moneda}</span></td>
      <td>${fmtD(r.fecha)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminar('reservas',${r.id})">Eliminar</button></td>
    </tr>`;}).join('');
}

export function renderAjustBadges(sinId){
  const ROLES={responsable:'Resp.',apoyo:'Apoyo',supervisor:'Sup.',perito:'Perito'};
  const rows=data.sinajust.filter(a=>a.id_siniestro===sinId);
  if(!rows.length) return '';
  const tags=rows.map(a=>{
    const aj=data.ajust.find(x=>x.id===a.id_ajustador)||{};
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border-md);border-radius:6px;padding:2px 8px;font-size:11px;">'
      +'<strong style="color:var(--accent-lt);">'+(aj.iniciales||aj.nombre||'?')+'</strong>'
      +'<span style="color:var(--text-ter);">'+(ROLES[a.rol]||a.rol)+'</span>'
      +'</span>';
  }).join('');
  return '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">'
    +'<span style="font-size:11px;color:var(--text-ter);margin-right:2px;">Ajustadores:</span>'+tags+'</div>';
}

export function renderSinAjustRows(rows){
  if(!rows.length) return `<tr><td colspan="8" class="empty">Sin ajustadores asignados.</td></tr>`;
  const ROLES={responsable:'Responsable',apoyo:'Apoyo',supervisor:'Supervisor',perito:'Perito'};
  return rows.map(r=>{
    const aj=data.ajust.find(a=>a.id===r.id_ajustador)||{};
    const ofic=aj.id_oficina?.nombre||data.ofic.find(o=>o.id===aj.id_oficina)?.nombre||'—';
    return `<tr>
      <td><strong>${aj.nombre||'—'}</strong></td>
      <td><span class="badge b-informe">${aj.iniciales||'—'}</span></td>
      <td>${ROLES[r.rol]||r.rol||'—'}</td>
      <td>${ofic}</td>
      <td style="font-size:11px;">${aj.correo||'—'}</td>
      <td style="font-size:11px;">${aj.telefono||'—'}</td>
      <td>${fmtD(r.fecha_asignacion)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminar('siniestro_ajustadores',${r.id})">Quitar</button></td>
    </tr>`;}).join('');
}

export function renderCoasRows(rows){
  if(!rows.length) return `<tr><td colspan="6" class="empty">Sin coaseguradoras registradas.</td></tr>`;
  return rows.map(r=>`<tr>
    <td><strong>${r.nombre||'—'}</strong></td>
    <td style="text-align:center;">${r.porcentaje||0}%</td>
    <td style="text-align:right;">${fmtMXN(r.reserva_neta)}</td>
    <td><span class="badge ${MON_CLS[r.moneda]||''}">${r.moneda}</span></td>
    <td>${r.es_lider?'<span class="badge b-asignado">Líder</span>':'Participante'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="eliminar('coaseguradoras',${r.id})">Eliminar</button></td>
  </tr>`).join('');
}

export function renderInformesRows(rows){
  if(!rows.length) return `<tr><td colspan="8" class="empty">Sin informes registrados.</td></tr>`;
  return rows.map(r=>`<tr>
    <td><strong>${INF_TIPOS[r.tipo]||r.tipo}</strong></td>
    <td><span style="background:var(--surface2);padding:2px 8px;border-radius:6px;font-size:11px;">v${r.numero_version}</span></td>
    <td>${fmtD(r.fecha_envio)}</td>
    <td>${r.hora_envio?r.hora_envio.slice(0,5):'—'}</td>
    <td>${r.destinatario||'—'}</td>
    <td>${r.asunto||'—'}</td>
    <td>
      <button class="btn btn-sm" onclick="generarDesdeInforme(${r.id})" title="Generar PDF/Word de este informe">📄 Generar</button>
    </td>
    <td><button class="btn btn-sm btn-danger" onclick="eliminar('informes',${r.id})">Eliminar</button></td>
  </tr>`).join('');
}

export function generarDesdeInforme(infId){
  if(!currentSin) return;
  const inf = data.inf.find(i=>i.id===infId);
  if(!inf){ toast('Informe no encontrado.'); return; }
  switchMain('reportes', document.getElementById('nav-reportes'));
  setTimeout(()=>{
    const sel = g('r-caso');
    if(sel){
      sel.value = currentSin.id;
      sel.dataset.infId = infId;
      previsualizarReporte();
    }
  }, 100);
  toast('Expediente seleccionado en Reportes. Usa los botones de generación.');
}

export function toggleBitOtro(){
  g('bit-otro-wrap').style.display = v('bit-tipo')==='__otro__' ? 'block' : 'none';
}

export function toggleRamoOtro(){
  g('ramo-otro-wrap').style.display = v('p-ramo')==='__otro__' ? 'block' : 'none';
}

export function actualizarCamposAseg(){
  const sel = g('s-aseg-direct');
  const asegId = parseInt(sel.value);
  const aseg = data.aseg.find(a=>a.id===asegId)||{};
  const cod = (aseg.codigo_sistema||'').toUpperCase();

  {let _e=g('seccion-gnp');   if(_e) _e.style.display = cod==='GNP'   ? 'block' : 'none';}
  {let _e=g('seccion-atlas');  if(_e) _e.style.display = cod==='ATLAS'  ? 'block' : 'none';}
  const noGnpSec = g('seccion-no-gnp');
  if(noGnpSec) noGnpSec.style.display = cod==='GNP' ? 'none' : 'block';
  const introWrap = g('s-introduccion-wrap');
  if(introWrap) introWrap.style.display = cod==='GNP' ? 'none' : 'block';

  if(cod!=='GNP'){ ['s-tramite-gnp','s-gnp-clave-ajust','s-gnp-jefe','s-gnp-oficina'].forEach(f=>{ if(g(f)) g(f).value=''; }); }
  if(cod!=='ATLAS'){ ['s-ot','s-atlas-poliza','s-atlas-sin-gnp','s-atlas-pol-gnp'].forEach(f=>{ if(g(f)) g(f).value=''; }); }

  const lbl=g('s-modo-captura-lbl');
  if(lbl){
    const modos={GNP:'Modo: GNP',ATLAS:'Modo: Atlas'};
    lbl.textContent=modos[cod]||'Modo: Institucional';
    lbl.style.color=cod==='GNP'?'#ffcc80':cod==='ATLAS'?'#90caf9':'var(--text-ter)';
  }

  const polFil = asegId ? data.pol.filter(p=>p.id_aseguradora===asegId) : data.pol;
  g('s-poliza').innerHTML='<option value="">— Sin póliza aún —</option>'+
    polFil.map(p=>`<option value="${p.id}">${p.numero}</option>`).join('');
}

export async function cambiarEstatus(nuevoEstatus){
  if(!currentSin) return;
  const {error} = await db.from('siniestros').update({estatus:nuevoEstatus}).eq('id',currentSin.id);
  if(error){ toast('Error al cambiar estatus: '+error.message); return; }
  currentSin.estatus = nuevoEstatus;
  const idx = data.sin.findIndex(s=>s.id===currentSin.id);
  if(idx>=0) data.sin[idx].estatus = nuevoEstatus;
  toast('Estatus: '+EST[nuevoEstatus]?.label);
  renderDash();
  renderSiniestros();
}

export function volverLista(){
  g('sin-detail-view').style.display='none';
  g('sin-list-view').style.display='block';
  state.currentSin = null;
}

export function switchTab2(id,btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  g(id).classList.add('active'); btn.classList.add('active');
}

export function renderEstimacionSinGrid(){
  const wrap = g('sin-estimacion-grid');
  if(!wrap || !currentSin) return;
  const rvs = data.res.filter(r=>r.id_siniestro===currentSin.id);
  if(!rvs.length){
    wrap.innerHTML='<div style="font-size:12px;color:var(--text-ter);padding:6px 0;">Sin coberturas de reserva registradas. Captura en la pestaña Reservas.</div>';
    return;
  }
  const pol=data.pol.find(p=>p.id===currentSin.id_poliza)||{};
  wrap.innerHTML=buildCoberturaTableHTML(rvs, pol.moneda||'MXN');
}

export async function guardarSiniestro(){
  const id=v('s-id');
  const d2={
    numero_exp:v('s-exp'), numero_siniestro:v('s-numsin')||null,
    id_poliza:parseInt(v('s-poliza'))||null,
    subramo:v('s-subramo')||null,
    tipo_siniestro:v('s-tipo')||null,
    causa:v('s-causa')||null,
    causa_comentario:v('s-causa-com')||null,
    riesgo_afectado:v('s-riesgo')||null,
    riesgos_cubiertos:v('s-riesgos-cubiertos')||null,
    localizacion_html:v('s-localizacion')||null,
    narracion_html:v('s-narracion')||null,
    naturaleza_alcance_danios:v('s-naturaleza-alcance')||null,
    referencia_ajustadora:v('s-exp')||null, clave_ajustador_cia:v('s-clave-ajust')||null,
    id_contacto_dest:parseInt(v('s-funcionario-dest'))||null,
    destinatario_nombre:v('s-dest-nombre')||null, destinatario_cargo:v('s-dest-cargo')||null,
    referencia_asegurado:v('s-ref-aseg')||null, giro_asegurado:v('s-giro')||null,
    descripcion:v('s-desc'), descripcion_riesgo:v('s-desc-riesgo')||null, introduccion:v('s-introduccion')||null, inspeccion_narrativa:v('s-inspeccion-narrativa')||null, notas:v('s-notas'),
    estatus:v('s-est'),
    fecha_siniestro:v('s-fsin')||null, hora_ocurrencia:v('s-hora-ocurr')||null,
    fecha_asignacion:v('s-fasig')||null, hora_asignacion:v('s-hora-asig')||null,
    fecha_primer_contacto:v('s-f1cont')||null, hora_primer_contacto:v('s-h1cont')||null,
    fecha_primera_visita:v('s-f1vis')||null, hora_primera_visita:v('s-h1vis')||null,
    fecha_inspeccion:v('s-finsp')||null, fecha_informe:v('s-finf')||null,
    inspeccion_persona:v('s-insp-persona')||null, inspeccion_cargo:v('s-insp-cargo')||null,
    inspeccion_telefono:v('s-insp-tel')||null, inspeccion_domicilio:v('s-insp-dom')||null,
    bienes_danados:v('s-bienes')||null,
    descripcion_danios_html:v('s-bienes')||null,
    bienes_amparados:v('s-bienes-amparados')||null,
    intervencion_autoridades:v('s-autoridades')==='1',
    intervencion_autoridades_detalle:v('s-autoridades-det')||null,
    salvamento:v('s-salvamento'),
    salvamento_valor_estimado:parseFloat(v('s-salv-valor'))||0,
    salvamento_detalle:v('s-salv-det')||null,
    salvamento_detalle_html:v('s-salv-det')||null,
    reclamacion_asegurado:v('s-reclamacion')||null,
    considerandos:v('s-considerandos')||null,
    recuperacion:v('s-recuperacion')==='1',
    recuperacion_terceros:v('s-rec-terceros')||null,
    recuperacion_detalle:v('s-rec-det')||null,
    coaseguro:v('s-coaseguro')==='1', coaseguro_detalle:v('s-coas-det')||null,
    reaseguro_clausula_control:v('s-reaseguro')==='1', reaseguro_corredor:v('s-reas-corredor')||null,
    estrategias:v('s-estrategias')||null,
    observaciones:v('s-observaciones')||null,
    actividades:v('s-actividades')||null,
    estrategias_observaciones:(()=>{
      const e=v('s-estrategias')||'';
      return e||null;
    })(),
    tramite_gnp:v('s-tramite-gnp')||null, ot:v('s-ot')||null,
    gnp_jefe_depto:v('s-gnp-jefe')||null,
    gnp_oficina:v('s-gnp-oficina')||null,
    gnp_clave_ajustador:v('s-gnp-clave-ajust')||null,
    clave_evento_catastrofico:v('s-clave-evento')||null,
    salvamento_persona_contacto:v('s-gnp-salv-persona')||null,
    salvamento_telefono:v('s-gnp-salv-tel')||null,
    salvamento_email:v('s-gnp-salv-email')||null,
    salvamento_movil:v('s-gnp-salv-movil')||null,
    salvamento_comprador:v('s-gnp-salv-comprador')||null,
    recuperacion_nombre_recuperador:v('s-gnp-rec-recuperador')||null,
    recuperacion_carta_porte:v('s-gnp-rec-carta-porte')||null,
    recuperacion_fecha_prescripcion:v('s-gnp-rec-prescripcion')||null,
    transporte_tipo:v('s-gnp-trans-tipo')||null,
    transporte_frontera:v('s-gnp-trans-frontera')||null,
    transporte_placa:v('s-gnp-trans-placa')||null,
    transporte_destino:v('s-gnp-trans-destino')||null,
    transporte_compania:v('s-gnp-trans-compania')||null,
    documentos_faltantes:v('s-gnp-docs-faltantes')||null,
    atlas_poliza_coaseg:v('s-atlas-poliza')||null,
    atlas_sinies_coaseg:v('s-atlas-sin-gnp')||null,
    lugar_siniestro:v('s-lugar-sin')||null,
    procedencia:v('s-procedencia')||'procedente',
    actividades_realizar:null,
    comentarios:null,
    situacion_actual:v('s-situacion-actual')||null,
    fundamento:v('s-fundamento')||null,
    subrogacion:v('s-subrogacion')||'N/A',
    asesores:v('s-asesores')||'No aplican',
    modo_captura:(()=>{ const pol=data.pol.find(p=>p.id===parseInt(v('s-poliza')))||{}; const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{}; const c=(aseg.codigo_sistema||'').toUpperCase(); return c==='GNP'?'gnp':c==='ATLAS'?'atlas':'institucional'; })()
  };
  if(!navigator.onLine){ await guardarSiniestroOffline(id, d2); return; }
  if(id){ await db.from('siniestros').update(d2).eq('id',id); toast('Expediente actualizado.'); }
  else { await db.from('siniestros').insert(d2); toast('Expediente creado.'); }
  const polIdUpd=parseInt(v('s-poliza'))||null;
  if(polIdUpd){
    const polUpd={};
    if(g('sin-lim-texto')) polUpd.limite_max_texto=v('sin-lim-texto')||null;
    if(g('sin-giro-aseg')) polUpd.giro_asegurado=v('sin-giro-aseg')||null;
    if(g('sin-desc-aseg')) polUpd.descripcion_asegurado=v('sin-desc-aseg')||null;
    if(Object.keys(polUpd).length) await db.from('polizas').update(polUpd).eq('id',polIdUpd);
  }
  cerrarModal('modal-sin'); await loadAll(); if(currentSin) renderDetalle();
}

export async function guardarSiniestroOffline(id, d2){
  await offlineSaveSiniestro(id, d2);
  cerrarModal('modal-sin');
  renderAll();
  if(state.currentSin){ state.currentSin = data.sin.find(s=>s.id===state.currentSin.id)||state.currentSin; renderDetalle(); }
  toast('Guardado sin conexión ● — se sincronizará al recuperar red');
}

export function editarSiniestro(id){
  const s=data.sin.find(x=>x.id===id); if(!s) return;
  g('sin-modal-title').textContent='Editar expediente';
  g('s-id').value=s.id;
  {let _e=g('s-exp');if(_e)_e.value=s.numero_exp||'';}
  {let _e=g('s-numsin');if(_e)_e.value=s.numero_siniestro||'';}
  {let _e=g('s-est');if(_e)_e.value=s.estatus||'en_proceso';}
  {let _e=g('s-tipo');if(_e)_e.value=s.tipo_siniestro||'';}
  {let _e=g('s-subramo');if(_e)_e.value=s.subramo||'';}
  {let _e=g('s-causa');if(_e)_e.value=s.causa||'';}
  {let _e=g('s-causa-com');if(_e)_e.value=s.causa_comentario||'';}
  {let _e=g('s-riesgo');if(_e)_e.value=s.riesgo_afectado||'';}
  {let _e=g('s-riesgos-cubiertos');if(_e)_e.value=s.riesgos_cubiertos||'';}
  {let _e=g('s-desc');if(_e)_e.value=s.descripcion||'';}
  {let _e=g('s-desc-riesgo');if(_e)_e.value=s.descripcion_riesgo||'';}
  {let _e=g('s-introduccion');if(_e)_e.value=s.introduccion||'';}
  {let _e=g('s-inspeccion-narrativa');if(_e)_e.value=s.inspeccion_narrativa||'';}
  {let _e=g('s-notas');if(_e)_e.value=s.notas||'';}
  {let _e=g('s-fsin');if(_e)_e.value=s.fecha_siniestro||'';}
  {let _e=g('s-hora-ocurr');if(_e)_e.value=s.hora_ocurrencia||'';}
  {let _e=g('s-fasig');if(_e)_e.value=s.fecha_asignacion||'';}
  {let _e=g('s-hora-asig');if(_e)_e.value=s.hora_asignacion||'';}
  {let _e=g('s-f1cont');if(_e)_e.value=s.fecha_primer_contacto||'';}
  {let _e=g('s-h1cont');if(_e)_e.value=s.hora_primer_contacto||'';}
  {let _e=g('s-f1vis');if(_e)_e.value=s.fecha_primera_visita||'';}
  {let _e=g('s-h1vis');if(_e)_e.value=s.hora_primera_visita||'';}
  {let _e=g('s-finsp');if(_e)_e.value=s.fecha_inspeccion||'';}
  {let _e=g('s-finf');if(_e)_e.value=s.fecha_informe||'';}
  {let _e=g('s-insp-persona');if(_e)_e.value=s.inspeccion_persona||'';}
  {let _e=g('s-insp-cargo');if(_e)_e.value=s.inspeccion_cargo||'';}
  {let _e=g('s-insp-tel');if(_e)_e.value=s.inspeccion_telefono||'';}
  {let _e=g('s-insp-dom');if(_e)_e.value=s.inspeccion_domicilio||'';}
  {let _e=g('s-clave-ajust');if(_e)_e.value=s.clave_ajustador_cia||'';}
  {let _e=g('s-dest-nombre');if(_e)_e.value=s.destinatario_nombre||'';}
  {let _e=g('s-dest-cargo');if(_e)_e.value=s.destinatario_cargo||'';}
  {let _e=g('s-ref-aseg');if(_e)_e.value=s.referencia_asegurado||'';}
  {let _e=g('s-giro');if(_e)_e.value=s.giro_asegurado||'';}
  loadBienesRte(s.bienes_danados||'');
  {let _e=g('s-bienes-amparados');if(_e)_e.value=s.bienes_amparados||'';}
  {let _e=g('s-salvamento');if(_e)_e.value=s.salvamento||'no';}
  {let _e=g('s-salv-valor');if(_e)_e.value=s.salvamento_valor_estimado||'';}
  {let _e=g('s-salv-det');if(_e)_e.value=s.salvamento_detalle||'';}
  {let _e=g('s-autoridades');if(_e)_e.value=s.intervencion_autoridades?'1':'0';}
  {let _e=g('s-autoridades-det');if(_e)_e.value=s.intervencion_autoridades_detalle||'';}
  {let _e=g('s-recuperacion');if(_e)_e.value=s.recuperacion?'1':'0';}
  {let _e=g('s-rec-terceros');if(_e)_e.value=s.recuperacion_terceros||'';}
  {let _e=g('s-rec-det');if(_e)_e.value=s.recuperacion_detalle||'';}
  {let _e=g('s-coaseguro');if(_e)_e.value=s.coaseguro?'1':'0';}
  {let _e=g('s-coas-det');if(_e)_e.value=s.coaseguro_detalle||'';}
  {let _e=g('s-reaseguro');if(_e)_e.value=s.reaseguro_clausula_control?'1':'0';}
  {let _e=g('s-reas-corredor');if(_e)_e.value=s.reaseguro_corredor||'';}
  {let _e=g('s-tramite-gnp');if(_e)_e.value=s.tramite_gnp||'';} {let _e=g('s-ot');if(_e)_e.value=s.ot||'';}
  if(g('s-gnp-jefe'))       {let _e=g('s-gnp-jefe');if(_e)_e.value=s.gnp_jefe_depto||'';}
  if(g('s-gnp-oficina'))    {let _e=g('s-gnp-oficina');if(_e)_e.value=s.gnp_oficina||'';}
  if(g('s-gnp-clave-ajust')){let _e=g('s-gnp-clave-ajust');if(_e)_e.value=s.gnp_clave_ajustador||'';}
  if(g('s-tramite-gnp-vis'))   g('s-tramite-gnp-vis').value   = s.tramite_gnp||'';
  if(g('s-numsin-gnp'))        g('s-numsin-gnp').value        = s.numero_siniestro||'';
  if(g('s-gnp-clave-ajust-vis'))g('s-gnp-clave-ajust-vis').value= s.gnp_clave_ajustador||'';
  if(g('s-gnp-jefe-vis'))      g('s-gnp-jefe-vis').value      = s.gnp_jefe_depto||'';
  if(g('s-gnp-oficina-vis'))   g('s-gnp-oficina-vis').value   = s.gnp_oficina||'';
  if(g('s-giro-vis'))          g('s-giro-vis').value          = s.giro_asegurado||'';
  if(g('s-clave-evento-vis'))  g('s-clave-evento-vis').value  = s.clave_evento_catastrofico||'';
  if(g('s-clave-evento'))      g('s-clave-evento').value      = s.clave_evento_catastrofico||'';
  if(g('s-hora-ocurr-vis'))    g('s-hora-ocurr-vis').value    = s.hora_ocurrencia||'';
  if(g('s-hora-asig-vis'))     g('s-hora-asig-vis').value     = s.hora_asignacion||'';
  if(g('s-f1cont-vis'))        g('s-f1cont-vis').value        = s.fecha_primer_contacto||'';
  if(g('s-h1cont-vis'))        g('s-h1cont-vis').value        = s.hora_primer_contacto||'';
  if(g('s-h1vis-vis'))         g('s-h1vis-vis').value         = s.hora_primera_visita||'';
  if(g('s-coaseguro-vis'))     g('s-coaseguro-vis').value     = s.coaseguro?'1':'0';
  if(g('s-reaseguro-vis'))     g('s-reaseguro-vis').value     = s.reaseguro_clausula_control?'1':'0';
  if(g('s-reas-corredor-vis')) g('s-reas-corredor-vis').value = s.reaseguro_corredor||'';
  if(g('s-recuperacion-vis'))  g('s-recuperacion-vis').value  = s.recuperacion?'1':'0';
  if(g('s-rec-terceros-vis'))  g('s-rec-terceros-vis').value  = s.recuperacion_terceros||'';
  if(g('s-autoridades-vis'))   g('s-autoridades-vis').value   = s.intervencion_autoridades?'1':'0';
  if(g('s-gnp-salv-persona'))   {let _e=g('s-gnp-salv-persona');if(_e)_e.value=s.salvamento_persona_contacto||'';}
  if(g('s-gnp-salv-tel'))       {let _e=g('s-gnp-salv-tel');if(_e)_e.value=s.salvamento_telefono||'';}
  if(g('s-gnp-salv-email'))     {let _e=g('s-gnp-salv-email');if(_e)_e.value=s.salvamento_email||'';}
  if(g('s-gnp-salv-movil'))     {let _e=g('s-gnp-salv-movil');if(_e)_e.value=s.salvamento_movil||'';}
  if(g('s-gnp-salv-comprador')) {let _e=g('s-gnp-salv-comprador');if(_e)_e.value=s.salvamento_comprador||'';}
  if(g('s-gnp-rec-recuperador')){let _e=g('s-gnp-rec-recuperador');if(_e)_e.value=s.recuperacion_nombre_recuperador||'';}
  if(g('s-gnp-rec-carta-porte')){let _e=g('s-gnp-rec-carta-porte');if(_e)_e.value=s.recuperacion_carta_porte||'';}
  if(g('s-gnp-rec-prescripcion')){let _e=g('s-gnp-rec-prescripcion');if(_e)_e.value=s.recuperacion_fecha_prescripcion||'';}
  if(g('s-gnp-trans-tipo'))     {let _e=g('s-gnp-trans-tipo');if(_e)_e.value=s.transporte_tipo||'';}
  if(g('s-gnp-trans-frontera')) {let _e=g('s-gnp-trans-frontera');if(_e)_e.value=s.transporte_frontera||'';}
  if(g('s-gnp-trans-placa'))    {let _e=g('s-gnp-trans-placa');if(_e)_e.value=s.transporte_placa||'';}
  if(g('s-gnp-trans-destino'))  {let _e=g('s-gnp-trans-destino');if(_e)_e.value=s.transporte_destino||'';}
  if(g('s-gnp-trans-compania')) {let _e=g('s-gnp-trans-compania');if(_e)_e.value=s.transporte_compania||'';}
  if(g('s-gnp-docs-faltantes')) {let _e=g('s-gnp-docs-faltantes');if(_e)_e.value=s.documentos_faltantes||'';}
  if(g('s-atlas-poliza'))   {let _e=g('s-atlas-poliza');if(_e)_e.value=s.atlas_poliza_coaseg||'';}
  if(g('s-atlas-sin-gnp'))  {let _e=g('s-atlas-sin-gnp');if(_e)_e.value=s.atlas_sinies_coaseg||'';}
  {let _e=g('s-lugar-sin');if(_e)_e.value=s.lugar_siniestro||'';}
  {let _e=g('s-procedencia');if(_e)_e.value=s.procedencia||'procedente';}
  if(g('s-situacion-actual')) {let _e=g('s-situacion-actual');if(_e)_e.value=s.situacion_actual||'';}
  if(g('s-fundamento'))       {let _e=g('s-fundamento');if(_e)_e.value=s.fundamento||'';}
  if(g('s-subrogacion'))      {let _e=g('s-subrogacion');if(_e)_e.value=s.subrogacion||'N/A';}
  if(g('s-asesores'))         {let _e=g('s-asesores');if(_e)_e.value=s.asesores||'No aplican';}
  const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
  const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};

  resetBuscadorSinModal();
  if(asdo.id){
    seleccionarAseguradoSin(asdo.id, asdo.nombre||'—');
  }
  if(pol.id){
    seleccionarPolizaSin(pol.id, pol.numero||'—', pol.id_aseguradora||0);
    if(g('s-tramite-gnp'))    {let _e=g('s-tramite-gnp');if(_e)_e.value=s.tramite_gnp||'';}
    if(g('s-gnp-jefe'))       {let _e=g('s-gnp-jefe');if(_e)_e.value=s.gnp_jefe_depto||'';}
    if(g('s-gnp-oficina'))    {let _e=g('s-gnp-oficina');if(_e)_e.value=s.gnp_oficina||'';}
    if(g('s-gnp-clave-ajust')){let _e=g('s-gnp-clave-ajust');if(_e)_e.value=s.gnp_clave_ajustador||'';}
    if(g('s-ot'))             {let _e=g('s-ot');if(_e)_e.value=s.ot||'';}
    if(g('s-atlas-poliza'))   {let _e=g('s-atlas-poliza');if(_e)_e.value=s.atlas_poliza_coaseg||'';}
    if(g('s-atlas-sin-gnp'))  {let _e=g('s-atlas-sin-gnp');if(_e)_e.value=s.atlas_sinies_coaseg||'';}
  }
  g('modal-sin').classList.add('open');
  g('modal-sin').scrollTop=0;
  requestAnimationFrame(()=>{
    g('modal-sin').scrollTop=0;
    setTimeout(()=>{
      g('modal-sin').scrollTop=0;
      if(document.activeElement && document.activeElement!==document.body)
        document.activeElement.blur();
    }, 100);
  });
}

export const expedientePublic = {};
