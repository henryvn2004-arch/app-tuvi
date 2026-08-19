// lib/engine/van-han-12.ts
// ============================================================
// VẬN HẠN 12 THÁNG TỚI — khung deterministic của tool `van-han-nam`.
//
// Tool này là LÁT CẮT SÂU của bản Luận Giải: chỉ tiểu vận năm + 12 nguyệt vận,
// tính TỪ THÁNG NGƯỜI DÙNG ĐANG XEM (không phải từ tháng Giêng). File này KHÔNG
// tính lại gì về cổ pháp — nó gọi `resolveNguyetHanSegments` (nguồn duy nhất
// của phép "tháng này rơi vào cung nào", dùng chung với rail chat + thẻ Vận
// Ngày) rồi gói lại thành 12 khối đọc được.
//
// 🔑 Vì sao ở SERVER chứ không port sang `public/tools-shared/`: phép mô tả một
// cung hạn (`describeHanCungRich`) và bộ khớp tổ hợp sao chéo tầng
// (`matchVanHanCombos`, đọc 958 cách cục từ `public/cach_cuc_all.json`) đều là
// TS ở lớp tool. Chép sang vanilla là bản thứ hai của cùng bộ luật, và hai bản
// sẽ trôi khỏi nhau — bài học `tools-shared` + giá Lượng đã trả giá.
//
// ⚠️ KHÔNG chấm điểm/10 cho tháng. Luật đã chốt trong repo: chỉ ĐẠI VẬN có điểm
// thật; nguyệt hạn luận theo cung + sao, gán điểm là bịa.
// ============================================================

import { resolveNguyetHanSegments } from '@/lib/engine/van-ngay';
import { describeHanCungRich, hanClusterLayers } from '@/lib/agent/tools';
import { matchVanHanCombos, formatComboLines, type LayerCung } from '@/lib/agent/vanHanCombos';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

/** Số tháng của khung — cố định 12, khai thành hằng để chỗ nào cũng đọc một nguồn. */
export const SO_THANG = 12;

const SAT = ['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp'];
const BAI = ['Thiên Khốc', 'Thiên Hư', 'Tang Môn', 'Bạch Hổ', 'Đại Hao', 'Tiểu Hao'];
const CAT = ['Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt', 'Tả Phụ', 'Hữu Bật',
  'Lộc Tồn', 'Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa'];

/** MỘT đoạn hạn trong một tháng dương (tháng bị Tết/giao tháng âm cắt → 2 đoạn). */
export interface DoanThang {
  tuNgay: number;
  denNgay: number;
  thangAL: number;
  namAL: number;
  isLeap: boolean;
  /** Đoạn chứa "hôm nay" (chỉ đúng khi đang xét tháng hiện tại). */
  dangDienRa: boolean;
  cungNguyetHan: string;
  chinhTinh: string[];
  catTinh: string[];
  satTinh: string[];
  baiTinh: string[];
  /** Nền của đoạn — tiểu hạn & lưu niên của ĐÚNG năm âm mà đoạn thuộc về. */
  cungTieuHan: string;
  cungLuuNien: string;
}

export interface ThangKhung {
  /** Thứ tự trong khung, 1..12 (1 = tháng đang xem). */
  stt: number;
  thang: number;
  nam: number;
  /** '8/2026' — nhãn ngắn cho tiêu đề phần. */
  nhan: string;
  doan: DoanThang[];
  /** Tổ hợp sao chéo tầng của đoạn chính (đang diễn ra, hoặc đoạn đầu). */
  toHop: { ten: string; loai: string; tomTat: string }[];
  /** Lỗi engine cho riêng tháng này (ngoài phạm vi lá số…) — null nếu ổn. */
  loi: string | null;
}

export interface Khung12Thang {
  tuThang: number;
  tuNam: number;
  denThang: number;
  denNam: number;
  thangs: ThangKhung[];
}

function starsOf(p: AnyRec | undefined, list: string[]): string[] {
  if (!p) return [];
  const names = ((p.stars as AnyRec[]) || []).map((s) => (typeof s === 'object' && s ? String(s.ten || '') : String(s || '')));
  return list.filter((s) => names.includes(s));
}
function chinhTinhOf(p: AnyRec | undefined): string[] {
  if (!p) return [];
  return ((p.majorStars as AnyRec[]) || [])
    .map((s) => String(s.ten || '') + (s.brightness ? `(${s.brightness})` : '') + (s.hoa ? `[Hóa ${s.hoa}]` : ''))
    .filter(Boolean);
}

/** (thang, nam) + n tháng → (thang, nam). n có thể âm. */
export function addMonths(thang: number, nam: number, n: number): { thang: number; nam: number } {
  const t0 = (nam * 12 + (thang - 1)) + n;
  return { thang: (t0 % 12) + 1, nam: Math.floor(t0 / 12) };
}

/**
 * Khung 12 tháng tới tính TỪ tháng `tuThang/tuNam` (bao gồm chính nó).
 *
 * Mỗi tháng có thể có 2 đoạn hạn (tháng âm cắt ngang); tháng chứa Tết còn đổi
 * cả TIỂU HẠN giữa chừng — `DoanThang.cungTieuHan` vì thế nằm ở tầng ĐOẠN chứ
 * không phải tầng tháng.
 */
export function buildKhung12Thang(lasoData: AnyRec, tuThang: number, tuNam: number): Khung12Thang {
  const palaces: AnyRec[] = lasoData?.palaces || [];
  const thangs: ThangKhung[] = [];

  for (let i = 0; i < SO_THANG; i++) {
    const { thang, nam } = addMonths(tuThang, tuNam, i);
    const rs = resolveNguyetHanSegments(lasoData, thang, nam);
    if (!rs.ok) {
      thangs.push({ stt: i + 1, thang, nam, nhan: `${thang}/${nam}`, doan: [], toHop: [], loi: rs.error });
      continue;
    }
    const doan: DoanThang[] = rs.segments.map((s) => {
      const p = palaces[s.nguyetHanIdx];
      // Cát/sát/bại đọc trên CẢ chùm tam phương tứ chính — cổ pháp luận hạn
      // không chỉ đọc sao tọa thủ (cùng luật với describeHanCungRich).
      const chum = [p, palaces[(s.nguyetHanIdx + 4) % 12], palaces[(s.nguyetHanIdx + 8) % 12], palaces[(s.nguyetHanIdx + 6) % 12]];
      const gom = (list: string[]) => [...new Set(chum.flatMap((x) => starsOf(x, list)))];
      return {
        tuNgay: s.tuNgay, denNgay: s.denNgay, thangAL: s.thangAL, namAL: s.namAL, isLeap: s.isLeap,
        dangDienRa: s.isCurrent,
        cungNguyetHan: String(p?.cungName || '?'),
        chinhTinh: chinhTinhOf(p),
        catTinh: gom(CAT), satTinh: gom(SAT), baiTinh: gom(BAI),
        cungTieuHan: String(s.tv?.tieuHanCung || '?'),
        cungLuuNien: String(s.tv?.luuNienCung || '?'),
      };
    });
    const act = rs.segments.find((s) => s.isCurrent) || rs.segments[0]!;
    const dv = (lasoData.daiVans || [])[act.tv?.dvIdx];
    const layers: LayerCung[] = [
      { label: 'đại vận', palace: dv ? palaces[dv.cungIdx] : null },
      ...hanClusterLayers(palaces, act.tieuHanIdx, 'tiểu hạn'),
      ...hanClusterLayers(palaces, act.luuNienIdx, 'lưu niên'),
      ...hanClusterLayers(palaces, act.nguyetHanIdx, 'nguyệt hạn'),
    ];
    thangs.push({
      stt: i + 1, thang, nam, nhan: `${thang}/${nam}`, doan, loi: null,
      toHop: matchVanHanCombos(layers, 5).map((h) => ({ ten: h.ten, loai: h.loai, tomTat: h.tomTat })),
    });
  }

  const last = addMonths(tuThang, tuNam, SO_THANG - 1);
  return { tuThang, tuNam, denThang: last.thang, denNam: last.nam, thangs };
}

/**
 * Khối dữ liệu MỘT THÁNG cho prompt — cùng ngôn ngữ với tool `tra_nguyet_van`
 * của rail (dùng chung `describeHanCungRich` + `formatComboLines`) để hai bề
 * mặt không nói khác nhau về cùng một tháng.
 */
export function describeThangForLLM(lasoData: AnyRec, thang: number, nam: number): string {
  const rs = resolveNguyetHanSegments(lasoData, thang, nam);
  if (!rs.ok) return `THÁNG ${thang}/${nam}: ${rs.error}`;
  const palaces: AnyRec[] = lasoData.palaces || [];
  const cungTieuHan = [...new Set(rs.segments.map((s) => String(s.tv.tieuHanCung)))];

  let out = `=== THÁNG ${thang}/${nam} DƯƠNG LỊCH ===\n`;
  out += `Nguyệt hạn KHÔNG có điểm riêng — luận theo CÁCH CỤC + sao (tọa thủ + tam hợp xung chiếu) của cung hạn, đại vận chỉ giới hạn biên độ.\n`;

  const act = rs.segments.find((s) => s.isCurrent) || rs.segments[0]!;
  const dv = (lasoData.daiVans || [])[act.tv?.dvIdx];
  if (dv) {
    const dvP = palaces[dv.cungIdx];
    out += `- KHUNG ĐẠI VẬN ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd} tuổi)${dvP?.cungName ? `, đóng tại cung ${dvP.cungName}` : ''}` +
      `${dv.scoring?.tong != null ? `: điểm ${dv.scoring.tong}/10 ${dv.scoring.flag || ''}` : ''} — chỉ GIỚI HẠN BIÊN ĐỘ, KHÔNG quyết định tốt/xấu của tháng.\n`;
  }
  if (cungTieuHan.length === 1) {
    out += `- Nền năm (ÂL ${act.namAL}, tuổi ${act.tv.tuoi}): tiểu hạn cung ${act.tv.tieuHanCung}, lưu niên đại hạn cung ${act.tv.luuNienCung}.\n`;
  }
  if (rs.segments.length > 1) {
    out += `⚠️ Tháng dương này CẮT NGANG 2 tháng âm — 2 ĐOẠN HẠN KHÁC NHAU, PHẢI phân biệt theo NGÀY khi luận, KHÔNG gộp chung một hạn cho cả tháng.\n`;
    if (cungTieuHan.length > 1) {
      out += `⚠️ Hai đoạn còn thuộc HAI NĂM ÂM (giao thừa rơi vào tháng này) nên NỀN TIỂU HẠN cũng đổi giữa chừng — nêu rõ mốc đổi khi luận.\n`;
    }
  }
  for (const s of rs.segments) {
    const nhan = rs.segments.length > 1 ? `ngày ${s.tuNgay}–${s.denNgay}/${thang}` : `cả tháng ${thang}/${nam}`;
    const now = s.isCurrent ? ' — ĐANG DIỄN RA' : '';
    const nen = cungTieuHan.length > 1 ? `, nền tiểu hạn năm ÂL ${s.namAL}: cung ${s.tv.tieuHanCung}` : '';
    out += `- Đoạn ${nhan} (ÂL tháng ${s.thangAL}${s.isLeap ? ' nhuận' : ''})${now}${nen}, nguyệt hạn cung ${palaces[s.nguyetHanIdx]?.cungName || '?'}:\n    ${describeHanCungRich(palaces, s.nguyetHanIdx)}\n`;
  }
  const layers: LayerCung[] = [
    { label: 'đại vận', palace: dv ? palaces[dv.cungIdx] : null },
    ...hanClusterLayers(palaces, act.tieuHanIdx, 'tiểu hạn'),
    ...hanClusterLayers(palaces, act.luuNienIdx, 'lưu niên'),
    ...hanClusterLayers(palaces, act.nguyetHanIdx, 'nguyệt hạn'),
  ];
  out += formatComboLines(matchVanHanCombos(layers));
  return out;
}
