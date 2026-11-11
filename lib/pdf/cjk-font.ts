// lib/pdf/cjk-font.ts
// ============================================================
// Glyph Nhật/Hàn/Trung cho PDF (i18n W18).
//
// 🔴 Vì sao cần: PDF chỉ đăng ký Be Vietnam Pro — KHÔNG có glyph CJK/Hangul. Thiếu glyph thì
// react-pdf/fontkit ÂM THẦM đổi cả run chữ sang Helvetica (WinAnsi) ⇒ chữ Nhật/Hàn ra ô trống
// hoặc rác, route không ném, email vẫn 'sent' — cùng kiểu hỏng im lặng đã ghi ở `luan-giai.tsx`.
//
// Font: 4 file Noto Sans JP/KR/TC/SC TĨNH (`npm run pdf:fonts` trong `prebuild` → `data/pdf-fonts/`,
// gitignore — vì sao không dùng lát woff2 của trang web: xem `scripts/pdf-fonts.mjs`). Đưa vào
// `fontFamily` dạng MẢNG sau 'BeVN': react-pdf v4 chọn font theo TỪNG glyph trong mảng ⇒ Latin/Việt
// giữ Be Vietnam, CJK rơi xuống Noto. Chỉ đăng ký font khi tài liệu CÓ chữ CJK ⇒ PDF tiếng Việt không
// đọc thêm byte nào.
// Giới hạn đã biết: chỉ nhúng độ đậm 400 (mỗi file 5–10 MB) ⇒ tiêu đề CJK không đậm. Chấp nhận.
// Vercel: các route dựng PDF phải mang `data/pdf-fonts/*.ttf` (`outputFileTracingIncludes`).
// ============================================================
import { existsSync } from 'fs';
import { join } from 'path';
import { Font } from '@react-pdf/renderer';
import type { Locale } from '@/lib/i18n/locales';

export type CjkFontLocale = 'ja' | 'ko' | 'zh-tw' | 'zh-cn';
const FILE: Record<CjkFontLocale, string> = {
  ja: 'NotoSansJP-Regular.ttf',
  ko: 'NotoSansKR-Regular.ttf',
  'zh-tw': 'NotoSansTC-Regular.ttf',
  'zh-cn': 'NotoSansSC-Regular.ttf',
};
const ALL = Object.keys(FILE) as CjkFontLocale[];

/** Ký tự Be Vietnam Pro KHÔNG có: Hangul Jamo · CJK (bộ thủ, dấu câu, kana, Hán, Hangul, tương thích, toàn khổ) · Hán mở rộng. */
const NEEDS_CJK =
  /[ᄀ-ᇿ⺀-⿟⿰-鿿ꥠ-꥿가-퟿豈-﫿︐-︟︰-﹏＀-￯\u{20000}-\u{3FFFF}]/u;
const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯]/;
const KANA = /[぀-ヿㇰ-ㇿ]/;

export function needsCjk(text: string): boolean {
  return NEEDS_CJK.test(text);
}

/** Font chính cho chữ Hán: theo ngôn ngữ người đọc; không rõ thì đoán theo chữ (kana → ja, Hangul → ko, còn lại → zh-tw). */
export function primaryCjk(text: string, locale?: Locale): CjkFontLocale {
  if (locale && (ALL as string[]).includes(locale)) return locale as CjkFontLocale;
  if (KANA.test(text)) return 'ja';
  if (HANGUL.test(text)) return 'ko';
  return 'zh-tw';
}

export function fontPath(loc: CjkFontLocale): string {
  return join(process.cwd(), 'data', 'pdf-fonts', FILE[loc]);
}

const registered = new Set<CjkFontLocale>();

function familyOf(loc: CjkFontLocale): string | null {
  const fam = `Noto-${loc}`;
  if (registered.has(loc)) return fam;
  const src = fontPath(loc);
  if (!existsSync(src)) {
    console.error(`[pdf/cjk-font] THIẾU ${src} — chữ ${loc} trong PDF sẽ mất glyph (chạy npm run pdf:fonts)`);
    return null;
  }
  // Đăng ký cả 700 bằng CÙNG file: chữ đậm (tiêu đề) rơi xuống họ này mà thiếu biến thể 700 thì
  // react-pdf ném lỗi lúc render (cùng kiểu đã gặp với italic — xem luan-giai.tsx).
  Font.register({ family: fam, fonts: [{ src, fontWeight: 400 }, { src, fontWeight: 700 }] });
  registered.add(loc);
  return fam;
}

/**
 * Họ font CJK cần nối sau 'BeVN' cho `text`. `[]` khi không có ký tự CJK — đường tiếng Việt không đổi.
 * Font chính đứng đầu (chữ Hán chung như 日 lấy đúng nét của người đọc); Noto JP/TC/SC KHÔNG có Hangul
 * nên văn bản có Hangul mà font chính khác `ko` thì nối thêm KR.
 */
export function cjkFamiliesFor(text: string, locale?: Locale): string[] {
  if (!needsCjk(text)) return [];
  const primary = primaryCjk(text, locale);
  const locs: CjkFontLocale[] = [primary];
  if (primary !== 'ko' && HANGUL.test(text)) locs.push('ko');
  if (primary === 'ko' && KANA.test(text)) locs.push('ja');
  return locs.map(familyOf).filter((f): f is string => Boolean(f));
}
