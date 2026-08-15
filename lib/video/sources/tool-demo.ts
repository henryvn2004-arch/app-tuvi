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
// ============================================================

import type { ScriptSpec } from '../script-spec';

/** Một công cụ + kịch bản clip của nó. */
export interface ToolDemoSource {
  toolId: string;
  /** Nhãn hiện trên dải thương hiệu ở đỉnh clip. */
  label: string;
  /** Tên file clip quay màn hình trong `remotion/public/recordings/`. */
  recording: string;
  spec: Omit<ScriptSpec, 'sourceType' | 'sourceId'>;
}

const SOURCES: ToolDemoSource[] = [
  {
    toolId: 'than-so-hoc',
    label: 'Thần Số Học',
    recording: 'recordings/than-so-hoc.webm',
    spec: {
      title: 'Demo Thần Số Học',
      // Hook: dạng "con số" + "gọi tên đối tượng". Cố ý KHÔNG mở bằng tên công
      // cụ — người lướt chưa quan tâm mình là ai ở giây thứ nhất.
      hook: 'Ngày sinh của bạn giấu một con số.',
      scenes: [
        {
          text: 'Cộng hết các chữ số ngày tháng năm sinh lại, rút về một số. Đó là Số Đường Đời.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 3,
            label: 'Nhập ngày sinh và họ tên',
          },
        },
        {
          text: 'Nó nói về việc bạn hợp làm gì, và vì sao có những chuyện cứ lặp lại trong đời bạn.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 8,
            label: 'Ra 11 chỉ số',
          },
        },
        {
          text: 'Còn mười chỉ số nữa: năm cá nhân, chặng đời bạn đang đi, và điều bạn còn thiếu.',
          visual: {
            kind: 'screen',
            recording: 'recordings/than-so-hoc.webm',
            startSec: 11,
            label: 'Biểu đồ ngày sinh',
          },
        },
      ],
      cta: 'Tra thử miễn phí, không cần đăng ký.',
      hashtags: ['thansohoc', 'duongdoi', 'tuvi', 'xemboi'],
    },
  },
];

export function listToolDemoSources(): ToolDemoSource[] {
  return SOURCES;
}

export function buildToolDemoSpec(toolId: string): ScriptSpec | null {
  const src = SOURCES.find((s) => s.toolId === toolId);
  if (!src) return null;
  return { sourceType: 'tool-demo', sourceId: src.toolId, ...src.spec };
}

export function getToolDemoSource(toolId: string): ToolDemoSource | null {
  return SOURCES.find((s) => s.toolId === toolId) ?? null;
}
