// lib/engine/menhly.ts
// ============================================================
// Server-compute cho BATCH 2 tool Mệnh Lý / Huyền Học (nhẹ, deterministic):
// nạp âm, kim lâu & tam tai, ngũ hành tên, thần số học, bát trạch (mệnh quái),
// kinh dịch (gieo quẻ → quái từ hào).
//
// NGUYÊN TẮC: chỉ tính phần deterministic CHẮC CHẮN (can chi/nạp âm, tuổi mụ,
// mệnh quái + đông/tây tứ mệnh, life path, quái từ 6 hào). KHÔNG hardcode bảng
// dễ sai (64 hướng du niên bát trạch, tên 64 quẻ King Wen) — để rail (LLM) luận
// tiếp từ dữ liệu thật, giống pattern chọn-ngày/đặt-tên.
//
// Mỗi compute* trả CHÍNH shape mà extract*Context (prompts.ts) đọc. Client gửi
// input thô → Zalo/native không cần JS helper.
// ============================================================

import { ccInfo } from '@/lib/engine/diachi';

type Rec = Record<string, unknown>;

// ── NẠP ÂM: năm → can chi + nạp âm + hành ──────────────────
export function computeNapAm(input: Rec): Rec | null {
  const nam = Number(input.nam);
  const i = ccInfo(nam);
  if (!i) return null;
  return { nam, canChi: i.canChi, napAm: i.napAm, hanh: i.hanh, chi: i.chi };
}

// KIM LÂU & TAM TAI đã chuyển sang module client dùng chung
// public/tools-shared/kim-lau.js (nguồn chuẩn = trang standalone). Rail nhận
// data client gửi (run.ts pass-through) → không tính lại server-side ở đây.

// ── NGŨ HÀNH TÊN: mệnh nạp âm của chủ + tên → ngũ hành nền ───
// Ngũ hành từng CHỮ trong tên là bán-định-tính (theo âm/nghĩa) → để rail luận;
// server chỉ cấp mệnh nạp âm/hành làm mốc bồi/khắc.
export function computeNguHanhTen(input: Rec): Rec | null {
  const nam = Number(input.nam);
  const info = ccInfo(nam);
  if (!info || !input.ten) return null;
  return {
    ten: input.ten,
    nam,
    canChi: info.canChi,
    napAm: info.napAm,
    hanh: info.hanh,
  };
}

// ── THẦN SỐ HỌC: ngày sinh → số chủ đạo (Life Path, Pythagorean) ──
function reduceToCore(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((s, d) => s + Number(d), 0);
  }
  return n;
}
export function computeThanSoHoc(input: Rec): Rec | null {
  const dd = Number(input.dd), mm = Number(input.mm), yyyy = Number(input.yyyy);
  if (!dd || !mm || !yyyy) return null;
  const allDigits = String(dd) + String(mm) + String(yyyy);
  const rawSum = allDigits.split('').reduce((s, d) => s + Number(d), 0);
  const lifePath = reduceToCore(rawSum);
  const birthday = reduceToCore(dd);
  return {
    ten: input.ten || '',
    dob: `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`,
    soChuDao: lifePath,
    soNgaySinh: birthday,
    isMaster: [11, 22, 33].includes(lifePath),
  };
}

// ── BÁT TRẠCH: năm + giới → cung phi (mệnh quái) + đông/tây tứ mệnh ──
// Cung phi Lạc Việt: t = tổng chữ số năm rút về 1 chữ số.
//   Nam <2000: 11-t · Nam ≥2000: 9-t (>9 trừ 9; =5 → 2 Khôn)
//   Nữ  <2000:  t+4 · Nữ  ≥2000: t+6 (>9 trừ 9; =5 → 8 Cấn)
//   0 → 9. Đông tứ mệnh: 1,3,4,9 · Tây tứ mệnh: 2,6,7,8.
const QUAI: Record<number, { ten: string; hanh: string }> = {
  1: { ten: 'Khảm', hanh: 'Thủy' },
  2: { ten: 'Khôn', hanh: 'Thổ' },
  3: { ten: 'Chấn', hanh: 'Mộc' },
  4: { ten: 'Tốn', hanh: 'Mộc' },
  6: { ten: 'Càn', hanh: 'Kim' },
  7: { ten: 'Đoài', hanh: 'Kim' },
  8: { ten: 'Cấn', hanh: 'Thổ' },
  9: { ten: 'Ly', hanh: 'Hỏa' },
};
function sumToOne(year: number): number {
  let s = String(year).split('').reduce((a, d) => a + Number(d), 0);
  while (s > 9) s = String(s).split('').reduce((a, d) => a + Number(d), 0);
  return s === 0 ? 9 : s;
}
export function computeBatTrach(input: Rec): Rec | null {
  const nam = Number(input.nam);
  const gioiTinh = input.gioiTinh === 'nu' ? 'nu' : 'nam';
  const info = ccInfo(nam);
  if (!info) return null;
  const t = sumToOne(nam);
  let q: number;
  if (gioiTinh === 'nam') {
    q = (nam >= 2000 ? 9 - t : 11 - t);
    if (q > 9) q -= 9;
    if (q <= 0) q += 9;
    if (q === 5) q = 2;
  } else {
    q = (nam >= 2000 ? t + 6 : t + 4);
    if (q > 9) q -= 9;
    if (q === 5) q = 8;
  }
  const quai = QUAI[q] || QUAI[2];
  const dongTu = [1, 3, 4, 9].includes(q);
  return {
    nam,
    gioiTinh,
    canChi: info.canChi,
    napAm: info.napAm,
    hanh: info.hanh,
    menhQuai: quai.ten,
    quaiHanh: quai.hanh,
    nhom: dongTu ? 'Đông tứ mệnh' : 'Tây tứ mệnh',
    huongTot: dongTu
      ? 'Bắc (Khảm), Nam (Ly), Đông (Chấn), Đông Nam (Tốn)'
      : 'Tây Bắc (Càn), Tây Nam (Khôn), Tây (Đoài), Đông Bắc (Cấn)',
  };
}

// ── KINH DỊCH: 6 hào gieo (client random) → quái hạ/thượng + hào động ──
// Hào: 6=lão âm(động→dương) · 7=thiếu dương · 8=thiếu âm · 9=lão dương(động→âm).
// Server chỉ resolve QUÁI (8 quẻ đơn, chắc chắn) + hào động; TÊN 64 quẻ King Wen
// để rail (LLM) định danh + luận — tránh hardcode bảng dễ sai.
const TRIGRAM = ['Khôn', 'Cấn', 'Khảm', 'Tốn', 'Chấn', 'Ly', 'Đoài', 'Càn'];
function trigram(b1: number, b2: number, b3: number): string {
  return TRIGRAM[b1 * 4 + b2 * 2 + b3];
}
export function computeKinhDich(input: Rec): Rec | null {
  const hao = input.hao;
  if (!Array.isArray(hao) || hao.length !== 6) return null;
  const vals = hao.map((h) => Number(h));
  if (vals.some((v) => ![6, 7, 8, 9].includes(v))) return null;
  // Dương nếu 7/9, âm nếu 6/8. Động nếu 6/9.
  const yang = vals.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const dong = vals.map((v) => v === 6 || v === 9);
  // hào 1 dưới cùng → quái hạ = hào 1..3, quái thượng = hào 4..6
  const quaiHa = trigram(yang[0], yang[1], yang[2]);
  const quaiThuong = trigram(yang[3], yang[4], yang[5]);
  const dongHao = dong.map((d, i) => (d ? i + 1 : 0)).filter(Boolean);
  // Biến quái: lật hào động
  const bienYang = yang.map((y, i) => (dong[i] ? 1 - y : y));
  const bienHa = trigram(bienYang[0], bienYang[1], bienYang[2]);
  const bienThuong = trigram(bienYang[3], bienYang[4], bienYang[5]);
  const haoLines = vals.map((v, i) => ({
    vi: i + 1,
    am_duong: yang[i] ? 'dương' : 'âm',
    dong: dong[i],
  }));
  return {
    question: input.question || '',
    quaiHa,
    quaiThuong,
    tenQuaiMoTa: `Thượng ${quaiThuong} / Hạ ${quaiHa}`,
    dongHao,
    bienQuai: dongHao.length ? `Thượng ${bienThuong} / Hạ ${bienHa}` : '',
    haoLines,
  };
}
