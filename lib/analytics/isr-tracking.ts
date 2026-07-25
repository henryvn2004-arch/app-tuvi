// lib/analytics/isr-tracking.ts
// ============================================================
// Snippet GA4 + track.js dùng cho các trang ISR KHÔNG load nav.js (nav.js tự
// bơm GA4 sẵn cho mọi trang có chrome — nhưng vài trang share/kết-quả
// (ket-qua, luan-duong, shared-chat) cố ý bỏ nav bar để giữ layout branded
// độc lập, nên GA4 phải nạp trực tiếp). Cùng Measurement ID với nav.js
// (public/nav.js) — sửa 1 chỗ nếu đổi ID.
// ============================================================

export const GA4_TRACK_SNIPPET =
  '<script src="/track.js?v=1" defer></script>' +
  "<script>(function(){if(!document.getElementById('gtag-js')){" +
  "var ga=document.createElement('script');ga.id='gtag-js';ga.async=true;" +
  "ga.src='https://www.googletagmanager.com/gtag/js?id=G-F4XNRS2XT0';document.head.appendChild(ga);" +
  "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;" +
  "gtag('js',new Date());gtag('config','G-F4XNRS2XT0');}})();</script>";
