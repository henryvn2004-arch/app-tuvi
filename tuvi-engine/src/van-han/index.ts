// ============================================================
// VẬN HẠN — Đại vận, Tiểu hạn, Lưu đại hạn
// ============================================================
import { DIA_CHI, TIEU_HAN_KHOI } from '../constants.js';
import { mod12, dcIdx, isThuanChieu } from '../helpers.js';
import type { DiaChi, AmDuong, Gioitinh, DaiVan, NguyetHanKhoi } from '../types.js';

const CUC_SO: Record<string, number> = {
  'Thủy Nhị Cục':2,'Mộc Tam Cục':3,'Kim Tứ Cục':4,'Thổ Ngũ Cục':5,'Hỏa Lục Cục':6,
};

export function tinhDaiVan(
  menhIdx: number,
  cuc: string,
  amDuong: AmDuong,
  gioitinh: Gioitinh,
): DaiVan[] {
  const cucSo = CUC_SO[cuc] ?? 2;
  const thuận = isThuanChieu(amDuong, gioitinh);
  const vans: DaiVan[] = [];
  for (let i = 0; i < 12; i++) {
    const cungIdx = thuận ? mod12(menhIdx + i) : mod12(menhIdx - i);
    const tuoiStart = i === 0 ? cucSo : (vans[i - 1]!.tuoiEnd + 1);
    const tuoiEnd   = tuoiStart + 9;
    vans.push({ cungIdx, diaChi: DIA_CHI[cungIdx]!, tuoiStart, tuoiEnd });
  }
  return vans;
}

export function tinhTieuHan(
  chiNamSinh: DiaChi,
  gioitinh: Gioitinh,
  tuoiXem: number,
): number {
  const startDC  = TIEU_HAN_KHOI[gioitinh][chiNamSinh];
  const startIdx = dcIdx(startDC);
  const offset   = (tuoiXem - 1) % 12;
  return gioitinh === 'nam'
    ? mod12(startIdx + offset)
    : mod12(startIdx - offset);
}

// ============================================================
// LƯU NGUYỆT HẠN — 3 cách khởi (sách 10.4)
// ============================================================

/**
 * Tính khởi điểm lưu nguyệt hạn — cung tháng Giêng theo 3 cách.
 * Để lấy cung tháng m (1–12): mod12(result.cachX + m - 1)
 *
 * @param tieuHanIdx  Cung lưu niên tiểu hạn (0–11)
 * @param thangSinh   Tháng sinh âm lịch (1–12)
 * @param gioSinhIdx  Giờ sinh: Tý=0, Sửu=1, … Hợi=11
 */
export function tinhNguyetHan(
  tieuHanIdx: number,
  thangSinh: number,
  gioSinhIdx: number,
): NguyetHanKhoi {
  // Cách 1: từ tiểu hạn đếm NGHỊCH (thangSinh-1) bước → giờ Tý,
  //         rồi đếm THUẬN gioSinh bước → tháng Giêng
  const p1 = mod12(tieuHanIdx - (thangSinh - 1));
  const cach1 = mod12(p1 + gioSinhIdx);

  // Cách 2: từ tiểu hạn đếm THUẬN (thangSinh-1) bước → giờ Tý,
  //         rồi đếm THUẬN gioSinh bước → tháng Giêng
  const p2 = mod12(tieuHanIdx + (thangSinh - 1));
  const cach2 = mod12(p2 + gioSinhIdx);

  // Cách 3: tháng Giêng = cung tiểu hạn, đếm thuận
  const cach3 = tieuHanIdx;

  return { cach1, cach2, cach3 };
}

// ============================================================
// LƯU NHẬT HẠN — đếm thuận từ cung nguyệt hạn (sách 10.5)
// ============================================================

/**
 * Tính cung lưu nhật hạn.
 * Cung nguyệt hạn = mồng 1; đếm thuận mỗi ngày một cung.
 *
 * @param nguyetHanIdx  Cung nguyệt hạn của tháng đang xét (0–11)
 * @param ngay          Ngày âm lịch (1–30)
 */
export function tinhNhatHan(nguyetHanIdx: number, ngay: number): number {
  return mod12(nguyetHanIdx + ngay - 1);
}

// ageIndex: 0–9 (tuổi đang xem - tuổi bắt đầu đại vận)
export function tinhLuuDaiHan(
  daiVanCungIdx: number,
  ageIndex: number,
  amDuong: AmDuong,
  gioitinh: Gioitinh,
): number {
  const s = daiVanCungIdx;
  const x = mod12(s + 6);
  const duongNam_amNu = isThuanChieu(amDuong, gioitinh);
  if (duongNam_amNu) {
    const map = [s, x, mod12(x-1), x, mod12(x+1), mod12(x+2), mod12(x+3), mod12(x+4), mod12(x+5), mod12(x+6)];
    return map[ageIndex] ?? s;
  } else {
    const map = [s, x, mod12(x+1), x, mod12(x-1), mod12(x-2), mod12(x-3), mod12(x-4), mod12(x-5), mod12(x-6)];
    return map[ageIndex] ?? s;
  }
}
