// lib/i18n/self-managed.mjs — route TỰ CHỊU TRÁCH NHIỆM dịch + SEO (một chỗ duy nhất).
// Route trong danh sách này tự render đúng ngôn ngữ (từ DB) và tự xuất robots/canonical/hreflang
// theo từng bản ghi (bản chưa dịch → 404). Với `/<locale>/<prefix>…` proxy.ts vẫn bóc tiền tố và
// gắn `x-tvmb-locale`, rồi rewrite THẲNG tới route đó — KHÔNG qua app/i18n-render, KHÔNG gắn
// noindex/X-Robots-Tag. Route đọc ngôn ngữ bằng localeFromHeaders(). Các prefix này KHÔNG nằm
// trong i18n/availability.json (check:i18n bỏ qua và cấm đăng ký chồng).
// Thêm route kiểu này: thêm prefix vào đây + ghi ở docs/i18n/QUY-UOC.md.
export const SELF_MANAGED_PREFIXES = ['/nghiem-chung', '/xac-dinh-gio-sinh'];

export function isSelfManaged(p) {
  return SELF_MANAGED_PREFIXES.some((x) => p === x || p.startsWith(x + '/'));
}

// ── Route SSR ĐÃ DỊCH, phục vụ bởi cây nội bộ riêng (W33b `/ngay-tot`) ────────────────────────
// Khác `SELF_MANAGED_PREFIXES` (một route đọc header, `force-dynamic`): ở đây ngôn ngữ nằm TRONG đường dẫn nội bộ
// (`/ja/ngay-tot/lich/2026` → `/ngay-tot-i18n/ja/lich/2026`) nên route bản dịch vẫn tĩnh/ISR, và route vi không đổi.
// Route tự xuất canonical/hreflang/noindex; KHÔNG nằm trong availability.json (như self-managed). Thêm route kiểu này:
// thêm vào đây + ghi docs/i18n/QUY-UOC.md. Dưới đây là CHỖ DUY NHẤT proxy.ts và render.mjs (đổi link tĩnh) cùng đọc.
export const LOCALIZED_SSR = { '/ngay-tot': '/ngay-tot-i18n' };

export function localizedSsrPrefix(p) {
  return Object.keys(LOCALIZED_SSR).find((x) => p === x || p.startsWith(x + '/')) || null;
}

/** Đích rewrite nội bộ cho `/<locale><rest>`, hoặc null nếu `rest` không thuộc route SSR đã dịch. */
export function localizedSsrTarget(locale, rest) {
  const x = localizedSsrPrefix(rest);
  return x ? `${LOCALIZED_SSR[x]}/${locale}${rest.slice(x.length)}` : null;
}
