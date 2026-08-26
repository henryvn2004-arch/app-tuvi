// lib/engine/nguoi-khac.ts
// ============================================================
// LÁ SỐ NGƯỜI KHÁC — cẩm nang ứng xử (T1)
//
// Khác mọi tool hiện có ở CÂU HỎI, không ở cổ pháp: các tool kia trả lời "đời
// người này ra sao"; tool này trả lời "làm sao sống chung với người này".
// Vì thế nó KHÔNG thêm một luật cổ pháp nào — chỉ đọc lại đúng những cung mà
// engine đã tính, qua một lăng kính khác.
//
// 🔑 KHÔNG CHÉP LẠI GÌ. Bốn kiểu người + toạ độ lấy nguyên `phanKieu` của
// `cong-so.ts` (đã đo trên 10.368 lá số); vai trò cung Mệnh lấy `MENH_ROLE` của
// `past-life.ts` (đã export sẵn để dùng chung); mượn xung chiếu dùng chung
// `majorsOrBorrow`. Chép bản thứ hai thì hai bên trôi khỏi nhau, mà trích dẫn
// cổ thư chỉ đúng ở một bên — đúng bài học đã ghi ở track Công Sở.
//
// ⚠️ RANH GIỚI ĐẠO ĐỨC, viết ở đây vì nó là ràng buộc THIẾT KẾ chứ không phải
// lời văn: tool này đọc lá số của một người KHÔNG CÓ MẶT. Vì thế module chỉ
// trả về (a) cách người đó vận hành, (b) cách nói chuyện cho êm — và CỐ Ý
// KHÔNG trả về điểm yếu dạng "chỗ dễ bị lung lay", không trả về cung Tật Ách
// dưới dạng bệnh tật, không trả về Phu Thê của họ. Xem `KHONG_DOC` bên dưới.
// ============================================================

import type { Laso } from './laso';
import { currentNamXem } from './namxem';
// C1 — bảng trích dẫn cổ thư theo chính tinh cung Mệnh. DÙNG CHUNG với tool
// tiền kiếp thay vì chép: hai bảng trích dẫn cùng 14 sao sẽ trôi khỏi nhau, và
// lúc đó câu trích chỉ còn đúng ở một bên.
import { MENH_ROLE } from './past-life';
import {
  KIEU,
  type KieuDef,
  type KieuId,
  phanKieu,
  type PhanKieu,
  palaceByName,
  majorsOrBorrow,
  starLabel,
  kieuCuaCung,
  resolveVanNam,
  vanNamLine,
  LUAT_VAN_NAM_AN_CUNG,
  type VanNam,
} from './cong-so';

type Rec = Record<string, unknown>;

// ── Quan hệ ─────────────────────────────────────────────────
//
// `cungCuaBan` = cung TRONG LÁ SỐ NGƯỜI XEM nói về hạng người này, theo CỔ
// PHÁP: bề trên → Phụ Mẫu · ngang hàng → Huynh Đệ · dưới quyền/bạn nghề → Nô
// Bộc · bạn đời → Phu Thê · con → Tử Tức. Có tài liệu hiện đại đọc cấp trên ở
// cung Tật Ách; đó là biến thể của một tác giả, không kiểm chứng được, và track
// Công Sở đã cố ý không dùng — giữ nguyên quyết định đó ở đây.

export type QuanHeId =
  | 'sep'
  | 'dong-nghiep'
  | 'cap-duoi'
  | 'doi-tac'
  | 'cha-me'
  | 'con-cai'
  | 'ban-doi'
  | 'ban-be';

export interface QuanHeDef {
  id: QuanHeId;
  label: string;
  /** Cung trong lá số NGƯỜI XEM ứng với hạng người này. */
  cungCuaBan: string;
  /** Điều người ta thật sự cần khi hỏi về hạng người này. */
  nhuCau: string;
}

export const QUAN_HE: Record<QuanHeId, QuanHeDef> = {
  sep: {
    id: 'sep',
    label: 'Sếp / cấp trên',
    cungCuaBan: 'Phụ Mẫu',
    nhuCau: 'Trình bày thế nào để được duyệt, và lúc nào thì đừng trình bày.',
  },
  'dong-nghiep': {
    id: 'dong-nghiep',
    label: 'Đồng nghiệp ngang hàng',
    cungCuaBan: 'Huynh Đệ',
    nhuCau: 'Chia việc thế nào cho khỏi giẫm chân, và tránh cái gì để khỏi mất lòng.',
  },
  'cap-duoi': {
    id: 'cap-duoi',
    label: 'Cấp dưới / người mình quản',
    cungCuaBan: 'Nô Bộc',
    nhuCau: 'Giao việc kiểu nào thì họ chạy, nhắc kiểu nào thì họ nghe.',
  },
  'doi-tac': {
    id: 'doi-tac',
    label: 'Đối tác / khách hàng',
    cungCuaBan: 'Nô Bộc',
    nhuCau: 'Họ quyết bằng cái gì, và điều gì làm họ chùn lại.',
  },
  'cha-me': {
    id: 'cha-me',
    label: 'Cha mẹ / người lớn trong nhà',
    cungCuaBan: 'Phụ Mẫu',
    nhuCau: 'Nói chuyện thế nào để không thành cãi nhau về cùng một chuyện cũ.',
  },
  'con-cai': {
    id: 'con-cai',
    label: 'Con cái',
    cungCuaBan: 'Tử Tức',
    nhuCau: 'Đứa trẻ này cần được thúc hay cần được để yên.',
  },
  'ban-doi': {
    id: 'ban-doi',
    label: 'Vợ / chồng / người yêu',
    cungCuaBan: 'Phu Thê',
    nhuCau: 'Chỗ nào là khác biệt tính cách chứ không phải hết thương.',
  },
  'ban-be': {
    id: 'ban-be',
    label: 'Bạn bè',
    cungCuaBan: 'Huynh Đệ',
    nhuCau: 'Trông cậy được ở việc gì, và đừng trông cậy ở việc gì.',
  },
};

export const QUAN_HE_IDS = Object.keys(QUAN_HE) as QuanHeId[];

// ── Việc đang cần làm ───────────────────────────────────────
//
// 🔑 VÌ SAO CÓ Ô NÀY. Trước đây bản trả tiền nhận ĐÚNG cùng một hồ sơ với bản
// tính thử (đã kiểm: `buildNguoiKhacPrompt` và `meta()` đọc gần trùng khít một
// object) ⇒ model không có thêm một dữ kiện nào để nói, nên nó chỉ có thể diễn
// đạt lại thứ người ta vừa đọc miễn phí. Đó là lỗi CẤU TRÚC, sửa prompt bao
// nhiêu vòng cũng không ra thông tin mới. Ô này là dữ kiện MỚI do chính người
// hỏi cấp ⇒ đầu vào khác thì đầu ra khác thật.
//
// ⚠️ MỘT DANH SÁCH PHẲNG + CỜ `hop`, KHÔNG PHẢI MA TRẬN 8 quan hệ × N việc.
// Cùng bài học "BA TRỤC ĐỘC LẬP, KHÔNG VIẾT MA TRẬN" của track Công Sở: viết
// 8×10 = 80 ô thì mỗi lần thêm một quan hệ phải viết thêm 10 ô, và không ai
// soát nổi. Ở đây mỗi việc tự khai nó hợp với những quan hệ nào.

export type ViecId =
  | 'nho-viec'
  | 'thuong-luong'
  | 'bao-tin-xau'
  | 'tu-choi'
  | 'bat-dong'
  | 'giao-viec'
  | 'ru-hop-tac'
  | 'gan-lai'
  | 'lan-dau'
  | 'hieu-them';

export interface ViecDef {
  id: ViecId;
  label: string;
  /** Điều người hỏi thật sự cần nghe khi chọn mục này. */
  can: string;
  /** Quan hệ nào thì việc này có nghĩa. Rỗng = hợp mọi quan hệ. */
  hop: QuanHeId[];
}

export const VIEC_CAN_LAM: Record<ViecId, ViecDef> = {
  'nho-viec': {
    id: 'nho-viec',
    label: 'Sắp nhờ họ một việc / trình một đề xuất',
    can: 'Trình bày theo thứ tự nào thì lọt, và chỗ nào trong cách trình bày sẽ làm họ chững lại.',
    hop: ['sep', 'dong-nghiep', 'doi-tac', 'cha-me', 'ban-doi', 'ban-be'],
  },
  'thuong-luong': {
    id: 'thuong-luong',
    label: 'Sắp thương lượng quyền lợi (lương, chia phần)',
    can: 'Người này quyết bằng cái gì, và mở lời bằng con số trước hay bằng lý lẽ trước.',
    hop: ['sep', 'dong-nghiep', 'doi-tac'],
  },
  'bao-tin-xau': {
    id: 'bao-tin-xau',
    label: 'Sắp phải báo một tin họ không muốn nghe',
    can: 'Nói thẳng hay nói vòng, nói riêng hay nói chung — và câu mở đầu nào khiến họ nghe hết.',
    hop: [],
  },
  'tu-choi': {
    id: 'tu-choi',
    label: 'Phải từ chối họ mà không muốn mất quan hệ',
    can: 'Từ chối kiểu nào thì người này coi là sòng phẳng, kiểu nào thì coi là bị coi thường.',
    hop: [],
  },
  'bat-dong': {
    id: 'bat-dong',
    label: 'Đang có bất đồng chưa gỡ được',
    can: 'Phần nào là khác biệt tính khí (không gỡ được, phải né) và phần nào là cách nói (sửa được ngay).',
    hop: [],
  },
  'giao-viec': {
    id: 'giao-viec',
    label: 'Cần giao việc / nhắc việc cho họ',
    can: 'Giao kiểu nào thì họ chạy, nhắc kiểu nào thì họ nghe mà không thấy bị soi.',
    hop: ['dong-nghiep', 'cap-duoi', 'doi-tac', 'con-cai'],
  },
  'ru-hop-tac': {
    id: 'ru-hop-tac',
    label: 'Muốn rủ họ làm chung một việc lớn',
    can: 'Người này bị thuyết phục bởi cái gì, và chỗ nào trong việc chung sẽ khiến họ rút.',
    hop: ['dong-nghiep', 'cap-duoi', 'doi-tac', 'ban-be', 'ban-doi'],
  },
  'gan-lai': {
    id: 'gan-lai',
    label: 'Muốn gần lại sau một thời gian xa cách',
    can: 'Cửa nào còn mở: chuyện gì họ còn chịu nghe, và cách mở lời nào làm họ đóng lại ngay.',
    hop: ['cha-me', 'con-cai', 'ban-doi', 'ban-be', 'dong-nghiep'],
  },
  'lan-dau': {
    id: 'lan-dau',
    label: 'Sắp gặp / làm việc lần đầu, chưa biết gì về họ',
    can: 'Ba điều nên biết trước khi mở miệng, và một điều tuyệt đối đừng làm ở lần gặp đầu.',
    hop: [],
  },
  'hieu-them': {
    id: 'hieu-them',
    label: 'Không có gì gấp, chỉ muốn hiểu người này hơn',
    can: 'Một bản mô tả con người này, đủ để nhận ra họ trong đời thường.',
    hop: [],
  },
};

export const VIEC_IDS = Object.keys(VIEC_CAN_LAM) as ViecId[];

export function resolveViec(v?: string | null): ViecId {
  return VIEC_IDS.includes(v as ViecId) ? (v as ViecId) : 'hieu-them';
}

/** Việc nào bày ra cho quan hệ này. `hop` rỗng = hợp mọi quan hệ. */
export function viecChoQuanHe(q: QuanHeId): ViecDef[] {
  return VIEC_IDS.map((id) => VIEC_CAN_LAM[id]).filter((v) => v.hop.length === 0 || v.hop.includes(q));
}

export function resolveQuanHe(v?: string | null): QuanHeId {
  return QUAN_HE_IDS.includes(v as QuanHeId) ? (v as QuanHeId) : 'sep';
}

// ── Những cung CỐ Ý KHÔNG ĐỌC ───────────────────────────────
//
// Người được xem không có mặt để đồng ý. Nên tool dừng ở phần "làm việc và nói
// chuyện với nhau", không đi vào đời riêng của họ:
//   • Tật Ách   — sức khoẻ/bệnh tật của người vắng mặt
//   • Phu Thê   — hôn nhân của họ (trừ khi CHÍNH người xem là bạn đời)
//   • Tài Bạch  — tiền bạc riêng
// Đây là ràng buộc DỮ LIỆU, không phải lời dặn prompt: cung nào không nằm
// trong payload thì model không có gì để luận, kể cả khi bị dụ.
export const KHONG_DOC = ['Tật Ách', 'Tài Bạch', 'Phu Thê', 'Tử Tức', 'Điền Trạch'] as const;

/**
 * 🔴 LỚP THỨ BA của cùng ràng buộc trên — LỌC CHÍNH CÂU CHỮ, không chỉ lọc cung.
 *
 * `KHONG_DOC` chặn được việc ĐỌC 5 cung đó. Nhưng 5 cung ĐƯỢC ĐỌC (Mệnh · Phúc
 * Đức · Thiên Di · Quan Lộc · Nô Bộc) mang theo `cachCucTungCung` — chuỗi diễn
 * giải engine viết cho một bản luận TRỌN ĐỜI của CHÍNH CHỦ — và chính mấy chuỗi
 * đó nói về chết chóc, bệnh tật, hôn nhân, con cái, tiền bạc. Chúng đi THẲNG ra
 * giao diện, vào prompt và vào rail mà không qua cửa nào.
 *
 * Đo trên bản chưa vá:
 *   • Lá Số Người Khác — 1.152 lá số: 84,6% in chữ thọ mệnh/chết chóc, 62,6%
 *     bệnh tật, 94,0% dính ít nhất một nhóm.
 *   • Dạy Con — 384 lá số TRẺ EM: 75,5% chết chóc, 40,6% bệnh tật. Nguyên văn
 *     lọt ra màn hình: *"Tuần/Triệt tại Thiên Di: phiền lòng, chết xa nhà"*,
 *     *"trai sát vợ, gái khắc chồng"* — về một đứa trẻ.
 *
 * 🔑 CHẶN CẢ LĨNH VỰC, KHÔNG CHỈ CHẶN CÂU XẤU. Bản đầu tao chỉ chặn register báo
 * động, đo ra vẫn để lọt *"giàu sang, sống lâu"* và *"tăng thọ"* — tức chặn
 * "giảm thọ" nhưng in "sống lâu", chặn "nghèo" nhưng in "giàu sang". Tuỳ tiện,
 * và người biết tử vi nhìn ra ngay là tool tự mâu thuẫn với lời nó hứa. Lời hứa
 * là KHÔNG NÓI về thân thể/thọ mệnh/hôn nhân/con cái/tiền bạc/nhà đất của người
 * vắng mặt — khen cũng không.
 *
 * ⚠️ `kinh doanh` CỐ Ý KHÔNG chặn: đó là NĂNG LỰC nghề (cung Quan Lộc), khác
 * hẳn MỨC GIÀU NGHÈO (cung Tài Bạch). Chặn nó là cắt mất đúng thứ tool này sinh
 * ra để nói.
 *
 * Bỏ NGUYÊN DÒNG chứ không cắt mệnh đề: chuỗi là văn xuôi tự do, dấu phân cách
 * không thống nhất, mổ giữa câu là sinh ra câu cụt vô nghĩa. Đo sau khi lọc:
 * còn 7,13 dòng/hồ sơ (thô 11,41) và **0% hồ sơ mất trắng** — khối "cơ sở" vẫn
 * đủ dày để làm bằng chứng engine đọc thật.
 *
 * ⛔ KHÔNG áp cho Tử Vi Công Sở: tool đó đọc lá số CHÍNH CHỦ, người ta tự đưa lá
 * số mình vào, nói về sức khoẻ hay tiền bạc của họ là việc bình thường.
 */
const CAM_NOI = new RegExp(
  [
    // thọ mệnh — khen hay chê đều không nói.
    // ⚠️ Bắt GỐC TỪ `thọ`, không liệt kê từng cụm: bản đầu tao ghi đủ
    // `giảm thọ|đoản thọ|tăng thọ|trường thọ` mà vẫn để lọt **328 lượt** vì
    // engine còn viết `tăng tuổi thọ` và `phúc thọ`. Liệt kê cụm thì luôn thiếu
    // đúng cụm mình chưa nghĩ ra.
    'thọ|sống lâu|yểu|chết|tử vong|mất sớm|khó nuôi|tang chế|tang môn',
    // Tật Ách — cũng bắt gốc từ `tật`, vì "mang tật" và "tật lưng" lọt qua mọi
    // biến thể ghép sẵn.
    'bệnh|tật|tai nạn|mổ xẻ|phẫu thuật|tàn phế|ốm đau',
    // Phu Thê
    'vợ|chồng|hôn nhân|thê thiếp|lấy lẽ|đa phu|đa thê|ngoại tình|ly dị|ly hôn',
    // Tử Tức
    'con cái|đông con|hiếm con|muộn con|quý tử|sảy thai|vô sinh',
    // Tài Bạch — MỨC giàu nghèo, không phải năng lực làm ăn
    'giàu|phú quý|tài lộc|tiền của|của cải|nghèo|túng|phá sản|khánh kiệt|tán tài|nợ nần',
    // Điền Trạch
    'nhà cửa|ruộng đất|điền sản|bất động sản',
  ].join('|'),
  'i',
);

/**
 * Lọc danh sách cách cục trước khi cho ra khỏi engine.
 *
 * Dùng cho MỌI tool đọc lá số người KHÔNG có mặt. Áp ở tầng engine nên cả ba
 * đường tiêu thụ (giao diện · prompt · rail) cùng sạch — vá một đường rồi quên
 * hai đường kia đúng là lỗi đã mắc ở vụ rò tên cung.
 */
export function locCachCuc(lines: readonly string[] | undefined): string[] {
  return (lines || []).filter((c) => !CAM_NOI.test(c));
}

/** Các cung được đọc, kèm nhãn nói rõ nó dùng để làm gì trong bản cẩm nang. */
const MAT_DOC: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Cốt cách', y: 'Con người gốc — cái không đổi dù đổi việc, đổi chỗ' },
  { cung: 'Phúc Đức', nhan: 'Nền tâm tính', y: 'Cái làm họ thấy yên hay thấy bất an, thứ họ tin là đáng sống' },
  { cung: 'Thiên Di', nhan: 'Ra ngoài', y: 'Cách họ cư xử với người ngoài — đây là mặt bạn gặp nhiều nhất' },
  { cung: 'Quan Lộc', nhan: 'Cách làm việc', y: 'Họ coi trọng gì trong công việc, làm kiểu nào thì thấy đúng' },
  { cung: 'Nô Bộc', nhan: 'Với người xung quanh', y: 'Họ kết giao và giữ người thế nào' },
];

/**
 * A1 — hai mặt đọc bản TÍNH THỬ được phát, ba mặt còn lại nằm sau tường.
 *
 * 🔑 Chia theo NGUYÊN TẮC "miễn phí = DANH TÍNH, trả tiền = QUYẾT ĐỊNH", không
 * chia cho tròn số:
 *   • **Mệnh** và **Thiên Di** là hai mặt người hỏi TỰ KIỂM CHỨNG ĐƯỢC — cốt
 *     cách và "mặt bạn gặp nhiều nhất". Chúng làm nhiệm vụ chứng minh engine
 *     đọc đúng lá số một người có thật, tức giữ nguyên lá chắn cho phản đối số
 *     1 *"AI nó bịa thôi"*. Bỏ nốt hai mặt này là bỏ luôn bằng chứng.
 *   • **Phúc Đức** (cái làm họ thấy yên → đòn bẩy thuyết phục), **Quan Lộc**
 *     (họ coi trọng gì khi làm việc → mặt bàn thương lượng) và **Nô Bộc** (họ
 *     giữ người thế nào → mặt quan hệ) là thứ DÙNG ĐƯỢC VÀO VIỆC. Đó là món
 *     hàng.
 *
 * Đặt ở engine chứ không ở route: tường khoá gọi tên đúng ba mặt bị giữ lại,
 * hai bên lệch nhau là hứa hụt hoặc phát không.
 */
export const MAT_DOC_PREVIEW = ['Mệnh', 'Thiên Di'] as const;

export interface MatDoc {
  cung: string;
  nhan: string;
  y: string;
  sao: string[];
  muon: boolean;
  /** Ý nghĩa cách cục engine gắn cho chính cung này. Tối đa 3 — đủ nói, không ngập. */
  cachCuc: string[];
  diem: number | null;
}

export interface VoiBan {
  /** Cung trong lá số NGƯỜI XEM nói về hạng người này. */
  cung: string;
  sao: string[];
  muon: boolean;
  kieu: KieuId | null;
  kieuTen: string;
  /** Kiểu của họ có trùng kiểu mà cung này của bạn mô tả không. */
  khop: boolean | null;
  /** Hai kiểu cùng tính âm/dương → dễ va; khác tính → dễ bù. */
  cungTinh: boolean;
}

export interface NguoiKhacProfile {
  namXem: number;
  quanHe: QuanHeDef;
  /** Việc người hỏi đang cần làm với người này — dữ kiện do CHÍNH họ cấp. */
  viec: ViecDef;
  gioiTinh: 'nam' | 'nu';
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  /** Cung an Thân — nửa đời sau họ dồn về đâu. `null` khi rơi vào cung cấm. */
  than: { cung: string; y: string } | null;
  matDoc: MatDoc[];
  vanNam: VanNam | null;
  /** Đại vận đang chạy của HỌ — dùng cho phần "lúc nào nên nhờ vả". */
  daiVan: { tuoiStart: number; tuoiEnd: number; cung: string; sao: string[]; diem: number | null } | null;
  voiBan: VoiBan | null;
}

/** Cung an Thân nói nửa đời sau dồn về đâu — 6 khả năng theo cổ pháp. */
const THAN_Y: Record<string, string> = {
  Mệnh: 'Dồn cả đời về chính mình — họ không rẽ nhánh, càng về sau càng đúng là con người gốc ở trên.',
  'Phúc Đức': 'Càng về sau càng đặt sự yên ổn và ý nghĩa lên trên thành bại.',
  'Quan Lộc': 'Càng về sau càng lấy công việc làm chỗ dựa cho cả con người.',
  'Thiên Di': 'Càng về sau càng sống ở bên ngoài — quan hệ, đi lại, môi trường mới.',
  'Tài Bạch': 'Càng về sau càng quy mọi thứ về chuyện thu xếp được hay không.',
  'Phu Thê': 'Càng về sau càng bị chi phối bởi người bạn đời và đời sống gia đình.',
};

// 🪤 Lá số KHÔNG có trường `cungThan` — chỉ có cờ `isThan` trên từng cung (đã
// kiểm trên engine thật). Đọc `ls.cungThan` là ra `undefined` rồi cả khối này
// rỗng một cách im lặng.
/**
 * Cung an Thân — nửa đời sau họ dồn về đâu.
 *
 * 🔒 Trả `null` khi Thân đóng vào một cung `KHONG_DOC` (đo được **33,3%** lá số:
 * Thân chỉ rơi vào 6 cung, mà Tài Bạch và Phu Thê nằm trong danh sách cấm).
 * `THAN_Y['Phu Thê']` nguyên văn là *"càng về sau càng bị chi phối bởi người bạn
 * đời và đời sống gia đình"* — đó CHÍNH LÀ một lời đọc cung Phu Thê, chỉ khoác
 * cái tên khác. Nói nó ra là đi vòng qua cửa vừa khoá.
 */
function thanCung(ls: Laso): { cung: string; y: string } | null {
  const p = ((ls.palaces as Rec[]) || []).find((x) => x && x.isThan === true);
  const cung = String(p?.cungName || '');
  if (!cung || (KHONG_DOC as readonly string[]).includes(cung)) return null;
  return { cung, y: THAN_Y[cung] || '' };
}


/**
 * Hồ sơ ứng xử với MỘT người, suy từ lá số của chính họ.
 *
 * `lsBan` (lá số người xem) là TUỲ CHỌN — thiếu thì phần "Người này với bạn"
 * rỗng, mọi phần còn lại vẫn đầy đủ. CỐ Ý không bắt buộc: bắt nhập hai lá số
 * mới xem được là dựng thêm một bức tường ở đúng chỗ người ta hay bỏ ngang.
 */
export function computeNguoiKhac(
  ls: Laso,
  gioiTinh: 'nam' | 'nu',
  quanHeId: QuanHeId,
  lsBan?: Laso | null,
  namXem?: number,
  viecId?: ViecId,
): NguoiKhacProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  // 🪤 `resolveQuanHe` gọi Ở ĐÂY cho cân với `resolveViec` ngay dưới. Trước đây
  // hàm này TIN thẳng `quanHeId`: id lạ → `QUAN_HE[id]` là `undefined` → hồ sơ
  // dựng ra thiếu hẳn `quanHe`, và chỗ vỡ là `railData` ở tận cuối đường, không
  // phải chỗ nhập sai. Route hiện luôn resolve trước nên chưa ai vấp, nhưng để
  // hai tham số cùng loại xử lý khác nhau là bày sẵn bẫy cho đường gọi sau.
  const quanHe = QUAN_HE[resolveQuanHe(quanHeId)];
  // Việc không hợp với quan hệ đang chọn thì rơi về 'hieu-them' — người dùng
  // đổi quan hệ sau khi đã chọn việc là ra tổ hợp vô nghĩa ("giao việc cho
  // sếp"), mà tổ hợp đó đi thẳng vào prompt.
  const viecRaw = VIEC_CAN_LAM[resolveViec(viecId)];
  const viec = viecRaw.hop.length === 0 || viecRaw.hop.includes(quanHeId) ? viecRaw : VIEC_CAN_LAM['hieu-them'];
  const phan = phanKieu(ls);
  const scores = (ls.cungScores as Record<string, Rec>) || {};
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};

  const matDoc: MatDoc[] = MAT_DOC.map((m) => {
    const p = palaceByName(ls, m.cung);
    const b = majorsOrBorrow(ls, p);
    const sc = scores[m.cung];
    return {
      cung: m.cung,
      nhan: m.nhan,
      y: m.y,
      sao: b.stars.map(starLabel),
      muon: b.muon,
      // ⚠️ LỌC TRƯỚC, CẮT SAU. Cắt 3 dòng đầu rồi mới lọc thì gặp lá số có 3
      // dòng đầu toàn chữ cấm là mất trắng khối cơ sở, trong khi dòng thứ 4
      // dùng được vẫn nằm đó.
      cachCuc: locCachCuc(cachCucTung[m.cung]).slice(0, 3),
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : null,
    };
  });

  const vanNam = resolveVanNam(ls, nam);

  const dv = ls.daiVanHienTai as Rec | undefined;
  const dvP = dv && typeof dv.cungIdx === 'number' ? ((ls.palaces as Rec[]) || [])[dv.cungIdx as number] : undefined;
  const dvSc = dv?.scoring as Rec | undefined;
  const daiVan = dv
    ? {
        tuoiStart: Number(dv.tuoiStart) || 0,
        tuoiEnd: Number(dv.tuoiEnd) || 0,
        cung: String(dvP?.cungName || ''),
        sao: majorsOrBorrow(ls, dvP).stars.map(starLabel),
        diem: typeof dvSc?.tong === 'number' ? (dvSc.tong as number) : null,
      }
    : null;

  let voiBan: VoiBan | null = null;
  if (lsBan) {
    const k = kieuCuaCung(lsBan, quanHe.cungCuaBan);
    voiBan = {
      cung: quanHe.cungCuaBan,
      sao: k.sao.map(starLabel),
      muon: k.muon,
      kieu: k.kieu,
      kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
      khop: k.kieu ? k.kieu === phan.kieu : null,
      // Hai kiểu CÙNG tính âm/dương thì cùng cách phản ứng nên dễ va vào nhau;
      // khác tính thì một bên xông một bên giữ, dễ bù hơn. Đây là luật âm dương
      // tương bổ mà phần Ghép Đội của tool Công Sở đã dùng.
      cungTinh: k.kieu ? KIEU[k.kieu].amDuong === KIEU[phan.kieu].amDuong : false,
    };
  }

  return {
    namXem: nam,
    quanHe,
    viec,
    // 🪤 Giới tính KHÔNG nằm trong lá số engine trả về (đã kiểm) — phải truyền
    // vào. Đọc `ls.gioiTinh` là luôn ra 'nam', sai im lặng cho một nửa người xem.
    gioiTinh,
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    than: thanCung(ls),
    matDoc,
    vanNam,
    daiVan,
    voiBan,
  };
}

/**
 * Tên các khối CHƯA MỞ, sinh từ dữ liệu thật của chính lá số này.
 *
 * 🔑 VÌ SAO KHÔNG ĐỂ TRANG CHÉP TAY. Trước đây `app-nguoi-khac.html` giữ một
 * mảng `NK_KHOA` viết cứng 6 dòng chung chung ("Con người này vận hành thế
 * nào") — nói y hệt nhau cho mọi lá số, nên không mở được vòng tò mò nào. Nêu
 * đích danh thứ đang khoá thì mới có cái để muốn biết.
 *
 * ⚠️ LUẬT CỨNG, ĐỌC TRƯỚC KHI THÊM DÒNG: mỗi mục ở đây PHẢI ứng với một trường
 * CÓ THẬT trong payload đường trả tiền (`id` chính là tên trường). Bịa một tiêu
 * đề nghe hay mà bản đầy đủ không có nội dung đó là **hứa hụt** — thứ repo tự
 * dặn tránh, và là cách nhanh nhất mất niềm tin ngay ở lượt trả tiền đầu tiên.
 * Có test canh đúng chỗ này: mọi `id` phải nằm trong payload thật.
 *
 * Vì thế `voiBan` CHỈ xuất hiện khi có lá số người hỏi — đúng điều kiện mà
 * `buildReport` dùng để quyết định có nhận mục đó hay không.
 */
/**
 * C1 — BÀY ENGINE RA. Lá chắn cho phản đối số 1: *"AI nó bịa thôi"*.
 *
 * Hai thứ, cả hai đều phải ĐÚNG chứ không phải câu quảng cáo:
 *
 * 1. **Số dữ kiện ĐẾM THẬT từ chính lá số này** — số sao an được + số dòng cách
 *    cục + số chặng đại vận. Không viết cứng một con số tròn: con số tròn giống
 *    hệt cho mọi người là dấu hiệu đầu tiên người ta nhận ra mình đang bị bịa.
 *
 * 2. **Một câu cổ thư NGUYÊN VĂN, có nguồn** — lấy từ `MENH_ROLE`, bảng đã dẫn
 *    sẵn Vương Đình Chi / Tân Biên kèm số mục cho đủ 14 chính tinh.
 *
 * 🔑 **CỐ Ý trích ở cung MỆNH, không trích ở Quan Lộc.** Bảng
 * `PAIR_OCCUPATION_TABLE` cũng có trích dẫn thật và còn dày hơn — nhưng nó nói
 * về cung Quan Lộc, mà A1 vừa đưa cung đó ra sau tường. Trích ở đó là vừa bán
 * vừa cho. Mệnh nằm trong 2 mặt free (`MAT_DOC_PREVIEW`) nên câu trích chỉ
 * CHỨNG THỰC ngôi sao người ta ĐÃ THẤY, không hé thêm mặt nào.
 *
 * ⚠️ **KHÔNG BAO GIỜ tự viết một câu rồi gán cho cổ thư.** Trả `null` khi cung
 * Mệnh vô chính diệu và mượn cũng không ra sao nào — thiếu một dòng còn hơn bịa
 * một dòng, đúng luật đã ghi ở track Kỳ Môn.
 */
export interface CoSoDoc {
  /** Số sao an được trên 12 cung. */
  soSao: number;
  /** Số dòng cách cục engine chấm ra. */
  soCachCuc: number;
  /** Số chặng đại vận. */
  soDaiVan: number;
  /** Tổng ba con số trên — "đọc từ N dữ kiện". */
  tong: number;
  trichDan: { sao: string; cau: string } | null;
}

/** Đếm dữ kiện engine đọc được từ MỘT lá số. Tách riêng để nhóm (Sổ Nhân Mạch)
 *  cộng dồn được nhiều lá số mà không phải chép lại phép đếm. */
export function demDuKien(ls: Laso): { soSao: number; soCachCuc: number; soDaiVan: number } {
  const palaces = ((ls.palaces as Rec[]) || []);
  let soSao = 0;
  for (const c of palaces) soSao += (((c?.stars as unknown[]) || []).length);
  const cc = (ls.cachCucTungCung as Record<string, string[]>) || {};
  let soCachCuc = 0;
  for (const k of Object.keys(cc)) soCachCuc += (cc[k] || []).length;
  return { soSao, soCachCuc, soDaiVan: ((ls.daiVans as unknown[]) || []).length };
}

/**
 * Câu cổ thư cho chính tinh cung Mệnh, nhận NHÃN sao ("Vũ Khúc (Miếu) [Hóa Khoa]").
 *
 * ⚠️ Dùng CHUNG cho mọi tool đọc lá số người vắng mặt. `nhan-mach` KHÔNG gọi hàm
 * này: tool đó đọc cả NHÓM, không có "cung Mệnh của ai" để trích, và bốc đại
 * một thành viên rồi trích cho họ là gán một câu cổ thư cho nhầm người.
 */
export function trichDanMenh(saoLabels: readonly string[]): { sao: string; cau: string } | null {
  for (const raw of saoLabels || []) {
    // `sao` là NHÃN ("Vũ Khúc (Miếu) [Hóa Khoa]") — cắt lấy tên sao trần.
    const ten = String(raw).replace(/\s*[([].*$/, '').trim();
    const r = MENH_ROLE[ten];
    if (!r?.source) continue;
    // 🔒 CÂU CỔ THƯ CŨNG PHẢI QUA `locCachCuc`. Bài kiểm của chính vòng này bắt
    // được **32/480** câu trích chạm chủ đề cấm — nguyên văn Tân Biên 4.2.1 có
    // *"tuổi thọ cũng gia tăng"*. Cổ thư nói về thọ mệnh là chuyện bình thường
    // của cổ thư; cái sai là đem nó nói về một người KHÔNG CÓ MẶT. Dùng đúng
    // một bộ lọc cho cả cách cục lẫn trích dẫn, đừng dựng bộ thứ hai.
    if (!locCachCuc([r.source]).length) continue;
    return { sao: ten, cau: r.source };
  }
  return null;
}

export function coSoDoc(ls: Laso, p: { matDoc: { cung: string; sao: string[] }[] }): CoSoDoc {
  const d = demDuKien(ls);
  const menh = p.matDoc.find((m) => m.cung === 'Mệnh');
  return {
    ...d,
    tong: d.soSao + d.soCachCuc + d.soDaiVan,
    trichDan: trichDanMenh(menh?.sao || []),
  };
}

export function khoiKhoa(p: NguoiKhacProfile): { id: string; tieuDe: string }[] {
  const k: { id: string; tieuDe: string }[] = [];

  // Khối của A3 đứng ĐẦU: nó là thứ DUY NHẤT đổi theo việc người hỏi đang cần
  // làm, tức thứ bản tính thử không thể có kể cả về nguyên tắc.
  if (p.viec.id !== 'hieu-them') {
    k.push({ id: 'keHoach', tieuDe: `Cách đi cho việc: ${p.viec.label.replace(/^Sắp |^Phải |^Cần |^Muốn /, '')}` });
  }
  k.push({ id: 'tinhKhi', tieuDe: `Người kiểu ${p.kieu.ten} này vận hành thế nào trong đời thật` });

  // A1 — ba mặt đọc bị giữ lại. `id` là `matDoc`, một trường CÓ THẬT trong
  // payload trả tiền, đúng luật cứng của A2. Tiêu đề gọi ĐÍCH DANH cung và
  // chính tinh đang ngồi đó: nói "còn 3 mặt nữa" thì không mở được vòng tò mò
  // nào, nói "cung Quan Lộc của họ có Tử Vi + Thất Sát" thì mở được.
  const giu = p.matDoc.filter((m) => !(MAT_DOC_PREVIEW as readonly string[]).includes(m.cung));
  if (giu.length) {
    const ten = giu.map((m) => m.nhan.toLowerCase()).join(' · ');
    const sao = giu.flatMap((m) => m.sao).slice(0, 3).join(', ');
    k.push({
      id: 'matDoc',
      tieuDe: sao
        ? `${giu.length} mặt còn lại của người này — ${ten} (đọc ở ${sao})`
        : `${giu.length} mặt còn lại của người này — ${ten}`,
    });
  }
  k.push({ id: 'coiTrong', tieuDe: 'Họ coi trọng cái gì — và sợ mất cái gì' });
  k.push({ id: 'chamNoc', tieuDe: 'Điều làm người này khó chịu nhất' });
  k.push({ id: 'nenNoi', tieuDe: 'Ba việc nên nói, kèm câu nói thật để dùng luôn' });
  k.push({ id: 'tranhNoi', tieuDe: 'Ba câu tuyệt đối đừng nói với người này' });
  k.push({
    id: 'thoiDiem',
    tieuDe: p.daiVan
      ? `Lúc nào nên đưa việc lớn tới — theo đại vận ${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi họ đang chạy`
      : 'Lúc nào nên đưa việc lớn tới',
  });
  if (p.voiBan) {
    k.push({ id: 'voiBan', tieuDe: `Chỗ bạn và người này va nhau — đọc ở cung ${p.voiBan.cung} của bạn` });
  }
  k.push({ id: 'motCau', tieuDe: 'Một câu chốt để nhớ về người này' });
  return k;
}

/**
 * Dữ liệu PHẲNG gửi rail.
 *
 * ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị là object — nhét mảng hay
 * object vào đây là rail nhận vài dòng rồi luận chay. Đã trả giá một lần ở tool
 * Thần Số Học, ghi lại để khỏi lặp.
 */
export function railData(p: NguoiKhacProfile): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {
    quanHe: p.quanHe.label,
    nhuCauNguoiXem: p.quanHe.nhuCau,
    viecDangCanLam: p.viec.label,
    dieuNguoiHoiCanNghe: p.viec.can,
    kieuNguoi: p.kieu.ten,
    kieuTuTuong: p.kieu.tuTuong,
    kieuMotCau: p.kieu.motCau,
    dongLuc: p.kieu.dongLuc,
    datChat: p.kieu.datChat,
    kieuDan: p.kieu.kieuDan,
    diemManh: p.kieu.manh,
    diemYeu: p.kieu.yeu,
    moiTruongHop: p.kieu.moiTruongHop,
    moiTruongKy: p.kieu.moiTruongKy,
    cauHoiChayNgam: p.kieu.cauHoi.join(' · '),
    laiKieu: p.phan.lai,
  };
  // 🔒 Thân rơi vào cung cấm → KHÔNG gửi rail. Trước đây gán vô điều kiện, nên
  // nếu chỉ trả chuỗi rỗng thay vì `null` thì lỗi này lọt im lặng — chính chỗ
  // này là lý do chọn kiểu `| null` để trình biên dịch chỉ ra.
  if (p.than) {
    d.cungThan = p.than.cung;
    d.cungThanY = p.than.y;
  }
  if (p.kieuPhu) d.kieuPhu = p.kieuPhu.ten;
  if (p.phan.vaiTro) d.vaiTroMenh = p.phan.vaiTro.role;
  for (const m of p.matDoc) {
    d['cung' + m.cung.replace(/\s+/g, '')] =
      m.sao.join(', ') + (m.muon ? ' (mượn xung chiếu)' : '') +
      (m.cachCuc.length ? ' — ' + m.cachCuc.join('; ') : '');
  }
  if (p.vanNam) {
    // Dùng CHUNG `vanNamLine` với prompt để hai chỗ không nói khác nhau; kèm
    // luật chặn rail tự chấm điểm cho năm (luật `execTraVanHan`).
    // 🔒 `anCung` — người được xem KHÔNG có mặt. Không có cờ này thì rail nhận
    // "tiểu hạn cung Tật Ách" rồi luận bệnh tật của họ, đúng cửa mà `KHONG_DOC`
    // đã chặn ở tầng dữ liệu. Vá prompt mà quên rail là chỉ khoá một nửa.
    d.vanNamNay = vanNamLine(p.vanNam, { anCung: true });
    d.luatVanNam = LUAT_VAN_NAM_AN_CUNG;
  }
  if (p.daiVan) {
    // 🔒 KHÔNG nêu tên cung đại vận — cùng lý do `anCung` ở trên, và cùng quyết
    // định mà `buildNguoiKhacPrompt` đã ghi rõ. Cung đại vận rơi vào Tật Ách /
    // Điền Trạch ở **60/144 lá số** (đã đo), tức 42% số lượt rail có sẵn cửa để
    // luận bệnh tật / nhà cửa của một người không có mặt.
    d.daiVanDangChay =
      `${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi` +
      (p.daiVan.diem == null ? '' : `, ${p.daiVan.diem}/10`);
  }
  if (p.voiBan) {
    d.cungCuaBan = p.voiBan.cung;
    d.saoCungCuaBan = p.voiBan.sao.join(', ') + (p.voiBan.muon ? ' (mượn xung chiếu)' : '');
    d.kieuCungCuaBan = p.voiBan.kieuTen;
    d.hopHayVa = p.voiBan.cungTinh ? 'cùng tính âm/dương — dễ va' : 'khác tính âm/dương — dễ bù';
  }
  return d;
}
