// lib/channels/voice.ts
// ============================================================
// TIN NHẮN THOẠI ở kênh chat → chữ. Khách Zalo (nhất là người lớn tuổi) nhắn
// voice rất nhiều; trước đây tin voice tới router với chữ rỗng và bị đáp
// "chỉ nhận chữ hoặc ảnh". Nay: tải file → Gemini chép lời → chạy như tin chữ.
// Trung lập kênh: adapter chỉ việc đưa URL file âm thanh vào đây.
// ============================================================

import { llmTranscribeAudio } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';

const AUDIO_MAX = 5 * 1024 * 1024; // 5MB ≈ vài phút voice — chặn payload phình

// Gemini nhận wav/mp3/aiff/aac/ogg/flac. CDN hay trả `application/octet-stream`
// nên đoán theo đuôi URL; không đoán được thì coi là AAC (định dạng voice phổ biến trên di động).
const EXT_MIME: Record<string, string> = {
  aac: 'audio/aac',
  m4a: 'audio/aac',
  mp4: 'audio/aac',
  mp3: 'audio/mp3',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  amr: 'audio/amr',
};

function audioMime(contentType: string, url: string): string {
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (ct.startsWith('audio/')) return ct;
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  return EXT_MIME[ext] || 'audio/aac';
}

/** Chép lời tin thoại. `null` = không tải/không nghe được (caller báo khách gõ chữ). */
export async function transcribeVoice(url: string, platform: string): Promise<string | null> {
  if (!url) return null;
  let mime = '';
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) {
      console.error(`[voice] ${platform} tải file thoại HTTP ${r.status}`);
      return null;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > AUDIO_MAX) {
      console.error(`[voice] ${platform} file thoại cỡ ${buf.length} byte — bỏ qua`);
      return null;
    }
    mime = audioMime(r.headers.get('content-type') || '', url);
    const res = await llmTranscribeAudio(buf.toString('base64'), mime);
    void logLlmUsage(`chat-voice-${platform}`, res.model, res.usage, res.durationMs);
    return res.text || null;
  } catch (e) {
    console.error(`[voice] ${platform} chép lời lỗi (mime=${mime || '?'}):`, (e as Error).message);
    return null;
  }
}
