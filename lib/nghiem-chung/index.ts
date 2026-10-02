// lib/nghiem-chung/index.ts — sổ hồ sơ Nghiệm Chứng.
// Thêm người mới: tạo `ho-so/<slug>.ts` rồi thêm vào HO_SO. Sitemap và trang
// hub đọc chính danh sách này, không có danh sách thứ hai để quên.
import type { HoSoNghiemChung, KetLuan } from './types';
import { trinhXuanThuan } from './ho-so/trinh-xuan-thuan';
import { cungLe } from './ho-so/cung-le';

export type { HoSoNghiemChung, KetLuan } from './types';

export const HO_SO: HoSoNghiemChung[] = [trinhXuanThuan, cungLe];

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
  /**
   * Tỷ lệ khớp (%, làm tròn) = (khớp + khớp một phần) / kiểm chứng được.
   * "Khớp một phần" tính là khớp — quy tắc chấm CÔNG KHAI trên trang (mục
   * "Cách chúng tôi đối chiếu"), không phải số đẹp tay. Mục chưa kiểm chứng
   * và đang diễn ra không vào mẫu số. `null` khi chưa có dòng nào kiểm chứng.
   */
  tyLe: number | null;
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
    tyLe: khop + motPhan + truot ? Math.round(((khop + motPhan) * 100) / (khop + motPhan + truot)) : null,
  };
}

/** Ngưỡng MỞ INDEX (Henry duyệt 2026-10-02): đủ dày để không thành trang mỏng — bản mệnh ≥8 dòng
 *  đã chấm, ≥3 năm mốc, ≥3 đại vận (sinh 1990+ hoặc giờ do hệ thống xác định: ≥2). Chưa đạt thì
 *  trang vẫn có nhưng `noindex`. Dùng ở scripts/nghiem-chung/manifest.ts. */
export function datNguongIndex(h: HoSoNghiemChung): boolean {
  const tre = Number(h.sinh.ngay.slice(0, 4)) >= 1990 || !!h.gioDoan;
  return dem(h.banMenh).kiemChung >= 8 && dem(h.namMoc).kiemChung >= 3 && dem(h.daiVan).kiemChung >= (tre ? 2 : 3);
}
