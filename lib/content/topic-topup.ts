// lib/content/topic-topup.ts
// ============================================================
// NẠP CHỦ ĐỀ HẰNG TUẦN cho 2 cron viết bài đang chạy.
//
// ⚠️ VÌ SAO FILE NÀY TỒN TẠI — đọc trước khi sửa bất cứ luật nào bên dưới.
//
// Site đã xuất bản 765 bài (309 nghiên cứu + 324 khảo luận + 132 vấn đáp) với
// nhịp 4–8 bài/ngày trong nhiều tháng. Kết quả đo trên Search Console 28 ngày:
// 16 nhấp, trong đó 11 nhấp về trang chủ. Nguyên nhân KHÔNG phải chất lượng
// chữ, cũng KHÔNG phải index — `/la-so/*` được index và xếp hạng 1,4–3,5.
//
// Nguyên nhân nằm ở KHÂU CHỌN ĐỀ TÀI: hàng đợi cũ là mục lục tạp chí Khoa Học
// Huyền Bí thập niên 70 ("Lá số và cuộc đời nữ diễn viên Bích Thủy"). Viết hay
// tới đâu cũng không cứu được một chủ đề mà năm 2026 không ai gõ vào Google.
//
// Nên LUẬT CỨNG của file này: MỌI chủ đề phải truy được về một BẰNG CHỨNG CẦU.
// Ba nguồn, không có nguồn thứ tư:
//   1. `keyword_ideas`  — Google Suggest (cron keyword-suggest, T3 hằng tuần).
//                         Autocomplete = chữ người thật đã gõ.
//   2. Search Console   — truy vấn site ĐÃ có hiển thị, hạng 20–100. Cầu đã
//                         chứng minh VÀ Google đã thấy site liên quan. Đây là
//                         nguồn tốt nhất, chỉ tội ít.
//   3. `SEASONAL_SPOKES`— khung mùa vụ + thực thể, dùng khi 1 và 2 cạn.
//
// LLM CHỈ ĐƯỢC ĐẶT LẠI TÊN, KHÔNG ĐƯỢC NGHĨ RA CHỦ ĐỀ. Cho model tự do bịa đề
// tài là dựng lại đúng cái bẫy vừa thoát ra, chỉ khác là bịa nhanh hơn.
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { getSearchConsoleSnapshot } from '@/lib/analytics/search-console';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Số chủ đề nạp cho mỗi bề mặt mỗi tuần = (số lịch cron/ngày) × 1 bài/lượt × 7.
 *
 * ⚠️ BA BỀ MẶT TIÊU KHÁC NHAU, đừng gộp về một con số. `vercel.json` khai:
 *   cron-khao-luan       3 lịch/ngày → 3 bài/ngày → 21/tuần
 *   cron-master-write    5 lịch/ngày → 5 bài/ngày → 35/tuần
 *   cron-khao-luan-tamly 2 lịch/TUẦN (T3+T6, KHÔNG phải mỗi ngày) → 2/tuần —
 *     mỗi lượt chỉ pop ĐÚNG 1 chủ đề (nó tự nở thành 3–5 bài ở tầng viết, xem
 *     route đó), nên đơn vị ở ĐÂY vẫn là CHỦ ĐỀ, không phải bài.
 * Nạp đều một con số cho cả ba (bản đầu chỉ có 2 bên đã dính) thì bề mặt tiêu
 * nhanh hơn cạn trước rồi chạy rỗng nhiều ngày mỗi tuần — đúng sự cố hàng đợi
 * khảo luận từng dính. Sửa lịch cron thì phải sửa luôn con số ở đây.
 */
const PER_WEEK: Record<Surface, number> = {
  'nghien-cuu': 35,
  'khao-luan': 21,
  'khao-luan-tamly': 2,
};

/** Giữ lại cho chỗ gọi cũ / hiển thị; nay chỉ là mức của bề mặt khảo luận. */
export const DEFAULT_PER_SURFACE = PER_WEEK['khao-luan'];

// ── Hai bề mặt, hai ĐỊNH DẠNG khác hẳn nhau ───────────────────────────────────
//
// Đây không phải hai mức độ dài của cùng một loại bài — chúng khác cả ngôi kể,
// và `brand-check.ts` áp hai profile riêng. Nhét chủ đề tra cứu ("tuổi nào phạm
// Thái Tuế") vào bề mặt tuỳ bút sẽ ra một bài thầy suy tư về Thái Tuế, trong
// khi người gõ truy vấn đó muốn MỘT DANH SÁCH TUỔI. Nội dung đúng, dạng sai,
// vẫn không lên hạng.

export type Surface = 'nghien-cuu' | 'khao-luan' | 'khao-luan-tamly';

interface SurfaceSpec {
  /** `topic_queue.type` tương ứng. */
  queueType: string;
  /** Mô tả đưa vào prompt để model đặt tên đúng dạng. */
  brief: string;
  /** Loại ý định tìm kiếm bề mặt này phục vụ. */
  intent: string;
}

const SURFACES: Record<Surface, SurfaceSpec> = {
  // → bảng `master_articles`, hiện tại /nghien-cuu
  'nghien-cuu': {
    queueType: 'master-article',
    brief:
      'Tuỳ bút nghiên cứu 1.200–1.500 từ, ngôi thứ NHẤT ("tôi"), ký tên thầy ở cuối bài.',
    intent:
      'Truy vấn DIỄN GIẢI: người đã biết cơ bản, muốn hiểu VÌ SAO / CƠ CHẾ / KHÁC NHAU CHỖ NÀO. ' +
      'Ví dụ dạng: "vì sao hai người cùng giờ sinh lại khác số phận", "cung Tài Bạch xấu có nhất định nghèo không".',
  },
  // → bảng `khao_luan`, hiện tại blog.html (danh sách) + /khao-luan/<slug> (chi tiết)
  'khao-luan': {
    queueType: 'khao-luan',
    brief: 'Bài Vấn Đáp ngắn ~1.400 ký tự, ngôi thứ BA, không tự xưng.',
    intent:
      'Truy vấn TRA CỨU: hỏi thẳng, đáp gọn trong 1–2 đoạn — hợp đoạn trích nổi bật và AI Overview. ' +
      'Ví dụ dạng: "Kim Lâu là gì", "tuổi nào phạm Thái Tuế năm 2027", "cách tính Tam Tai".',
  },
  // → CÙNG bảng `khao_luan`, khác `type` trong topic_queue để cron riêng
  // (cron-khao-luan-tamly) nhặt đúng hàng của mình. KHÔNG phải bề mặt thứ ba
  // để nhận cầu KHÔNG-phân-loại-được — chỉ dành cho chủ đề THỰC SỰ mang khung
  // tâm lý/xã hội trong 3 danh mục hẹp (tinh-cach/quan-he/benh-tat).
  'khao-luan-tamly': {
    queueType: 'khao-luan-tamly',
    brief:
      'Cùng định dạng Vấn Đáp (~1.400 ký tự, ngôi thứ BA) nhưng đây là một CHỦ ĐỀ RỘNG, ' +
      'sẽ được một cron RIÊNG nở thành 3–5 bài Vấn Đáp góc khác nhau, không phải một câu hỏi đơn.',
    intent:
      'CHỈ chọn bề mặt này khi cụm từ khoá thực sự là một khung TÂM LÝ/CẢM XÚC/QUAN HỆ CON NGƯỜI ' +
      '(ghen tuông, cô đơn, áp lực gia đình, xung đột mẹ chồng nàng dâu, lo âu kéo dài...), KHÔNG PHẢI ' +
      'khi nó chỉ nhắc chung chung tới lá số/vận hạn/ngày tốt. Nghi ngờ thì KHÔNG chọn bề mặt này — ' +
      'rơi về [khao-luan] hoặc [nghien-cuu] tuỳ ý định.',
  },
};

// ── Nguồn 3: khung mùa vụ ─────────────────────────────────────────────────────
//
// Đây là lưới an toàn để hàng đợi KHÔNG BAO GIỜ cạn — đúng sự cố vừa xảy ra:
// hàng đợi khảo luận về 0 pending từ 23/07, ba cron/ngày chạy rỗng suốt tuần.
//
// Mỗi "spoke" là một khung CÓ CẦU ĐÃ ĐO, nhân với một tập thực thể. Nhân bản
// theo thực thể ở đây KHÁC hẳn 438K trang /la-so/* đã phải rút khỏi sitemap:
// khung ở đây là thứ người ta thật sự gõ ("xem tử vi tuổi đinh mão" — GSC hạng
// 82), còn /la-so/* chỉ khớp truy vấn dạng ngày sinh chính xác mà gần như
// không ai gõ. Nhân bản chỉ an toàn khi CHÍNH CÁI KHUNG có cầu.
const CAN_CHI = [
  'Giáp Tý', 'Ất Sửu', 'Bính Dần', 'Đinh Mão', 'Mậu Thìn', 'Kỷ Tỵ',
  'Canh Ngọ', 'Tân Mùi', 'Nhâm Thân', 'Quý Dậu', 'Giáp Tuất', 'Ất Hợi',
  'Bính Tý', 'Đinh Sửu', 'Mậu Dần', 'Kỷ Mão', 'Canh Thìn', 'Tân Tỵ',
  'Nhâm Ngọ', 'Quý Mùi', 'Giáp Thân', 'Ất Dậu', 'Bính Tuất', 'Đinh Hợi',
  'Mậu Tý', 'Kỷ Sửu', 'Canh Dần', 'Tân Mão', 'Nhâm Thìn', 'Quý Tỵ',
  'Giáp Ngọ', 'Ất Mùi', 'Bính Thân', 'Đinh Dậu', 'Mậu Tuất', 'Kỷ Hợi',
  'Canh Tý', 'Tân Sửu', 'Nhâm Dần', 'Quý Mão', 'Giáp Thìn', 'Ất Tỵ',
  'Bính Ngọ', 'Đinh Mùi', 'Mậu Thân', 'Kỷ Dậu', 'Canh Tuất', 'Tân Hợi',
  'Nhâm Tý', 'Quý Sửu', 'Giáp Dần', 'Ất Mão', 'Bính Thìn', 'Đinh Tỵ',
  'Mậu Ngọ', 'Kỷ Mùi', 'Canh Thân', 'Tân Dậu', 'Nhâm Tuất', 'Quý Hợi',
];

const CHINH_TINH = [
  'Tử Vi', 'Thiên Cơ', 'Thái Dương', 'Vũ Khúc', 'Thiên Đồng', 'Liêm Trinh',
  'Thiên Phủ', 'Thái Âm', 'Tham Lang', 'Cự Môn', 'Thiên Tướng', 'Thiên Lương',
  'Thất Sát', 'Phá Quân',
];

const CUNG = [
  'Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc',
  'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ',
];

/**
 * Câu hỏi ĐỜI SỐNG cho bề mặt /nghien-cuu.
 *
 * Vì sao không phải chủ đề học thuật ("Vì sao sao Thất Sát ở mỗi lá số lại cho
 * kết quả khác nhau"): loại đó chỉ người ĐÃ học tử vi mới gõ, mà đó là một tập
 * rất nhỏ. Bằng chứng ngay trong DB — `khao_luan` vốn phân loại theo mảng ĐỜI
 * SỐNG (tinh-cach 71 · van-han 58 · tai-chinh 54 · cong-viec 31 · con-cai 24 ·
 * hon-nhan 23…), còn `master_articles` thì toàn học thuật, và chính nhóm sau là
 * nhóm không có một URL nào lọt top trang có hiển thị trên Search Console.
 *
 * ⚠️ RÀNG BUỘC KHI THÊM CÂU MỚI — đọc kỹ, đây là chỗ dễ hỏng nhất:
 *
 *   1. Phải giữ Ý ĐỊNH TỬ VI. "Có nên nghỉ việc không" thuần tuý sẽ đấu với
 *      blog nghề nghiệp, và người gõ nó KHÔNG muốn đọc luận mệnh — có lên hạng
 *      cũng chỉ tăng thoát trang. Câu đúng là câu người ta hỏi KHI ĐÃ tìm đến
 *      mệnh lý: có nhắc lá số / cung / đại vận / số phận trong chính câu hỏi.
 *   2. Phải có chỗ bám trong cổ thư (`tuvi_docs`, 1.254 chunk) — thường là một
 *      cung cụ thể. Không có nguồn thì bài thành văn vo, đúng thứ Google gọi là
 *      nội dung sản xuất hàng loạt ít giá trị.
 *   3. KHÔNG nêu tên người thật, doanh nghiệp thật, sự kiện thời sự. Cổ thư
 *      không có nguồn nào về một công ty cụ thể; gắn vào là bịa 100% kèm rủi ro
 *      pháp lý. Đây là ranh giới giữ "ăn theo NỖI LO" và "ăn theo SỰ KIỆN".
 *
 * Danh sách này là LƯỚI AN TOÀN, không phải nguồn chính. Ở nhịp 35 bài/tuần của
 * bề mặt nghiên cứu, nó chỉ đủ ~1 tuần rưỡi trước khi quay vòng — nguồn bền
 * vững là `keyword_ideas` (Google Suggest) từ 04/08 trở đi, chỗ có cách hỏi đời
 * thường ở quy mô thật. Suggest mà hụt thì phải nới danh sách này, đừng hạ chỉ
 * tiêu: hạ chỉ tiêu là để cron chạy rỗng.
 */
const LIFE_QUESTIONS = [
  // Tiền bạc
  'Làm mãi vẫn không dư được đồng nào — lá số nói gì về người khó giữ tiền',
  'Kiếm được nhiều nhưng tiêu cũng nhanh — vì sao có người cả đời không tích được của',
  'Cho bạn bè vay tiền rồi mất luôn — có phải số mình hay mất của',
  'Bao nhiêu tuổi thì tiền bạc mới vào đều — nhìn ở đâu trong lá số',
  'Đầu tư gì cũng lỗ — lá số có báo trước chuyện này không',
  'Cung Tài Bạch xấu có nhất định nghèo không',
  // Công việc
  'Có nên bỏ việc ổn định để ra làm riêng — lá số nhìn quyết định này thế nào',
  'Đi làm chỗ nào cũng không hợp sếp — lá số nói gì về chuyện đó',
  'Nên làm công ăn lương hay tự kinh doanh — cung Quan Lộc trả lời được tới đâu',
  'Đổi nghề ở tuổi ngoài 35 có muộn không — nhìn theo đại vận',
  'Làm việc chăm chỉ mà mãi không được thăng chức — lá số lý giải thế nào',
  // Hôn nhân, tình duyên
  'Vợ chồng hay cãi vặt — do không hợp tuổi hay do cung Phu Thê',
  'Ngoài 30 vẫn chưa lập gia đình — muộn duyên nhìn ở đâu trong lá số',
  'Yêu ai cũng dang dở — có phải số mình lận đận tình duyên',
  'Người cũ quay lại — lá số nói gì về chuyện nối lại duyên xưa',
  'Lấy người hơn tuổi hay kém tuổi thì hợp hơn — cổ pháp luận thế nào',
  // Con cái
  'Con không nghe lời, học hành sa sút — cung Tử Tức nói được gì',
  'Muộn con — lá số có cho biết trước điều đó không',
  'Cha mẹ và con cái xung khắc — vì sao cùng nhà mà không hợp nhau',
  'Nên sinh con vào năm nào — chọn theo tuổi bố mẹ có cơ sở tới đâu',
  // Gia đình
  'Anh em ruột mà không nhìn mặt nhau — lá số có báo trước không',
  'Sống chung với bố mẹ chồng luôn căng thẳng — nhìn từ cung Phụ Mẫu',
  'Người phải gánh cả nhà từ nhỏ — lá số dạng đó trông thế nào',
  // Quan hệ xã hội
  'Hay bị lợi dụng lòng tốt — cung Nô Bộc luận thế nào',
  'Bạn bè nhiều nhưng lúc khó không ai giúp — lá số lý giải ra sao',
  'Người dễ gặp quý nhân và người mãi không gặp — khác nhau ở đâu',
  // Sức khoẻ
  'Người hay ốm vặt quanh năm — cung Tật Ách nói gì',
  'Mất ngủ, lo âu kéo dài — lá số có liên quan gì không',
  'Tuổi nào cần giữ sức khoẻ nhất — nhìn theo chuỗi đại vận',
  // Nhà cửa, đất đai
  'Mua nhà xong làm ăn đi xuống — có phải tại cung Điền Trạch',
  'Người có số được thừa kế nhà đất — nhìn ở đâu trong lá số',
  'Nên mua nhà hay tiếp tục đi thuê — lá số giúp được gì cho quyết định này',
  // Tính cách
  'Ngoài mặt mạnh mẽ, trong lòng yếu đuối — vì sao lá số hay mâu thuẫn thế',
  'Người nóng tính có sửa được không — cổ pháp nói gì',
  'Hay nghĩ nhiều, quyết định chậm — đó là tính hay là số',
  'Vì sao có người luôn được lòng người khác mà không cần cố',
  // Vận hạn
  'Năm nào cũng thấy khó — hay là mình đang ở một đại vận xấu',
  'Vì sao có giai đoạn làm gì cũng khó — đại vận nói gì về những năm bế tắc',
  'Hạn xấu có thật sự tránh được không, hay chỉ là tự trấn an',
  'Qua tuổi bao nhiêu thì đời bớt vất vả — nhìn theo chuỗi đại vận',
  'Cùng một năm, sao người này gặp may mà người kia gặp hạn',
  // Chung
  'Vì sao hai người cùng ngày cùng giờ sinh lại khác số phận',
  'Xem tử vi rồi biết trước vận xấu — biết để làm gì',
  'Người không tin tử vi thì lá số có đúng với họ không',

  // ── Nới đợt 2 ───────────────────────────────────────────────────────────────
  // Bề mặt nghiên cứu tiêu 35/tuần, mà 44 câu thì tuần thứ hai đã hụt: vòng
  // xoay lấy lại phần lớn câu tuần trước, rồi bị chống trùng loại sạch vì lúc
  // đó chúng đã thành bài thật. Nới lên ~74 để có ~2 tuần đệm trong lúc chờ
  // `keyword_ideas` (Google Suggest) trở thành nguồn chính.
  'Vay tiền làm ăn có nên không — lá số nói gì về người hợp và không hợp vay vốn',
  'Lộc bất ngờ có thật không — lá số có dấu hiệu nào báo trước',
  'Người giữ tiền giỏi khác người tiêu hoang ở chỗ nào trong lá số',
  'Làm nghề tay trái lại khá hơn nghề chính — cung Quan Lộc lý giải ra sao',
  'Hay bị đồng nghiệp chơi xấu — lá số nói gì về chuyện đó',
  'Người hợp làm quản lý và người hợp làm chuyên môn khác nhau ở đâu',
  'Mất việc giữa chừng — đó là hạn hay là bước ngoặt trong đại vận',
  'Chồng hay đi sớm về khuya — cung Phu Thê có báo trước điều gì không',
  'Ly hôn rồi có nên đi bước nữa — lá số nhìn chuyện này thế nào',
  'Vì sao có người cưới muộn lại bền, cưới sớm lại đổ vỡ',
  'Người thứ ba xuất hiện — cung Phu Thê có dấu hiệu gì trước đó',
  'Con trai hay con gái hợp với mình hơn — cung Tử Tức luận thế nào',
  'Con học giỏi mà lớn lên không thành đạt — lá số lý giải ra sao',
  'Chia tài sản trong nhà sinh mâu thuẫn — cung Điền Trạch nói gì',
  'Xa quê lập nghiệp hay ở gần bố mẹ — cung Thiên Di trả lời tới đâu',
  'Người hay bị nói xấu sau lưng — lá số lý giải ra sao',
  'Vì sao có người đi đâu cũng gặp người giúp đỡ',
  'Bệnh vặt tái đi tái lại — cung Tật Ách có liên quan không',
  'Người dễ gặp tai nạn — lá số có dấu hiệu nào không',
  'Chuyển nhà có cần xem tuổi không — cổ pháp nói gì',
  'Ở nhà thuê mãi không mua nổi nhà — cung Điền Trạch nói gì',
  'Người hướng nội có thiệt thòi trên đường công danh không',
  'Vì sao có người cả đời không dám liều một lần',
  'Người hay cả nể — đó là phúc hay là hoạ theo lá số',
  'Năm tuổi có thật sự xấu như người ta vẫn nói không',
  'Xui liên tiếp một năm thì bao giờ mới hết — nhìn theo đại vận',
  'Vì sao có người càng về già càng sướng, có người ngược lại',
  'Đầu năm xem thấy hạn xấu — nên làm gì cho đúng',
  'Lá số nam và lá số nữ đọc khác nhau ở chỗ nào',
  'Không nhớ chính xác giờ sinh thì lá số còn dùng được không',
];

/**
 * Khung TÂM LÝ/XÃ HỘI cho bề mặt /khao-luan-tamly.
 *
 * Đây là danh sách chủ đề DUY NHẤT của bề mặt này — cố ý KHÔNG cho GSC/Suggest
 * góp vào (xem ghi chú tại `SURFACES['khao-luan-tamly'].intent`): đo trực tiếp
 * `keyword_ideas` lúc viết mục này ra 0 cụm khớp mẫu tâm lý (ghen/cô đơn/áp
 * lực/lo âu/mất ngủ/tự ti/xung đột/mẹ chồng nàng dâu/bỏ rơi...) — bộ gốc của
 * `keyword-suggest.ts` toàn thuật ngữ tử vi (kim lâu, bát tự, ngày tốt...), chưa
 * hề gieo hạt sang miền này. Nguồn cầu ở đây là AGGREGATE, không phải từng cụm:
 * `tinh-cach` đang là danh mục LỚN NHẤT trong `khao_luan` (75 bài, hơn hẳn mọi
 * danh mục khác), còn `quan-he` (11) và `benh-tat` (7) là hai danh mục MỎNG
 * NHẤT — tức có cầu đã chứng minh nhưng đang thiếu cung, không phải chưa ai hỏi.
 *
 * Mỗi mục là một CHỦ ĐỀ RỘNG (không phải một câu hỏi đơn) — `cron-khao-luan-
 * tamly` nở nó thành 3–5 bài Vấn Đáp góc khác nhau, mỗi góc neo vào một
 * cung/sao riêng lấy từ RAG. Viết theo TRẢI NGHIỆM đời thường có thể quan sát
 * được, KHÔNG viết theo tên bệnh/hội chứng — đó là việc của luật an toàn ở
 * tầng viết (`app/api/cron-khao-luan-tamly/route.ts`), danh sách này chỉ nêu
 * CHỦ ĐỀ, không nêu chẩn đoán.
 */
const TAMLY_THEMES = [
  // Tính cách
  'Người hướng nội hay bị hiểu lầm là lạnh lùng, khó gần',
  'Người luôn ôm hết việc vào mình, không dám nhờ ai giúp',
  'Người hay tự trách bản thân dù không phải lỗi của mình',
  'Người sợ làm phật lòng người khác nên hay nhịn',
  'Người ngoài mặt mạnh mẽ, trong lòng dễ tổn thương',
  'Người khó mở lòng, quen giữ cảm xúc cho riêng mình',
  'Người luôn phải tỏ ra ổn trước mặt người khác',
  // Quan hệ
  'Ghen tuông trong tình yêu — ranh giới giữa quan tâm và kiểm soát',
  'Xung đột mẹ chồng nàng dâu — vì sao khó hoà giải',
  'Sợ bị bỏ rơi trong một mối quan hệ',
  'Áp lực làm con cả — được kỳ vọng nhiều, ít ai hỏi có mệt không',
  'Anh em ruột thịt xa cách nhau vì chuyện tiền bạc',
  'Bạn bè thân thiết rồi dần xa nhau không rõ vì sao',
  'Cảm giác cô đơn dù xung quanh có nhiều người',
  'Yêu một người luôn phải đoán ý, không nói thẳng được với nhau',
  'Cha mẹ và con cái nói chuyện với nhau như hai người xa lạ',
  'Bị người thân so sánh với anh chị em từ nhỏ tới lớn',
  // Sức khoẻ tinh thần (đời thường — KHÔNG gọi tên bệnh)
  'Mất ngủ, lo âu kéo dài không rõ nguyên nhân',
  'Áp lực đồng trang lứa — nhìn người khác rồi tự ti về chính mình',
  'Cảm giác kiệt sức dù không làm gì nặng nhọc',
  'Tâm trạng lên xuống thất thường không kiểm soát được',
  'Sợ hãi mơ hồ không gọi tên được là sợ điều gì',
  'Cảm giác mất phương hướng sau một biến cố lớn trong đời',
];

interface Spoke {
  /** Khung câu, `{x}` thay bằng thực thể, `{year}` thay bằng năm. */
  pattern: string;
  entities: string[];
  /** Tháng dương lịch mà cầu lên đỉnh. Rỗng = quanh năm. */
  peakMonths?: number[];
  surface: Surface;
}

const SEASONAL_SPOKES: Spoke[] = [
  // Quanh năm — cầu đã thấy trên GSC (hạng 82–88).
  { pattern: 'Tử vi tuổi {x} — vận trình trọn đời', entities: CAN_CHI, surface: 'khao-luan' },
  { pattern: 'Sao {x} tọa thủ cung Mệnh nói lên điều gì', entities: CHINH_TINH, surface: 'khao-luan' },
  { pattern: 'Cung {x} trong lá số Tử Vi luận thế nào', entities: CUNG, surface: 'khao-luan' },

  // Đầu năm (T11–T2 dương): mùa cao điểm nhất của toàn ngành.
  { pattern: 'Tuổi {x} năm {year} — vận hạn và những điều cần lưu ý', entities: CAN_CHI,
    peakMonths: [11, 12, 1, 2], surface: 'khao-luan' },
  { pattern: 'Tuổi nào phạm Thái Tuế năm {year}', entities: [''], peakMonths: [11, 12, 1, 2], surface: 'khao-luan' },
  { pattern: 'Tuổi nào phạm Tam Tai năm {year}', entities: [''], peakMonths: [11, 12, 1, 2], surface: 'khao-luan' },
  { pattern: 'Tuổi {x} có hợp xông nhà đầu năm {year} không', entities: CAN_CHI,
    peakMonths: [12, 1, 2], surface: 'khao-luan' },

  // Mùa cưới hỏi & động thổ (T2–T5 và T8–T10).
  { pattern: 'Tuổi {x} làm nhà năm {year} có phạm Kim Lâu không', entities: CAN_CHI,
    peakMonths: [2, 3, 4, 5, 8, 9, 10], surface: 'khao-luan' },
  { pattern: 'Cách tính Kim Lâu khi làm nhà và cách hoá giải', entities: [''],
    peakMonths: [2, 3, 4, 5, 8, 9, 10], surface: 'khao-luan' },
  { pattern: 'Tuổi {x} cưới năm {year} có được không', entities: CAN_CHI,
    peakMonths: [2, 3, 4, 9, 10, 11], surface: 'khao-luan' },

  { pattern: 'Tuổi {x} có phải hạn lớn về tiền bạc không', entities: ['30', '35', '41', '49', '53'],
    surface: 'khao-luan' },

  // Bề mặt /nghien-cuu ăn TOÀN BỘ từ LIFE_QUESTIONS bên dưới.
  { pattern: '{x}', entities: LIFE_QUESTIONS, surface: 'nghien-cuu' },

  // Bề mặt /khao-luan-tamly ăn TOÀN BỘ từ TAMLY_THEMES — nguồn DUY NHẤT của
  // nó (xem ghi chú tại khai báo TAMLY_THEMES).
  { pattern: '{x}', entities: TAMLY_THEMES, surface: 'khao-luan-tamly' },
];

// ── Kiểu dữ liệu ──────────────────────────────────────────────────────────────

/** Một cụm từ khoá kèm XUẤT XỨ — xuất xứ là thứ phân biệt file này với bịa. */
interface DemandItem {
  keyword: string;
  source: 'gsc' | 'suggest' | 'seasonal';
  /** Hạng hiện tại trên GSC, nếu có. Càng gần 20 càng dễ đẩy lên. */
  position?: number;
  surfaceHint?: Surface;
}

/**
 * Một dòng ghi xuống `topic_queue`. `master_id` để tuỳ chọn vì bề mặt khảo luận
 * không có thầy — nhưng bề mặt nghiên cứu thì BẮT BUỘC (`cron-master-write`
 * ghi thẳng lỗi khi tra không ra thầy), nên có bước lọc trước lúc ghi.
 */
interface QueueRow {
  topic: string;
  type: string;
  master_id?: string;
  article_type: string;
  priority: number;
  status: string;
}

export interface TopupResult {
  skipped?: boolean;
  inserted: number;
  bySurface: Record<string, number>;
  sources: Record<string, number>;
  /** Số cụm bị loại vì trùng bài đã có. */
  deduped: number;
  note?: string;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function sb(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    // `no-store` bắt buộc: Next bọc fetch toàn cục và nhớ kết quả kể cả trong
    // route động — đọc tiêu đề bài cũ qua cache thì lượt chống trùng nhìn vào
    // ảnh chụp cũ rồi nạp lại đúng chủ đề vừa viết tuần trước.
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

// ── Chống trùng ───────────────────────────────────────────────────────────────

/** Bỏ dấu + hạ chữ thường + bỏ hư từ, để so hai tiêu đề theo Ý chứ theo chữ. */
const STOP_WORDS = new Set([
  'la', 'gi', 'the', 'nao', 'co', 'khong', 'va', 'cua', 'trong', 'cho', 'voi',
  'nhung', 'nhu', 'mot', 'nguoi', 'khi', 've', 'thi', 'ra', 'sao', 'bi', 'duoc',
]);

function tokenize(s: string): Set<string> {
  const flat = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ');
  return new Set(flat.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w)));
}

/**
 * Hệ số trùng lặp (Szymkiewicz–Simpson): |giao| / |tập nhỏ hơn|.
 *
 * CỐ Ý không dùng Jaccard: tiêu đề mới thường ngắn hơn hẳn tiêu đề bài cũ, mà
 * Jaccard chia cho hợp nên hai câu cùng nghĩa khác độ dài vẫn ra điểm thấp —
 * tức lọt lưới đúng ca cần chặn nhất.
 */
function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / Math.min(a.size, b.size);
}

const DUP_THRESHOLD = 0.7;

/**
 * Từ vựng THỰC THỂ — thứ phân biệt hai trang nhắm hai truy vấn khác nhau.
 *
 * 🐞 Bắt được khi chạy test, không phải khi đọc code: chỉ so tỉ lệ trùng token
 * thôi thì "Tử vi tuổi Giáp Tý" và "Tử vi tuổi Ất Sửu" trùng 7/9 = 0,78 → bị
 * coi là một, và toàn bộ chiến lược nhân theo thực thể chết sạch (đo được:
 * 60 chủ đề can chi rơi xuống còn 3 dòng ghi được).
 *
 * Nhưng ngưỡng trùng vẫn PHẢI giữ, vì nó là thứ chặn "Kim Lâu là gì" đấu với
 * "Kim Lâu là gì và cách tính" — đúng lỗi tự-cạnh-tranh mà #358 vừa phải đi gộp.
 *
 * Nên luật là: trùng nhiều token thì nghi ngờ, NHƯNG nếu phần KHÁC NHAU giữa
 * hai tiêu đề có chứa một thực thể (can chi, chính tinh, tên cung, con số/năm)
 * thì đó là hai trang khác nhau. Chỗ khác nhau mới quyết định, không phải chỗ
 * giống nhau.
 */
const ENTITY_TOKENS = new Set<string>();
for (const list of [CAN_CHI, CHINH_TINH, CUNG]) {
  for (const e of list) for (const t of tokenize(e)) ENTITY_TOKENS.add(t);
}

function isEntityToken(t: string): boolean {
  return ENTITY_TOKENS.has(t) || /^\d+$/.test(t);
}

/** Phần khác nhau giữa hai tiêu đề có chứa thực thể nào không. */
function differsByEntity(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (!b.has(t) && isEntityToken(t)) return true;
  for (const t of b) if (!a.has(t) && isEntityToken(t)) return true;
  return false;
}

/**
 * Gom tiêu đề của MỌI bài đã có + mọi chủ đề còn trong hàng đợi.
 *
 * Bước này không phải để cho gọn. #358 vừa đo được trên chính site này: hai họ
 * URL cùng chủ đề "vận hạn tuổi X năm Y" tồn tại song song, 180 trang trùng,
 * kết quả là KHÔNG bản nào lên hạng. Tự cạnh tranh với chính mình còn tệ hơn
 * là không viết.
 */
async function loadExistingTitles(): Promise<Set<string>[]> {
  const [ma, kl, tq] = await Promise.all([
    sb('/master_articles?select=title&limit=2000'),
    sb('/khao_luan?select=title&limit=2000'),
    sb('/topic_queue?select=topic&status=in.(pending,processing)&limit=2000'),
  ]);
  const rows: string[] = [
    ...((ma.body as { title: string }[] | null) || []).map(r => r.title),
    ...((kl.body as { title: string }[] | null) || []).map(r => r.title),
    ...((tq.body as { topic: string }[] | null) || []).map(r => r.topic),
  ];
  return rows.filter(Boolean).map(tokenize);
}

function isDuplicate(candidate: string, existing: Set<string>[]): boolean {
  const t = tokenize(candidate);
  if (t.size < 2) return true; // quá ngắn để phân biệt → coi như trùng, bỏ
  return existing.some(e => overlap(t, e) >= DUP_THRESHOLD && !differsByEntity(t, e));
}

// ── Nguồn cầu ─────────────────────────────────────────────────────────────────

/**
 * Nguồn 1 — Search Console: truy vấn site ĐÃ hiện nhưng chưa lên.
 *
 * Cửa sổ hạng 20–100 là cố ý. Trên 100 thì Google chưa coi site liên quan, viết
 * thêm một bài cũng khó đổi. Dưới 20 thì site đã ở trang 1–2, vấn đề là chỗ
 * khác (tiêu đề, ý định) chứ không phải thiếu bài.
 */
async function fromGsc(): Promise<DemandItem[]> {
  const to = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
  const from = new Date(Date.now() - 93 * 86400_000).toISOString().slice(0, 10);
  const snap = await getSearchConsoleSnapshot(from, to).catch(() => null);
  if (!snap?.topQueries?.length) return [];
  return snap.topQueries
    .filter(q => q.position >= 20 && q.position <= 100 && q.key.length > 5)
    .map(q => ({ keyword: q.key, source: 'gsc' as const, position: q.position }));
}

/** Nguồn 2 — Google Suggest đã gom sẵn trong `keyword_ideas`. */
async function fromSuggest(limit: number): Promise<DemandItem[]> {
  const r = await sb(
    `/keyword_ideas?select=keyword,times_seen,best_position&order=times_seen.desc&limit=${limit}`,
  );
  if (!r.ok || !r.body?.length) return [];
  return (r.body as { keyword: string; best_position: number | null }[]).map(k => ({
    keyword: k.keyword,
    source: 'suggest' as const,
    position: k.best_position ?? undefined,
  }));
}

/**
 * Nguồn 3 — khung mùa vụ. Luôn trả về được, nên hàng đợi không bao giờ cạn.
 *
 * `offset` xoay theo SỐ TUẦN trong năm để tuần sau lấy thực thể khác tuần này —
 * không có nó thì mỗi lượt chạy lại đề xuất đúng 21 cái đầu danh sách, chống
 * trùng loại sạch, và job đứng im mà không ai biết vì sao.
 */
function fromSeasonal(now: Date, offset: number): DemandItem[] {
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  // Mùa cao điểm đầu năm phải viết TRƯỚC khi mùa tới, nên tháng 11–12 nói về
  // năm sau. Viết "tuổi nào phạm Thái Tuế 2026" vào tháng 12/2026 là ra đúng
  // lúc không ai còn tìm nữa.
  const targetYear = month >= 11 ? year + 1 : year;

  const active = SEASONAL_SPOKES.filter(s => !s.peakMonths || s.peakMonths.includes(month));
  // Khung ĐANG ĐÚNG MÙA xếp trước khung quanh năm: nó có cầu cao nhất và cầu đó
  // hết hạn, còn khung quanh năm thì tuần nào nạp cũng được.
  const ordered = [...active].sort((a, b) => (a.peakMonths ? 0 : 1) - (b.peakMonths ? 0 : 1));

  // 🐞 Duyệt VÒNG TRÒN chứ không vét cạn từng khung. Bản đầu vét cạn theo thứ
  // tự khai báo, mà 5 khung quanh năm đầu danh sách đã đẻ ra 112 cụm — nhiều
  // hơn trần gom — nên mấy khung mùa vụ ("tuổi nào phạm Thái Tuế 2027") KHÔNG
  // BAO GIỜ tới lượt. Test bắt được: tháng 11 mà không sinh nổi một chủ đề nào
  // cho năm sau.
  const out: DemandItem[] = [];
  const maxLen = ordered.reduce((m, s) => Math.max(m, s.entities.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const spoke of ordered) {
      if (i >= spoke.entities.length) continue;
      const e = spoke.entities[(i + offset) % spoke.entities.length];
      const kw = spoke.pattern
        .replace('{x}', e)
        .replace(/\{year\}/g, String(targetYear))
        .replace(/\s+/g, ' ')
        .trim();
      out.push({ keyword: kw, source: 'seasonal', surfaceHint: spoke.surface });
    }
  }
  return out;
}

// ── Đặt tên bài bằng LLM (CHỈ đặt tên) ────────────────────────────────────────

interface ShapedTopic {
  topic: string;
  surface: Surface;
}

/**
 * Biến cụm từ khoá thô thành tiêu đề bài đúng định dạng từng bề mặt.
 *
 * Model NHẬN danh sách cố định và phải bám vào đó — prompt cấm thêm chủ đề mới.
 * Đây là ranh giới quan trọng nhất của file: mất nó thì hệ thống quay về đúng
 * trạng thái sinh hàng loạt bài không ai tìm, chỉ khác là tự động hơn.
 */
async function shapeTopics(
  items: DemandItem[],
  target: Record<Surface, number>,
): Promise<ShapedTopic[]> {
  if (!items.length) return [];

  const list = items
    .map((it, i) => `${i + 1}. "${it.keyword}" [nguồn: ${it.source}${it.position ? `, hạng ${Math.round(it.position)}` : ''}${it.surfaceHint ? `, gợi ý bề mặt: ${it.surfaceHint}` : ''}]`)
    .join('\n');

  const system = `Bạn là biên tập viên nội dung của một trang Tử Vi Đẩu Số tiếng Việt.

Nhiệm vụ DUY NHẤT: đặt lại tên mỗi cụm từ khoá bên dưới thành một tiêu đề bài viết.

TUYỆT ĐỐI KHÔNG được nghĩ ra chủ đề mới ngoài danh sách. Mỗi tiêu đề bạn trả về
phải bám vào đúng một cụm trong danh sách.

Có ba bề mặt, chọn bề mặt phù hợp với Ý ĐỊNH TÌM KIẾM của cụm từ khoá:

[nghien-cuu] ${SURFACES['nghien-cuu'].brief}
  → ${SURFACES['nghien-cuu'].intent}

[khao-luan] ${SURFACES['khao-luan'].brief}
  → ${SURFACES['khao-luan'].intent}

[khao-luan-tamly] ${SURFACES['khao-luan-tamly'].brief}
  → ${SURFACES['khao-luan-tamly'].intent}
  ⚠️ RÀNG BUỘC CỨNG: CHỈ được gán [khao-luan-tamly] cho dòng có ghi ĐÚNG
  "gợi ý bề mặt: khao-luan-tamly" trong ngoặc vuông. Dòng có [nguồn: gsc] hoặc
  [nguồn: suggest] — KỂ CẢ khi nội dung nghe có vẻ liên quan tâm lý — TUYỆT
  ĐỐI KHÔNG được gán vào bề mặt này; chỉ chọn giữa [khao-luan]/[nghien-cuu]
  cho chúng.

LUẬT ĐẶT TIÊU ĐỀ:
- Giữ nguyên cụm từ khoá chính trong tiêu đề (đó là thứ người ta gõ).
- 45–75 ký tự. Tiếng Việt có dấu.
- Không giật tít, không hứa hẹn ("bí mật", "ít ai biết", "chấn động").
- Không nêu tên người thật, doanh nghiệp thật, sự kiện thời sự.
- Nếu cụm từ khoá có năm, giữ nguyên năm đó.

Trả JSON: {"topics":[{"topic":"...","surface":"nghien-cuu|khao-luan|khao-luan-tamly"}]}
Trả tối đa ${target['nghien-cuu']} tiêu đề [nghien-cuu], ${target['khao-luan']} tiêu đề
[khao-luan], và ${target['khao-luan-tamly']} tiêu đề [khao-luan-tamly].`;

  const raw = await llmText({
    system,
    prompt: `Danh sách cụm từ khoá:\n${list}`,
    maxTokens: 6000, // Nâng 50% (Henry chốt 2026-08-20)
    json: true,
    temperature: 0.4,
  });

  try {
    const parsed = JSON.parse(raw) as { topics?: ShapedTopic[] };
    return (parsed.topics || []).filter(
      t =>
        t?.topic &&
        (t.surface === 'nghien-cuu' || t.surface === 'khao-luan' || t.surface === 'khao-luan-tamly'),
    );
  } catch {
    return [];
  }
}

// ── Gán thầy cho bài /nghien-cuu ──────────────────────────────────────────────

/**
 * Chọn thầy có ÍT bài nhất trước. `cron-master-write` bắt buộc phải có
 * `master_id` hợp lệ (không có thì lượt đó ghi thẳng lỗi), và để một thầy ôm
 * hết thì roster 15 người thành trang trí.
 */
async function pickMasters(count: number): Promise<string[]> {
  const [profiles, articles] = await Promise.all([
    sb('/master_profiles?select=id'),
    sb('/master_articles?select=master_id&limit=2000'),
  ]);
  const ids = ((profiles.body as { id: string }[] | null) || []).map(p => p.id);
  if (!ids.length) return [];

  const tally = new Map<string, number>(ids.map(id => [id, 0]));
  for (const a of ((articles.body as { master_id: string }[] | null) || [])) {
    if (tally.has(a.master_id)) tally.set(a.master_id, (tally.get(a.master_id) || 0) + 1);
  }
  const ranked = [...tally.entries()].sort((x, y) => x[1] - y[1]).map(e => e[0]);
  return Array.from({ length: count }, (_, i) => ranked[i % ranked.length]);
}

// ── Điểm vào ──────────────────────────────────────────────────────────────────

export async function runTopicTopup(
  opts: { perSurface?: number; dryRun?: boolean; now?: Date } = {},
): Promise<TopupResult> {
  // `opts.perSurface` là mức ÉP CHUNG cho cả ba bề mặt (dùng cho test và cho
  // tham số `?per=` khi chạy tay). Không truyền thì mỗi bề mặt lấy mức riêng
  // theo nhịp cron của nó.
  const target: Record<Surface, number> = opts.perSurface
    ? { 'nghien-cuu': opts.perSurface, 'khao-luan': opts.perSurface, 'khao-luan-tamly': opts.perSurface }
    : { ...PER_WEEK };
  const now = opts.now ?? new Date();
  const empty: TopupResult = { inserted: 0, bySurface: {}, sources: {}, deduped: 0 };

  // Gom cầu. GSC và Suggest có thể rỗng (chưa cấu hình / cron chưa chạy) —
  // mùa vụ luôn trả về được nên lượt chạy không bao giờ trắng tay.
  const weekIndex = Math.floor(now.getTime() / (7 * 86400_000));
  const [gsc, suggest] = await Promise.all([
    fromGsc().catch(() => [] as DemandItem[]),
    fromSuggest(120).catch(() => [] as DemandItem[]),
  ]);
  const seasonal = fromSeasonal(now, weekIndex);

  // Thứ tự nối = thứ tự ưu tiên: cầu đã chứng minh đứng trước cầu suy ra.
  const pool = [...gsc, ...suggest, ...seasonal];
  if (!pool.length) return { ...empty, note: 'không gom được cụm từ khoá nào' };

  const existing = await loadExistingTitles();

  const seen = new Set<string>();
  const fresh: DemandItem[] = [];
  let deduped = 0;
  for (const it of pool) {
    const k = it.keyword.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    if (isDuplicate(it.keyword, existing)) { deduped++; continue; }
    fresh.push(it);
    // Trần gom là CHUNG cho cả ba bề mặt, mà số khung mỗi bên không cân: hiện
    // có 6 khung khảo luận đấu 1 khung nghiên cứu đấu 1 khung tâm lý. Trần
    // chật thì bên ít khung bị lấn, không đủ chỉ tiêu (đo được: trần ×4 chỉ ra
    // 18/21 bài nghiên cứu). ×4 TỔNG chỉ tiêu cho cả ba bên đủ chỗ; danh sách
    // vẫn chỉ là chuỗi ngắn nên prompt không phình đáng kể.
    if (fresh.length >= (target['nghien-cuu'] + target['khao-luan'] + target['khao-luan-tamly']) * 4) break;
  }
  if (!fresh.length) {
    return { ...empty, deduped, note: 'mọi cụm gom được đều trùng bài đã có' };
  }

  const shaped = await shapeTopics(fresh, target);
  if (!shaped.length) return { ...empty, deduped, note: 'LLM không trả được tiêu đề nào' };

  // Chống trùng LẦN HAI trên chính tiêu đề model vừa đặt: hai cụm khác nhau
  // ("kim lâu là gì" / "cách tính kim lâu") rất dễ bị đặt tên về cùng một câu.
  const picked: Record<Surface, string[]> = { 'nghien-cuu': [], 'khao-luan': [], 'khao-luan-tamly': [] };
  const running = [...existing];
  for (const s of shaped) {
    if (picked[s.surface].length >= target[s.surface]) continue;
    if (isDuplicate(s.topic, running)) { deduped++; continue; }
    running.push(tokenize(s.topic));
    picked[s.surface].push(s.topic.trim());
  }

  const nghienCuu = picked['nghien-cuu'];
  const khaoLuan = picked['khao-luan'];
  const khaoLuanTamly = picked['khao-luan-tamly'];
  const sources: Record<string, number> = {};
  for (const it of fresh) sources[it.source] = (sources[it.source] || 0) + 1;

  if (opts.dryRun) {
    return {
      inserted: 0,
      bySurface: {
        'nghien-cuu': nghienCuu.length,
        'khao-luan': khaoLuan.length,
        'khao-luan-tamly': khaoLuanTamly.length,
      },
      sources,
      deduped,
      note: 'dry-run — không ghi gì',
    };
  }

  const masters = await pickMasters(nghienCuu.length);
  const drafted: QueueRow[] = [
    ...nghienCuu.map((topic, i) => ({
      topic,
      type: SURFACES['nghien-cuu'].queueType,
      master_id: masters[i],
      article_type: 'hoc-thuat',
      priority: 3, // thấp hơn 5 mặc định → chủ đề có cầu được viết TRƯỚC tồn kho cũ
      status: 'pending',
    })),
    ...khaoLuan.map(topic => ({
      topic,
      type: SURFACES['khao-luan'].queueType,
      article_type: 'hoc-thuat',
      priority: 3,
      status: 'pending',
    })),
    ...khaoLuanTamly.map(topic => ({
      topic,
      type: SURFACES['khao-luan-tamly'].queueType,
      article_type: 'hoc-thuat',
      priority: 3,
      status: 'pending',
    })),
  ];
  // Roster thầy rỗng → `masters` rỗng → dòng nghiên cứu không có `master_id`.
  // Ghi xuống thì `cron-master-write` chỉ chốt lỗi ở lượt sau, nên chặn ở đây.
  const rows = drafted.filter(r => r.type !== 'master-article' || r.master_id);

  if (!rows.length) return { ...empty, deduped, note: 'không còn dòng nào để ghi' };

  const ins = await sb('/topic_queue', { method: 'POST', body: JSON.stringify(rows) });
  if (!ins.ok) throw new Error(`Ghi topic_queue hỏng: ${ins.status} ${JSON.stringify(ins.body)}`);

  return {
    inserted: rows.length,
    bySurface: {
      'nghien-cuu': nghienCuu.length,
      'khao-luan': khaoLuan.length,
      'khao-luan-tamly': khaoLuanTamly.length,
    },
    sources,
    deduped,
  };
}
