// lib/i18n/render.mjs — dựng HTML đã dịch cho `/<locale>/<đường dẫn>`.
// Hàm THUẦN (không đọc đĩa, không fetch) để route Next và bộ dò check:i18n
// chạy ĐÚNG MỘT bản — bộ dò mô phỏng chính thứ prod trả ra.

import { translateHtml, rewriteAnchors } from './core.mjs';
import { normPath } from './links.mjs';
import { singleLocaleOf } from './single-locale.mjs';
import { localizedSsrPrefix } from './self-managed.mjs';
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
export const CLIENT_V = '10';
/** `?v=` của /tools-shared/glossary.js (W15) — server chèn ở trang có chữ JS mềm; khớp thẻ tĩnh (check:i18n). */
export const GLOSSARY_V = '5';

/**
 * Namespace chữ-JS "MỀM" (W13): nhúng vào trang để JS có bản dịch ngay lúc dựng, nhưng
 * KHÔNG tính vào độ đủ của trang — chữ trong modal/tường trả phí/trang nạp không phải thứ
 * crawler đọc; tính vào thì mọi trang đang index ở /ja… rơi về noindex tới khi dịch xong.
 * shell.js tự nạp tuvi-paywall.js/auth.js/tool-prices.js ⇒ có một trong bốn là nhúng cả bốn.
 * `tuviform`/`noisinh` (W26): widget dùng chung `tuvi-form.js` + `tools-shared/noi-sinh.js` — shell.js nạp lười chúng,
 * nên đi cùng nhóm; trang chỉ nạp thẻ `tuvi-form.js` (không shell.js) cũng nhận.
 * W26b: `hooklayer` (hook-layer.js) · `loading` (ai-loading-steps.js) · `cns` (cung-ngay-sinh.js) · `samplehint` · `lasochart` (laso-chart.js) · `toolsrc` (tool-sources.js, shell.js nạp lười).
 * W27: `thay`/`tool`/`goi` = chữ đọc từ DB (DB_NS, xem dưới) — sidebar/thẻ công cụ/rail/trang nạp đều vẽ chúng.
 * W31: `nhom` = tool_groups.title (`js.nhom.<key>`) / subtitle (`js.nhom.<key>.sub`) — sidebar, /app/cong-cu, /cong-cu.
 */
export const SOFT_NS = [
  'shellui',
  'paywall',
  'auth',
  'prices',
  'tuviform',
  'noisinh',
  'hooklayer',
  'loading',
  'cns',
  'samplehint',
  'lasochart',
  'toolsrc',
  'thay',
  'tool',
  'tool-desc',
  'tool-q',
  'goi',
  'nhom',
];
/**
 * Namespace CHỈ nhúng ở trang thật sự vẽ chúng (W29): `tool-desc`/`tool-q` ~25 KB, chỉ `/cong-cu` + `topup.html` đọc.
 * Không đi theo nhóm shell (mọi trang shell sẽ gánh thêm 25 KB HTML ⇒ LCP/TBT). Trang tự khai bằng chuỗi `js.<ns>.`
 * nguyên văn trong HTML (vd `I18n.db('js.tool-desc.' + id, …)`), `detectSoftNamespaces` nhận theo đó.
 */
export const ON_DEMAND_NS = ['tool-desc', 'tool-q'];
/**
 * Namespace mà câu gốc là CHỮ TRONG DB (W27): `js.thay.*` (master_profiles.discipline/tagline/greeting),
 * `js.tool.<tool_id>` (tool_pricing.label), `js.tool-desc.<tool_id>` / `js.tool-q.<tool_id>` (description / question, W29), `js.goi.<package_id>` (credit_packages.label). Server nhúng kèm câu
 * gốc tiếng Việt (`src`) để `I18n.db(khoá, chữDB)` chỉ dịch khi chữ DB còn trùng câu gốc — Admin sửa nhãn ở DB
 * thì khách thấy nhãn mới (tiếng Việt) thay vì bản dịch của nhãn cũ. Không sửa DB, không chép số giá.
 */
export const DB_NS = ['thay', 'tool', 'tool-desc', 'tool-q', 'goi', 'nhom'];
export function detectSoftNamespaces(html) {
  const ns = [];
  if (
    /<script[^>]+src=["']\/(?:shell|tuvi-paywall|auth|tool-prices|tuvi-form|laso-chart|tool-sources|tools-shared\/(?:hook-layer|ai-loading-steps|cung-ngay-sinh|sample-hint))\.js/i.test(
      html
    )
  )
    ns.push(...SOFT_NS.filter((n) => !ON_DEMAND_NS.includes(n)));
  // nav.js ĐẦY ĐỦ tự chèn auth.js bằng JS (nút "Đăng nhập", modal) — không có thẻ <script> nên trước W27 trang chỉ
  // nạp nav.js (about…) hiện "Đăng nhập" tiếng Việt ở /ja. Chỉ nhúng `auth` (không kéo cả nhóm shellui ~900 khoá).
  if (detectJsNamespaces(html).includes('nav') && !ns.includes('auth')) ns.push('auth');
  for (const n of ON_DEMAND_NS) if (html.includes(`'js.${n}.`) && !ns.includes(n)) ns.push(n);
  // account-core.js (Hồ sơ /app/tai-khoan) dựng chữ qua js.taikhoan — file .js ngoài không được quét ⇒ nhận theo thẻ <script>.
  if (/<script[^>]+src=["']\/account-core\.js/i.test(html) && !ns.includes('taikhoan'))
    ns.push('taikhoan');
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

/** `{src:{khoá: câu Việt}}` cho khoá DB_NS của trang (rỗng ⇒ không thêm trường — trang không vẽ chữ DB giữ nguyên JSON cũ). */
function dbSrc(vi, softNs) {
  const ns = DB_NS.filter((n) => softNs.includes(n));
  if (!ns.length) return {};
  return { src: Object.fromEntries(jsKeys(vi, ns).map((k) => [k, vi[k]])) };
}

// ── JSON-LD (W27) ────────────────────────────────────────────────────────────
// translateHtml không đụng <script> ⇒ trước W27 FAQ/HowTo/WebPage JSON-LD ở /ja… còn nguyên tiếng Việt + inLanguage "vi"
// (Google đòi dữ liệu cấu trúc khớp chữ hiển thị). Mỗi CHUỖI trong JSON-LD tra theo KHỚP NGUYÊN VĂN với câu gốc vi.json —
// ưu tiên khoá `ld.<trang>.*` (câu gốc = đúng chuỗi JSON-LD, dịch bám chữ hiển thị đã dịch), rồi tới khoá bất kỳ có
// cùng câu (câu hỏi FAQ trùng tiêu đề hiển thị). `inLanguage: "vi"` → hreflang của trang. Chuỗi không khớp giữ nguyên và
// được trả về `ldMissing` để check:i18n bắt ở trang đã khai dịch đủ.
const LD_INDEX = new WeakMap();
function ldIndex(vi) {
  let m = LD_INDEX.get(vi);
  if (m) return m;
  m = new Map();
  const keys = Object.keys(vi);
  for (const k of keys)
    if (k.startsWith('ld.') && typeof vi[k] === 'string' && !m.has(vi[k])) m.set(vi[k], k);
  for (const k of keys) if (typeof vi[k] === 'string' && !m.has(vi[k])) m.set(vi[k], k);
  LD_INDEX.set(vi, m);
  return m;
}
const VI_MARK = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
export function translateJsonLd(html, locale, vi, get, p) {
  const idx = ldIndex(vi);
  // `url`/`item` trỏ CHÍNH trang (kể cả dạng `/about.html` của `/about`) → bản ngôn ngữ, khớp canonical. Trang khác giữ nguyên.
  const self = p ? normPath(p) : null;
  const isSelf = (u) => {
    try {
      const x = new URL(u);
      const bare = (q) => normPath(q).replace(/\.html$/, '');
      return (
        x.origin === new URL(urlFor('vi', '/')).origin &&
        bare(x.pathname) === bare(self) &&
        !x.search
      );
    } catch {
      return false;
    }
  };
  const missing = [];
  // Organization/WebSite là thực thể của CẢ site: `url` gốc giữ nguyên ở mọi ngôn ngữ.
  const SITE_WIDE = new Set(['Organization', 'WebSite', 'ImageObject']);
  const walk = (o, key, ptype) => {
    if (Array.isArray(o)) return o.map((x) => walk(x, key, ptype));
    if (o && typeof o === 'object') {
      const r = {};
      for (const [k, v] of Object.entries(o))
        r[k] = k === 'inLanguage' && v === 'vi' ? HREFLANG[locale] : walk(v, k, o['@type']);
      return r;
    }
    if (
      typeof o === 'string' &&
      (key === 'url' || key === 'item') &&
      self &&
      !SITE_WIDE.has(ptype) &&
      isSelf(o)
    )
      return urlFor(locale, p);
    if (typeof o !== 'string' || key === '@id' || key === '@type' || /^https?:\/\//.test(o))
      return o;
    const k = idx.get(o);
    const t = k && get(k);
    if (t !== undefined) return t;
    if (VI_MARK.test(o)) missing.push(o);
    return o;
  };
  const out = html.replace(
    /(<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (all, open, body, close) => {
      let j;
      try {
        j = JSON.parse(body);
      } catch {
        return all; // JSON hỏng: để nguyên (không sinh thêm lỗi ở bản dịch)
      }
      return (
        open +
        '\n' +
        JSON.stringify(walk(j, '', null), null, 2).replace(/</g, '\\u003c') +
        '\n' +
        close
      );
    }
  );
  return { html: out, missing };
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
 * @param {boolean} [o.selfComplete] route TỰ QUẢN (lib/i18n/self-managed.mjs) tự dịch nội dung theo từng bản ghi:
 *   cờ này THAY phần "khoá data-i18n của trang" khi xét đủ/thiếu; khoá JS của khung (nav…) vẫn phải đủ.
 * @returns {{ html:string, complete:boolean, missing:string[], ldMissing:string[] }}
 */
export function renderLocalized({ html, locale, path, vi, dict, avail, selfComplete }) {
  const p = normPath(path);
  const get = (k) => {
    const e = dict[k];
    return e && typeof e.t === 'string' && e.t ? e.t : undefined;
  };
  const tr0 = translateHtml(html, get);
  const ld = translateJsonLd(tr0.html, locale, vi, get, p);
  const tr = { ...tr0, html: ld.html };
  const ns = detectJsNamespaces(html);
  const js = jsKeys(vi, ns);
  const jsMissing = js.filter((k) => get(k) === undefined);
  const missing = [...tr.missing, ...jsMissing];
  const complete =
    selfComplete === undefined
      ? tr.used.size > 0 && missing.length === 0
      : selfComplete === true && missing.length === 0;

  // Link nội bộ → bản dịch của trang đích, CHỈ khi trang đích đã dịch đủ.
  let out = rewriteAnchors(tr.html, (href) => {
    if (!href.startsWith('/') || href.startsWith('//')) return undefined;
    const m = /^([^?#]*)(.*)$/.exec(href);
    const tp = normPath(m[1]);
    const only = singleLocaleOf(tp); // trang chỉ một ngôn ngữ: link thẳng tới bản có tiền tố
    if (only) return relFor(only, tp) + m[2];
    // Route SSR đã dịch đủ 5 ngôn ngữ (self-managed.mjs `LOCALIZED_SSR`, vd /ngay-tot): link thẳng tới bản dịch.
    if (localizedSsrPrefix(tp)) return relFor(locale, tp) + m[2];
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
      ...dbSrc(vi, detectSoftNamespaces(html)),
    }).replace(/</g, '\\u003c')}</script>`
  );
  if (!/<script[^>]+src=["']\/i18n\.js/i.test(out))
    headBits.push(`<script src="/i18n.js?v=${ASSET_V}"></script>`);
  // window.I18n đọc từ điển trên ngay lúc chạy ⇒ phải đứng TRƯỚC shell.js/auth.js/… (đồng bộ).
  headBits.push(`<script src="/tools-shared/i18n.js?v=${CLIENT_V}"></script>`);
  // Tên sao/cung/can chi do ENGINE trả ra, chèn vào câu đã dịch ("giờ {chi}") ⇒ hiển thị qua TuviGlossary
  // (W15). Trang shell/tường trả phí chưa tự nạp glossary thì chèn — sau i18n.js vì nó đọc I18n.locale.
  // (`auth` một mình = trang chỉ nạp nav.js đầy đủ: không cần glossary.)
  if (
    detectSoftNamespaces(html).some((n) => n !== 'auth') &&
    !/tools-shared\/glossary\.js/i.test(out)
  )
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
  return { html: out, complete, missing, ldMissing: ld.missing };
}

function alts(p, present) {
  const o = { vi: relFor('vi', p) };
  for (const l of TRANSLATED) if (present.has(l)) o[l] = relFor(l, p);
  return o;
}
