// lib/video/sources/tool-demo.ts
// ============================================================
// ADAPTER NGUỒN: clip demo một công cụ trên site.
//
// Đây là loại clip đầu tiên. Thêm loại mới (vấn đáp, khảo luận, lá số…) nghĩa
// là thêm một file cạnh file này trả về cùng `ScriptSpec` — cổng kiểm và khâu
// dựng không phải biết loại nào đang chạy.
//
// 🔑 KỊCH BẢN VIẾT TAY, KHÔNG nhờ LLM sinh từ đầu. Lý do: chỉ có 18 công cụ
// miễn phí, viết một lần dùng mãi; còn nhờ model sinh mỗi lượt thì hai lần
// chạy ra hai kịch bản khác nhau và không ai soát được trước khi tốn tiền
// render. LLM ở đây chỉ làm một việc: SỬA khi cổng bắt lỗi (xem `viral-loop`).
//
// 🔑 NHỊP DỒN, KHÔNG LỮNG LỜ. Bản dựng đầu có 3 cảnh dài ~6 giây mỗi cảnh và
// nghe buồn ngủ — trên TikTok đó là clip chết. Luật rút ra, áp cho mọi kịch
// bản sau: **mỗi cảnh MỘT ý, dưới ~4 giây, câu ngắn**. Thà 6 cảnh ngắn còn
// hơn 3 cảnh dài; đổi hình thường xuyên là thứ giữ ngón tay người xem lại.
// ============================================================

import type { ScriptSpec } from '../script-spec';

/** Một công cụ + kịch bản clip của nó. */
export interface ToolDemoSource {
  toolId: string;
  /** Nhãn hiện trên dải thương hiệu ở đỉnh clip. */
  label: string;
  /** Tên file clip quay màn hình trong `remotion/public/recordings/`. */
  recording: string;
  /**
   * TỪ KHOÁ của công cụ — thứ người xem thật sự muốn biết về CHÍNH MÌNH.
   *
   * Dùng dựng câu kết: *"Tìm hiểu ngay <từ khoá> của chính bạn."* Đây là chỗ
   * câu kết ăn tiền: nói đúng cái người ta tò mò, không phải nói về công cụ.
   * ⛔ KHÔNG đặt từ khoá kiểu "công cụ tra cứu" hay "tính năng" — người xem
   * không quan tâm mình có công cụ gì, họ quan tâm điều gì đó về bản thân họ.
   */
  keyword: string;
  /** Câu hỏi đóng clip, trả lời được bằng một từ. Đẻ comment. */
  ctaQuestion: string;
  spec: Omit<ScriptSpec, 'sourceType' | 'sourceId'>;
}

/**
 * Dựng một mục từ khai báo gọn: mỗi dòng lời đọc = một cảnh, cảnh nào cũng
 * chiếu chính bản quay của công cụ đó.
 *
 * 🔑 VÌ SAO KHÔNG KHAI `startSec`: đó là mốc thời gian bên trong một file mà
 * người viết kịch bản CHƯA nhìn thấy. Khai tay 17 công cụ × 5 cảnh là 85 con
 * số đoán mò, và đoán sai thì hỏng IM LẶNG (vượt quá độ dài bản quay thì hình
 * đứng ở khung cuối, không lỗi nào bắn ra). `gen-video.mjs` tự rải theo độ dài
 * THẬT của file quay — xem `fillStartSec` ở đó.
 *
 * `than-so-hoc` giữ `startSec` khai tay vì đã hiệu chỉnh bằng mắt trên bản
 * quay thật; đường tự rải cố ý không đè lên cảnh đã khai.
 */
function demo(o: {
  toolId: string;
  label: string;
  keyword: string;
  ctaQuestion: string;
  hook: string;
  /** Mỗi dòng một cảnh. Giữ ~50–70 ký tự: dài hơn là cảnh chùng, ngắn hơn là hụt ý. */
  lines: string[];
  music: string;
  hashtags: string[];
}): ToolDemoSource {
  const recording = `recordings/${o.toolId}.webm`;
  return {
    toolId: o.toolId,
    label: o.label,
    recording,
    keyword: o.keyword,
    ctaQuestion: o.ctaQuestion,
    spec: {
      title: `Demo ${o.label}`,
      hook: o.hook,
      scenes: o.lines.map((text) => ({
        text,
        visual: { kind: 'screen', recording, label: '' },
      })),
      cta: '',
      music: o.music,
      hashtags: o.hashtags,
    },
  };
}

/**
 * 17 công cụ miễn phí còn lại.
 *
 * Mọi kịch bản dưới đây viết theo đúng bộ luật đã chốt cho kênh:
 *   STOP SCROLL → CURIOSITY → RETENTION → EMOTION → PAYOFF → SHARE
 * và luật riêng cho nội dung tử vi: **đừng giảng giải bộ môn** — trả lời
 * *"tôi là người thế nào / vì sao tôi lại vậy / chuyện gì sắp tới"*.
 *
 * ⚠️ HAI CÁI BẪY của cổng 1 phải nhớ khi sửa mấy dòng này:
 *  1. Động từ THAO TÁC (`gõ · bấm · nhập · điền · chọn · cuộn · truy cập`) bị
 *     chặn thẳng ở hook và NỬA ĐẦU số cảnh. Chữ **`chọn`** rất dễ lọt vào
 *     ("chọn ngày", "chọn hướng") — để nó xuống nửa sau nếu thật sự cần.
 *  2. Phải có **≥ 4 lần** nhắc tới người xem (`bạn · mình · tôi`) trong cả
 *     hook + cảnh + câu kết, nếu không cổng đọc thành "đang giảng bài".
 */
const BATCH: ToolDemoSource[] = [
  // ── Mệnh lý ─────────────────────────────────────────────────────────────
  demo({
    toolId: 'kim-lau',
    label: 'Kim Lâu & Tam Tai',
    keyword: 'tuổi làm nhà',
    ctaQuestion: 'Bạn tuổi gì?',
    hook: 'Định xây nhà năm nay? Có bốn tuổi ông bà dặn bạn nên hoãn.',
    lines: [
      'Kim Lâu không phải một con số xui. Nó là một chu kỳ chín năm.',
      'Rơi vào năm đó, người xưa khuyên đừng động thổ, đừng cưới hỏi.',
      'Bốn kiểu Kim Lâu, mỗi kiểu ứng với một người trong nhà bạn.',
      'Tam Tai thì khác: ba năm liền, và nó đi theo tuổi của bạn.',
      'Biết trước thì lùi vài tháng là xong. Không biết mới là cái giá.',
    ],
    music: 'cang-thang.wav',
    hashtags: ['kimlau', 'tamtai', 'lamnha', 'phongthuy'],
  }),

  demo({
    toolId: 'nap-am',
    label: 'Nạp Âm Ngũ Hành',
    keyword: 'mệnh nạp âm',
    ctaQuestion: 'Bạn mệnh gì?',
    hook: 'Bạn mệnh gì? Rất nhiều người trả lời sai câu này.',
    lines: [
      'Mệnh của bạn không phải con giáp. Nó là nạp âm của năm sinh.',
      'Sáu mươi năm mới lặp lại một lần. Mỗi cặp năm một mệnh riêng.',
      'Hai người cùng tuổi Ngọ vẫn có thể khác mệnh hoàn toàn.',
      'Mệnh quyết màu bạn hợp, hướng bạn nên ngồi, tuổi bạn dễ hợp.',
      'Nói sai mệnh một chữ là chọn sai màu suốt nhiều năm.',
    ],
    music: 'sang-sua.wav',
    hashtags: ['napam', 'nguhanh', 'menh', 'tuvi'],
  }),

  demo({
    toolId: 'bat-trach',
    label: 'Hướng Bát Trạch',
    keyword: 'hướng hợp mệnh',
    ctaQuestion: 'Bạn thuộc Đông hay Tây?',
    hook: 'Ngủ mãi không sâu? Có khi chỉ vì cái giường quay sai hướng.',
    lines: [
      'Mỗi người sinh ra ứng với một cung phi. Tám cung, chia hai nhóm.',
      'Đông tứ mệnh và Tây tứ mệnh. Bạn nằm ở một trong hai.',
      'Bốn hướng nuôi bạn, bốn hướng rút của bạn. Không ai đủ tám.',
      'Hướng cửa, hướng bếp, hướng đầu giường — ba chỗ ăn thua nhất.',
      'Xoay cái giường mất mười phút. Ở sai hướng thì mất nhiều năm.',
    ],
    music: 'cang-thang.wav',
    hashtags: ['battrach', 'phongthuy', 'huongnha', 'cungphi'],
  }),

  demo({
    toolId: 'ngu-hanh-ten',
    label: 'Ngũ Hành Tên',
    keyword: 'ngũ hành trong tên',
    ctaQuestion: 'Tên bạn mấy điểm?',
    hook: 'Tên bạn được mấy điểm? Có tên hợp mệnh, có tên khắc mệnh.',
    lines: [
      'Mỗi chữ trong tên mang một hành: Kim, Mộc, Thủy, Hỏa, Thổ.',
      'Hành của tên đứng cạnh mệnh của bạn — hoặc nuôi, hoặc chọi.',
      'Tên hợp không làm bạn giàu. Nhưng tên khắc thì cấn cả đời.',
      'Chấm trên thang một trăm: chữ chính, cân bằng, chữ bồi mệnh.',
      'Điểm thấp không có nghĩa tên xấu. Cha mẹ đặt bằng cả tấm lòng.',
    ],
    music: 'sang-sua.wav',
    hashtags: ['nguhanh', 'ynghiaten', 'dattencon', 'menh'],
  }),

  demo({
    toolId: 'tuong-hop',
    label: 'Tương Hợp Tuổi',
    keyword: 'độ hợp hai người',
    ctaQuestion: 'Hai bạn mấy điểm?',
    hook: 'Hai người hợp nhau tới đâu? Nhìn mỗi con giáp là thiếu.',
    lines: [
      'Tuổi chỉ là một lớp. Mệnh, cung và tính khí của bạn nặng hơn.',
      'Có cặp xung tuổi mà sống êm. Có cặp hợp tuổi mà cãi mỗi ngày.',
      'Tám tiêu chí chấm riêng: tiền bạc, con cái, tư tưởng, tính cách.',
      'Cộng lại trên thang một trăm, bạn thấy chỗ nào đang lệch.',
      'Biết lệch ở đâu thì còn chữa. Đó mới là thứ bạn cầm về.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['xemtuoi', 'tuonghop', 'vochong', 'tuvi'],
  }),

  // ── Lịch số ─────────────────────────────────────────────────────────────
  demo({
    toolId: 'hoang-dao',
    label: 'Giờ Hoàng Đạo',
    keyword: 'giờ hoàng đạo',
    ctaQuestion: 'Bạn thuộc kiểu xem giờ?',
    hook: 'Cùng một việc, làm giờ này thì trôi, giờ kia thì tắc?',
    lines: [
      'Mỗi ngày của bạn chỉ có sáu khung giờ được coi là hoàng đạo.',
      'Sáu khung còn lại là hắc đạo — người xưa tránh việc trọng đại.',
      'Khung giờ đổi theo từng ngày, không có giờ tốt cố định cho bạn.',
      'Ký hợp đồng, khai trương, xuất hành đều canh đúng mấy giờ đó.',
      'Bạn không mê tín cũng chẳng mất gì. Nó là một lát cắt thời gian.',
    ],
    music: 'sang-sua.wav',
    hashtags: ['giohoangdao', 'ngaytot', 'lichviet', 'xuathanh'],
  }),

  demo({
    toolId: 'ngay-tot',
    label: 'Ngày Tốt Trong Tháng',
    keyword: 'ngày tốt tháng này',
    ctaQuestion: 'Bạn thuộc kiểu xem ngày?',
    hook: 'Tháng này ngày nào nên khởi sự, ngày nào nên nằm im?',
    lines: [
      'Mỗi ngày mang một trực, một sao, một hướng nghiêng riêng.',
      'Có ngày hợp mở hàng. Có ngày chỉ hợp việc nhỏ trong nhà bạn.',
      'Tam Nương, Nguyệt Kỵ — mấy ngày ông bà dặn đừng khởi sự.',
      'Cả tháng hiện thành một bảng, ngày xanh ngày đỏ rõ trước mắt bạn.',
      'Không phải để sợ. Để bạn xếp việc lớn vào đúng chỗ trống.',
    ],
    music: 'sang-sua.wav',
    hashtags: ['ngaytot', 'xemngay', 'lichviet', 'khaitruong'],
  }),

  demo({
    toolId: 'luc-nham',
    label: 'Lục Nhâm Giản',
    keyword: 'quẻ Lục Nhâm',
    ctaQuestion: 'Bạn đang phân vân chuyện gì?',
    hook: 'Đang phân vân một chuyện? Cổ nhân có cách hỏi rất nhanh.',
    lines: [
      'Lục Nhâm chỉ cần ngày giờ. Không cần lá số, không cần tên bạn.',
      'Sáu thần tướng quay vòng, dừng ở đâu thì đọc điềm ở đó.',
      'Đại An là yên. Lưu Liên là chậm. Tốc Hỷ là tin vui tới sớm.',
      'Không phán chuyện cả đời. Nó trả lời đúng việc bạn đang hỏi.',
      'Một phút, một quẻ. Đủ để bạn bớt đi lại trong đầu.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['lucnham', 'boiquex', 'huyenhoc', 'coihoc'],
  }),

  // ── Huyền học: gieo quẻ ─────────────────────────────────────────────────
  demo({
    toolId: 'kinh-dich',
    label: 'Kinh Dịch 64 Quẻ',
    keyword: 'quẻ Kinh Dịch',
    ctaQuestion: 'Bạn muốn hỏi quẻ chuyện gì?',
    hook: 'Ba đồng xu, sáu lần gieo. Bạn muốn hỏi điều gì?',
    lines: [
      'Mỗi lần gieo ra một hào. Sáu hào chồng lên thành một quẻ.',
      'Sáu mươi tư quẻ, mỗi quẻ là một tình thế bạn đang đứng.',
      'Quẻ không nói bạn sẽ được gì. Nó nói bạn nên xử thế nào.',
      'Có hào động thì quẻ biến — tình thế của bạn đang chuyển.',
      'Đọc xong thấy nhẹ đầu, vì nó gọi tên đúng chỗ bạn đang kẹt.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['kinhdich', 'gieoque', 'chudich', 'huyenhoc'],
  }),

  demo({
    toolId: 'mai-hoa',
    label: 'Mai Hoa Dịch Số',
    keyword: 'quẻ Mai Hoa',
    ctaQuestion: 'Bạn nghĩ ra số mấy?',
    hook: 'Nghĩ đại một con số — bạn nghĩ ra số mấy?',
    lines: [
      'Mai Hoa lập quẻ từ con số bạn vừa nghĩ, hoặc từ chính giờ này.',
      'Quẻ chia hai phần: Thể là bạn, Dụng là chuyện đang tới.',
      'Dụng sinh Thể là ngoại cảnh nuôi bạn. Ngược lại là bạn đang hao.',
      'Người mới học hay đọc ngược đúng chỗ này.',
      'Một hào động thôi, nhưng nó chỉ thẳng chỗ nên buông.',
    ],
    music: 'don-dap.wav',
    hashtags: ['maihoadichso', 'gieoque', 'kinhdich', 'huyenhoc'],
  }),

  demo({
    toolId: 'ky-mon',
    label: 'Kỳ Môn Độn Giáp',
    keyword: 'hướng xuất hành',
    ctaQuestion: 'Bạn hay đi hướng nào?',
    hook: 'Sắp đi gặp người quan trọng? Hướng đi cũng có phần của nó.',
    lines: [
      'Kỳ Môn chia không gian thành chín cung quanh chỗ bạn đứng.',
      'Mỗi cung một cửa, một sao, một thần — đổi theo từng giờ.',
      'Có cung mở đường cho bạn. Có cung chỉ tổ mất công.',
      'Người xưa dùng nó chọn hướng ra quân, nay để đi gặp đối tác.',
      'Không đổi được kết quả. Nhưng đổi được thế bạn bước vào.',
    ],
    music: 'cang-thang.wav',
    hashtags: ['kymondongiap', 'xuathanh', 'huyenhoc', 'phongthuy'],
  }),

  // ── Rút bài ─────────────────────────────────────────────────────────────
  demo({
    toolId: 'tarot',
    label: 'Tarot 78 Lá',
    keyword: 'lá bài của bạn',
    ctaQuestion: 'Bạn rút được lá gì?',
    hook: 'Rút một lá bài. Nó không đoán tương lai như bạn tưởng.',
    lines: [
      'Bảy mươi tám lá, mỗi lá là một trạng thái người ta hay rơi vào.',
      'Lá bài không quyết chuyện gì. Nó gọi tên thứ bạn đã biết.',
      'Cái khó không phải rút trúng lá nào. Là dám đọc thẳng nó.',
      'Quá khứ, hiện tại, tương lai — ba lá đủ thấy bạn đang ở khúc nào.',
      'Người ta thấy đúng, vì nó nói về chỗ bạn vẫn né.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['tarot', 'boibai', 'tarotvietnam', 'ruttarot'],
  }),

  demo({
    toolId: 'oracle',
    label: 'Oracle Phương Đông',
    keyword: 'thông điệp hôm nay',
    ctaQuestion: 'Bạn nhận được lời nào?',
    hook: 'Có hôm bạn chỉ cần một câu để gỡ cả buổi tối?',
    lines: [
      'Oracle không có luật cứng như Tarot. Nó ngắn và thẳng hơn.',
      'Mỗi lá một thông điệp — đọc xong là biết mình nên làm gì.',
      'Không phán bạn giàu nghèo, không hẹn ngày hẹn tháng.',
      'Nó chỉ hỏi ngược lại: điều gì bạn đang cố lờ đi?',
      'Nhiều người rút xong ngồi im mất một lúc.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['oracle', 'boibai', 'thongdiep', 'chualanh'],
  }),

  demo({
    toolId: 'boi-bai-tay',
    label: 'Bói Bài Tây',
    keyword: 'lá bài tháng này',
    ctaQuestion: 'Bạn rút được chất gì?',
    hook: '52 lá bài ai cũng có trong nhà. Ít ai biết nó xem được vận.',
    lines: [
      'Bốn chất: Cơ tình cảm, Rô tiền bạc, Chuồn công việc, Bích trở ngại.',
      'Lá bạn rút ra nói bạn đang nặng phần nào nhất.',
      'Không phải bói cả đời. Chỉ là một lát cắt của tháng này.',
      'Ba lá là thấy: chuyện gì tới, chuyện gì qua, chuyện gì bạn giữ.',
      'Đọc xong nhiều người mới nhận ra mình đang lo nhầm chỗ.',
    ],
    music: 'don-dap.wav',
    hashtags: ['boibaitay', 'boibai', 'xemboi', 'tuvi'],
  }),

  // ── Lá số & bản đồ sao ──────────────────────────────────────────────────
  demo({
    toolId: 'xem-tuoi-sinh-con',
    label: 'Xem Tuổi Sinh Con',
    keyword: 'năm sinh con hợp tuổi',
    ctaQuestion: 'Bạn định năm nào?',
    hook: 'Định sinh con năm tới? Có năm hợp cả nhà, có năm nghịch.',
    lines: [
      'Người xưa xem tuổi đứa con theo tuổi của cả bố lẫn mẹ.',
      'Có năm con hợp mẹ mà nghịch bố. Có năm hợp cả hai bạn.',
      'Còn Kim Lâu, Tam Tai của bạn nữa — hai thứ đó cũng chen vào.',
      'Mười lăm năm tới, mỗi năm một điểm, xếp từ cao xuống thấp.',
      'Không phải để ép. Chỉ để bạn biết mình đang đứng ở đâu.',
    ],
    music: 'sang-sua.wav',
    hashtags: ['xemtuoisinhcon', 'sinhcon', 'kimlau', 'tuvi'],
  }),

  demo({
    toolId: 'ban-do-sao',
    label: 'Bản Đồ Sao Lúc Sinh',
    keyword: 'bản đồ sao lúc sinh',
    ctaQuestion: 'Bạn cung Mọc gì?',
    hook: 'Bạn tưởng cung hoàng đạo là tất cả? Nó mới là phần nhỏ.',
    lines: [
      'Lúc bạn sinh ra, cả bầu trời có một thế riêng, không lặp lại.',
      'Mặt Trời là cung ai cũng biết. Mặt Trăng mới là cảm xúc bạn.',
      'Cung Mọc là cái người khác thấy trước khi kịp hiểu bạn.',
      'Mười hai nhà, mỗi nhà một mảng đời: tiền, tình, nghề, gia đạo.',
      'Ba lớp chồng lên nhau mới ra một người, không phải một cái nhãn.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['chiemtinh', 'bandosao', 'cungmoc', 'natalchart'],
  }),

  demo({
    toolId: 'an-sao',
    label: 'An Sao Lá Số',
    keyword: 'lá số Tử Vi',
    ctaQuestion: 'Bạn cung Mệnh sao gì?',
    hook: 'Nhìn lá số Tử Vi ai cũng tưởng rối. Thật ra chỉ cần ba chỗ.',
    lines: [
      'Mười hai cung, mỗi cung một mảng đời của bạn.',
      'Cung Mệnh nói bạn là người thế nào, ngay từ gốc.',
      'Chính tinh đóng ở đó quyết phần lớn tính khí bạn mang theo.',
      'Rồi Thân, rồi đại vận — mười năm một chặng, không đều nhau.',
      'Nhìn được ba chỗ đó là đã hiểu bảy phần con người mình.',
    ],
    music: 'tram-tinh.wav',
    hashtags: ['tuvi', 'ansao', 'laso', 'tuvidauso'],
  }),
];

const SOURCES: ToolDemoSource[] = [
  {
    toolId: 'than-so-hoc',
    label: 'Thần Số Học',
    recording: 'recordings/than-so-hoc.webm',
    keyword: 'Số Đường Đời',
    // Câu hỏi đóng clip — phải trả lời được bằng MỘT TỪ ngay trong ô bình luận.
    // Hỏi khó hay hỏi mở là không ai buồn gõ.
    ctaQuestion: 'Bạn số mấy?',
    spec: {
      title: 'Demo Thần Số Học',
      // STOP SCROLL — mở bằng một lời TRÁCH mà người xem hay nghe về mình, rồi
      // lật nó lại. Không nhắc công cụ, không nhắc bộ môn.
      hook: 'Bạn hay bị chê là khó tính? Có thể đó không phải tính xấu.',
      scenes: [
        {
          // CURIOSITY — hé lộ có một cách phân loại, chưa nói bạn thuộc loại nào.
          text: 'Ngày sinh của bạn rút lại thành một con số. Từ một đến chín.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 3,
            label: '',
          },
        },
        {
          // RETENTION — nâng mức cược: con số này giải thích HÀNH VI của bạn.
          text: 'Chín con số. Chín kiểu người. Và kiểu của bạn giải thích vì sao bạn hành xử như vậy.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 7,
            label: '',
          },
        },
        {
          // REVEAL — một ví dụ CỤ THỂ, đọc lên nghe như lời khen.
          text: 'Ví dụ số bốn: kỷ luật, đáng tin, xây mọi thứ từng bước một.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 10,
            label: '',
          },
        },
        {
          // TWIST — lật mặt sau. Đây là chỗ tạo cảm giác "đúng mình".
          text: 'Nhưng đổi lại: cứng nhắc. Mọi thứ đảo lộn một cái là bạn mất phương hướng.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 12,
            label: '',
          },
        },
        {
          // PAYOFF — đóng lại đúng lời hứa ở hook, và đóng theo hướng bênh
          // người xem. Đây là câu người ta muốn gửi cho bạn bè.
          text: 'Người ngoài gọi đó là khó tính. Thật ra đó là cách bạn giữ mình an toàn.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 14,
            label: '',
          },
        },
      ],
      // Dựng từ `keyword` — xem `buildToolDemoSpec`.
      cta: '',
      music: 'don-dap.wav',
      hashtags: ['thansohoc', 'duongdoi', 'tuvi', 'xemboi'],
    },
  },
  ...BATCH,
];

/** Mã khuyến mãi in trên mọi clip — phải khớp `promo_codes.code` dưới DB. */
export const PROMO_CODE = 'TUVIMINHBAO';
/** Số Lượng mã đó tặng. Chỉ để HIỂN THỊ; con số thật do DB quyết. */
export const PROMO_CREDITS = 100;

/**
 * Câu kết dùng CHUNG cho mọi clip demo, chỉ thay từ khoá.
 *
 * Đi qua BA lần sửa, ghi lại cả ba vì mỗi lần hỏng một kiểu:
 *  1. *"Tra thử miễn phí, không cần đăng ký."* — nói về THỦ TỤC, trong khi thứ
 *     kéo người ta bấm là điều họ sắp biết về CHÍNH MÌNH.
 *  2. *"Tìm hiểu ngay <từ khoá> của chính bạn."* — đúng hướng nhưng vẫn chỉ
 *     là một lời mời bấm. Nó không đẻ ra comment hay share, mà comment/share
 *     mới là tín hiệu xếp hạng mạnh nhất.
 *  3. Bản có câu hỏi + comment nhưng KHÔNG nói tên miền: người xem thích clip
 *     xong không biết gõ đâu để tra. Clip trôi khỏi feed là mất luôn đường về.
 *
 * Bản hiện tại có đủ ba việc, xếp theo thứ tự rơi rụng: câu HỎI trước (trả lời
 * được ngay trong ô bình luận, không phải rời app), rồi TÊN MIỀN, rồi MÃ.
 *
 * ⚠️ Câu này CỐ Ý vượt ngưỡng cảnh báo `cta.too-long` (6 giây) — nó phải chở
 * bốn mẩu tin: câu hỏi · từ khoá · tên miền · mã kèm số Lượng. Ngưỡng 6s đặt
 * hồi câu kết chỉ có một lời mời bấm. Giữ nguyên ngưỡng và để nó kêu, thay vì
 * nới ngưỡng cho khỏi thấy cảnh báo — đó là quyết định sản phẩm có ý thức,
 * không phải một lỗi cần giấu đi.
 *
 * 🔑 TRẢ VỀ HAI BẢN: `text` là phụ đề (phải viết đúng tên miền và mã để người
 * ta gõ lại được), `speech` là thứ gửi TTS. Vbee đọc `tuviminhbao.com` thành
 * một khối vô nghĩa và đọc `TUVIMINHBAO` viết hoa thành từng chữ cái — cả hai
 * đều làm hỏng đúng câu quan trọng nhất về mặt chuyển đổi.
 *
 * 🔴 BẢN ĐỌC PHẢI CÓ ĐỦ DẤU: bản đầu tôi viết `tu vi minh bảo` (chỉ mỗi "bảo"
 * có dấu) và Vbee đọc ra đúng một khối phẳng "tuviminhbao" — tức KHÔNG chữa
 * được gì so với việc gửi thẳng tên miền. Tiếng Việt không dấu thì bộ đọc
 * không tách được thành từ. Phải là **`Tử Vi Minh Bảo`**, viết như tên riêng.
 * Áp cho MỌI chuỗi `speech` sau này, không riêng câu kết.
 */
export function buildCta(keyword: string, question: string): { text: string; speech: string } {
  return {
    text: `${question} Tra ${keyword} tại tuviminhbao.com — nhập mã ${PROMO_CODE} nhận ngay ${PROMO_CREDITS} lượng.`,
    speech: `${question} Tra ${keyword} tại Tử Vi Minh Bảo chấm com. Nhập mã Tử Vi Minh Bảo để nhận ngay ${PROMO_CREDITS} lượng.`,
  };
}

export function listToolDemoSources(): ToolDemoSource[] {
  return SOURCES;
}

export function buildToolDemoSpec(toolId: string): ScriptSpec | null {
  const src = SOURCES.find((s) => s.toolId === toolId);
  if (!src) return null;
  const cta = buildCta(src.keyword, src.ctaQuestion);
  return {
    sourceType: 'tool-demo',
    sourceId: src.toolId,
    ...src.spec,
    cta: src.spec.cta || cta.text,
    ctaSpeech: src.spec.cta ? undefined : cta.speech,
  };
}

export function getToolDemoSource(toolId: string): ToolDemoSource | null {
  return SOURCES.find((s) => s.toolId === toolId) ?? null;
}
