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
  spec: Omit<ScriptSpec, 'sourceType' | 'sourceId'>;
}

const SOURCES: ToolDemoSource[] = [
  {
    toolId: 'than-so-hoc',
    label: 'Thần Số Học',
    recording: 'recordings/than-so-hoc.webm',
    keyword: 'Số Đường Đời',
    spec: {
      title: 'Demo Thần Số Học',
      // Hook: ngắn, nói thẳng về người xem, gợi tò mò. Cố ý KHÔNG mở bằng tên
      // công cụ — ở giây thứ nhất chưa ai quan tâm mình là ai.
      hook: 'Ngày sinh của bạn giấu một con số.',
      scenes: [
        {
          text: 'Gõ ngày sinh. Gõ họ tên.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 3,
            label: 'Nhập ngày sinh và họ tên',
          },
        },
        {
          text: 'Cộng hết chữ số lại, rút về một số duy nhất.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 6,
            label: 'Bấm tính',
          },
        },
        {
          text: 'Đó là Số Đường Đời. Nó nói bạn hợp làm gì.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 9,
            label: 'Kết quả',
          },
        },
        {
          text: 'Và vì sao có những chuyện cứ lặp lại trong đời bạn.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 11,
            label: 'Số Định Mệnh',
          },
        },
        {
          text: 'Còn mười chỉ số nữa. Năm cá nhân. Chặng đời bạn đang đi.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 13,
            label: 'Biểu đồ ngày sinh',
          },
        },
      ],
      // Dựng từ `keyword` — xem `buildToolDemoSpec`.
      cta: '',
      music: 'don-dap.wav',
      hashtags: ['thansohoc', 'duongdoi', 'tuvi', 'xemboi'],
    },
  },
];

/**
 * Câu kết dùng CHUNG cho mọi clip demo, chỉ thay từ khoá.
 *
 * Bản đầu là *"Tra thử miễn phí, không cần đăng ký."* — vừa yếu vừa sai: nói
 * về THỦ TỤC (miễn phí, khỏi đăng ký) trong khi thứ kéo người ta bấm là điều
 * họ sắp biết về CHÍNH MÌNH. Câu kết phải trỏ vào đó.
 */
export function buildCta(keyword: string): string {
  return `Tìm hiểu ngay ${keyword} của chính bạn.`;
}

export function listToolDemoSources(): ToolDemoSource[] {
  return SOURCES;
}

export function buildToolDemoSpec(toolId: string): ScriptSpec | null {
  const src = SOURCES.find((s) => s.toolId === toolId);
  if (!src) return null;
  return {
    sourceType: 'tool-demo',
    sourceId: src.toolId,
    ...src.spec,
    cta: src.spec.cta || buildCta(src.keyword),
  };
}

export function getToolDemoSource(toolId: string): ToolDemoSource | null {
  return SOURCES.find((s) => s.toolId === toolId) ?? null;
}
