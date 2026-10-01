// lib/nghiem-chung/index.ts — sổ hồ sơ Nghiệm Chứng.
// Thêm người mới: tạo `ho-so/<slug>.ts` rồi thêm vào HO_SO. Sitemap và trang
// hub đọc chính danh sách này, không có danh sách thứ hai để quên.
import type { HoSoNghiemChung, KetLuan } from './types';
import { trinhXuanThuan } from './ho-so/trinh-xuan-thuan';

export type { HoSoNghiemChung, KetLuan } from './types';

export const HO_SO: HoSoNghiemChung[] = [trinhXuanThuan];

export function hoSoTheoSlug(slug: string): HoSoNghiemChung | null {
  return HO_SO.find((h) => h.slug === slug) || null;
}

export interface BangDem {
  khop: number;
  motPhan: number;
  truot: number;
  chuaKiemChung: number;
  dangDienRa: number;
  /** Số dòng có kết luận (khớp + một phần + trượt). */
  kiemChung: number;
}

/** Đếm kết luận — nguồn DUY NHẤT cho mọi con số "x khớp / y trượt" trên trang. */
export function dem(rows: { ketLuan: KetLuan }[]): BangDem {
  const c = (k: KetLuan) => rows.filter((r) => r.ketLuan === k).length;
  const khop = c('khop');
  const motPhan = c('mot-phan');
  const truot = c('truot');
  return {
    khop,
    motPhan,
    truot,
    chuaKiemChung: c('chua-kiem-chung'),
    dangDienRa: c('dang-dien-ra'),
    kiemChung: khop + motPhan + truot,
  };
}
