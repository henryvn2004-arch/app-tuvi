// lib/image/openai-image.ts
// ============================================================
// Sinh ảnh text-to-image qua OpenAI Images API. Dùng cho "Chân Dung Vợ Chồng"
// + "Chân Dung Tiền Kiếp" (và tranh Quẻ Phục Hy) — vẽ ảnh TƯỞNG TƯỢNG từ mô tả
// suy ra lá số, KHÔNG cần ảnh gốc của ai (khác Replicate flux-kontext-pro đang
// dùng cho các tool try-on/render — đó là img2img, cần ảnh input).
//
// ⚠️ MODEL MẶC ĐỊNH: `gpt-image-2`. OpenAI TẮT `gpt-image-1` ngày 23/10/2026 —
// đây là đường sinh ảnh DUY NHẤT của 2 tool đang bán, nên nó có hạn sử dụng chứ
// không phải chuyện tối ưu. Cùng khổ 1024×1536 chất lượng medium: ~1.090đ thay
// vì ~1.649đ (rẻ hơn 34%). Tham số y hệt (size/quality/n/output_format) nên đổi
// đúng tên model là chạy.
//
// Hai đường ghi đè, KHÁC mục đích nhau — đừng gộp:
//  • `opts.model` — đổi cho ĐÚNG lượt gọi này (Quẻ Phục Hy chọn model bằng
//    config, thử được ở chỗ rẻ trước).
//  • env `OPENAI_IMAGE_MODEL` — pin cả site, LỐI LÙI nếu tài khoản chưa mở
//    gpt-image-2 hoặc nét vẽ mới không dùng được.
// ============================================================

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

export interface GeneratePortraitOpts {
  prompt: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'low' | 'medium' | 'high';
  /**
   * Ghi đè model cho ĐÚNG lượt gọi này. Cần vì `gpt-image-1` đã bị OpenAI khai
   * tử trong 2026 (thay bằng `gpt-image-2`), mà đổi model là đổi NÉT VẼ — hai
   * tool chân dung đang bán không được phép đổi nét lặng lẽ. Nên đường đổi phải
   * là từng lượt gọi, thử được ở chỗ rẻ trước, chứ không phải một biến env bật
   * lên là cả site vẽ khác đi.
   */
  model?: string;
}

export interface GeneratePortraitResult {
  b64: string;
  /** Token usage thật từ OpenAI (0 nếu API không trả — vẫn ghi log được, chỉ cost=0). */
  usage: { text_tokens: number; image_input_tokens: number; image_output_tokens: number };
  /** Model THỰC SỰ đã gọi — để log ghi đúng tên chứ không chép lại hằng số ở chỗ gọi. */
  model: string;
}

/** Trả về base64 PNG (không kèm data: prefix) + usage token thật. Ném lỗi nếu API thất bại. */
export async function generatePortraitImage(opts: GeneratePortraitOpts): Promise<GeneratePortraitResult> {
  if (!OPENAI_KEY) throw new Error('openai-image: thiếu OPENAI_API_KEY');

  const model = opts.model || OPENAI_IMAGE_MODEL;

  const r = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      prompt: opts.prompt,
      size: opts.size || '1024x1024',
      quality: opts.quality || 'medium',
      // Khai RÕ png, không dựa vào mặc định: 2 route chân dung upload lên
      // Supabase Storage với đuôi `.png` + `Content-Type: image/png`, và ảnh đó
      // còn đi thẳng vào og:image của trang chia sẻ. Mặc định đổi một nhịp là
      // file nói dối kiểu của chính nó ở 3 nơi cùng lúc.
      output_format: 'png',
      n: 1,
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`openai-image ${r.status}: ${body.slice(0, 300)}`);
  }

  const j = (await r.json()) as {
    data?: { b64_json?: string }[];
    usage?: { output_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number } };
  };
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new Error('openai-image: không nhận được ảnh.');

  const usage = {
    text_tokens: j?.usage?.input_tokens_details?.text_tokens || 0,
    image_input_tokens: j?.usage?.input_tokens_details?.image_tokens || 0,
    image_output_tokens: j?.usage?.output_tokens || 0,
  };
  // Ảnh vẫn ra nhưng KHÔNG có usage ⇒ `logImageUsage` bỏ qua ⇒ panel Biên Lợi
  // Nhuận âm thầm mất khoản đắt nhất hệ thống. Kêu lên để lần đổi model sau
  // không đứt đo mà không ai biết (đúng bệnh đã dính với GA4 base64).
  if (!usage.text_tokens && !usage.image_output_tokens) {
    console.warn(`[openai-image] ${model} trả ảnh nhưng KHÔNG có usage — chi phí lượt này không được ghi.`);
  }

  return { b64, model, usage };
}
