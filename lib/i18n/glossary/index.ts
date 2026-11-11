// lib/i18n/glossary/index.ts — tra bảng thuật ngữ Tử Vi theo ngôn ngữ (W6).
//
// Nguồn: `tuvi-terms.ts` (viết tay) → `scripts/gen-glossary.mjs` → `terms.generated.mjs`.
// Dùng ở HAI nơi: (1) route hồ sơ Nghiệm Chứng đổi tên cung/sao/can chi do ENGINE trả (tiếng Việt)
// sang ngôn ngữ trang; (2) `scripts/nc-i18n.mjs` đưa cho người dịch ĐÚNG phần thuật ngữ xuất hiện
// trong lô và kiểm bản dịch dùng đúng thuật ngữ.
// File này chỉ import `terms.generated.mjs` (JS thuần) để Node ≥22.18 đọc thẳng được từ script `.mjs` mà không cần tsx.
import { GENERATED_TERMS } from './terms.generated.mjs';

/** Ngôn ngữ có cột thuật ngữ (không gồm `vi` — vi là gốc). */
export type GlossaryLocale = 'en' | 'ja' | 'ko' | 'zh-tw' | 'zh-cn';

export interface Term {
  k: string;
  vi: string;
  en: string;
  'zh-tw': string;
  'zh-cn': string;
  ja: string;
  ko: string;
  f?: string;
}

export const GLOSSARY: readonly Term[] = GENERATED_TERMS as unknown as Term[];

const byKey = new Map<string, Term>();
for (const t of GLOSSARY) byKey.set(`${t.k}|${t.vi}`, t);

const warned = new Set<string>();

/**
 * Thuật ngữ đã dịch của MỘT mục engine trả (`kind` + tên Việt đúng như engine). Không có trong bảng thì
 * trả nguyên tiếng Việt kèm `console.warn` một lần — thà lộ ra một chữ Việt để lần sau bổ sung còn hơn
 * nuốt mất (cùng luật `lib/hanviet.ts`).
 */
export function term(locale: GlossaryLocale, kind: string, vi: string): string {
  const t = byKey.get(`${kind}|${vi}`);
  if (t) return t[locale];
  const key = `${kind}|${vi}`;
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(`[glossary] thiếu thuật ngữ ${kind}: "${vi}" (${locale})`);
  }
  return vi;
}

// ── Dò thuật ngữ trong văn xuôi tiếng Việt ───────────────────────────────────────────────
// "Cụm đủ nghĩa" chứ không phải chuỗi thô (luật CLAUDE.md, mục tiếng Việt): biên từ bằng \p{L},
// phân biệt hoa/thường ("Thiên Cơ" sao ≠ "thiên cơ" thường), cung đơn âm ("Mệnh", "Thân", "Phúc Đức")
// chỉ khớp khi có tiền tố "cung ". Khớp DÀI trước và nuốt vùng đã khớp (Tử Vi Đẩu Số không đếm thêm Tử Vi).
const L = String.raw`\p{L}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Matcher {
  t: Term;
  re: RegExp;
}
let matchers: Matcher[] | null = null;
function build(): Matcher[] {
  const out: Matcher[] = [];
  for (const t of GLOSSARY) {
    if (t.f?.includes('x')) continue; // đơn âm tiết mơ hồ: chỉ tra cứu chính xác, không dò trong văn
    const needCung = t.k === 'cung' && !!t.f?.includes('c');
    const optCung = t.k === 'cung' && !needCung;
    const body = esc(t.vi).replace(/\s+/g, String.raw`\s+`);
    const pre = needCung ? String.raw`[Cc]ung\s+` : optCung ? String.raw`(?:[Cc]ung\s+)?` : '';
    out.push({ t, re: new RegExp(`(?<!${L})${pre}${body}(?!${L})`, 'gu') });
  }
  // Dài trước. Cung (có tiền tố "cung ") đứng trước sao trùng tên (Phúc Đức).
  return out.sort((a, b) => b.t.vi.length - a.t.vi.length || (a.t.k === 'cung' ? -1 : 1));
}

/** Thuật ngữ xuất hiện trong các đoạn văn tiếng Việt — mỗi thuật ngữ một lần, theo thứ tự bảng. */
export function termsInText(texts: string[]): Term[] {
  matchers ||= build();
  const found = new Set<Term>();
  for (const raw of texts) {
    let s = raw;
    for (const { t, re } of matchers) {
      re.lastIndex = 0;
      if (re.test(s)) {
        found.add(t);
        re.lastIndex = 0;
        s = s.replace(re, (m) => ' '.repeat(m.length));
      }
    }
  }
  return GLOSSARY.filter((t) => found.has(t));
}

/** Phần "lõi" chấp nhận được của một thuật ngữ cung trong bản dịch: bỏ hậu tố 宮/궁/Palace. */
function core(locale: GlossaryLocale, t: Term): string {
  const s = t[locale];
  if (t.k !== 'cung') return s;
  return s.replace(/(宮|宫|궁)$/u, '').replace(/\s+Palace$/i, '');
}

/** Bản dịch `tgt` của đoạn `src` có dùng ĐÚNG thuật ngữ cho mọi thuật ngữ xuất hiện trong `src` không? */
export function missingTerms(locale: GlossaryLocale, src: string, tgt: string): Term[] {
  const miss: Term[] = [];
  const lower = tgt.toLowerCase();
  for (const t of termsInText([src])) {
    const want = core(locale, t);
    if (!lower.includes(want.toLowerCase())) miss.push(t);
  }
  return miss;
}

/** Thuật ngữ mà ja/ko dùng chữ KHÁC bản phồn thể — bản dịch ja còn chữ phồn thể là chưa đổi 新字体. */
export function wrongVariant(locale: GlossaryLocale, tgt: string): Term[] {
  if (locale !== 'ja') return [];
  return GLOSSARY.filter((t) => t.ja !== t['zh-tw'] && !t.f?.includes('x') && tgt.includes(t['zh-tw']));
}

/** Như `term` nhưng tên có thể thuộc nhiều loại (chính tinh hay phụ tinh…): thử lần lượt các `kinds`. */
export function termAny(locale: GlossaryLocale, vi: string, kinds: string[]): string {
  for (const k of kinds) {
    const t = byKey.get(`${k}|${vi}`);
    if (t) return t[locale];
  }
  return term(locale, kinds[0], vi);
}

/**
 * Đổi MỌI thuật ngữ dò được trong một chuỗi tiếng Việt do ENGINE sinh (vd. "Thiên Cơ, Cự Môn") sang
 * `locale`. Chỉ dùng cho chuỗi máy sinh có cấu trúc cố định — văn xuôi biên tập thì để người dịch.
 */
export function localizeText(locale: GlossaryLocale, text: string): string {
  matchers ||= build();
  const hit: Term[] = [];
  let s = text;
  for (const { t, re } of matchers) {
    re.lastIndex = 0;
    s = s.replace(re, () => `\u0000${hit.push(t) - 1}\u0000`);
  }
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => hit[Number(i)][locale]);
}
