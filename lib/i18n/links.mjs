// lib/i18n/links.mjs — phần THUẦN của URL/hreflang, không import gì (proxy.ts
// nạp file này nên phải nhẹ). render.mjs re-export lại.

/** Chuẩn hoá đường dẫn trang: bỏ query/hash, bỏ `/` cuối (trừ gốc). */
export function normPath(p) {
  let s = String(p).split('#')[0].split('?')[0];
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

const LANGS = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'];
export const SITE_BASE = 'https://www.tuviminhbao.com';

export const HREFLANG = {
  vi: 'vi',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  'zh-tw': 'zh-Hant-TW',
  'zh-cn': 'zh-Hans-CN',
};
export function urlFor(locale, p) {
  const n = normPath(p);
  const pre = locale === 'vi' ? '' : `/${locale}`;
  return SITE_BASE + pre + (n === '/' ? '' : n);
}

/** Đường dẫn tương đối (không host) cho alts trong trang. */
export function relFor(locale, p) {
  const n = normPath(p);
  const pre = locale === 'vi' ? '' : `/${locale}`;
  return pre + (n === '/' ? '' : n) || '/';
}

/** Header `Link` hreflang cho bản vi (HTML tĩnh không chèn được thẻ). */
export function linkHeaderForVi(p, locales) {
  if (!locales || !locales.length) return '';
  const parts = [`<${urlFor('vi', p)}>; rel="alternate"; hreflang="vi"`];
  for (const l of LANGS)
    if (locales.includes(l))
      parts.push(`<${urlFor(l, p)}>; rel="alternate"; hreflang="${HREFLANG[l]}"`);
  parts.push(`<${urlFor('vi', p)}>; rel="alternate"; hreflang="x-default"`);
  return parts.join(', ');
}
