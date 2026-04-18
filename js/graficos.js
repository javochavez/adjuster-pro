/**
 * graficos.js — AdjusterPro JChA / Almaraz Ajustadores (AASA)
 * Módulo ES: galería de imágenes por expediente, upload a Supabase Storage,
 * filtros por tipo, análisis IA visión (GPT-4o), inserción en RTE.
 *
 * Dependencias globales inyectadas por app.js:
 *   window.__db, window.__appData, window.__currentSin
 *   toast, g, abrirModal, loadAll, iaCheckKey, iaGetKey
 *   loadRteSin, syncRteSin  (de rte.js)
 */

// ══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════
export const GRAF_BUCKET = 'graficos-expediente';

export const GRAF_TIPOS = {
  localizacion:    {
    label: 'Localización',
    icon:  '🗺',
    color: '#4a9eff',
    hint:  'Vista satelital o aérea del predio/zona — Google Maps, Google Earth. Incluir nombre de calle, colonia y orientación (Norte).',
  },
  foto_inspeccion: {
    label: 'Foto Inspección',
    icon:  '🔍',
    color: '#f0a030',
    hint:  'Fotos tomadas por el Ajustador durante inspección física. Indicar: área fotografiada y relevancia para el ajuste.',
  },
  foto_asegurado:  {
    label: 'Foto Asegurado',
    icon:  '👤',
    color: '#5cc87a',
    hint:  'Fotos proporcionadas por el Asegurado o su representante. Indicar: quién las proporcionó, fecha aproximada y qué muestran.',
  },
  foto_bien:       {
    label: 'Foto Bien Asegurado',
    icon:  '📦',
    color: '#e06070',
    hint:  'Fotos de bienes afectados o de referencia. Indicar: nombre del bien, estado y propósito de la foto.',
  },
};

// ── Prompt IA visión ──────────────────────────────────────────────────────
const IA_VISION_PROMPT = `Eres un perito ajustador de seguros de daños con 44 años de experiencia en México. Analiza esta fotografía del siniestro y proporciona:
1. Descripción técnica breve (2-3 líneas) de lo que muestra la imagen: tipo de bien, estado visible, daños observables.
2. Relevancia para el ajuste: qué información aporta esta foto al expediente.
Sé conciso, técnico y objetivo. Sin adornos ni saludos. Solo el análisis.`;

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DEL MÓDULO
// ══════════════════════════════════════════════════════════════════════════
let grafFiltroActivo = 'all';
let grafQueue        = [];   // [ { file, tipo, etiqueta, previewUrl } ]

// ══════════════════════════════════════════════════════════════════════════
// GALERÍA — RENDER
// ══════════════════════════════════════════════════════════════════════════
export function renderGrafGallery(sinId) {
  const gallery = g('graf-gallery');
  const empty   = g('graf-empty');
  const fbar    = g('graf-filter-bar');
  if (!gallery) return;

  const data  = window.__appData;
  const all   = (data.graf || []).filter(x => x.id_siniestro === sinId);
  const items = grafFiltroActivo === 'all' ? all : all.filter(x => x.tipo === grafFiltroActivo);

  if (fbar) fbar.style.display = all.length ? 'flex' : 'none';

  if (!items.length) {
    gallery.innerHTML = '';
    if (empty) {
      empty.style.display  = 'block';
      empty.textContent    = all.length && grafFiltroActivo !== 'all'
        ? 'Sin imágenes de este tipo.'
        : 'Sin imágenes registradas para este expediente.';
    }
    return;
  }
  if (empty) empty.style.display = 'none';

  gallery.innerHTML = '';
  items.forEach(it => {
    const tipo = GRAF_TIPOS[it.tipo] || GRAF_TIPOS.localizacion;

    // ── Card contenedor ──────────────────────────────────────────────
    const card = document.createElement('div');
    card.style.cssText = `background:var(--surface2);border:1px solid var(--border);
      border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;`;

    // ── Imagen ───────────────────────────────────────────────────────
    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'position:relative;cursor:zoom-in;';
    const img = document.createElement('img');
    img.src   = it.url || '';
    img.alt   = it.etiqueta || tipo.label;
    img.style.cssText = 'width:100%;height:150px;object-fit:cover;display:block;';
    img.addEventListener('click', () => grafVerImagen(it.url));
    // Badge de tipo
    const badge = document.createElement('div');
    badge.style.cssText = `position:absolute;top:6px;left:6px;background:${tipo.color}cc;
      color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;`;
    badge.textContent = tipo.icon + ' ' + tipo.label;
    imgWrap.appendChild(img);
    imgWrap.appendChild(badge);
    card.appendChild(imgWrap);

    // ── Info / controles ─────────────────────────────────────────────
    const info = document.createElement('div');
    info.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:6px;flex:1;';

    // Selector de tipo
    const sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:11px;font-family:inherit;';
    Object.entries(GRAF_TIPOS).forEach(([k, v]) => {
      const o     = document.createElement('option');
      o.value     = k;
      o.textContent = v.icon + ' ' + v.label;
      if (k === it.tipo) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => grafActualizar(it.id, { tipo: sel.value }));
    info.appendChild(sel);

    // Input etiqueta
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.value       = it.etiqueta || '';
    inp.placeholder = tipo.hint;
    inp.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:11px;font-family:inherit;box-sizing:border-box;';
    inp.addEventListener('change', () => grafActualizar(it.id, { etiqueta: inp.value || null }));
    info.appendChild(inp);

    // Footer: nombre archivo + eliminar
    const foot = document.createElement('div');
    foot.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    const fname = document.createElement('span');
    fname.style.cssText = 'font-size:10px;color:var(--text-ter);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;';
    fname.textContent = it.nombre_archivo || '';
    const del = document.createElement('button');
    del.type      = 'button';
    del.textContent = 'Eliminar';
    del.className   = 'btn btn-sm btn-danger';
    del.style.cssText = 'padding:2px 7px;font-size:11px;flex-shrink:0;';
    del.addEventListener('click', () => grafEliminar(it.id, it.storage_path || ''));
    foot.appendChild(fname);
    foot.appendChild(del);
    info.appendChild(foot);

    // ── Panel IA Visión ──────────────────────────────────────────────
    if (it.url) {
      const vPanel = document.createElement('div');
      vPanel.className = 'ia-vision-panel';
      vPanel.innerHTML = `
        <div class="ia-v-title"><span>✦</span> Análisis IA</div>
        <div class="ia-v-text" style="color:var(--text-sec);font-style:italic;">Presiona el botón para analizar.</div>
        <div class="ia-v-actions" style="display:none;">
          <button class="btn btn-primary btn-sm"
            onclick="iaVisionAplicarEtiqueta(this.closest('.ia-vision-panel'),
              this.closest('.ia-vision-panel').parentElement.querySelector('input[type=text]'))">↓ Aplicar etiqueta</button>
          <button class="btn btn-sm"
            onclick="iaVisionInsertarRte(this.closest('.ia-vision-panel'))">→ Insertar en Descripción</button>
          <button class="btn btn-sm"
            onclick="iaVisionCopiar(this.closest('.ia-vision-panel'))">⎘ Copiar</button>
        </div>`;
      info.appendChild(vPanel);

      const vBtn = document.createElement('button');
      vBtn.type      = 'button';
      vBtn.className  = 'btn-ia-vision';
      vBtn.style.cssText = 'margin-top:6px;width:100%;';
      vBtn.textContent = '✦ IA — Analizar imagen';
      vBtn.addEventListener('click', () => iaVisionAnalizarGaleria(it.id, it.url, vPanel, inp));
      info.appendChild(vBtn);
    }

    card.appendChild(info);
    gallery.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// FILTRO
// ══════════════════════════════════════════════════════════════════════════
export function grafFiltrar(tipo) {
  grafFiltroActivo = tipo;
  const MAP = {
    all:             'all',
    localizacion:    'loc',
    foto_inspeccion: 'insp',
    foto_asegurado:  'aseg',
    foto_bien:       'bien',
  };
  Object.keys(MAP).forEach(t => {
    const btn = g('graf-f-' + MAP[t]);
    if (btn) btn.style.background = t === tipo ? 'var(--accent)' : '';
  });
  const cs = window.__currentSin;
  if (cs) renderGrafGallery(cs.id);
}

// ══════════════════════════════════════════════════════════════════════════
// VER IMAGEN — lightbox
// ══════════════════════════════════════════════════════════════════════════
export function grafVerImagen(url) {
  if (!url) return;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  ov.addEventListener('click', () => document.body.removeChild(ov));
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:92vw;max-height:92vh;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,.6);';
  img.addEventListener('click', e => e.stopPropagation());
  ov.appendChild(img);
  document.body.appendChild(ov);
}

// ══════════════════════════════════════════════════════════════════════════
// FILE SELECT / DRAG-AND-DROP
// ══════════════════════════════════════════════════════════════════════════
export function grafOnFileSelect(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  grafMostrarQueue(files);
  input.value = '';
}

export function grafOnDrop(e) {
  e.preventDefault();
  const area = g('graf-upload-area');
  if (area) { area.style.borderColor = 'var(--border-hi)'; area.style.background = ''; }
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) grafMostrarQueue(files);
}

// ══════════════════════════════════════════════════════════════════════════
// QUEUE — mostrar, configurar y subir
// ══════════════════════════════════════════════════════════════════════════
export function grafMostrarQueue(files) {
  grafQueue = files.map(f => ({
    file:       f,
    tipo:       'localizacion',
    etiqueta:   '',
    previewUrl: URL.createObjectURL(f),
  }));
  const qEl = g('graf-queue');
  if (!qEl) return;
  qEl.style.display = 'block';
  qEl.innerHTML     = '';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:10px;';
  hdr.textContent   = grafQueue.length + ' imagen(es) — selecciona tipo y agrega descripción a cada una:';
  setTimeout(() => { qEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  qEl.appendChild(hdr);

  grafQueue.forEach((q, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;background:var(--surface2);padding:10px;border-radius:var(--r);align-items:flex-start;';

    // Thumbnail
    const thumb = document.createElement('img');
    thumb.src         = q.previewUrl;
    thumb.style.cssText = 'width:72px;height:54px;object-fit:cover;border-radius:4px;flex-shrink:0;';
    row.appendChild(thumb);

    const fields = document.createElement('div');
    fields.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:6px;min-width:0;';

    // Selector de tipo
    const sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:11px;font-family:inherit;';
    Object.entries(GRAF_TIPOS).forEach(([k, v]) => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = v.icon + ' ' + v.label;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => { grafQueue[i].tipo = sel.value; });
    fields.appendChild(sel);

    // Input descripción
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.placeholder = 'Descripción de la imagen…';
    inp.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--border-md);border-radius:4px;background:var(--bg2);color:var(--text);font-size:11px;font-family:inherit;box-sizing:border-box;';
    inp.addEventListener('input', () => { grafQueue[i].etiqueta = inp.value; });
    fields.appendChild(inp);

    // Nombre archivo
    const fn = document.createElement('div');
    fn.style.cssText = 'font-size:10px;color:var(--text-ter);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    fn.textContent   = q.file.name;
    fields.appendChild(fn);

    // Panel IA Visión (pre-upload)
    const vPanelQ = document.createElement('div');
    vPanelQ.className = 'ia-vision-panel';
    vPanelQ.innerHTML = `
      <div class="ia-v-title"><span>✦</span> Análisis IA</div>
      <div class="ia-v-text" style="color:var(--text-sec);font-style:italic;">Presiona para analizar antes de subir.</div>
      <div class="ia-v-actions" style="display:none;">
        <button class="btn btn-primary btn-sm"
          onclick="iaVisionQueueAplicar(${i},
            this.closest('.ia-vision-panel'),
            this.closest('.ia-vision-panel').closest('div').querySelector('input[type=text]'))">↓ Aplicar descripción</button>
        <button class="btn btn-sm"
          onclick="iaVisionCopiar(this.closest('.ia-vision-panel'))">⎘ Copiar</button>
      </div>`;
    fields.appendChild(vPanelQ);

    // Botón IA
    const vBtnQ = document.createElement('button');
    vBtnQ.type      = 'button';
    vBtnQ.className  = 'btn-ia-vision';
    vBtnQ.style.marginTop = '4px';
    vBtnQ.textContent = '✦ IA — Analizar imagen';
    // Closure para capturar índice
    ;(function (idx, prevUrl, panel, input) {
      vBtnQ.addEventListener('click', () => iaVisionAnalizarQueue(idx, prevUrl, panel, input));
    })(i, q.previewUrl, vPanelQ, inp);
    fields.appendChild(vBtnQ);

    row.appendChild(fields);
    qEl.appendChild(row);
  });

  // Botones Subir / Cancelar
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
  const upload  = document.createElement('button');
  upload.type      = 'button';
  upload.className  = 'btn btn-primary btn-sm';
  upload.innerHTML  = '⬆ Subir ' + grafQueue.length + ' imagen' + (grafQueue.length > 1 ? 'es' : '');
  upload.id         = 'graf-upload-btn';
  upload.addEventListener('click', grafSubirQueue);
  const cancel = document.createElement('button');
  cancel.type      = 'button';
  cancel.className  = 'btn btn-sm';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', grafCancelarQueue);
  btns.appendChild(upload);
  btns.appendChild(cancel);
  qEl.appendChild(btns);
}

export async function grafSubirQueue() {
  const cs = window.__currentSin;
  const db = window.__db;
  if (!cs || !grafQueue.length) return;
  const btn = g('graf-upload-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Subiendo…'; }
  let ok = 0, fail = 0;

  for (const q of grafQueue) {
    try {
      const ext      = (q.file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = q.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path     = `${cs.id}/${q.tipo}_${Date.now()}_${safeName}`;

      const { error: upErr } = await db.storage
        .from(GRAF_BUCKET)
        .upload(path, q.file, { contentType: q.file.type || 'image/jpeg', upsert: false, cacheControl: '3600' });

      if (upErr) {
        const msg = upErr.message || upErr.error || JSON.stringify(upErr);
        toast('Error Storage: ' + msg);
        console.error('Storage error:', upErr);
        fail++;
        continue;
      }

      const { data: urlData } = db.storage.from(GRAF_BUCKET).getPublicUrl(path);
      const { error: dbErr }  = await db.from('graficos_expediente').insert({
        id_siniestro:   cs.id,
        tipo:           q.tipo,
        etiqueta:       q.etiqueta || null,
        storage_path:   path,
        url:            urlData?.publicUrl || null,
        nombre_archivo: q.file.name,
      });

      if (dbErr) {
        toast('Error BD: ' + (dbErr.message || JSON.stringify(dbErr)));
        console.error('DB error:', dbErr);
        fail++;
      } else {
        ok++;
      }
    } catch (err) {
      toast('Error inesperado: ' + (err.message || String(err)));
      console.error('Unexpected error:', err);
      fail++;
    }
  }

  grafCancelarQueue();
  await loadAll();
  renderGrafGallery(cs.id);
  if (ok > 0) toast(ok + ' imagen' + (ok > 1 ? 'es' : '') + ' subida' + (ok > 1 ? 's' : '') + (fail > 0 ? ' (' + fail + ' con error)' : '') + '.');
}

export function grafCancelarQueue() {
  grafQueue.forEach(q => URL.revokeObjectURL(q.previewUrl));
  grafQueue = [];
  const qEl = g('graf-queue');
  if (qEl) { qEl.style.display = 'none'; qEl.innerHTML = ''; }
}

// ══════════════════════════════════════════════════════════════════════════
// ACTUALIZAR / ELIMINAR
// ══════════════════════════════════════════════════════════════════════════
export async function grafActualizar(id, fields) {
  const db   = window.__db;
  const data = window.__appData;
  await db.from('graficos_expediente').update(fields).eq('id', id);
  const rec = (data.graf || []).find(x => x.id === id);
  if (rec) Object.assign(rec, fields);
  const cs = window.__currentSin;
  if (cs) renderGrafGallery(cs.id);
}

export async function grafEliminar(id, path) {
  if (!confirm('¿Eliminar esta imagen? Esta acción no se puede deshacer.')) return;
  const db = window.__db;
  if (path) await db.storage.from(GRAF_BUCKET).remove([path]);
  await db.from('graficos_expediente').delete().eq('id', id);
  await loadAll();
  const cs = window.__currentSin;
  if (cs) renderGrafGallery(cs.id);
  toast('Imagen eliminada.');
}

// ══════════════════════════════════════════════════════════════════════════
// INSERTAR IMAGEN EN RTE (picker de expediente)
// ══════════════════════════════════════════════════════════════════════════
export function rteInsertarImagen(suffix) {
  const cs = window.__currentSin;
  if (!cs) { toast('Guarda el expediente primero para poder insertar imágenes.'); return; }
  const data  = window.__appData;
  const items = (data.graf || []).filter(x => x.id_siniestro === cs.id && x.url);
  if (!items.length) { toast('No hay imágenes subidas para este expediente.'); return; }

  // Guardar contexto RTE
  window._rteImgSuffix = suffix;
  window._rteImgSaved  = window.saveSelection ? window.saveSelection() : null;

  // Construir picker inline o modal simple
  const existing = document.getElementById('rte-img-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.id = 'rte-img-picker';
  picker.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9998;
    display:flex;align-items:center;justify-content:center;`;
  picker.addEventListener('click', e => { if (e.target === picker) picker.remove(); });

  const box = document.createElement('div');
  box.style.cssText = `background:var(--bg);border-radius:var(--r);padding:16px;width:min(680px,92vw);
    max-height:80vh;overflow-y:auto;`;
  box.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;">
    Selecciona imagen para insertar en el informe</div>`;

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;';

  items.forEach(it => {
    const tipo = GRAF_TIPOS[it.tipo] || GRAF_TIPOS.localizacion;
    const card = document.createElement('div');
    card.style.cssText = `cursor:pointer;border:2px solid var(--border);border-radius:var(--r);overflow:hidden;
      transition:border-color .15s;`;
    card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--accent)'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--border)';  });
    card.innerHTML = `
      <img src="${it.url}" style="width:100%;height:90px;object-fit:cover;display:block;">
      <div style="padding:4px 6px;font-size:10px;color:var(--text-sec);">${tipo.icon} ${it.etiqueta || tipo.label}</div>`;
    card.addEventListener('click', () => {
      picker.remove();
      _rteInsertarImagenConfirm(it.url, it.etiqueta || tipo.label, suffix);
    });
    grid.appendChild(card);
  });

  box.appendChild(grid);
  picker.appendChild(box);
  document.body.appendChild(picker);
}

function _rteInsertarImagenConfirm(url, alt, suffix) {
  // Restaurar selección si existe
  const saved = window._rteImgSaved;
  if (saved && window.restoreSelection) window.restoreSelection(saved);
  // Insertar en el RTE correspondiente (delegamos a rte.js a través de window)
  if (typeof window.rteInsertImageInField === 'function') {
    window.rteInsertImageInField(suffix, url, alt);
  } else {
    // Fallback: document.execCommand
    document.execCommand('insertHTML', false,
      `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:4px;margin:4px 0;">`);
  }
  toast('Imagen insertada en el informe');
}

// ══════════════════════════════════════════════════════════════════════════
// IA VISIÓN — helpers base
// ══════════════════════════════════════════════════════════════════════════
export async function iaVisionFileToB64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(',')[1]);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function iaVisionUrlToB64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return iaVisionFileToB64(blob);
}

export async function iaVisionAnalizar(b64, mimeType = 'image/jpeg') {
  const key = window.iaGetKey ? window.iaGetKey() : null;
  if (!key) { abrirModal('modal-ia-config'); return null; }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model:      'gpt-4o',
      max_tokens: 300,
      messages: [{
        role:    'user',
        content: [
          { type: 'text',      text: IA_VISION_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${b64}`, detail: 'low' } },
        ],
      }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'Error en API de visión');
  }
  const j = await resp.json();
  return j.choices?.[0]?.message?.content || '';
}

// ══════════════════════════════════════════════════════════════════════════
// IA VISIÓN — galería (post-upload)
// ══════════════════════════════════════════════════════════════════════════
export async function iaVisionAnalizarGaleria(itemId, imageUrl, panelEl, inputEl) {
  if (!window.iaCheckKey || !window.iaCheckKey()) return;
  const btn    = panelEl.querySelector('.btn-ia-vision');
  const textEl = panelEl.querySelector('.ia-v-text');
  panelEl.classList.add('open');
  if (btn)    { btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  if (textEl) textEl.textContent = '';
  try {
    const b64    = await iaVisionUrlToB64(imageUrl);
    const result = await iaVisionAnalizar(b64);
    if (textEl) textEl.textContent = result;
    if (btn)    { btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    const actions = panelEl.querySelector('.ia-v-actions');
    if (actions) actions.style.display = 'flex';
    panelEl.dataset.iaText  = result;
    panelEl.dataset.itemId  = itemId;
  } catch (e) {
    if (textEl) textEl.textContent = '⚠ ' + e.message;
    if (btn)    { btn.disabled = false; btn.textContent = '✦ IA — Analizar'; }
  }
}

export async function iaVisionAplicarEtiqueta(panelEl, inputEl) {
  const text = panelEl.dataset.iaText;
  const id   = parseInt(panelEl.dataset.itemId);
  if (!text || !id) return;
  const short = text.replace(/\n/g, ' ').slice(0, 150);
  if (inputEl) inputEl.value = short;
  await grafActualizar(id, { etiqueta: short });
  toast('Descripción IA aplicada a la foto');
}

export function iaVisionCopiar(panelEl) {
  const text = panelEl.dataset.iaText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => toast('Texto copiado'));
}

export function iaVisionInsertarRte(panelEl) {
  const text = panelEl.dataset.iaText;
  if (!text) return;
  const current  = g('s-desc')?.value || '';
  const appended = current ? current + '\n\n' + text : text;
  if (typeof window.loadRteSin  === 'function') window.loadRteSin('desc', appended.replace(/\n/g, '<br>'));
  if (typeof window.syncRteSin  === 'function') window.syncRteSin('desc');
  toast('Descripción IA insertada en Descripción de bienes afectados');
}

// ══════════════════════════════════════════════════════════════════════════
// IA VISIÓN — queue (pre-upload)
// ══════════════════════════════════════════════════════════════════════════
export async function iaVisionAnalizarQueue(idx, previewUrl, panelEl, inputEl) {
  if (!window.iaCheckKey || !window.iaCheckKey()) return;
  const btn    = panelEl.querySelector('.btn-ia-vision');
  const textEl = panelEl.querySelector('.ia-v-text');
  panelEl.classList.add('open');
  if (btn)    { btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  if (textEl) textEl.textContent = '';
  try {
    const resp = await fetch(previewUrl);
    const blob = await resp.blob();
    const b64  = await iaVisionFileToB64(blob);
    const result = await iaVisionAnalizar(b64, blob.type || 'image/jpeg');
    if (textEl) textEl.textContent = result;
    if (btn)    { btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    panelEl.dataset.iaText = result;
    const actions = panelEl.querySelector('.ia-v-actions');
    if (actions) actions.style.display = 'flex';
    // Auto-fill si está vacío
    if (inputEl && !inputEl.value.trim()) {
      const short = result.replace(/\n/g, ' ').slice(0, 150);
      inputEl.value = short;
      if (grafQueue[idx]) grafQueue[idx].etiqueta = short;
    }
  } catch (e) {
    if (textEl) textEl.textContent = '⚠ ' + e.message;
    if (btn)    { btn.disabled = false; btn.textContent = '✦ IA — Analizar'; }
  }
}

export function iaVisionQueueAplicar(idx, panelEl, inputEl) {
  const text = (panelEl.dataset.iaText || '').replace(/\n/g, ' ').slice(0, 150);
  if (!text) return;
  if (inputEl) inputEl.value = text;
  if (grafQueue[idx]) grafQueue[idx].etiqueta = text;
  toast('Descripción aplicada');
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORTS AGRUPADOS (para window.* en app.js)
// ══════════════════════════════════════════════════════════════════════════
export const graficosPublic = {
  // galería
  renderGrafGallery,
  grafFiltrar,
  grafVerImagen,
  // upload
  grafOnFileSelect,
  grafOnDrop,
  grafMostrarQueue,
  grafSubirQueue,
  grafCancelarQueue,
  // CRUD
  grafActualizar,
  grafEliminar,
  // RTE
  rteInsertarImagen,
  // IA visión
  iaVisionFileToB64,
  iaVisionUrlToB64,
  iaVisionAnalizar,
  iaVisionAnalizarGaleria,
  iaVisionAplicarEtiqueta,
  iaVisionCopiar,
  iaVisionInsertarRte,
  iaVisionAnalizarQueue,
  iaVisionQueueAplicar,
};
