/**
 * Sinh giọng đọc cho TỪNG CẢNH của clip, tải về `remotion/public/audio/`, và
 * ĐO ĐỘ DÀI THẬT của từng file.
 *
 * 🔑 Vì sao đo thật chứ không ước lượng: đã đo và thấy tốc độ đọc câu ngắn dao
 * động rất mạnh (11–18 ký tự/giây tuỳ câu) — ước lượng sai 1–2 giây, đủ để
 * hình lệch hẳn khỏi tiếng. Với đoạn dài thì hằng số 13,59 đúng, nhưng cảnh
 * clip toàn câu ngắn nên phải đo.
 *
 * Cache theo HASH của (text + giọng + tốc độ): chạy lại không đốt lại quota, và
 * sửa một câu thì chỉ câu đó sinh lại.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const AUDIO_DIR = join(ROOT, 'remotion/public/audio');

const FN_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/tts-clip`
  : 'https://dciwkfdqhhddeymlisey.supabase.co/functions/v1/tts-clip';

/**
 * Khoá gọi hàm edge. Ưu tiên biến môi trường; không có thì dùng anon key công
 * khai của project (chính là key nằm sẵn trong mã client của site, không phải
 * bí mật). Hàm edge có trần 600 ký tự mỗi lượt để hạn chế thiệt hại nếu ai đó
 * dùng bừa — nhưng nếu hàm này còn sống lâu dài thì nên đặt `CLIP_TTS_SECRET`.
 */
const KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/**
 * Đo thời lượng mp3.
 *
 * Vbee trả mp3 CBR 128kbps nên kích thước chia cho 16.000 ra số giây — nhưng
 * thẻ ID3 (nếu có) làm lệch vài phần trăm giây. Dùng bộ phân tích thật của
 * Remotion cho chắc; hỏng thì mới rơi về phép chia.
 */
async function measure(path, bytes) {
  try {
    const { parseMedia } = await import(
      join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/index.mjs')
    );
    const { nodeReader } = await import(
      join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/node.mjs')
    );
    const r = await parseMedia({
      src: path,
      reader: nodeReader,
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    if (r.durationInSeconds) return r.durationInSeconds;
  } catch {
    /* rơi về phép chia bên dưới */
  }
  return bytes / 16000;
}

/**
 * @returns {Promise<{file:string, seconds:number, cached:boolean}>}
 *   `file` là đường dẫn TƯƠNG ĐỐI so với `remotion/public/` — đúng thứ
 *   `staticFile()` của Remotion cần.
 */
/**
 * Tốc độ đọc mặc định.
 *
 * ⚠️ 1.15 chứ KHÔNG phải 0.9 như pipeline vấn đáp. Hai loại nội dung khác hẳn
 * nhau: video vấn đáp là nghe thủng thẳng vài phút, còn clip TikTok phải dồn —
 * bản dựng đầu ở 0.9 nghe buồn ngủ, và trên TikTok buồn ngủ nghĩa là bị lướt.
 */
export const CLIP_SPEED = '1.15';

export async function ttsScene(text, { voice = '', speed = CLIP_SPEED } = {}) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const key = hash(`${text}|${voice}|${speed}`);
  const rel = `audio/${key}.mp3`;
  const abs = join(AUDIO_DIR, `${key}.mp3`);

  if (existsSync(abs)) {
    const { statSync } = await import('fs');
    const bytes = statSync(abs).size;
    return { file: rel, seconds: await measure(abs, bytes), cached: true };
  }

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(process.env.CLIP_TTS_SECRET ? { 'x-clip-secret': process.env.CLIP_TTS_SECRET } : {}),
    },
    body: JSON.stringify({ text, key, ...(voice ? { voice } : {}), speed }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.audio_url) {
    throw new Error(`TTS hỏng (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
  }

  const bin = Buffer.from(await (await fetch(data.audio_url)).arrayBuffer());
  writeFileSync(abs, bin);
  return { file: rel, seconds: await measure(abs, bin.length), cached: false };
}
