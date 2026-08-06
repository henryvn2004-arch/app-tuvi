// lib/engine/cong-so.ts
// ============================================================
// TỬ VI CÔNG SỞ — đọc lá số bằng ngôn ngữ công việc.
//
// THUẦN deterministic: 0 lượt LLM, 0đ. Mọi con số lấy thẳng từ engine
// (`palaces`, `cungScores`, `daiVans[].scoring`, `tieuVanScores`) — module này
// KHÔNG tự an sao, KHÔNG tự chấm điểm lại.
//
// ── VÌ SAO CHIA 4 KIỂU, VÀ CHIA THEO GÌ ─────────────────────
// Trục phân loại là TỨ TƯỢNG của Kinh Dịch (lão dương · thiếu âm · thiếu
// dương · lão âm) áp lên 14 chính tinh, KHÔNG phải mượn một bộ trắc nghiệm
// tính cách phương Tây nào. Bốn nhóm rơi đúng vào các bộ sao kinh điển:
//
//   老陽 Khai sáng  = Sát · Phá · Tham + Liêm Trinh   (bộ Sát Phá Tham)
//   少陰 Lãnh đạo   = Tử · Phủ · Vũ · Tướng           (bộ Tử Phủ Liêm Vũ Tướng)
//   少陽 Hỗ trợ     = Nhật · Cự · Cơ
//   老陰 Hợp tác    = Nguyệt · Lương · Đồng           (bộ Cơ Nguyệt Đồng Lương)
//
// ⚠️ TÊN GỌI "Khai sáng / Lãnh đạo / Hỗ trợ / Hợp tác" LÀ NHÃN HIỆN ĐẠI do
// trang đặt cho dễ đọc — cổ thư không gọi thế. Cấu trúc bốn nhóm thì có nền
// cổ pháp thật (tứ tượng + bộ sao). Trang PHẢI nói rõ chỗ này; nhập nhèm là
// mượn uy tín cổ thư cho một cái tên mình vừa nghĩ ra.
//
// ⚠️ KHÔNG dùng chữ "khoa học / thống kê / trắc nghiệm đã kiểm định". Đây là
// một KHUNG ĐỌC, không phải công cụ tâm lý có đối chứng. Không có nghiên cứu
// nào đứng sau nó, và nói ngược lại là hứa thứ không có.
//
// ── VÌ SAO DÙNG TOẠ ĐỘ CHỨ KHÔNG GÁN NHÃN CỨNG ──────────────
// Đo trên 10.368 lá số (1972–2005 × 12 tháng × 3 ngày × 12 giờ × 2 giới):
//   • 16,2% lá số Mệnh VÔ CHÍNH DIỆU  → phải mượn xung chiếu
//   • 49,8% Mệnh có ≥2 chính tinh, trong đó 27,6% LẪN HAI NHÓM
//   • 🔑 các cặp lẫn nhóm CHỈ có hai kiểu: khai-sáng+lãnh-đạo (14,1%) và
//     hỗ-trợ+hợp-tác (13,5%) — KHÔNG lá số nào lẫn qua ranh giới âm/dương.
//     Nên trục Âm/Dương chia đúng 50,0/50,0 và KHÔNG BAO GIỜ mơ hồ; chỉ trục
//     lão/thiếu mới cần phân xử.
//
// Ba luật đã cân, đo trên cùng bộ 10.368 lá số:
//   sao đầu tiên   → 28,6 / 27,6 / 22,4 / 21,4  (phụ thuộc thứ tự engine trả
//                     — tuỳ tiện, đổi thứ tự an sao là đổi kết quả)
//   sao sáng nhất  → 28,6 / 25,6 / 24,4 / 21,4
//   ✅ TOẠ ĐỘ      → 27,0 / 26,8 / 23,2 / 23,0  (đều nhất) · 13,2% sát ranh
//
// Toạ độ thắng vì (a) trải đều nhất, (b) trả về HAI CON SỐ nên vẽ được, và
// (c) nêu được ca lưỡng lự thay vì ép nhãn — 13,2% ca sát ranh được gọi thẳng
// là "kiểu lai". Ép nhãn cho nhóm đó là nói chắc điều mình không chắc.
// ============================================================

import type { Laso } from '@/lib/engine/laso';
import { MENH_ROLE } from '@/lib/engine/past-life';
import { currentNamXem } from '@/lib/engine/namxem';

type Rec = Record<string, unknown>;
interface StarObj {
  ten: string;
  brightness?: string;
  hoa?: string | null;
}

export type KieuId = 'khai-sang' | 'lanh-dao' | 'ho-tro' | 'hop-tac';

/** Tình trạng nghề nghiệp người xem tự khai. CỐ Ý là một trường NGƯỜI DÙNG
 * NHẬP chứ không suy từ lá số: lá số nói thiên hướng, nó không biết hôm nay
 * người ta đang làm thuê hay đã ra riêng — mà lời khuyên cho hai người đó
 * khác hẳn nhau. Một ô chọn 5 dòng đổi được giọng cả bản đọc. */
export type TrangThai = 'nhan-vien' | 'quan-ly' | 'chu' | 'tu-do' | 'dang-tim';

export const TRANG_THAI_LABEL: Record<TrangThai, string> = {
  'nhan-vien': 'Nhân viên làm thuê',
  'quan-ly': 'Quản lý làm thuê',
  chu: 'Chủ doanh nghiệp',
  'tu-do': 'Làm tự do / nghề riêng',
  'dang-tim': 'Đang tìm việc / chuyển hướng',
};

export function resolveTrangThai(v?: string | null): TrangThai {
  return v && v in TRANG_THAI_LABEL ? (v as TrangThai) : 'nhan-vien';
}

// ── Bảng tứ tượng ───────────────────────────────────────────
// x = trục ÂM/DƯƠNG  (+1 dương "tranh"  · −1 âm "nhường")
// y = trục LÃO/THIẾU (+1 xông/bộc phát  · −1 trầm/tiết chế)
//
// 老陽 = dương thuần        → (+1, +1)
// 少陰 = "dương ngoài, âm trong" → (+1, −1)
// 少陽 = "âm ngoài, dương trong" → (−1, +1)
// 老陰 = âm thuần           → (−1, −1)
const STAR_AXIS: Record<string, readonly [number, number]> = {
  // 老陽 — Khai sáng
  'Thất Sát': [1, 1],
  'Phá Quân': [1, 1],
  'Liêm Trinh': [1, 1],
  'Tham Lang': [1, 1],
  // 少陰 — Lãnh đạo
  'Tử Vi': [1, -1],
  'Thiên Phủ': [1, -1],
  'Vũ Khúc': [1, -1],
  'Thiên Tướng': [1, -1],
  // 少陽 — Hỗ trợ
  'Thái Dương': [-1, 1],
  'Cự Môn': [-1, 1],
  'Thiên Cơ': [-1, 1],
  // 老陰 — Hợp tác
  'Thái Âm': [-1, -1],
  'Thiên Lương': [-1, -1],
  'Thiên Đồng': [-1, -1],
};

/** Độ sáng → hệ số. Dải hẹp (0,6–1,0) CÓ CHỦ ĐÍCH: sao hãm vẫn là sao đó, nó
 * chỉ phát huy kém hơn chứ không đổi bản chất sang nhóm khác. Cho hệ số về 0
 * thì một lá số Mệnh có đúng một chính tinh hãm sẽ rơi về gốc toạ độ và bị
 * phân kiểu bằng… cung Quan Lộc, tức đọc tính cách của người khác. */
const BRIGHT_W: Record<string, number> = {
  Miếu: 1.0,
  Vượng: 0.93,
  'Đắc địa': 0.87,
  Đắc: 0.87,
  Bình: 0.73,
  'Bình hòa': 0.73,
  'Bình hoà': 0.73,
  Hãm: 0.6,
};
const brightW = (b?: string) => BRIGHT_W[(b || '').trim()] ?? 0.8;

/** Trọng số cung Quan Lộc so với cung Mệnh khi tính toạ độ.
 * Mệnh là gốc tính cách nên phải nặng hơn; nhưng đây là bản đọc NGHỀ NGHIỆP
 * nên bỏ hẳn Quan Lộc là vứt đúng cung nói về công việc. 0,6 giữ được Mệnh
 * luôn thắng khi hai cung mâu thuẫn, mà Quan Lộc vẫn đủ sức kéo lệch những ca
 * Mệnh yếu (chính tinh hãm) — đúng ca cần được kéo. */
const W_QUAN = 0.6;

export interface KieuDef {
  id: KieuId;
  ten: string;
  /** Tên tứ tượng gốc — hiện trên trang để người đọc biết nhãn từ đâu ra. */
  tuTuong: string;
  amDuong: 'duong' | 'am';
  saoNhom: string[];
  /** Một câu tóm — dùng làm phụ đề, làm caption ảnh. */
  motCau: string;
  /** Cái người ta thật sự đuổi theo, dưới mọi mục tiêu bề mặt. */
  dongLuc: string;
  /** Cách hành xử nhận ra ngay ở chỗ làm. */
  datChat: string;
  /** Câu hỏi chạy ngầm trong đầu trước mỗi quyết định. Đây là phần người đọc
   * hay giật mình nhất — nó tả CÁCH NGHĨ chứ không tả thành tích. */
  cauHoi: string[];
  /** Cách dẫn người khi được giao quyền. */
  kieuDan: string;
  moiTruongHop: string;
  moiTruongKy: string;
  manh: string;
  yeu: string;
  /** Bốn việc phải học khi lần đầu cầm quân. Phần bán được tiền: nó là việc
   * làm được, không phải lời mô tả. */
  baiHoc: string[];
  source: string;
}

export const KIEU: Record<KieuId, KieuDef> = {
  'khai-sang': {
    id: 'khai-sang',
    ten: 'Khai sáng',
    tuTuong: 'Lão dương (老陽) — dương trong dương',
    amDuong: 'duong',
    saoNhom: ['Thất Sát', 'Phá Quân', 'Liêm Trinh', 'Tham Lang'],
    motCau: 'Mở đường, phá cục, chịu được rủi ro mà người khác né',
    dongLuc: 'Không chịu được cảm giác thua và cảm giác giậm chân tại chỗ. Cái thúc bạn đi không phải phần thưởng mà là việc chưa ai làm được.',
    datChat:
      'Xông lên trước rồi mới tính, quyết nhanh, chịu trách nhiệm thay vì đùn đẩy. Hiện trạng nào cũng thấy còn có thể tốt hơn, nên hay là người đầu tiên đụng vào chỗ không ai muốn đụng.',
    cauHoi: ['Việc này thắng được không?', 'Ai đang chắn đường?', 'Có cách nào nhanh hơn không?', 'Chờ thêm thì mất gì?'],
    kieuDan: 'Ra lệnh trực tiếp — một khẩu lệnh một động tác, trọng hiệu quả hơn trọng cảm xúc.',
    moiTruongHop: 'Nơi thay đổi nhanh, thử thách cao, đo bằng kết quả chứ không đo bằng thâm niên: công ty mới, đội đặc nhiệm, mảng phải mở từ số không.',
    moiTruongKy: 'Bộ máy nhiều tầng, thăng tiến theo thâm niên, trọng lễ nghi công sở — ở đó bạn dễ thành người hay va chạm chứ không thành người được cất nhắc.',
    manh: 'Dám đi trước và kéo được người khác đi theo trong lúc chưa ai chắc đường nào đúng.',
    yeu: 'Thiếu kiên nhẫn với người chậm hơn mình; thắng xong hay quên mất phải giữ lại quan hệ.',
    baiHoc: [
      'Dẫn người cần kiên nhẫn — thứ bạn thiếu nhất, và nó không tự đến theo chức vụ.',
      'Vừa có quyền là dễ dùng quá tay: việc nhỏ cũng ra lệnh, khiến người dưới hết dám tự quyết.',
      'Làm tốt quá mà không che chắn thì thành "công cao lấn chủ" — cấp trên đề phòng trước khi bạn kịp hiểu vì sao.',
      'Giận là bỏ đi, thậm chí quay lại cạnh tranh với chỗ cũ. Mỗi lần thế mất sạch vốn quan hệ vừa gây dựng.',
    ],
    source: 'Tứ tượng lão dương; bộ Sát Phá Tham + Liêm Trinh. Đặc chất từng sao theo Tân Biên mục 4.2 (cung Mệnh) và Vương Đình Chi — Lục Thập Tinh Hệ.',
  },
  'lanh-dao': {
    id: 'lanh-dao',
    ten: 'Lãnh đạo',
    tuTuong: 'Thiếu âm (少陰) — dương ngoài, âm trong',
    amDuong: 'duong',
    saoNhom: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
    motCau: 'Cầm trịch, sắp người vào đúng chỗ, dựng thứ chạy được lâu',
    dongLuc: 'Muốn là người nói ra thì người khác tin — có công tín, có chỗ đứng được thừa nhận, không phải hô hào mới có người nghe.',
    datChat:
      'Tính xong mới động, làm có thứ lớp, chuộng phương pháp và tiền lệ. Nhìn việc gì cũng thấy phải ráp lại từ nguồn lực đang có chứ không phải làm lại từ đầu.',
    cauHoi: ['Có tiền lệ nào chưa?', 'Có bản mẫu nào chạy được rồi không?', 'Ghép được với nguồn lực sẵn có không?', 'Việc này có hợp lý không?'],
    kieuDan: 'Quản theo mục tiêu — chia mốc, đặt điểm kiểm, giao rồi theo dõi tiến độ chứ không đứng cạnh chỉ tay.',
    moiTruongHop: 'Tổ chức có phân tầng và có quy chuẩn, nơi bạn ráp được người và nguồn lực: doanh nghiệp đã qua giai đoạn sống sót, mảng cần dựng lại nề nếp.',
    moiTruongKy: 'Chỗ hỗn loạn, đổi hướng liên tục, không ai giữ lời — bạn mất nhiều sức để dựng trật tự hơn là để làm việc.',
    manh: 'Nhìn ra ai mạnh chỗ nào rồi đặt đúng chỗ đó, khiến cả đội chạy nhanh hơn tổng từng người.',
    yeu: 'Trọng thể diện và tiền lệ nên dễ chậm chân ở khúc phải liều; ôm việc vì sợ người khác làm không đủ chuẩn.',
    baiHoc: [
      'Có ham muốn lãnh đạo không đồng nghĩa với biết lãnh đạo — cái thứ hai phải học riêng.',
      'Tầm nhìn rộng tới đâu quyết định cái đội lớn tới đâu; giữ khư khư quyền quyết là tự đặt trần cho chính mình.',
      'Chuộng tiền lệ dễ thành ngại thứ chưa có tiền lệ, mà chính đó là chỗ ăn tiền.',
      'Bạn cần người dám xông — thiếu một người kiểu Khai sáng bên cạnh thì kế hoạch đẹp mà không ai phá cục.',
    ],
    source: 'Tứ tượng thiếu âm; bộ Tử Phủ Liêm Vũ Tướng, cổ quyết "Tử Phủ Vũ Tướng, vị cư nhân thượng". Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi.',
  },
  'ho-tro': {
    id: 'ho-tro',
    ten: 'Hỗ trợ',
    tuTuong: 'Thiếu dương (少陽) — âm ngoài, dương trong',
    amDuong: 'am',
    saoNhom: ['Thái Dương', 'Cự Môn', 'Thiên Cơ'],
    motCau: 'Nghĩ ra đường đi, nói cho người khác hiểu, làm quân sư',
    dongLuc: 'Muốn được nhìn nhận là người sắc sảo và có ảnh hưởng. Không ai công nhận thì bất an, dù việc vẫn chạy.',
    datChat:
      'Phản ứng nhanh, nghĩ nhiều nước, đọc được không khí phòng họp. Thích trình bày, thích được hỏi ý kiến, và thường là người giải thích lại cho cả đội hiểu.',
    cauHoi: ['Làm sao để mọi người thấy hợp lý?', 'Mình đang được nhìn như thế nào?', 'Còn cách nào hay hơn không?', 'Ai cần được thuyết phục trước?'],
    kieuDan: 'Dẫn bằng thuyết phục — cho người ta hiểu vì sao rồi họ tự làm, thay vì ép.',
    moiTruongHop: 'Chỗ ăn bằng đầu và bằng miệng: hoạch định, tiếp thị, tư vấn, đào tạo, luật, y, nghề chuyên môn có thương hiệu cá nhân.',
    moiTruongKy: 'Việc lặp lại, không ai hỏi tới ý kiến, thành quả tính theo tập thể — ở đó bạn héo nhanh dù lương vẫn tốt.',
    manh: 'Biến thứ rối thành thứ người khác hiểu được, và làm được điều đó nhanh hơn hầu hết mọi người.',
    yeu: 'Nói giỏi hơn làm; hưởng thụ quá trình mà nhẹ tay với kết quả cuối; cần lời khen nhiều hơn mình thừa nhận.',
    baiHoc: [
      'Nói và làm là hai việc. Muốn cầm quân thì phải chịu phần thi hành, không chỉ phần ý tưởng.',
      'Nể nang vì sợ mất lòng sẽ khiến bạn không dám đòi tiến độ — và đội tự hiểu là không cần gấp.',
      'Ảnh hưởng của bạn đến từ chuyên môn; buông chuyên môn để đi làm quan hệ là tự tháo chỗ đứng.',
      'Bạn cần một người kiểu Lãnh đạo hoặc Khai sáng chốt hạ, nếu không phương án hay sẽ dừng ở phương án.',
    ],
    source: 'Tứ tượng thiếu dương; cụm Nhật – Cự – Cơ. Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi (Thiên Cơ: "phù tá, tham mưu, cố vấn, người lập kế hoạch").',
  },
  'hop-tac': {
    id: 'hop-tac',
    ten: 'Hợp tác',
    tuTuong: 'Lão âm (老陰) — âm trong âm',
    amDuong: 'am',
    saoNhom: ['Thái Âm', 'Thiên Lương', 'Thiên Đồng'],
    motCau: 'Giữ cho guồng chạy, gánh phần không ai muốn gánh, bền',
    dongLuc: 'Muốn mình là người có ích và điều đó được thừa nhận. Ham muốn vật chất thấp hơn mức người ngoài đoán.',
    datChat:
      'Ôn hoà, nghĩ trước nhiều nước lui, làm tuần tự, không đánh trận chưa chắc. Ít khi bùng lên mà cũng hiếm khi vỡ trận.',
    cauHoi: ['Làm cho ai?', 'Có hợp lợi ích số đông không?', 'Có ai cùng làm không?', 'Việc này có phá hoà khí không?'],
    kieuDan: 'Dẫn bằng phối hợp — gom đồng thuận rồi mới đi, tránh đối đầu trực diện.',
    moiTruongHop: 'Chỗ cần người giữ nhịp và nối các bên: vận hành, nhân sự, tài chính, hậu cần, cán bộ trung kiên của một bộ máy đã chạy.',
    moiTruongKy: 'Chỗ phải tranh phần công khai, đổi hướng xoành xoạch, thưởng người ồn ào — bạn làm nhiều mà được ghi nhận ít nhất.',
    manh: 'Không tranh nên không thành cái gai; khi các bên đánh nhau mệt thì bạn là người còn đứng được để thu dọn.',
    yeu: 'Ngại làm mất lòng nên hay ôm việc thay vì giao; quyết chậm, dễ bỏ lỡ khúc phải chớp.',
    baiHoc: [
      'Ngại quản người nên hay tự làm hết — đó là trần thấp nhất bạn tự đặt cho mình.',
      'Từ chối cơ hội bằng lý do "chưa đủ năng lực" là thói quen, không phải sự thật. Kiểm lại mỗi lần định nói câu đó.',
      'Đúng lúc phải nói thẳng thì nói thẳng; giữ hoà khí bằng cách im là để vấn đề lớn lên.',
      'Bạn thành công muộn hơn nhóm dương trung bình khoảng mười năm — đó là nhịp, không phải kém. Đừng lấy nhịp người khác đo mình.',
    ],
    source: 'Tứ tượng lão âm; cụm Nguyệt – Lương – Đồng (bộ Cơ Nguyệt Đồng Lương). Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi.',
  },
};

export const KIEU_IDS = Object.keys(KIEU) as KieuId[];

// ── Helper đọc lá số ────────────────────────────────────────
const palaces = (ls: Laso): Rec[] => ((ls.palaces as Rec[]) || []);

function palaceByName(ls: Laso, name: string): Rec | undefined {
  return palaces(ls).find((p) => p.cungName === name);
}

function majors(p: Rec | undefined): StarObj[] {
  return ((p?.majorStars as StarObj[]) || []).filter((s) => s && s.ten);
}

/**
 * Chính tinh của một cung; cung VÔ CHÍNH DIỆU thì MƯỢN cung xung chiếu.
 *
 * Cổ pháp (Tân Biên 8.45) cho phép mượn xung chiếu khi cung trống — và đo được
 * 16,2% lá số có Mệnh vô chính diệu, tức bỏ qua bước này là một phần sáu người
 * xem không phân được kiểu.
 */
function majorsOrBorrow(ls: Laso, p: Rec | undefined): { stars: StarObj[]; muon: boolean } {
  const own = majors(p);
  if (own.length) return { stars: own, muon: false };
  const xung = p?.xungChieuCung as Rec | undefined;
  const borrowed = majors(xung);
  if (borrowed.length) return { stars: borrowed, muon: true };
  // Không có cả xungChieuCung (không nên xảy ra với engine hiện tại) — tra bằng
  // chỉ số đối cung cho chắc, thay vì trả rỗng làm hỏng cả bản đọc.
  const idx = typeof p?.idx === 'number' ? (p.idx as number) : -1;
  if (idx >= 0) return { stars: majors(palaces(ls)[(idx + 6) % 12]), muon: true };
  return { stars: [], muon: false };
}

const starLabel = (s: StarObj) => s.ten + (s.brightness ? ` (${s.brightness})` : '') + (s.hoa ? ` [Hóa ${s.hoa}]` : '');

/** Kiểu của một CUNG bất kỳ (dùng cho Phụ Mẫu / Nô Bộc / Huynh Đệ ở phần ghép
 * đội). Ở đây gán nhãn đơn giản theo đa số vì chỉ cần một nhãn để nói chuyện,
 * không cần toạ độ. */
function kieuCuaCung(ls: Laso, name: string): { kieu: KieuId | null; sao: StarObj[]; muon: boolean } {
  const { stars, muon } = majorsOrBorrow(ls, palaceByName(ls, name));
  let bx = 0;
  let by = 0;
  for (const s of stars) {
    const ax = STAR_AXIS[s.ten];
    if (!ax) continue;
    const w = brightW(s.brightness);
    bx += ax[0] * w;
    by += ax[1] * w;
  }
  if (bx === 0 && by === 0) return { kieu: null, sao: stars, muon };
  return { kieu: quadrant(bx, by), sao: stars, muon };
}

function quadrant(x: number, y: number): KieuId {
  if (x >= 0) return y >= 0 ? 'khai-sang' : 'lanh-dao';
  return y >= 0 ? 'ho-tro' : 'hop-tac';
}

// ── 1. Phân kiểu ────────────────────────────────────────────

export interface PhanKieu {
  kieu: KieuId;
  /** Trục âm/dương: dương (tranh) > 0, âm (nhường) < 0. */
  x: number;
  /** Trục lão/thiếu: xông > 0, trầm < 0. */
  y: number;
  /** Toạ độ đã chuẩn hoá về [-1, 1] để vẽ. */
  xNorm: number;
  yNorm: number;
  /** Sát ranh giới → nói thẳng là kiểu lai, KHÔNG ép nhãn. Đo được 13,2%. */
  lai: boolean;
  /** Kiểu đứng thứ hai — chỉ có nghĩa khi `lai`. */
  kieuPhu: KieuId | null;
  saoMenh: string[];
  saoQuan: string[];
  muonMenh: boolean;
  muonQuan: boolean;
  /** Vai trò suy từ chính tinh cung Mệnh, kèm trích dẫn (dùng chung bảng với
   * tool Chân Dung Tiền Kiếp — một nguồn, hai chỗ đọc). */
  vaiTro: { role: string; source: string } | null;
}

/** Ngưỡng "sát ranh giới". 0,25 trên thang toạ độ thô (dải đo được ±3,1) cho
 * ra 13,2% ca lai — đủ hiếm để nhãn còn nghĩa, đủ nhiều để không giấu đi ca
 * thật sự lưỡng lự. */
const NGUONG_LAI = 0.25;

export function phanKieu(ls: Laso): PhanKieu {
  const menhP = palaceByName(ls, 'Mệnh');
  const quanP = palaceByName(ls, 'Quan Lộc');
  const m = majorsOrBorrow(ls, menhP);
  const q = majorsOrBorrow(ls, quanP);

  let x = 0;
  let y = 0;
  const add = (stars: StarObj[], w: number) => {
    for (const s of stars) {
      const ax = STAR_AXIS[s.ten];
      if (!ax) continue;
      const k = w * brightW(s.brightness);
      x += ax[0] * k;
      y += ax[1] * k;
    }
  };
  add(m.stars, 1);
  add(q.stars, W_QUAN);

  const kieu = quadrant(x, y);
  const lai = Math.abs(x) < NGUONG_LAI || Math.abs(y) < NGUONG_LAI;
  // Kiểu phụ = lật đúng cái trục đang lưỡng lự. Lật cả hai trục thì ra kiểu
  // đối xứng chéo — thứ lá số này KHÔNG hề gần.
  let kieuPhu: KieuId | null = null;
  if (lai) {
    kieuPhu = Math.abs(x) < Math.abs(y) ? quadrant(-x, y) : quadrant(x, -y);
    if (kieuPhu === kieu) kieuPhu = null;
  }

  // Chuẩn hoá để vẽ: dải thô đo được xấp xỉ ±3,2; kẹp về [-1,1].
  const norm = (v: number) => Math.max(-1, Math.min(1, v / 3.2));

  const menhKey = m.stars.map((s) => s.ten).sort().join('+');
  const vaiTro = MENH_ROLE[menhKey] || (m.stars[0] ? MENH_ROLE[m.stars[0].ten] : undefined) || null;

  return {
    kieu,
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    xNorm: +norm(x).toFixed(3),
    yNorm: +norm(y).toFixed(3),
    lai,
    kieuPhu,
    saoMenh: m.stars.map(starLabel),
    saoQuan: q.stars.map(starLabel),
    muonMenh: m.muon,
    muonQuan: q.muon,
    vaiTro,
  };
}

// ── 2. Radar 12 chiều ───────────────────────────────────────
// Đọc 12 cung qua LĂNG KÍNH CÔNG VIỆC. Nghĩa gốc từng cung không đổi — chỉ
// đổi cách gọi cho khớp việc người ta đang hỏi. Điểm lấy nguyên `cungScores`
// của engine, KHÔNG chấm lại.

export const RADAR_CUNG: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Bản lĩnh cá nhân', y: 'Chất riêng bạn mang vào việc, thứ còn lại khi bỏ hết chức danh' },
  { cung: 'Quan Lộc', nhan: 'Đường công danh', y: 'Sự nghiệp đi lên êm hay gập ghềnh, hợp làm công hay làm chủ' },
  { cung: 'Tài Bạch', nhan: 'Năng lực kiếm tiền', y: 'Cách tiền vào ra, hợp lương cứng hay hợp ăn theo kết quả' },
  { cung: 'Thiên Di', nhan: 'Cơ hội bên ngoài', y: 'Ra khỏi vùng quen thì gặp may hay gặp khó; hợp đi xa, đổi môi trường' },
  { cung: 'Nô Bộc', nhan: 'Cấp dưới & đối tác', y: 'Người dưới quyền và bạn nghề có đỡ được bạn không' },
  { cung: 'Huynh Đệ', nhan: 'Đồng sự ngang hàng', y: 'Quan hệ với người cùng cấp — chỗ va chạm nhiều nhất ở công sở' },
  { cung: 'Phụ Mẫu', nhan: 'Quan hệ với cấp trên', y: 'Bề trên nâng đỡ hay đè; xin duyệt dễ hay khó' },
  { cung: 'Phúc Đức', nhan: 'Sức bền tinh thần', y: 'Chịu áp lực dài được tới đâu trước khi kiệt' },
  { cung: 'Điền Trạch', nhan: 'Nền tảng hậu phương', y: 'Chỗ dựa vật chất — có dám liều một quãng không lương không' },
  { cung: 'Tật Ách', nhan: 'Sức khoẻ & áp lực', y: 'Áp lực đổ vào đâu trên người bạn' },
  { cung: 'Phu Thê', nhan: 'Hậu thuẫn bạn đời', y: 'Người bên cạnh đẩy hay kéo quyết định nghề nghiệp của bạn' },
  { cung: 'Tử Tức', nhan: 'Ươm mầm & truyền nghề', y: 'Đào tạo người sau, gây dựng cái nối tiếp mình' },
];

export interface RadarItem {
  cung: string;
  nhan: string;
  y: string;
  diem: number;
  /** Cung này có được vận NĂM NAY chiếu tới không (tiểu hạn / lưu niên). */
  namNay: 'tieu-han' | 'luu-nien' | 'ca-hai' | null;
  sao: string[];
  cachCuc: string[];
}

// ── 3. Lộ trình 40 năm ──────────────────────────────────────
// Bốn đại vận liên tiếp phủ quãng đi làm. Nhãn nấc là NHÃN CHẶNG ĐỜI NGHỀ,
// không phải lời hứa chức vụ — người không đi con đường quản lý vẫn đọc được
// (nấc 3 là "làm chủ chuyên môn" chứ không nhất thiết là ghế giám đốc).

export const NAC_NGHE = [
  { ten: 'Vào nghề & tích vốn', y: 'Học nghề, dựng uy tín đầu tiên, chọn đúng chỗ đứng' },
  { ten: 'Đứng vững & cầm việc', y: 'Có phần việc của riêng mình, bắt đầu chịu trách nhiệm cho người khác' },
  { ten: 'Cầm đội & mở rộng', y: 'Dẫn người, hoặc làm chủ chuyên môn của mình' },
  { ten: 'Định hình & chuyển giao', y: 'Chốt di sản nghề, truyền lại, hoặc đổi sân chơi lần cuối' },
] as const;

export interface NacDaiVan {
  stt: number;
  nac: string;
  nacY: string;
  tuoiStart: number;
  tuoiEnd: number;
  namStart: number;
  namEnd: number;
  cung: string;
  sao: string[];
  muon: boolean;
  diem: number | null;
  flag: string;
  /** Tính âm/dương của chính đại vận này. */
  tinh: 'duong' | 'am' | null;
  /** Đại vận CÙNG tính với bản mệnh → thuận đà; KHÁC tính → phải đổi cách làm.
   * Đây là chỗ "vận" gặp "mệnh", và nó computable chứ không phải lời văn. */
  hopMenh: boolean | null;
  dangChay: boolean;
  luan: string;
}

// ── 4. Ghép đội ─────────────────────────────────────────────
// ⚠️ CHỌN CUNG THEO CỔ PHÁP, không theo biến thể hiện đại:
//   • cấp trên  → PHỤ MẪU (cung bề trên/trưởng thượng)
//   • cấp dưới  → NÔ BỘC  (cung tôi tớ, thuộc hạ, bạn nghề)
//   • đồng sự   → HUYNH ĐỆ (cung anh em, người ngang hàng)
// Có tài liệu hiện đại đọc cấp trên ở cung TẬT ÁCH; đó là biến thể của một
// tác giả, không phải cổ pháp, và không kiểm chứng được — nên không dùng.

export interface GhepDoi {
  vai: string;
  cung: string;
  sao: string[];
  muon: boolean;
  kieu: KieuId | null;
  kieuTen: string;
  /** Kiểu BỔ KHUYẾT nên tìm — theo luật âm dương tương bổ. */
  nenTim: KieuId;
  goiY: string;
}

/** Luật bù: âm ghép dương. Trong mỗi nửa, chọn kiểu bù cả trục nhịp cho đủ đôi
 * — Khai sáng (xông, dương) ↔ Hợp tác (trầm, âm); Lãnh đạo (trầm, dương) ↔
 * Hỗ trợ (xông, âm). Đây là "chéo góc" trên lưới toạ độ, tức bù CẢ HAI trục. */
/** `tieuVanScores[].direction` của engine là tiếng Anh — dịch tại đây, một chỗ. */
const HUONG_VI: Record<string, string> = {
  up: 'đang lên',
  down: 'đang xuống',
  flat: 'đi ngang',
};

const BU: Record<KieuId, KieuId> = {
  'khai-sang': 'hop-tac',
  'hop-tac': 'khai-sang',
  'lanh-dao': 'ho-tro',
  'ho-tro': 'lanh-dao',
};

// ── 5. Lời khuyên theo tình trạng nghề ──────────────────────
const LOI_THEO_TRANG_THAI: Record<TrangThai, Record<KieuId, string>> = {
  'nhan-vien': {
    'khai-sang':
      'Bạn dễ được để mắt sớm vì dám nhận việc khó — nhưng cái quyết định không phải lần lập công đầu, mà là bạn có chịu ở lại đủ lâu để biến nó thành vị trí hay không. Chọn sếp biết giao quyền, đừng chọn công ty có tên.',
    'lanh-dao':
      'Bạn hợp lối đi từng bậc, và bạn thật sự giỏi ở đó. Việc cần làm sớm: xin một phần việc CÓ NGƯỜI DƯỚI, dù chỉ một người — không có ai để quản thì thế mạnh lớn nhất của bạn không có chỗ hiện ra trong hồ sơ.',
    'ho-tro':
      'Bạn được ưa và được hỏi ý kiến nhiều, nhưng ưa không quy ra thăng tiến. Mỗi quý hãy có một việc GẮN TÊN BẠN và đo được bằng con số, nếu không bạn sẽ mãi là người giúp mọi người hoàn thành việc của họ.',
    'hop-tac':
      'Bạn là người guồng máy dựa vào, và cũng là người dễ bị coi là đương nhiên. Hãy tập nói ra phần mình đã làm — không phải để tranh, mà vì người quyết định không tự nhìn ra được.',
  },
  'quan-ly': {
    'khai-sang':
      'Chỗ nguy của bạn không phải chỉ tiêu mà là quan hệ dọc: dễ dùng quyền quá tay với người dưới và dễ khiến cấp trên đề phòng. Mỗi quyết định gấp, thử hỏi một câu — việc này cần lệnh hay chỉ cần một lời giải thích?',
    'lanh-dao':
      'Bạn quản tốt cái đã có nề nếp. Bài toán của bạn là khúc chưa có tiền lệ: hãy giữ cạnh mình một người dám xông, và đừng bắt họ chạy theo quy trình bạn thấy hợp lý.',
    'ho-tro':
      'Bạn dẫn bằng thuyết phục nên đội hiểu việc, nhưng hay nương tay lúc phải đòi tiến độ. Đặt sẵn mốc và điểm kiểm ngay từ đầu — để cái ép nằm ở lịch, không nằm ở bạn.',
    'hop-tac':
      'Bạn hay tự làm phần khó thay vì giao, vì giao thì phải thúc mà thúc thì mất lòng. Đó chính là trần của bạn. Giao đúng một việc bạn đang ôm, chịu để nó xong chậm hơn mình làm, và giữ nguyên như thế.',
  },
  chu: {
    'khai-sang':
      'Bạn mở được cục, nhưng đội toàn người giống bạn thì mỗi ngày chỉ đi xử lý va chạm nội bộ. Người bạn cần tuyển tiếp gần như chắc chắn là kiểu trầm — người giữ nhịp, không phải người thứ hai biết xông.',
    'lanh-dao':
      'Bạn dựng được bộ máy chạy lâu. Rủi ro là bộ máy đó quá gọn nên hết chỗ cho thứ chưa có tiền lệ. Hãy tách riêng một mảng KHÔNG áp quy trình chung, giao cho người dám phá.',
    'ho-tro':
      'Bạn bán được tầm nhìn và kéo được người giỏi tới. Chỗ hụt thường là thi hành — hãy tìm một người cầm trịch vận hành, và trao quyền thật, không phải trao chức danh.',
    'hop-tac':
      'Bạn đi chậm mà ít vỡ, và đó là lợi thế thật ở đường dài. Nhưng đừng để "chưa đủ chắc" thành lý do trì hoãn mãi — đặt trước hạn chót cho quyết định, không đặt cho việc.',
  },
  'tu-do': {
    'khai-sang':
      'Làm tự do rất hợp bạn: không lễ nghi, đo bằng kết quả. Chỗ hở là nguồn việc lúc có lúc không — hãy giữ hai ba mối chạy song song thay vì dồn vào một khách lớn dễ nói chuyện.',
    'lanh-dao':
      'Bạn hợp mô hình có hệ thống hơn là chạy đơn lẻ: gói dịch vụ thành quy trình, dựng bảng giá theo bậc, và tính chuyện thuê người làm phần lặp lại.',
    'ho-tro':
      'Đây gần như là sân của bạn — nghề ăn bằng chuyên môn và tiếng nói. Đầu tư vào chỗ mình được nghe (viết, nói, dạy) sẽ ra việc nhanh hơn là đi chào từng người.',
    'hop-tac':
      'Bạn giữ khách rất bền, nhưng hay ngại nâng giá và ngại từ chối. Rà lại bảng giá mỗi năm một lần theo lịch cố định — để việc đó là thủ tục, không phải một cuộc đối đầu.',
  },
  'dang-tim': {
    'khai-sang':
      'Đừng chọn chỗ trả cao nhất; chọn chỗ cho bạn quyền quyết sớm nhất. Bạn héo trong bộ máy nhiều tầng nhanh hơn bạn tưởng, và lần nghỉ sau sẽ tới sớm.',
    'lanh-dao':
      'Hỏi thẳng trong lúc phỏng vấn: vị trí này có người dưới không, quyết định gì được tự chốt. Thiếu hai thứ đó thì dù chức danh đẹp bạn cũng sẽ thấy chật trong vòng một năm.',
    'ho-tro':
      'Chọn nơi có người nghe bạn nói. Việc lặp lại và không ai hỏi ý kiến là thứ giết động lực của bạn nhanh nhất, nhanh hơn cả lương thấp.',
    'hop-tac':
      'Bạn cần môi trường ổn định và một người dẫn rõ ràng để phát huy. Đừng nhận việc phải tự bơi ngay từ tuần đầu chỉ vì ngại từ chối lời mời.',
  },
};

// ── Kết quả ─────────────────────────────────────────────────

export interface CongSoProfile {
  namXem: number;
  trangThai: TrangThai;
  trangThaiLabel: string;
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  radar: RadarItem[];
  loTrinh: NacDaiVan[];
  vanNam: { nam: number; diem: number | null; huong: string | null; tieuHanCung: string | null; luuNienCung: string | null } | null;
  doi: GhepDoi[];
  loiTrangThai: string;
  /** Ngành hợp — lấy từ cách cục cung Quan Lộc mà engine đã gắn sẵn. */
  quanLoc: { sao: string[]; muon: boolean; diem: number | null; cachCuc: string[] };
}

export function computeCongSo(ls: Laso, trangThai: TrangThai = 'nhan-vien', namXem?: number): CongSoProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const phan = phanKieu(ls);
  const scores = (ls.cungScores as Record<string, Rec>) || {};
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};

  // ── Vận năm nay: engine đã tính sẵn tiểu hạn / lưu niên đóng ở cung nào.
  // CỐ Ý không tự chấm điểm 12 cung cho riêng năm nay — engine không có số đó,
  // bịa ra một bộ điểm "năm nay" là dựng dữ liệu.
  const tvs = (ls.tieuVanScores as Rec[]) || [];
  const tvNam = tvs.find((t) => t.nam === nam);
  const vanNam = tvNam
    ? {
        nam,
        diem: typeof tvNam.mainScore === 'number' ? (tvNam.mainScore as number) : null,
        // 🪤 `direction` của engine là chuỗi TIẾNG ANH ('up'/'down'/'flat').
        // Nó nằm trong payload API nên đi thẳng ra giao diện được — đúng loại
        // rò rỉ mà bộ dò chữ Hán/Anh đã bắt hai lần ở Kỳ Môn và Bản Đồ Sao.
        huong: HUONG_VI[String(tvNam.direction || '')] || null,
        tieuHanCung: (tvNam.tieuHanCung as string) || null,
        luuNienCung: (tvNam.luuNienCung as string) || null,
      }
    : null;

  const radar: RadarItem[] = RADAR_CUNG.map((r) => {
    const p = palaceByName(ls, r.cung);
    const sc = scores[r.cung];
    const isTH = vanNam?.tieuHanCung === r.cung;
    const isLN = vanNam?.luuNienCung === r.cung;
    return {
      cung: r.cung,
      nhan: r.nhan,
      y: r.y,
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : 0,
      namNay: isTH && isLN ? 'ca-hai' : isTH ? 'tieu-han' : isLN ? 'luu-nien' : null,
      sao: majors(p).map(starLabel),
      cachCuc: (cachCucTung[r.cung] || []).slice(0, 3),
    };
  });

  // ── Lộ trình 40 năm: 4 đại vận liên tiếp phủ quãng đi làm.
  // Chọn đại vận đầu tiên có tuoiEnd >= 25 (khúc thật sự vào nghề) thay vì
  // cứng nhắc lấy đại vận thứ 3: mốc đại vận dịch theo CỤC (thuỷ nhị cục khởi
  // tuổi 2, hoả lục cục khởi tuổi 6) nên lấy chỉ số cứng sẽ trượt tới 4 năm.
  const dvs = ((ls.daiVans as Rec[]) || []).filter((d) => typeof d?.tuoiStart === 'number');
  let start = dvs.findIndex((d) => (d.tuoiEnd as number) >= 25);
  if (start < 0) start = Math.min(2, Math.max(0, dvs.length - 4));
  const dvHienTai = ls.daiVanHienTai as Rec | undefined;
  // 🪤 Lá số KHÔNG có trường `namXem` (chỉ có `tuoiXem`) — lấy nó ra là
  // `undefined` rồi mọi năm hiện trên trang thành 0, im lặng. Suy năm sinh từ
  // chính `tieuVanScores`: mỗi ô đã mang CẶP (nam, tuoi) nên không phải giả
  // định gì về quy ước tuổi. `tuoi` ở đây là TUỔI MỤ, nên năm = namSinh + tuổi
  // − 1; quên trừ 1 là cả bốn chặng lệch đúng một năm mà nhìn không ra.
  const mocTuoi = tvs.find((t) => typeof t.nam === 'number' && typeof t.tuoi === 'number');
  const namSinh = mocTuoi
    ? (mocTuoi.nam as number) - (mocTuoi.tuoi as number) + 1
    : typeof ls.tuoiXem === 'number'
      ? nam - (ls.tuoiXem as number) + 1
      : null;

  const loTrinh: NacDaiVan[] = dvs.slice(start, start + 4).map((dv, i) => {
    const p = palaces(ls)[dv.cungIdx as number];
    const b = majorsOrBorrow(ls, p);
    let tinh: 'duong' | 'am' | null = null;
    let bx = 0;
    for (const s of b.stars) {
      const ax = STAR_AXIS[s.ten];
      if (ax) bx += ax[0] * brightW(s.brightness);
    }
    if (b.stars.length) tinh = bx >= 0 ? 'duong' : 'am';
    const hopMenh = tinh ? tinh === KIEU[phan.kieu].amDuong : null;
    const sc = dv.scoring as Rec | undefined;
    const tuoiStart = dv.tuoiStart as number;
    const tuoiEnd = dv.tuoiEnd as number;
    const nac = NAC_NGHE[Math.min(i, NAC_NGHE.length - 1)];
    return {
      stt: i + 1,
      nac: nac.ten,
      nacY: nac.y,
      tuoiStart,
      tuoiEnd,
      namStart: namSinh ? namSinh + tuoiStart - 1 : 0,
      namEnd: namSinh ? namSinh + tuoiEnd - 1 : 0,
      cung: (p?.cungName as string) || '',
      sao: b.stars.map(starLabel),
      muon: b.muon,
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : null,
      flag: (sc?.flag as string) || '',
      tinh,
      hopMenh,
      dangChay: !!dvHienTai && dvHienTai.tuoiStart === tuoiStart,
      luan: luanNac(phan.kieu, tinh, hopMenh, nac.ten),
    };
  });

  // ── Ghép đội
  const vaiCung: { vai: string; cung: string }[] = [
    { vai: 'Cấp trên của bạn', cung: 'Phụ Mẫu' },
    { vai: 'Đồng sự ngang hàng', cung: 'Huynh Đệ' },
    { vai: 'Cấp dưới & đối tác', cung: 'Nô Bộc' },
  ];
  const doi: GhepDoi[] = vaiCung.map((v) => {
    const k = kieuCuaCung(ls, v.cung);
    const nenTim = BU[phan.kieu];
    return {
      vai: v.vai,
      cung: v.cung,
      sao: k.sao.map(starLabel),
      muon: k.muon,
      kieu: k.kieu,
      kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
      nenTim,
      goiY: goiYGhep(v.cung, phan.kieu, k.kieu, nenTim),
    };
  });

  const quanP = palaceByName(ls, 'Quan Lộc');
  const quanB = majorsOrBorrow(ls, quanP);
  const quanSc = scores['Quan Lộc'];

  return {
    namXem: nam,
    trangThai,
    trangThaiLabel: TRANG_THAI_LABEL[trangThai],
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    radar,
    loTrinh,
    vanNam,
    doi,
    loiTrangThai: LOI_THEO_TRANG_THAI[trangThai][phan.kieu],
    quanLoc: {
      sao: quanB.stars.map(starLabel),
      muon: quanB.muon,
      diem: typeof quanSc?.tong === 'number' ? (quanSc.tong as number) : null,
      cachCuc: cachCucTung['Quan Lộc'] || [],
    },
  };
}

function luanNac(kieu: KieuId, tinh: 'duong' | 'am' | null, hop: boolean | null, nac: string): string {
  if (!tinh || hop === null) return `Chặng ${nac.toLowerCase()} — đại vận không có chính tinh, tính chất mờ, đọc thêm ở cung xung chiếu.`;
  const duongMenh = KIEU[kieu].amDuong === 'duong';
  if (hop) {
    return duongMenh
      ? 'Vận cùng tính dương với bản mệnh: đà thuận, dám tranh và tranh được. Đây là quãng nên đặt cược lớn — chậm chân ở đây thì quãng sau phải trả giá đắt hơn nhiều.'
      : 'Vận cùng tính âm với bản mệnh: êm, hợp tích luỹ và giữ quan hệ. Đừng lấy nhịp của người đang bung ra để đo mình trong quãng này.';
  }
  return duongMenh
    ? 'Vận ngược tính với bản mệnh (mệnh dương – vận âm): húc thẳng sẽ tốn sức mà ít kết quả. Quãng này ăn nhau ở chỗ nhẫn và ở chỗ dựng quan hệ, không ở chỗ thắng nhanh.'
    : 'Vận ngược tính với bản mệnh (mệnh âm – vận dương): môi trường đẩy bạn ra phía trước sớm hơn bạn muốn. Nhận việc lộ diện đi — đây đúng là quãng bạn học được thứ mình vẫn né.';
}

function goiYGhep(cung: string, menh: KieuId, cua: KieuId | null, nenTim: KieuId): string {
  const tenNen = KIEU[nenTim].ten;
  if (cung === 'Phụ Mẫu') {
    if (!cua) return `Cung Phụ Mẫu không có chính tinh — quan hệ với cấp trên mờ nhạt, ít người đỡ mà cũng ít người chặn. Bạn phải tự tạo mối, đừng chờ được để mắt tới.`;
    return `Bạn dễ ăn ý với sếp kiểu ${KIEU[cua].ten.toLowerCase()}. ${cua === menh ? 'Cùng kiểu với bạn nên hiểu nhau nhanh — nhưng cũng cùng điểm mù, hai người sẽ bỏ sót cùng một thứ.' : 'Khác kiểu bạn nên hay va lúc đầu; qua được khúc đó thì đây là người dạy bạn nhiều nhất.'}`;
  }
  if (cung === 'Nô Bộc') {
    if (!cua) return `Cung Nô Bộc không có chính tinh — người dưới quyền khó thành chỗ dựa. Đừng trông vào một cánh tay phải; nên xây quy trình để việc không phụ thuộc một người.`;
    return `Người dưới quyền hợp với bạn nghiêng về kiểu ${KIEU[cua].ten.toLowerCase()}. Còn kiểu bạn CẦN mà thường thiếu là ${tenNen.toLowerCase()} — tuyển bù chỗ đó trước khi tuyển thêm người giống mình.`;
  }
  if (!cua) return `Cung Huynh Đệ không có chính tinh — quan hệ đồng cấp nhạt, ít phe cánh mà cũng ít hậu thuẫn khi cần biểu quyết.`;
  return `Đồng sự ăn ý với bạn thường là kiểu ${KIEU[cua].ten.toLowerCase()}. Trong một đội, cặp bù nhau tốt nhất cho bạn là ${tenNen.toLowerCase()}.`;
}

// ── Xuất cho rail (PHẲNG) ───────────────────────────────────
/** ⚠️ `extractGenericContext` BỎ QUA im lặng mọi giá trị là object/mảng —
 * payload gửi rail bắt buộc phẳng, mọi danh sách phải dẹp thành chuỗi ngay tại
 * đây. Đã trả giá một lần ở thẻ Vận hôm nay. */
export function railData(p: CongSoProfile): Record<string, string | number | boolean> {
  const top = [...p.radar].sort((a, b) => b.diem - a.diem);
  return {
    kieu: p.kieu.ten,
    tuTuong: p.kieu.tuTuong,
    kieuLai: p.phan.lai && p.kieuPhu ? `Kiểu lai — nghiêng ${p.kieu.ten}, pha ${p.kieuPhu.ten}` : 'Không (kiểu rõ)',
    toaDo: `tranh/nhường ${p.phan.x} · xông/trầm ${p.phan.y}`,
    chinhTinhMenh: (p.phan.saoMenh.join(', ') || 'vô chính diệu') + (p.phan.muonMenh ? ' (mượn xung chiếu)' : ''),
    chinhTinhQuanLoc: (p.phan.saoQuan.join(', ') || 'vô chính diệu') + (p.phan.muonQuan ? ' (mượn xung chiếu)' : ''),
    vaiTroTheoMenh: p.phan.vaiTro?.role || '—',
    dongLuc: p.kieu.dongLuc,
    kieuDanDat: p.kieu.kieuDan,
    moiTruongHop: p.kieu.moiTruongHop,
    moiTruongKy: p.kieu.moiTruongKy,
    baiHocTaoMenh: p.kieu.baiHoc.join(' | '),
    trangThaiNgheNghiep: p.trangThaiLabel,
    loiTheoTrangThai: p.loiTrangThai,
    diemCaoNhat: top.slice(0, 3).map((r) => `${r.nhan} ${r.diem}/10`).join(', '),
    diemThapNhat: top.slice(-3).reverse().map((r) => `${r.nhan} ${r.diem}/10`).join(', '),
    cachCucQuanLoc: p.quanLoc.cachCuc.join(' | ') || '—',
    loTrinh40Nam: p.loTrinh
      .map((n) => `${n.nac} (${n.tuoiStart}–${n.tuoiEnd} tuổi, cung ${n.cung}${n.diem != null ? `, ${n.diem}/10` : ''}${n.dangChay ? ', ĐANG Ở CHẶNG NÀY' : ''})`)
      .join(' → '),
    vanNamNay: p.vanNam ? `${p.vanNam.nam}: ${p.vanNam.diem ?? '—'}/10, tiểu hạn cung ${p.vanNam.tieuHanCung || '—'}, lưu niên cung ${p.vanNam.luuNienCung || '—'}` : '—',
    ghepDoi: p.doi.map((d) => `${d.vai} (cung ${d.cung}): kiểu ${d.kieuTen}`).join(' | '),
    kieuNenTimDeBu: KIEU[BU[p.phan.kieu]].ten,
  };
}
