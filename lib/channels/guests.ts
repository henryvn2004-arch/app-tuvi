// lib/channels/guests.ts
// ============================================================
// MỜI THẦY KHÁC cho kênh chat — bản server của hàng "Nghe thêm môn khác" trên
// web (`GUEST_MASTERS` / `pickGuests` / `hoiChanDu` / `INVITE_MASTER_NAMES`
// trong public/shell.js). Engine phía sau DÙNG CHUNG với web: `addressMaster`
// (thầy khách có tool riêng, lib/tools/registry.ts) và `hoiChan` (3 thầy cùng
// xem một quyết định lớn) của ChatRequestV1. Đổi danh sách thầy khách/từ khoá
// ở web thì sửa cả ở đây — hai bên phải mời ĐÚNG cùng thầy cho cùng câu hỏi.
// (Bản web cộng thêm 1 điểm khi đúng CUNG; kênh chat không có bước dò cung
// nên chỉ chấm theo cụm từ — hoà điểm vẫn giữ thứ tự khai báo như web.)
// ============================================================

import type { BirthParams, ChatRequestV1 } from '@/lib/contract/v1';

export type GuestId = NonNullable<ChatRequestV1['addressMaster']>;

interface Guest {
  id: GuestId;
  ten: string;
  mon: string;
  kw: string[];
  macDinh?: boolean;
  can?: (b: BirthParams) => boolean;
}

export const GUESTS: Guest[] = [
  { id: 'dieu-khong', ten: 'Diệu Không', mon: 'Sự nghiệp, tiền bạc',
    kw: ['tiền bạc', 'kiếm tiền', 'dòng tiền', 'ra tiền', 'tiền vào', 'giữ tiền', 'tiền nong', 'tài chính', 'làm ăn', 'kinh doanh', 'buôn bán', 'đầu tư', 'tiền lương', 'tăng lương', 'thu nhập', 'công việc', 'sự nghiệp', 'thăng tiến', 'nghỉ việc', 'chuyển việc', 'đổi việc', 'khoản nợ', 'vay tiền', 'chi tiêu', 'thu hồi'] },
  { id: 'nhat-nguyen', ten: 'Nhật Nguyên', mon: 'Vận tháng, chọn ngày',
    kw: ['tháng nào', 'tháng này', 'tháng sau', 'tháng tới', 'khi nào', 'lúc nào', 'bao giờ', 'thời điểm', 'chọn ngày', 'ngày nào', 'cuối năm', 'đầu năm', 'tuần này', 'tuần sau', 'sắp tới', 'âm lịch'] },
  { id: 'huyen-khong', ten: 'Huyền Không', mon: 'Phong thủy, hướng nhà',
    kw: ['phong thủy', 'hướng nhà', 'hướng cửa', 'hướng bếp', 'hướng giường', 'bàn làm việc', 'phòng ngủ', 'chuyển nhà', 'mua nhà', 'xây nhà', 'sửa nhà', 'mua đất', 'hướng nào'],
    can: (b) => b.gender === 'nam' || b.gender === 'nu' },
  { id: 'thanh-hu', ten: 'Thanh Hư', mon: 'Thần số học',
    kw: ['con số', 'số điện thoại', 'biển số', 'số nhà', 'số may mắn', 'thần số', 'năm cá nhân', 'số đẹp'],
    can: (b) => !!String(b.name || '').trim() && !b.isLunar },
  { id: 'tam-kinh', ten: 'Tâm Kính', mon: 'Bát Tự, Kỳ Môn', macDinh: true,
    kw: ['năm nay', 'năm sau', 'năm tới', 'vận năm', 'xuất hành', 'giờ nào', 'bát tự', 'tứ trụ'] },
  { id: 'linh-co', ten: 'Linh Cơ', mon: 'Lục Nhâm', macDinh: true,
    kw: ['có nên', 'có thành', 'được không', 'thành không', 'hay không', 'nên hay', 'gieo quẻ'] },
];

const QUYET_DINH_RE =
  /(có nên|nên hay không|hay là thôi|quyết định|ký hợp đồng|mua nhà|mua đất|xây nhà|cưới|kết hôn|ly hôn|đầu tư|nghỉ việc|chuyển việc|đổi việc|nhảy việc|khởi nghiệp|mở công ty|mở quán|mở cửa hàng|kinh doanh riêng|ra riêng|vay ngân hàng|du học|định cư)/;

const lower = (s: string) => String(s || '').toLocaleLowerCase('vi-VN');

export const guestById = (id: string) => GUESTS.find((g) => g.id === id) || null;

/** Câu nút "mời thầy khách" gửi đi — khách thấy nó thành tin của mình. */
export const moiCau = (g: Guest) => `Mời Thầy ${g.ten} cùng xem`;
/** Tin khớp ĐÚNG câu nút `moiCau` → thầy khách đó (so chữ thường). */
export const guestFromMoi = (t: string) => GUESTS.find((g) => lower(moiCau(g)) === lower(t).trim()) || null;

/** Tối đa `n` thầy khách cho câu `q` (bỏ thầy đang tiếp chuyện) — cùng luật web. */
export function pickGuests(q: string, currentId: string, birth: BirthParams, n: number): Guest[] {
  const t = lower(q);
  const ok = GUESTS.filter((g) => g.id !== currentId && (!g.can || g.can(birth)));
  const hit = ok
    .map((g, i) => ({ g, i, sc: g.kw.reduce((s, k) => s + (t.includes(k) ? 2 : 0), 0) }))
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc || a.i - b.i)
    .map((x) => x.g);
  const out = hit.slice(0, n);
  for (const g of ok) if (out.length < n && g.macDinh && !out.includes(g)) out.push(g);
  return out;
}

/** Câu hỏi là một QUYẾT ĐỊNH LỚN ⇒ mời được "hội chẩn" (thầy chính + Tâm Kính +
 *  Linh Cơ). Thầy chính là một trong hai thầy đó thì không. */
export function hoiChanDuoc(q: string, currentId: string): boolean {
  return currentId !== 'tam-kinh' && currentId !== 'linh-co' && QUYET_DINH_RE.test(lower(q));
}

/** "@Tâm Kính …" ở bất kỳ đâu trong câu → id thầy khách (nhiều "@" lấy cái trước). */
export function detectMention(text: string): GuestId | null {
  const t = lower(text);
  let best: GuestId | null = null;
  let at = -1;
  for (const g of GUESTS) {
    const k = t.indexOf('@' + lower(g.ten));
    if (k >= 0 && (at < 0 || k < at)) {
      at = k;
      best = g.id;
    }
  }
  return best;
}
