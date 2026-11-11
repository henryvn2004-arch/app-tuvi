// lib/nghiem-chung/i18n/prose.ts — TÁCH / GHÉP phần VĂN XUÔI của hồ sơ Nghiệm Chứng để dịch (W6).
//
// 🔴 HAI LỚP như `types.ts`: chỉ văn xuôi biên tập mới dịch. SỐ LIỆU tử vi (cung, sao, điểm, đại vận),
// kết luận khớp/trượt, nguồn, ngày, tỷ lệ — luôn đọc từ bản gốc/engine, KHÔNG nằm trong bản dịch.
// Bản dịch là một bảng phẳng `f` khoá theo đường dẫn ("tieuSu.0", "banMenh.2.doiThat") — gọn nhất cho
// người dịch (không phải chép lại cấu trúc JSON) và dễ kiểm đủ/thiếu từng khoá.
//
// File này dùng ở CẢ route (server) lẫn scripts/nc-i18n.mjs (Node ≥22.18 đọc thẳng .ts) ⇒ không import
// gì ngoài `node:crypto` và kiểu. Đổi danh sách trường ở đây là đổi `source_hash` của MỌI hồ sơ ⇒ cả
// kho hiện lại trong hàng đợi dịch — chỉ đổi khi thật sự thêm/bớt trường văn xuôi.
import { createHash } from 'node:crypto';
import type { HoSoNghiemChung } from '../types';

/** Ngôn ngữ có bản dịch hồ sơ (`vi` là bản gốc, `zh-cn` sinh từ `zh-tw` bằng OpenCC khi lưu). */
export const NC_LOCALES = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'] as const;
export type NcLocale = (typeof NC_LOCALES)[number];

export interface ProseBundle {
  ten: string;
  ngheNghiep: string;
  /** Bảng phẳng khoá → văn xuôi (một đoạn). Không có khoá nào rỗng. */
  f: Record<string, string>;
}

/** Tách mọi trường văn xuôi của hồ sơ. Thứ tự khoá ổn định (dùng cho hash và cho người dịch). */
export function extractProse(h: HoSoNghiemChung): ProseBundle {
  const f: Record<string, string> = {};
  const put = (k: string, v: unknown) => {
    if (typeof v === 'string' && v.trim()) f[k] = v;
  };
  put('moTaNgan', h.moTaNgan);
  put('traLoiNgan', h.traLoiNgan);
  put('sinh.noi', h.sinh.noi);
  h.tieuSu.forEach((v, i) => put(`tieuSu.${i}`, v));
  h.banMenh.forEach((r, i) => {
    put(`banMenh.${i}.laSoNoi`, r.laSoNoi);
    put(`banMenh.${i}.doiThat`, r.doiThat);
  });
  h.daiVan.forEach((r, i) => {
    put(`daiVan.${i}.doiThat`, r.doiThat);
    put(`daiVan.${i}.vi`, r.vi);
  });
  h.namMoc.forEach((r, i) => {
    put(`namMoc.${i}.suKien`, r.suKien);
    put(`namMoc.${i}.laSoNoi`, r.laSoNoi);
  });
  if (h.gioRanhGioi) {
    put('gioRanhGioi.lyDo', h.gioRanhGioi.lyDo);
    put('gioRanhGioi.ketLuan', h.gioRanhGioi.ketLuan);
  }
  if (h.gioDoan) {
    put('gioDoan.giaiThich', h.gioDoan.giaiThich);
    h.gioDoan.bang.forEach((b, i) => put(`gioDoan.bang.${i}.lyDo`, b.lyDo));
  }
  h.ketLuanBienTap.forEach((v, i) => put(`ketLuanBienTap.${i}`, v));
  h.faq.forEach((q, i) => {
    put(`faq.${i}.q`, q.q);
    put(`faq.${i}.a`, q.a);
  });
  return { ten: h.ten, ngheNghiep: h.ngheNghiep, f };
}

/** Băm phần văn xuôi GỐC (16 hex). Khác băm lúc dịch ⇒ hồ sơ mới hoặc đã sửa ⇒ cần dịch lại. */
export function hashProse(b: ProseBundle): string {
  const canon = JSON.stringify([b.ten, b.ngheNghiep, Object.keys(b.f).sort().map((k) => [k, b.f[k]])]);
  return createHash('sha256').update(canon).digest('hex').slice(0, 16);
}

/** Khoá có ở gốc mà bản dịch thiếu (hoặc rỗng) — bản dịch đủ khi mảng này rỗng. */
export function thieuKhoa(src: ProseBundle, tr: { f: Record<string, string> }): string[] {
  return Object.keys(src.f).filter((k) => !(typeof tr.f[k] === 'string' && tr.f[k].trim()));
}

/**
 * Ghép bản dịch vào bản sao của hồ sơ. Khoá thiếu GIỮ chữ gốc — người gọi phải kiểm `thieuKhoa`
 * trước (route trả 404 nếu thiếu, KHÔNG phát bản lẫn chữ Việt).
 */
export function applyProse(h: HoSoNghiemChung, tr: { ten: string; ngheNghiep: string; f: Record<string, string> }): HoSoNghiemChung {
  const o: HoSoNghiemChung = JSON.parse(JSON.stringify(h));
  const g = (k: string, cur: string) => (typeof tr.f[k] === 'string' && tr.f[k].trim() ? tr.f[k] : cur);
  o.ten = tr.ten;
  o.ngheNghiep = tr.ngheNghiep;
  o.moTaNgan = g('moTaNgan', o.moTaNgan);
  o.traLoiNgan = g('traLoiNgan', o.traLoiNgan);
  o.sinh.noi = g('sinh.noi', o.sinh.noi);
  o.tieuSu = o.tieuSu.map((v, i) => g(`tieuSu.${i}`, v));
  o.banMenh.forEach((r, i) => {
    r.laSoNoi = g(`banMenh.${i}.laSoNoi`, r.laSoNoi);
    r.doiThat = g(`banMenh.${i}.doiThat`, r.doiThat);
  });
  o.daiVan.forEach((r, i) => {
    r.doiThat = g(`daiVan.${i}.doiThat`, r.doiThat);
    r.vi = g(`daiVan.${i}.vi`, r.vi);
  });
  o.namMoc.forEach((r, i) => {
    r.suKien = g(`namMoc.${i}.suKien`, r.suKien);
    r.laSoNoi = g(`namMoc.${i}.laSoNoi`, r.laSoNoi);
  });
  if (o.gioRanhGioi) {
    o.gioRanhGioi.lyDo = g('gioRanhGioi.lyDo', o.gioRanhGioi.lyDo);
    o.gioRanhGioi.ketLuan = g('gioRanhGioi.ketLuan', o.gioRanhGioi.ketLuan);
  }
  if (o.gioDoan) {
    o.gioDoan.giaiThich = g('gioDoan.giaiThich', o.gioDoan.giaiThich);
    o.gioDoan.bang.forEach((b, i) => (b.lyDo = g(`gioDoan.bang.${i}.lyDo`, b.lyDo)));
  }
  o.ketLuanBienTap = o.ketLuanBienTap.map((v, i) => g(`ketLuanBienTap.${i}`, v));
  o.faq.forEach((q, i) => {
    q.q = g(`faq.${i}.q`, q.q);
    q.a = g(`faq.${i}.a`, q.a);
  });
  return o;
}
