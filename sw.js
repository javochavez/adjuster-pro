// ═══════════════════════════════════════════════════════════════════════════
// AdjusterPro JChA — Service Worker v1.0
// Offline-first: cache de shell + intercepción de red con fallback a IDB
// ═══════════════════════════════════════════════════════════════════════════

const SW_VERSION   = 'aasa-20260420';
const SHELL_CACHE  = SW_VERSION + '-shell';
const SUPA_HOST    = 'lxtieqaldwcntxaqklww.supabase.co';

// Recursos de la app shell que se cachean al instalar
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];

// ── Instalación: cachear shell ────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar caches viejos ────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia por tipo de request ────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase REST API — network-first, sin interceptar en SW
  // La lógica offline se maneja en el cliente (IndexedDB)
  if (url.hostname === SUPA_HOST) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ data: null, error: { message: 'offline' } }),
          { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // App shell — network-first, caché solo como fallback offline
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }
});

// ── Mensaje desde la página: sync manual ─────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'SYNC_NOW') {
    // Notificar a todos los clientes para que ejecuten la sincronización
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'DO_SYNC' }))
    );
  }
});

// ── Background Sync (Chrome/Edge) ────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'aasa-sync') {
    e.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'DO_SYNC' }))
      )
    );
  }
});
