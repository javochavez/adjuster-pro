import { IA_MODEL, IA_VISION_PROMPT } from './config.js';
import { g, v, toast } from './ui.js';
import { data, currentSin } from './state.js';
import * as state from './state.js';
import { loadRteSin, syncRteSin } from './rte.js';
import { abrirModal, cerrarModal } from './modal.js';
import { editarSiniestro } from './detalle.js';
import { grafActualizar } from './graf.js';

function iaGetKey(){
  return localStorage.getItem('aasa_openai_key')||'';
}

export function iaGuardarKey(){
  const k = (g('ia-apikey-input').value||'').trim();
  if(!k){ toast('Ingresa una API key válida'); return; }
  localStorage.setItem('aasa_openai_key', k);
  cerrarModal('modal-ia-config');
  toast('API key guardada');
}

export function iaCheckKey(){
  if(!iaGetKey()){ abrirModal('modal-ia-config'); return false; }
  return true;
}

export function iaContextoSin(){
  const s = state._editingMod || {};
  const pol  = data?.pol?.find(p=>p.id===parseInt(v('s-poliza')))||{};
  const aseg = data?.aseg?.find(a=>a.id===pol.id_aseguradora)||{};
  const asdo = data?.asdo?.find(a=>a.id===parseInt(g('sin-asdo-sel-id')?.value))||{};
  return [
    `Asegurado: ${asdo.nombre||v('s-dest-nombre')||'N/D'}`,
    `Aseguradora: ${aseg.nombre||'N/D'}`,
    `Póliza: ${pol.numero||'N/D'} | Ramo: ${pol.ramo||'N/D'} | Subramo/Cobertura: ${v('s-subramo')||'N/D'}`,
    `No. Siniestro: ${v('s-numsin')||'N/D'} | Ref. AASA: ${v('s-exp')||'N/D'}`,
    `Fecha siniestro: ${v('s-fsin')||'N/D'} | Hora: ${v('s-hora-ocurr')||v('s-hora-ocurr-vis')||'N/D'}`,
    `Fecha asignación: ${v('s-fasig')||'N/D'} | Fecha primera visita: ${v('s-f1vis')||'N/D'}`,
    `Causa: ${v('s-causa')||'N/D'} | Comentario: ${v('s-causa-com')||'N/D'}`,
    `Riesgo afectado: ${v('s-riesgo')||'N/D'}`,
    `Tipo de siniestro: ${v('s-tipo')||'N/D'}`,
    `Lugar del siniestro: ${v('s-lugar-sin')||'N/D'}`,
    `Ubicación afectada: ${v('s-insp-dom')||'N/D'}`,
    `Persona entrevistada: ${v('s-insp-persona')||'N/D'} | Cargo: ${v('s-insp-cargo')||'N/D'}`,
    `Giro del asegurado: ${v('s-giro')||v('s-giro-vis')||'N/D'}`,
    `Salvamento: ${v('s-salvamento')||'N/D'}`,
    `Coaseguro: ${v('s-coaseguro')==='1'?'Sí':'No'} | Reaseguro: ${v('s-reaseguro')==='1'?'Sí':'No'}`,
    `Autoridades: ${v('s-autoridades')==='1'?'Sí':'No'}`,
    `Descripción/Bienes dañados: ${v('s-desc')||v('s-bienes')||'N/D'}`,
    `Narración existente: ${v('s-narracion')||'(vacía)'}`,
  ].join('\n');
}

export function iaPrompt(key, contexto){
  const base = `Eres un experto ajustador de seguros de daños con 44 años de experiencia, especializado en México. Trabajas para Almaraz Ajustadores (AASA). Redacta en español técnico-forense, en tercera persona, sin adornos literarios. Sé conciso, preciso y directo.\n\nDatos del expediente:\n${contexto}\n\n`;
  const prompts = {
    'desc':          base + 'Redacta la descripción de los bienes afectados y cómo ocurrió el siniestro. Máximo 3 párrafos. Solo el texto, sin títulos.',
    'narracion':     base + 'Redacta la narración cronológica detallada de los hechos del siniestro para el informe preliminar. Incluye fecha, hora, secuencia de eventos, causa probable y consecuencias inmediatas. Máximo 4 párrafos. Solo el texto.',
    'inspeccion':    base + 'Redacta el texto del resultado de la inspección (§4 del informe GNP) incluyendo fecha y hora de visita, persona entrevistada, cargo, domicilio, lugar del siniestro y descripción de los bienes dañados observados. Solo el texto.',
    'naturaleza':    base + 'Redacta la naturaleza y alcance de los daños observados durante la inspección. Sé técnico y preciso. Máximo 2 párrafos.',
    'estrategias':   base + 'Genera la sección de Estrategias y Observaciones (§9) del informe preliminar GNP. Incluye: (1) lista de documentos requeridos al asegurado, específica para este tipo de siniestro y cobertura; (2) observaciones técnicas relevantes; (3) estrategia de ajuste propuesta. Usa formato de lista para documentos.',
    'observaciones': base + 'Redacta las observaciones técnicas del ajustador sobre este siniestro. Incluye aspectos que requieren seguimiento, puntos de atención y recomendaciones. Máximo 2 párrafos.',
    'considerandos': base + 'Redacta los considerandos del ajuste: fundamentos técnicos y de póliza que sustentan la procedencia del siniestro. Máximo 3 párrafos.',
    'actividades':   base + 'Genera la lista de actividades por realizar para este expediente, ordenadas por prioridad. Formato de lista numerada.',
    'salvamento':    base + 'Redacta el detalle de salvamento: descripción de bienes que podrían recuperarse, su valor estimado, ubicación y acciones requeridas. Si no aplica, indícalo brevemente.',
    'introduccion':  base + 'Redacta la introducción del informe preliminar de ajuste. Contexto general, alcance del trabajo del ajustador y propósito del documento. Máximo 2 párrafos.',
    'causa_simple':      base + 'Sugiere en una frase corta (máximo 10 palabras) la causa técnica del siniestro. Solo la causa, sin explicación.',
    'causa_com_simple':  base + 'Sugiere un comentario breve sobre el estado de investigación de la causa (ej: "En análisis de causa", "Causa confirmada por perito", etc.). Solo el comentario, sin explicación.',
    'riesgo_simple':     base + 'Clasifica el riesgo afectado según el catálogo GNP: a) Incendio, b) Corto Circuito, c) Explosión, d) Rotura de Maquinaria, e) Robo, f) Responsabilidad Civil, u otro según corresponda. Responde solo con la clave y descripción, ej: "b) Corto Circuito".',
  };
  return prompts[key] || base + `Redacta el campo "${key}" para el informe de ajuste de seguros.`;
}

export async function iaCall(prompt, onChunk, onDone, onError){
  const key = iaGetKey();
  if(!key){ abrirModal('modal-ia-config'); return; }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body: JSON.stringify({
        model: IA_MODEL,
        stream: true,
        max_tokens: 1200,
        temperature: 0.4,
        messages:[
          {role:'system', content:'Eres un experto ajustador de seguros de daños en México con 44 años de experiencia. Redactas informes técnicos precisos en español formal.'},
          {role:'user', content: prompt}
        ]
      })
    });
    if(!res.ok){
      const err = await res.json();
      onError(err.error?.message||'Error en la API');
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      buf += dec.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if(data==='[DONE]'){ onDone(); return; }
        try{
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content;
          if(delta) onChunk(delta);
        }catch(e){}
      }
    }
    onDone();
  } catch(e){
    onError(e.message);
  }
}

export function iaLeerCampoActual(suffix){
  const rte = g('s-' + suffix + '-rte');
  if(!rte) return '';
  return (rte.innerText || rte.textContent || '').trim();
}

export function iaAbrirPanel(titulo, suffix){
  g('ia-panel-title').textContent = 'Sugerencia IA — ' + titulo;
  const editor = g('ia-panel-editor');
  if(editor){ editor.value = ''; editor.disabled = true; }
  g('ia-panel-spinner').style.display = 'inline-block';
  g('ia-btn-aplicar').disabled   = true;
  g('ia-btn-regenerar').disabled = true;
  const appendBtn = g('ia-btn-aplicar-append');
  if(appendBtn) appendBtn.disabled = true;
  g('ia-result-panel').classList.add('open');
  state._iaCurrentText = '';
  const existente = suffix ? iaLeerCampoActual(suffix) : '';
  const lbl  = g('ia-panel-existing-lbl');
  const hint = g('ia-panel-hint');
  if(lbl) lbl.style.display = existente ? 'inline' : 'none';
  if(hint) hint.textContent = existente
    ? '(IA leyó el contenido actual para complementar)'
    : '(campo vacío — sugerencia desde contexto del expediente)';
}

export function iaCerrarPanel(){
  g('ia-result-panel').classList.remove('open');
}

export function iaAplicar(){
  const editor = g('ia-panel-editor');
  const texto  = (editor ? editor.value : state._iaCurrentText).trim();
  if(!state._iaCurrentSuffix || !texto){ toast('No hay sugerencia para aplicar'); return; }
  iaEscribirEnCampo(state._iaCurrentSuffix, texto, false);
}

export function iaAplicarAppend(){
  const editor = g('ia-panel-editor');
  const texto  = (editor ? editor.value : state._iaCurrentText).trim();
  if(!state._iaCurrentSuffix || !texto){ toast('No hay sugerencia para aplicar'); return; }
  iaEscribirEnCampo(state._iaCurrentSuffix, texto, true);
}

export function iaEscribirEnCampo(suffix, texto, append){
  if(suffix && suffix.startsWith('__textarea__')){
    const fieldId = suffix.replace('__textarea__','');
    const el = g(fieldId);
    if(!el){ toast('Campo no encontrado: ' + fieldId); return; }
    if(append){
      const actual = el.value.trim();
      el.value = actual ? actual + '\n\n' + texto : texto;
    } else {
      el.value = texto;
    }
    el.dispatchEvent(new Event('input'));
    g('ia-result-panel').classList.remove('open');
    state._iaCurrentSuffix = null; state._iaCurrentText = '';
    toast(append ? 'Sugerencia agregada al final del campo' : 'Sugerencia aplicada — campo sustituido');
    el.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  const rteEl = g('s-' + suffix + '-rte');
  if(rteEl){
    if(append){
      const actual = rteEl.innerHTML;
      const sep    = actual.trim() ? '<br><br>' : '';
      loadRteSin(suffix, actual + sep + texto.replace(/\n/g,'<br>'));
    } else {
      loadRteSin(suffix, texto.replace(/\n/g,'<br>'));
    }
    syncRteSin(suffix);
    g('ia-result-panel').classList.remove('open');
    state._iaCurrentSuffix = null; state._iaCurrentText = '';
    toast(append ? 'Sugerencia agregada al final del campo' : 'Sugerencia aplicada — campo sustituido');
  } else {
    const sinId = currentSin?.id || parseInt(g('s-id')?.value);
    if(!sinId){ toast('Abre el expediente primero'); return; }
    state._iaPendingApply = true;
    editarSiniestro(sinId);
    g('modal-sin').classList.add('open');
    setTimeout(()=>{
      const rte2 = g('s-' + suffix + '-rte');
      if(rte2){
        if(append){
          const actual = rte2.innerHTML;
          const sep    = actual.trim() ? '<br><br>' : '';
          loadRteSin(suffix, actual + sep + texto.replace(/\n/g,'<br>'));
        } else {
          loadRteSin(suffix, texto.replace(/\n/g,'<br>'));
        }
        syncRteSin(suffix);
        rte2.scrollIntoView({behavior:'smooth', block:'center'});
      }
      g('ia-result-panel').classList.remove('open');
      state._iaCurrentSuffix = null; state._iaCurrentText = ''; state._iaPendingApply = false;
      toast(append ? 'Texto agregado — guarda el expediente' : 'Texto aplicado — guarda el expediente');
    }, 450);
  }
}

export function iaRegenerarActual(){
  if(state._iaCurrentPrompt) iaLlamarPanel(
    state._iaCurrentPrompt,
    g('ia-panel-title').textContent.replace('Sugerencia IA — ',''),
    state._iaCurrentSuffix
  );
}

export function iaLlamarPanel(prompt, titulo, suffix){
  state._iaCurrentSuffix = suffix;
  state._iaCurrentPrompt = prompt;
  iaAbrirPanel(titulo, suffix);
  const editor = g('ia-panel-editor');
  iaCall(
    prompt,
    (chunk)=>{
      state._iaCurrentText += chunk;
      if(editor) editor.value = state._iaCurrentText;
    },
    ()=>{
      g('ia-panel-spinner').style.display='none';
      if(editor){ editor.disabled = false; editor.focus(); }
      g('ia-btn-aplicar').disabled   = false;
      g('ia-btn-regenerar').disabled = false;
      if(g('ia-btn-aplicar-append')) g('ia-btn-aplicar-append').disabled = false;
    },
    (err)=>{
      g('ia-panel-spinner').style.display='none';
      if(editor){ editor.value = 'Error: ' + err; editor.disabled = false; }
      g('ia-btn-regenerar').disabled = false;
    }
  );
}

export function iaGenerarRte(suffix, key){
  if(!iaCheckKey()) return;
  const ctx = iaContextoSin();
  const existente = iaLeerCampoActual(suffix);
  let promptFinal = iaPrompt(key, ctx);
  if(existente){
    promptFinal += '\n\nCONTENIDO ACTUAL DEL CAMPO (ya capturado por el usuario — intégralo o mejóralo, no lo repitas literalmente):\n---\n' + existente + '\n---';
  }
  const titulos = {
    'desc':'Descripción de bienes afectados', 'narracion':'Narración de los hechos',
    'inspeccion':'Resultado de la inspección', 'naturaleza':'Naturaleza y alcance de daños',
    'estrategias':'Estrategias y documentos',  'observaciones':'Observaciones técnicas',
    'considerandos':'Considerandos del ajuste','actividades':'Actividades por realizar',
    'salvamento':'Detalle de salvamento',       'introduccion':'Introducción del informe'
  };
  iaLlamarPanel(promptFinal, titulos[key]||key, suffix);
}

export function iaSugerirCampo(campo){
  if(!iaCheckKey()) return;
  const ctx = iaContextoSin();
  const promptKeys = {
    'causa':'causa_simple', 'causa-com':'causa_com_simple', 'riesgo':'riesgo_simple'
  };
  const inputEl     = g('s-' + campo);
  const valorActual = (inputEl?.value||'').trim();
  let promptFinal   = iaPrompt(promptKeys[campo]||campo, ctx);
  if(valorActual){
    promptFinal += '\n\nEl campo ya contiene: "' + valorActual + '". Sugiere una versión mejorada si aplica, o confirma si ya es correcto.';
  }
  const box = g('ia-sugg-' + campo);
  const txt = g('ia-sugg-' + campo + '-text');
  if(!box||!txt) return;
  box.classList.add('open');
  txt.value = '';
  txt.placeholder = '⏳ Generando sugerencia…';
  let acum = '';
  iaCall(
    promptFinal,
    (chunk)=>{ acum+=chunk; txt.value=acum; },
    ()=>{ txt.placeholder='Edita si es necesario y presiona Aplicar'; },
    (err)=>{ txt.value='Error: '+err; }
  );
}

export function iaAplicarCampo(campo){
  const txt   = g('ia-sugg-' + campo + '-text');
  const input = g('s-' + campo);
  if(txt && input) input.value = txt.value.trim();
  iaCerrarSugg(campo);
}

export function iaCerrarSugg(campo){
  const box = g('ia-sugg-' + campo);
  if(box) box.classList.remove('open');
}

// Cerrar sugerencias al click fuera
document.addEventListener('click', e=>{
  ['causa','causa-com','riesgo'].forEach(c=>{
    const box = g('ia-sugg-'+c);
    if(box && !box.contains(e.target) && !e.target.classList.contains('btn-ia-simple')){
      box.classList.remove('open');
    }
  });
});

// ── Vision ────────────────────────────────────────────────────────────────

export async function iaVisionFileToB64(file){
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(',')[1]);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function iaVisionUrlToB64(url){
  const resp = await fetch(url);
  const blob = await resp.blob();
  return iaVisionFileToB64(blob);
}

export async function iaVisionAnalizar(b64, mimeType='image/jpeg'){
  const key = iaGetKey();
  if(!key){ abrirModal('modal-ia-config'); return null; }
  const resp = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages:[{
        role:'user',
        content:[
          { type:'text', text: IA_VISION_PROMPT },
          { type:'image_url', image_url:{ url:`data:${mimeType};base64,${b64}`, detail:'low' } }
        ]
      }]
    })
  });
  if(!resp.ok){
    const err = await resp.json();
    throw new Error(err.error?.message||'Error en API de visión');
  }
  const j = await resp.json();
  return j.choices?.[0]?.message?.content || '';
}

export async function iaVisionAnalizarGaleria(itemId, imageUrl, panelEl, inputEl){
  if(!iaCheckKey()) return;
  const btn    = panelEl.querySelector('.btn-ia-vision');
  const textEl = panelEl.querySelector('.ia-v-text');
  panelEl.classList.add('open');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  if(textEl) textEl.textContent = '';
  try {
    const b64    = await iaVisionUrlToB64(imageUrl);
    const result = await iaVisionAnalizar(b64);
    if(textEl) textEl.textContent = result;
    if(btn){ btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    const actions = panelEl.querySelector('.ia-v-actions');
    if(actions) actions.style.display = 'flex';
    panelEl.dataset.iaText = result;
    panelEl.dataset.itemId = itemId;
  } catch(e){
    if(textEl) textEl.textContent = '⚠ ' + e.message;
    if(btn){ btn.disabled = false; btn.textContent = '✦ IA — Analizar'; }
  }
}

export async function iaVisionAplicarEtiqueta(panelEl, inputEl){
  const text = panelEl.dataset.iaText;
  const id   = parseInt(panelEl.dataset.itemId);
  if(!text || !id) return;
  const short = text.replace(/\n/g,' ').slice(0,150);
  if(inputEl){ inputEl.value = short; }
  await grafActualizar(id, { etiqueta: short });
  toast('Descripción IA aplicada a la foto');
}

export function iaVisionCopiar(panelEl){
  const text = panelEl.dataset.iaText;
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>toast('Texto copiado'));
}

export function iaVisionInsertarRte(panelEl){
  const text = panelEl.dataset.iaText;
  if(!text) return;
  const current  = g('s-desc')?.value || '';
  const appended = current ? current + '\n\n' + text : text;
  loadRteSin('desc', appended.replace(/\n/g,'<br>'));
  syncRteSin('desc');
  toast('Descripción IA insertada en Descripción de bienes afectados');
}

export async function iaVisionAnalizarQueue(idx, previewUrl, panelEl, inputEl){
  if(!iaCheckKey()) return;
  const btn    = panelEl.querySelector('.btn-ia-vision');
  const textEl = panelEl.querySelector('.ia-v-text');
  panelEl.classList.add('open');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  if(textEl) textEl.textContent = '';
  try {
    const resp   = await fetch(previewUrl);
    const blob   = await resp.blob();
    const b64    = await iaVisionFileToB64(blob);
    const result = await iaVisionAnalizar(b64, blob.type||'image/jpeg');
    if(textEl) textEl.textContent = result;
    if(btn){ btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    panelEl.dataset.iaText = result;
    const actions = panelEl.querySelector('.ia-v-actions');
    if(actions) actions.style.display = 'flex';
    if(inputEl && !inputEl.value.trim()){
      const short = result.replace(/\n/g,' ').slice(0,150);
      inputEl.value = short;
      state.grafQueue[idx].etiqueta = short;
    }
  } catch(e){
    if(textEl) textEl.textContent = '⚠ ' + e.message;
    if(btn){ btn.disabled = false; btn.textContent = '✦ IA — Analizar'; }
  }
}

export function iaVisionQueueAplicar(idx, panelEl, inputEl){
  const text = (panelEl.dataset.iaText||'').replace(/\n/g,' ').slice(0,150);
  if(!text) return;
  if(inputEl){ inputEl.value = text; }
  if(state.grafQueue[idx]) state.grafQueue[idx].etiqueta = text;
  toast('Descripción aplicada');
}

export async function mobIaVisionAnalizar(){
  if(!iaCheckKey()) return;
  const file   = window._mobFotoActivo;
  if(!file){ toast('Captura o selecciona una foto primero'); return; }
  const panel  = g('mob-ia-vision-panel');
  const textEl = g('mob-ia-vision-text');
  const btn    = g('mob-ia-vision-btn');
  const applyB = g('mob-ia-apply-btn');
  if(!panel || !textEl) return;
  panel.style.display = 'block';
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
  textEl.textContent = 'Analizando imagen…';
  try {
    const b64    = await iaVisionFileToB64(file);
    const result = await iaVisionAnalizar(b64, file.type||'image/jpeg');
    textEl.textContent = result;
    if(btn){ btn.disabled = false; btn.textContent = '↻ Re-analizar'; }
    if(applyB) applyB.style.display = 'block';
    const etq = g('mfoto-etiqueta');
    if(etq && !etq.value.trim()){
      etq.value = result.replace(/\n/g,' ').slice(0,150);
    }
  } catch(e){
    textEl.textContent = '⚠ ' + e.message;
    if(btn){ btn.disabled = false; btn.textContent = '✦ IA — Analizar imagen'; }
  }
}

export function mobIaVisionAplicar(){
  const text = g('mob-ia-vision-text')?.textContent||'';
  if(!text) return;
  const etq = g('mfoto-etiqueta');
  if(etq) etq.value = text.replace(/\n/g,' ').slice(0,150);
  toast('Descripción aplicada');
}
