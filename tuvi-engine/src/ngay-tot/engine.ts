// ============================================================
// NGÀY TỐT — CORE COMPUTE ENGINE
// ============================================================
// Pure functions: nhận ngày dương lịch (dd, mm, yy) → trả về
// toàn bộ metadata cần để gen page SEO.

import { solarToLunar, dayCanChi } from '../lunar/convert.js';
import type { DiaChi } from '../types.js';
import {
  CHI_LIST, TRUC_LIST, TRUC_TINH_CHAT, THANG_AM_TO_CHI,
  NHI_THAP_BAT_TU, TU_TINH_CHAT, TU_EPOCH,
  HOANG_HAC_SAO, THANG_CHI_TO_THANHLONG_DAY_CHI, THAN_12, THAN_12_HOANG_DAO,
  GIO_HOANG_DAO_BY_DAY_CHI,
  TAM_NUONG_AL, NGUYET_KY_AL, DUONG_CONG_KY,
  type Truc, type Tu,
} from './constants.js';

// ─── Julian Day Number (proleptic Gregorian) ────────────────
// Reuse logic giống tuvi-engine/lunar (offset cho ngày 1/1/2000 = 2451545)
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return dd + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// ─── Public types ────────────────────────────────────────────
export interface GioInfo {
  chi: DiaChi;
  range: string;     // "23h-1h"
  sao: string;       // tên sao (Thanh Long, Câu Trận...)
  hoangDao: boolean;
}

export interface NgayTotInfo {
  // ─── Date metadata ─────────────────────────────────────────
  duongLich: { day: number; month: number; year: number };
  amLich: { day: number; month: number; year: number; isLeap: boolean };
  thuTrongTuan: string;  // "Thứ hai", "Chủ nhật", ...

  // ─── Can chi ───────────────────────────────────────────────
  canChiNgay: string;    // "Giáp Tý"
  chiNgay: DiaChi;
  chiThang: DiaChi;      // theo quy ước âm lịch

  // ─── 12 trực ───────────────────────────────────────────────
  truc: Truc;
  trucTinhChat: 'cát' | 'hung' | 'bình';

  // ─── 28 nhị thập bát tú ────────────────────────────────────
  tu: Tu;
  tuTinhChat: 'cát' | 'hung';

  // ─── Sao ngày (hoàng/hắc đạo) ──────────────────────────────
  saoNgay: string;       // tên sao (Thanh Long...)
  saoYNghia: string;     // ý nghĩa
  hoangDao: boolean;     // true nếu là 1 trong 6 sao hoàng đạo

  // ─── Cấm kỵ ────────────────────────────────────────────────
  kyTamNuong: boolean;   // mùng 3/7/13/18/22/27 AL
  kyNguyetKy: boolean;   // mùng 5/14/23 AL
  kyDuongCong: boolean;  // 13 ngày Dương Công

  // ─── 12 giờ ────────────────────────────────────────────────
  gio: GioInfo[];                  // 12 giờ Tý..Hợi
  gioHoangDao: GioInfo[];          // chỉ giờ tốt
  gioHacDao: GioInfo[];            // chỉ giờ xấu

  // ─── Overall (chỉ là rough indicator, chi tiết xem activities) ─
  overallTinhChat: 'tốt' | 'xấu' | 'bình';
}

const THU_TRONG_TUAN = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư',
                        'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const HOUR_RANGES: Record<DiaChi, string> = {
  'Tý':  '23h-1h',
  'Sửu': '1h-3h',
  'Dần': '3h-5h',
  'Mão': '5h-7h',
  'Thìn':'7h-9h',
  'Tỵ':  '9h-11h',
  'Ngọ': '11h-13h',
  'Mùi': '13h-15h',
  'Thân':'15h-17h',
  'Dậu': '17h-19h',
  'Tuất':'19h-21h',
  'Hợi': '21h-23h',
};

// ─── Helpers ─────────────────────────────────────────────────
function computeTruc(chiNgay: DiaChi, chiThang: DiaChi): Truc {
  // Trực Kiến rơi vào ngày có chi = chi tháng
  // Trực kế tiếp theo thứ tự CHI_LIST (Tý→Sửu→...→Hợi)
  const monthIdx = CHI_LIST.indexOf(chiThang);
  const dayIdx = CHI_LIST.indexOf(chiNgay);
  const trucIdx = (dayIdx - monthIdx + 12) % 12;
  return TRUC_LIST[trucIdx]!;
}

function computeTu(dd: number, mm: number, yy: number): Tu {
  const jd = jdFromDate(dd, mm, yy);
  const epochJd = jdFromDate(TU_EPOCH.day, TU_EPOCH.month, TU_EPOCH.year);
  const diff = jd - epochJd;
  const tuIdx = (((TU_EPOCH.tuIndex + diff) % 28) + 28) % 28;
  return NHI_THAP_BAT_TU[tuIdx]!;
}

function computeSaoNgay(chiNgay: DiaChi, chiThang: DiaChi) {
  // Sao Thanh Long rơi vào chi nào tùy chi tháng
  const thanhLongChi = THANG_CHI_TO_THANHLONG_DAY_CHI[chiThang];
  const thanhLongIdx = CHI_LIST.indexOf(thanhLongChi);
  const dayIdx = CHI_LIST.indexOf(chiNgay);
  const saoIdx = (dayIdx - thanhLongIdx + 12) % 12;
  return HOANG_HAC_SAO[saoIdx]!;
}

function computeGio(chiNgay: DiaChi): GioInfo[] {
  const dayIdx = CHI_LIST.indexOf(chiNgay);
  // Thanh Long khởi tại giờ (2 × chi ngày + 8) mod 12, 11 thần sau đi thuận.
  const thanhLongGio = (dayIdx * 2 + 8) % 12;
  // Bảng tra 6 giờ hoàng đạo (verified via xemlicham.com) giữ lại làm ĐỐI CHỨNG:
  // vòng 12 thần phải cho ra đúng tập đó, lệch là một trong hai sai.
  const hoangDaoSet = new Set(GIO_HOANG_DAO_BY_DAY_CHI[chiNgay]);
  const result: GioInfo[] = [];
  for (let i = 0; i < 12; i++) {
    const chi = CHI_LIST[i]!;
    const thanIdx = ((i - thanhLongGio) % 12 + 12) % 12;
    result.push({
      chi,
      range: HOUR_RANGES[chi],
      sao: THAN_12[thanIdx]!,
      hoangDao: THAN_12_HOANG_DAO[thanIdx]!,
    });
    if (THAN_12_HOANG_DAO[thanIdx] !== hoangDaoSet.has(chi)) {
      throw new Error(`Vòng 12 thần lệch bảng giờ hoàng đạo tại ngày ${chiNgay}, giờ ${chi}`);
    }
  }
  return result;
}

// ─── Main compute ────────────────────────────────────────────
export function computeNgayTot(dd: number, mm: number, yy: number): NgayTotInfo {
  const al = solarToLunar(dd, mm, yy);
  const canChiNgay = dayCanChi(dd, mm, yy);
  const chiNgay = canChiNgay.split(' ')[1]! as DiaChi;
  const chiThang = THANG_AM_TO_CHI[al.month]!;

  const truc = computeTruc(chiNgay, chiThang);
  const tu = computeTu(dd, mm, yy);
  const sao = computeSaoNgay(chiNgay, chiThang);
  const gio = computeGio(chiNgay);

  const kyTamNuong = TAM_NUONG_AL.has(al.day);
  const kyNguyetKy = NGUYET_KY_AL.has(al.day);
  const kyDuongCong = DUONG_CONG_KY.has(`${al.month}-${al.day}`);

  // Overall rough tính chất: tích lũy điểm
  let score = 0;
  if (TRUC_TINH_CHAT[truc] === 'cát') score += 2;
  if (TRUC_TINH_CHAT[truc] === 'hung') score -= 2;
  if (TU_TINH_CHAT[tu] === 'cát') score += 1;
  if (TU_TINH_CHAT[tu] === 'hung') score -= 1;
  if (sao.type === 'hoàng') score += 2;
  if (sao.type === 'hắc') score -= 2;
  if (kyTamNuong) score -= 2;
  if (kyNguyetKy) score -= 1;
  if (kyDuongCong) score -= 3;
  const overallTinhChat: 'tốt' | 'xấu' | 'bình' =
    score >= 2 ? 'tốt' : score <= -2 ? 'xấu' : 'bình';

  const date = new Date(yy, mm - 1, dd);
  const thu = THU_TRONG_TUAN[date.getDay()]!;

  return {
    duongLich: { day: dd, month: mm, year: yy },
    amLich: { day: al.day, month: al.month, year: al.year, isLeap: al.isLeap },
    thuTrongTuan: thu,
    canChiNgay,
    chiNgay,
    chiThang,
    truc,
    trucTinhChat: TRUC_TINH_CHAT[truc],
    tu,
    tuTinhChat: TU_TINH_CHAT[tu],
    saoNgay: sao.name,
    saoYNghia: sao.meaning,
    hoangDao: sao.type === 'hoàng',
    kyTamNuong, kyNguyetKy, kyDuongCong,
    gio,
    gioHoangDao: gio.filter(g => g.hoangDao),
    gioHacDao: gio.filter(g => !g.hoangDao),
    overallTinhChat,
  };
}

// ─── Batch helper: 1 tháng (cho page month overview) ────────
export function computeMonth(year: number, month: number): NgayTotInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: NgayTotInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    result.push(computeNgayTot(d, month, year));
  }
  return result;
}
