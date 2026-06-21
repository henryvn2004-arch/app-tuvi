// lib/engine/diachi.ts
// ============================================================
// Server-compute cho 3 kịch bản NHẸ (Sprint 1.5): sinh con, chọn
// ngày, đặt tên. Đây là logic ĐỊA CHI / CAN CHI / NẠP ÂM thuần —
// KHÔNG nạp engine vanilla, chỉ port nguyên các hàm _cc* từ
// public/tuvi-chat.html (parity tuyệt đối, cùng bảng hằng số).
//
// Mỗi compute* trả về CHÍNH shape mà extract*Context trong
// lib/agent/prompts.ts đang đọc (một bộ não). Client gửi input thô
// → Zalo/native không cần JS helper.
// ============================================================

import { currentNamXem } from '@/lib/engine/namxem';

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const NA = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
const NA_TEN = ['Hải Trung Kim', 'Lò Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạc Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Dịch Thổ', 'Thoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
const LUC_HOP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const LUC_XUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const TAM_HOP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const TAM_HINH = [[2, 11, 8], [0, 3, 6], [1, 4, 7]];

export interface CanChiInfo {
  canChi: string;
  can: string;
  chi: string;
  chiIdx: number;
  hanh: string;
  napAm: string;
}

export function ccInfo(year: number): CanChiInfo | null {
  if (!year || isNaN(year)) return null;
  const pos = (((year - 1924) % 60) + 60) % 60;
  return {
    canChi: CAN[pos % 10] + ' ' + CHI[pos % 12],
    can: CAN[pos % 10],
    chi: CHI[pos % 12],
    chiIdx: pos % 12,
    hanh: NA[Math.floor(pos / 2)],
    napAm: NA_TEN[Math.floor(pos / 2)],
  };
}

function ccThangCanChi(thang: number, nam: number): string {
  const pos = (((nam - 1924) % 60) + 60) % 60;
  const base = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][pos % 10];
  return CAN[(base + (thang - 1) * 2) % 10] + ' ' + CHI[(2 + thang - 1) % 12];
}

const inPair = (pairs: number[][], a: number, b: number) =>
  pairs.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const inGroup = (groups: number[][], a: number, b: number) =>
  groups.some((g) => g.indexOf(a) > -1 && g.indexOf(b) > -1);

function scoreYear(chiIdx: number, chiBoIdx: number, chiMeIdx: number): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (inPair(LUC_HOP, chiIdx, chiBoIdx)) { score += 3; reasons.push('Lục Hợp bố ✓'); }
  else if (inGroup(TAM_HOP, chiIdx, chiBoIdx)) { score += 2; reasons.push('Tam Hợp bố'); }
  else if (inPair(LUC_XUNG, chiIdx, chiBoIdx)) { score -= 3; reasons.push('Lục Xung bố ✗'); }
  else if (inGroup(TAM_HINH, chiIdx, chiBoIdx)) { score -= 2; reasons.push('Tam Hình bố'); }
  if (inPair(LUC_HOP, chiIdx, chiMeIdx)) { score += 3; reasons.push('Lục Hợp mẹ ✓'); }
  else if (inGroup(TAM_HOP, chiIdx, chiMeIdx)) { score += 2; reasons.push('Tam Hợp mẹ'); }
  else if (inPair(LUC_XUNG, chiIdx, chiMeIdx)) { score -= 3; reasons.push('Lục Xung mẹ ✗'); }
  else if (inGroup(TAM_HINH, chiIdx, chiMeIdx)) { score -= 2; reasons.push('Tam Hình mẹ'); }
  return { score, reasons };
}

type Rec = Record<string, unknown>;

// ── SINH CON: bố + mẹ → bảng 15 năm tới (điểm địa chi) ──────
export function computeSinhCon(input: Rec): Rec | null {
  const namBo = Number(input.namBo);
  const namMe = Number(input.namMe);
  const iB = ccInfo(namBo);
  const iM = ccInfo(namMe);
  if (!iB || !iM) return null;
  const cur = currentNamXem();
  const rows = [];
  for (let y = cur; y < cur + 15; y++) {
    const info = ccInfo(y)!;
    const r = scoreYear(info.chiIdx, iB.chiIdx, iM.chiIdx);
    rows.push({ year: y, canChi: info.canChi, hanh: info.hanh, score: r.score, reasons: r.reasons });
  }
  return {
    bo: { canChi: iB.canChi, napAm: iB.napAm, chiIdx: iB.chiIdx },
    me: { canChi: iM.canChi, napAm: iM.napAm, chiIdx: iM.chiIdx },
    rows,
  };
}

// ── CHỌN NGÀY: người xem + tháng/năm sự kiện → can chi ──────
export function computeChonNgay(input: Rec): Rec | null {
  const namSinh = Number(input.namSinh);
  const thangNum = Number(input.thangNum);
  const namNum = Number(input.namNum);
  const info = ccInfo(namSinh);
  if (!info || !thangNum || !namNum) return null;
  return {
    suKien: input.suKien,
    hoTen: input.hoTen,
    namSinh,
    canChi: info.canChi,
    napAm: info.napAm,
    thangCanChi: ccThangCanChi(thangNum, namNum),
    namCanChi: ccInfo(namNum)?.canChi || '',
    thangNum,
    namNum,
  };
}

// ── ĐẶT TÊN: họ + giới tính + năm sinh con/bố/mẹ → can chi ──
export function computeDatTen(input: Rec): Rec | null {
  const iCon = ccInfo(Number(input.namCon));
  const iBo = ccInfo(Number(input.namBo));
  const iMe = ccInfo(Number(input.namMe));
  if (!input.ho || !iCon || !iBo || !iMe) return null;
  return {
    ho: input.ho,
    gioiTinh: input.gioiTinh === 'nu' ? 'nu' : 'nam',
    canChiCon: iCon.canChi,
    napAmCon: iCon.napAm,
    canChiBo: iBo.canChi,
    napAmBo: iBo.napAm,
    canChiMe: iMe.canChi,
    napAmMe: iMe.napAm,
  };
}
