// lib/ngay-tot/dich.ts — tầng dịch của route SSR `/ngay-tot` (W33b).
//
// Ba nguồn chữ, mỗi nguồn một việc (docs/i18n/QUY-UOC.md "Route SSR /ngay-tot"):
//   1. KHUNG trang (nhãn, tiêu đề, meta, og, JSON-LD)  → từ điển `i18n/<loc>.json`, khoá `ssr-ngay-tot.*`  (`ctx.t`).
//   2. VĂN ENGINE (tên việc, thần/sao hoàng-hắc đạo, thứ, khung giờ, khuôn lý do) → văn dài, ns `ngay-tot`,
//      file `public/tools-shared/i18n-long/<loc>/ngay-tot.js` (`ctx.long`). Engine vẫn trả chữ Việt + mã.
//   3. TÊN cổ pháp (trực, tú, can chi, chi giờ)         → glossary `lib/i18n/glossary` (`ctx.term`).
// Khoá tra bảng/truy vấn KHÔNG đi qua đây — chỉ chữ HIỂN THỊ. `vi` đi nguyên văn từng byte (không nạp gì).
// Hụt một khoá ở ngôn ngữ ≠ vi ⇒ trả chữ Việt + ghi `miss` ⇒ trang tự `noindex` (không để crawler thấy chữ Việt dưới URL ngoại ngữ).
import { jsKeys, loadLocale, loadVi } from '@/lib/i18n/dict.mjs';
import { ASSET_V, CLIENT_V, GLOSSARY_V } from '@/lib/i18n/render.mjs';
import { dungMau } from '@/lib/engine/khuon';
import { KHUNG } from './khung.mjs';
import { term as glossaryTerm, type GlossaryLocale } from '@/lib/i18n/glossary';
import { readLongNs } from '@/lib/i18n/long-server';
import { HREFLANG, LOCALES, localePrefix, type Locale } from '@/lib/i18n/locales';

export const BASE = 'https://www.tuviminhbao.com';

type Vars = Record<string, string | number>;
const fill = (s: string, vars?: Vars) =>
  vars ? dungMau(s, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]))) : s;

export type KhungKey = keyof typeof KHUNG;

export interface Ctx {
  locale: Locale;
  /** '' (vi) hoặc '/ja' … — tiền tố URL. */
  pre: string;
  /** Khung trang: câu gốc ở `khung.mjs`, bản dịch ở khoá `ssr-ngay-tot.<k>` của từ điển; thiếu ⇒ chữ Việt + `miss`. */
  t(k: KhungKey, vars?: Vars): string;
  /** Văn engine: khoá của ns `ngay-tot`; `vars` thay `{x}` ở cả hai bản (như `I18n.long`). */
  long(key: string, vi: string, vars?: Vars): string;
  /** Tên cổ pháp qua glossary (`truc` · `tu` · `canchi` · `chi`…); vi giữ nguyên. */
  term(kind: string, vi: string): string;
  /** Đường dẫn nội bộ theo ngôn ngữ trang: `/ngay-tot/x` → `/ja/ngay-tot/x`. */
  href(path: string): string;
  /** Khoá/mã hụt bản dịch (rỗng ⇒ trang đủ). */
  miss: Set<string>;
}

export function makeCtx(locale: Locale): Ctx {
  const miss = new Set<string>();
  const pre = localePrefix(locale);
  if (locale === 'vi') {
    return {
      locale,
      pre,
      miss,
      t: (k, vars) => fill(KHUNG[k], vars),
      long: (_k, vi, vars) => fill(vi, vars),
      term: (_kind, vi) => vi,
      href: (p) => p,
    };
  }
  const dict = loadLocale(locale) as Record<string, { t?: string }>;
  const long = readLongNs(locale, 'ngay-tot'); // đọc lười + nhớ; hụt file ⇒ null (+ console.error một lần)
  const g = locale as GlossaryLocale;
  return {
    locale,
    pre,
    miss,
    t(k, vars) {
      const e = dict[`ssr-ngay-tot.${k}`];
      if (e && typeof e.t === 'string' && e.t) return fill(e.t, vars);
      miss.add(k);
      return fill(KHUNG[k], vars);
    },
    long(key, vi, vars) {
      const e = long?.[key];
      if (e && typeof e.t === 'string' && e.t) return fill(e.t, vars);
      miss.add(`long:${key}`);
      return fill(vi, vars);
    },
    term(kind, vi) {
      return glossaryTerm(g, kind, vi);
    },
    href: (p) => pre + p,
  };
}

/** `<link rel="alternate">` đủ 6 bản + x-default→vi cho một đường dẫn KHÔNG tiền tố. */
export function alternatesHtml(path: string): string {
  const url = (l: Locale) => `${BASE}${localePrefix(l)}${path}`;
  return (
    LOCALES.map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${url(l)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${url('vi')}">\n`
  );
}

const CJK = new Set<Locale>(['ja', 'ko', 'zh-tw', 'zh-cn']);

/**
 * Khối `<head>` thêm cho bản ngoại ngữ (cùng khuôn `render.mjs`: từ điển nhúng, i18n.js, glossary, font CJK).
 * Trang chỉ nạp `auth.js` + `nav.js` — hai file này chỉ dựng chữ qua `js.auth.*`/`js.nav.*`, nên chỉ nhúng đúng hai ns
 * (nhúng cả nhóm shell = +1.600 khoá, ~80 KB/trang không ai đọc). Thêm script mới vào trang ⇒ thêm ns của nó ở đây.
 */
export function localeHead(locale: Locale, path: string): string {
  if (locale === 'vi') return '';
  const vi = loadVi() as Record<string, string>;
  const dict = loadLocale(locale) as Record<string, { t?: string }>;
  const ns = ['common', 'nav', 'auth'];
  const out: Record<string, string> = {};
  for (const k of jsKeys(vi, ns)) {
    const e = dict[k];
    if (e && typeof e.t === 'string' && e.t) out[k] = e.t;
  }
  const alts: Record<string, string> = {};
  for (const l of LOCALES) alts[l] = `${localePrefix(l)}${path}`;
  const bits = [
    `<script id="tvmb-i18n" type="application/json">${JSON.stringify({ locale, dict: out, alts }).replace(/</g, '\\u003c')}</script>`,
    `<script src="/i18n.js?v=${ASSET_V}"></script>`,
    `<script src="/tools-shared/i18n.js?v=${CLIENT_V}"></script>`,
    `<script src="/tools-shared/glossary.js?v=${GLOSSARY_V}"></script>`,
  ];
  if (CJK.has(locale)) bits.push(`<link rel="stylesheet" href="/fonts/i18n-${locale}.css?v=${ASSET_V}">`);
  return bits.join('\n') + '\n';
}
