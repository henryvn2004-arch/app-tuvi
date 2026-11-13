// lib/i18n/vi-only.mjs — route SSR công khai CHỈ có tiếng Việt (Henry chốt 2026-11-13, W31b).
// Bản `/<locale>/…` của chúng vẫn được phục vụ (noindex, không hreflang/sitemap — vì không nằm trong
// availability.json), nhưng link do JS dựng từ trang đã dịch (`I18n.href`) phải trỏ về bản vi thay vì
// đưa khách sang một trang tiếng Việt mang tiền tố ngôn ngữ. Link trong HTML tĩnh đã đúng sẵn
// (`renderLocalized` chỉ đổi link khi trang đích đã dịch đủ).
// Mục kết thúc bằng '/' = CHỈ trang con (`/menh-kho` là trang tĩnh ĐÃ dịch; trang con là SSR).
// `/la-so/<slug>` KHÔNG ở đây (W33a): route tự quản, tự dịch theo từng bản ghi (lib/i18n/self-managed.mjs).
// Bản sao ở `public/tools-shared/i18n.js` (VI_ONLY) — check:i18n soi hai bản khớp nhau và không mục
// nào đè lên trang đã dịch.
export const VI_ONLY_PREFIXES = [
  '/van-dap',
  '/thu-vien',
  '/tu-dien',
  '/tac-gia',
  '/bao-chi',
  '/nghien-cuu',
  '/xem-ngay-hom-nay',
  '/ngay-tot',
  '/kim-lau',
  '/menh-kho/',
  '/van-han',
  '/tu-vi',
  '/du-lieu',
  '/xong-dat',
];

export function isViOnly(p) {
  return VI_ONLY_PREFIXES.some((x) =>
    x.endsWith('/') ? p.startsWith(x) && p.length > x.length : p === x || p.startsWith(x + '/')
  );
}
