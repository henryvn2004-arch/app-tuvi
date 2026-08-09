// lib/engine/huong-nghiep-tre.ts
// ============================================================
// HƯỚNG NGHIỆP SỚM CHO CON — người xem là CHA MẸ / ÔNG BÀ.
//
// Câu hỏi tool này trả lời: **cho con làm quen với thứ gì, và người lớn nên
// đồng hành thế nào**. Đó là câu KHÁC với ba tool đã có:
//   • `day-con`   → dạy đứa trẻ này kiểu nào thì vào (cách nói, cách ra bài)
//   • `nguoi-khac`→ sống chung cho êm
//   • `cong-so`   → đời đi làm của một NGƯỜI TRƯỞNG THÀNH
//
// ── VÌ SAO KHÔNG GỘP VÀO `day-con` — số đo, không phải cảm tính ──
// `day-con` phân trẻ thành ĐÚNG 4 KIỂU (tứ tượng) rồi tra `KIEU_HOC`. Đo trên
// 2.496 lá số trẻ em: 21 trục tính khí cắt cùng tệp đó ra **359 bộ trục khác
// nhau**, và hai đứa CÙNG một kiểu chỉ giống nhau **cosine 0,54**. Tức 4 kiểu
// mới nói được khoảng một nửa. Bộ trục phổ biến nhất trong một kiểu chỉ chiếm
// 5–12% ⇒ tầng này có nội dung thật, không phải đội tên khác cho 4 kiểu.
//
// ── LUẬT VIẾT `hinh`: CHỈ KHAI THÀNH PHẦN DƯƠNG ──
// 🔑 Đo ra: các trục có nền lệch nhau rất xa trên lá số trẻ em (tỉ mỉ TB +1,26 ·
// chính trực +1,08 · chịu áp lực +1,01 · hợp tác −0,53). Hình nào khai số ÂM
// lớn ở một trục nền CAO thì bị phạt oan — bản đầu viết kiểu đó làm hướng
// "Tưởng tượng" tụt còn **0,2%**, gần như chết. Ở Công Sở chuyện này TỰ TRIỆT
// vì mọi nhánh trong một lĩnh vực cùng chịu độ lệch ấy; ở đây không có cổng
// lĩnh vực nên phải xử lý tay.
// ⇒ Mỗi hướng chỉ khai "cần gì" (số dương). Phần "không cần" để phép TRỪ NỀN
//   tự sinh ra. Sau khi sửa: cả 9 hướng đều sống (4,7%–21,0%).
// ⚠️ Trừ nền ở phía HÌNH, TUYỆT ĐỐI không z-score phía NGƯỜI — luật 1 của
//   `nghe-nghiep.ts` vẫn giữ nguyên hiệu lực.
//
// ── ⚠️ RANH GIỚI, và nó là ràng buộc DỮ LIỆU chứ không phải lời dặn ──
// Đối tượng là **một đứa trẻ chưa trưởng thành và không có mặt**. Nên module:
//   • dùng lại `KHONG_DOC` — không đọc Tật Ách (bệnh), Phu Thê (hôn nhân của
//     một đứa trẻ!), Tài Bạch, Tử Tức, Điền Trạch;
//   • KHÔNG chấm điểm tổng, KHÔNG xếp hạng "đứa này được mấy phần";
//   • nói bằng **xu hướng và việc nên cho làm quen**, không nói bằng **nghề
//     phải theo**. Tên nghề chỉ hiện từ lứa tuổi `giua` (8+) trở lên và luôn
//     kèm chữ "để hình dung" — bày danh sách nghề cho đứa 5 tuổi là vô nghĩa.
//   • có hẳn một trạng thái **`chuaRoNet`**: 6,1% lá số không hướng nào vượt
//     ngưỡng. Nói thẳng "chưa nghiêng hẳn, tuổi này là bình thường, nên cho
//     thử rộng" — đó là lời khuyên ĐÚNG, không phải lời bào chữa cho tool.
//
// ── ⚠️ NGUỒN, nói rõ để khỏi mượn uy tín nhầm ──
// `THIEN_HUONG` (9 hướng × 21 trục + toàn bộ phần chữ) là bảng QUY CHIẾU TỰ
// ĐẶT, cùng dạng nợ với `KIEU_HOC` của Dạy Con và `DOMAIN_NGANH` của Công Sở.
// Cổ thư không có khái niệm "thiên hướng của trẻ" bằng thang điểm. Sửa là sửa
// data thuần, không đụng logic.
// ============================================================

import type { Laso } from './laso';
import { currentNamXem } from './namxem';
import {
  KIEU,
  type KieuDef,
  phanKieu,
  type PhanKieu,
  palaceByName,
  majorsOrBorrow,
  starLabel,
  namSinhTuLaSo,
} from './cong-so';
import { KHONG_DOC } from './nguoi-khac';
import { vectorNguoi, TRUC_IDS, TRUC, type TrucId } from './nghe-nghiep';

type Rec = Record<string, unknown>;
type Vec = number[];
const V = (o: Partial<Record<TrucId, number>>): Vec => TRUC_IDS.map((t) => o[t] ?? 0);

// ── Lứa tuổi ────────────────────────────────────────────────
// Ba lớp, không phải bốn: hoạt động cho đứa 5 tuổi và đứa 7 tuổi gần như một,
// còn 12 với 16 thì khác hẳn. Chia theo chỗ THẬT SỰ đổi.
export type LopId = 'nho' | 'giua' | 'lon';

export interface LopDef {
  id: LopId;
  ten: string;
  tuoi: string;
  /** Việc của người lớn trong lớp tuổi này — một câu, đọc là hiểu phải làm gì. */
  vaiChaMe: string;
}

export const LOP: Record<LopId, LopDef> = {
  nho: {
    id: 'nho',
    ten: 'Tuổi làm quen',
    tuoi: '3–7 tuổi',
    vaiChaMe:
      'Mở rộng chứ đừng chọn hộ. Việc của người lớn lúc này là bày ra đủ thứ để con chạm vào, rồi quan sát xem con dừng lại ở đâu lâu nhất.',
  },
  giua: {
    id: 'giua',
    ten: 'Tuổi thử và làm ra sản phẩm',
    tuoi: '8–12 tuổi',
    vaiChaMe:
      'Cho con làm ra một thứ trọn vẹn. Ở tuổi này cái quý không phải là học được gì mà là lần đầu biết cảm giác theo một việc tới lúc xong.',
  },
  lon: {
    id: 'lon',
    ten: 'Tuổi đào sâu và va chạm thật',
    tuoi: '13–18 tuổi',
    vaiChaMe:
      'Cho con gặp nghề thật và người thật, kể cả phần khó. Chọn hướng dựa trên một buổi nhìn tận mắt vẫn chắc hơn dựa trên mười lời khuyên.',
  },
};

/** Lứa tuổi từ TUỔI MỤ trong lá số. Ngoài 3–18 thì kẹp về hai đầu. */
export function lopTuoi(tuoi: number | null): LopId {
  if (tuoi == null) return 'giua';
  if (tuoi <= 7) return 'nho';
  if (tuoi <= 12) return 'giua';
  return 'lon';
}

// ── Điều cha mẹ đang lo ─────────────────────────────────────
// Cùng cơ chế `<select>` đổi giọng của Công Sở và Dạy Con. Người ta mở tool vì
// một chuyện cụ thể đang xảy ra trong nhà, không phải vì tò mò lá số.
export type MoiLoId =
  | 'chua-thich-gi'
  | 'me-mot-thu'
  | 'sap-chon'
  | 'khac-y-minh'
  | 'so-thua-kem'
  | 'hieu-them';

export interface MoiLoDef {
  id: MoiLoId;
  label: string;
  /** Điều cha mẹ THẬT SỰ cần nghe khi chọn mục này. */
  can: string;
}

export const MOI_LO: Record<MoiLoId, MoiLoDef> = {
  'chua-thich-gi': {
    id: 'chua-thich-gi',
    label: 'Con chưa thích gì rõ rệt, cái gì cũng nhàn nhạt',
    can: 'Chỗ nên bày ra trước để con có cơ hội chạm vào đúng thứ hợp — và mốc nào thì thôi lo.',
  },
  'me-mot-thu': {
    id: 'me-mot-thu',
    label: 'Con chỉ mê đúng một thứ, lo con lệch',
    can: 'Cái con mê có phải chỗ mạnh thật không, và nên mở thêm hướng nào cho cân mà không phải cắt thứ con đang mê.',
  },
  'sap-chon': {
    id: 'sap-chon',
    label: 'Sắp phải chọn môn / tổ hợp / trường',
    can: 'Chất việc hợp với con và cách hỏi để con tự nói ra — không phải một cái tên ngành chốt sẵn.',
  },
  'khac-y-minh': {
    id: 'khac-y-minh',
    label: 'Con thích hướng mà mình không muốn',
    can: 'Phần nào trong ý con là chỗ mạnh có thật, phần nào là bồng bột — và cách nói chuyện để không đẩy con đi xa hơn.',
  },
  'so-thua-kem': {
    id: 'so-thua-kem',
    label: 'Sợ con không theo kịp bạn bè',
    can: 'Con đang được đo bằng thước của đứa khác ở chỗ nào, và thước nào mới là thước của con.',
  },
  'hieu-them': {
    id: 'hieu-them',
    label: 'Không có gì gấp, chỉ muốn hiểu con hơn',
    can: 'Một bản mô tả thiên hướng đủ rõ để nhận ra con trong đời thường, kèm việc nên cho làm quen.',
  },
};

export const MOI_LO_IDS = Object.keys(MOI_LO) as MoiLoId[];

export function resolveMoiLo(v?: string | null): MoiLoId {
  return MOI_LO_IDS.includes(v as MoiLoId) ? (v as MoiLoId) : 'hieu-them';
}

// ── 9 thiên hướng ───────────────────────────────────────────

export type HuongId =
  | 'kham-pha'
  | 'dan-dat'
  | 'tuong-tuong'
  | 'cham-soc'
  | 'lam-dung'
  | 'ben-bi'
  | 'giao-thiep'
  | 'suy-luan'
  | 'van-dong';

export interface HuongDef {
  id: HuongId;
  ten: string;
  /** Một câu tả ĐỨA TRẺ, không tả nghề. */
  chat: string;
  /** Dấu hiệu quan sát được ở nhà — để cha mẹ đối chiếu xem có đúng con mình. */
  dauHieu: string[];
  /** Hoạt động nên cho làm quen, theo lứa tuổi. Cụ thể, làm được ở Việt Nam. */
  hoatDong: Record<LopId, string[]>;
  /** Việc người lớn nên làm. */
  chaMeNen: string;
  /** Việc phản tác dụng — phần cha mẹ hay làm sai nhất, và là phần đáng tiền nhất. */
  chaMeTranh: string;
  /** Chỗ đứa trẻ này hay bị đọc nhầm. */
  deBiHieuNham: string;
  /** CHẤT VIỆC về sau — nói bằng tính chất, không bằng tên nghề. */
  chatViec: string;
  /** Nghề có chất đó. CHỈ hiện từ lứa `giua` trở lên, và luôn là "để hình dung". */
  ngheViDu: string[];
  /** Hình 21 trục. CHỈ THÀNH PHẦN DƯƠNG — xem luật ở đầu file. */
  hinh: Partial<Record<TrucId, number>>;
}

export const THIEN_HUONG: Record<HuongId, HuongDef> = {
  'kham-pha': {
    id: 'kham-pha',
    ten: 'Khám phá · tháo lắp',
    chat: 'Muốn biết bên trong nó thế nào. Hỏi "tại sao" tới lúc người lớn hết câu trả lời, và thà làm hỏng còn hơn không được mở ra xem.',
    dauHieu: [
      'Tháo đồ chơi ra rồi không lắp lại được',
      'Hỏi tại sao liên tục, không chịu câu trả lời cho qua',
      'Thích đứng xem người ta sửa xe, sửa điện',
      'Chán ngay khi đã biết cách làm',
    ],
    hoatDong: {
      nho: [
        'Cho tháo đồ cũ đã hỏng — bàn phím, đồng hồ, quạt nhỏ — có người lớn ngồi cạnh',
        'Bộ lắp ghép KHÔNG có hướng dẫn, để tự nghĩ ra hình',
        'Trồng cây trong lọ thuỷ tinh để nhìn thấy rễ mọc',
        'Cho vào bếp đong, trộn, xem thứ gì tan thứ gì không',
      ],
      giua: [
        'Bộ mạch điện tử đơn giản — đèn LED, pin — làm ra được một cái đèn tự sáng',
        'Câu lạc bộ robot hoặc lego kỹ thuật ở trung tâm gần nhà',
        'Cho tự sửa xe đạp của chính nó, kể cả sửa hỏng',
        'Sách và kênh kiểu "vì sao cái máy này chạy được"',
      ],
      lon: [
        'Arduino hoặc micro:bit — làm một thiết bị nhỏ dùng được thật trong nhà',
        'Cuộc thi khoa học kỹ thuật cấp trường, cấp tỉnh',
        'Xin theo một người quen làm kỹ thuật trọn một buổi để nhìn nghề thật',
        'Học sửa chữa thật: điện dân dụng, xe máy, máy tính',
      ],
    },
    chaMeNen:
      'Cho hỏng. Vài trăm nghìn tiền đồ để tháo là khoản rẻ nhất cha mẹ đứa này bỏ ra được — thứ nó học từ một cái quạt hỏng nhiều hơn từ mười lời giảng.',
    chaMeTranh:
      'Trả lời "tại sao" bằng "vì nó thế". Đứa này học rất nhanh rằng hỏi người lớn là vô ích, rồi thôi hỏi — và mất luôn thói quen quý nhất của nó.',
    deBiHieuNham:
      'Bị gọi là phá đồ. Nó không phá, nó đang mở ra xem — hai việc để lại hậu quả giống nhau nhưng động cơ ngược nhau.',
    chatViec: 'Việc có bài toán chưa ai giải sẵn, và được phép thử sai nhiều lần trước khi ra kết quả.',
    ngheViDu: [
      'Kỹ sư cơ khí, điện, tự động hoá',
      'Lập trình, kỹ sư dữ liệu',
      'Nghiên cứu ứng dụng, phát triển sản phẩm',
      'Kỹ thuật viên chẩn đoán, sửa chữa chuyên sâu',
    ],
    hinh: { hamTimHieu: 2.1, chuDong: 1.7, sangTao: 1.1, chiuMoHo: 1.2 },
  },

  'dan-dat': {
    id: 'dan-dat',
    ten: 'Dẫn dắt · đứng ra tổ chức',
    chat: 'Ở đâu có nhóm là nó đứng ra chia việc. Chịu được phần trách nhiệm mà đứa khác né, và rất để ý ai làm chưa xong.',
    dauHieu: [
      'Tự nhận làm nhóm trưởng, hoặc bực khi nhóm trưởng làm không ra gì',
      'Chia việc cho anh em, bạn bè mà không ai bảo',
      'Nhớ ai hứa gì rồi nhắc lại',
      'Ấm ức rất lâu khi bị xử không công bằng',
    ],
    hoatDong: {
      nho: [
        'Giao hẳn một việc nhà có đầu có cuối — cho em ăn, tưới cây, cả tuần đều',
        'Trò chơi có phân vai và luật rõ ràng',
        'Cho quyết một việc thật của nhà: tối nay ăn gì, cuối tuần đi đâu',
        'Đọc chuyện có nhân vật phải chọn giữa hai điều đều đúng',
      ],
      giua: [
        'Làm tổ trưởng, lớp phó — chỗ có trách nhiệm thật chứ không phải cái danh',
        'Tổ chức một buổi sinh nhật từ đầu tới cuối, kể cả phần tiền',
        'Đội nhóm cần phối hợp: bóng đá, hướng đạo, đội văn nghệ',
        'Cho quản một khoản nhỏ hằng tháng và tự chịu khi tiêu hết trước hạn',
      ],
      lon: [
        'Chủ nhiệm câu lạc bộ, trưởng ban tổ chức sự kiện trường',
        'Một dự án cộng đồng nhỏ do chính nó khởi xướng và tự đi gọi người',
        'Bán một thứ có thật — làm ra, bán, chịu lãi lỗ',
        'Cho ngồi cùng một buổi họp của người lớn để nhìn cách người ta ra quyết định',
      ],
    },
    chaMeNen:
      'Giao trọn một việc kèm quyền quyết trong việc đó, rồi đừng can. Nó làm rất nghiêm phần được giao hẳn và làm rất hờ phần bị giám sát từng bước.',
    chaMeTranh:
      'Đổi luật giữa chừng, hoặc lật quyết định của nó trước mặt người khác. Đứa này chịu được phạt nặng nhưng không chịu được bất nhất — mất lòng tin ở đây là mất nhiều năm.',
    deBiHieuNham:
      'Bị cho là hống hách, thích chỉ huy. Phần lớn là nó thấy việc đang không ai cầm và không chịu nổi cảnh đó.',
    chatViec: 'Việc mà kết quả đến từ chỗ sắp đúng người vào đúng chỗ, và phần quyết cuối cùng là của mình.',
    ngheViDu: [
      'Quản lý dự án, quản lý sản xuất',
      'Điều hành doanh nghiệp, tự lập nghiệp',
      'Chỉ huy công trường, quản lý vận hành',
      'Quản lý dịch vụ, nhà hàng, khách sạn',
    ],
    hinh: { camTrich: 2.1, tuTin: 1.7, chuDong: 1.3, chinhTruc: 1.1, chiTienThu: 1.0 },
  },

  'tuong-tuong': {
    id: 'tuong-tuong',
    ten: 'Tưởng tượng · sáng tạo',
    chat: 'Trong đầu lúc nào cũng đang dựng một thứ chưa có. Bịa chuyện, vẽ ra thế giới riêng, và không bận tâm lắm chuyện nó có giống thật không.',
    dauHieu: [
      'Bịa chuyện, đặt tên cho đồ vật, có bạn tưởng tượng',
      'Vẽ, viết, hát một mình, không cần ai xem',
      'Làm bài ra đúng đáp số nhưng theo cách khác cô dạy',
      'Bừa bộn, hay quên — nhưng nhớ cực kỹ thứ nó thích',
    ],
    hoatDong: {
      nho: [
        'Giấy khổ lớn và bút màu, KHÔNG có hình mẫu để tô theo',
        'Đồ chơi mở: đất nặn, hộp giấy, vải vụn — thứ không có cách chơi đúng',
        'Kể chuyện luân phiên, mỗi người thêm một câu',
        'Cho đóng vai, dựng sân khấu bằng chăn gối',
      ],
      giua: [
        'Một cuốn sổ riêng mà người lớn KHÔNG đọc trừ khi được mời',
        'Lớp vẽ, nhạc cụ, hoặc dựng phim bằng điện thoại',
        'Cho làm một truyện tranh hoặc bài hát trọn vẹn từ đầu tới cuối',
        'Đưa đi bảo tàng, triển lãm, xem một buổi diễn thật',
      ],
      lon: [
        'Làm một tác phẩm có người ngoài xem: một kênh, một tập truyện, một buổi diễn',
        'Học nghiêm túc một môn nghệ thuật, kể cả phần kỹ thuật khô khan',
        'Cuộc thi sáng tác, trại hè sáng tác',
        'Gặp một người sống được bằng nghề sáng tạo để nghe cả phần khó của nghề',
      ],
    },
    chaMeNen:
      'Cho một chỗ và một khoảng thời gian được làm thứ không ra kết quả gì. Phần lớn cái nó làm sẽ bỏ đi — đó là con đường duy nhất tới cái thứ mười.',
    chaMeTranh:
      'Hỏi "học cái đó sau này làm gì". Câu đó không làm nó bỏ vẽ, nó chỉ làm nó giấu — và cha mẹ mất luôn đường nhìn vào phần sống nhất của con.',
    deBiHieuNham:
      'Bị cho là lơ đãng, thiếu tập trung. Nó tập trung rất sâu, chỉ là không tập trung vào chỗ người lớn đang chỉ.',
    chatViec: 'Việc mà thứ bán được là giọng riêng, và không ai chấm mình bằng giờ giấc.',
    ngheViDu: [
      'Thiết kế đồ hoạ, minh hoạ, dựng phim',
      'Viết, sáng tác, biên kịch',
      'Kiến trúc, thiết kế sản phẩm',
      'Sáng tạo nội dung, đạo diễn',
    ],
    hinh: { sangTao: 2.3, chiuMoHo: 1.4, uyenChuyen: 1.0, tuTin: 0.6 },
  },

  'cham-soc': {
    id: 'cham-soc',
    ten: 'Chăm sóc · để ý người khác',
    chat: 'Biết trong nhà ai đang buồn trước cả khi người đó nói. Phần lớn việc nó làm không ai thấy, và nó cũng không kể.',
    dauHieu: [
      'Hỏi "mẹ có sao không" khi mẹ chưa nói gì',
      'Nhường phần, chia đồ ăn, để ý đứa bạn bị bỏ rơi',
      'Ngại làm phiền, ngại đòi hỏi',
      'Buồn rất lâu khi trong nhà có người to tiếng',
    ],
    hoatDong: {
      nho: [
        'Nuôi một con vật nhỏ hoặc chăm một chậu cây, có lịch rõ ràng',
        'Cho chăm em, dọn cùng, nấu cùng — việc có người thật được hưởng',
        'Đọc chuyện về tình bạn rồi hỏi "nếu con là bạn ấy thì con làm gì"',
        'Khen thẳng vào việc nó để ý người khác, đừng để nó tự hiểu',
      ],
      giua: [
        'Đi cùng cha mẹ thăm người ốm, giúp hàng xóm — nhìn việc chăm sóc thật',
        'Hoạt động thiện nguyện của trường hoặc của phường',
        'Dạy lại bài cho em hoặc cho bạn kém hơn',
        'Học sơ cứu cơ bản — vừa hợp chất vừa dùng được cả đời',
      ],
      lon: [
        'Tình nguyện ĐỀU ĐẶN ở một chỗ có thật: bếp ăn, lớp học tình thương, trạm cứu hộ chó mèo',
        'Trợ giảng, gia sư cho em nhỏ',
        'Nói chuyện với người đang làm nghề y, tâm lý, công tác xã hội',
        'Học cách nói ra khi mình mệt — kỹ năng này phải dạy, nó không tự có',
      ],
    },
    chaMeNen:
      'Gọi tên việc nó làm. Đứa này làm rất nhiều thứ không ai thấy; nếu suốt tuổi thơ không ai gọi tên thì nó lớn lên tin rằng phần tốt nhất của mình là chuyện đương nhiên.',
    chaMeTranh:
      'Mượn nó làm chỗ dựa tinh thần của người lớn. Nó sẽ nhận, vì nó nhận được — nhưng đó là gánh không phải của một đứa trẻ.',
    deBiHieuNham:
      'Bị cho là nhu nhược, thiếu chí. Nó không thiếu chí, nó chỉ không đặt chí vào chỗ hơn thua.',
    chatViec: 'Việc mà thứ người ta trả tiền là sự tin cậy, và kết quả đo bằng người đối diện có khá lên không.',
    ngheViDu: [
      'Y tế, điều dưỡng, chăm sóc sức khoẻ',
      'Tham vấn tâm lý, công tác xã hội',
      'Giáo viên, nhất là bậc nhỏ',
      'Nhân sự, chăm sóc khách hàng chuyên sâu',
    ],
    hinh: { thauCam: 2.1, chanThanh: 1.7, khiemNhuong: 1.5, hopTac: 1.4, lacQuan: 0.9 },
  },

  'lam-dung': {
    id: 'lam-dung',
    ten: 'Tỉ mỉ · làm cho đúng',
    chat: 'Có chuẩn riêng và giữ chuẩn đó kể cả khi không ai kiểm. Sai một chi tiết là làm lại, dù người lớn đã bảo thế là được rồi.',
    dauHieu: [
      'Xếp đồ ngay ngắn, khó chịu khi có thứ lệch',
      'Viết lại cả trang vì một chữ xấu',
      'Nhắc người khác khi thấy làm sai luật',
      'Cần biết trước hôm nay sẽ làm gì; đổi lịch đột ngột là rối',
    ],
    hoatDong: {
      nho: [
        'Đồ chơi có quy tắc rõ: xếp hình, ghép tranh, domino',
        'Việc nhà có tiêu chuẩn nhìn thấy được — gấp quần áo, xếp giá sách',
        'Lịch tuần dán tường, cho tự đánh dấu đã xong',
        'Trò chơi bàn cờ có luật, và chơi đúng luật kể cả khi thua',
      ],
      giua: [
        'Sưu tầm và phân loại: tem, mô hình, thẻ bài, đá — chỗ nào có hệ thống là hợp',
        'Nhạc cụ hoặc thư pháp — nơi luyện đúng kỹ thuật chính là con đường',
        'Giao quản một việc chung của lớp cần làm đều',
        'Cho tự lập kế hoạch ôn thi rồi theo kế hoạch của chính nó',
      ],
      lon: [
        'Việc cần chính xác và kiểm chứng được: giữ sổ chi tiêu nhà, quản kho câu lạc bộ',
        'Thi lấy một chứng chỉ có chuẩn rõ ràng',
        'Học một quy trình thật: phòng thí nghiệm, xưởng, bếp chuyên nghiệp',
        'Tập một việc CỐ Ý không có đáp án đúng — để quen dần với chuyện mơ hồ',
      ],
    },
    chaMeNen:
      'Báo trước khi đổi kế hoạch. Với đứa này, biết trước là điều kiện để làm tốt chứ không phải sự cầu kỳ.',
    chaMeTranh:
      'Chê nó cứng nhắc rồi ép làm ẩu cho nhanh. Cái chuẩn đó là chỗ mạnh nhất của nó; thứ nó cần học là biết khi nào ĐỦ TỐT — và điều đó dạy được, không phải bằng cách phá chuẩn.',
    deBiHieuNham:
      'Bị cho là khó tính, làm chậm. Nó không chậm, nó đang làm tới mức của nó — và mức đó cao hơn mức người khác chấp nhận.',
    chatViec: 'Việc mà sai một li là hỏng, và người ta trả tiền cho chuyện không có sai sót.',
    ngheViDu: [
      'Kế toán, kiểm toán, kiểm soát nội bộ',
      'Xét nghiệm, kiểm nghiệm, kiểm định',
      'Luật, công chứng, tuân thủ',
      'Quản lý chất lượng, an toàn',
    ],
    hinh: { tiMi: 2.1, dangTinCay: 1.8, thanTrong: 1.5, chinhTruc: 1.2 },
  },

  'ben-bi': {
    id: 'ben-bi',
    ten: 'Bền bỉ · luyện tay nghề',
    chat: 'Chịu ngồi lâu với một thứ cho tới lúc thành. Không cần ai xem, không cần ai khen, nhưng cần được để yên.',
    dauHieu: [
      'Chơi một mình rất lâu mà không chán',
      'Luyện đi luyện lại một động tác, một bài, một hình',
      'Không thích bị ngắt giữa chừng',
      'Ít kể về thứ đang làm cho tới khi làm xong',
    ],
    hoatDong: {
      nho: [
        'Một hoạt động thấy được tiến bộ theo tuần: bơi, vẽ, đàn',
        'Ghép hình nhiều mảnh, để nhiều ngày mới xong',
        'Đừng ngắt khi nó đang chăm chú — báo trước mười phút thay vì gọi đột ngột',
        'Một chỗ ngồi riêng, đủ yên',
      ],
      giua: [
        'Học nghiêm túc một môn cần luyện: nhạc cụ, võ, cờ, bơi',
        'Sổ ghi tiến bộ của chính nó, để tự nhìn thấy đường mình đã đi',
        'Một sản phẩm mất vài tháng: mô hình lớn, bộ tranh, cuốn sổ tay',
        'Cho gặp một người đã giỏi thật ở môn đó',
      ],
      lon: [
        'Theo tới cấp có kiểm định: đai, cấp bậc, kỳ thi chuyên môn',
        'Học nghề thật ở xưởng, hoặc theo một người thợ giỏi',
        'Dự án dài hạn do nó tự đặt mục tiêu và tự theo',
        'Tập việc phải trình bày trước người khác — chỗ yếu nhất của nó',
      ],
    },
    chaMeNen:
      'Giữ nhịp và giữ chỗ. Thứ nó cần không phải lời động viên mà là được tiếp tục — đưa đón đúng giờ, không cắt lớp giữa chừng vì bận.',
    chaMeTranh:
      'Bắt đổi hết môn này sang môn khác cho "biết nhiều". Đứa này chỉ giỏi khi được ở lại đủ lâu; nhảy liên tục là lấy mất đúng thứ làm nên nó.',
    deBiHieuNham:
      'Bị cho là lầm lì, không hoà đồng. Nó hoà đồng theo kiểu khác — ở cạnh người ta mà không cần nói.',
    chatViec: 'Việc mà danh tiếng đi theo tay nghề chứ không theo chức, làm một thứ hẹp tới mức không ai thay được.',
    ngheViDu: [
      'Nghề thủ công, chế tác, đầu bếp',
      'Chuyên khoa y, nha khoa, phục hồi chức năng',
      'Vận động viên, nhạc công chuyên nghiệp',
      'Kỹ thuật chuyên sâu, lập trình hệ thống',
    ],
    hinh: { benBi: 2.1, tuChu: 1.7, chiuApLuc: 1.2, tiMi: 0.9 },
  },

  'giao-thiep': {
    id: 'giao-thiep',
    ten: 'Giao thiệp · thuyết phục',
    chat: 'Đi đâu cũng có bạn trong mười phút. Đọc được không khí trong phòng và tự biết phải nói kiểu gì với ai.',
    dauHieu: [
      'Kết bạn rất nhanh, kể cả với người lớn',
      'Biết xin thế nào thì được, đổi thế nào thì có lợi',
      'Chán khi phải ngồi im một mình',
      'Nói trước đám đông không sợ',
    ],
    hoatDong: {
      nho: [
        'Cho gặp nhiều người: chợ, họ hàng, sân chơi — chỗ nó nạp năng lượng',
        'Trò chơi đổi vai: bán hàng, bác sĩ, cô giáo',
        'Cho tự gọi món, tự hỏi đường, tự trả tiền',
        'Đặt luật rõ về nói thật — chỗ này phải dạy sớm',
      ],
      giua: [
        'Bán một thứ có thật: nước chanh, đồ tự làm, sách cũ — và tự tính lãi',
        'Thi hùng biện, kể chuyện, dẫn chương trình của lớp',
        'Nhóm cần đàm phán: đội tranh biện, phiên toà giả định',
        'Cho làm cầu nối trong một việc thật của nhà',
      ],
      lon: [
        'Một việc làm thêm có tiếp xúc khách thật',
        'Câu lạc bộ tranh biện, mô phỏng hội nghị',
        'Tổ chức gây quỹ — vừa nói vừa chịu trách nhiệm với con số',
        'Học phần khô của nghề: hợp đồng, số liệu, quy định — chỗ nó hay bỏ qua',
      ],
    },
    chaMeNen:
      'Cho sân khấu, và cho việc có con số. Đứa này giỏi phần người; thứ nó thiếu là phần sổ sách, mà học sớm thì sau này đi rất xa.',
    chaMeTranh:
      'Tin lời nó nói mà không kiểm việc nó làm. Nó thuyết phục được cả cha mẹ — chưa bao giờ bị hỏi lại thì nó học được rằng nói hay là đủ.',
    deBiHieuNham:
      'Bị cho là lắm mồm, khôn lỏi. Phần lớn là nó đang thử xem cách nào hiệu quả với ai — đó là kỹ năng, chỉ là chưa có ranh giới.',
    chatViec: 'Việc mà không ai giao sẵn khách, và kết quả đo bằng quan hệ dựng được.',
    ngheViDu: [
      'Kinh doanh, phát triển thị trường, môi giới',
      'Truyền thông, quan hệ công chúng',
      'Tư vấn, đàm phán thương mại',
      'Luật sư tranh tụng, đại diện',
    ],
    hinh: { huongNguoi: 2.1, uyenChuyen: 1.6, tuTin: 1.3, lacQuan: 1.2, chiTienThu: 1.0 },
  },

  'suy-luan': {
    id: 'suy-luan',
    ten: 'Quan sát · suy luận',
    chat: 'Nhìn ra quy luật trước khi ai kịp giải thích. Thích thứ có trật tự, và ghét bị hỏi khi chưa nghĩ xong.',
    dauHieu: [
      'Thích con số, bản đồ, lịch, quy luật, bảng xếp hạng',
      'Hỏi một câu khó rồi tự đi tìm câu trả lời',
      'Đọc đi đọc lại một cuốn để tìm chỗ mình bỏ sót',
      'Cần thời gian mới trả lời; bị giục là im luôn',
    ],
    hoatDong: {
      nho: [
        'Trò chơi tìm quy luật: cờ, sudoku trẻ em, mê cung',
        'Cho quan sát dài ngày rồi ghi lại: thời tiết, cây lớn, trăng tròn khuyết',
        'Sách tra cứu có hình — bản đồ, vũ trụ, động vật',
        'Chờ nó nghĩ xong hẵng hỏi tiếp',
      ],
      giua: [
        'Câu lạc bộ toán, cờ vua, tin học',
        'Cho tự tra cứu một câu hỏi khó rồi trình bày lại cho cả nhà',
        'Lập trình nhập môn — Scratch rồi tới Python',
        'Trò chơi chiến thuật cần tính trước nhiều nước',
      ],
      lon: [
        'Đội tuyển hoặc kỳ thi chuyên môn có chiều sâu',
        'Một dự án phân tích số liệu thật, dù nhỏ',
        'Đọc sách chuyên ngành sớm, không cần đợi chương trình',
        'Tập làm việc nhóm và tập nói ra — hai chỗ hụt của kiểu này',
      ],
    },
    chaMeNen:
      'Cho khoảng lặng. Đứa này nghĩ xong mới nói, nên im lặng không có nghĩa là nó không biết — giục một câu là mất luôn câu trả lời.',
    chaMeTranh:
      'Bắt hoạt bát lên, ép giao lưu cho "đỡ khô khan". Nó không thiếu cảm xúc, nó xử lý bên trong; ép ra ngoài chỉ làm nó thấy mình sai chỗ.',
    deBiHieuNham:
      'Bị cho là lạnh lùng, ít tình cảm. Nó có, chỉ là biểu hiện bằng việc chứ không bằng lời.',
    chatViec: 'Việc mà đề bài chưa có lời giải sẵn, và phần lớn thời gian là ngồi với dữ kiện.',
    ngheViDu: [
      'Phân tích dữ liệu, nghiên cứu',
      'Lập trình, khoa học máy tính',
      'Tài chính, thẩm định, quản trị rủi ro',
      'Kỹ thuật thiết kế, quy hoạch',
    ],
    hinh: { hamTimHieu: 1.9, tiMi: 1.6, thanTrong: 1.2, tuChu: 0.8 },
  },

  'van-dong': {
    id: 'van-dong',
    ten: 'Vận động · thi đấu',
    chat: 'Ngồi yên là cực hình. Học bằng cơ thể, và hễ có mục tiêu để đuổi thì khác hẳn.',
    dauHieu: [
      'Chân tay không lúc nào yên, vừa nghe vừa nghịch',
      'Thích thi thố, ganh đua, đo hơn kém',
      'Ngã đau ít khóc, đứng dậy chơi tiếp',
      'Vừa đi vừa học thì thuộc, ngồi im thì không vào',
    ],
    hoatDong: {
      nho: [
        'Vận động mỗi ngày, ngoài trời, TRƯỚC giờ ngồi vào bàn',
        'Cho học bằng cơ thể: đếm bằng bước chân, ghép chữ bằng thẻ phải đi tìm',
        'Trò chơi có thắng thua rõ ràng, và tập cả cách thua',
        'Đừng phạt bằng cách bắt ngồi yên — với đứa này đó là hình phạt nặng nhất mà vô ích nhất',
      ],
      giua: [
        'Môn thể thao có đội và có giải: bóng đá, bóng rổ, võ, điền kinh',
        'Cho một mục tiêu đo được kèm một mốc thời gian',
        'Việc tay chân thật: dựng lều, sửa xe, làm vườn, phụ bếp',
        'Xen vận động vào giờ học thay vì bắt ngồi liền hai tiếng',
      ],
      lon: [
        'Thi đấu ở mức có tuyển chọn, chấp nhận cả thắng lẫn thua',
        'Nhìn thử nghề có hiện trường: kỹ thuật, cứu hộ, quân đội, thể thao',
        'Việc làm thêm cần sức và cần nhịp — hợp hơn nhiều so với ngồi bàn',
        'Tập một việc phải ngồi lâu, ngắn thôi nhưng đều — để có đường lùi',
      ],
    },
    chaMeNen:
      'Cho tiêu năng lượng TRƯỚC khi bắt học. Với đứa này đó không phải chơi cho đã, đó là điều kiện để ngồi được vào bàn.',
    chaMeTranh:
      'Coi thể thao là thứ bỏ đi khi vào mùa thi. Cắt vận động của đứa này là cắt luôn khả năng tập trung của nó — kết quả ngược hẳn ý định.',
    deBiHieuNham:
      'Bị cho là nghịch, không tập trung. Phần lớn là nó đang bị bắt ngồi lâu hơn cái ngưỡng của nó, và ngưỡng đó có thật.',
    chatViec: 'Việc có hiện trường và có nhịp, thắng thua rõ, không phải ngồi bàn cả ngày.',
    ngheViDu: [
      'Thể thao, huấn luyện viên',
      'Kỹ thuật hiện trường, thi công, vận hành',
      'Cứu hộ, an ninh, quân đội',
      'Kinh doanh có địa bàn, phát triển thị trường',
    ],
    hinh: { chuDong: 2.0, chiuApLuc: 1.5, tuTin: 1.4, benBi: 1.2, chiTienThu: 1.0 },
  },
};

export const HUONG_IDS = Object.keys(THIEN_HUONG) as HuongId[];

// ── Chấm ────────────────────────────────────────────────────
// Hình đã TRỪ NỀN một lần lúc nạp module (xem luật ở đầu file). Tính sẵn thay
// vì tính mỗi lượt: bảng là hằng, và tính lại mỗi lượt là mời một lỗi trôi.
const HINH_VEC: Record<HuongId, Vec> = (() => {
  const tho = Object.fromEntries(
    HUONG_IDS.map((id) => [id, V(THIEN_HUONG[id].hinh)]),
  ) as Record<HuongId, Vec>;
  const nen = TRUC_IDS.map(
    (_, i) => HUONG_IDS.reduce((s, id) => s + tho[id][i], 0) / HUONG_IDS.length,
  );
  return Object.fromEntries(
    HUONG_IDS.map((id) => [id, tho[id].map((x, i) => x - nen[i])]),
  ) as Record<HuongId, Vec>;
})();

function cosine(a: Vec, b: Vec): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

/** Ngưỡng "nghiêng hẳn". Dưới ngưỡng ⇒ `chuaRoNet` (đo được 6,1% lá số). */
const NGUONG = 0.25;

export interface HuongGoiY {
  id: HuongId;
  ten: string;
  chat: string;
  dauHieu: string[];
  /** 0–100, để XẾP THỨ TỰ. Không bày như "độ chính xác" — nó là độ nghiêng. */
  diem: number;
  /** Trục kéo hướng này lên, đọc theo mặt CAO. */
  vi: string[];
}

export interface HuongTreKetQua {
  goiY: HuongGoiY[];
  /** Ba trục nổi nhất của chính lá số. */
  chatNguoi: { ten: string; cao: string }[];
  /**
   * Trục thấp — đọc theo mặt "việc không đòi hỏi", KHÔNG đọc là "con thiếu".
   * 🔴 Với trẻ em luật này còn gắt hơn người lớn: cha mẹ đọc "con thiếu kiên
   * trì" rồi tin, thì câu đó theo đứa bé nhiều năm.
   */
  khongDoiHoi: { ten: string; thap: string }[];
  /** Không hướng nào vượt ngưỡng — nói thẳng, và đó là lời khuyên đúng. */
  chuaRoNet: boolean;
}

/** Ba thiên hướng nghiêng nhất của một lá số trẻ. */
export function chonThienHuong(ls: Laso, soLuong = 3): HuongTreKetQua {
  const v = vectorNguoi(ls);
  const xep = HUONG_IDS.map((id) => ({ id, s: cosine(v, HINH_VEC[id]) })).sort((a, b) => b.s - a.s);

  const goiY: HuongGoiY[] = xep.slice(0, soLuong).map(({ id, s }) => {
    const h = THIEN_HUONG[id];
    const hv = HINH_VEC[id];
    // Trục vừa mạnh ở đứa trẻ, vừa là chỗ hướng này đòi cao hơn mặt bằng.
    // ⚠️ `manh > 0.2` là BẮT BUỘC: tích v×hình ra DƯƠNG khi CẢ HAI cùng ÂM, nên
    // thiếu chốt này thì một trục YẾU vẫn lọt vào phần giải thích và bản đọc tự
    // mâu thuẫn ngay trong một màn hình. Đã vấp đúng lỗi này ở tầng nhánh nghề.
    const vi = TRUC_IDS
      .map((t, i) => ({ t, gop: v[i] * hv[i], manh: v[i] }))
      .filter((x) => x.gop > 0.15 && x.manh > 0.2)
      .sort((a, b) => b.gop - a.gop)
      .slice(0, 3)
      .map((x) => `${TRUC[x.t].ten} — ${TRUC[x.t].cao}`);
    return {
      id,
      ten: h.ten,
      chat: h.chat,
      dauHieu: h.dauHieu,
      diem: Math.round(Math.max(0, Math.min(1, (s + 1) / 2)) * 100),
      vi,
    };
  });

  const xepTruc = TRUC_IDS.map((t, i) => ({ t, val: v[i] })).sort((a, b) => b.val - a.val);
  return {
    goiY,
    chatNguoi: xepTruc.filter((x) => x.val > 0.3).slice(0, 3)
      .map((x) => ({ ten: TRUC[x.t].ten, cao: TRUC[x.t].cao })),
    khongDoiHoi: xepTruc.filter((x) => x.val < -0.3).slice(-2)
      .map((x) => ({ ten: TRUC[x.t].ten, thap: TRUC[x.t].thap })),
    chuaRoNet: xep[0].s < NGUONG,
  };
}

// ── Các mặt được đọc ────────────────────────────────────────
// Bốn cung, chọn theo đúng câu hỏi hướng nghiệp. CỐ Ý KHÔNG đọc cung Phụ Mẫu:
// đó là mặt riêng của `day-con` ("đứa trẻ nhìn cha mẹ thế nào"), để nguyên bên
// đó thì hai tool không nói chồng lên nhau.
const MAT_DOC: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Cốt cách', y: 'Con người gốc — phần không đổi dù đổi trường, đổi bạn' },
  { cung: 'Quan Lộc', nhan: 'Đường học nghiệp', y: 'Cách con vào việc, và chịu được kỷ luật tới đâu' },
  { cung: 'Phúc Đức', nhan: 'Thứ khiến con thấy đáng làm', y: 'Cái làm con thấy có nghĩa — nguồn động lực bền nhất' },
  { cung: 'Thiên Di', nhan: 'Ra khỏi nhà', y: 'Cách con cư xử ở trường, giữa bạn bè, chỗ lạ' },
];

export interface MatDocTre {
  cung: string;
  nhan: string;
  y: string;
  sao: string[];
  muon: boolean;
  cachCuc: string[];
}

export interface ChangDangO {
  tuoiStart: number;
  tuoiEnd: number;
  namStart: number;
  namEnd: number;
  cung: string;
  sao: string[];
}

export interface HuongNghiepTreProfile {
  namXem: number;
  tuoi: number | null;
  namSinh: number | null;
  gioiTinh: 'nam' | 'nu';
  moiLo: MoiLoDef;
  lop: LopDef;
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  huong: HuongTreKetQua;
  matDoc: MatDocTre[];
  changDangO: ChangDangO | null;
  /** Có được bày tên nghề không — dưới 8 tuổi thì không. */
  bayNghe: boolean;
}

/**
 * Hồ sơ hướng nghiệp sớm của MỘT đứa trẻ.
 * Một lá số duy nhất — CỐ Ý không nhận lá số cha mẹ: `day-con` đã có đường đó,
 * và mỗi ô nhập thêm là một chỗ người ta bỏ ngang (bài học đã ghi ở T1).
 */
export function computeHuongNghiepTre(
  ls: Laso,
  gioiTinh: 'nam' | 'nu',
  moiLoId: MoiLoId,
  namXem?: number,
): HuongNghiepTreProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const phan = phanKieu(ls);
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};
  const tuoi = typeof ls.tuoiXem === 'number' ? (ls.tuoiXem as number) : null;
  const namSinh = namSinhTuLaSo(ls, nam);
  const lop = lopTuoi(tuoi);

  const matDoc: MatDocTre[] = MAT_DOC.map((m) => {
    const b = majorsOrBorrow(ls, palaceByName(ls, m.cung));
    return {
      cung: m.cung,
      nhan: m.nhan,
      y: m.y,
      sao: b.stars.map(starLabel),
      muon: b.muon,
      cachCuc: (cachCucTung[m.cung] || []).slice(0, 3),
    };
  });

  // Đúng MỘT chặng — chặng đang chạy. `day-con` đã liệt kê cả ba chặng học;
  // bày lại y hệt ở đây là hai tool nói cùng một thứ.
  const dv = ls.daiVanHienTai as Rec | undefined;
  let changDangO: ChangDangO | null = null;
  if (dv && typeof dv.tuoiStart === 'number') {
    const p = ((ls.palaces as Rec[]) || [])[dv.cungIdx as number];
    const b = majorsOrBorrow(ls, p);
    changDangO = {
      tuoiStart: dv.tuoiStart as number,
      tuoiEnd: dv.tuoiEnd as number,
      namStart: namSinh ? namSinh + (dv.tuoiStart as number) - 1 : 0,
      namEnd: namSinh ? namSinh + (dv.tuoiEnd as number) - 1 : 0,
      cung: String(p?.cungName || ''),
      sao: b.stars.map(starLabel),
    };
  }

  return {
    namXem: nam,
    tuoi,
    namSinh,
    // 🪤 Giới tính KHÔNG nằm trong lá số engine trả về — phải truyền vào. Đọc
    // `ls.gioiTinh` là luôn ra 'nam', sai im lặng cho một nửa số trẻ.
    gioiTinh,
    moiLo: MOI_LO[moiLoId],
    lop: LOP[lop],
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    huong: chonThienHuong(ls),
    matDoc,
    changDangO,
    bayNghe: lop !== 'nho',
  };
}

/** Cung tool này KHÔNG đọc — dùng chung để không có hai bản danh sách trôi khỏi nhau. */
export const CUNG_KHONG_DOC = KHONG_DOC;

// ── Đường tiền ──────────────────────────────────────────────
// `hoSoTinhThu` và `hoSoDayDu` là HAI HÀM RIÊNG, đúng khuôn W1: đường tiền
// phải cắt được bằng một dòng đọc ra được, và có bài kiểm canh đúng dòng đó.
// Trộn hai đường vào một hàm rồi tin vào một câu `if` là cách nhanh nhất để
// một hôm nào đó phần trả tiền lọt qua cửa.

export interface HuongTinhThu {
  id: HuongId;
  ten: string;
  chat: string;
  dauHieu: string[];
  diem: number;
  vi: string[];
}

/**
 * Phần MIỄN PHÍ. Đủ để cha mẹ đối chiếu "có đúng con mình không" — thiên hướng
 * đứng đầu kèm dấu hiệu quan sát được — nhưng KHÔNG có hoạt động, không có
 * việc nên/tránh, không có chất việc về sau.
 */
export function hoSoTinhThu(p: HuongNghiepTreProfile) {
  return {
    namXem: p.namXem,
    tuoi: p.tuoi,
    namSinh: p.namSinh,
    gioiTinh: p.gioiTinh,
    moiLo: p.moiLo,
    lop: p.lop,
    kieu: p.kieu,
    kieuPhu: p.kieuPhu,
    lai: p.phan.lai,
    toaDo: { x: p.phan.xNorm, y: p.phan.yNorm },
    matDoc: p.matDoc,
    changDangO: p.changDangO,
    chatNguoi: p.huong.chatNguoi,
    khongDoiHoi: p.huong.khongDoiHoi,
    chuaRoNet: p.huong.chuaRoNet,
    /** CHỈ hướng đứng đầu, và CHỈ phần nhận diện. */
    huongDau: p.huong.goiY[0]
      ? ({
          id: p.huong.goiY[0].id,
          ten: p.huong.goiY[0].ten,
          chat: p.huong.goiY[0].chat,
          dauHieu: p.huong.goiY[0].dauHieu,
          diem: p.huong.goiY[0].diem,
          vi: p.huong.goiY[0].vi,
        } as HuongTinhThu)
      : null,
    /** Tên các hướng còn lại — để biết đang khoá cái gì, không kèm nội dung. */
    conKhoa: p.huong.goiY.slice(1).map((g) => g.ten),
  };
}

/** Phần TRẢ TIỀN: đủ ba hướng kèm hoạt động theo lứa tuổi và việc nên/tránh. */
export function hoSoDayDu(p: HuongNghiepTreProfile) {
  return {
    ...hoSoTinhThu(p),
    bayNghe: p.bayNghe,
    huong: p.huong.goiY.map((g) => {
      const h = THIEN_HUONG[g.id];
      return {
        ...g,
        hoatDong: h.hoatDong[p.lop.id],
        chaMeNen: h.chaMeNen,
        chaMeTranh: h.chaMeTranh,
        deBiHieuNham: h.deBiHieuNham,
        chatViec: h.chatViec,
        // 🔴 Dưới 8 tuổi KHÔNG bày tên nghề. Bày danh sách nghề cho đứa 5 tuổi
        // vừa vô nghĩa vừa mời cha mẹ chốt sớm — đúng thứ ranh giới cấm.
        ngheViDu: p.bayNghe ? h.ngheViDu : [],
      };
    }),
  };
}

// ── Rail ────────────────────────────────────────────────────
// ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị là object — nhét mảng hay
// object vào đây là rail nhận vài dòng rồi luận chay.

const LUAT_DOC_TRUC_THAP =
  'Trục điểm thấp CHỈ được đọc là "việc không đòi hỏi mặt đó", TUYỆT ĐỐI không ' +
  'đọc thành "cháu thiếu" hay "cháu kém". Cha mẹ đọc một câu chê rồi tin thì ' +
  'câu đó theo đứa trẻ nhiều năm.';

const LUAT_DOC_HUONG =
  'Thiên hướng là XU HƯỚNG để cho làm quen, KHÔNG phải nghề đã chốt. Không nói ' +
  '"cháu sẽ làm nghề X", không nói "cháu không hợp nghề Y". Tên nghề nếu có chỉ ' +
  'để hình dung chất việc.';

/** Dữ liệu rail cho lượt TÍNH THỬ — không mang một chữ nào của tầng trả tiền. */
export function railDataTinhThu(p: HuongNghiepTreProfile): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {
    moiLoChaMe: p.moiLo.label,
    dieuChaMeCan: p.moiLo.can,
    lopTuoi: `${p.lop.ten} (${p.lop.tuoi})`,
    vaiChaMeLopNay: p.lop.vaiChaMe,
    kieuTre: p.kieu.ten,
    kieuTuTuong: p.kieu.tuTuong,
    kieuMotCau: p.kieu.motCau,
    dongLucTre: p.kieu.dongLuc,
    laiKieu: p.phan.lai,
    luatDocTrucThap: LUAT_DOC_TRUC_THAP,
    luatDocHuong: LUAT_DOC_HUONG,
  };
  if (p.tuoi != null) d.tuoiTre = p.tuoi;
  if (p.kieuPhu) d.kieuPhu = p.kieuPhu.ten;
  if (p.huong.chatNguoi.length)
    d.chatNguoiNoiBat = p.huong.chatNguoi.map((c) => `${c.ten} (${c.cao})`).join(' · ');
  if (p.huong.khongDoiHoi.length)
    d.vieckhongDoiHoi = p.huong.khongDoiHoi.map((c) => `${c.ten} — ${c.thap}`).join(' · ');
  if (p.huong.chuaRoNet)
    d.canhBaoChuaRoNet =
      'Lá số cháu CHƯA nghiêng hẳn về hướng nào. Ở tuổi này đó là bình thường — ' +
      'nói thẳng điều đó và khuyên cho thử rộng, ĐỪNG ép một hướng.';
  for (const m of p.matDoc) {
    d['cung' + m.cung.replace(/\s+/g, '')] =
      m.sao.join(', ') +
      (m.muon ? ' (mượn xung chiếu)' : '') +
      (m.cachCuc.length ? ' — ' + m.cachCuc.join('; ') : '');
  }
  if (p.changDangO)
    d.changDangO =
      `${p.changDangO.tuoiStart}–${p.changDangO.tuoiEnd} tuổi ` +
      `(${p.changDangO.namStart}–${p.changDangO.namEnd}), cung ${p.changDangO.cung}` +
      (p.changDangO.sao.length ? `: ${p.changDangO.sao.join(', ')}` : '');
  return d;
}

/** Dữ liệu rail SAU KHI MỞ. Rail chỉ biết thiên hướng đầy đủ khi đã trả tiền —
 *  biết sớm thì người ta hỏi rail thay vì mua. */
export function railDataDayDu(p: HuongNghiepTreProfile): Record<string, string | number | boolean> {
  const d = railDataTinhThu(p);
  d.baThienHuong = p.huong.goiY.map((g, i) => `${i + 1}. ${g.ten} — ${g.chat}`).join(' | ');
  d.lyDoTungHuong = p.huong.goiY
    .filter((g) => g.vi.length)
    .map((g) => `${g.ten}: ${g.vi.join('; ')}`)
    .join(' | ');
  const dau = p.huong.goiY[0];
  if (dau) {
    const h = THIEN_HUONG[dau.id];
    d.hoatDongNenLam = h.hoatDong[p.lop.id].join(' · ');
    d.chaMeNenLam = h.chaMeNen;
    d.chaMeTranhLam = h.chaMeTranh;
    d.choHayBiHieuNham = h.deBiHieuNham;
    d.chatViecVeSau = h.chatViec;
    if (p.bayNghe) d.ngheCoChatDo = h.ngheViDu.join(', ');
    else
      d.chuaBayNghe =
        'Cháu còn nhỏ — KHÔNG nêu tên nghề cụ thể, chỉ nói chất việc và hoạt động nên cho làm quen.';
  }
  return d;
}
