// lib/engine/past-life-ten.ts — tên nhân vật + danh xưng nghề tiền kiếp THEO NGÔN NGỮ, phía server (W30f-8).
//
// Engine (`past-life.ts`) giữ trả chữ Việt và gắn mã tra (`characterMa` · `titleMa`); client dịch tại chỗ vẽ
// (`public/tools-shared/past-life-ten.js`). File này là bản sao PHÍA SERVER của đúng phép ghép đó, chỉ để PROMPT truyện biết tên đã
// dịch mà bắt LLM dùng ĐÚNG chữ ấy (không tự phiên âm lại). Cả hai đọc CÙNG file dịch (ns `past-life-ten`) — `check:enginema` so
// hai bên trên mẫu thật. Chữ Việt ở payload/cache/sổ KHÔNG đổi; dịch CHỈ để hiển thị và để prompt khớp với màn hình.
import { longGet } from '@/lib/i18n/long-server';
import type { Locale } from '@/lib/i18n/locales';
import type { NameMa, TitleMa } from '@/lib/engine/past-life';

const NS = 'past-life-ten';

const dien = (mau: string, bien: Record<string, string>) =>
  mau.replace(/\{(\w+)\}/g, (m, n) => (n in bien ? bien[n] : m));

/** Tên theo ngôn ngữ; null khi `vi`/thiếu mã/thiếu bản dịch (⇒ caller giữ tên Việt). */
export function tenTheoNgonNgu(locale: Locale, ma: NameMa | undefined): string | null {
  if (locale === 'vi' || !ma) return null;
  const ho = longGet(locale, NS, `name.${ma.ho}`);
  const ten = longGet(locale, NS, `name.${ma.ten}`);
  const mau = longGet(locale, NS, `fmt.name.${ma.ho.split('.')[0]}`);
  if (ho === null || ten === null || mau === null) return null;
  return dien(mau, { ho, ten });
}

/** Danh xưng theo ngôn ngữ; null khi `vi`/thiếu mã/thiếu bản dịch. */
export function danhXungTheoNgonNgu(locale: Locale, ma: TitleMa | undefined): string | null {
  if (locale === 'vi' || !ma) return null;
  const t = longGet(locale, NS, `title.${ma.t}`);
  if (t === null) return null;
  if (!ma.s) return t;
  const s = longGet(locale, NS, `suf.${ma.s}`);
  const mau = longGet(locale, NS, 'fmt.title');
  if (s === null || mau === null) return null;
  return dien(mau, { t, s });
}

interface NhanVat {
  characterName: string;
  characterMa?: NameMa;
  occupation: { title: string; titleMa?: TitleMa };
}

/**
 * Khối NỐI vào prompt truyện: bảng "tên Việt trong dữ liệu → chữ phải dùng khi viết". `vi` → '' (prompt khách Việt giữ NGUYÊN từng
 * byte); không dịch được nhân vật nào → '' (không nói nửa vời).
 */
export function khoiTenTheoNgonNgu(locale: Locale, nhanVat: NhanVat[]): string {
  if (locale === 'vi') return '';
  const dong = nhanVat.flatMap((p) => {
    const ten = tenTheoNgonNgu(locale, p.characterMa);
    const dx = danhXungTheoNgonNgu(locale, p.occupation.titleMa);
    if (!ten && !dx) return [];
    return [`- ${p.characterName} → ${ten ?? p.characterName}${dx ? ` · danh xưng: ${p.occupation.title} → ${dx}` : ''}`];
  });
  if (!dong.length) return '';
  return (
    '\n\nTÊN VÀ DANH XƯNG KHI VIẾT TRUYỆN — đã chốt cùng chữ hiện trên màn hình khách. Ở MỌI chỗ (tiêu đề, mô tả, các hồi, lời kết) dùng ĐÚNG chữ bên phải mũi tên; ' +
    'KHÔNG tự phiên âm lại, KHÔNG để tên hay danh xưng tiếng Việt lọt vào:\n' +
    dong.join('\n')
  );
}
