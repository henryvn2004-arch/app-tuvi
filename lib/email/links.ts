// lib/email/links.ts
// ============================================================
// Link trong thư phải trỏ đúng ngôn ngữ của NGƯỜI NHẬN (i18n W18).
//
// Mẫu thư dựng sẵn (`lib/email/i18n.ts`) đã gọi `siteUrl(locale, …)`, nhưng còn những link mẫu
// không quản: thư quảng bá do admin soạn (`email_broadcast_queue.html`), `viewUrl` do route ghép,
// và mọi link sau này ai đó quên `siteUrl`. Nên `send.ts` (cửa DUY NHẤT gọi Resend) chạy hàm này
// trên MỌI thư có `locale` — một chỗ, không phụ thuộc nơi gọi nhớ.
//
// Chỉ đổi link TRANG của chính site; để nguyên: link đã có tiền tố ngôn ngữ, `/api/…` (link huỷ
// đăng ký — HMAC ký trên email, không trên đường dẫn, và `/api` không qua proxy i18n), `/_next/`,
// file tĩnh có đuôi (ảnh/pdf…, trừ `.html` — cùng luật matcher của `proxy.ts`), link ngoài site.
// `vi` (hoặc thiếu `locale`) ⇒ trả NGUYÊN chuỗi.
// ============================================================
import { isLocale, type Locale } from '@/lib/i18n/locales';

const SITE_LINK = /(href\s*=\s*)(["'])(https?:\/\/(?:www\.)?tuviminhbao\.com)(\/[^"'#?]*)?([?#][^"']*)?\2/gi;

/** Đường dẫn (không query/hash) này có nên mang tiền tố ngôn ngữ không. */
export function isLocalizablePath(path: string): boolean {
  const seg = path.split('/')[1] || '';
  if (isLocale(seg)) return false; // đã có tiền tố (kể cả /vi — proxy tự 308)
  if (seg === 'api' || seg === '_next' || seg === 'i18n-render') return false;
  const last = path.split('/').pop() || '';
  return !/\.[A-Za-z0-9]+$/.test(last) || /\.html$/i.test(last);
}

export function localizeSiteLinks(html: string, locale: Locale | undefined): string {
  if (!locale || locale === 'vi') return html;
  return html.replace(SITE_LINK, (all, pre: string, q: string, origin: string, path = '', tail = '') => {
    const p = path || '/';
    if (!isLocalizablePath(p)) return all;
    return `${pre}${q}${origin}/${locale}${p === '/' ? '' : p}${tail}${q}`;
  });
}
