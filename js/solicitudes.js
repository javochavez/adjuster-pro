/**
 * solicitudes.js — AdjusterPro JChA / Almaraz Ajustadores (AASA)
 * Módulo ES: CRUD solicitudes de información, generación PDF · Word · Email,
 * recordatorios, seguimiento, catálogo de documentos con IA.
 *
 * Dependencias globales inyectadas por app.js:
 *   db, data, currentSin (getter/setter), toast, fmtD, fmtMXN,
 *   g, v, abrirModal, cerrarModal, loadAll, iaCheckKey, iaGetKey
 * CDN global:
 *   docx  (docx.js)
 */

// ══════════════════════════════════════════════════════════════════════════
// CATÁLOGO BASE
// ══════════════════════════════════════════════════════════════════════════
export const SOL_CATALOGO_BASE = {
  'General': [
    { cat:'Documentación General', desc:'Denuncia ante Ministerio Público / FGR' },
    { cat:'Documentación General', desc:'Identificación oficial vigente del asegurado (INE / Pasaporte)' },
    { cat:'Documentación General', desc:'RFC con homoclave del asegurado o empresa' },
    { cat:'Documentación General', desc:'Constancia de situación fiscal vigente (SAT)' },
    { cat:'Documentación General', desc:'Póliza de seguro vigente (carátula)' },
    { cat:'Documentación General', desc:'Comprobante de domicilio no mayor a tres meses' },
    { cat:'Documentación General', desc:'Poder notarial del representante legal (personas morales)' },
    { cat:'Documentación General', desc:'Acta constitutiva e inscripción en el RPC (personas morales)' },
  ],
  'Incendio': [
    { cat:'Documentación General', desc:'Informe de bomberos / Reporte de siniestro' },
    { cat:'Documentación General', desc:'Fotografías del siniestro (antes, durante, después)' },
    { cat:'Técnica',   desc:'Dictamen del perito en incendios (causas y origen)' },
    { cat:'Técnica',   desc:'Planos del inmueble afectado (arquitectónicos y estructurales)' },
    { cat:'Valuación', desc:'Facturas / comprobantes de los bienes afectados' },
    { cat:'Valuación', desc:'Presupuesto de reparación o reposición firmado por contratista' },
    { cat:'Valuación', desc:'Inventario detallado de bienes dañados o destruidos' },
    { cat:'Operacional', desc:'Bitácora de mantenimiento de instalaciones eléctricas' },
    { cat:'Operacional', desc:'Contrato de arrendamiento (si el inmueble es rentado)' },
  ],
  'Robo': [
    { cat:'Documentación General', desc:'Acta de denuncia ante FGR / Fiscalía Estatal' },
    { cat:'Documentación General', desc:'Fotografías del lugar del siniestro' },
    { cat:'Valuación', desc:'Facturas o comprobantes de los bienes robados' },
    { cat:'Valuación', desc:'Inventario de bienes sustraídos con valores unitarios' },
    { cat:'Técnica',   desc:'Dictamen de cerrajería / evidencia de violación de accesos' },
    { cat:'Operacional', desc:'Reporte del sistema de videovigilancia o alarma' },
    { cat:'Operacional', desc:'Lista de personal con acceso a las instalaciones' },
  ],
  'Automóviles': [
    { cat:'Documentación General', desc:'Licencia de conducir vigente del conductor involucrado' },
    { cat:'Documentación General', desc:'Tarjeta de circulación del vehículo' },
    { cat:'Documentación General', desc:'Verificación vehicular vigente' },
    { cat:'Documentación General', desc:'Acta de hechos o reporte policial' },
    { cat:'Técnica',   desc:'Presupuesto de reparación de taller autorizado' },
    { cat:'Técnica',   desc:'Dictamen de daños del perito mecánico' },
    { cat:'Valuación', desc:'Factura original del vehículo' },
    { cat:'Valuación', desc:'Avalúo comercial o cotización de valor de mercado' },
    { cat:'Legal',     desc:'Poder notarial para reclamación (si aplica)' },
  ],
  'Transporte': [
    { cat:'Documentación General', desc:'Conocimiento de embarque (Bill of Lading / Guía aérea)' },
    { cat:'Documentación General', desc:'Factura comercial de la mercancía' },
    { cat:'Documentación General', desc:'Lista de empaque (Packing List)' },
    { cat:'Documentación General', desc:'Certificado de seguro de transporte' },
    { cat:'Técnica',   desc:'Reporte de inspección en destino (surveyors report)' },
    { cat:'Técnica',   desc:'Fotografías del embalaje y mercancía dañada' },
    { cat:'Valuación', desc:'Carta de reclamación al transportista' },
    { cat:'Valuación', desc:'Cotización de reparación o reposición de la mercancía' },
    { cat:'Embarque',  desc:'Carta de porte / Manifiesto de carga' },
    { cat:'Embarque',  desc:'Certificado fitosanitario o de calidad (si aplica)' },
  ],
  'RC': [
    { cat:'Documentación General', desc:'Acta de denuncia o demanda presentada' },
    { cat:'Documentación General', desc:'Notificación oficial de reclamación de tercero' },
    { cat:'Legal',     desc:'Poder notarial para juicio (si aplica)' },
    { cat:'Legal',     desc:'Contratos o convenios que originaron la responsabilidad' },
    { cat:'Valuación', desc:'Presupuesto o estimación de daños del tercero afectado' },
    { cat:'Valuación', desc:'Facturas de gastos médicos del tercero (si aplica)' },
    { cat:'Técnica',   desc:'Dictamen de causalidad firmado por perito independiente' },
  ],
  'Equipo de Contratistas': [
    { cat:'Documentación General', desc:'Contrato de obra o servicio en vigor' },
    { cat:'Técnica',   desc:'Especificaciones técnicas del equipo siniestrado' },
    { cat:'Técnica',   desc:'Fotografías del equipo antes y después del siniestro' },
    { cat:'Técnica',   desc:'Informe de perito mecánico especializado' },
    { cat:'Valuación', desc:'Factura de adquisición del equipo' },
    { cat:'Valuación', desc:'Presupuesto de reparación de taller certificado' },
    { cat:'Operacional', desc:'Bitácora de mantenimiento preventivo del equipo' },
    { cat:'Operacional', desc:'Programa de actividades y avance de obra' },
    { cat:'Técnica',   desc:'Reconstrucción de lo dañado' },
    { cat:'Valuación', desc:'Facturación de materiales y mano de obra afectados' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DEL MÓDULO
// ══════════════════════════════════════════════════════════════════════════
let solRamoActivo       = 'General';
let solItemsExtra       = [];
let solCatalogoExtendido = {};

// ══════════════════════════════════════════════════════════════════════════
// CATÁLOGO — INICIALIZACIÓN Y RENDERIZADO
// ══════════════════════════════════════════════════════════════════════════
export async function solInicializarCatalogo() {
  const rows = (window.__appData?.sol_catalogo) || [];
  solCatalogoExtendido = JSON.parse(JSON.stringify(SOL_CATALOGO_BASE));
  rows.forEach(r => {
    if (!solCatalogoExtendido[r.ramo]) solCatalogoExtendido[r.ramo] = [];
    if (!solCatalogoExtendido[r.ramo].find(x => x.desc === r.descripcion)) {
      solCatalogoExtendido[r.ramo].push({ cat: r.categoria || 'General', desc: r.descripcion, id: r.id });
    }
  });
}

export function solRenderRamoTabs() {
  const ramos = Object.keys(solCatalogoExtendido);
  const wrap  = g('sol-ramo-tabs');
  if (!wrap) return;
  wrap.innerHTML = ramos.map(r =>
    `<button type="button" class="sol-tab-btn ${r === solRamoActivo ? 'active' : ''}"
      onclick="solCambiarRamo('${r}')">${r}</button>`
  ).join('');
}

export function solCambiarRamo(ramo) {
  solRamoActivo = ramo;
  solRenderRamoTabs();
  solRenderCatalogo();
}

export function solRenderCatalogo() {
  const wrap = g('sol-catalogo-wrap');
  if (!wrap) return;
  const items = [
    ...(solCatalogoExtendido[solRamoActivo] || []),
    ...(solRamoActivo === 'General' ? solItemsExtra : []),
  ];
  if (!items.length) {
    wrap.innerHTML = '<div style="font-size:11px;color:var(--text-ter);padding:16px;text-align:center;">Sin ítems en este ramo</div>';
    return;
  }
  const byCat = {};
  items.forEach((it, i) => {
    const cat = it.cat || 'General';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ ...it, _idx: i });
  });
  let html = '';
  Object.entries(byCat).forEach(([cat, rows]) => {
    html += `<div class="sol-cat-header">${cat}</div>`;
    rows.forEach(it => {
      const chkId  = `sol-chk-${solRamoActivo.replace(/\s/g, '_')}-${it._idx}`;
      const isExtra = it._isExtra;
      html += `<div class="sol-item-row">
        <input type="checkbox" id="${chkId}"
          value="${encodeURIComponent(JSON.stringify({ cat: it.cat, desc: it.desc, ramo: solRamoActivo }))}"
          onchange="solActualizarConteo()">
        <label for="${chkId}">${it.desc}${isExtra ? ' <span style="font-size:9px;color:var(--accent-lt);">[personalizado]</span>' : ''}</label>
      </div>`;
    });
  });
  wrap.innerHTML = html;
  solActualizarConteo();
}

export function solActualizarConteo() {
  const checked = document.querySelectorAll('#sol-catalogo-wrap input[type=checkbox]:checked');
  const total   = checked.length;
  const cnt  = g('sol-selected-count');
  const wrap = g('sol-selected-wrap');
  const lst  = g('sol-selected-list');
  if (cnt)  cnt.textContent = total;
  if (wrap) wrap.style.display = total > 0 ? 'block' : 'none';
  if (lst) {
    const items = Array.from(checked).map(c => {
      try { return JSON.parse(decodeURIComponent(c.value)).desc; } catch { return c.value; }
    });
    lst.innerHTML = items.map(d => `<div style="padding:2px 0;border-bottom:1px solid var(--border);">• ${d}</div>`).join('');
  }
}

export async function solAgregarCustom() {
  const desc = (g('sol-item-custom')?.value || '').trim();
  const cat  = (g('sol-item-custom-cat')?.value || 'General').trim();
  const save = g('sol-item-custom-save')?.checked;
  if (!desc) { toast('Escribe la descripción del ítem'); return; }
  if (!solCatalogoExtendido[solRamoActivo]) solCatalogoExtendido[solRamoActivo] = [];
  solCatalogoExtendido[solRamoActivo].push({ cat, desc, _isExtra: true });
  if (save) {
    await window.__db.from('catalogo_documentos').insert({ ramo: solRamoActivo, categoria: cat, descripcion: desc, orden: 999 });
    toast('Ítem guardado en catálogo');
  }
  if (g('sol-item-custom')) g('sol-item-custom').value = '';
  solRenderCatalogo();
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL NUEVA / EDITAR SOLICITUD
// ══════════════════════════════════════════════════════════════════════════
export async function abrirNuevaSolicitud() {
  const cs = window.__currentSin;
  if (!cs) { toast('Selecciona un expediente primero'); return; }
  await solInicializarCatalogo();
  solItemsExtra = [];
  solRamoActivo = 'General';
  g('sol-modal-title').textContent = 'Nueva Solicitud de Información';
  g('sol-id').value = '';
  g('sol-sin-id').value = cs.id;
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === cs.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  g('sol-asunto').value          = `Documentación siniestro ${cs.numero_siniestro || cs.numero_exp} — ${asdo.nombre || 'Asegurado'}`;
  g('sol-fecha').value           = new Date().toISOString().slice(0, 10);
  g('sol-fecha-compromiso').value = '';
  g('sol-dest-nombre').value     = '';
  g('sol-dest-cargo').value      = '';
  g('sol-dest-empresa').value    = '';
  g('sol-dest-email').value      = '';
  g('sol-notas').value           = '';
  if (g('sol-item-custom'))     g('sol-item-custom').value = '';
  if (g('sol-item-custom-cat')) g('sol-item-custom-cat').value = '';
  solRenderRamoTabs();
  solRenderCatalogo();
  abrirModal('modal-sol');
}

// ══════════════════════════════════════════════════════════════════════════
// GUARDAR SOLICITUD (nueva o actualización)
// ══════════════════════════════════════════════════════════════════════════
export async function guardarSolicitud(estatus) {
  const db   = window.__db;
  const data = window.__appData;
  const id   = g('sol-id').value;
  const cs   = window.__currentSin;
  const sinId = parseInt(g('sol-sin-id').value) || cs?.id;
  if (!sinId) { toast('Error: sin expediente asociado'); return; }

  const items = Array.from(document.querySelectorAll('#sol-catalogo-wrap input[type=checkbox]:checked'))
    .map(c => { try { return JSON.parse(decodeURIComponent(c.value)); } catch { return null; } })
    .filter(Boolean);

  if (!items.length) { toast('Selecciona al menos un documento'); return; }

  const payload = {
    id_siniestro:         sinId,
    destinatario_nombre:  g('sol-dest-nombre')?.value  || null,
    destinatario_cargo:   g('sol-dest-cargo')?.value   || null,
    destinatario_empresa: g('sol-dest-empresa')?.value || null,
    destinatario_email:   g('sol-dest-email')?.value   || null,
    fecha_solicitud:      g('sol-fecha')?.value        || null,
    fecha_compromiso:     g('sol-fecha-compromiso')?.value || null,
    asunto:               g('sol-asunto')?.value       || null,
    estatus,
    notas:                g('sol-notas')?.value        || null,
  };

  let solId;
  if (id) {
    await db.from('solicitudes_info').update(payload).eq('id', id);
    solId = parseInt(id);
    await db.from('solicitud_items').delete().eq('id_solicitud', solId);
  } else {
    const { data: row, error } = await db.from('solicitudes_info').insert(payload).select().single();
    if (error) { toast('Error: ' + error.message); return; }
    solId = row.id;
  }

  const itemRows = items.map((it, i) => ({
    id_solicitud: solId,
    categoria:    it.cat || 'General',
    descripcion:  it.desc,
    recibido:     false,
    orden:        i + 1,
  }));
  if (itemRows.length) await db.from('solicitud_items').insert(itemRows);

  if (estatus === 'enviada' && !id) {
    await db.from('solicitud_seguimiento').insert({
      id_solicitud: solId,
      tipo:         'envio',
      fecha:        new Date().toISOString().slice(0, 10),
      descripcion:  'Solicitud generada y marcada como enviada',
      usuario:      g('user-lbl')?.textContent || 'Sistema',
    });
  }

  cerrarModal('modal-sol');
  await loadAll();
  renderSolicitudesTab();
  toast(estatus === 'enviada' ? '✓ Solicitud guardada como enviada' : 'Borrador guardado');
}

// ══════════════════════════════════════════════════════════════════════════
// RENDERIZAR TAB SOLICITUDES EN EXPEDIENTE
// ══════════════════════════════════════════════════════════════════════════
export function renderSolicitudesTab() {
  const wrap = g('sol-tab-content');
  if (!wrap || !window.__currentSin) return;
  const data = window.__appData;
  const cs   = window.__currentSin;
  const sols = (data.solicitudes || []).filter(s => s.id_siniestro === cs.id);

  let html = `<div class="toolbar" style="margin-bottom:12px;">
    <button class="btn btn-primary" onclick="abrirNuevaSolicitud()">+ Nueva solicitud</button>
  </div>`;

  if (!sols.length) {
    html += '<div style="font-size:12px;color:var(--text-ter);padding:20px 0;text-align:center;">Sin solicitudes registradas para este expediente.</div>';
    wrap.innerHTML = html;
    return;
  }

  const LABEL = { borrador: 'Borrador', enviada: 'Enviada', parcial: 'Parcial', completa: '✓ Completa', vencida: '⚠ Vencida' };
  sols.forEach(sol => {
    const items     = (data.sol_items || []).filter(i => i.id_solicitud === sol.id);
    const recibidos = items.filter(i => i.recibido).length;
    const total     = items.length;
    const pct       = total ? Math.round(recibidos / total * 100) : 0;
    const badge     = `<span class="sol-badge ${sol.estatus}">${LABEL[sol.estatus] || sol.estatus}</span>`;
    const vence     = sol.fecha_compromiso ? `· Compromiso: ${fmtD(sol.fecha_compromiso)}` : '';
    const noCompleta = sol.estatus !== 'completa';

    html += `<div class="sol-card">
      <div class="sol-card-head" onclick="verSolicitud(${sol.id})" style="cursor:pointer;">
        <span class="sol-card-exp">${sol.asunto || 'Solicitud #' + sol.id}</span>
        ${badge}
      </div>
      <div class="sol-card-sub" onclick="verSolicitud(${sol.id})" style="cursor:pointer;">
        ${sol.destinatario_nombre || 'Sin destinatario'}
        ${sol.destinatario_empresa ? '— ' + sol.destinatario_empresa : ''}
        ${vence} · ${recibidos}/${total} documentos recibidos
      </div>
      ${total > 0 ? `<div class="sol-progress-bar" onclick="verSolicitud(${sol.id})" style="cursor:pointer;">
        <div class="sol-progress-fill" style="width:${pct}%"></div></div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="verSolicitud(${sol.id})" style="font-size:11px;">📋 Ver / Seguimiento</button>
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'email')" style="font-size:11px;">✉ Correo</button>
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'pdf')" style="font-size:11px;">⬇ PDF</button>
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'word')" style="font-size:11px;">⬇ Word</button>
        ${noCompleta ? `
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'recordatorio')" style="font-size:11px;background:rgba(255,204,0,.15);color:#ffd700;border-color:rgba(255,204,0,.3);">🔔 Rec PDF</button>
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'rec_word')" style="font-size:11px;background:rgba(255,204,0,.1);color:#ffd700;border-color:rgba(255,204,0,.25);">🔔 Rec Word</button>
        <button class="btn btn-sm" onclick="solAccionRapida(${sol.id},'rec_email')" style="font-size:11px;background:rgba(255,204,0,.08);color:#ffd700;border-color:rgba(255,204,0,.2);">🔔 Rec Correo</button>` : ''}
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════════════════
// ALERTAS DE SOLICITUDES PENDIENTES / VENCIDAS (dashboard)
// ══════════════════════════════════════════════════════════════════════════
export function renderSolicitudesAlertas() {
  const wrap = g('sol-alerta-body');
  if (!wrap) return;
  const data = window.__appData;
  const hoy  = new Date().toISOString().slice(0, 10);
  const sols = (data.solicitudes || []).filter(s =>
    s.estatus !== 'completa' && s.estatus !== 'borrador' && s.fecha_compromiso
  );
  if (!sols.length) {
    wrap.innerHTML = '<div style="color:#81c784;font-size:12px;">✓ Sin solicitudes pendientes.</div>';
    return;
  }
  const vencidas = sols.filter(s => s.fecha_compromiso < hoy);
  const proximas = sols.filter(s => s.fecha_compromiso >= hoy);

  wrap.innerHTML = [
    ...vencidas.map(s => {
      const sin = data.sin.find(x => x.id === s.id_siniestro) || {};
      return `<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <span style="color:#ef9f9f;font-weight:700;">⚠ Vencida</span>
        <span style="color:var(--text);flex:1;">${s.asunto || 'Solicitud #' + s.id}</span>
        <span style="color:var(--text-ter);">${sin.numero_exp || ''}</span>
        <span style="color:#ef9f9f;">${fmtD(s.fecha_compromiso)}</span>
        <button class="btn btn-sm" onclick="irAExpediente(${s.id_siniestro})" style="font-size:10px;">Ver</button>
      </div>`;
    }),
    ...proximas.map(s => {
      const sin  = data.sin.find(x => x.id === s.id_siniestro) || {};
      const dias = Math.ceil((new Date(s.fecha_compromiso) - new Date()) / (1000 * 60 * 60 * 24));
      return `<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <span style="color:#ffd700;">⏳ ${dias}d</span>
        <span style="color:var(--text);flex:1;">${s.asunto || 'Solicitud #' + s.id}</span>
        <span style="color:var(--text-ter);">${sin.numero_exp || ''}</span>
        <span style="color:var(--text-sec);">${fmtD(s.fecha_compromiso)}</span>
        <button class="btn btn-sm" onclick="irAExpediente(${s.id_siniestro})" style="font-size:10px;">Ver</button>
      </div>`;
    }),
  ].join('');
}

// ══════════════════════════════════════════════════════════════════════════
// VER DETALLE SOLICITUD
// ══════════════════════════════════════════════════════════════════════════
export function verSolicitud(solId) {
  const data  = window.__appData;
  const sol   = (data.solicitudes || []).find(s => s.id === solId);
  if (!sol) return;
  const items    = (data.sol_items || []).filter(i => i.id_solicitud === solId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const segs     = (data.sol_seg  || []).filter(s => s.id_solicitud === solId).sort((a, b) => a.fecha > b.fecha ? -1 : 1);
  const pendientes = items.filter(i => !i.recibido);
  const recibidos  = items.filter(i =>  i.recibido);
  const pct        = items.length ? Math.round(recibidos.length / items.length * 100) : 0;

  const LABEL = { borrador: 'Borrador', enviada: 'Enviada', parcial: 'Parcial', completa: '✓ Completa', vencida: '⚠ Vencida' };
  const filaItem = (it) => `<tr>
    <td style="text-align:center;padding:6px 8px;border:1px solid var(--border);">
      <input type="checkbox" ${it.recibido ? 'checked' : ''}
        onchange="solToggleItem(${it.id}, this.checked)">
    </td>
    <td style="padding:6px 8px;border:1px solid var(--border);font-size:12px;
      ${it.recibido ? 'text-decoration:line-through;color:var(--text-ter);' : ''}">${it.descripcion}</td>
    <td style="padding:6px 8px;border:1px solid var(--border);font-size:11px;color:#2e7d52;width:90px;">
      ${it.fecha_recepcion ? it.fecha_recepcion.split('-').reverse().join('/') : ''}
    </td>
  </tr>`;

  const ICONS = { envio: '📤', acuse_parcial: '📩', acuse_total: '✅', recordatorio: '🔔', nota: '📝' };

  const html = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:12px;margin-bottom:14px;background:var(--surface);padding:10px;border-radius:6px;">
    <div><strong>Destinatario:</strong> ${sol.destinatario_nombre || '—'} ${sol.destinatario_cargo ? '· ' + sol.destinatario_cargo : ''}</div>
    <div><strong>Empresa:</strong> ${sol.destinatario_empresa || '—'}</div>
    <div><strong>Correo:</strong> ${sol.destinatario_email || '—'}</div>
    <div><strong>Fecha solicitud:</strong> ${fmtD(sol.fecha_solicitud)}</div>
    <div><strong>Compromiso:</strong> ${sol.fecha_compromiso ? fmtD(sol.fecha_compromiso) : '—'}</div>
    <div><strong>Estatus:</strong> <span class="sol-badge ${sol.estatus}">${LABEL[sol.estatus] || sol.estatus}</span></div>
  </div>
  ${sol.notas ? `<div style="font-size:11px;color:var(--text-sec);margin-bottom:10px;background:rgba(255,204,0,.08);padding:8px;border-radius:4px;">📝 ${sol.notas}</div>` : ''}
  <div style="margin-bottom:4px;">
    <div class="sol-progress-bar"><div class="sol-progress-fill" style="width:${pct}%"></div></div>
    <span style="font-size:11px;color:var(--text-ter);">${recibidos.length}/${items.length} documentos recibidos (${pct}%)</span>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:10px;">
    <thead><tr>
      <th style="width:36px;background:var(--surface-alt);padding:6px;border:1px solid var(--border);font-size:10px;">✓</th>
      <th style="background:var(--surface-alt);padding:6px;border:1px solid var(--border);font-size:10px;text-align:left;">Documento / Información</th>
      <th style="width:90px;background:var(--surface-alt);padding:6px;border:1px solid var(--border);font-size:10px;">Recibido</th>
    </tr></thead>
    <tbody>${items.map(filaItem).join('')}</tbody>
  </table>
  ${pendientes.length ? `<button class="btn btn-sm" onclick="solAcuseTotal(${sol.id})" style="margin-top:8px;background:rgba(46,125,82,.2);color:#81c784;border-color:rgba(46,125,82,.4);">✅ Marcar todo como recibido</button>` : ''}
  <div style="margin-top:18px;">
    <div style="font-size:11px;font-weight:700;color:var(--text-sec);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">Seguimiento</div>
    <button class="btn btn-sm" onclick="abrirSeguimiento(${sol.id})" style="margin-bottom:8px;font-size:11px;">+ Agregar nota / acuse</button>
    <div class="sol-seguimiento-wrap">
      ${segs.length
        ? segs.map(sg => `<div class="sol-seguimiento-row">
            <span class="sol-seg-icon">${ICONS[sg.tipo] || '📌'}</span>
            <span class="sol-seg-fecha">${fmtD(sg.fecha)}</span>
            <span class="sol-seg-txt">${sg.descripcion || ''} ${sg.usuario ? '<em style="color:var(--text-ter);">— ' + sg.usuario + '</em>' : ''}</span>
          </div>`).join('')
        : '<div style="font-size:11px;color:var(--text-ter);padding:8px 0;">Sin registros de seguimiento.</div>'}
    </div>
  </div>`;

  g('sol-det-body').innerHTML   = html;
  g('sol-det-title').textContent = sol.asunto || 'Solicitud #' + sol.id;
  window._solActual      = sol;
  window._solItemsActual = items;
  abrirModal('modal-sol-detalle');
}

// ══════════════════════════════════════════════════════════════════════════
// TOGGLE ÍTEM RECIBIDO
// ══════════════════════════════════════════════════════════════════════════
export async function solToggleItem(itemId, recibido) {
  const db   = window.__db;
  const data = window.__appData;
  await db.from('solicitud_items').update({
    recibido,
    fecha_recepcion: recibido ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', itemId);
  const solId = (data.sol_items || []).find(i => i.id === itemId)?.id_solicitud;
  if (solId) {
    const todos     = (data.sol_items || []).filter(i => i.id_solicitud === solId);
    const todosRec  = todos.every(i  => i.id === itemId ? recibido : i.recibido);
    const algunoRec = todos.some(i   => i.id === itemId ? recibido : i.recibido);
    const nuevoEst  = todosRec ? 'completa' : algunoRec ? 'parcial' : 'enviada';
    await db.from('solicitudes_info').update({ estatus: nuevoEst }).eq('id', solId);
  }
  await loadAll();
  verSolicitud(solId || (data.sol_items || []).find(i => i.id === itemId)?.id_solicitud);
}

// ══════════════════════════════════════════════════════════════════════════
// ACUSE TOTAL
// ══════════════════════════════════════════════════════════════════════════
export async function solAcuseTotal(solId) {
  const db  = window.__db;
  const hoy = new Date().toISOString().slice(0, 10);
  await db.from('solicitud_items').update({ recibido: true, fecha_recepcion: hoy }).eq('id_solicitud', solId);
  await db.from('solicitudes_info').update({ estatus: 'completa' }).eq('id', solId);
  await db.from('solicitud_seguimiento').insert({
    id_solicitud: solId, tipo: 'acuse_total', fecha: hoy,
    descripcion:  'Todos los documentos marcados como recibidos',
    usuario:      g('user-lbl')?.textContent || 'Sistema',
  });
  await loadAll();
  verSolicitud(solId);
  toast('✓ Solicitud marcada como completa');
}

// ══════════════════════════════════════════════════════════════════════════
// SEGUIMIENTO
// ══════════════════════════════════════════════════════════════════════════
export function abrirSeguimiento(solId) {
  g('seg-sol-id').value  = solId;
  g('seg-fecha').value   = new Date().toISOString().slice(0, 10);
  g('seg-descripcion').value = '';
  abrirModal('modal-sol-seg');
}

export async function guardarSeguimiento() {
  const db    = window.__db;
  const solId = parseInt(g('seg-sol-id').value);
  const tipo  = g('seg-tipo').value;
  const fecha = g('seg-fecha').value || new Date().toISOString().slice(0, 10);
  const desc  = g('seg-descripcion')?.value || '';
  if (!solId) return;
  await db.from('solicitud_seguimiento').insert({
    id_solicitud: solId, tipo, fecha, descripcion: desc,
    usuario: g('user-lbl')?.textContent || 'Sistema',
  });
  if (tipo === 'acuse_total')   await db.from('solicitudes_info').update({ estatus: 'completa' }).eq('id', solId);
  if (tipo === 'acuse_parcial') await db.from('solicitudes_info').update({ estatus: 'parcial'  }).eq('id', solId);
  if (g('seg-descripcion')) g('seg-descripcion').value = '';
  cerrarModal('modal-sol-seg');
  await loadAll();
  verSolicitud(solId);
  toast('Seguimiento registrado');
}

// ══════════════════════════════════════════════════════════════════════════
// EDITAR DESDE DETALLE
// ══════════════════════════════════════════════════════════════════════════
export async function solEditarDesdeDetalle() {
  const sol = window._solActual;
  if (!sol) return;
  cerrarModal('modal-sol-detalle');
  await solInicializarCatalogo();
  solItemsExtra = [];
  solRamoActivo = 'General';
  g('sol-modal-title').textContent = 'Editar Solicitud';
  g('sol-id').value                = sol.id;
  g('sol-sin-id').value            = sol.id_siniestro;
  g('sol-asunto').value            = sol.asunto             || '';
  g('sol-fecha').value             = sol.fecha_solicitud    || '';
  g('sol-fecha-compromiso').value  = sol.fecha_compromiso   || '';
  g('sol-dest-nombre').value       = sol.destinatario_nombre   || '';
  g('sol-dest-cargo').value        = sol.destinatario_cargo    || '';
  g('sol-dest-empresa').value      = sol.destinatario_empresa  || '';
  g('sol-dest-email').value        = sol.destinatario_email    || '';
  g('sol-notas').value             = sol.notas              || '';
  solRenderRamoTabs();
  solRenderCatalogo();
  // Pre-marcar items existentes
  const items = window._solItemsActual || [];
  setTimeout(() => {
    document.querySelectorAll('#sol-catalogo-wrap input[type=checkbox]').forEach(chk => {
      try {
        const val = JSON.parse(decodeURIComponent(chk.value));
        if (items.find(i => i.descripcion === val.desc)) chk.checked = true;
      } catch { /* noop */ }
    });
    solActualizarConteo();
  }, 100);
  abrirModal('modal-sol');
}

// ══════════════════════════════════════════════════════════════════════════
// ACCIÓN RÁPIDA DESDE TARJETA
// ══════════════════════════════════════════════════════════════════════════
export async function solAccionRapida(solId, accion) {
  const data = window.__appData;
  const sol  = (data.solicitudes || []).find(s => s.id === solId);
  if (!sol) { toast('Solicitud no encontrada'); return; }
  const items   = (data.sol_items || []).filter(i => i.id_solicitud === solId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const sin     = data.sin.find(s => s.id === sol.id_siniestro);
  if (!sin) { toast('Expediente no encontrado'); return; }
  const prevSin           = window.__currentSin;
  window._solActual       = sol;
  window._solItemsActual  = items;
  window.__currentSin     = sin;
  if      (accion === 'email')       solGenerarEmail();
  else if (accion === 'pdf')         await solGenerarPDF();
  else if (accion === 'word')        await solGenerarWord();
  else if (accion === 'recordatorio') await solGenerarRecordatorio(sol, items, sin);
  else if (accion === 'rec_word')    await solGenerarRecordatorioWord(sol, items, sin);
  else if (accion === 'rec_email')       solGenerarRecordatorioEmail(sol, items, sin);
  window.__currentSin = prevSin;
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS DE AGRUPACIÓN Y FORMATO
// ══════════════════════════════════════════════════════════════════════════
export function solAgruparItems(items) {
  const orden = {};
  let idx = 0;
  items.forEach(it => {
    const cat = it.categoria || it.cat || 'General';
    if (cat === 'Documentación General' || cat === 'General') {
      if (orden[cat] === undefined) orden[cat] = idx++;
    }
  });
  items.forEach(it => {
    const cat = it.categoria || it.cat || 'General';
    if (orden[cat] === undefined) orden[cat] = idx++;
  });
  const grupos = {};
  items.forEach(it => {
    const cat = it.categoria || it.cat || 'General';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(it);
  });
  return Object.entries(grupos).sort((a, b) => (orden[a[0]] || 0) - (orden[b[0]] || 0));
}

export function solFilasAgrupadas(items, colorHeader, colorBorder, colorAlt, tachado = false, mostrarRecibido = false) {
  const grupos = solAgruparItems(items);
  let num = 1;
  let html = '';
  grupos.forEach(([cat, rows]) => {
    html += `<tr><td colspan="${mostrarRecibido ? 4 : 3}" style="padding:5px 8px;
      background:${colorHeader}22;border:1px solid ${colorBorder};font-size:10px;font-weight:700;
      color:${colorHeader};text-transform:uppercase;letter-spacing:.05em;">${cat}</td></tr>`;
    rows.forEach(it => {
      const bg  = num % 2 === 0 ? '#fff' : (tachado ? '#f0fff4' : '#f8faff');
      const desc = it.descripcion || it.desc || '';
      html += `<tr style="background:${bg};">
        <td style="padding:6px 8px;border:1px solid ${colorBorder};font-size:11px;text-align:center;width:32px;">${tachado ? '✓' : num++}</td>
        <td style="padding:6px 8px;border:1px solid ${colorBorder};font-size:11px;${tachado ? 'text-decoration:line-through;color:#666;' : ''}">${desc}</td>
        ${mostrarRecibido ? `<td style="padding:6px 8px;border:1px solid ${colorBorder};font-size:10px;color:#2e7d52;width:90px;">
          ${it.fecha_recepcion ? it.fecha_recepcion.split('-').reverse().join('/') : ''}</td>` : ''}
      </tr>`;
      if (!tachado) num;
    });
  });
  return html;
}

export function solTextoPorCategoria(items) {
  const grupos = solAgruparItems(items);
  let num = 1;
  let txt = '';
  grupos.forEach(([cat, rows]) => {
    txt += `\n${cat.toUpperCase()}\n${'─'.repeat(cat.length)}\n`;
    rows.forEach(it => { txt += `  ${num++}. ${it.descripcion || it.desc || ''}\n`; });
  });
  return txt.trim();
}

// ══════════════════════════════════════════════════════════════════════════
// GENERACIÓN CORREO (portapapeles)
// ══════════════════════════════════════════════════════════════════════════
export function solGenerarEmail() {
  const sol   = window._solActual;
  const items = window._solItemsActual || [];
  const cs    = window.__currentSin;
  if (!sol || !cs) return;
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === cs.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';

  const txt = `Estimado(a) ${sol.destinatario_nombre || ''}${sol.destinatario_cargo ? ', ' + sol.destinatario_cargo : ''}:

Por medio del presente, nos dirigimos a usted en relación al siniestro radicado bajo los siguientes datos:

Asegurado:   ${asdo.nombre || '—'}
Aseguradora: ${aseg.nombre || '—'}
No. Siniestro: ${cs.numero_siniestro || '—'}
No. Trámite:   ${cs.tramite_gnp || cs.numero_exp || '—'}
Ref. AASA:     ${cs.numero_exp || '—'}
Causa:         ${cs.causa || '—'}

Con la finalidad de continuar con el proceso de ajuste, le solicitamos atentamente nos proporcione la siguiente documentación e información:

${solTextoPorCategoria(items)}
${sol.notas ? '\nNota adicional: ' + sol.notas : ''}

Le agradecemos nos haga llegar la información a más tardar el ${sol.fecha_compromiso ? fmtD(sol.fecha_compromiso) : 'a la brevedad posible'}.

Quedamos a sus órdenes para cualquier aclaración.

Atentamente,

${user}
Almaraz Ajustadores, S.A.
PBX +52 55 5593-8823
aasa.mexico@aasa.com.mx`;

  navigator.clipboard.writeText(txt).then(() => toast('✉ Texto del correo copiado al portapapeles'));
}

// ══════════════════════════════════════════════════════════════════════════
// GENERACIÓN PDF (ventana impresión)
// ══════════════════════════════════════════════════════════════════════════
export async function solGenerarPDF() {
  const sol   = window._solActual;
  const items = window._solItemsActual || [];
  const cs    = window.__currentSin;
  if (!sol || !cs) { toast('Abre una solicitud primero'); return; }
  toast('Generando PDF…');
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === cs.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';
  const filas = solFilasAgrupadas(items, '#1558b0', '#c8d4e8', '#f8faff', false, false);

  const htmlPDF = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#1a1a2e;font-size:12px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;
      border-bottom:3px solid #1558b0;padding-bottom:12px;margin-bottom:16px;}
    .brand{font-size:22px;font-weight:900;color:#1558b0;letter-spacing:-.5px;}
    .titulo{font-size:15px;font-weight:700;color:#1558b0;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1558b0;color:#fff;padding:7px 8px;font-size:10px;text-align:left;}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px;
      background:#f0f4ff;padding:10px;border-radius:4px;}
    .dato{font-size:11px;} .dato strong{color:#1558b0;}
    .footer{margin-top:24px;border-top:1px solid #c8d4e8;padding-top:8px;font-size:10px;color:#666;text-align:center;}
  </style></head><body>
  <div class="header">
    <div><div class="brand">AASA</div>
      <div style="font-size:10px;color:#666;">Almaraz Ajustadores, S.A.</div></div>
    <div style="text-align:right;font-size:10px;color:#666;">
      Calle Miguel Hidalgo 61, Oficina 3<br>
      Col. San Jerónimo Lídice, C.P. 10200, CDMX<br>
      CNSF: C15979 · PBX +52 55 5593-8823</div>
  </div>
  <div class="titulo">SOLICITUD DE INFORMACIÓN</div>
  <div class="datos">
    <div class="dato"><strong>Asegurado:</strong> ${asdo.nombre || '—'}</div>
    <div class="dato"><strong>Aseguradora:</strong> ${aseg.nombre || '—'}</div>
    <div class="dato"><strong>No. Siniestro:</strong> ${cs.numero_siniestro || '—'}</div>
    <div class="dato"><strong>No. Trámite:</strong> ${cs.tramite_gnp || cs.numero_exp || '—'}</div>
    <div class="dato"><strong>Ref. AASA:</strong> ${cs.numero_exp || '—'}</div>
    <div class="dato"><strong>Causa:</strong> ${cs.causa || '—'}</div>
    <div class="dato"><strong>Destinatario:</strong> ${sol.destinatario_nombre || '—'}${sol.destinatario_cargo ? ' · ' + sol.destinatario_cargo : ''}</div>
    <div class="dato"><strong>Empresa:</strong> ${sol.destinatario_empresa || '—'}</div>
    <div class="dato"><strong>Fecha solicitud:</strong> ${fmtD(sol.fecha_solicitud)}</div>
    <div class="dato"><strong>Compromiso entrega:</strong> ${sol.fecha_compromiso ? fmtD(sol.fecha_compromiso) : '—'}</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:32px;">#</th>
      <th>Documento / Información requerida</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>
  ${sol.notas ? `<div style="margin-top:12px;font-size:11px;padding:8px;background:#fff9e6;border:1px solid #ffd700;border-radius:4px;">
    <strong>Nota:</strong> ${sol.notas}</div>` : ''}
  <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="border-top:1px solid #1558b0;padding-top:8px;text-align:center;font-size:11px;">
      ${user}<br><span style="color:#666;">Ajustador — AASA</span></div>
    <div style="border-top:1px solid #999;padding-top:8px;text-align:center;font-size:11px;">
      Acuse de recibo<br><span style="color:#666;">${sol.destinatario_nombre || ''}</span></div>
  </div>
  <div class="footer">ALMARAZ AJUSTADORES, S.A. · Calle Miguel Hidalgo 61, Of. 3, Col. San Jerónimo Lídice, C.P. 10200, CDMX · CNSF: C15979</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(htmlPDF);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

// ══════════════════════════════════════════════════════════════════════════
// GENERACIÓN WORD (solicitud)
// ══════════════════════════════════════════════════════════════════════════
export async function solGenerarWord() {
  const sol   = window._solActual;
  const items = window._solItemsActual || [];
  const cs    = window.__currentSin;
  if (!sol || !cs) { toast('Abre una solicitud primero'); return; }
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === cs.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';

  const { Document, Paragraph, Table, TableRow, TableCell, TextRun,
          AlignmentType, WidthType } = window.docx;

  const makeRow = (cells, isHeader = false) => new TableRow({
    tableHeader: isHeader,
    children: cells.map((txt, ci) => new TableCell({
      shading: isHeader ? { fill: '1558b0' } : (ci === cells.length - 1 && txt === '✓') ? { fill: 'd4edda' } : {},
      children: [new Paragraph({
        children: [new TextRun({ text: String(txt), color: isHeader ? 'FFFFFF' : '000000', bold: isHeader, size: isHeader ? 18 : 16 })],
        alignment: ci === 0 || ci === cells.length - 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
      })],
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
    })),
  });

  const grupos = solAgruparItems(items);
  let num = 1;
  const tablaRows = [makeRow(['#', 'Documento / Información requerida'], true)];
  grupos.forEach(([cat, rows]) => {
    tablaRows.push(new TableRow({
      children: [new TableCell({
        columnSpan: 2,
        shading: { fill: 'dce8f8' },
        children: [new Paragraph({ children: [new TextRun({ text: cat.toUpperCase(), bold: true, size: 16, color: '1558b0' })] })],
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })],
    }));
    rows.forEach(it => tablaRows.push(makeRow([num++, it.descripcion || it.desc || ''])));
  });

  const meta = (label, valor) => new Paragraph({
    children: [new TextRun({ text: label, bold: true, size: 18 }), new TextRun({ text: valor, size: 18 })],
    spacing: { after: 80 },
  });

  const doc = new Document({ sections: [{ children: [
    new Paragraph({ children: [new TextRun({ text: 'SOLICITUD DE INFORMACIÓN', bold: true, size: 28, color: '1558b0' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'ALMARAZ AJUSTADORES, S.A.', bold: true, size: 20, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    meta('Asegurado: ',   asdo.nombre || '—'),
    meta('Aseguradora: ', aseg.nombre || '—'),
    meta('No. Siniestro: ', cs.numero_siniestro || '—'),
    meta('No. Trámite: ',   cs.tramite_gnp || cs.numero_exp || '—'),
    meta('Ref. AASA: ',     cs.numero_exp || '—'),
    meta('Causa: ',         cs.causa || '—'),
    meta('Destinatario: ',  (sol.destinatario_nombre || '—') + (sol.destinatario_cargo ? ' · ' + sol.destinatario_cargo : '')),
    meta('Empresa: ',       sol.destinatario_empresa || '—'),
    meta('Fecha solicitud: ', fmtD(sol.fecha_solicitud)),
    meta('Compromiso: ',    sol.fecha_compromiso ? fmtD(sol.fecha_compromiso) : '—'),
    new Paragraph({ spacing: { after: 240 } }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tablaRows }),
    ...(sol.notas ? [
      new Paragraph({ spacing: { before: 240 } }),
      new Paragraph({ children: [new TextRun({ text: 'Nota: ', bold: true, size: 18 }), new TextRun({ text: sol.notas, size: 18 })] }),
    ] : []),
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({ children: [new TextRun({ text: user, bold: true, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Ajustador — Almaraz Ajustadores, S.A.', size: 18, color: '555555' })] }),
  ]}]});

  const blob = await window.docx.Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `Solicitud_${cs.numero_exp || sol.id}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Word solicitud generado');
}

// ══════════════════════════════════════════════════════════════════════════
// RECORDATORIO PDF
// ══════════════════════════════════════════════════════════════════════════
export async function solGenerarRecordatorio(sol, items, sin) {
  if (!sol || !sin) { toast('Contexto de solicitud no disponible'); return; }
  const db   = window.__db;
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === sin.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';
  const hoy  = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const pendientes = items.filter(i => !i.recibido);
  const recibidos  = items.filter(i =>  i.recibido);
  const filasPend  = solFilasAgrupadas(pendientes, '#e65c00', '#f5c6a0', '#fff8f4', false, false);
  const filasRec   = solFilasAgrupadas(recibidos,  '#2e7d52', '#a8d5b9', '#f0fff4', true,  true);

  const htmlRec = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#1a1a2e;font-size:12px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;
      border-bottom:3px solid #e65c00;padding-bottom:12px;margin-bottom:16px;}
    .brand{font-size:22px;font-weight:900;color:#e65c00;letter-spacing:-.5px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{padding:7px 8px;font-size:10px;text-align:left;}
    .footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:10px;color:#666;text-align:center;}
  </style></head><body>
  <div class="header">
    <div><div class="brand">AASA</div>
      <div style="font-size:10px;color:#666;">Almaraz Ajustadores, S.A.</div>
      <div style="font-size:13px;font-weight:700;color:#e65c00;margin-top:6px;">RECORDATORIO DE DOCUMENTACIÓN PENDIENTE</div></div>
    <div style="text-align:right;font-size:10px;color:#666;">${hoy}<br>CNSF: C15979</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px;background:#fff8f4;padding:10px;border-radius:4px;font-size:11px;">
    <div><strong>Asegurado:</strong> ${asdo.nombre || '—'}</div>
    <div><strong>Aseguradora:</strong> ${aseg.nombre || '—'}</div>
    <div><strong>No. Siniestro:</strong> ${sin.numero_siniestro || '—'}</div>
    <div><strong>Ref. AASA:</strong> ${sin.numero_exp || '—'}</div>
    <div><strong>Destinatario:</strong> ${sol.destinatario_nombre || '—'}</div>
    <div><strong>Fecha solicitud original:</strong> ${fmtD(sol.fecha_solicitud)}</div>
    <div><strong>Avance:</strong> ${recibidos.length}/${items.length} documentos recibidos</div>
    ${sol.fecha_compromiso ? `<div><strong>Fecha compromiso:</strong> ${fmtD(sol.fecha_compromiso)}</div>` : ''}
  </div>
  ${pendientes.length ? `
  <div style="font-size:13px;font-weight:700;color:#e65c00;margin-bottom:8px;">⚠ Documentación pendiente de recibir (${pendientes.length} ítem${pendientes.length > 1 ? 's' : ''})</div>
  <table><thead><tr style="background:#e65c00;">
    <th style="color:#fff;width:32px;">#</th>
    <th style="color:#fff;">Documento / Información requerida</th>
  </tr></thead><tbody>${filasPend}</tbody></table>` :
  '<div style="color:#2e7d52;font-weight:700;font-size:13px;margin-bottom:16px;">✓ Toda la documentación ha sido recibida.</div>'}
  ${recibidos.length ? `
  <div style="font-size:13px;font-weight:700;color:#2e7d52;margin-bottom:8px;">✓ Documentación ya recibida (${recibidos.length} ítem${recibidos.length > 1 ? 's' : ''})</div>
  <table><thead><tr style="background:#2e7d52;">
    <th style="color:#fff;width:30px;">✓</th>
    <th style="color:#fff;">Documento</th>
    <th style="color:#fff;width:90px;">Recibido</th>
  </tr></thead><tbody>${filasRec}</tbody></table>` : ''}
  <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="border-top:1px solid #1558b0;padding-top:8px;text-align:center;font-size:11px;">
      ${user}<br><span style="color:#666;">Ajustador — AASA</span></div>
    <div style="border-top:1px solid #999;padding-top:8px;text-align:center;font-size:11px;">
      Acuse de recibo<br><span style="color:#666;">${sol.destinatario_nombre || ''}</span></div>
  </div>
  <div class="footer">ALMARAZ AJUSTADORES, S.A. · Calle Miguel Hidalgo 61, Of. 3, Col. San Jerónimo Lídice, C.P. 10200, CDMX · CNSF: C15979</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(htmlRec);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);

  await db.from('solicitud_seguimiento').insert({
    id_solicitud: sol.id, tipo: 'recordatorio',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: `Recordatorio generado — ${pendientes.length} documento${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''}`,
    usuario: g('user-lbl')?.textContent || 'Sistema',
  });
  await loadAll();
  toast('🔔 Recordatorio generado y registrado en el seguimiento');
}

// ══════════════════════════════════════════════════════════════════════════
// RECORDATORIO WORD
// ══════════════════════════════════════════════════════════════════════════
export async function solGenerarRecordatorioWord(sol, items, sin) {
  if (!sol || !sin) { toast('Contexto de solicitud no disponible'); return; }
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === sin.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';
  const hoy  = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const pendientes = items.filter(i => !i.recibido);
  const recibidos  = items.filter(i =>  i.recibido);

  const { Document, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } = window.docx;

  const mkCell = (txt, opts = {}) => new TableCell({
    shading: opts.bg ? { fill: opts.bg } : {},
    columnSpan: opts.span || 1,
    children: [new Paragraph({
      children: [new TextRun({ text: String(txt || ''), bold: !!opts.bold, size: opts.size || 16, color: opts.color || '000000', italics: !!opts.italics })],
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    })],
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });

  const buildSection = (sectionItems, headerColor, tachado) => {
    const grupos = solAgruparItems(sectionItems);
    const rows   = [];
    let num      = 1;
    grupos.forEach(([cat, its]) => {
      rows.push(new TableRow({ children: [mkCell(cat.toUpperCase(), { bg: 'dce8f8', bold: true, color: '1558b0', span: tachado ? 3 : 2 })] }));
      its.forEach(it => {
        const desc  = it.descripcion || it.desc || '';
        const cells = [
          mkCell(tachado ? '✓' : num++, { center: true }),
          mkCell(desc, { italics: tachado, color: tachado ? '666666' : '000000' }),
        ];
        if (tachado) cells.push(mkCell(it.fecha_recepcion ? it.fecha_recepcion.split('-').reverse().join('/') : '', { center: true, color: '2e7d52' }));
        rows.push(new TableRow({ children: cells }));
      });
    });
    return rows;
  };

  const bodyChildren = [
    new Paragraph({ children: [new TextRun({ text: 'RECORDATORIO DE DOCUMENTACIÓN PENDIENTE', bold: true, size: 28, color: 'e65c00' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'ALMARAZ AJUSTADORES, S.A.', bold: true, size: 20, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: hoy, size: 18, color: '888888' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    ...[
      ['Asegurado',    asdo.nombre || '—'],
      ['Aseguradora',  aseg.nombre || '—'],
      ['No. Siniestro', sin.numero_siniestro || '—'],
      ['Ref. AASA',    sin.numero_exp || '—'],
      ['Destinatario', (sol.destinatario_nombre || '—') + (sol.destinatario_cargo ? ' · ' + sol.destinatario_cargo : '')],
      ['Avance',       `${recibidos.length}/${items.length} documentos recibidos`],
    ].map(([lbl, val]) => new Paragraph({
      children: [new TextRun({ text: lbl + ': ', bold: true, size: 18 }), new TextRun({ text: val, size: 18 })],
      spacing: { after: 80 },
    })),
    new Paragraph({ spacing: { after: 240 } }),
  ];

  if (pendientes.length) {
    bodyChildren.push(new Paragraph({ children: [new TextRun({ text: `⚠ DOCUMENTACIÓN PENDIENTE (${pendientes.length})`, bold: true, size: 22, color: 'e65c00' })], spacing: { after: 120 } }));
    bodyChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: [mkCell('#', { bg: 'e65c00', color: 'FFFFFF', bold: true, center: true }), mkCell('Documento / Información requerida', { bg: 'e65c00', color: 'FFFFFF', bold: true })] }),
      ...buildSection(pendientes, 'e65c00', false),
    ]}));
  }
  if (recibidos.length) {
    bodyChildren.push(new Paragraph({ spacing: { before: 400, after: 120 } }));
    bodyChildren.push(new Paragraph({ children: [new TextRun({ text: `✓ DOCUMENTACIÓN RECIBIDA (${recibidos.length})`, bold: true, size: 22, color: '2e7d52' })], spacing: { after: 120 } }));
    bodyChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: [mkCell('✓', { bg: '2e7d52', color: 'FFFFFF', bold: true, center: true }), mkCell('Documento', { bg: '2e7d52', color: 'FFFFFF', bold: true }), mkCell('Recibido', { bg: '2e7d52', color: 'FFFFFF', bold: true, center: true })] }),
      ...buildSection(recibidos, '2e7d52', true),
    ]}));
  }

  bodyChildren.push(new Paragraph({ spacing: { before: 600 } }));
  bodyChildren.push(new Paragraph({ children: [new TextRun({ text: user, bold: true, size: 20 })] }));
  bodyChildren.push(new Paragraph({ children: [new TextRun({ text: 'Ajustador — Almaraz Ajustadores, S.A.', size: 18, color: '555555' })] }));

  const doc  = new Document({ sections: [{ children: bodyChildren }] });
  const blob = await window.docx.Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Recordatorio_${sin.numero_exp || sol.id}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Recordatorio Word generado');
}

// ══════════════════════════════════════════════════════════════════════════
// RECORDATORIO EMAIL (portapapeles)
// ══════════════════════════════════════════════════════════════════════════
export function solGenerarRecordatorioEmail(sol, items, sin) {
  if (!sol || !sin) { toast('Contexto de solicitud no disponible'); return; }
  const data = window.__appData;
  const pol  = data.pol.find(p => p.id === sin.id_poliza) || {};
  const asdo = data.asdo.find(a => a.id === pol.id_asegurado) || {};
  const aseg = data.aseg.find(a => a.id === pol.id_aseguradora) || {};
  const user = g('user-lbl')?.textContent || 'Ajustador';
  const hoy  = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const pendientes = items.filter(i => !i.recibido);
  const recibidos  = items.filter(i =>  i.recibido);

  const txt = `Estimado(a) ${sol.destinatario_nombre || ''}${sol.destinatario_cargo ? ', ' + sol.destinatario_cargo : ''}:

Por medio del presente le recordamos que con fecha ${fmtD(sol.fecha_solicitud) || 'anterior'} le fue enviada solicitud de documentación relacionada con el siniestro que se detalla a continuación:

Asegurado:   ${asdo.nombre || '—'}
Aseguradora: ${aseg.nombre || '—'}
No. Siniestro: ${sin.numero_siniestro || '—'}
Ref. AASA:     ${sin.numero_exp || '—'}
Causa:         ${sin.causa || '—'}

Avance actual: ${recibidos.length}/${items.length} documentos recibidos.
${sol.fecha_compromiso ? 'Fecha compromiso de entrega: ' + fmtD(sol.fecha_compromiso) : ''}

${pendientes.length ? `La siguiente documentación aún se encuentra PENDIENTE de recibir:\n\n${solTextoPorCategoria(pendientes)}` : '✓ Toda la documentación ha sido recibida. Gracias.'}

${recibidos.length && pendientes.length ? `\nDocumentación ya recibida:\n${solTextoPorCategoria(recibidos)}` : ''}

Le agradecemos su atención a la brevedad posible.

Atentamente,

${user}
Almaraz Ajustadores, S.A.
PBX +52 55 5593-8823
aasa.mexico@aasa.com.mx`;

  navigator.clipboard.writeText(txt).then(() => toast('🔔 Texto del recordatorio copiado al portapapeles'));
}

// ══════════════════════════════════════════════════════════════════════════
// IA — SUGERENCIA DE DOCUMENTOS
// ══════════════════════════════════════════════════════════════════════════
export async function solIaSugerir() {
  if (!iaCheckKey()) return;
  const cs = window.__currentSin;
  if (!cs) { toast('Selecciona expediente primero'); return; }
  const data    = window.__appData;
  const ramo    = data.pol.find(p => p.id === cs.id_poliza)?.ramo || '';
  const subramo = cs.subramo || '';
  const causa   = cs.causa   || '';

  const prompt = `Eres un ajustador de seguros experto en México. Dado el siguiente siniestro:
Ramo: ${ramo} | Subramo/Cobertura: ${subramo} | Causa: ${causa}
Lista los tipos de documentos e información más importantes a solicitar al asegurado.
Responde SOLO con un JSON array de objetos con campos "cat" (categoría) y "desc" (descripción breve). Máximo 12 ítems. Sin explicaciones.`;

  toast('⏳ IA generando sugerencias…');
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + iaGetKey() },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 600, temperature: 0.3, messages: [{ role: 'user', content: prompt }] }),
    });
    const j    = await resp.json();
    const txt  = j.choices?.[0]?.message?.content || '[]';
    const clean = txt.replace(/```json|```/g, '').trim();
    const sugs  = JSON.parse(clean);
    sugs.forEach(it => {
      if (!solCatalogoExtendido[solRamoActivo]) solCatalogoExtendido[solRamoActivo] = [];
      if (!solCatalogoExtendido[solRamoActivo].find(x => x.desc === it.desc)) {
        solCatalogoExtendido[solRamoActivo].push({ cat: it.cat || 'General', desc: it.desc, _iaGen: true });
      }
    });
    solRenderCatalogo();
    setTimeout(() => {
      document.querySelectorAll('#sol-catalogo-wrap input[type=checkbox]').forEach(chk => {
        try {
          const val = JSON.parse(decodeURIComponent(chk.value));
          if (sugs.find(i => i.desc === val.desc)) chk.checked = true;
        } catch { /* noop */ }
      });
      solActualizarConteo();
      toast(`✦ IA sugirió ${sugs.length} documentos — revisa y ajusta`);
    }, 100);
  } catch (e) { toast('⚠ Error IA: ' + e.message); }
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORTS AGRUPADOS (para window.* en app.js)
// ══════════════════════════════════════════════════════════════════════════
export const solicitudesPublic = {
  // catálogo
  solInicializarCatalogo,
  solRenderRamoTabs,
  solCambiarRamo,
  solRenderCatalogo,
  solActualizarConteo,
  solAgregarCustom,
  solIaSugerir,
  // CRUD
  abrirNuevaSolicitud,
  guardarSolicitud,
  verSolicitud,
  solEditarDesdeDetalle,
  solAccionRapida,
  solToggleItem,
  solAcuseTotal,
  // seguimiento
  abrirSeguimiento,
  guardarSeguimiento,
  // render
  renderSolicitudesTab,
  renderSolicitudesAlertas,
  // generación
  solGenerarEmail,
  solGenerarPDF,
  solGenerarWord,
  solGenerarRecordatorio,
  solGenerarRecordatorioWord,
  solGenerarRecordatorioEmail,
  // helpers (expuestos para app.js si se necesitan)
  solAgruparItems,
  solFilasAgrupadas,
  solTextoPorCategoria,
};
