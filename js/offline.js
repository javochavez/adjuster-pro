import { IDB_NAME, IDB_VERSION, IDB_STORES } from './config.js';
import { data } from './state.js';
import * as state from './state.js';
import { g, toast } from './ui.js';
import { db, loadAll, renderAll } from './db.js';

// ── IDB core ──────────────────────────────────────────────────────────────

export function idbOpen(){
  return new Promise((res, rej) => {
    if(state._idb){ res(state._idb); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const idb = e.target.result;
      IDB_STORES.forEach(s => {
        if(!idb.objectStoreNames.contains(s)){
          if(s === 'sync_queue') idb.createObjectStore(s, {keyPath:'_qid', autoIncrement:true});
          else if(s === 'meta')  idb.createObjectStore(s, {keyPath:'key'});
          else                   idb.createObjectStore(s, {keyPath:'id', autoIncrement:true});
        }
      });
    };
    req.onsuccess = e => { state._idb = e.target.result; res(state._idb); };
    req.onerror   = e => rej(e.target.error);
  });
}

export async function idbGetAll(store){
  const idb = await idbOpen();
  return new Promise((res, rej) => {
    const tx  = idb.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

export async function idbPutAll(store, rows){
  if(!rows?.length) return;
  const idb = await idbOpen();
  return new Promise((res, rej) => {
    const tx = idb.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    os.clear();
    rows.forEach(r => os.put(r));
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function idbPut(store, record){
  const idb = await idbOpen();
  return new Promise((res, rej) => {
    const tx  = idb.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

export async function idbClear(store){
  const idb = await idbOpen();
  return new Promise((res, rej) => {
    const tx = idb.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function idbSetMeta(key, value){
  await idbPut('meta', { key, value, ts: Date.now() });
}

export async function idbGetMeta(key){
  const idb = await idbOpen();
  return new Promise(res => {
    const tx  = idb.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get(key);
    req.onsuccess = () => res(req.result?.value ?? null);
    req.onerror   = () => res(null);
  });
}

// ── Cola de sincronización ────────────────────────────────────────────────

export async function queueOp(tabla, op, payload, matchId = null){
  await idbPut('sync_queue', {
    tabla, op,
    payload,
    matchId,
    ts: Date.now(),
    _qid: undefined
  });
  offlineUpdateBadge();
}

export async function queueGetAll(){
  return idbGetAll('sync_queue');
}

export async function queueDelete(qid){
  const idb = await idbOpen();
  return new Promise((res, rej) => {
    const tx  = idb.transaction('sync_queue', 'readwrite');
    const req = tx.objectStore('sync_queue').delete(qid);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// ── Indicador visual ──────────────────────────────────────────────────────

export async function offlineUpdateBadge(){
  const q     = await queueGetAll();
  const n     = q.length;
  const badge = document.getElementById('conn-badge');
  if(badge){ badge.textContent = n; badge.classList.toggle('show', n > 0); }
}

export function offlineSetState(st){ // 'online' | 'offline' | 'syncing'
  const el  = document.getElementById('conn-indicator');
  const lbl = document.getElementById('conn-label');
  if(!el || !lbl) return;
  el.classList.remove('online','offline','syncing');
  el.classList.add(st);
  lbl.textContent = st === 'online'  ? 'En línea'
                  : st === 'offline' ? 'Sin conexión'
                  : 'Sincronizando…';
}

// ── Snapshot ──────────────────────────────────────────────────────────────

export async function offlineSaveSnapshot(){
  const tables = [
    ['siniestros',          data.sin],
    ['polizas',             data.pol],
    ['aseguradoras',        data.aseg],
    ['asegurados',          data.asdo],
    ['contactos',           data.cont],
    ['reservas',            data.res],
    ['pagos',               data.pag],
    ['honorarios',          data.hon],
    ['viaticos',            data.viat],
    ['actividades',         data.act],
    ['documentos',          data.doc],
    ['tipos_cambio',        data.tc],
    ['bitacora_ajustador',  data.bit],
    ['informes',            data.inf],
    ['sublimites',          data.sublim],
    ['coaseguradoras',      data.coas],
    ['ajustadores',         data.ajust],
    ['oficinas',            data.ofic],
    ['siniestro_ajustadores', data.sinajust],
    ['todos',               data.todos],
    ['graficos_expediente', data.graf],
  ];
  for(const [store, rows] of tables){
    if(rows?.length) await idbPutAll(store, rows).catch(()=>{});
  }
  await idbSetMeta('last_sync', new Date().toISOString());
}

// ── Cargar desde IDB cuando no hay red ───────────────────────────────────

export async function offlineLoadAll(){
  const [sin,pol,aseg,asdo,cont,res,pag,hon,viat,act,doc,tc,bit,inf,sublim,coas,ajust,ofic,sinajust,todos,graf] = await Promise.all([
    idbGetAll('siniestros'),      idbGetAll('polizas'),
    idbGetAll('aseguradoras'),    idbGetAll('asegurados'),
    idbGetAll('contactos'),       idbGetAll('reservas'),
    idbGetAll('pagos'),           idbGetAll('honorarios'),
    idbGetAll('viaticos'),        idbGetAll('actividades'),
    idbGetAll('documentos'),      idbGetAll('tipos_cambio'),
    idbGetAll('bitacora_ajustador'), idbGetAll('informes'),
    idbGetAll('sublimites'),      idbGetAll('coaseguradoras'),
    idbGetAll('ajustadores'),     idbGetAll('oficinas'),
    idbGetAll('siniestro_ajustadores'), idbGetAll('todos'),
    idbGetAll('graficos_expediente'),
  ]);
  data.sin=sin; data.pol=pol; data.aseg=aseg; data.asdo=asdo;
  data.cont=cont; data.res=res; data.pag=pag; data.hon=hon;
  data.viat=viat; data.act=act; data.doc=doc; data.tc=tc;
  data.bit=bit; data.inf=inf; data.sublim=sublim; data.coas=coas;
  data.ajust=ajust; data.ofic=ofic; data.sinajust=sinajust;
  data.todos=todos; data.graf=graf;
  const lastSync = await idbGetMeta('last_sync');
  const msg = lastSync
    ? `Modo sin conexión — datos del ${new Date(lastSync).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`
    : 'Sin conexión — sin datos locales disponibles';
  toast(msg);
  renderAll();
}

// ── Sincronización: drenar cola contra Supabase ───────────────────────────

export async function offlineSync(){
  if(state._syncRunning || !state._isOnline) return;
  const queue = await queueGetAll();
  if(!queue.length){ offlineUpdateBadge(); return; }

  state._syncRunning = true;
  offlineSetState('syncing');
  let ok = 0, fail = 0;

  for(const op of queue.sort((a,b) => a.ts - b.ts)){
    try {
      let error;
      if(op.op === 'insert'){
        ({ error } = await db.from(op.tabla).insert(op.payload));
      } else if(op.op === 'update' && op.matchId){
        ({ error } = await db.from(op.tabla).update(op.payload).eq('id', op.matchId));
      }
      if(error) throw new Error(error.message);
      await queueDelete(op._qid);
      ok++;
    } catch(e){
      console.warn('Sync error:', op.tabla, e.message);
      fail++;
    }
  }

  state._syncRunning = false;
  offlineSetState('online');
  offlineUpdateBadge();

  if(ok > 0){
    toast(`✓ Sincronizados ${ok} cambio${ok>1?'s':''} con Supabase`);
    await loadAll();
  }
  if(fail > 0) toast(`⚠ ${fail} cambio${fail>1?'s':''} no pudieron sincronizarse`);
}

// ── Guardar siniestro offline ─────────────────────────────────────────────

export async function offlineSaveSiniestro(id, payload){
  const tmpId  = id ? parseInt(id) : -(Date.now());
  const record = { ...payload, id: tmpId };
  await idbPut('siniestros', record);
  if(id){
    await queueOp('siniestros', 'update', payload, parseInt(id));
  } else {
    await queueOp('siniestros', 'insert', payload);
  }
  if(id){
    const idx = data.sin.findIndex(s => s.id === parseInt(id));
    if(idx >= 0) data.sin[idx] = { ...data.sin[idx], ...payload };
  } else {
    data.sin.unshift(record);
  }
  offlineUpdateBadge();
}

// ── Guardar reserva offline ───────────────────────────────────────────────

export async function offlineSaveReserva(payload){
  const tmpId = -(Date.now());
  await idbPut('reservas', { ...payload, id: tmpId });
  await queueOp('reservas', 'insert', payload);
  data.res.unshift({ ...payload, id: tmpId });
  offlineUpdateBadge();
}

// ── Guardar pago offline ──────────────────────────────────────────────────

export async function offlineSavePago(payload){
  const tmpId = -(Date.now());
  await idbPut('pagos', { ...payload, id: tmpId });
  await queueOp('pagos', 'insert', payload);
  data.pag.unshift({ ...payload, id: tmpId });
  offlineUpdateBadge();
}

// ── Registro del Service Worker ───────────────────────────────────────────

export async function offlineRegisterSW(){
  if(!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if(nw.state === 'installed' && navigator.serviceWorker.controller){
          toast('Nueva versión disponible — recarga para actualizar');
        }
      });
    });
  } catch(e){ console.warn('SW registration failed:', e); }
}

// ── Listeners de red y SW ─────────────────────────────────────────────────

window.addEventListener('online', async () => {
  state._isOnline = true;
  offlineSetState('online');
  toast('Conexión restaurada — sincronizando…');
  await offlineSync();
  if('serviceWorker' in navigator && 'SyncManager' in window){
    const reg = await navigator.serviceWorker.ready;
    reg.sync.register('aasa-sync').catch(()=>{});
  }
});

window.addEventListener('offline', () => {
  state._isOnline = false;
  offlineSetState('offline');
  toast('Sin conexión — los cambios se guardarán localmente');
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', e => {
    if(e.data?.type === 'DO_SYNC') offlineSync();
  });
}

// ── Inicialización ────────────────────────────────────────────────────────

offlineRegisterSW();
setTimeout(() => {
  offlineSetState(state._isOnline ? 'online' : 'offline');
  offlineUpdateBadge();
}, 500);
