// ============================================================
// informes.js — Registro y consulta de informes por expediente
// AdjusterPro JChA · Almaraz Ajustadores (AASA)
// Depende de: ui.js, db.js, state.js, expediente.js
// ============================================================

import { g, v, toast, fmtD } from './ui.js';
import { db, loadAll } from './db.js';
import { data } from './state.js';
import * as state from './state.js';
import { renderDetalle } from './expediente.js';

// ============================================================
// CONSTANTES
// ============================================================
export const INF_TIPOS = {
  preliminar:    'Preliminar',
  actualizacion: 'Actualización',
  final:         'Final',
  nota_tecnica:  'Nota Técnica',
};

export const REGLAS_INFORMES = {
  GNP:     { ventana_ini:1,  ventana_fin:5,  demanda:true,  label:'GNP'     },
  INBURSA: { ventana_ini:1,  ventana_fin:5,  demanda:true,  label:'Inbursa' },
  ATLAS:   { ventana_ini:1,  ventana_fin:10, demanda:true,  label:'Atlas'   },
  DEFAULT: { ventana_ini:1,  ventana_fin:10, demanda:false, label:'Genérica'},
};

// ============================================================
// RENDER — fila de tabla en pestaña Informes del expediente
// ============================================================
export function renderInformesRows(rows) {
  if(!rows.length)
    return `<tr><td colspan="8" class="empty">Sin informes registrados.</td></tr>`;

  return rows.map(r => `<tr>
    <td><strong>${INF_TIPOS[r.tipo] || r.tipo}</strong></td>
    <td><span style="background:var(--surface2);padding:2px 8px;border-radius:6px;font-size:11px;">v${r.numero_version}</span></td>
    <td>${fmtD(r.fecha_envio)}</td>
    <td>${r.hora_envio ? r.hora_envio.slice(0,5) : '—'}</td>
    <td>${r.destinatario || '—'}</td>
    <td>${r.asunto       || '—'}</td>
    <td>
      <button class="btn btn-sm" onclick="generarDesdeInforme(${r.id})"
        title="Generar PDF/Word de este informe">📄 Generar</button>
    </td>
    <td><button class="btn btn-sm btn-danger"
      onclick="eliminar('informes',${r.id})">Eliminar</button></td>
  </tr>`).join('');
}

// ============================================================
// POBLAR SELECTOR DE FUNCIONARIOS (modal-inf)
// ============================================================
export function poblarFuncionariosInf() {
  const sel = g('inf-contacto-sel');
  if(!sel || !state.currentSin) return;

  const pol    = data.pol.find(p => p.id === state.currentSin.id_poliza) || {};
  const asegId = pol.id_aseguradora || 0;

  const conts = data.cont
    .filter(c => !asegId || c.id_aseguradora === asegId)
    .sort((a, b) => {
      if(a.tipo === 'funcionario_cia' && b.tipo !== 'funcionario_cia') return -1;
      if(b.tipo === 'funcionario_cia' && a.tipo !== 'funcionario_cia') return  1;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

  sel.innerHTML = `<option value="">— Seleccionar del directorio —</option>` +
    conts.map(c =>
      `<option value="${c.id}">${c.nombre}${c.cargo ? ' — ' + c.cargo : ''}</option>`
    ).join('');

  // Pre-seleccionar desde el expediente
  if(state.currentSin.id_contacto_dest){
    sel.value = state.currentSin.id_contacto_dest;
    seleccionarContactoInf(state.currentSin.id_contacto_dest);
  } else if(state.currentSin.destinatario_nombre){
    if(g('inf-dest')) g('inf-dest').value = state.currentSin.destinatario_nombre || '';
    if(g('inf-jefe')) g('inf-jefe').value = state.currentSin.destinatario_cargo  || '';
  }
}

export function seleccionarContactoInf(id) {
  const cont = data.cont.find(c => c.id === parseInt(id));
  if(!cont) return;
  if(g('inf-dest')) g('inf-dest').value = cont.nombre || '';
  if(g('inf-jefe')) g('inf-jefe').value = cont.cargo  || '';
}

// ============================================================
// TOGGLE SECCIÓN DE ACTUALIZACIÓN (modal-inf)
// ============================================================
export function toggleInfActSection() {
  const tipo = v('inf-tipo');
  const sec  = g('inf-act-section');
  if(sec) sec.style.display = tipo === 'actualizacion' ? 'block' : 'none';
}

// ── Render dinámico de filas de reserva en modal-inf ─────────────────
export function renderInfResGrid() {
  const wrap = g('inf-res-grid');
  if(!wrap || !state.currentSin) return;

  // Tomar coberturas vigentes del expediente como plantilla
  const vigMap = {};
  data.res.filter(r => r.id_siniestro === state.currentSin.id).forEach(r => {
    if(!vigMap[r.concepto] || r.id > vigMap[r.concepto].id) vigMap[r.concepto] = r;
  });
  const rvs = Object.values(vigMap);

  if(!rvs.length){
    wrap.innerHTML = '<div style="font-size:12px;color:var(--text-ter);padding:6px 0;">Sin coberturas previas. Registra al menos una reserva primero.</div>';
    const cnt = g('inf-res-count'); if(cnt) cnt.value = 0;
    return;
  }

  const inpS = 'padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:12px;font-family:inherit;box-sizing:border-box;';
  const CONCEPTO_LABEL = {
    edificio:'Edificio', contenidos:'Contenidos', existencias:'Existencias',
    maquinaria:'Maquinaria y Equipo', equipo_electronico:'Equipo Electrónico',
    rc:'Responsabilidad Civil', lucro_cesante:'Lucro Cesante',
    transporte:'Transporte', valores:'Dinero y Valores',
  };

  wrap.innerHTML = rvs.map((r, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border-md);border-radius:var(--rl);padding:10px 12px;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:600;color:var(--accent-lt);margin-bottom:8px;">
        ${CONCEPTO_LABEL[r.concepto] || r.concepto || 'Cobertura ' + (i+1)}
      </div>
      <input type="hidden" id="inf-res-${i}-concepto" value="${r.concepto || ''}">
      <div class="form-grid">
        <div class="fg"><label>Suma asegurada (reserva)</label>
          <input type="number" id="inf-res-${i}-monto" value="${r.monto || ''}" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Pérdida estimada</label>
          <input type="number" id="inf-res-${i}-perdida" value="${r.monto_perdida_estimada || r.monto || ''}" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Deducible</label>
          <input type="number" id="inf-res-${i}-ded" value="${r.deducible || ''}" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Coaseguro %</label>
          <input type="number" id="inf-res-${i}-coas" value="${r.coaseguro_pct || ''}" min="0" max="100" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Bajo seguro</label>
          <input type="number" id="inf-res-${i}-bajo" value="${r.monto_bajo_seguro || ''}" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Depreciación %</label>
          <input type="number" id="inf-res-${i}-dep" value="${r.depreciacion_pct || ''}" min="0" max="100" step="0.01" style="${inpS}width:100%;text-align:right;"></div>
        <div class="fg"><label>Moneda</label>
          <select id="inf-res-${i}-mon" style="${inpS}width:100%;">
            <option value="MXN" ${(r.moneda||'MXN')==='MXN'?'selected':''}>MXN</option>
            <option value="USD" ${r.moneda==='USD'?'selected':''}>USD</option>
            <option value="EUR" ${r.moneda==='EUR'?'selected':''}>EUR</option>
          </select></div>
        <div class="fg"><label>Tipo de cambio</label>
          <input type="number" id="inf-res-${i}-tc" value="${r.tipo_cambio_mxn || 1}" step="0.0001" style="${inpS}width:100%;text-align:right;"></div>
      </div>
    </div>`).join('');

  const cnt = g('inf-res-count'); if(cnt) cnt.value = rvs.length;
}

// ============================================================
// GUARDAR INFORME
// ============================================================
export async function guardarInforme() {
  if(!state.currentSin) return;
  const tipo      = v('inf-tipo');
  const existentes = data.inf.filter(i => i.id_siniestro === state.currentSin.id && i.tipo === tipo);
  const version   = (existentes.length > 0 ? Math.max(...existentes.map(i => i.numero_version)) : 0) + 1;

  const { data: infData, error } = await db.from('informes').insert({
    id_siniestro:          state.currentSin.id,
    tipo,
    numero_version:        version,
    fecha_envio:           v('inf-fecha') || new Date().toISOString().slice(0,10),
    hora_envio:            v('inf-hora')  || new Date().toTimeString().slice(0,8),
    destinatario:          v('inf-dest'),
    jefe_depto:            v('inf-jefe')           || null,
    oficina_cia:           v('inf-oficina')         || null,
    asunto:                v('inf-asunto'),
    notas:                 v('inf-notas'),
    id_contacto_dest:      parseInt(v('inf-contacto-sel')) || null,
    num_paginas:           parseInt(v('inf-pags'))  || 1,
    desarrollo_siniestro:  v('inf-desarrollo')      || null,
    estrategias:           v('inf-estrategias')     || null,
    situacion_actual:      v('inf-situacion-actual') || null,
    fundamento:            v('inf-fundamento')       || null,
    procedencia:           v('inf-procedencia')      || null,
    reclamacion_narrativa: v('inf-reclamacion')      || null,
    bases_ajuste:          v('inf-bases-ajuste')     || null,
    usuario:               g('user-lbl')?.textContent || '',
  }).select('id').single();

  if(error){ toast('Error al guardar informe: ' + error.message); return; }
  const infId = infData?.id;

  // Si es actualización: insertar filas de reserva vinculadas al informe
  if(tipo === 'actualizacion' && infId){
    const count  = parseInt(g('inf-res-count')?.value) || 0;
    const today  = new Date().toISOString().slice(0,10);
    const inserts = [];

    for(let i = 0; i < count; i++){
      const perdida  = parseFloat(document.getElementById(`inf-res-${i}-perdida`)?.value)  || 0;
      const ded      = parseFloat(document.getElementById(`inf-res-${i}-ded`)?.value)      || 0;
      const coasPct  = parseFloat(document.getElementById(`inf-res-${i}-coas`)?.value)     || 0;
      const bajo     = parseFloat(document.getElementById(`inf-res-${i}-bajo`)?.value)     || 0;
      const coas     = (perdida - ded) * (coasPct / 100);
      const concepto = document.getElementById(`inf-res-${i}-concepto`)?.value || ('Cobertura ' + (i+1));
      const dep      = parseFloat(document.getElementById(`inf-res-${i}-dep`)?.value)      || 0;
      const mon      = document.getElementById(`inf-res-${i}-mon`)?.value  || 'MXN';
      const tc       = parseFloat(document.getElementById(`inf-res-${i}-tc`)?.value)       || 1;
      const bases    = document.getElementById(`inf-res-${i}-bases`)?.value || v('inf-bases-ajuste') || null;

      inserts.push({
        id_siniestro:            state.currentSin.id,
        id_informe:              infId,
        es_actualizacion:        true,
        concepto,
        fecha:                   today,
        monto:                   parseFloat(document.getElementById(`inf-res-${i}-monto`)?.value) || 0,
        depreciacion_pct:        dep,
        monto_perdida_estimada:  perdida,
        deducible:               ded,
        coaseguro_pct:           coasPct,
        monto_coaseguro:         coas,
        monto_bajo_seguro:       bajo,
        moneda:                  mon,
        tipo_cambio_mxn:         tc,
        bases_determinacion:     bases,
      });
    }
    if(inserts.length) await db.from('reservas').insert(inserts);

    // Actualizar campos narrativos del expediente desde el informe
    const upd = {};
    if(v('inf-situacion-actual')) upd.situacion_actual           = v('inf-situacion-actual');
    if(v('inf-fundamento'))       upd.fundamento                 = v('inf-fundamento');
    if(v('inf-procedencia'))      upd.procedencia                = v('inf-procedencia');
    if(v('inf-estrategias'))      upd.estrategias_observaciones  = v('inf-estrategias');
    if(Object.keys(upd).length)   await db.from('siniestros').update(upd).eq('id', state.currentSin.id);
  }

  toast(`Informe ${INF_TIPOS[tipo]} v${version} registrado.`);
  cerrarModal('modal-inf');
  await loadAll();
  renderDetalle();
}

// ============================================================
// GENERAR DESDE TAB INFORMES → redirige a panel Reportes
// ============================================================
export function generarDesdeInforme(infId) {
  if(!state.currentSin) return;
  const inf = data.inf.find(i => i.id === infId);
  if(!inf){ toast('Informe no encontrado.'); return; }

  // Navegar al panel Reportes
  const navBtn = document.getElementById('nav-reportes');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.topbar-mid .nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-reportes');
  if(panel) panel.classList.add('active');
  if(navBtn) navBtn.classList.add('active');

  // Pre-seleccionar expediente e informe
  setTimeout(() => {
    const sel = g('r-caso');
    if(sel){
      sel.value          = state.currentSin.id;
      sel.dataset.infId  = infId;
      if(typeof window.previsualizarReporte === 'function') window.previsualizarReporte();
    }
  }, 100);

  toast('Expediente seleccionado en Reportes. Usa los botones de generación.');
}

// ============================================================
// CÁLCULO DE INFORMES DE ACTUALIZACIÓN PENDIENTES
// ============================================================
export function calcInformesPendientes() {
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const diaHoy = hoy.getDate();
  const result = [];

  data.sin.filter(s => s.estatus !== 'cerrado').forEach(s => {
    const pol    = data.pol.find(p => p.id === s.id_poliza) || {};
    const aseg   = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
    const cod    = (aseg.codigo_sistema || '').toUpperCase();
    const regla  = REGLAS_INFORMES[cod] || REGLAS_INFORMES.DEFAULT;

    // Último informe enviado (cualquier tipo)
    const informes = data.inf.filter(i => i.id_siniestro === s.id).sort((a,b) => b.id - a.id);
    const ultInf   = informes[0] || null;
    const fechaUltInf = ultInf?.fecha_envio || null;
    const diasDesde   = fechaUltInf
      ? Math.floor((hoy - new Date(fechaUltInf)) / (1000*60*60*24))
      : 9999;

    // ¿Está en ventana periódica?
    const enVentana = diaHoy >= regla.ventana_ini && diaHoy <= regla.ventana_fin;

    // ¿Hay movimientos posteriores al último informe sin nuevo informe?
    let tieneMovSinInf = false;
    if(regla.demanda && ultInf){
      const fechaUlt = new Date(fechaUltInf);
      const hayMov = [
        ...data.res.filter(r  => r.id_siniestro === s.id),
        ...data.bit.filter(b  => b.id_siniestro === s.id),
        ...data.act.filter(a  => a.id_siniestro === s.id),
      ].some(r => {
        const f = new Date(r.fecha || r.created_at || '');
        return f > fechaUlt;
      });
      tieneMovSinInf = hayMov;
    }

    if(!enVentana && !tieneMovSinInf) return;

    const motivo = enVentana
      ? `Ventana ${regla.label}: días ${regla.ventana_ini}–${regla.ventana_fin}`
      : 'Movimientos sin reportar';

    result.push({
      s, aseg, ultInf, fechaUltInf, diasDesde, motivo,
      urgencia: enVentana ? 'urgente' : 'normal',
    });
  });

  return result.sort((a, b) => {
    if(a.urgencia === 'urgente' && b.urgencia !== 'urgente') return -1;
    if(b.urgencia === 'urgente' && a.urgencia !== 'urgente') return  1;
    return b.diasDesde - a.diasDesde;
  });
}

// ============================================================
// RENDER — panel Alertas · sección informes pendientes
// ============================================================
export function renderInformesPendientes() {
  const pendientes = calcInformesPendientes();
  const urgentes   = pendientes.filter(p => p.urgencia === 'urgente').length;
  const normales   = pendientes.filter(p => p.urgencia === 'normal').length;

  const resWrap = g('inf-act-resumen');
  if(resWrap){
    resWrap.innerHTML = `
      <div class="mc" style="border-left-color:#e24b4a;">
        <div class="mc-lbl">En ventana mensual</div>
        <div class="mc-val" style="color:#ef9f9f;">${urgentes}</div>
        <div class="mc-sub">Requieren informe esta semana</div>
      </div>
      <div class="mc" style="border-left-color:#BA7517;">
        <div class="mc-lbl">Con cambios sin informe</div>
        <div class="mc-val" style="color:#ffcc80;">${normales}</div>
        <div class="mc-sub">Movimientos no reportados</div>
      </div>
      <div class="mc">
        <div class="mc-lbl">Total pendientes</div>
        <div class="mc-val">${pendientes.length}</div>
      </div>`;
  }

  const tbody = g('inf-act-body');
  if(!tbody) return;

  if(!pendientes.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty" style="color:#a5d6a7;">✓ No hay informes de actualización pendientes.</td></tr>`;
    return;
  }

  tbody.innerHTML = pendientes.map(({ s, aseg, ultInf, fechaUltInf, diasDesde, motivo, urgencia }) => {
    const pol    = data.pol.find(p => p.id === s.id_poliza) || {};
    const asdo   = data.asdo.find(a => a.id === pol.id_asegurado) || {};
    const rowCls = urgencia === 'urgente' ? 'alerta-critica' : 'alerta-warning';
    const diasTxt = diasDesde >= 9999 ? 'Nunca' : diasDesde + ' días';
    const diasCls = urgencia === 'urgente' ? 'dias-critico' : 'dias-warning';
    return `<tr class="${rowCls}" style="cursor:pointer;" onclick="irAExpediente(${s.id})">
      <td><strong>${s.numero_exp}</strong></td>
      <td>${asdo.nombre || '—'}</td>
      <td>${aseg.nombre || '—'}</td>
      <td style="font-size:11px;">${motivo}</td>
      <td>${fechaUltInf
        ? fmtD(fechaUltInf)
        : '<span style="color:var(--text-ter);">Ninguno</span>'}</td>
      <td><span class="dias-badge ${diasCls}">${diasTxt}</span></td>
      <td><button class="btn btn-sm"
        onclick="event.stopPropagation();irAExpediente(${s.id})">Ver expediente</button></td>
    </tr>`;
  }).join('');
}

// ── Helper local ─────────────────────────────────────────────────────
function cerrarModal(id) {
  const el = g(id);
  if(el) el.classList.remove('open');
}

export const informesPublic = {};
