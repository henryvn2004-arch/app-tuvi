// ============================================================
// AN CHÍNH TINH — 14 major stars placement
// ============================================================
import { TU_VI_BANG, THIEN_PHU_FROM_TUVI } from '../constants.js';
import { mod12, dcIdx } from '../helpers.js';
import type { DiaChi } from '../types.js';

// ─── An cung Mệnh / Thân ────────────────────────────────────
export function dinhCungMenh(thangAL: number, gioIdx: number): number {
  const cungThang = mod12(dcIdx('Dần') + thangAL - 1);
  return mod12(cungThang - gioIdx);
}

export function dinhCungThan(thangAL: number, gioIdx: number): number {
  const cungThang = mod12(dcIdx('Dần') + thangAL - 1);
  return mod12(cungThang + gioIdx);
}

// ─── Lập cục ─────────────────────────────────────────────────
import { LAP_CUC_RULES } from '../constants.js';
import type { ThienCan } from '../types.js';

export function lapCuc(canNam: ThienCan, menhDiaChi: DiaChi): { cuc: string | null; canMenh: null } {
  for (const rule of LAP_CUC_RULES) {
    if ((rule.cung as string[]).includes(menhDiaChi) && (rule.can as string[]).includes(canNam)) {
      return { cuc: rule.cuc, canMenh: null };
    }
  }
  return { cuc: null, canMenh: null };
}

// ─── An 14 chính tinh ─────────────────────────────────────────
export function anChinhTinh(ngayAL: number, cuc: string): Record<string, number> | null {
  const cucTable = TU_VI_BANG[cuc];
  if (!cucTable) return null;

  let tuViDC: string | null = null;
  for (const [cung, days] of Object.entries(cucTable)) {
    if (days.includes(ngayAL)) { tuViDC = cung; break; }
  }
  if (!tuViDC) return null;

  const tv = dcIdx(tuViDC);
  // Tử Vi hệ (Bắc Đẩu)
  const liemTrinh  = mod12(tv + 4);
  const thienDong  = mod12(liemTrinh + 3);
  const vuKhuc     = mod12(thienDong + 1);
  const thaiDuong  = mod12(vuKhuc + 1);
  const thienCo    = mod12(thaiDuong + 2);

  // Thiên Phủ hệ (Nam Đẩu)
  const thienPhuDC = THIEN_PHU_FROM_TUVI[tuViDC as DiaChi];
  const tp = dcIdx(thienPhuDC);
  const thaiAm     = mod12(tp + 1);
  const thamLang   = mod12(thaiAm + 1);
  const cuMon      = mod12(thamLang + 1);
  const thienTuong = mod12(cuMon + 1);
  const thienLuong = mod12(thienTuong + 1);
  const thatSat    = mod12(thienLuong + 1);
  const phaQuan    = mod12(thatSat + 4);

  return {
    'Tử Vi': tv, 'Liêm Trinh': liemTrinh, 'Thiên Đồng': thienDong,
    'Vũ Khúc': vuKhuc, 'Thái Dương': thaiDuong, 'Thiên Cơ': thienCo,
    'Thiên Phủ': tp, 'Thái Âm': thaiAm, 'Tham Lang': thamLang,
    'Cự Môn': cuMon, 'Thiên Tướng': thienTuong, 'Thiên Lương': thienLuong,
    'Thất Sát': thatSat, 'Phá Quân': phaQuan,
  };
}
