// lib/i18n/long-server.ts — đọc bản dịch "văn dài" (`public/tools-shared/i18n-long/<locale>/<ns>.js`) PHÍA SERVER (W30f-8).
//
// Vì sao: bản dịch tên nhân vật / danh xưng nghề tiền kiếp nằm ở file client (client vẽ qua `I18n.long`), mà prompt truyện LLM cũng
// phải dùng ĐÚNG chữ đó — nếu không, khách thấy "陸子期" ở tiêu đề còn truyện lại tự phiên âm ra tên khác. Một nguồn duy nhất:
// file dịch; không chép bảng sang TS.
//
// File dịch là script `window.I18n&&window.I18n.defineLong("<ns>",{…})` — chạy trong `vm` với `window` giả, không `eval` trần.
// Next KHÔNG tự mang file trong `public/` vào gói hàm ⇒ route dùng hàm này phải khai `outputFileTracingIncludes` (next.config.ts).
// Hụt file/hỏng cú pháp ⇒ trả null + `console.error` MỘT lần (caller lùi về chữ Việt: truyện vẫn ra, chỉ là tên không khớp).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { Locale } from '@/lib/i18n/locales';

export type LongTable = Record<string, { t: string; h?: string }>;

const cache = new Map<string, LongTable | null>();

export function readLongNs(locale: Locale, ns: string): LongTable | null {
  if (locale === 'vi' || !/^[a-z0-9-]+$/.test(ns) || !/^[a-z]{2}(-[a-z]{2})?$/.test(locale)) return null;
  const id = `${locale}/${ns}`;
  if (cache.has(id)) return cache.get(id) ?? null;
  let table: LongTable | null = null;
  try {
    const file = path.join(process.cwd(), 'public/tools-shared/i18n-long', locale, `${ns}.js`);
    let got: LongTable | null = null;
    vm.runInNewContext(
      fs.readFileSync(file, 'utf8'),
      { window: { I18n: { defineLong: (_ns: string, d: LongTable) => (got = d) } } },
      { timeout: 2000 },
    );
    table = got;
    if (!table) throw new Error('file không gọi defineLong');
  } catch (e) {
    console.error(`[long-server] không đọc được bản dịch ${id}:`, (e as Error)?.message);
  }
  cache.set(id, table);
  return table;
}

/** Bản dịch của một khoá, hoặc null khi thiếu (khác `I18n.long` — không có câu Việt dự phòng ở đây). */
export function longGet(locale: Locale, ns: string, key: string): string | null {
  const e = readLongNs(locale, ns)?.[key];
  return e && typeof e.t === 'string' ? e.t : null;
}
