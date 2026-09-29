// lib/channels/goi-y.ts
// ============================================================
// NÚT GỢI Ý SAU MỖI CÂU TRẢ LỜI — ba tầng, xếp CỐ ĐỊNH (Henry 2026-09-29):
//
//   1–3. CÂU HỎI LIÊN QUAN (model sinh) — luôn có, đứng TRÊN CÙNG. Đây là thứ
//        khách bấm nhiều nhất; bản cũ đẩy nó xuống dưới "Ý Thầy …".
//   4.   TÍNH NĂNG — tối đa MỘT, chọn theo ngữ cảnh câu vừa hỏi. Nhãn là TÊN
//        MÔN / TÊN VIỆC ("Đối chiếu bằng Tử Bình Bát Tự"), KHÔNG tên thầy — khách
//        không biết "Thầy Tâm Kính" xem môn gì. Không lặp một nút hai lượt liền.
//   5.   SẢN PHẨM — tối đa MỘT, chỉ ở THỜI ĐIỂM NÓNG (vừa lập lá số · khách khen ·
//        hỏi sâu 3 lượt liền một chủ đề · sắp hết lượt), cách nhau ≥ `KHOANG_SP`
//        lượt, KHÔNG BAO GIỜ khi khách đang đau/bế tắc (bán hàng đúng lúc người ta
//        khóc là mất khách vĩnh viễn).
//
// Hàm ở đây THUẦN (không gọi mạng) trừ nhãn giá — router lo tài khoản/URL.
// Thêm sản phẩm mới (báo cáo khác, affiliate) = thêm một dòng `SAN_PHAM`.
// ============================================================

import type { BirthParams } from '@/lib/contract/v1';
import { chuanHoaDauThanh } from '@/lib/vn-text';
import { loaiCau, nhuCau } from '@/lib/agent/nhip';
import { getToolPrice } from '@/lib/billing/pricing';
import { vndPerCredit } from '@/lib/billing/packages';
import { hoiChanDuoc, moiCau, pickGuests, type GuestId } from './guests';

/** Số LƯỢT hỏi (không phải số tin) tối thiểu giữa hai lần hiện nút sản phẩm. */
export const KHOANG_SP = 4;

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

// ── Tầng 5: sản phẩm ─────────────────────────────────────────────────────
const KHEN = cum([
  'chuẩn quá', 'chuẩn thật', 'chuẩn luôn', 'chuẩn không cần chỉnh', 'đúng quá', 'đúng thật', 'đúng vậy', 'đúng y',
  'hay quá', 'chính xác quá', 'trúng quá', 'thầy nói đúng', 'nói đúng quá', 'giống hệt', 'đúng hết',
]);

export type LyDoSanPham = 'vua-lap-la-so' | 'khen' | 'hoi-sau' | 'sap-het-luot';

export interface NguCanhSanPham {
  cauHoi: string;
  /** Chủ đề (`cacChuDe`) của các câu hỏi GẦN NHẤT, câu hiện tại ở CUỐI. */
  chuDeGanDay: string[][];
  lasoShown: boolean;
  /** Số câu hỏi còn lại (lượt tặng + ví); null = không tính phí. */
  conCau: number | null;
  /** Thứ tự lượt hỏi hiện tại (1 = lượt đầu). */
  luot: number;
  /** Lượt gần nhất đã hiện nút sản phẩm (`GoiYState.sp`). */
  spTruoc?: number;
}

/** Lý do mời sản phẩm lượt này, hoặc null. Thứ tự: đau/bế tắc chặn TRƯỚC mọi thứ. */
export function lyDoSanPham(c: NguCanhSanPham): LyDoSanPham | null {
  const nc = nhuCau(c.cauHoi);
  if (loaiCau(c.cauHoi) === 'be-tac' || nc === 'an-ui' || nc === 'phe-minh') return null;
  if (c.spTruoc != null && c.luot - c.spTruoc < KHOANG_SP && !c.lasoShown) return null;
  if (c.lasoShown) return 'vua-lap-la-so';
  if (co(norm(c.cauHoi), KHEN)) return 'khen';
  const [a, b, d] = c.chuDeGanDay.slice(-3);
  if (a && b && d && d.length === 1 && a.includes(d[0]) && b.includes(d[0])) return 'hoi-sau';
  if (c.conCau != null && c.conCau > 0 && c.conCau <= 2) return 'sap-het-luot';
  return null;
}

export interface SanPham {
  id: string;
  /** Chủ đề hợp (`cacChuDe`); bỏ trống = hợp mọi chủ đề. */
  hop?: string[];
  nhan: () => Promise<string>;
  /** Đường dẫn web (router bọc handoff đăng nhập sẵn). */
  path: (birth: BirthParams) => string;
}

/** Nhãn nút bản luận giải — giá VNĐ là chính (luật "VNĐ là giá CHÍNH"), đọc từ
 *  `tool_pricing['laso']`; đọc hụt thì không ghi giá (không chép số). */
export async function nhanLuanGiai(): Promise<string> {
  const [credits, rate] = await Promise.all([getToolPrice('laso'), vndPerCredit()]);
  return credits && credits > 0 ? `Luận giải ${Math.round(credits * rate).toLocaleString('vi-VN')}đ` : 'Luận giải đầy đủ';
}

/** Danh mục sản phẩm — sản phẩm HỢP CHỦ ĐỀ đứng trước, sản phẩm chung đứng cuối. */
export function sanPhamDanhMuc(lasoPath: (b: BirthParams) => string): SanPham[] {
  return [{ id: 'luan-giai', nhan: nhanLuanGiai, path: lasoPath }];
}

export function chonSanPham(ds: SanPham[], chuDe: string[]): SanPham | null {
  return ds.find((p) => p.hop?.some((h) => chuDe.includes(h))) ?? ds.find((p) => !p.hop) ?? null;
}

/** Câu dẫn đi kèm nút sản phẩm — thay "Bạn muốn hỏi tiếp gì?" khi có lý do rõ. */
export const LOI_SAN_PHAM: Record<LyDoSanPham, string> = {
  'vua-lap-la-so': 'Bạn muốn hỏi tiếp gì? Muốn đọc trọn cả lá số một lượt thì có bản luận giải đầy đủ.',
  khen: 'Thầy mừng là đúng với bạn. Bản luận giải đầy đủ đi hết 12 cung và các đại vận, đọc lúc nào cũng được.',
  'hoi-sau': 'Chuyện này mình đã đi khá sâu — bản luận giải đầy đủ có trọn phần này và cả các mốc vận, để bạn đọc lại khi cần.',
  'sap-het-luot': 'Bạn muốn hỏi tiếp gì? Sắp hết lượt hỏi — bản luận giải đầy đủ gom trọn lá số vào một bản để đọc lại.',
};

