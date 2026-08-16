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
 */
function cta(question: string) {
  return {
    cta: `${question} Tra tại tuviminhbao.com. Nhập mã TUVIMINHBAO để nhận ngay 100 lượng.`,
    ctaSpeech: `${question} Tra tại Tử Vi Minh Bảo chấm com. Nhập mã Tử Vi Minh Bảo để nhận ngay một trăm lượng.`,
  };
}

const SOURCES: InsightSource[] = [
  // ── A2. BẢN ĐẦY ĐỦ — đúng cấu trúc guideline, không cắt cho vừa 30 giây ──
  //
  // 🔑 VÌ SAO CÓ BẢN NÀY: bản 25 giây ở dưới chỉ vừa đủ HOOK rồi hết — người
  // xem chưa học được gì nên nó đọc thành một mẩu quảng cáo. Giữ cả hai để so:
  // cùng một chủ đề, khác hẳn ở chỗ có PAYOFF hay không.
  //
  // Cấu trúc: HOOK → CURIOSITY (vì sao đáng nghe) → BUILD-UP (ba kiểu, mỗi
  // kiểu kèm CƠ CHẾ chứ không chỉ mô tả) → INSIGHT (điểm chung — chỗ người xem
  // thật sự học được) → PAYOFF (làm gì với nó) → CTA.
  //
  // ⚠️ Cần chạy với trần độ dài nới ra (`--max-seconds`), xem `GateOptions`.
  {
    id: 'ba-kieu-ton-thuong-day-du',
    topLabel: 'Bạn là kiểu người nào',
    toolId: 'luan-giai',
    spec: {
      title: 'Ba kiểu người khi bị tổn thương (bản đầy đủ)',
      hook: 'Có ba kiểu người khi bị tổn thương. Bạn không tự quyết được.',
      scenes: [
        // ── CURIOSITY: vì sao chuyện này đáng nghe hết ──
        {
          text: 'Cách bạn phản ứng lúc đau không phải tính cách. Đó là một thói quen sinh tồn.',
          visual: { kind: 'typo', accent: 'thói quen sinh tồn.' },
        },
        {
          text: 'Nó hình thành từ những năm bạn còn quá nhỏ để hiểu chuyện gì đang xảy ra.',
          visual: { kind: 'typo', accent: 'quá nhỏ' },
        },
        // ── BUILD-UP · kiểu 1 ──
        {
          text: 'Kiểu thứ nhất: rút lui. Bạn không cãi, không giải thích, chỉ lặng đi.',
          visual: { kind: 'typo', accent: 'rút lui.' },
        },
        {
          text: 'Người ngoài tưởng bạn đã nguôi. Thật ra bạn vừa đóng lại một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng lại một cánh cửa.' },
        },
        {
          text: 'Đứa trẻ ngày xưa học được rằng nói ra cũng chẳng ai nghe. Nên thôi im.',
          visual: { kind: 'typo', accent: 'chẳng ai nghe.' },
        },
        // ── BUILD-UP · kiểu 2 ──
        {
          text: 'Kiểu thứ hai: nói cho bằng hết. Bạn cần được nghe hơn là cần thắng.',
          visual: { kind: 'typo', accent: 'cần được nghe' },
        },
        {
          text: 'Giọng bạn to dần lên, không phải vì giận, mà vì sợ bị bỏ qua lần nữa.',
          visual: { kind: 'typo', accent: 'sợ bị bỏ qua' },
        },
        {
          text: 'Đứa trẻ ngày xưa chỉ được để ý mỗi khi ồn ào. Nên nó không dám im.',
          visual: { kind: 'typo', accent: 'không dám im.' },
        },
        // ── BUILD-UP · kiểu 3 ──
        {
          text: 'Kiểu thứ ba: quay vào trong. Bạn tự trách mình trước khi kịp giận ai.',
          visual: { kind: 'typo', accent: 'quay vào trong.' },
        },
        {
          text: 'Bạn nhận phần sai về mình rất nhanh, vì như thế thì mọi thứ yên trở lại.',
          visual: { kind: 'typo', accent: 'yên trở lại.' },
        },
        {
          text: 'Đứa trẻ ngày xưa thấy nhà hết căng mỗi lần nó nhận lỗi. Nên nó nhận mãi.',
          visual: { kind: 'typo', accent: 'nhận mãi.' },
        },
        // ── INSIGHT: điểm chung — chỗ người xem thật sự học được ──
        {
          text: 'Cả ba kiểu đều đang làm cùng một việc: giữ cho mối quan hệ của bạn khỏi vỡ.',
          visual: { kind: 'typo', accent: 'cùng một việc:' },
        },
        {
          text: 'Chúng chỉ khác nhau ở chỗ ai là người trả giá.',
          visual: { kind: 'typo', accent: 'ai là người trả giá.' },
        },
        {
          text: 'Người rút lui mất dần kết nối. Người nói to mất sự bình yên.',
          visual: { kind: 'typo', accent: 'mất dần kết nối.' },
        },
        {
          text: 'Còn người luôn nhận lỗi thì mất chính mình, từng chút một.',
          visual: { kind: 'typo', accent: 'mất chính mình,' },
        },
        // ── PAYOFF: làm được gì với điều vừa biết ──
        {
          text: 'Điều bạn học được thì bạn học lại được. Không cần đổi tính nết.',
          visual: { kind: 'typo', accent: 'học lại được.' },
        },
        {
          text: 'Chỉ cần nhận ra nó đang chạy, ngay lúc nó chạy.',
          visual: { kind: 'typo', accent: 'ngay lúc nó chạy.' },
        },
        {
          text: 'Lần tới khi đau, bạn thử dừng một nhịp: mình đang bảo vệ điều gì?',
          visual: { kind: 'typo', accent: 'đang bảo vệ điều gì?' },
        },
      ],
      ...cta('Bạn là kiểu nào?'),
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
