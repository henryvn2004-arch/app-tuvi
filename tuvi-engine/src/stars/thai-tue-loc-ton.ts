// ============================================================
// AN VÒNG THÁI TUẾ + LỘC TỒN + TRÀNG SINH
// ============================================================
import {
  THAI_TUE_SEQ,
  LOC_TON_START, LOC_TON_SEQ,
  TRANG_SINH_START, TRANG_SINH_SEQ,
} from '../constants.js';
import { mod12, dcIdx, isThuanChieu } from '../helpers.js';
import type { ThienCan, DiaChi, AmDuong, Gioitinh } from '../types.js';

// ─── Thái Tuế ────────────────────────────────────────────────
export function anThaiTue(chiNam: DiaChi): Record<string, number> {
  const start = dcIdx(chiNam);
  const r: Record<string, number> = {};
  THAI_TUE_SEQ.forEach((s, i) => { r[s] = mod12(start + i); });
  return r;
}

// ─── Lộc Tồn ─────────────────────────────────────────────────
export function anLocTon(canNam: ThienCan, amDuong: AmDuong, gioitinh: Gioitinh): Record<string, number> {
  const start = dcIdx(LOC_TON_START[canNam]);
  const thuận = isThuanChieu(amDuong, gioitinh);
  const r: Record<string, number> = {};
  LOC_TON_SEQ.forEach((s, i) => {
    r[s] = thuận ? mod12(start + i) : mod12(start - i);
  });
  return r;
}

// ─── Tràng Sinh ───────────────────────────────────────────────
export function anTrangSinh(cuc: string, amDuong: AmDuong, gioitinh: Gioitinh): Record<string, number> {
  const startDC = TRANG_SINH_START[cuc];
  if (!startDC) return {};
  const start = dcIdx(startDC);
  const thuận = isThuanChieu(amDuong, gioitinh);
  const r: Record<string, number> = {};
  TRANG_SINH_SEQ.forEach((s, i) => {
    r[s] = thuận ? mod12(start + i) : mod12(start - i);
  });
  return r;
}
