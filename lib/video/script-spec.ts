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
 *
 * 🔴 GIỚI HẠN ĐÃ ĐO, ĐỌC TRƯỚC KHI TIN CON SỐ NÀY:
 * hằng số trên rút từ các đoạn DÀI (~1.000–1.600 ký tự) và chỉ đúng ở cỡ đó.
 * Đo thêm trên câu NGẮN cỡ một cảnh clip thì tốc độ dao động rất mạnh:
 *
 *      34 ký tự → 2,98s (11,4 kt/s)      112 ký tự → 6,60s (17,0 kt/s)
 *      40 ký tự → 2,67s (15,0 kt/s)      183 ký tự → 9,87s (18,6 kt/s)
 *    1327 ký tự → 96,31s (13,8 kt/s)
 *
 * Khoảng lặng đầu/cuối cố định (~0,5s) chiếm tỉ trọng lớn ở câu ngắn, và nhịp
 * ngắt câu của Vbee không tuyến tính theo độ dài. Thử hồi quy tuyến tính thì ra
 * hệ số chặn ÂM — tức mô hình sai, không phải chỉ thiếu chính xác.
 *
 * ⇒ QUY ƯỚC: hàm này chỉ dùng cho CỔNG 1 (bắt clip quá dài / quá ngắn — sai số
 * 1–2 giây không đổi kết luận) và cho bản xem trước khi chưa có giọng đọc.
 * Lúc RENDER THẬT thì đo ĐỘ DÀI THẬT của file mp3, không dùng ước lượng.
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
  | { kind: 'image'; src: string; caption?: string; accent?: string }
  /**
   * Chữ lớn hiện dần theo từng từ, không có hình nào khác.
   *
   * Dành cho nội dung Layer 1 (*"bạn là kiểu người nào"*) — loại KHÔNG có màn
   * hình nào để quay. `accent` là chuỗi con trong `text` được tô vàng; khai
   * riêng chứ không nhúng ký hiệu vào `text`, vì chính `text` đó còn được gửi
   * cho TTS và dùng làm phụ đề.
   */
  | { kind: 'typo'; accent?: string }
  /**
   * Chữ lớn + NHÂN VẬT SIGNATURE của kênh, trên nền đen.
   *
   * 🔑 `pose` là tên trong một TỪ VỰNG ĐÓNG (`POSES` của `remotion/src/
   * Character.tsx`), không phải mô tả tự do. Hai hệ quả cố ý:
   *   · Chọn hình cho một cảnh là phép TRA BẢNG deterministic, 0đ — không gọi
   *     API, không tải ảnh, không cần kho.
   *   · Khi cổng 2 chấm *"hình có hợp nội dung không"*, nó so lời đọc với một
   *     cái tên cố định dùng lại ở mọi clip, chứ không phải một câu mô tả tôi
   *     viết mới cho từng bức — tức bớt được phần "chấm chính văn của mình".
   */
  | { kind: 'figure'; pose: string; accent?: string };

export interface Scene {
  /** Lời đọc của cảnh này. Cũng CHÍNH LÀ phụ đề — một nguồn, không chép hai bản. */
  text: string;
  /**
   * Bản gửi cho TTS khi chữ VIẾT khác chữ ĐỌC. Bỏ trống ⇒ đọc luôn `text`.
   *
   * 🔑 Chỉ dùng cho đúng lớp ca này, đừng mở rộng thành "bản chữ thứ hai": tên
   * miền (`tuviminhbao.com` phải đọc "tu vi minh bảo chấm com"), mã khuyến mãi
   * viết HOA (đọc từng chữ cái là hỏng), con số (`100` → "một trăm"). Ngoài ba
   * loại đó thì để `text` gánh cả hai vai — hai bản chữ song song là đúng cái
   * bẫy "chép hai nơi rồi trôi khỏi nhau" mà hợp đồng này sinh ra để tránh.
   */
  speech?: string;
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
  /** Bản gửi TTS cho `cta` — xem `Scene.speech`. Đây là chỗ hay cần nhất (tên miền + mã). */
  ctaSpeech?: string;
  /** Tên file nhạc nền trong `remotion/public/music/`. Bỏ trống = không nhạc. */
  music?: string;
  /**
   * Ảnh NỀN cho cả clip (URL hoặc đường dẫn trong `remotion/public/`), luân
   * phiên đều theo thời lượng. Bỏ trống = nền navy như cũ.
   *
   * 🔑 Khác `scene.visual.kind = 'image'` vốn gắn ảnh vào MỘT cảnh. Kịch bản
   * Layer 1 có 20+ cảnh mà không có 20 bức hợp cảnh; ảnh đổi mỗi 3 giây thì
   * mắt chạy theo ảnh chứ không đọc chữ — mà chữ mới là nội dung.
   */
  backdrop?: string[];
  /**
   * Tư thế nhân vật cho câu MỞ ĐẦU và câu KẾT — hai chỗ không nằm trong
   * `scenes` nên không tự khai `visual` được.
   *
   * Khai một trong hai ⇒ clip chạy nền ĐEN + nhân vật signature, thay cho nền
   * navy/ảnh. Bỏ trống cả hai ⇒ giữ nguyên hình dạng cũ.
   */
  hookPose?: string;
  ctaPose?: string;
  /** Hashtag gợi ý cho lúc đăng — KHÔNG hiện trên clip. */
  hashtags?: string[];
}

/** Chữ THẬT SỰ gửi cho TTS của một cảnh. */
export function spokenSceneText(s: Scene): string {
  return s.speech?.trim() || s.text;
}

/** Chữ THẬT SỰ gửi cho TTS của câu kết. */
export function spokenCta(spec: ScriptSpec): string {
  return spec.ctaSpeech?.trim() || spec.cta;
}

/**
 * Tổng thời lượng ước tính của clip (giây), gồm cả hook và CTA.
 *
 * Ước theo bản ĐỌC chứ không phải bản viết — chỗ hai bản lệch nhau nhiều nhất
 * chính là câu kết ("tuviminhbao.com" 15 ký tự nhưng đọc thành 21).
 */
export function estimateTotalSeconds(spec: ScriptSpec): number {
  const scenes = spec.scenes.reduce(
    (sum, s) => sum + (s.forceSeconds ?? estimateSpeechSeconds(spokenSceneText(s))),
    0
  );
  return estimateSpeechSeconds(spec.hook) + scenes + estimateSpeechSeconds(spokenCta(spec));
}

/** Toàn bộ lời đọc, theo đúng thứ tự xuất hiện. */
export function fullNarration(spec: ScriptSpec): string[] {
  return [spec.hook, ...spec.scenes.map(spokenSceneText), spokenCta(spec)].filter((t) => t.trim());
}
