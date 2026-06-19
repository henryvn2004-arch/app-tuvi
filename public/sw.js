// Service Worker — Tử Vi Minh Bảo
// Strategy: cache-first for static assets, network-first for HTML/API
const CACHE_VERSION = 'tuvi-v2';
const STATIC_CACHE = CACHE_VERSION + '-static';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/manifest.json',
  '/seal.webp',
  '/seal.png',
  '/offline.html',
];

// Static asset extensions — cache-first
const STATIC_EXTS = /\.(css|js|woff2?|ttf|otf|webp|png|jpg|jpeg|svg|ico)(\?.*)?$/;

// Never cache — Supabase API, auth, payments
const NEVER_CACHE = /\/(auth|payment|api\/|rest\/v1\/|_next\/image)/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, cross-origin, and never-cache patterns
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.test(url.pathname)) return;

  // Static assets: cache-first
  if (STATIC_EXTS.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // HTML & dynamic pages: network-first, fallback to offline page
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL))
    )
  );
});
