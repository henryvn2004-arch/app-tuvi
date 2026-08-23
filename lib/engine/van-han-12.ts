// lib/engine/van-han-12.ts
// ============================================================
// VẬN HẠN 12 THÁNG TỚI — khung deterministic của tool `van-han-nam`.
//
// Tool này là LÁT CẮT SÂU của bản Luận Giải: chỉ tiểu vận năm + 12 nguyệt vận,
// tính TỪ THÁNG ÂM NGƯỜI DÙNG ĐANG SỐNG. File này KHÔNG tính lại gì về cổ pháp
// — nó gọi `lunarMonthsFrom` (phép lịch) + `resolveNguyetHanForLunarMonth`
// (nguồn duy nhất của phép "tháng âm này rơi vào cung nào", dùng chung với rail
// chat + thẻ Vận Ngày) rồi gói lại thành 12 khối đọc được.
//
// 🔴 Vì sao khung là THÁNG ÂM chứ không phải tháng dương (đổi 2026-08-19):
// nguyệt hạn là khái niệm của lịch ÂM — nó đổi ở mùng 1 âm, không đổi ở ngày 1
// dương. Bản đầu trình bày theo tháng dương nên gần như tháng nào cũng bị hai
// tháng âm cắt ngang (vd 8/2026: ngày 1–12 còn tháng 6 ÂL, từ 13 đã sang tháng
// 7 ÂL) ⇒ mỗi phần phải chẻ đôi "nửa đầu thế này, nửa sau thế kia", đọc rời rạc
// mà chẳng vì lý do cổ pháp nào — chỉ vì cái khung mình tự chọn. Nay mỗi phần là
// TRỌN một tháng âm; ngày dương chỉ đóng vai NHÃN để người đọc biết nó rơi vào
// quãng nào của lịch họ đang dùng.
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

import {
  lunarMonthsFrom,
  resolveNguyetHanForLunarMonth,
  dmy,
  nhanThangAL,
  nhanThangALDay,
  type LunarMonthSpan,
} from '@/lib/engine/van-ngay';
import { hanClusterLayers, describeThangForLLM } from '@/lib/agent/tools';
import { matchVanHanCombos, type LayerCung } from '@/lib/agent/vanHanCombos';

// `dmy`/`nhanThangAL`/`nhanThangALDay` dời sang `van-ngay.ts` (2026-08-19, vá
// rail `tra_nguyet_van`) — re-export ở đây để `app/api/van-han-nam/route.ts`
// (import chúng TỪ file này) không phải sửa gì. `describeThangForLLM` cũng dời
// sang `tools.ts` cùng lý do (nó cần `describeHanCungRich`, mà file đó không
// được import ngược `van-han-12.ts`) — re-export tương tự.
export { dmy, nhanThangAL, nhanThangALDay, describeThangForLLM };

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

/** Số tháng của khung — cố định 12, khai thành hằng để chỗ nào cũng đọc một nguồn. */
export const SO_THANG = 12;

const SAT = ['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp'];
const BAI = ['Thiên Khốc', 'Thiên Hư', 'Tang Môn', 'Bạch Hổ', 'Đại Hao', 'Tiểu Hao'];
const CAT = ['Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt', 'Tả Phụ', 'Hữu Bật',
  'Lộc Tồn', 'Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa'];

/** MỘT tháng âm trong khung 12 tháng. */
export interface ThangKhung {
  /** Thứ tự trong khung, 1..12 (1 = tháng âm đang sống). */
  stt: number;
  thangAL: number;
  namAL: number;
  isLeap: boolean;
  /** 'Tháng 1 ÂL' (kèm 'nhuận' khi cần) — nhãn NGẮN cho thanh nhảy/chip. */
  nhan: string;
  /** 'Tháng 1 ÂL (15/2/2026 – 13/3/2026)' — nhãn ĐẦY ĐỦ cho tiêu đề phần. */
  nhanDay: string;
  /** '15/2/2026' – '13/3/2026' (dương lịch). */
  duongTu: string;
  duongDen: string;
  soNgay: number;
  /** Tháng âm đang chứa hôm nay. */
  dangDienRa: boolean;
  cungNguyetHan: string;
  chinhTinh: string[];
  catTinh: string[];
  satTinh: string[];
  baiTinh: string[];
  /** Nền của tháng — tiểu hạn & lưu niên của năm âm mà tháng này thuộc về. */
  cungTieuHan: string;
  cungLuuNien: string;
  /** Tuổi mụ trong năm âm đó. */
  tuoi: number;
  /** Tổ hợp sao chéo tầng (đại vận · tiểu hạn · lưu niên · nguyệt hạn). */
  toHop: { ten: string; loai: string; tomTat: string }[];
  /** Lỗi engine cho riêng tháng này (ngoài phạm vi lá số…) — null nếu ổn. */
  loi: string | null;
}

export interface Khung12Thang {
  /** Nhãn tháng âm đầu/cuối khung. */
  tuNhan: string;
  denNhan: string;
  /** Dải ngày dương của cả khung. */
  duongTu: string;
  duongDen: string;
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

/** 12 tháng âm kể từ tháng âm chứa ngày dương dd/mm/yy. */
export function spans12(dd: number, mm: number, yy: number): LunarMonthSpan[] {
  return lunarMonthsFrom(dd, mm, yy, SO_THANG);
}

/**
 * Khung 12 tháng ÂM tới, tính từ tháng âm chứa ngày dương dd/mm/yy.
 *
 * Mỗi tháng âm nằm TRỌN trong một năm âm ⇒ đúng một tiểu hạn, một nguyệt hạn.
 * Không còn khối "đoạn" nào để chẻ — đó là cả điểm của việc đổi khung sang âm lịch.
 */
export function buildKhung12Thang(lasoData: AnyRec, dd: number, mm: number, yy: number): Khung12Thang {
  const palaces: AnyRec[] = lasoData?.palaces || [];
  const spans = spans12(dd, mm, yy);
  const thangs: ThangKhung[] = [];

  spans.forEach((s, i) => {
    const base = {
      stt: i + 1,
      thangAL: s.thangAL, namAL: s.namAL, isLeap: s.isLeap,
      nhan: nhanThangAL(s), nhanDay: nhanThangALDay(s),
      duongTu: dmy(s.tu), duongDen: dmy(s.den), soNgay: s.soNgay,
      dangDienRa: s.dangDienRa,
    };
    const rs = resolveNguyetHanForLunarMonth(lasoData, s.thangAL, s.namAL);
    if (!rs.ok) {
      thangs.push({
        ...base,
        cungNguyetHan: '?', chinhTinh: [], catTinh: [], satTinh: [], baiTinh: [],
        cungTieuHan: '?', cungLuuNien: '?', tuoi: 0, toHop: [], loi: rs.error,
      });
      return;
    }
    const p = palaces[rs.nguyetHanIdx];
    // Cát/sát/bại đọc trên CẢ chùm tam phương tứ chính — cổ pháp luận hạn không
    // chỉ đọc sao tọa thủ (cùng luật với describeHanCungRich).
    const chum = [p, palaces[(rs.nguyetHanIdx + 4) % 12], palaces[(rs.nguyetHanIdx + 8) % 12], palaces[(rs.nguyetHanIdx + 6) % 12]];
    const gom = (list: string[]) => [...new Set(chum.flatMap((x) => starsOf(x, list)))];
    const dv = (lasoData.daiVans || [])[rs.tv?.dvIdx];
    const layers: LayerCung[] = [
      { label: 'đại vận', palace: dv ? palaces[dv.cungIdx] : null },
      ...hanClusterLayers(palaces, rs.tieuHanIdx, 'tiểu hạn'),
      ...hanClusterLayers(palaces, rs.luuNienIdx, 'lưu niên'),
      ...hanClusterLayers(palaces, rs.nguyetHanIdx, 'nguyệt hạn'),
    ];
    thangs.push({
      ...base,
      cungNguyetHan: String(p?.cungName || '?'),
      chinhTinh: chinhTinhOf(p),
      catTinh: gom(CAT), satTinh: gom(SAT), baiTinh: gom(BAI),
      cungTieuHan: String(rs.tv?.tieuHanCung || '?'),
      cungLuuNien: String(rs.tv?.luuNienCung || '?'),
      tuoi: Number(rs.tv?.tuoi) || 0,
      toHop: matchVanHanCombos(layers, 5).map((h) => ({ ten: h.ten, loai: h.loai, tomTat: h.tomTat })),
      loi: null,
    });
  });

  const first = spans[0]!, last = spans[spans.length - 1]!;
  return {
    tuNhan: nhanThangAL(first), denNhan: nhanThangAL(last),
    duongTu: dmy(first.tu), duongDen: dmy(last.den),
    thangs,
  };
}
