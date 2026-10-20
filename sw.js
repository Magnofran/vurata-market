/* Vurata Market service worker: opens fast and keeps working on weak signal. Never touches Supabase. */
const VERSION = '20261020144753';
const CORE = `vm-core-${VERSION}`;
const RUNTIME = 'vm-runtime';
const SHELL = ['./', 'index.html', 'shim.js', 'vendor/supabase.js', 'favicon.png', 'manifest.webmanifest', 'assets/wordmark-light.svg', 'assets/wordmark-dark.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('vm-core-') && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const fromNetworkFirst = async (req, ms) => {
  const cache = await caches.open(CORE);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), ms))]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html')) || Response.error();
  }
};
const staleWhileRevalidate = async req => {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
};

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;
  if (req.mode === 'navigate') { e.respondWith(fromNetworkFirst(req, 3500)); return; }
  if (url.origin === location.origin) { e.respondWith(/(\.(svg|png|webmanifest)$|^\/photos\/.*\.jpg$)/.test(url.pathname) ? staleWhileRevalidate(req) : fromNetworkFirst(req, 3500)); return; }
  if (/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});
