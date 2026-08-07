// Service Worker — Tử Vi Minh Bảo
// Strategy: cache-first for static assets, network-first for HTML/API
const CACHE_VERSION = 'tuvi-v5';
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

// ── WEB PUSH ────────────────────────────────────────────────────────────────
// 🔴 Vì sao hai handler này phải có: từ trước tới nay file này KHÔNG có handler
// `push` nào. Mà `pushManager.subscribe` bên `pwa-push.js` khai
// `userVisibleOnly: true` — tức đã hứa với trình duyệt rằng MỖI lượt push sẽ
// hiện ra một thông báo cho người dùng thấy. Không có handler thì lời hứa đó bị
// vi phạm, và Chrome tự bù bằng thông báo mặc định của NÓ: "Trang này đã được
// cập nhật ở chế độ nền" — vô nghĩa, chạm vào không đi đâu cả.
//
// Nên suốt hai tháng qua kênh nhắc vẫn chạy "thành công" trên giấy tờ (edge
// function báo sent=2, cột `last_sent` cập nhật mỗi sáng) trong khi thứ tới
// được màn hình người dùng là một câu của trình duyệt. Bài học: "gửi xong" và
// "hiện được" là HAI việc, log của bên gửi không chứng minh được vế thứ hai.
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (err) {
    // Payload không phải JSON (bản gửi cũ, hoặc push rỗng do trình duyệt tự
    // đánh thức). Vẫn PHẢI hiện một cái gì đó — im lặng ở đây là quay lại đúng
    // thông báo mặc định vô nghĩa của trình duyệt.
    d = { body: (e.data && e.data.text()) || '' };
  }
  const title = d.title || 'Tử Vi Minh Bảo';
  const url = d.url || '/app';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || 'Xem vận hôm nay của bạn.',
      icon: d.icon || '/seal.webp',
      badge: d.badge || '/seal.webp',
      lang: 'vi',
      // `tag` cố định = lượt sau THAY THẾ lượt trước thay vì xếp chồng. Nhắc
      // hằng ngày mà để dồn 7 thông báo trên màn hình khoá là cách nhanh nhất
      // bị tắt vĩnh viễn. `renotify` false → thay lặng lẽ, không rung lại.
      tag: d.tag || 'van-ngay',
      renotify: false,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/app';
  const target = new URL(url, self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Đã có tab của site đang mở → ĐIỀU HƯỚNG tab đó rồi focus, đừng mở tab
      // thứ hai. Người dùng bấm thông báo mỗi sáng mà mỗi lần đẻ một tab mới là
      // sau một tuần có bảy tab cùng một trang.
      for (const c of list) {
        if (c.url.indexOf(self.location.origin) === 0) {
          if ('navigate' in c) return c.navigate(target).then((w) => (w && w.focus ? w.focus() : null));
          if ('focus' in c) return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
