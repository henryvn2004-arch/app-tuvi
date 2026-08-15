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
 */
export function buildCta(keyword: string, question: string): { text: string; speech: string } {
  return {
    text: `${question} Tra ${keyword} tại tuviminhbao.com — nhập mã ${PROMO_CODE} nhận ngay ${PROMO_CREDITS} lượng.`,
    speech: `${question} Tra ${keyword} tại tu vi minh bảo chấm com. Nhập mã tu vi minh bảo, nhận ngay một trăm lượng.`,
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
