// lib/video/script-spec.ts
// ============================================================
// HỢP ĐỒNG DUY NHẤT giữa "nguồn nội dung" và "khâu dựng video".
//
// Mọi loại clip — demo công cụ, vấn đáp, khảo luận, lá số chia sẻ — đều phải
// quy về đúng shape này. Thêm một loại clip mới = viết một adapter trả về
// `ScriptSpec` + một template Remotion, KHÔNG đụng vào cổng kiểm hay khâu render.
//
// 🔑 Vì sao tách hợp đồng ra một file riêng thay vì để mỗi nguồn tự do: bài học
// lặp đi lặp lại trong repo này là "hai danh sách chép tay rồi trôi khỏi nhau"
// (sổ job vs `vercel.json`, giá Lượng chép ở client, `formatLaSoV2` hai bản).
// Một hợp đồng ở giữa nghĩa là cổng kiểm chỉ phải biết MỘT shape.
// ============================================================

/**
 * Tốc độ đọc THẬT của giọng Vbee đang dùng cho kênh (`s_sg_male_thientam`,
 * `speed_rate: 0.9`, mp3 128kbps).
 *
 * ⚠️ Đây là SỐ ĐO, không phải phỏng đoán: đo trên 11 file audio thật đang nằm
 * trong Supabase Storage (13.034 ký tự / 958,52 giây), dải 12,77–14,12 ký tự/
 * giây — rất chặt nên dùng làm ước lượng trước khi gọi TTS được.
 *
 * Dùng để: tính thời lượng clip TỪ KỊCH BẢN, trước khi tốn một lượt TTS nào.
 * Cổng 1 nhờ đó chạy 0đ.
 *
 * ⚠️ Đổi giọng hoặc đổi `speed_rate` thì PHẢI đo lại — số này gắn với đúng cấu
 * hình trên. Đo lại bằng: lấy `content-length` của mp3 ÷ (128000/8) ra số giây,
 * chia cho `length(text)`.
 */
export const TTS_CHARS_PER_SECOND = 13.59;

/** Ước lượng thời lượng đọc (giây) của một đoạn text, TRƯỚC khi gọi TTS. */
export function estimateSpeechSeconds(text: string): number {
  return text.trim().length / TTS_CHARS_PER_SECOND;
}

/** Loại nguồn — mỗi loại có một adapter riêng dựng ra ScriptSpec. */
export type VideoSourceType =
  | 'tool-demo' // quay màn hình một công cụ trên site
  | 'van-dap' // vấn đáp (đã có sẵn giọng đọc trong van_dap)
  | 'khao-luan' // trích một bài khảo luận
  | 'quote'; // trích dẫn / thẻ chữ

/**
 * Thứ hiện trên màn hình trong một cảnh.
 *
 * `screen` = clip quay màn hình thật (Playwright). `card` = thẻ chữ dựng bằng
 * React. `image` = ảnh có sẵn (ảnh chân dung đã công khai, ảnh Satori...).
 */
export type SceneVisual =
  | { kind: 'card'; heading?: string; body?: string; accent?: string }
  | { kind: 'screen'; recording: string; startSec?: number; label?: string }
  | { kind: 'image'; src: string; caption?: string };

export interface Scene {
  /** Lời đọc của cảnh này. Cũng CHÍNH LÀ phụ đề — một nguồn, không chép hai bản. */
  text: string;
  visual: SceneVisual;
  /**
   * Thời lượng ép (giây). Bỏ trống thì suy từ độ dài `text` — đó là đường mặc
   * định và nên giữ, vì hình khớp tiếng là thứ quyết định clip trông có chuyên
   * nghiệp hay không.
   */
  forceSeconds?: number;
}

export interface ScriptSpec {
  sourceType: VideoSourceType;
  /** Khoá của nguồn: tool_id, van_dap.id, slug bài… — dùng để chống dựng trùng. */
  sourceId: string;
  /** Tiêu đề nội bộ, KHÔNG hiện lên clip. */
  title: string;
  /**
   * Câu MỞ ĐẦU, hiện ngay khung hình đầu tiên.
   *
   * 🔑 Đây là thứ quyết định sống chết của clip trên TikTok: người ta lướt hay
   * ở lại được định đoạt trong ~3 giây. Cổng 1 và cổng 2 đều soi kỹ nhất chỗ này.
   */
  hook: string;
  scenes: Scene[];
  /** Lời mời hành động ở cuối. */
  cta: string;
  /** Tên file nhạc nền trong `remotion/public/music/`. Bỏ trống = không nhạc. */
  music?: string;
  /** Hashtag gợi ý cho lúc đăng — KHÔNG hiện trên clip. */
  hashtags?: string[];
}

/** Tổng thời lượng ước tính của clip (giây), gồm cả hook và CTA. */
export function estimateTotalSeconds(spec: ScriptSpec): number {
  const scenes = spec.scenes.reduce(
    (sum, s) => sum + (s.forceSeconds ?? estimateSpeechSeconds(s.text)),
    0
  );
  return estimateSpeechSeconds(spec.hook) + scenes + estimateSpeechSeconds(spec.cta);
}

/** Toàn bộ lời đọc, theo đúng thứ tự xuất hiện. */
export function fullNarration(spec: ScriptSpec): string[] {
  return [spec.hook, ...spec.scenes.map((s) => s.text), spec.cta].filter((t) => t.trim());
}
