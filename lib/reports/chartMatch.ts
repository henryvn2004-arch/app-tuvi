// lib/reports/chartMatch.ts
// ============================================================
// Nối một mục Sổ Lá Số (`user_charts.birth`, shape ChartBirth) với các dòng
// đã có trong `user_reports` — cho trang Tủ Báo Cáo biết "lá số này đã có
// report nào".
//
// CHỈ PHỦ 7 TOOL CHÂN DUNG (HISTORY_TABLE) — report_key của chúng LÀ
// `lasoKey()`, tính thẳng từ birth params không cần chạy engine an sao.
// CỐ Ý KHÔNG phủ 4 tool slug tất định (laso/tu-binh/chu-trinh-cuoc-doi/
// van-han-nam): slug của chúng nhúng canChiNam/gioChi — giá trị SUY RA từ
// việc an sao, không tái tạo được chỉ từ birth thô mà không chạy engine.
// Đoán mò công thức slug ở đây là đúng thứ CLAUDE.md cấm ("KHÔNG sửa mò một
// công thức"); bỏ qua 4 tool đó chỉ làm trang thiếu badge "đã có", không sai
// dữ liệu — Tủ Báo Cáo vẫn luôn có nút "Xem/Tạo" dẫn thẳng tới tool.
// ============================================================

import type { ChartBirth } from '@/lib/charts/key';
import { hourIndexOf } from '@/lib/charts/key';
import { lasoKey, HISTORY_TABLE, type PortraitToolId } from '@/lib/portraits/cache';
import type { BirthParams } from '@/lib/contract/v1';

const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * true nếu birth đánh dấu âm lịch — BA cách đánh dấu cùng tồn tại trong dữ
 * liệu cũ (xem `public/shell.js` dòng ~1502, KHÔNG đổi để khớp nguyên văn).
 */
function isLunarBirth(b: Record<string, unknown>): boolean {
  return b.isLunar === true || b.amlich === true || b.duongLich === false;
}

/** ChartBirth → BirthParams (contract của `lasoKey()`). null nếu thiếu ngày sinh. */
export function birthParamsFromChart(b: ChartBirth): BirthParams | null {
  const ngay = num(b.ngay), thang = num(b.thang), nam = num(b.nam);
  if (!ngay || !thang || !nam) return null;
  return {
    isLunar: isLunarBirth(b as Record<string, unknown>),
    year: nam,
    month: thang,
    day: ngay,
    hourBranch: hourIndexOf(b),
    gender: b.gioitinh === 'nu' ? 'nu' : 'nam',
  };
}

const PORTRAIT_TOOL_IDS = Object.keys(HISTORY_TABLE) as PortraitToolId[];

/**
 * Với một lá số đã lưu, trả về report_key (lasoKey) của từng tool chân dung —
 * để so khớp với `report_key` trong `user_reports`.
 */
export function portraitReportKeysForChart(b: ChartBirth): Partial<Record<PortraitToolId, string>> {
  const birth = birthParamsFromChart(b);
  if (!birth) return {};
  const out: Partial<Record<PortraitToolId, string>> = {};
  for (const toolId of PORTRAIT_TOOL_IDS) out[toolId] = lasoKey(birth);
  return out;
}
