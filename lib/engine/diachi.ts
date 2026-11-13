// lib/engine/diachi.ts
// ============================================================
// Server-compute cho 3 kịch bản NHẸ (Sprint 1.5): sinh con, chọn
// ngày, đặt tên. Đây là logic ĐỊA CHI / CAN CHI / NẠP ÂM thuần —
// port nguyên các hàm _cc* từ public/tuvi-chat.html (parity tuyệt đối,
// cùng bảng hằng số). NGOẠI LỆ: trụ THÁNG của Chọn Ngày đi theo TIẾT nên
// đọc từ engine Bát Tự (`truThangTrongThangDuong`, lib/engine/tubinh.ts).
//
// Mỗi compute* trả về CHÍNH shape mà extract*Context trong
// lib/agent/prompts.ts đang đọc (một bộ não). Client gửi input thô
// → Zalo/native không cần JS helper.
// ============================================================

import { currentNamXem } from '@/lib/engine/namxem';
import { truThangTrongThangDuong } from '@/lib/engine/tubinh';

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const NA = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
const NA_TEN = ['Hải Trung Kim', 'Lò Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạc Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Dịch Thổ', 'Thoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
export const LUC_HOP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
export const LUC_XUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
export const TAM_HOP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
export const TAM_HINH = [[2, 11, 8], [0, 3, 6], [1, 4, 7]];

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

/**
 * Trụ tháng của THÁNG DƯƠNG `thang/nam` theo tiết khí, thành MỘT câu cho prompt.
 * Tháng dương luôn vắt qua hai trụ (đổi ở ngày giao tiết, ~4–8 hằng tháng), vd
 * 11/2026: "Mậu Tuất (1–6/11) → Kỷ Hợi (7–30/11, giao tiết 16:53 ngày 7/11)".
 * Đoạn thuộc năm tiết khí khác năm dương (tháng 1, đầu tháng 2 — trước Lập Xuân)
 * ghi kèm năm đó. ⚠️ Từng tính theo CHỈ SỐ THÁNG ÂM (tháng 11 ⇒ Canh Tý) — sai
 * với form nhập tháng DƯƠNG (W35, docs/nhat-ky/2026-11.md).
 */
export function nhanTruThang(thang: number, nam: number): string {
  const doan = truThangTrongThangDuong(thang, nam);
  if (!doan || !doan.length) return '';
  const namCC = ccInfo(nam)?.canChi || '';
  return doan
    .map((d, k) => {
      const ngay = d.tuNgay === d.denNgay ? `${d.tuNgay}/${thang}` : `${d.tuNgay}–${d.denNgay}/${thang}`;
      const p2 = String(d.vaoTiet.phut).padStart(2, '0');
      const tiet = k > 0 ? `, giao tiết ${d.vaoTiet.gio}:${p2} ngày ${d.vaoTiet.ngay}/${d.vaoTiet.thang}` : '';
      const namTiet = d.namCanChi !== namCC ? `, thuộc năm ${d.namCanChi}` : '';
      return `${d.canChi} (${ngay}${tiet}${namTiet})`;
    })
    .join(' → ');
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
    thangCanChi: nhanTruThang(thangNum, namNum),
    namCanChi: ccInfo(namNum)?.canChi || '',
    thangNum,
    namNum,
  };
}

// ── ĐẶT TÊN DOANH NGHIỆP: tuổi chủ + ngành + loại hình → can chi nền ──
// Không có "engine" định danh — LLM gợi tên; server chỉ dựng nền ngũ hành
// nạp âm của người chủ (dùng bồi/khắc cho tên) + ngành nghề làm ngữ cảnh.
export function computeDatTenDn(input: Rec): Rec | null {
  const iChu = ccInfo(Number(input.namChu));
  if (!iChu || !input.nganh) return null;
  return {
    tenGoiY: input.tenGoiY || '',        // tên đang cân nhắc (tùy chọn)
    nganh: input.nganh,                  // ngành nghề
    loaiHinh: input.loaiHinh || '',      // cty/hộ KD/thương hiệu (tùy chọn)
    tenChu: input.tenChu || '',
    canChiChu: iChu.canChi,
    napAmChu: iChu.napAm,
    hanhChu: iChu.hanh,
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
