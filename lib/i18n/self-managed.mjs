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
