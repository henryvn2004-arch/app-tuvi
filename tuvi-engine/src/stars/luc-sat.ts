// ============================================================
// LỤC SÁT TINH — Kình Dương, Đà La, Địa Không/Kiếp, Hỏa/Linh
// ============================================================
// BUG FIX HISTORY:
//   v1 (original JS): Kình Dương = locTonIdx - 1, Đà La = locTonIdx + 1  ← SWAPPED
//   v2 (this file):   Kình Dương = locTonIdx + 1, Đà La = locTonIdx - 1  ← CORRECT
//
// Hỏa Tinh / Linh Tinh âm nam:
//   Current rule: âm nam = nghịch cho Hỏa, thuận cho Linh
//   Some classical texts say ALL cases use thuận for Hỏa, nghịch for Linh.
//   MARKED AS TODO — see tests/stars/luc-sat.test.ts
// ============================================================
import { HOA_LINH_KHOI } from '../constants.js';
import { mod12, dcIdx, isThuanChieu } from '../helpers.js';
import type { DiaChi, AmDuong, Gioitinh, ThienCan } from '../types.js';

export function anLucSat(
  canNam: ThienCan,
  chiNam: DiaChi,
  gioIdx: number,
  locTonIdx: number,
  amDuong: AmDuong,
  gioitinh: Gioitinh,
): Record<string, number> {
  // ── Kình Dương: SAU Lộc Tồn 1 bước (thuận chiều) ──
  // FIX: original code had locTonIdx - 1 (wrong). Correct is + 1.
  const kinhDuong = mod12(locTonIdx + 1);

  // ── Đà La: TRƯỚC Lộc Tồn 1 bước (nghịch chiều) ──
  // FIX: original code had locTonIdx + 1 (wrong). Correct is - 1.
  const daLa = mod12(locTonIdx - 1);

  // ── Địa Kiếp: Hợi = Tý, đếm thuận đến giờ ──
  const diaKiep = mod12(dcIdx('Hợi') + gioIdx);

  // ── Địa Không: Hợi = Tý, đếm nghịch đến giờ ──
  const diaKhong = mod12(dcIdx('Hợi') - gioIdx);

  // ── Hỏa Tinh / Linh Tinh ──────────────────────────────────
  // Dương nam / Âm nữ: thuận chiều → Hỏa thuận, Linh nghịch
  // Âm nam / Dương nữ: nghịch chiều → Hỏa nghịch, Linh thuận
  // TODO: verify âm nam case against classical texts
  const hoaLinhKhoi = HOA_LINH_KHOI[chiNam];
  const hoaStart  = dcIdx(hoaLinhKhoi.hoa);
  const linhStart = dcIdx(hoaLinhKhoi.linh);
  const thuận = isThuanChieu(amDuong, gioitinh);
  const hoaTinh  = thuận ? mod12(hoaStart + gioIdx) : mod12(hoaStart - gioIdx);
  const linhTinh = thuận ? mod12(linhStart - gioIdx) : mod12(linhStart + gioIdx);

  return {
    'Kình Dương': kinhDuong,
    'Đà La':      daLa,
    'Địa Kiếp':   diaKiep,
    'Địa Không':  diaKhong,
    'Hỏa Tinh':   hoaTinh,
    'Linh Tinh':  linhTinh,
  };
}
