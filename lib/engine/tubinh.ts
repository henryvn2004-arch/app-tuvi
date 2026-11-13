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
import { currentNamXem } from '@/lib/engine/namxem';
import { lichOf, solarDateOf } from '@/lib/engine/laso';

type Rec = Record<string, unknown>;

// Tử Bình dùng DƯƠNG lịch + tiết khí. Giờ sinh: index địa chi
// (0=Tý..11=Hợi) → giờ đại diện (hour pillar chỉ phụ thuộc chi giờ,
// nên giờ đại diện cho cùng kết quả với mọi giờ trong cùng địa chi).
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

let engineCache: {
  tinhBatTu: (o: object) => Rec;
  hanhCan: Record<string, string>;
  hanhChi: Record<string, string>;
  tietKhiCuaThoiDiem: (d: number, m: number, y: number, h: number, p: number, lich: string) => { i: number; gan: boolean } | null;
  truThangTrongThangDuong: (mm: number, yy: number, offPhut?: number) => DoanTruThang[] | null;
} | null = null;

/** Một đoạn ngày cùng trụ tháng trong một tháng dương lịch (engine `truThangTrongThangDuong`). */
export interface DoanTruThang {
  tuNgay: number;
  denNgay: number;
  can: string;
  chi: string;
  canChi: string;
  /** Năm tiết khí (đổi ở Lập Xuân) mà trụ tháng này thuộc về. */
  namCanChi: string;
  /** Thời điểm vào tiết của trụ tháng này, giờ VN. */
  vaoTiet: { ngay: number; thang: number; nam: number; gio: number; phut: number };
}

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tubinh-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  const mod = { exports: {} as Rec };
  // Lịch cn/kr/jp: engine đọc múi của lịch từ `NoiSinh.GIO_LICH` (nguồn DUY NHẤT,
  // public/tools-shared/noi-sinh.js) — trên trang là biến toàn cục, ở đây truyền
  // vào như tham số cùng tên.
  const ns = { exports: {} as Rec };
  new Function('module', readFileSync(join(process.cwd(), 'public', 'tools-shared', 'noi-sinh.js'), 'utf-8'))(ns);
  // Engine dùng `if (typeof module !== 'undefined') module.exports = {...}`.
  (new Function('module', 'exports', 'window', 'globalThis', 'NoiSinh', code))(mod, mod.exports, g, g, ns.exports);
  const exp = mod.exports as Rec;
  if (typeof exp.tinhBatTu !== 'function') {
    throw new Error('tubinh-ansao-engine: không tìm thấy tinhBatTu');
  }
  engineCache = {
    tinhBatTu: exp.tinhBatTu as (o: object) => Rec,
    hanhCan: (exp.NGU_HANH_CAN_TB || {}) as Record<string, string>,
    hanhChi: (exp.NGU_HANH_CHI_TB || {}) as Record<string, string>,
    tietKhiCuaThoiDiem: exp.tietKhiCuaThoiDiem as NonNullable<typeof engineCache>['tietKhiCuaThoiDiem'],
    truThangTrongThangDuong: exp.truThangTrongThangDuong as NonNullable<typeof engineCache>['truThangTrongThangDuong'],
  };
  return engineCache!;
}

/**
 * Trụ tháng (theo TIẾT, giờ VN) của từng đoạn ngày trong tháng dương `thang/nam` —
 * thường 2 đoạn, đổi ở ngày giao tiết. Ngoài bảng tiết khí (≈1900–2100) ⇒ null.
 */
export function truThangTrongThangDuong(thang: number, nam: number): DoanTruThang[] | null {
  if (!Number.isInteger(thang) || thang < 1 || thang > 12 || !Number.isInteger(nam)) return null;
  return loadEngine().truThangTrongThangDuong(thang, nam, 420);
}

/** Ngũ hành của một thiên can / địa chi — đọc bảng của CHÍNH engine (tô màu ảnh tứ trụ). */
export function hanhCanChi(x: string): string {
  const e = loadEngine();
  return e.hanhCan[x] || e.hanhChi[x] || '';
}

export type TuBinh = Rec;

/** Giờ:phút chính xác (giờ của lịch) nếu hợp lệ VÀ cùng canh với `hourBranch`. */
function exactTime(b: BirthParams): { gioLich?: number; phutLich?: number } {
  const h = b.hour, m = b.minute ?? 0;
  if (!Number.isInteger(h) || h! < 0 || h! > 23 || !Number.isInteger(m) || m < 0 || m > 59) return {};
  // Lệch canh = hai trường mâu thuẫn ⇒ tin hourBranch (trụ giờ đã đi theo nó).
  if (GIO_HOURS[b.hourBranch!] !== (h! % 2 === 1 ? h! : (h! + 23) % 24)) return {};
  return { gioLich: h, phutLich: m };
}

/**
 * Đoạn khoá cache lá số cho Bát Tự lịch cn/kr/jp (`lasoKey`, lib/portraits/cache.ts):
 * `tk:<chỉ số mốc tiết>` CHỈ khi có giờ:phút chính xác VÀ thời điểm sinh cách mốc
 * tiết gần nhất < 1 ngày — chỉ ở đó hai người cùng canh giờ mới ra trụ tháng khác
 * nhau. Ngoài cửa sổ đó (và mọi lá số vn) trả null ⇒ khoá y như trước W3b, không
 * mồ côi cache/quyền sở hữu của khách đã trả. Dùng CHỈ SỐ TIẾT chứ không dùng phút:
 * cùng tiết thì cùng kết quả, khoá không vỡ vụn theo từng phút.
 */
export function tietKhiKhoa(birth: BirthParams): string | null {
  const lich = lichOf(birth);
  if (lich === 'vn' || birth.hourBranch == null || birth.hourBranch < 0 || birth.hourBranch > 11) return null;
  const t = exactTime(birth);
  if (t.gioLich == null) return null;
  const dl = solarDateOf(birth);
  if (!dl) return null;
  const r = loadEngine().tietKhiCuaThoiDiem(dl.day, dl.month, dl.year, t.gioLich, t.phutLich ?? 0, lich);
  return r && r.gan ? `tk:${r.i}` : null;
}

export interface ComputeTuBinhResult {
  ok: boolean;
  error?: string;
  data?: TuBinh;
}

/**
 * Tính bát tự. Engine cần ngày DƯƠNG (tiết khí) — `birth.isLunar` thì đổi âm →
 * dương trước (`solarDateOf`). Trước đây ngày âm đi thẳng vào `ngayDL/thangDL`
 * ⇒ tứ trụ sai hoàn toàn cho người nhập âm lịch trong chat.
 * namXem mặc định = năm hiện tại (VN) để xác định đại vận hiện tại / lưu niên / tuổi xem.
 */
export function computeTuBinh(birth: BirthParams, namXem?: number): ComputeTuBinhResult {
  const { hourBranch, gender } = birth;

  if (!birth.day || !birth.month || !birth.year) {
    return { ok: false, error: 'Thiếu ngày/tháng/năm sinh.' };
  }
  if (hourBranch == null || hourBranch < 0 || hourBranch > 11) {
    return { ok: false, error: 'Thiếu hoặc sai giờ sinh (cần địa chi giờ 0=Tý..11=Hợi).' };
  }
  if (gender !== 'nam' && gender !== 'nu') {
    return { ok: false, error: 'Thiếu giới tính (nam/nu).' };
  }

  // `birth.lich` (nơi sinh ngoài VN): ngày/giờ ĐÃ là giờ của lịch đó (form quy
  // đổi) — tứ trụ tính từ chính ngày giờ ấy nên nhất quán với lá số Tử Vi cùng
  // người. Âm → dương thì dò bằng bảng của đúng lịch đó (`solarDateOf`).
  // cn/kr/jp: trụ tháng/năm theo THỜI ĐIỂM vào tiết, so với giờ:phút sinh
  // `birth.hour`/`birth.minute` (thiếu ⇒ đầu canh giờ, GIO_HOURS). vn: engine
  // vẫn xét tiết theo NGÀY — nợ cũ, ghi ở docs/luat/engine-cophap.md.
  const dl = solarDateOf(birth);
  if (!dl) {
    return { ok: false, error: 'Ngày âm lịch không tồn tại hoặc ngoài tầm lịch (1900–2100).' };
  }
  const { day, month, year } = dl;

  try {
    const { tinhBatTu } = loadEngine();
    const hour = GIO_HOURS[hourBranch];
    const lich = lichOf(birth);
    const bt = tinhBatTu({
      ngayDL: day,
      thangDL: month,
      namDL: year,
      gio: hour,
      gioitinh: gender,
      namXem: namXem ?? currentNamXem(),
      ...(lich !== 'vn' ? exactTime(birth) : {}),
      ...(lich !== 'vn' ? { lich } : {}),
    });
    if (!bt || !bt.tuTru) return { ok: false, error: 'Engine không trả về tứ trụ.' };
    return { ok: true, data: bt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi engine tử bình' };
  }
}
