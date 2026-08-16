// lib/video/sources/insight.ts
// ============================================================
// ADAPTER NGUỒN: clip LAYER 1 — "insight về chính người xem".
//
// Khác `tool-demo.ts` ở đúng một chỗ, nhưng là chỗ căn bản: loại clip này
// KHÔNG quay màn hình. Nội dung kiểu *"có ba kiểu người khi bị tổn thương"*
// không có giao diện nào để quay — mà theo chiến lược kênh thì nó chiếm 70%
// lượng clip. Vì thế nó cần template riêng (`remotion/src/InsightClip.tsx`)
// và một `sourceType` riêng (`quote`) để cổng máy không đòi cảnh quay màn
// hình (luật `visual.no-screen` chỉ áp cho `tool-demo`).
//
// 🔑 ĐỊNH VỊ, quyết định mọi câu chữ bên dưới: mặt tiền là CON NGƯỜI (tính
// cách, cảm xúc, quan hệ), cổ học chỉ là cơ chế phía sau. Không mở clip bằng
// "tử vi nói rằng…" — mở bằng một điều bất thường về chính người xem.
//
// ⚠️ HAI CÁI BẪY của cổng 1 khi sửa mấy dòng này (đã vấp thật):
//  1. Chữ **`chọn`** nằm trong danh sách động từ THAO TÁC bị chặn ở hook và
//     nửa đầu số cảnh. "Kiểu thứ nhất *chọn* im lặng" trượt thẳng — phải viết
//     "Kiểu thứ nhất im lặng".
//  2. Phải có ≥ `ceil(số cảnh × 0,8)` lần nhắc người xem (`bạn · mình · tôi`)
//     trên toàn bộ hook + cảnh + câu kết.
// ============================================================

import type { ScriptSpec } from '../script-spec';

/** Kho ảnh công khai — 64 bức tranh quẻ đã sinh sẵn, dùng lại 0đ. */
const QUE = (file: string) =>
  `https://dciwkfdqhhddeymlisey.supabase.co/storage/v1/object/public/portraits/que-phuc-hy/${file}`;

export interface InsightSource {
  id: string;
  /** Nhãn nhỏ trên đỉnh clip — CHỦ ĐỀ, không phải tên công cụ. */
  topLabel: string;
  /** Công cụ mà clip này dẫn về. Dùng cho khâu đo chuyển đổi về sau. */
  toolId: string;
  spec: Omit<ScriptSpec, 'sourceType' | 'sourceId'>;
}

/**
 * Câu kết dùng chung.
 *
 * Chở bốn mẩu tin: câu hỏi mời tương tác · nơi tra · tên miền · mã khuyến mãi.
 * ⚠️ Nó CỐ Ý vượt ngưỡng cảnh báo `cta.too-long` (6s) — ngưỡng đó đặt hồi câu
 * kết chỉ có một lời mời bấm. Giữ ngưỡng và để nó kêu, đừng nới cho khỏi thấy.
 *
 * 🔴 BẢN ĐỌC PHẢI CÓ ĐỦ DẤU. Vbee đọc `tuviminhbao.com` thành một khối vô
 * nghĩa và đọc mã viết HOA thành từng chữ cái; mà tiếng Việt KHÔNG dấu thì bộ
 * đọc không tách được thành từ (đã sai một lần với `tu vi minh bảo`). Viết như
 * TÊN RIÊNG: `Tử Vi Minh Bảo`.
 *
 * 🔑 `tool` — GỌI ĐÍCH DANH tên công cụ thay vì chỉ nêu tên miền. Người xem vừa
 * nghe một điều mới về chính họ; câu kết phải nói thẳng vào ĐÂU để đi tiếp, nếu
 * không thì họ về trang chủ rồi lạc giữa 54 công cụ. Tên phải khớp NGUYÊN VĂN
 * `tool_pricing.label` — nói một cái tên không tìm thấy trên site còn tệ hơn
 * không nói tên nào.
 *
 * ⚠️ Chỉ được gọi MỘT tên. Kể cả khi phần *for what* nêu ba hướng dùng, câu kết
 * vẫn chỉ chỉ một đường — đó là chính điều `cta.missing` đã ghi trong phần `fix`.
 */
function cta(question: string, tool?: string) {
  const noi = tool ? `Mở ${tool} trên tuviminhbao.com.` : `Tra tại tuviminhbao.com.`;
  const noiDoc = tool
    ? `Mở ${tool} trên Tử Vi Minh Bảo chấm com.`
    : `Tra tại Tử Vi Minh Bảo chấm com.`;
  return {
    cta: `${question} ${noi} Nhập mã TUVIMINHBAO để nhận ngay 100 lượng.`,
    ctaSpeech: `${question} ${noiDoc} Nhập mã Tử Vi Minh Bảo để nhận ngay một trăm lượng.`,
  };
}

const SOURCES: InsightSource[] = [
  // ── A2. BẢN ĐẦY ĐỦ — WHAT → WHY → FOR WHAT ──────────────────────────────
  //
  // 🔑 VÌ SAO CÓ BẢN NÀY, và vì sao nó ĐÃ VIẾT LẠI MỘT LẦN:
  //
  // Bản 25 giây ở dưới chỉ vừa đủ HOOK rồi hết — người xem chưa học được gì nên
  // nó đọc thành một mẩu quảng cáo. Bản đầy đủ đầu tiên chữa được độ dài nhưng
  // vẫn hụt đúng chỗ quan trọng nhất: nó **mô tả ba kiểu rồi mời đi tra**, tức
  // trả lời WHAT mà bỏ trống WHY và FOR WHAT. Phần "vì sao" khi đó chỉ là ba
  // câu cùng một khuôn *"đứa trẻ ngày xưa học được rằng…"* — nghe như văn kể,
  // người xem không mang đi được gì; còn "biết rồi thì dùng vào việc gì" thì
  // không có câu nào.
  //
  // Cấu trúc chốt (Henry duyệt):
  //   HOOK → CURIOSITY → **WHAT** (ba kiểu, mỗi kiểu 2 cảnh: hành vi + chỗ
  //   người ngoài hiểu nhầm) → **WHY** (cơ chế thật, kiến thức mang đi được)
  //   → **FOR WHAT** (dùng vào ba việc có thật) → PAYOFF → CTA gọi ĐÍCH DANH
  //   tên công cụ.
  //
  // 🔑 PHẦN WHY CỐ Ý KHÔNG BÁM TỬ VI. Đây là quyết định định vị, không phải
  // thiếu sót: mặt tiền là CON NGƯỜI, cổ học chỉ là cơ chế phía sau. Một lời
  // giải thích tra ngược được (bốn phản ứng của hệ thần kinh trước đe doạ —
  // đánh · chạy · đứng hình · chiều theo) thì người xem kiểm chứng được ở chỗ
  // khác, và chính vì thế nó làm site đáng tin hơn là tự khép kín trong bộ môn.
  //
  // 🔑 CHỖ NGƯỜI XEM HỌC ĐƯỢC CÁI MỚI nằm ở phản ứng THỨ TƯ. Ba cái đầu ai cũng
  // nghe rồi; "chiều theo" thì hiếm người biết là một phản xạ có tên — mà nó
  // đúng là kiểu phổ biến nhất trong gia đình Việt. Bỏ nó đi thì clip chỉ còn
  // nhắc lại thứ người ta đã biết, và đó là clip bị lướt.
  //
  // ⚠️ Cần chạy với trần độ dài nới ra (`--max-seconds`), xem `GateOptions`.
  //
  // ⚠️ TRÁNH HẲN CHỮ `bấm` trong cả kịch bản, dù nói về "nút" thì đó là từ tự
  // nhiên nhất. `bấm` nằm trong `HOW_TO_VERBS` và bị chặn ở NỬA ĐẦU số cảnh —
  // viết "nút nào bật lên" / "đang ở nút nào" thì đúng ở mọi vị trí, không phải
  // phụ thuộc vào việc sau này ai thêm bớt cảnh làm dịch mất ranh giới nửa đầu.
  {
    id: 'ba-kieu-ton-thuong-day-du',
    topLabel: 'Bạn là kiểu người nào',
    // Đúng `tool_pricing.tool_id` (KHÔNG phải `luan-giai` — đó là tên ở hệ
    // `events`). Ba hệ tên tool trong repo này vốn đã lệch nhau một lần và
    // suýt làm panel phễu đọc ra "24 người mở, 0 người mua".
    toolId: 'laso',
    spec: {
      title: 'Ba kiểu người khi bị tổn thương (bản đầy đủ)',
      hook: 'Có ba kiểu người khi bị tổn thương. Thật ra bạn không tự quyết.',
      scenes: [
        // ── CURIOSITY: vì sao chuyện này đáng nghe hết ──
        {
          text: 'Cách bạn phản ứng lúc đau không phải tính cách. Nó là một phản xạ.',
          visual: { kind: 'typo', accent: 'một phản xạ.' },
        },
        {
          text: 'Mà phản xạ thì có nguyên nhân. Biết nguyên nhân rồi, bạn nhìn khác hẳn.',
          visual: { kind: 'typo', accent: 'có nguyên nhân.' },
        },
        // ── WHAT · kiểu 1 ──
        {
          text: 'Kiểu thứ nhất: rút lui. Bạn không cãi, không giải thích, chỉ lặng đi.',
          visual: { kind: 'typo', accent: 'rút lui.' },
        },
        {
          text: 'Người ngoài tưởng bạn đã nguôi. Thật ra bạn vừa đóng một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng một cánh cửa.' },
        },
        // ── WHAT · kiểu 2 ──
        {
          text: 'Kiểu thứ hai: nói cho bằng hết. Bạn cần được nghe hơn là cần thắng.',
          visual: { kind: 'typo', accent: 'cần được nghe' },
        },
        {
          text: 'Giọng bạn to dần, không phải vì giận, mà vì sợ bị bỏ qua lần nữa.',
          visual: { kind: 'typo', accent: 'sợ bị bỏ qua' },
        },
        // ── WHAT · kiểu 3 ──
        {
          text: 'Kiểu thứ ba: quay vào trong. Bạn tự trách mình trước khi kịp giận ai.',
          visual: { kind: 'typo', accent: 'quay vào trong.' },
        },
        {
          text: 'Bạn nhận phần sai rất nhanh, vì như thế thì mọi thứ yên trở lại.',
          visual: { kind: 'typo', accent: 'yên trở lại.' },
        },
        // ── WHY: cơ chế thật. Đây là phần bản trước bỏ trống ──
        {
          text: 'Ba kiểu này không phải ba tính cách. Chúng là ba nút của hệ thần kinh.',
          visual: { kind: 'typo', accent: 'ba nút' },
        },
        {
          text: 'Gặp nguy, cơ thể bạn có bốn nút: đánh trả, bỏ chạy, đứng hình, chiều theo.',
          visual: { kind: 'typo', accent: 'bốn nút:' },
        },
        {
          // ⚠️ KHÔNG viết "nút người Việt hay dùng nhất" như bản nháp đầu: đó là
          // một khẳng định thống kê về cả một dân tộc, mà không có số liệu nào
          // đỡ. Nói chắc hơn thứ mình biết là lớp lỗi repo này đã trả giá nhiều
          // lần — và trên video thì nó nằm vĩnh viễn trong file đã đăng.
          text: 'Ba nút đầu ai cũng nghe rồi. Nút thứ tư thì ít người biết nó có tên.',
          visual: { kind: 'typo', accent: 'Nút thứ tư' },
        },
        {
          text: 'Chiều theo: nhận lỗi, làm hoà, để cơn giận của người kia hạ xuống.',
          visual: { kind: 'typo', accent: 'Chiều theo:' },
        },
        {
          text: 'Nút nào bật lên là do nút nào từng có tác dụng, hồi bạn còn rất nhỏ.',
          visual: { kind: 'typo', accent: 'từng có tác dụng,' },
        },
        {
          text: 'Nhà hay cãi thì im là an toàn. Nhà bận rộn thì phải ồn mới được nghe.',
          visual: { kind: 'typo', accent: 'im là an toàn.' },
        },
        {
          text: 'Còn nhà lúc nào cũng căng, thì nhận lỗi là cách nhanh nhất để yên.',
          visual: { kind: 'typo', accent: 'nhanh nhất để yên.' },
        },
        // ── FOR WHAT: biết rồi thì dùng vào việc gì ──
        {
          text: 'Biết nút của mình, bạn thôi tự trách vì đã phản ứng như thế.',
          visual: { kind: 'typo', accent: 'thôi tự trách' },
        },
        {
          text: 'Biết nút của người kia, bạn hết đọc im lặng thành lạnh nhạt.',
          visual: { kind: 'typo', accent: 'thành lạnh nhạt.' },
        },
        {
          text: 'Và biết nút của con: đứa trẻ hay nhận lỗi không phải là đứa ngoan.',
          visual: { kind: 'typo', accent: 'không phải là đứa ngoan.' },
        },
        {
          text: 'Nó đang ở nút thứ tư, để nhà mình yên. Nó học điều đó rất sớm.',
          visual: { kind: 'typo', accent: 'nút thứ tư,' },
        },
        // ── PAYOFF ──
        {
          text: 'Điều bạn học được thì bạn học lại được. Không cần đổi tính nết.',
          visual: { kind: 'typo', accent: 'học lại được.' },
        },
        {
          text: 'Lần tới khi đau, bạn thử dừng một nhịp: mình đang ở nút nào?',
          visual: { kind: 'typo', accent: 'đang ở nút nào?' },
        },
      ],
      ...cta('Bạn là kiểu nào?', 'Luận Giải Lá Số'),
      music: 'tram-tinh.wav',
      hashtags: ['tinhcach', 'tamly', 'chualanh', 'selfdiscovery'],
    },
  },

  // ── A. Motion typography thuần — 0 asset, 0đ ────────────────────────────
  {
    id: 'ba-kieu-ton-thuong',
    topLabel: 'Bạn là kiểu người nào',
    toolId: 'luan-giai',
    spec: {
      title: 'Ba kiểu người khi bị tổn thương',
      hook: 'Có ba kiểu người khi bị tổn thương.',
      scenes: [
        {
          text: 'Kiểu thứ nhất im lặng. Bạn không cãi, chỉ lặng lẽ rút đi.',
          visual: { kind: 'typo', accent: 'im lặng.' },
        },
        {
          text: 'Người ngoài tưởng bạn ổn. Thật ra bạn vừa đóng một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng một cánh cửa.' },
        },
        {
          text: 'Kiểu thứ hai nói cho bằng hết. Bạn cần được nghe, không cần thắng.',
          visual: { kind: 'typo', accent: 'được nghe,' },
        },
        {
          text: 'Kiểu thứ ba quay vào trong, tự trách mình trước khi kịp giận ai.',
          visual: { kind: 'typo', accent: 'tự trách mình' },
        },
        {
          text: 'Không kiểu nào sai. Bạn chỉ học cách tự vệ từ rất sớm.',
          visual: { kind: 'typo', accent: 'tự vệ từ rất sớm.' },
        },
      ],
      ...cta('Bạn là kiểu nào?'),
      music: 'tram-tinh.wav',
      hashtags: ['tinhcach', 'tamly', 'selfdiscovery', 'tuvi'],
    },
  },

  // ── B. Dùng lại 64 bức tranh quẻ đã sinh sẵn ────────────────────────────
  {
    id: 'ba-the-be-tac',
    topLabel: 'Bạn đang ở đâu',
    toolId: 'kinh-dich',
    spec: {
      title: 'Ba tình thế bế tắc trong Kinh Dịch',
      hook: 'Người xưa vẽ ba tình thế bế tắc.',
      scenes: [
        {
          text: 'Truân: bạn mới bắt đầu, và mọi thứ còn rối như tơ vò.',
          visual: { kind: 'image', src: QUE('17-kw03.png'), accent: 'Truân:' },
        },
        {
          text: 'Kiển: đường trước mặt nghẽn, mà quay lại thì không cam.',
          visual: { kind: 'image', src: QUE('20-kw39.png'), accent: 'Kiển:' },
        },
        {
          text: 'Khốn: bạn vẫn gắng, nhưng nói ra thì không ai hiểu.',
          visual: { kind: 'image', src: QUE('26-kw47.png'), accent: 'Khốn:' },
        },
        {
          text: 'Khảm: hết lớp này tới lớp khác, tới mức bạn quen dần.',
          visual: { kind: 'image', src: QUE('18-kw29.png'), accent: 'Khảm:' },
        },
        {
          text: 'Cổ nhân không gọi đó là số phận của bạn. Chỉ là một giai đoạn.',
          visual: { kind: 'image', src: QUE('63-kw01.png'), accent: 'một giai đoạn.' },
        },
      ],
      ...cta('Bạn đang ở tình thế nào?'),
      music: 'cang-thang.wav',
      hashtags: ['kinhdich', 'bettac', 'coHoc', 'tuvi'],
    },
  },
];

export function getInsightSource(id: string): InsightSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function listInsightIds(): string[] {
  return SOURCES.map((s) => s.id);
}

export function buildInsightSpec(id: string): ScriptSpec | undefined {
  const src = getInsightSource(id);
  if (!src) return undefined;
  // `quote` chứ không `tool-demo`: cổng máy dùng chính trường này để quyết định
  // có đòi cảnh quay màn hình hay không.
  return { sourceType: 'quote', sourceId: src.id, ...src.spec };
}
