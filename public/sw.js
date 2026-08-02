// Service Worker — Tử Vi Minh Bảo
// Strategy: cache-first for static assets, network-first for HTML/API
const CACHE_VERSION = 'tuvi-v4';
const STATIC_CACHE = CACHE_VERSION + '-static';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/manifest.json',
  '/seal.webp',
  '/seal.png',
  '/offline.html',
];

// Static asset extensions
const STATIC_EXTS = /\.(css|js|woff2?|ttf|otf|webp|png|jpg|jpeg|svg|ico)(\?.*)?$/;

// Cache-first is safe ONLY for URLs that change name when their content
// changes — tức là các asset mang `?v=N` (quy ước bump version của repo).
//
// 🐞 Vì sao có luật này: `caches.match` khớp theo URL ĐẦY ĐỦ và cache ở đây
// KHÔNG có hạn. Nên một file phát hành lại dưới ĐÚNG tên cũ (`/tuvi-paywall.js`
// không có `?v=`) bị đóng băng VĨNH VIỄN ở bản mà trình duyệt gặp lần đầu —
// header `max-age=0, must-revalidate` của server không cứu được, vì SW chặn
// trước cả tầng HTTP cache. Đó là cách `requireCreditsCached` (#338) không bao
// giờ tới được người dùng cũ, và nút "Xem Tiền Kiếp" chết lặng (TypeError).
// File KHÔNG có version → network-first, cache chỉ còn là bản dự phòng offline.
const VERSIONED = /[?&]v=/;

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

  // Static assets
  if (STATIC_EXTS.test(url.pathname)) {
    const store = (res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    };

    // Có `?v=` → tên đổi theo nội dung, cache-first vô hạn là đúng.
    if (VERSIONED.test(url.search)) {
      e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(store)));
      return;
    }

    // Không version → network-first. Mạng chết mới lấy bản cache (giữ offline).
    e.respondWith(fetch(e.request).then(store).catch(() => caches.match(e.request)));
    return;
  }

  // HTML & dynamic pages: network-first, fallback to offline page
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL))
    )
  );
});
