// lib/channels/goi-y.ts
// ============================================================
// GỢI Ý SAU CÂU TRẢ LỜI — THƯA, không phải mỗi lượt (Henry 2026-09-29):
//
//   Cuối câu trả lời thầy đã tự hỏi lại, nên KHÔNG còn chip câu hỏi liên quan
//   mỗi lượt (làm tin loãng).
//   • SẢN PHẨM — CHỈ ở hai lúc: vừa an xong lá số (bản luận giải) · khách vừa
//     chọn kiểm chứng bằng môn khác (bản đầy đủ môn đó). Không khi khách đang
//     đau/bế tắc (bán hàng đúng lúc người ta khóc là mất khách vĩnh viễn).
//   • TÍNH NĂNG — cách nhau ≥ `KHOANG_GOI_Y` lượt, MỘT nút hợp ngữ cảnh. Nhãn là
//     TÊN MÔN / TÊN VIỆC ("Đối chiếu bằng Tử Bình Bát Tự"), KHÔNG tên thầy —
//     khách không biết "Thầy Tâm Kính" xem môn gì. Không lặp nút lần trước.
//
// Hàm ở đây THUẦN (không gọi mạng) trừ nhãn giá — router lo tài khoản/URL.
// Thêm bản đầy đủ cho một môn = thêm một dòng `SAN_PHAM_MON`.
// ============================================================

import type { BirthParams } from '@/lib/contract/v1';
import { chuanHoaDauThanh } from '@/lib/vn-text';
import { loaiCau, nhuCau } from '@/lib/agent/nhip';
import { getToolPrice } from '@/lib/billing/pricing';
import { vndPerCredit } from '@/lib/billing/packages';
import { hoiChanDuoc, moiCau, pickGuests, type GuestId } from './guests';

/** Số LƯỢT hỏi (không phải số tin) tối thiểu giữa hai lần mời tính năng. */
export const KHOANG_GOI_Y = 4;

const norm = (x: string) => chuanHoaDauThanh(String(x || '').toLowerCase().normalize('NFC'));
const cum = (xs: string[]) => xs.map(norm);
const co = (q: string, xs: string[]) => xs.some((x) => q.includes(x));

// ── Tầng 4: tính năng ────────────────────────────────────────────────────
/** Nhãn nút mời thầy khách = TÊN MÔN (khách không biết thầy nào xem môn gì). */
const NHAN_MON: Record<GuestId, string> = {
  'tam-kinh': 'Đối chiếu bằng Tử Bình Bát Tự',
  'linh-co': 'Gieo quẻ Lục Nhâm cho việc này',
  'thanh-hu': 'Xem thêm bằng Thần số học',
  'huyen-khong': 'Xem phong thủy hướng nhà',
  'nhat-nguyen': 'Xem vận từng tháng',
  'dieu-khong': 'Xem riêng tiền bạc, sự nghiệp',
};

/** Nhãn nút mời một thầy khách — tên môn/việc, không tên thầy. */
export const nhanMon = (g: { id: GuestId; mon: string }) => NHAN_MON[g.id] || `Xem thêm môn ${g.mon}`;

const NGUOI_KHAC = cum([
  'người yêu', 'bạn trai', 'bạn gái', 'người ấy', 'anh ấy', 'cô ấy', 'crush', 'vợ tôi', 'chồng tôi', 'vợ mình',
  'chồng mình', 'vợ em', 'chồng em', 'hợp tuổi', 'hợp nhau', 'hợp không', 'tuổi của', 'sếp tôi', 'đối tác',
  'người kia', 'chàng', 'nàng',
]);
const CHON_NGAY = cum([
  'ngày nào', 'ngày tốt', 'chọn ngày', 'xem ngày', 'ngày đẹp', 'khai trương', 'nhập trạch', 'động thổ', 'xuất hành',
  'ngày cưới', 'đám cưới', 'ăn hỏi', 'ký hợp đồng', 'chuyển nhà',
]);

export type TinhNang =
  | { id: string; nut: { title: string; reply: string } }
  | { id: string; nut: { title: string; path: string } };

export interface NguCanhTinhNang {
  cauHoi: string;
  thayId: string;
  birth: BirthParams | null;
  /** Lượt này đã có thầy khách/hội chẩn — thôi mời thêm. */
  daMoi: boolean;
  /** Nút tính năng lượt trước (`GoiYState.tn`). */
  truoc?: string;
  /** Nút biểu đồ hợp câu này (router có bảng biểu đồ) — đường lùi cuối. */
  bieuDo: { nut: string };
}

/** Các ứng viên theo THỨ TỰ ưu tiên; lấy cái đầu tiên khác nút lượt trước. */
export function chonTinhNang(c: NguCanhTinhNang): TinhNang | null {
  const q = norm(c.cauHoi);
  const ds: TinhNang[] = [];
  if (co(q, NGUOI_KHAC)) ds.push({ id: 'tuong-hop', nut: { title: 'Xem hợp tuổi với người đó', path: '/app/tuong-hop' } });
  if (c.birth && !c.daMoi && hoiChanDuoc(c.cauHoi, c.thayId))
    ds.push({ id: 'hoi-chan', nut: { title: 'Hỏi 3 môn cùng lúc', reply: 'Mời 3 thầy hội chẩn' } });
  if (co(q, CHON_NGAY)) ds.push({ id: 'chon-ngay', nut: { title: 'Chọn ngày tốt cho việc này', reply: 'Chọn giúp tôi ngày tốt cho việc này' } });
  if (c.birth && !c.daMoi) {
    const g = pickGuests(c.cauHoi, c.thayId, c.birth, 1)[0];
    if (g) ds.push({ id: `moi:${g.id}`, nut: { title: nhanMon(g), reply: moiCau(g) } });
  }
  if (c.birth) ds.push({ id: `bieu-do:${c.bieuDo.nut}`, nut: { title: c.bieuDo.nut, reply: c.bieuDo.nut } });
  return ds.find((x) => x.id !== c.truoc) ?? ds[0] ?? null;
}

// ── Sản phẩm: CHỈ ở hai lúc (Henry 2026-09-29) ──────────────────────────
// (1) lượt vừa an xong lá số → bản luận giải đầy đủ; (2) lượt khách vừa chọn
// kiểm chứng bằng môn khác (mời thầy khách) → bản đầy đủ của môn đó. Ngoài hai
// lúc này KHÔNG mời sản phẩm. Link sang web, lá số đã điền sẵn (handoff).

/** Khách đang đau/bế tắc — không mời mua lúc này (mời lúc người ta khóc là mất khách). */
export const dangDau = (q: string) => {
  const nc = nhuCau(q);
  return loaiCau(q) === 'be-tac' || nc === 'an-ui' || nc === 'phe-minh';
};

/** Bản đầy đủ trên web của môn thầy khách. Thiếu dòng = môn đó không có trang riêng. */
export const SAN_PHAM_MON: Partial<Record<GuestId, { title: string; path: string }>> = {
  'tam-kinh': { title: 'Xem trọn lá số Bát Tự', path: '/app/bat-tu' },
  'thanh-hu': { title: 'Xem trọn Thần số học', path: '/app/than-so-hoc' },
  'linh-co': { title: 'Gieo quẻ Lục Nhâm đầy đủ', path: '/app/luc-nham' },
  'huyen-khong': { title: 'Xem trọn hướng nhà', path: '/app/bat-trach' },
  'nhat-nguyen': { title: 'Xem vận hạn cả năm', path: '/app/van-han-nam' },
};

export const LOI_LA_SO =
  'Muốn đọc trọn cả lá số (12 cung, các đại vận) thì mở bản luận giải đầy đủ ở nút dưới — hoặc cứ hỏi thầy ngay tại đây.';
export const loiMon = (mon: string) => `Muốn xem trọn phần ${mon} thì mở ở nút dưới — hoặc cứ hỏi tiếp thầy ngay tại đây.`;

/** Nhãn nút bản luận giải — giá VNĐ là chính (luật "VNĐ là giá CHÍNH"), đọc từ
 *  `tool_pricing['laso']`; đọc hụt thì không ghi giá (không chép số). */
export async function nhanLuanGiai(): Promise<string> {
  const [credits, rate] = await Promise.all([getToolPrice('laso'), vndPerCredit()]);
  return credits && credits > 0 ? `Luận giải ${Math.round(credits * rate).toLocaleString('vi-VN')}đ` : 'Luận giải đầy đủ';
}
