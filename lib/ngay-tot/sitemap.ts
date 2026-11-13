// lib/ngay-tot/sitemap.ts — mục sitemap của `/ngay-tot/**` đủ 6 ngôn ngữ (W33b).
// Mỗi URL ngôn ngữ có `<url>` RIÊNG kèm đủ `xhtml:link` (cả chính nó + x-default→vi) — đúng khuôn Google đòi cho hreflang
// trong sitemap. Đường dẫn vào đây KHÔNG có tiền tố; bản dịch phục vụ bởi app/ngay-tot-i18n (proxy.ts bóc tiền tố).
import { HREFLANG, LOCALES, localePrefix, type Locale } from '@/lib/i18n/locales';
import { lastmodLine } from '@/lib/seo/lastmod';
import { BASE } from './dich';

export const URLSET_OPEN =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

const loc = (l: Locale, path: string) => `${BASE}${localePrefix(l)}${path}`;

export function urlEntries(path: string, lastmod?: string | null): string[] {
  const alts =
    LOCALES.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${loc(l, path)}"/>`,
    ).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc('vi', path)}"/>`;
  return LOCALES.map(
    (l) => `  <url>
    <loc>${loc(l, path)}</loc>${lastmodLine(lastmod)}
${alts}
  </url>`,
  );
}
