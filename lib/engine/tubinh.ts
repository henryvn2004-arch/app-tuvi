// lib/engine/tubinh.ts
// ============================================================
// Engine wrapper — tính BÁT TỰ (Tử Bình) SERVER-SIDE (Sprint 1.3).
//
// Tái dùng đúng pattern lib/engine/laso.ts: nạp engine vanilla
// public/tubinh-ansao-engine.js (đã hỗ trợ module.exports) qua
// new Function với shim `module` → lấy hàm tinhBatTu. Engine này
// thuần tính toán (tiết khí + can chi), KHÔNG đụng DOM nên không
// cần mock location như laso.
//
// computeTuBinh(birth) trả về CHÍNH object engine sinh ra (tuTru,
// nhatCan, cuongNhuoc, dungThan, cachCuc, nguHanh, daiVanHienTai,
// luuNien, hinhXungHaiHop, thanSat...) → client tự tính (tinhBatTu)
// và server tính ra y hệt (cùng file engine) → parity tuyệt đối.
// Định dạng context cho LLM nằm ở lib/agent/prompts.ts (một bộ não).
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import type { BirthParams } from '@/lib/contract/v1';

type Rec = Record<string, unknown>;

// Tử Bình dùng DƯƠNG lịch + tiết khí. Giờ sinh: index địa chi
// (0=Tý..11=Hợi) → giờ đại diện (hour pillar chỉ phụ thuộc chi giờ,
// nên giờ đại diện cho cùng kết quả với mọi giờ trong cùng địa chi).
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

let engineCache: { tinhBatTu: (o: object) => Rec } | null = null;

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tubinh-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  const mod = { exports: {} as Rec };
  // Engine dùng `if (typeof module !== 'undefined') module.exports = {...}`.
  (new Function('module', 'exports', 'window', 'globalThis', code))(mod, mod.exports, g, g);
  const exp = mod.exports as Rec;
  if (typeof exp.tinhBatTu !== 'function') {
    throw new Error('tubinh-ansao-engine: không tìm thấy tinhBatTu');
  }
  engineCache = { tinhBatTu: exp.tinhBatTu as (o: object) => Rec };
  return engineCache!;
}

function currentYearVN(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
  );
}

export type TuBinh = Rec;

export interface ComputeTuBinhResult {
  ok: boolean;
  error?: string;
  data?: TuBinh;
}

/**
 * Tính bát tự từ tham số sinh DƯƠNG lịch. namXem mặc định = năm hiện
 * tại (VN) để xác định đại vận hiện tại / lưu niên / tuổi xem.
 */
export function computeTuBinh(birth: BirthParams, namXem?: number): ComputeTuBinhResult {
  const { day, month, year, hourBranch, gender } = birth;

  if (!day || !month || !year) {
    return { ok: false, error: 'Thiếu ngày/tháng/năm sinh dương lịch.' };
  }
  if (hourBranch == null || hourBranch < 0 || hourBranch > 11) {
    return { ok: false, error: 'Thiếu hoặc sai giờ sinh (cần địa chi giờ 0=Tý..11=Hợi).' };
  }
  if (gender !== 'nam' && gender !== 'nu') {
    return { ok: false, error: 'Thiếu giới tính (nam/nu).' };
  }

  try {
    const { tinhBatTu } = loadEngine();
    const hour = GIO_HOURS[hourBranch];
    const bt = tinhBatTu({
      ngayDL: day,
      thangDL: month,
      namDL: year,
      gio: hour,
      gioitinh: gender,
      namXem: namXem ?? currentYearVN(),
    });
    if (!bt || !bt.tuTru) return { ok: false, error: 'Engine không trả về tứ trụ.' };
    return { ok: true, data: bt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi engine tử bình' };
  }
}
