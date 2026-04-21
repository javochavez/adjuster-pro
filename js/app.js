/**
 * app.js — AdjusterPro JChA / Almaraz Ajustadores (AASA)
 * Entry point ES Module.
 *
 * Responsabilidades:
 *   1. Crear cliente Supabase y publicarlo en window.__db
 *   2. Definir el objeto global `data` y `window.__appData`
 *   3. Implementar loadAll() con todas las tablas
 *   4. Implementar mostrarApp() y el flujo de auth
 *   5. Importar todos los módulos y publicar sus funciones en window.*
 *      para que los onclick del HTML legacy continúen funcionando
 *
 * Módulos importados:
 *   config, state, ui, auth, db (helpers), rte, ia,
 *   offline, dashboard, expediente, modal-sin, poliza,
 *   informes, solicitudes, graficos, mobile, app (este)
 */

// ══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ══════════════════════════════════════════════════════════════════════════

import { state }                          from './state.js';
import { uiPublic }                       from './ui.js';
import { authPublic }                     from './auth.js';
import { db, dbPublic }                   from './db.js';
import { rtePublic }                      from './rte.js';
import { iaPublic }                       from './ia.js';
import { offlinePublic }                  from './offline.js';
import { dashboardPublic }                from './dashboard.js';
import { expedientePublic }               from './expediente.js';
import { modalSinPublic }                 from './modal-sin.js';
import { polizaPublic }                   from './poliza.js';
import { informesPublic }                 from './informes.js';
import { solicitudesPublic }              from './solicitudes.js';
import { graficosPublic }                 from './graficos.js';
import { mobilePublic, mobHookMostrarApp } from './mobile.js';

// ══════════════════════════════════════════════════════════════════════════
// SUPABASE
// ══════════════════════════════════════════════════════════════════════════
window.__db = db;

// ══════════════════════════════════════════════════════════════════════════
// DATA STORE — objeto global compartido por todos los módulos
// ══════════════════════════════════════════════════════════════════════════
const data = window.data = {
  sin: [], pol: [], aseg: [], asdo: [], cont: [],
  res: [], pag: [], hon: [], viat: [], act: [],
  doc: [], tc: [], bit: [], inf: [], sublim: [],
  coas: [], ajust: [], ajus: [], ofic: [], sinajust: [],
  todos: [], graf: [],
  solicitudes: [], sol_items: [], sol_seg: [], sol_catalogo: [],
};
window.__appData = data;

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DE USUARIO
// ══════════════════════════════════════════════════════════════════════════
let currentUserRole     = window.currentUserRole     = '';
let currentUserReadonly = window.currentUserReadonly = false;

// currentSin — getter/setter que sincroniza con window.__currentSin
let _currentSin = null;
Object.defineProperty(window, '__currentSin', {
  get: () => _currentSin,
  set: (v) => { _currentSin = v; },
  configurable: true,
});

// Alias legible por los módulos legacy del HTML
Object.defineProperty(window, 'currentSin', {
  get: () => _currentSin,
  set: (v) => { _currentSin = v; window.__currentSin = v; },
  configurable: true,
});

// ══════════════════════════════════════════════════════════════════════════
// HELPERS GLOBALES (atajos frecuentes en el HTML)
// ══════════════════════════════════════════════════════════════════════════
window.g   = (id) => document.getElementById(id);
window.v   = (id) => document.getElementById(id)?.value;

window.toast = (msg, dur = 2800) => {
  const el = window.g('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), dur);
};

window.fmtD = (d) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  return `${dy}/${m}/${y}`;
};

window.fmtMXN = (n) => {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.toMXN = (monto, moneda = 'MXN', tc = 1) => {
  const m = parseFloat(monto) || 0;
  const t = parseFloat(tc)    || 1;
  return moneda === 'MXN' ? m : m * t;
};

window.abrirModal  = (id) => { const el = window.g(id); if (el) el.classList.add('open'); };
window.cerrarModal = (id) => { const el = window.g(id); if (el) el.classList.remove('open'); };

// ══════════════════════════════════════════════════════════════════════════
// loadAll — carga todas las tablas de Supabase
// ══════════════════════════════════════════════════════════════════════════
window.loadAll = async function loadAll() {
  if (!navigator.onLine) {
    if (typeof window.offlineLoadAll === 'function') await window.offlineLoadAll();
    return;
  }
  try {
    const [
      sin, pol, aseg, asdo, cont, res, pag, hon, viat, act,
      doc, tc, bit, inf, sublim, coas, ajust, ofic, sinajust, todos, graf,
    ] = await Promise.all([
      db.from('siniestros').select('*').order('id', { ascending: false }),
      db.from('polizas').select('*').order('id', { ascending: false }),
      db.from('aseguradoras').select('*').order('nombre'),
      db.from('asegurados').select('*').order('nombre'),
      db.from('contactos').select('*').order('nombre'),
      db.from('reservas').select('*').order('fecha', { ascending: false }),
      db.from('pagos').select('*').order('fecha', { ascending: false }),
      db.from('honorarios').select('*').order('id', { ascending: false }),
      db.from('viaticos').select('*').order('fecha', { ascending: false }),
      db.from('actividades').select('*').order('fecha', { ascending: false }),
      db.from('documentos').select('*').order('fecha', { ascending: false }),
      db.from('tipos_cambio').select('*').order('fecha', { ascending: false }),
      db.from('bitacora_ajustador').select('*').order('fecha', { ascending: false }),
      db.from('informes').select('*').order('fecha_envio', { ascending: false }),
      db.from('sublimites').select('*').order('id'),
      db.from('coaseguradoras').select('*').order('porcentaje', { ascending: false }),
      db.from('ajustadores').select('*,id_oficina(nombre,ciudad)').order('nombre'),
      db.from('oficinas').select('*').order('nombre'),
      db.from('siniestro_ajustadores').select('*').order('id'),
      db.from('todos').select('*').order('fecha_limite', { ascending: true }),
      db.from('graficos_expediente').select('*').order('created_at'),
    ]);

    data.sin      = sin.data      || [];
    data.pol      = pol.data      || [];
    data.aseg     = aseg.data     || [];
    data.asdo     = asdo.data     || [];
    data.cont     = cont.data     || [];
    data.res      = res.data      || [];
    data.pag      = pag.data      || [];
    data.hon      = hon.data      || [];
    data.viat     = viat.data     || [];
    data.act      = act.data      || [];
    data.doc      = doc.data      || [];
    data.tc       = tc.data       || [];
    data.bit      = bit.data      || [];
    data.bitacora = bit.data      || [];   // alias usado por mobile.js
    data.inf      = inf.data      || [];
    data.sublim   = sublim.data   || [];
    data.coas     = coas.data     || [];
    data.ajust    = ajust.data    || [];
    data.ajus     = ajust.data    || [];   // alias usado por mobile.js
    data.ofic     = ofic.data     || [];
    data.sinajust = sinajust.data || [];
    data.todos    = todos.data    || [];
    data.graf     = graf.data     || [];

    // Solicitudes — segunda ronda
    const [solRes, solItemsRes, solSegRes, solCatRes] = await Promise.all([
      db.from('solicitudes_info').select('*').order('created_at', { ascending: false }),
      db.from('solicitud_items').select('*').order('orden'),
      db.from('solicitud_seguimiento').select('*').order('fecha'),
      db.from('catalogo_documentos').select('*').order('orden'),
    ]);
    data.solicitudes   = solRes.data     || [];
    data.sol_items     = solItemsRes.data || [];
    data.sol_seg       = solSegRes.data   || [];
    data.sol_catalogo  = solCatRes.data   || [];

    renderAll();
    // Snapshot offline en background
    setTimeout(() => {
      if (typeof window.offlineSaveSnapshot === 'function') window.offlineSaveSnapshot();
    }, 1500);

    // Hook mobile
    mobHookMostrarApp();

  } catch (e) {
    console.warn('loadAll error, falling back to IDB:', e);
    if (typeof window.offlineLoadAll === 'function') await window.offlineLoadAll();
  }
};

// ══════════════════════════════════════════════════════════════════════════
// renderAll — dispara todos los renders de paneles
// ══════════════════════════════════════════════════════════════════════════
function renderAll() {
  if (typeof window.renderDash         === 'function') window.renderDash();
  if (typeof window.renderAlertas      === 'function') window.renderAlertas();
  if (typeof window.renderSiniestros   === 'function') window.renderSiniestros();
  if (typeof window.renderPolizas      === 'function') window.renderPolizas();
  if (typeof window.renderAseguradoras === 'function') window.renderAseguradoras();
  if (typeof window.renderAsegurados   === 'function') window.renderAsegurados();
  if (typeof window.renderContactos    === 'function') window.renderContactos();
  if (typeof window.renderTC           === 'function') window.renderTC();
  if (typeof window.renderAjustadores  === 'function') window.renderAjustadores();
  if (typeof window.poblarSelectores   === 'function') window.poblarSelectores();
}
window.renderAll = renderAll;

// ══════════════════════════════════════════════════════════════════════════
// AUTH — mostrarApp / doLogout
// ══════════════════════════════════════════════════════════════════════════
window.mostrarApp = function mostrarApp(email, rol) {
  currentUserRole     = rol || '';
  currentUserReadonly = (rol === 'consultor');
  window.currentUserRole     = currentUserRole;
  window.currentUserReadonly = currentUserReadonly;

  window.g('login-wrap').style.display = 'none';
  window.g('app').style.display        = 'flex';

  const lbl      = window.g('user-lbl');
  const rolLabel = { admin: 'Admin', ajustador: 'Ajustador', consultor: 'Consultor' }[rol] || '';
  if (lbl) lbl.textContent = rolLabel ? `${email}  [${rolLabel}]` : email;

  if (currentUserReadonly) document.body.classList.add('modo-lectura');
  else                     document.body.classList.remove('modo-lectura');

  if (typeof window.userMenuInit === 'function') window.userMenuInit(email, rol);

  window.loadAll();
};

window.doLogout = async function doLogout() {
  await db.auth.signOut();
  currentUserRole     = '';
  currentUserReadonly = false;
  window.currentUserRole     = currentUserRole;
  window.currentUserReadonly = currentUserReadonly;
  document.body.classList.remove('modo-lectura');
  window.g('app').style.display        = 'none';
  window.g('login-wrap').style.display = 'flex';
  if (typeof window.authMostrar === 'function') window.authMostrar('login');
  const lp = window.g('l-pass');
  if (lp) lp.value = '';
};

// ══════════════════════════════════════════════════════════════════════════
// INIT — verificar sesión al cargar
// ══════════════════════════════════════════════════════════════════════════
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const { data: perfil } = await db
      .from('perfiles')
      .select('aprobado, rol')
      .eq('id', session.user.id)
      .single();
    if (perfil?.aprobado === true) {
      window.mostrarApp(session.user.email, perfil.rol || '');
    } else {
      if (typeof window.authMostrar === 'function') window.authMostrar('pending');
    }
  }
})();

// ══════════════════════════════════════════════════════════════════════════
// PUBLICAR TODOS LOS MÓDULOS EN window.*
// Los onclick del HTML legacy llaman a funciones globales.
// ══════════════════════════════════════════════════════════════════════════
function pub(obj) {
  Object.entries(obj).forEach(([k, fn]) => {
    if (typeof fn === 'function' && !window[k]) window[k] = fn;
  });
}

// ui.js
pub(uiPublic);

// auth.js
pub(authPublic);

// db.js (helpers CRUD genéricos)
pub(dbPublic);

// rte.js
pub(rtePublic);

// ia.js
pub(iaPublic);

// offline.js
pub(offlinePublic);

// dashboard.js
pub(dashboardPublic);

// expediente.js
pub(expedientePublic);

// modal-sin.js
pub(modalSinPublic);

// poliza.js
pub(polizaPublic);

// informes.js
pub(informesPublic);

// solicitudes.js
pub(solicitudesPublic);

// graficos.js
pub(graficosPublic);

// mobile.js
pub(mobilePublic);

// ── Exponer helpers de IA visión para mobile.js ───────────────────────────
// mobile.js los consume via window.iaVisionFileToB64 / window.iaVisionAnalizar
if (graficosPublic.iaVisionFileToB64) window.iaVisionFileToB64 = graficosPublic.iaVisionFileToB64;
if (graficosPublic.iaVisionAnalizar)  window.iaVisionAnalizar  = graficosPublic.iaVisionAnalizar;

// ── Exponer db para módulos que aún lo referencian globalmente ────
window.db = db;

// ══════════════════════════════════════════════════════════════════════════
// switchMain / switchTab / switchTab2 / switchCat
// Navegación de paneles principales — permanecen en app.js
// ══════════════════════════════════════════════════════════════════════════
window.switchMain = function switchMain(tab, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.topbar-mid .nav-btn').forEach(b => b.classList.remove('active'));
  const panel = window.g('panel-' + tab);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  if (tab === 'reportes' && typeof window.poblarSelectores === 'function') window.poblarSelectores();
  if (tab === 'alertas'  && typeof window.renderAlertas    === 'function') window.renderAlertas();
};

window.switchTab = function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pane = window.g(id);
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
};

window.switchTab2 = function switchTab2(id, btn) {
  // Tabs del detalle de expediente (segunda fila)
  const container = btn?.closest('.tabs')?.parentElement;
  if (container) {
    container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  }
  const pane = window.g(id);
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
};

window.switchCat = function switchCat(id, btn) {
  ['aseg', 'asdo', 'cont', 'tc', 'ajust', 'ofic', 'catdoc'].forEach(c => {
    const el = window.g('cat-' + c);
    if (el) el.style.display = c === id ? 'block' : 'none';
  });
  document.querySelectorAll('#panel-catalogos .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (id === 'ajust' && typeof window.renderAjustadores === 'function') window.renderAjustadores();
  if (id === 'ofic'  && typeof window.renderOficinas    === 'function') window.renderOficinas();
};

// ══════════════════════════════════════════════════════════════════════════
// irAExpediente — navega al detalle desde dashboard / alertas
// ══════════════════════════════════════════════════════════════════════════
window.irAExpediente = function irAExpediente(sinId) {
  if (typeof window.verSiniestro === 'function') {
    window.verSiniestro(sinId);
  }
  // Asegurar que el panel de siniestros esté activo
  const panel = window.g('panel-siniestros');
  if (panel) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    panel.classList.add('active');
  }
};

// ══════════════════════════════════════════════════════════════════════════
// Registrar Service Worker (delega a offline.js)
// ══════════════════════════════════════════════════════════════════════════
if (typeof window.offlineRegisterSW === 'function') {
  window.offlineRegisterSW();
}
