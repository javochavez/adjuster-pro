/**
 * mobile.js — AdjusterPro JChA / Almaraz Ajustadores (AASA)
 * Módulo ES: shell PWA móvil — bitácora, ToDo, fotos con IA visión y nota rápida.
 *
 * Dependencias globales inyectadas por app.js:
 *   window.__db, window.__appData, window.__currentSin (setter)
 *   toast, g, loadAll
 *   iaCheckKey, iaGetKey (de ia.js)
 *   iaVisionFileToB64, iaVisionAnalizar (de graficos.js)
 */

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DEL MÓDULO
// ══════════════════════════════════════════════════════════════════════════
let mobCurrentSin = null;
let mobCurrentTab = 'bitacora';

// ══════════════════════════════════════════════════════════════════════════
// DETECCIÓN Y ARRANQUE
// ══════════════════════════════════════════════════════════════════════════
export function mobIsMobile() {
  return window.innerWidth < 768;
}

export function mobInit() {
  if (!mobIsMobile()) return;
  const shell   = g('mobile-shell');
  const desktop = g('desktop-app');
  if (shell)   shell.style.display   = 'flex';
  if (desktop) desktop.style.display = 'none';
  const data = window.__appData;
  const sins = data.sin || [];
  if (sins.length > 0) mobSetExp(sins[0].id);
  mobTab('bitacora');
}

// ══════════════════════════════════════════════════════════════════════════
// SELECCIÓN DE EXPEDIENTE
// ══════════════════════════════════════════════════════════════════════════
export function mobSetExp(id) {
  const data = window.__appData;
  mobCurrentSin        = (data.sin || []).find(s => s.id === id) || null;
  window.__currentSin  = mobCurrentSin;   // sincroniza con el resto de módulos

  const lbl = g('mob-exp-label');
  if (lbl) {
    if (mobCurrentSin) {
      const pol  = (data.pol  || []).find(p => p.id === mobCurrentSin.id_poliza)   || {};
      const asdo = (data.asdo || []).find(a => a.id === pol.id_asegurado)           || {};
      lbl.textContent = mobCurrentSin.numero_exp + (asdo.nombre ? ' — ' + asdo.nombre.split(' ')[0] : '');
    } else {
      lbl.textContent = 'Sin expediente';
    }
  }
  mobTab(mobCurrentTab);
}

export function mobCambiarExp() {
  const data = window.__appData;
  const sins = (data.sin || []).slice().sort((a, b) => b.id - a.id);
  const body = g('mob-body');
  if (!body) return;
  body.innerHTML = `
    <div class="mob-section-title">Seleccionar expediente</div>
    <input type="text" id="mob-exp-search"
      placeholder="Buscar por Ref., Asegurado…"
      style="background:var(--surface);border:1px solid var(--border-md);border-radius:var(--r);
             color:var(--text);font-size:16px;padding:12px;width:100%;box-sizing:border-box;margin-bottom:10px;"
      oninput="mobFiltrarExp(this.value)">
    <div id="mob-exp-list"></div>`;
  mobRenderExpList(sins);
}

export function mobFiltrarExp(q) {
  const data = window.__appData;
  const sins = (data.sin || []).slice().sort((a, b) => b.id - a.id);
  const filtered = q.trim() ? sins.filter(s => {
    const pol  = (data.pol  || []).find(p => p.id === s.id_poliza)   || {};
    const asdo = (data.asdo || []).find(a => a.id === pol.id_asegurado) || {};
    const hay  = (s.numero_exp + ' ' + (asdo.nombre || '') + (pol.numero || '')).toLowerCase();
    return hay.includes(q.toLowerCase());
  }) : sins;
  mobRenderExpList(filtered);
}

export function mobRenderExpList(sins) {
  const list = g('mob-exp-list');
  if (!list) return;
  if (!sins.length) { list.innerHTML = '<div class="mob-empty">Sin resultados</div>'; return; }
  const data = window.__appData;
  list.innerHTML = sins.slice(0, 30).map(s => {
    const pol  = (data.pol  || []).find(p => p.id === s.id_poliza)       || {};
    const asdo = (data.asdo || []).find(a => a.id === pol.id_asegurado)   || {};
    const aseg = (data.aseg || []).find(a => a.id === pol.id_aseguradora) || {};
    const sel  = mobCurrentSin?.id === s.id ? ' selected' : '';
    return `<div class="mob-exp-item${sel}" onclick="mobSetExp(${s.id})">
      <div class="mob-exp-ref">${s.numero_exp || '—'}</div>
      <div class="mob-exp-sub">${asdo.nombre || '—'} · ${aseg.nombre || '—'}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN POR TABS
// ══════════════════════════════════════════════════════════════════════════
export function mobTab(tab) {
  mobCurrentTab = tab;
  const MAP = { bit: 'bitacora', todo: 'todo', foto: 'foto', nota: 'nota' };
  Object.entries(MAP).forEach(([k, v]) => {
    const btn = g('mob-nav-' + k);
    if (btn) btn.classList.toggle('active', tab === v);
  });
  const body = g('mob-body');
  if (!body) return;
  if      (tab === 'bitacora') mobRenderBitacora(body);
  else if (tab === 'todo')     mobRenderTodo(body);
  else if (tab === 'foto')     mobRenderFoto(body);
  else if (tab === 'nota')     mobRenderNota(body);
}

// ══════════════════════════════════════════════════════════════════════════
// TAB BITÁCORA
// ══════════════════════════════════════════════════════════════════════════
export function mobRenderBitacora(body) {
  const data  = window.__appData;
  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toTimeString().slice(0, 5);
  const bits  = mobCurrentSin
    ? (data.bitacora || [])
        .filter(b => b.id_siniestro === mobCurrentSin.id)
        .slice()
        .sort((a, b) => (b.fecha + (b.hora || '')) > (a.fecha + (a.hora || '')) ? 1 : -1)
        .slice(0, 20)
    : [];

  const TIPOS = [
    'Inspección física', 'Llamada telefónica', 'Correo electrónico',
    'Reunión presencial', 'Videoconferencia', 'Envío de documentos',
    'Recepción de documentos', 'Dictamen / Peritaje', 'Coordinación interna',
    '__otro__',
  ];

  body.innerHTML = `
    <div class="mob-section-title">Nueva entrada de bitácora</div>
    <div class="mob-form">
      <div class="mob-row">
        <div class="mob-field">
          <label>Fecha</label>
          <input type="date" id="mbit-fecha" value="${today}">
        </div>
        <div class="mob-field">
          <label>Hora</label>
          <input type="time" id="mbit-hora" value="${now}">
        </div>
      </div>
      <div class="mob-row">
        <div class="mob-field">
          <label>Horas</label>
          <input type="number" id="mbit-horas" value="0" min="0" max="12" style="text-align:center;">
        </div>
        <div class="mob-field">
          <label>Minutos</label>
          <input type="number" id="mbit-minutos" value="0" min="0" max="59" style="text-align:center;">
        </div>
      </div>
      <div class="mob-field">
        <label>Tipo de actividad</label>
        <select id="mbit-tipo" onchange="mobBitTipoChange()">
          ${TIPOS.map(t => `<option value="${t}">${t === '__otro__' ? 'Otro (especificar)' : t}</option>`).join('')}
        </select>
      </div>
      <div class="mob-field" id="mbit-otro-wrap" style="display:none;">
        <label>Especificar tipo</label>
        <input type="text" id="mbit-tipo-otro" placeholder="Tipo de actividad…">
      </div>
      <div class="mob-field">
        <label>Nota / Descripción</label>
        <textarea id="mbit-nota" placeholder="Describe la actividad realizada…" style="min-height:100px;"></textarea>
      </div>
      <button class="mob-btn-primary" onclick="mobGuardarBitacora()">💾 Guardar entrada</button>
    </div>

    <div class="mob-section-title">Últimas entradas</div>
    ${bits.length
      ? bits.map(b => `<div class="mob-card">
          <div class="mob-card-title">${b.nota || '—'}</div>
          <div class="mob-card-sub">${b.fecha || ''} ${b.hora ? b.hora.slice(0, 5) : ''} · ${b.horas || 0}h ${b.minutos || 0}m · ${b.usuario || ''}</div>
        </div>`).join('')
      : '<div class="mob-empty">Sin entradas aún</div>'}`;
}

export function mobBitTipoChange() {
  const sel  = g('mbit-tipo')?.value;
  const wrap = g('mbit-otro-wrap');
  if (wrap) wrap.style.display = sel === '__otro__' ? 'flex' : 'none';
}

export async function mobGuardarBitacora() {
  if (!mobCurrentSin) { toast('Selecciona un expediente primero'); return; }
  const nota = g('mbit-nota')?.value?.trim();
  if (!nota) { toast('La nota no puede estar vacía'); return; }
  const tipoSel = g('mbit-tipo')?.value;
  const tipo    = tipoSel === '__otro__' ? (g('mbit-tipo-otro')?.value?.trim() || 'Otro') : tipoSel;
  const db = window.__db;
  const row = {
    id_siniestro: mobCurrentSin.id,
    fecha:        g('mbit-fecha')?.value  || new Date().toISOString().slice(0, 10),
    hora:         g('mbit-hora')?.value   || new Date().toTimeString().slice(0, 8),
    horas:        parseInt(g('mbit-horas')?.value)   || 0,
    minutos:      parseInt(g('mbit-minutos')?.value) || 0,
    nota:         `[${tipo}] ${nota}`,
    usuario:      g('user-lbl')?.textContent || '',
  };
  const { error } = await db.from('bitacora_ajustador').insert(row);
  if (error) { toast('Error: ' + error.message); return; }
  toast('✓ Bitácora guardada');
  await loadAll();
  mobTab('bitacora');
}

// ══════════════════════════════════════════════════════════════════════════
// TAB TODO
// ══════════════════════════════════════════════════════════════════════════
export function mobRenderTodo(body) {
  const data  = window.__appData;
  const todos = mobCurrentSin
    ? (data.todos || [])
        .filter(t => t.id_siniestro === mobCurrentSin.id)
        .slice()
        .sort((a, b) => (a.completado - b.completado) || (b.id - a.id))
    : [];

  const ajOpts = (data.ajus || [])
    .map(a => `<option value="${a.id}">${a.nombre}</option>`)
    .join('');

  body.innerHTML = `
    <div class="mob-section-title">Nuevo ToDo</div>
    <div class="mob-form">
      <div class="mob-field">
        <label>Actividad / Tarea</label>
        <textarea id="mtodo-desc" placeholder="Descripción de la tarea pendiente…"></textarea>
      </div>
      <div class="mob-row">
        <div class="mob-field">
          <label>Fecha límite</label>
          <input type="date" id="mtodo-fecha">
        </div>
        <div class="mob-field">
          <label>Prioridad</label>
          <select id="mtodo-prioridad">
            <option value="alta">🔴 Alta</option>
            <option value="media" selected>🟡 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
        </div>
      </div>
      <div class="mob-field">
        <label>Asignado a</label>
        <select id="mtodo-ajustador"><option value="">— Sin asignar —</option>${ajOpts}</select>
      </div>
      <div class="mob-field">
        <label>Notas</label>
        <textarea id="mtodo-notas" style="min-height:60px;" placeholder="Contexto adicional…"></textarea>
      </div>
      <button class="mob-btn-primary" onclick="mobGuardarTodo()">💾 Guardar ToDo</button>
    </div>

    <div class="mob-section-title">Pendientes</div>
    ${todos.length
      ? todos.map(t => `<div class="mob-card${t.completado ? ' mob-todo-done' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;">
              <div class="mob-card-title">${t.descripcion || '—'}</div>
              <div class="mob-card-sub">${t.fecha_limite || 'Sin fecha'} · <span class="mob-badge ${t.prioridad || 'media'}">${t.prioridad || 'media'}</span></div>
              ${t.notas ? `<div class="mob-card-sub" style="margin-top:4px;">${t.notas}</div>` : ''}
            </div>
            ${!t.completado
              ? `<button onclick="mobCompletarTodo(${t.id})"
                   style="background:var(--accent);color:#fff;border:none;border-radius:var(--r);
                          padding:6px 10px;font-size:12px;cursor:pointer;flex-shrink:0;">✓</button>`
              : ''}
          </div>
        </div>`).join('')
      : '<div class="mob-empty">Sin tareas pendientes</div>'}`;
}

export async function mobGuardarTodo() {
  if (!mobCurrentSin) { toast('Selecciona un expediente primero'); return; }
  const desc = g('mtodo-desc')?.value?.trim();
  if (!desc) { toast('La descripción es obligatoria'); return; }
  const db  = window.__db;
  const row = {
    id_siniestro: mobCurrentSin.id,
    descripcion:  desc,
    fecha_limite: g('mtodo-fecha')?.value || null,
    prioridad:    g('mtodo-prioridad')?.value,
    id_ajustador: parseInt(g('mtodo-ajustador')?.value) || null,
    notas:        g('mtodo-notas')?.value || null,
    completado:   false,
  };
  const { error } = await db.from('todos').insert(row);
  if (error) { toast('Error: ' + error.message); return; }
  toast('✓ ToDo guardado');
  await loadAll();
  mobTab('todo');
}

export async function mobCompletarTodo(id) {
  const db = window.__db;
  const { error } = await db.from('todos').update({ completado: true }).eq('id', id);
  if (error) { toast('Error: ' + error.message); return; }
  toast('✓ Completado');
  await loadAll();
  mobTab('todo');
}

// ══════════════════════════════════════════════════════════════════════════
// TAB FOTOS
// ══════════════════════════════════════════════════════════════════════════
export function mobRenderFoto(body) {
  const data  = window.__appData;
  const fotos = mobCurrentSin
    ? (data.graf || [])
        .filter(f => f.id_siniestro === mobCurrentSin.id)
        .slice(-6)
        .reverse()
    : [];

  body.innerHTML = `
    <div class="mob-section-title">Agregar foto</div>
    <div class="mob-form">
      <div class="mob-field">
        <label>Tipo / Sección</label>
        <select id="mfoto-tipo">
          <option value="localizacion">🗺 Localización</option>
          <option value="foto_inspeccion">🔍 Foto Inspección</option>
          <option value="foto_asegurado">👤 Foto Asegurado</option>
          <option value="foto_bien">📦 Foto Bien Asegurado</option>
        </select>
      </div>
      <div class="mob-field">
        <label>Etiqueta / Descripción</label>
        <input type="text" id="mfoto-etiqueta" placeholder="Ej: Fachada principal, interior sala…">
      </div>
      <div class="mob-field">
        <label>Capturar o seleccionar foto</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <button type="button" class="mob-btn-primary" style="font-size:13px;padding:12px 8px;"
            onclick="document.getElementById('mfoto-cam-back').click()">📷 Cámara trasera</button>
          <button type="button" class="mob-btn-primary"
            style="font-size:13px;padding:12px 8px;background:var(--surface2);border:1px solid var(--border-md);color:var(--text);"
            onclick="document.getElementById('mfoto-cam-front').click()">🤳 Cámara frontal</button>
        </div>
        <button type="button" class="mob-btn-primary"
          style="width:100%;font-size:13px;padding:11px;background:var(--surface2);border:1px solid var(--border-md);color:var(--text);"
          onclick="document.getElementById('mfoto-file').click()">🖼 Seleccionar de galería</button>
        <input type="file" id="mfoto-cam-back"  accept="image/*" capture="environment" style="display:none;" onchange="mobFotoPreview(this)">
        <input type="file" id="mfoto-cam-front" accept="image/*" capture="user"        style="display:none;" onchange="mobFotoPreview(this)">
        <input type="file" id="mfoto-file"       accept="image/*"                      style="display:none;" onchange="mobFotoPreview(this)">
      </div>

      <div id="mfoto-preview" style="display:none;margin-top:4px;">
        <img id="mfoto-img" style="width:100%;border-radius:var(--r);max-height:220px;object-fit:cover;">
        <button type="button" id="mob-ia-vision-btn"
          style="margin-top:10px;width:100%;padding:12px;border:none;border-radius:var(--r);
                 background:linear-gradient(135deg,#10a37f,#1558b0);color:#fff;
                 font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;"
          onclick="mobIaVisionAnalizar()">✦ IA — Analizar imagen</button>
        <div id="mob-ia-vision-panel"
          style="display:none;margin-top:8px;background:rgba(16,163,127,.08);
                 border:1px solid rgba(16,163,127,.3);border-radius:var(--r);padding:12px;">
          <div style="font-size:11px;font-weight:700;color:#10a37f;margin-bottom:6px;">✦ Análisis IA</div>
          <div id="mob-ia-vision-text"
            style="color:var(--text);font-size:13px;line-height:1.5;white-space:pre-wrap;"></div>
          <button id="mob-ia-apply-btn" type="button"
            style="display:none;margin-top:10px;width:100%;padding:10px;border:none;border-radius:var(--r);
                   background:var(--accent);color:#fff;font-size:13px;font-weight:700;
                   font-family:inherit;cursor:pointer;"
            onclick="mobIaVisionAplicar()">↓ Aplicar como descripción</button>
        </div>
      </div>

      <button class="mob-btn-primary" style="margin-top:12px;" onclick="mobGuardarFoto()">📤 Subir foto</button>
    </div>

    <div class="mob-section-title">Fotos recientes</div>
    ${fotos.length
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${fotos.map(f => `<div style="position:relative;">
            <img src="${f.url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r);">
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);
              color:#fff;font-size:10px;padding:4px;border-radius:0 0 var(--r) var(--r);">
              ${f.etiqueta || f.tipo || ''}</div>
          </div>`).join('')}
        </div>`
      : '<div class="mob-empty">Sin fotos aún</div>'}`;
}

export function mobFotoPreview(input) {
  const file = input.files?.[0];
  if (!file) return;
  window._mobFotoActivo = file;
  const preview = g('mfoto-preview');
  const img     = g('mfoto-img');
  if (preview && img) {
    img.src              = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
  // Reset panel IA
  const panel  = g('mob-ia-vision-panel');
  const textEl = g('mob-ia-vision-text');
  const applyB = g('mob-ia-apply-btn');
  const vBtn   = g('mob-ia-vision-btn');
  if (panel)  panel.style.display  = 'none';
  if (textEl) textEl.textContent   = '';
  if (applyB) applyB.style.display = 'none';
  if (vBtn)   vBtn.textContent     = '✦ IA — Analizar imagen';
}

export async function mobIaVisionAnalizar() {
  if (window.iaCheckKey && !window.iaCheckKey()) return;
  const file = window._mobFotoActivo;
  if (!file) { toast('Captura o selecciona una foto primero'); return; }

  const panel  = g('mob-ia-vision-panel');
  const textEl = g('mob-ia-vision-text');
  const btn    = g('mob-ia-vision-btn');
  const applyB = g('mob-ia-apply-btn');
  if (!panel || !textEl) return;

  panel.style.display = 'block';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  textEl.textContent = 'Analizando imagen…';

  try {
    // Reutiliza helpers del módulo graficos.js expuestos en window
    const b64    = await window.iaVisionFileToB64(file);
    const result = await window.iaVisionAnalizar(b64, file.type || 'image/jpeg');
    textEl.textContent = result;
    if (btn)    { btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    if (applyB) applyB.style.display = 'block';
    // Auto-fill etiqueta si está vacía
    const etq = g('mfoto-etiqueta');
    if (etq && !etq.value.trim()) etq.value = result.replace(/\n/g, ' ').slice(0, 150);
  } catch (e) {
    textEl.textContent = '⚠ ' + e.message;
    if (btn) { btn.disabled = false; btn.textContent = '✦ IA — Analizar imagen'; }
  }
}

export function mobIaVisionAplicar() {
  const text = g('mob-ia-vision-text')?.textContent || '';
  if (!text) return;
  const etq = g('mfoto-etiqueta');
  if (etq) etq.value = text.replace(/\n/g, ' ').slice(0, 150);
  toast('Descripción aplicada');
}

export async function mobGuardarFoto() {
  if (!mobCurrentSin) { toast('Selecciona un expediente primero'); return; }
  const file = window._mobFotoActivo;
  if (!file) { toast('Captura o selecciona una foto primero'); return; }

  const tipo     = g('mfoto-tipo')?.value     || 'localizacion';
  const etiqueta = g('mfoto-etiqueta')?.value?.trim() || '';
  const db       = window.__db;

  toast('Subiendo foto…');
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `siniestros/${mobCurrentSin.id}/${Date.now()}.${ext}`;

  const { error: upErr } = await db.storage
    .from('graficos-expediente')
    .upload(path, file);

  if (upErr) { toast('Error subiendo: ' + upErr.message); return; }

  const { data: urlData } = db.storage.from('graficos-expediente').getPublicUrl(path);
  const url = urlData?.publicUrl;

  const { error: dbErr } = await db.from('graficos_expediente').insert({
    id_siniestro:   mobCurrentSin.id,
    tipo,
    etiqueta:       etiqueta || null,
    storage_path:   path,
    url,
    nombre_archivo: file.name,
  });

  if (dbErr) { toast('Error guardando: ' + dbErr.message); return; }

  window._mobFotoActivo = null;
  toast('✓ Foto subida');
  await loadAll();
  mobTab('foto');
}

// ══════════════════════════════════════════════════════════════════════════
// TAB NOTA RÁPIDA
// ══════════════════════════════════════════════════════════════════════════
export function mobRenderNota(body) {
  const notas_raw = mobCurrentSin?.notas || '';
  body.innerHTML = `
    <div class="mob-section-title">Notas internas del expediente</div>
    <div class="mob-form">
      <div class="mob-field">
        <label>Agregar nota (se añade al inicio)</label>
        <textarea id="mnota-nueva" placeholder="Escribe aquí tu nota rápida…" style="min-height:100px;"></textarea>
      </div>
      <button class="mob-btn-primary" onclick="mobGuardarNota()">💾 Agregar nota</button>
    </div>
    <div class="mob-section-title">Notas actuales</div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);
      padding:12px;font-size:13px;color:var(--text-sec);white-space:pre-wrap;min-height:60px;">
      ${notas_raw || 'Sin notas'}
    </div>`;
}

export async function mobGuardarNota() {
  if (!mobCurrentSin) { toast('Selecciona un expediente primero'); return; }
  const nueva = g('mnota-nueva')?.value?.trim();
  if (!nueva) { toast('Escribe una nota primero'); return; }
  const db         = window.__db;
  const now        = new Date().toLocaleString('es-MX');
  const anterior   = mobCurrentSin.notas || '';
  const actualizada = `[${now}] ${nueva}\n${anterior}`;

  const { error } = await db.from('siniestros').update({ notas: actualizada }).eq('id', mobCurrentSin.id);
  if (error) { toast('Error: ' + error.message); return; }

  mobCurrentSin.notas = actualizada;
  // Sincronizar en appData
  const rec = (window.__appData.sin || []).find(s => s.id === mobCurrentSin.id);
  if (rec) rec.notas = actualizada;

  toast('✓ Nota guardada');
  mobTab('nota');
}

// ══════════════════════════════════════════════════════════════════════════
// HOOK DE ARRANQUE — se llama desde app.js después de loadAll()
// ══════════════════════════════════════════════════════════════════════════
export function mobHookMostrarApp() {
  if (mobIsMobile()) mobInit();
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORTS AGRUPADOS (para window.* en app.js)
// ══════════════════════════════════════════════════════════════════════════
export const mobilePublic = {
  mobIsMobile,
  mobInit,
  mobSetExp,
  mobCambiarExp,
  mobFiltrarExp,
  mobRenderExpList,
  mobTab,
  // bitácora
  mobRenderBitacora,
  mobBitTipoChange,
  mobGuardarBitacora,
  // todo
  mobRenderTodo,
  mobGuardarTodo,
  mobCompletarTodo,
  // fotos
  mobRenderFoto,
  mobFotoPreview,
  mobIaVisionAnalizar,
  mobIaVisionAplicar,
  mobGuardarFoto,
  // nota
  mobRenderNota,
  mobGuardarNota,
  // hook
  mobHookMostrarApp,
};
