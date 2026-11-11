// lib/i18n/render.mjs — dựng HTML đã dịch cho `/<locale>/<đường dẫn>`.
// Hàm THUẦN (không đọc đĩa, không fetch) để route Next và bộ dò check:i18n
// chạy ĐÚNG MỘT bản — bộ dò mô phỏng chính thứ prod trả ra.

import { translateHtml, rewriteAnchors } from './core.mjs';
import { normPath } from './links.mjs';
import { singleLocaleOf } from './single-locale.mjs';
import { jsKeys, TRANSLATED } from './dict.mjs';
import { HREFLANG, urlFor, relFor } from './links.mjs';
export { SITE_BASE, urlFor, relFor, linkHeaderForVi } from './links.mjs';

const OG_LOCALE = {
  vi: 'vi_VN',
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  'zh-tw': 'zh_TW',
  'zh-cn': 'zh_CN',
};
const CJK = new Set(['ja', 'ko', 'zh-tw', 'zh-cn']);
/** Bump khi đổi nội dung /fonts/i18n-*.css hay /i18n.js — chống cache cũ. */
export const ASSET_V = '3';
/** `?v=` của /tools-shared/i18n.js (window.I18n) — phải KHỚP mọi <script src> tĩnh của file đó (check:i18n soi). */
export const CLIENT_V = '3';
/** `?v=` của /tools-shared/glossary.js (W15) — server chèn ở trang có chữ JS mềm; khớp thẻ tĩnh (check:i18n). */
export const GLOSSARY_V = '3';

/**
 * Namespace chữ-JS "MỀM" (W13): nhúng vào trang để JS có bản dịch ngay lúc dựng, nhưng
 * KHÔNG tính vào độ đủ của trang — chữ trong modal/tường trả phí/trang nạp không phải thứ
 * crawler đọc; tính vào thì mọi trang đang index ở /ja… rơi về noindex tới khi dịch xong.
 * shell.js tự nạp tuvi-paywall.js/auth.js/tool-prices.js ⇒ có một trong bốn là nhúng cả bốn.
 */
export const SOFT_NS = ['shellui', 'paywall', 'auth', 'prices'];
export function detectSoftNamespaces(html) {
  const ns = [];
  if (/<script[^>]+src=["']\/(?:shell|tuvi-paywall|auth|tool-prices)\.js/i.test(html))
    ns.push(...SOFT_NS);
  // Chữ JS nội tuyến của chính trang (vd topup.html: _tvmbT('js.topup.…')).
  for (const m of html.matchAll(/\b(?:T|_tvmbT)\(\s*'js\.([\w-]+)\./g))
    if (!ns.includes(m[1]) && m[1] !== 'shell' && m[1] !== 'nav') ns.push(m[1]);
  return ns;
}

/** Namespace chữ-JS mà một trang nạp (shell.js dựng sidebar/tabbar bằng JS). */
export function detectJsNamespaces(html) {
  const ns = [];
  if (/<script[^>]+src=["']\/shell\.js/i.test(html)) ns.push('shell');
  // nav.js ở chế độ ĐẦY ĐỦ dựng thanh trên + chân trang bằng JS; `data-icons-only` thì chỉ nạp icon.
  const nav = /<script\b[^>]*\bsrc=["']\/nav\.js[^>]*>/i.exec(html);
  if (nav && !/data-icons-only/i.test(nav[0])) ns.push('nav');
  return ns;
}

function stripHead(html) {
  return html
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=[^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*\bhreflang=[^>]*\brel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*\bproperty=["']og:(?:url|locale)["'][^>]*>\s*/gi, '');
}

/**
 * @param {object} o
 * @param {string} o.html       HTML gốc tiếng Việt (đã qua rewrites)
 * @param {string} o.locale     ngôn ngữ đích (≠ vi)
 * @param {string} o.path       đường dẫn KHÔNG tiền tố, vd "/app/bat-tu"
 * @param {object} o.vi         vi.json
 * @param {object} o.dict       <locale>.json
 * @param {object} o.avail      availability.json
 * @returns {{ html:string, complete:boolean, missing:string[] }}
 */
export function renderLocalized({ html, locale, path, vi, dict, avail }) {
  const p = normPath(path);
  const get = (k) => {
    const e = dict[k];
    return e && typeof e.t === 'string' && e.t ? e.t : undefined;
  };
  const tr = translateHtml(html, get);
  const ns = detectJsNamespaces(html);
  const js = jsKeys(vi, ns);
  const jsMissing = js.filter((k) => get(k) === undefined);
  const missing = [...tr.missing, ...jsMissing];
  const complete = tr.used.size > 0 && missing.length === 0;

  // Link nội bộ → bản dịch của trang đích, CHỈ khi trang đích đã dịch đủ.
  let out = rewriteAnchors(tr.html, (href) => {
    if (!href.startsWith('/') || href.startsWith('//')) return undefined;
    const m = /^([^?#]*)(.*)$/.exec(href);
    const tp = normPath(m[1]);
    const only = singleLocaleOf(tp); // trang chỉ một ngôn ngữ: link thẳng tới bản có tiền tố
    if (only) return relFor(only, tp) + m[2];
    if (!(avail[tp] || []).includes(locale)) return undefined;
    return relFor(locale, tp) + m[2];
  });

  out = out.replace(/<html\b([^>]*)>/i, (_m, a) => {
    const rest = a.replace(/\slang=("[^"]*"|'[^']*'|[^\s>]+)/i, '');
    return `<html${rest} lang="${HREFLANG[locale]}">`;
  });
  out = stripHead(out);

  // Bản dịch của trang này (gồm CHÍNH nó nếu đủ) + vi + x-default.
  const present = new Set(avail[p] || []);
  if (complete) present.add(locale);
  else present.delete(locale);

  const headBits = [];
  headBits.push(
    `<script id="tvmb-i18n" type="application/json">${JSON.stringify({
      locale,
      dict: Object.fromEntries(
        js
          .concat(jsKeys(vi, ['common', ...detectSoftNamespaces(html)]))
          .map((k) => [k, get(k)])
          .filter((e) => e[1] !== undefined)
      ),
      alts: complete ? alts(p, present) : {},
    }).replace(/</g, '\\u003c')}</script>`
  );
  if (!/<script[^>]+src=["']\/i18n\.js/i.test(out))
    headBits.push(`<script src="/i18n.js?v=${ASSET_V}"></script>`);
  // window.I18n đọc từ điển trên ngay lúc chạy ⇒ phải đứng TRƯỚC shell.js/auth.js/… (đồng bộ).
  headBits.push(`<script src="/tools-shared/i18n.js?v=${CLIENT_V}"></script>`);
  // Tên sao/cung/can chi do ENGINE trả ra, chèn vào câu đã dịch ("giờ {chi}") ⇒ hiển thị qua TuviGlossary
  // (W15). Trang shell/tường trả phí chưa tự nạp glossary thì chèn — sau i18n.js vì nó đọc I18n.locale.
  if (detectSoftNamespaces(html).length && !/tools-shared\/glossary\.js/i.test(out))
    headBits.push(`<script src="/tools-shared/glossary.js?v=${GLOSSARY_V}"></script>`);
  if (CJK.has(locale))
    headBits.push(`<link rel="stylesheet" href="/fonts/i18n-${locale}.css?v=${ASSET_V}">`);
  if (complete) {
    headBits.push(`<link rel="canonical" href="${urlFor(locale, p)}">`);
    headBits.push(`<meta property="og:url" content="${urlFor(locale, p)}">`);
    headBits.push(`<meta property="og:locale" content="${OG_LOCALE[locale]}">`);
    for (const l of ['vi', ...TRANSLATED.filter((x) => present.has(x))]) {
      headBits.push(`<link rel="alternate" hreflang="${HREFLANG[l]}" href="${urlFor(l, p)}">`);
    }
    headBits.push(`<link rel="alternate" hreflang="x-default" href="${urlFor('vi', p)}">`);
  } else {
    // Chưa dịch đủ: KHÔNG để crawler thấy chữ Việt dưới URL ngoại ngữ.
    headBits.push('<meta name="robots" content="noindex, follow">');
  }
  const inject = '\n' + headBits.join('\n') + '\n';
  out = /<head\b[^>]*>/i.test(out)
    ? out.replace(/<head\b[^>]*>/i, (m) => m + inject)
    : inject + out;
  return { html: out, complete, missing };
}

function alts(p, present) {
  const o = { vi: relFor('vi', p) };
  for (const l of TRANSLATED) if (present.has(l)) o[l] = relFor(l, p);
  return o;
}
