// lib/image/openai-image.ts
// ============================================================
// Sinh ảnh text-to-image qua OpenAI Images API (gpt-image-1). Dùng cho
// "Chân Dung Vợ Chồng" — vẽ chân dung TƯỞNG TƯỢNG từ mô tả suy ra lá số,
// KHÔNG cần ảnh gốc của ai (khác Replicate flux-kontext-pro đang dùng cho
// các tool try-on/render — đó là img2img, cần ảnh input).
// ============================================================

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

export interface GeneratePortraitOpts {
  prompt: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'low' | 'medium' | 'high';
}

export interface GeneratePortraitResult {
  b64: string;
  /** Token usage thật từ OpenAI (0 nếu API không trả — vẫn ghi log được, chỉ cost=0). */
  usage: { text_tokens: number; image_input_tokens: number; image_output_tokens: number };
}

/** Trả về base64 PNG (không kèm data: prefix) + usage token thật. Ném lỗi nếu API thất bại. */
export async function generatePortraitImage(opts: GeneratePortraitOpts): Promise<GeneratePortraitResult> {
  if (!OPENAI_KEY) throw new Error('openai-image: thiếu OPENAI_API_KEY');

  const r = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: opts.prompt,
      size: opts.size || '1024x1024',
      quality: opts.quality || 'medium',
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
  return {
    b64,
    usage: {
      text_tokens: j?.usage?.input_tokens_details?.text_tokens || 0,
      image_input_tokens: j?.usage?.input_tokens_details?.image_tokens || 0,
      image_output_tokens: j?.usage?.output_tokens || 0,
    },
  };
}
