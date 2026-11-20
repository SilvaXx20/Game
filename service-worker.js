/* LAST SIGNAL — service worker.
   Para publicar uma nova versão: troque o número em VERSION e envie de novo. */
const VERSION = '0.1.0';
const CACHE = 'last-signal-' + VERSION;
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const CORE = ['./', './index.html', './css/style.css', './scripts/game.js', './scripts/pwa.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    try { await c.add(new Request(THREE_URL, { mode: 'cors' })); } catch (err) { /* sem internet agora: será guardado no primeiro uso */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('last-signal-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req.url, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
  net.catch(() => {});
  const wait = new Promise((_, rej) => setTimeout(rej, 4000));
  try { return await Promise.race([net, wait]); }
  catch (err) {
    const m = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await c.match('./index.html')));
    return m || net;
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const m = await c.match(req.url);
  if (m) return m;
  const r = await fetch(new Request(req.url, { mode: 'cors' }));
  if (r && r.ok) c.put(req.url, r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.url === THREE_URL) { e.respondWith(cacheFirst(req)); return; }
  if (u.origin === self.location.origin) e.respondWith(networkFirst(req));
});
