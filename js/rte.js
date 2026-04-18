import { g, v, toast } from './ui.js';
import { data, currentSin } from './state.js';
import { GRAF_TIPOS } from './config.js';
import { cerrarModal } from './modal.js';

// Module-level RTE image picker state
let rteImgSuffix = '';
let rteImgSaved  = null;
let rteImgSel    = null;

export function rteInsertarImagen(suffix){
  if(!currentSin){ toast('Guarda el expediente primero para poder insertar imágenes.'); return; }
  rteImgSuffix = suffix;
  rteImgSel    = null;

  const sel = window.getSelection();
  rteImgSaved = (sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;

  const picker = g('rte-img-picker');
  const empty  = g('rte-img-empty');
  const items  = data.graf.filter(x=>x.id_siniestro===currentSin.id&&x.url);
  picker.innerHTML='';
  if(!items.length){
    picker.style.display='none';
    if(empty) empty.style.display='block';
  } else {
    picker.style.display='grid';
    if(empty) empty.style.display='none';
    items.forEach(it=>{
      const meta = GRAF_TIPOS[it.tipo]||GRAF_TIPOS.localizacion;
      const card = document.createElement('div');
      card.style.cssText='border:2px solid var(--border);border-radius:var(--r);overflow:hidden;cursor:pointer;transition:border-color .15s;';
      card.addEventListener('mouseenter',()=>card.style.borderColor='var(--accent-lt)');
      card.addEventListener('mouseleave',()=>card.style.borderColor=rteImgSel===it?'var(--accent)':'var(--border)');
      card.addEventListener('click',()=>rteSelImagen(it,card,items));

      const img=document.createElement('img');
      img.src=it.url; img.loading='lazy';
      img.style.cssText='width:100%;aspect-ratio:4/3;object-fit:cover;display:block;';
      card.appendChild(img);

      const lbl=document.createElement('div');
      lbl.style.cssText='padding:4px 6px;font-size:10px;color:var(--text-sec);background:var(--surface2);';
      lbl.textContent=(meta.icon+' '+(it.etiqueta||meta.label)).slice(0,40);
      card.appendChild(lbl);
      picker.appendChild(card);
    });
  }

  if(g('rte-img-caption')) g('rte-img-caption').value='';
  if(g('rte-img-selected-preview')) g('rte-img-selected-preview').style.display='none';
  const btn=g('rte-img-insert-btn'); if(btn) btn.disabled=true;

  g('modal-rte-img').classList.add('open');
}

export function rteSelImagen(it, card, allCards){
  rteImgSel=it;
  g('rte-img-picker').querySelectorAll('div[style]').forEach(d=>d.style.borderColor='var(--border)');
  card.style.borderColor='var(--accent)';
  const prev=g('rte-img-selected-preview'); if(prev) prev.style.display='block';
  const lbl=g('rte-img-sel-label'); if(lbl) lbl.textContent=it.etiqueta||it.nombre_archivo||'Sin etiqueta';
  const cap=g('rte-img-caption'); if(cap&&!cap.value) cap.value=it.etiqueta||'';
  const btn=g('rte-img-insert-btn'); if(btn) btn.disabled=false;
}

export function rteConfirmarImagen(){
  if(!rteImgSel) return;
  const size    = v('rte-img-size')||'50%';
  const align   = v('rte-img-align')||'center';
  const caption = v('rte-img-caption')||'';
  const url     = rteImgSel.url;

  const rte = g('s-'+rteImgSuffix+'-rte')||g('sin-'+rteImgSuffix+'-rte');
  if(!rte){ cerrarModal('modal-rte-img'); return; }
  rte.focus();
  if(rteImgSaved){
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(rteImgSaved);
  }

  const imgHtml = `<figure style="display:${align==='center'?'block':'inline-block'};text-align:${align};margin:10px ${align==='center'?'auto':'0'};width:${size};">` +
    `<img src="${url}" style="width:100%;height:auto;border-radius:3px;border:1px solid #ccc;" data-graf-id="${rteImgSel.id}" data-size="${size}" data-align="${align}">` +
    (caption ? `<figcaption style="font-size:10px;color:#555;margin-top:3px;text-align:center;font-style:italic;">${caption}</figcaption>` : '') +
    `</figure>`;

  document.execCommand('insertHTML', false, imgHtml);
  syncRteSin(rteImgSuffix);

  cerrarModal('modal-rte-img');
  rteImgSaved=null; rteImgSel=null;
}

export async function fetchImgAsBase64(url){
  try{
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result.split(',')[1]);
      r.onerror=rej;
      r.readAsDataURL(blob);
    });
  } catch(e){ console.warn('Image fetch failed:',url,e); return null; }
}

export async function parseRteImgsForWord(html){
  if(!html||!html.includes('<img')) return [{text:html,img:null}];
  const tmp=document.createElement('div'); tmp.innerHTML=html;
  const segments=[];
  let current='';
  const walk=(node)=>{
    if(node.nodeType===3){ current+=node.textContent; return; }
    if(node.tagName==='IMG'){
      if(current.trim()) segments.push({text:current,img:null});
      current='';
      const src=node.getAttribute('src')||'';
      const sizePct=parseInt(node.dataset.size)||50;
      const fig=node.closest('figure');
      const caption=fig?fig.querySelector('figcaption')?.textContent||'':'';
      segments.push({text:'',img:{src,sizePct,caption}});
      return;
    }
    if(node.tagName==='FIGURE'){
      if(current.trim()) segments.push({text:current,img:null});
      current='';
      const img=node.querySelector('img');
      const cap=node.querySelector('figcaption')?.textContent||'';
      if(img){
        const sizePct=parseInt(img.dataset.size)||50;
        segments.push({text:'',img:{src:img.getAttribute('src')||'',sizePct,caption:cap}});
      }
      return;
    }
    Array.from(node.childNodes).forEach(walk);
  };
  Array.from(tmp.childNodes).forEach(walk);
  if(current.trim()) segments.push({text:current,img:null});
  return segments;
}

// ── Generic RTE helpers ───────────────────────────────────────────────

export function rteCmdSin(suffix, cmd){
  document.execCommand(cmd, false, null);
  const rte = g('s-'+suffix+'-rte');
  if(rte) rte.focus();
  syncRteSin(suffix);
}

export function syncRteSin(suffix){
  const rte = g('s-'+suffix+'-rte');
  const ta  = g('s-'+suffix);
  if(rte && ta) ta.value = rte.innerHTML;
}

export function loadRteSin(suffix, html){
  const rte = g('s-'+suffix+'-rte');
  if(rte) rte.innerHTML = html||'';
  const ta  = g('s-'+suffix);
  if(ta)  ta.value = html||'';
}

export function rteCmd(cmd, val=null){ rteCmdSin('bienes', cmd); }
export function syncBienesRte(){ syncRteSin('bienes'); }
export function loadBienesRte(html){ loadRteSin('bienes', html); }

// ── Límite máximo responsabilidad — Póliza ───────────────────────────

export function rteCmdPolLim(cmd){
  document.execCommand(cmd,false,null);
  const rte=g('p-lim-texto-rte'); if(rte) rte.focus();
  syncPolLimTexto();
}
export function syncPolLimTexto(){
  const rte=g('p-lim-texto-rte'), ta=g('p-lim-texto');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadPolLimTexto(html){
  const rte=g('p-lim-texto-rte'), ta=g('p-lim-texto');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

// ── Límite máximo responsabilidad — modal-sin ────────────────────────

export function rteCmdSinLim(cmd){
  document.execCommand(cmd,false,null);
  const rte=g('sin-lim-texto-rte'); if(rte) rte.focus();
  syncSinLimTexto();
}
export function syncSinLimTexto(){
  const rte=g('sin-lim-texto-rte'), ta=g('sin-lim-texto');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadSinLimTexto(html){
  const rte=g('sin-lim-texto-rte'), ta=g('sin-lim-texto');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

// ── Giro asegurado — Póliza ──────────────────────────────────────────

export function rteCmdPolGiro(cmd){
  document.execCommand(cmd,false,null);
  const rte=g('p-giro-aseg-rte'); if(rte) rte.focus();
  syncPolGiroAseg();
}
export function syncPolGiroAseg(){
  const rte=g('p-giro-aseg-rte'), ta=g('p-giro-aseg');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadPolGiroAseg(html){
  const rte=g('p-giro-aseg-rte'), ta=g('p-giro-aseg');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

// ── Giro asegurado — modal-sin ────────────────────────────────────────

export function rteCmdSinGiro(cmd){
  document.execCommand(cmd,false,null);
  const rte=g('sin-giro-aseg-rte'); if(rte) rte.focus();
  syncSinGiroAseg();
}
export function syncSinGiroAseg(){
  const rte=g('sin-giro-aseg-rte'), ta=g('sin-giro-aseg');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadSinGiroAseg(html){
  const rte=g('sin-giro-aseg-rte'), ta=g('sin-giro-aseg');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

// ── Descripción del asegurado — Póliza ──────────────────────────────

export function rteCmdPol2(cmd){
  document.execCommand(cmd, false, null);
  const rte=g('p-desc-aseg-rte'); if(rte) rte.focus();
  syncPolDescAseg();
}
export function syncPolDescAseg(){
  const rte=g('p-desc-aseg-rte'), ta=g('p-desc-aseg');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadPolDescAseg(html){
  const rte=g('p-desc-aseg-rte'), ta=g('p-desc-aseg');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

// ── Descripción del asegurado — modal-sin ───────────────────────────

export function rteCmdSinDescAseg(cmd){
  document.execCommand(cmd, false, null);
  const rte=g('sin-desc-aseg-rte'); if(rte) rte.focus();
  syncSinDescAseg();
}
export function syncSinDescAseg(){
  const rte=g('sin-desc-aseg-rte'), ta=g('sin-desc-aseg');
  if(rte&&ta) ta.value=rte.innerHTML;
}
export function loadSinDescAseg(html){
  const rte=g('sin-desc-aseg-rte'), ta=g('sin-desc-aseg');
  if(rte) rte.innerHTML=html||'';
  if(ta)  ta.value=html||'';
}

export const rtePublic = {};
