// ============================================================
// VẬN HẠN — Đại vận, Tiểu hạn, Lưu đại hạn
// ============================================================
import { DIA_CHI, TIEU_HAN_KHOI } from '../constants.js';
import { mod12, dcIdx, isThuanChieu } from '../helpers.js';
import type { DiaChi, AmDuong, Gioitinh, DaiVan } from '../types.js';

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
