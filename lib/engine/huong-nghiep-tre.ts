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
// ── NỀN CHẤM: 5 TRỤC + 8 CHẤT của `day-con-assess`, KHÔNG phải 21 trục ──
// 🔑 Bản đầu chấm trên 21 trục tính khí của `nghe-nghiep.ts` — nền riêng, không
// dính gì tới khung `day-con` đang bán cạnh nó. Đo ra chỗ nguy hiểm: bé có
// CHẤT #1 bên kia là "Hiểu người & dẫn nhóm" thì bản đó xếp #1 là "Tỉ mỉ · làm
// cho đúng" ở **65%** số ca. Về lý không mâu thuẫn (hai trục khác nhau), nhưng
// một phụ huynh trả tiền cho CẢ HAI tool 15 Lượng về CÙNG một đứa trẻ đọc ra
// hai kết luận đá nhau — và mất tin vào cả hai.
//
// Nên tầng chấm nay dựng THẲNG trên chính 13 chiều `day-con` đo (5 trục tính
// khí + 8 chất năng khiếu). Hai tool không thể lệch nhau về NGUYÊN TẮC nữa,
// chứ không phải nhờ một câu chú thích. Đo lại trên 2.496 lá số:
//
//   Chất #1 dẫn đúng hướng kỳ vọng ở vị trí #1 : 38,5% → **61,7%**
//   …lọt TOP-3 (thứ phụ huynh thật sự đọc)     :        **91,2%**
//   Ca nghịch tai "hiểu người" → "tỉ mỉ" ở #1   : 65%   → **24,6%**
//
// ⚠️ Hai tool VẪN trả lời hai câu khác nhau: `day-con` đo NĂNG KHIẾU (giỏi MÔN
// gì), tool này đo CHẤT VIỆC (hợp KIỂU LÀM VIỆC nào). Chung thước đo, khác câu
// hỏi — đó là lý do 61,7% chứ không phải 100%.
//
// ── HAI LUẬT VIẾT `hinh`, cả hai đều rút ra từ phép đo ──
// 1. KHÔNG trừ nền, KHÔNG "chỉ khai thành phần dương" như bản 21 trục. 13 chiều
//    này đã z-score sẵn TỪNG chiều (5 = mức giữa, mỗi 1,8 điểm = 1 độ lệch
//    chuẩn) nên nền phẳng từ gốc; hai mẹo đó thành thừa.
// 2. 🔑 NHƯNG 13 chiều KHÔNG độc lập — chúng cùng đọc một bộ cung. Đo được
//    `nhip ↔ van-dong` **+0,71**, `nhip ↔ thien-nhien` −0,55, `nhay ↔ hieu-minh`
//    +0,48. Hình nào nạp hai chiều tương quan mạnh CÙNG chiều thì tự cộng điểm
//    (đếm hai lần một tín hiệu); nạp hai chiều tương quan mạnh NGƯỢC chiều thì
//    tự triệt tiêu. Bản đầu dính cả hai: `van-dong` nạp nhip+van-dong ⇒ **27,6%**,
//    `ben-bi` kéo −nhay ngược hieu-minh ⇒ **4,4%**.
//    ⇒ **Trong MỘT hình, không nạp hai chiều |corr| > 0,45.** Sau khi tách:
//      cả 9 hướng sống ở **8,2–14,8%** (bản 21 trục 4,7–21,0), bộ-3 hay gặp
//      nhất 1/28 (trước 1/17), cặp hình giống nhau nhất 0,40.
// 3. Trục ĐƯỢC khai số âm — trục hai cực, cực thấp có nội dung thật (đó là cả
//    thiết kế của `day-con`). **Chất thì KHÔNG**: số âm ở chất đọc thành "hợp
//    với đứa KÉM môn này", đúng thứ ranh giới trẻ em cấm. Có bài kiểm canh.
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
// `THIEN_HUONG` (9 hướng × 13 chiều + toàn bộ phần chữ) là bảng QUY CHIẾU TỰ
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
import {
  assessChild,
  TRUC,
  TRUC_IDS,
  KHIEU,
  KHIEU_IDS,
  type TrucId,
  type KhieuId,
  type Assessment,
} from './day-con-assess';

type Rec = Record<string, unknown>;

// ── 13 chiều chấm ───────────────────────────────────────────
// Thứ tự cố định: 5 trục trước, 8 chất sau. `hinh` của mỗi hướng khai theo id
// nên đổi thứ tự ở đây không làm lệch bảng — nhưng vẫn giữ ổn định để số đo
// cũ đọc lại được.
type Vec = number[];
type Hinh = Partial<Record<TrucId | KhieuId, number>>;
const V = (o: Hinh): Vec => [
  ...TRUC_IDS.map((t) => o[t] ?? 0),
  ...KHIEU_IDS.map((k) => o[k] ?? 0),
];

/**
 * Vector người: 13 chiều, quy về đơn vị ĐỘ LỆCH CHUẨN quanh mốc 5.
 *
 * `day-con-assess` đã chuẩn hoá sẵn từng chiều về TB 5 / sd 1,8 trên lưới 6.048
 * lá số trẻ em, nên ở đây chỉ việc dời gốc — KHÔNG z-score lại lần nữa (làm thế
 * là chuẩn hoá hai lần, và luật 1 của `nghe-nghiep.ts` vẫn giữ nguyên: không
 * z-score phía NGƯỜI theo từng lá số).
 */
const SD = 1.8;
function vector13(a: Assessment): Vec {
  const t = Object.fromEntries(a.truc.map((x) => [x.id, x.diem]));
  const k = Object.fromEntries(a.khieu.map((x) => [x.id, x.diem]));
  return [
    ...TRUC_IDS.map((id) => ((t[id] ?? 5) - 5) / SD),
    ...KHIEU_IDS.map((id) => ((k[id] ?? 5) - 5) / SD),
  ];
}

// ── Lứa tuổi ────────────────────────────────────────────────
// Chia theo chỗ THẬT SỰ đổi: hoạt động cho đứa 5 và đứa 7 tuổi gần như một,
// còn 12 với 16 thì khác hẳn.
//
// 🔴 Lứa `vaodoi` (19–25) thêm sau khi Henry test một lá số 43 tuổi và bản đọc
// vẫn gọi là "bé trai". Căn nguyên: `lopTuoi` KẸP mọi tuổi > 12 về lứa 13–18,
// nên lá số người lớn đi trọn đường như một đứa trẻ mà không gì báo. Hai chỗ
// phải tách ra, và chúng KHÁC NHAU:
//   · 19–25 vẫn là câu hỏi THẬT của cha mẹ ("con vừa ra trường, nên đi hướng
//     nào") — giữ tool, chỉ đổi xưng hô và đổi hoạt động cho hợp tuổi.
//   · ≥26 thì KHÔNG còn là "định hướng sớm cho con". Ở đó tool phải nói thẳng
//     ra thay vì đổi mấy đại từ rồi bán tiếp một bản đọc viết cho trẻ con —
//     xem `lopTuoi()` trả `null` và cờ `laTreEm` bên dưới.
export type LopId = 'nho' | 'giua' | 'lon' | 'vaodoi';

export interface LopDef {
  id: LopId;
  ten: string;
  tuoi: string;
  /** Việc của người lớn trong lớp tuổi này — một câu, đọc là hiểu phải làm gì. */
  vaiChaMe: string;
  /**
   * Cách gọi người được xem, theo đúng tuổi. Trước đây "cháu" nằm CỨNG ở cả ba
   * tầng (data · prompt · trang) nên không đổi theo tuổi được — đó chính là chỗ
   * đẻ ra "bé trai 43 tuổi".
   */
  xungHo: string;
}

export const LOP: Record<LopId, LopDef> = {
  nho: {
    id: 'nho',
    ten: 'Tuổi làm quen',
    tuoi: '3–7 tuổi',
    vaiChaMe:
      'Mở rộng chứ đừng chọn hộ. Việc của người lớn lúc này là bày ra đủ thứ để con chạm vào, rồi quan sát xem con dừng lại ở đâu lâu nhất.',
    xungHo: 'cháu',
  },
  giua: {
    id: 'giua',
    ten: 'Tuổi thử và làm ra sản phẩm',
    tuoi: '8–12 tuổi',
    vaiChaMe:
      'Cho con làm ra một thứ trọn vẹn. Ở tuổi này cái quý không phải là học được gì mà là lần đầu biết cảm giác theo một việc tới lúc xong.',
    xungHo: 'con',
  },
  lon: {
    id: 'lon',
    ten: 'Tuổi đào sâu và va chạm thật',
    tuoi: '13–18 tuổi',
    vaiChaMe:
      'Cho con gặp nghề thật và người thật, kể cả phần khó. Chọn hướng dựa trên một buổi nhìn tận mắt vẫn chắc hơn dựa trên mười lời khuyên.',
    xungHo: 'con',
  },
  vaodoi: {
    id: 'vaodoi',
    ten: 'Tuổi vào đời',
    tuoi: '19–25 tuổi',
    vaiChaMe:
      'Thôi chọn hộ, chuyển sang làm người để hỏi ý. Ở tuổi này con đã tự quyết được rồi — thứ cha mẹ còn giúp được là mở quan hệ và nói thật về cái giá của từng đường.',
    xungHo: 'con',
  },
};

/**
 * Tuổi mụ từ đó trở lên thì đây không còn là câu hỏi "định hướng sớm cho con".
 * Là ngưỡng THẬT mà `lopTuoi` dùng — không phải một con số chép lại để tả nó.
 */
export const TUOI_HET_LA_TRE = 26;

/**
 * Lứa tuổi từ TUỔI MỤ trong lá số.
 *
 * 🔴 Trả `null` khi ≥26 — CỐ Ý không kẹp về lứa cuối như bản đầu. Kẹp là cách
 * hỏng IM LẶNG: lá số 43 tuổi rơi vào lứa 13–18 rồi được gọi là "bé trai", và
 * không có gì trong hệ thống báo sai. Người gọi PHẢI xử lý `null`.
 */
export function lopTuoi(tuoi: number | null): LopId | null {
  if (tuoi == null) return 'giua';
  if (tuoi <= 7) return 'nho';
  if (tuoi <= 12) return 'giua';
  if (tuoi <= 18) return 'lon';
  return tuoi < TUOI_HET_LA_TRE ? 'vaodoi' : null;
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
  /**
   * Hình 13 chiều (5 trục + 8 chất của `day-con-assess`) — xem 3 luật viết ở
   * đầu file. Tóm tắt: trục ĐƯỢC âm, chất KHÔNG; và không nạp hai chiều
   * |corr| > 0,45 trong cùng một hình.
   */
  hinh: Hinh;
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
      vaodoi: [
        'Nhận một việc chưa ai trong nhóm làm được, và được phép thử sai vài lượt trước khi ra kết quả',
        'Đi làm ở chỗ còn đang dựng, nơi quy trình chưa có sẵn để làm theo',
        'Tự dựng một thứ chạy được rồi đưa cho người lạ dùng thử',
        'Học một mảng kỹ thuật mới hẳn, đủ sâu để sửa được khi nó hỏng',
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
    // Neo T:nep THẤP — "chưa theo nếp, còn đang thử". Nhịp nhanh là phần của
    // hướng này, vì thế `van-dong` CỐ Ý không nạp `nhip` nữa (corr +0,71).
    hinh: { nep: -1.8, nhip: 0.9, 'suy-luan': 0.7, 'hinh-khoi': 0.5 },
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
        'Dẫn một nhóm qua một lần bất đồng thật — nơi nó phải chốt trong khi vài người không đồng ý',
        'Cho ngồi cùng một buổi họp của người lớn để nhìn cách người ta ra quyết định',
      ],
      vaodoi: [
        'Nhận trách nhiệm về kết quả của một nhóm nhỏ, kể cả khi chưa có chức danh',
        'Đứng ra chốt một việc mà các bên đang lệch nhau, rồi chịu phần hậu quả',
        'Chủ trì một dự án có hạn chót thật và có người phụ thuộc vào mình',
        'Tập nói lời từ chối, và tập bỏ một ý tưởng của chính mình khi số liệu nói ngược',
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
    // Neo K:hieu-nguoi + GIỮ Ý MÌNH (hoa thấp) — người DẪN, không phải người hoà.
    // Chính trục `hoa` tách hướng này khỏi `giao-thiep` (cùng đọc người nhưng
    // ngược cực): bản đầu để hai hình cosine 0,86 và chúng nuốt nhau.
    hinh: { 'hieu-nguoi': 2.2, hoa: -1.0, huong: 0.7 },
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
        'Theo một môn nghệ thuật tới tận phần kỹ thuật khô khan, không dừng ở chỗ còn vui',
        'Cuộc thi sáng tác, trại hè sáng tác',
        'Gặp một người sống được bằng nghề sáng tạo để nghe cả phần khó của nghề',
      ],
      vaodoi: [
        'Nhận việc có người trả tiền cho tác phẩm, để thấy chỗ nào là thoả mãn mình chỗ nào là phục vụ người khác',
        'Xây một hồ sơ tác phẩm đủ dày để người lạ đánh giá được, không phải vài thứ tâm đắc',
        'Vào một môi trường có người giỏi hơn hẳn và chịu được việc bị chê',
        'Nắm phần công nghiệp của nghề sáng tạo: bản quyền, hạn chót, làm việc với khách',
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
    // Neo K:hinh-khoi. `am-nhac` corr +0,42 — chấp nhận vì đó ĐÚNG là một cụm
    // thẩm mỹ, không phải hai tín hiệu rời bị đếm hai lần.
    hinh: { 'hinh-khoi': 2.0, 'am-nhac': 1.1, nep: -0.6 },
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
      vaodoi: [
        'Làm một công việc có người thật trông vào mình mỗi ngày',
        'Tập đặt giới hạn — nhận ra lúc nào là giúp và lúc nào là gánh hộ',
        'Theo một chuyên môn có chứng chỉ hành nghề nếu định đi đường dài',
        'Vào một tổ chức làm việc cộng đồng có quy mô, không chỉ giúp lẻ',
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
    // Neo K:thien-nhien. Bỏ `nhay` (corr +0,49 với thien-nhien ⇒ đếm hai lần).
    hinh: { 'thien-nhien': 2.1, 'hieu-nguoi': 0.8, hoa: 0.7 },
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
      vaodoi: [
        'Nhận một việc mà sai sót đo được và có hậu quả thật',
        'Theo một hệ chuẩn có kiểm định: kế toán, kiểm định chất lượng, an toàn lao động',
        'Dựng lại quy trình cho một chỗ đang làm lộn xộn, rồi đo xem có bớt lỗi không',
        'Chịu một lần bị người khó tính soi ngược lại toàn bộ việc mình đã làm',
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
    // Hình DUY NHẤT neo vào một trục ở cực CAO.
    hinh: { nep: 2.0, 'suy-luan': 0.8, 'hinh-khoi': 0.4 },
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
      vaodoi: [
        'Theo một nghề có bậc tay nghề rõ ràng và đi cho hết vài bậc đầu',
        'Tìm một người thầy trong nghề, chịu làm phần việc nhàm ở giai đoạn đầu',
        'Đặt một mốc ba năm cho một môn, rồi đo lại bằng sản phẩm chứ không bằng cảm giác',
        'Bù phần lý thuyết cho cái nghề mình đang làm bằng tay',
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
    // Neo K:hieu-minh. Bỏ hẳn `nhay` (+0,48 với hieu-minh) và `van-dong` (−0,48):
    // bản đầu nạp cả hai NGƯỢC chiều nên tự triệt tiêu, chỉ còn 4,4%.
    hinh: { 'hieu-minh': 2.0, nep: 0.9 },
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
        'Trò chơi đổi vai có hai phía: người mua kẻ bán, người hỏi người trả lời',
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
      vaodoi: [
        'Làm một việc có khách thật và có chỉ tiêu đo được',
        'Đi thương lượng một hợp đồng nhỏ từ đầu tới lúc ký',
        'Dựng một mạng quan hệ nghề có đi có lại, không phải một danh bạ',
        'Chịu một quãng bị từ chối liên tục mà không đổi nghề ngay',
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
    // Neo K:ngon-ngu + THUẬN nhóm (hoa cao) — ngược hẳn `dan-dat` ở trục `hoa`.
    hinh: { 'ngon-ngu': 2.0, huong: 1.0, hoa: 0.7 },
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
      vaodoi: [
        'Nhận một câu hỏi chưa ai trả lời được, rồi đi tìm số liệu để trả lời',
        'Nắm một công cụ phân tích tới mức dùng được trong việc thật',
        'Trình bày kết luận trước người phản biện và giữ được lập luận',
        'Chọn chỗ làm coi trọng bằng chứng hơn thâm niên',
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
    hinh: { 'suy-luan': 2.2, huong: -0.8 },
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
      vaodoi: [
        'Chuyển từ tập sang một vai có trách nhiệm: huấn luyện, tổ chức giải, quản sân bãi',
        'Nhận một công việc đòi thể lực và nhịp độ cao, xem mình chịu tới đâu',
        'Nắm phần chuyên môn quanh vận động: dinh dưỡng, hồi phục, phòng chấn thương',
        'Đặt một mục tiêu thể chất dài hạn và theo tới cùng dù không còn ai chấm điểm',
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
    // Neo K:van-dong. Bỏ `nhip` (+0,71!) và `nhay` (−0,47) — chính hai cái đó
    // thổi hình này lên 27,6% ở lượt đo đầu.
    hinh: { 'van-dong': 2.2, hoa: -0.4 },
  },
};

export const HUONG_IDS = Object.keys(THIEN_HUONG) as HuongId[];

// ── Chấm ────────────────────────────────────────────────────
// KHÔNG còn bước trừ nền của bản 21 trục: 13 chiều đã z-score sẵn từng chiều
// nên nền phẳng từ gốc (xem luật 1 ở đầu file). Tính sẵn một lần lúc nạp
// module — bảng là hằng, tính lại mỗi lượt là mời một lỗi trôi.
const HINH_VEC: Record<HuongId, Vec> = Object.fromEntries(
  HUONG_IDS.map((id) => [id, V(THIEN_HUONG[id].hinh)]),
) as Record<HuongId, Vec>;

function cosine(a: Vec, b: Vec): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

/**
 * Ngưỡng "nghiêng hẳn". Dưới ngưỡng ⇒ `chuaRoNet`.
 *
 * Chọn 0,20 để tỉ lệ `chuaRoNet` (**7,1%**) bám sát mức của bản 21 trục (6,6%):
 * đổi TẦNG CHẤM thì không được lặng lẽ đổi luôn tần suất tool nói "chưa rõ
 * nét" — đó là một câu người dùng đọc được, không phải một hằng số nội bộ.
 * Đo trên 2.496 lá số: 0,18 → 5,4% · 0,20 → 7,1% · 0,25 → 11,9%.
 */
const NGUONG = 0.2;

/**
 * Chất điểm THẤP đọc thế nào — luôn nói về VIỆC, không nói về đứa trẻ.
 *
 * 🔴 Đây là chỗ nguy hiểm nhất của cả module. Trục thì hai cực đều có nội dung
 * thật nên không có đường đọc thành lời chê; CHẤT thì có. Nên phần chữ ở đây
 * tôi viết riêng, cố ý KHÔNG mượn `motCau` của `KHIEU` (câu đó tả năng khiếu,
 * ghép vào ngữ cảnh "thấp" là thành lời chê ngay).
 */
// `{ai}` được thay bằng `LOP[...].xungHo` ở chỗ dựng — trước đây chỗ này ghi
// cứng "cháu", tức bảng dữ liệu tự khoá tool vào đúng một lứa tuổi.
const CHAT_KHONG_DOI_HOI: Record<KhieuId, string> = {
  'ngon-ngu': 'Việc hợp với {ai} không đòi hỏi phải nói nhiều hay diễn đạt trước đám đông',
  'suy-luan': 'Việc hợp với {ai} không đòi hỏi phải ngồi lần ra quy luật hay tính toán dài',
  'hinh-khoi': 'Việc hợp với {ai} không đòi hỏi con mắt hình khối hay thẩm mỹ',
  'van-dong': 'Việc hợp với {ai} không đòi hỏi phải khéo tay hay vận động nhiều',
  'am-nhac': 'Việc hợp với {ai} không đòi hỏi tai nhạc hay cảm nhịp',
  'hieu-nguoi': 'Việc hợp với {ai} không đòi hỏi phải đọc ý người khác hay giữ nhịp một nhóm',
  'hieu-minh': 'Việc hợp với {ai} không đòi hỏi phải tự học một mình trong thời gian dài',
  'thien-nhien': 'Việc hợp với {ai} không đòi hỏi chăm sóc cây cối, con vật hay người đang cần',
};

export interface HuongGoiY {
  id: HuongId;
  ten: string;
  chat: string;
  dauHieu: string[];
  /** 0–100, để XẾP THỨ TỰ. Không bày như "độ chính xác" — nó là độ nghiêng. */
  diem: number;
  /** Chiều kéo hướng này lên, đọc theo ĐÚNG cực mà đứa trẻ đang đứng. */
  vi: string[];
}

export interface HuongTreKetQua {
  goiY: HuongGoiY[];
  /** Ba chiều nổi nhất của chính lá số (trục đọc theo cực, chất đọc khi CAO). */
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

/** Nhãn của chiều thứ `i`, đọc theo ĐÚNG cực đứa trẻ đang đứng. */
function nhanChieu(i: number, val: number): { ten: string; mo: string } {
  if (i < TRUC_IDS.length) {
    const t = TRUC[TRUC_IDS[i]];
    // Trục HAI CỰC: cực thấp không phải "thiếu", nó là một cách sống khác và có
    // nội dung riêng. Đọc đúng cực chứ không mặc định đọc cực cao.
    const c = val >= 0 ? t.cao : t.thap;
    return { ten: t.ten, mo: `${c.nhan} — ${c.bieuHien}` };
  }
  const k = KHIEU[KHIEU_IDS[i - TRUC_IDS.length]];
  return { ten: k.ten, mo: k.motCau };
}

/**
 * Ba thiên hướng nghiêng nhất của một lá số trẻ.
 *
 * Nhận `Assessment` chứ không nhận `Laso`: khung 5 trục · 8 chất đắt hơn hẳn
 * một phép tra bảng, và `computeHuongNghiepTre` còn dùng nó cho phần khác —
 * gọi `assessChild` hai lần là làm cùng một việc hai lượt.
 */
export function chonThienHuong(a: Assessment, soLuong = 3): HuongTreKetQua {
  const v = vector13(a);
  const xep = HUONG_IDS.map((id) => ({ id, s: cosine(v, HINH_VEC[id]) })).sort((x, y) => y.s - x.s);

  const goiY: HuongGoiY[] = xep.slice(0, soLuong).map(({ id, s }) => {
    const h = THIEN_HUONG[id];
    const hv = HINH_VEC[id];
    // Chiều vừa ĐÓNG GÓP nhiều cho hướng này, vừa là chỗ đứa trẻ thật sự lệch.
    // ⚠️ Chốt `Math.abs(manh) > 0.25` là BẮT BUỘC: tích v×hình ra DƯƠNG cả khi
    // hai vế CÙNG ÂM, nên thiếu nó thì một chiều đứa trẻ gần mức giữa vẫn lọt
    // vào phần giải thích và bản đọc tự mâu thuẫn ngay trong một màn hình. Đã
    // vấp đúng lỗi này ở tầng nhánh nghề của Công Sở.
    const vi = v
      .map((val, i) => ({ i, val, gop: val * hv[i] }))
      .filter((x) => x.gop > 0.15 && Math.abs(x.val) > 0.25)
      .sort((p, q) => q.gop - p.gop)
      .slice(0, 3)
      .map((x) => {
        const n = nhanChieu(x.i, x.val);
        return `${n.ten} — ${n.mo}`;
      });
    return {
      id,
      ten: h.ten,
      chat: h.chat,
      dauHieu: h.dauHieu,
      diem: Math.round(Math.max(0, Math.min(1, (s + 1) / 2)) * 100),
      vi,
    };
  });

  // Chất người: chiều lệch xa mức giữa nhất, KHÔNG phân biệt trục hay chất —
  // đó đều là "đọc được gì về đứa trẻ này".
  const xepChieu = v
    .map((val, i) => ({ i, val }))
    .sort((p, q) => Math.abs(q.val) - Math.abs(p.val));

  return {
    goiY,
    chatNguoi: xepChieu
      .filter((x) => Math.abs(x.val) > 0.4)
      .slice(0, 3)
      .map((x) => {
        const n = nhanChieu(x.i, x.val);
        return { ten: n.ten, cao: n.mo };
      }),
    // 🔴 CHỈ lấy từ CHẤT, và chỉ khi chất đó thấp rõ. Trục thì hai cực đều có
    // nội dung nên không có "không đòi hỏi" nào để nói; ép trục vào đây là bịa
    // ra một lời chê từ một tính chất trung tính.
    khongDoiHoi: KHIEU_IDS.map((id, j) => ({ id, val: v[TRUC_IDS.length + j] }))
      .filter((x) => x.val < -0.5)
      .sort((p, q) => p.val - q.val)
      .slice(0, 2)
      .map((x) => ({ ten: KHIEU[x.id].ten, thap: CHAT_KHONG_DOI_HOI[x.id] })),
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

/** Thay chỗ giữ `{ai}` trong bảng chữ bằng cách gọi đúng tuổi. */
function xungHoHoa(k: HuongTreKetQua, ai: string): HuongTreKetQua {
  return {
    ...k,
    khongDoiHoi: k.khongDoiHoi.map((c) => ({ ...c, thap: c.thap.replace(/\{ai\}/g, ai) })),
  };
}

export interface HuongNghiepTreProfile {
  namXem: number;
  tuoi: number | null;
  namSinh: number | null;
  gioiTinh: 'nam' | 'nu';
  moiLo: MoiLoDef;
  /**
   * 🔴 `false` khi tuổi mụ ≥ 26. Lúc đó `lop` chỉ là chỗ đứng kỹ thuật để
   * payload giữ nguyên hình dạng — KHÔNG được đọc nó như lứa tuổi thật, và
   * KHÔNG được bán bản đọc viết cho trẻ con. Route chặn đường trả tiền, trang
   * đổi sang lời bàn giao sang Tử Vi Công Sở.
   */
  laTreEm: boolean;
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
  const lopId = lopTuoi(tuoi);
  // Tuổi mụ ≥ 26 ⇒ không còn là trẻ. Vẫn dựng payload (tầng thiên hướng đọc
  // từ 13 chiều, độc lập tuổi, nên nó có nghĩa ở mọi tuổi) nhưng gắn cờ để
  // route và trang xử lý — thay vì lặng lẽ kẹp về lứa 13–18 như bản đầu.
  const laTreEm = lopId !== null;
  const lop = LOP[lopId ?? 'vaodoi'];

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
    laTreEm,
    lop,
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    // Khung 5 trục · 8 chất dựng MỘT lần rồi dùng chung — đây là nền chấm, và
    // nó là CHÍNH khung `day-con` đang bán cạnh tool này (xem đầu file).
    huong: xungHoHoa(chonThienHuong(assessChild(ls)), lop.xungHo),
    matDoc,
    changDangO,
    // Chỉ lứa 3–7 mới cấm tên nghề. `lopId === null` (người lớn) rơi vào nhánh
    // `true` là đúng — người trưởng thành thì tên nghề không còn là chuyện phải
    // giấu.
    bayNghe: lopId !== 'nho',
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
    // Trang phải biết để đổi xưng hô và thay tường trả tiền bằng lời bàn giao.
    laTreEm: p.laTreEm,
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
