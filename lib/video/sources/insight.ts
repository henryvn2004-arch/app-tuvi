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
