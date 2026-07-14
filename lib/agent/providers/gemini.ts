// lib/agent/providers/gemini.ts
// ============================================================
// PROVIDER GEMINI (Google) — đường prose-thuần chạy SONG SONG với
// Anthropic (Sonnet). Mục tiêu: hạ chi phí cho các kịch bản NHẸ mà
// vẫn giữ tiếng Việt mượt. Bật/tắt từng tool qua app_config
// (`chat.provider_routes`) — KHÔNG cần deploy; lỗi bất kỳ ở
// request-time → THROW để run.ts tự fallback về Sonnet.
//
// GIỚI HẠN CÓ CHỦ ĐÍCH: đường này KHÔNG gọi function/tool và KHÔNG
// nhận ảnh — chỉ luận văn từ dữ liệu đã nhét sẵn trong `system`
// (các kịch bản data-driven). Lá số/luận-giải/bát-tự (tool-call) và
// vision KHÔNG bao giờ đi qua đây (guard GEMINI_PROSE_SCENARIOS).
// ============================================================

import { sse } from '@/lib/contract/v1';
import type { ChatConfig } from '@/lib/config/appConfig';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
// Mặc định Flash-Lite (rẻ nhất, ~97% rẻ hơn Sonnet, tiếng Việt vẫn mượt).
// Đổi model không cần sửa code: đặt env GEMINI_MODEL (vd 'gemini-2.5-flash').
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Kịch bản AN TOÀN cho Gemini: prose-thuần, dữ liệu đã tính sẵn, KHÔNG cần
// tool, KHÔNG ảnh. Guard CỨNG — dù DB cấu hình nhầm route sang 'gemini' cho
// laso/luan-giai/bat-tu/xem-tuong/phong-thuy thì vẫn KHÔNG rơi vào đây.
export const GEMINI_PROSE_SCENARIOS = new Set<string>([
  // Mệnh Lý / Huyền Học (đợt thí điểm đầu)
  'nap-am', 'kim-lau', 'ngu-hanh-ten', 'than-so-hoc', 'bat-trach', 'kinh-dich',
  // Lịch số (deterministic, data cấp sẵn)
  'hoang-dao', 'ngay-tot', 'luc-nham',
  // Tương hợp / tử bình / sinh con / đặt tên (data-driven, không tool)
  'xem-tuoi', 'xem-lam-an', 'tuong-hop', 'tu-binh',
  'xem-tuoi-sinh-con', 'chon-ngay-tot', 'dat-ten-con', 'dat-ten-dn',
]);

// Kịch bản VISION (đọc ảnh): nhân tướng qua ảnh mặt + phong thủy qua ảnh nhà.
// Gemini Flash-Lite đa phương thức → nhận ảnh base64 (inline_data). Đây là
// nhóm DUY NHẤT được phép có ảnh khi đi Gemini.
export const GEMINI_VISION_SCENARIOS = new Set<string>(['xem-tuong', 'phong-thuy']);

/**
 * Kịch bản này có nên đi Gemini không? Đúng khi: có key; nằm trong nhóm prose
 * HOẶC vision an toàn; ảnh CHỈ được phép ở nhóm vision; và route trong
 * app_config (hoặc _default) = 'gemini'. laso/luận-giải/bát-tự (không thuộc
 * nhóm nào) → luôn false → giữ Sonnet.
 */
export function geminiEligible(
  scenarioType: string,
  hasImages: boolean,
  routes: Record<string, string> | undefined,
): boolean {
  if (!GEMINI_KEY) return false;
  const inProse = GEMINI_PROSE_SCENARIOS.has(scenarioType);
  const inVision = GEMINI_VISION_SCENARIOS.has(scenarioType);
  if (!inProse && !inVision) return false;
  if (hasImages && !inVision) return false; // ảnh chỉ cho kịch bản vision
  const r = routes || {};
  const pick = r[scenarioType] || r._default || 'anthropic';
  return pick === 'gemini';
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_TRIES = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiContents(convo: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const m of convo) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      if (m.content) parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      // Block Anthropic → part Gemini: text giữ nguyên; ảnh base64
      // ({type:'image',source:{type:'base64',media_type,data}}) → inline_data.
      for (const b of m.content) {
        if (b.type === 'text' && b.text) {
          parts.push({ text: b.text });
        } else if (b.type === 'image' && b.source?.type === 'base64' && b.source.data) {
          parts.push({
            inline_data: { mime_type: b.source.media_type || 'image/jpeg', data: b.source.data },
          });
        }
      }
    }
    if (parts.length) out.push({ role, parts });
  }
  return out;
}

/**
 * Gọi Gemini, stream text về client theo ĐÚNG hợp đồng SSE (sse.text delta)
 * và tách dòng "SUGGEST: ..." y hệt streamFinal (Anthropic) → chip gợi ý khớp.
 *
 * Ném lỗi CHỈ ở request-time (trước khi gửi byte nào) → run.ts fallback sạch
 * về Sonnet. Lỗi giữa stream (hiếm) → dừng êm, không ném (tránh gửi trùng).
 *
 * @returns mảng suggestions (tối đa 4) để caller làm chip động.
 */
export async function streamGemini(
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convo: any[],
  cfg: ChatConfig,
  send: (s: string) => void,
): Promise<string[]> {
  const contents = toGeminiContents(convo);
  if (!contents.length) throw new Error('gemini: convo rỗng');

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      maxOutputTokens: cfg.maxTokens,
      temperature: 0.7,
      // thinkingBudget 0 = chế độ rẻ/nhanh nhất (không tốn token "suy nghĩ").
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const url =
    `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

  // ── Request (retry lỗi tạm thời). Lỗi ở đây = CHƯA gửi byte → an toàn ném. ──
  let resp: Response | null = null;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt === MAX_TRIES - 1) throw new Error('gemini fetch: ' + (e as Error).message);
      continue;
    }
    if (resp.ok) break;
    if (!RETRYABLE.has(resp.status) || attempt === MAX_TRIES - 1) {
      const errText = (await resp.text()).slice(0, 300);
      throw new Error(`gemini non-200: ${resp.status} — ${errText}`);
    }
    console.error(`[gemini] ${resp.status} (lần ${attempt + 1}/${MAX_TRIES}) — thử lại`);
  }
  if (!resp || !resp.ok || !resp.body) throw new Error('gemini: không có response body');

  // ── Stream + tách "SUGGEST:" (y hệt run.ts streamFinal) ──
  const MARKER = 'SUGGEST:';
  const GUARD = 24;
  let full = '';
  let sentLen = 0;
  let markerAt = -1;
  const flushSafe = () => {
    if (markerAt >= 0) return;
    const safe = full.length - GUARD;
    if (safe > sentLen) {
      send(sse.text({ delta: full.slice(sentLen, safe) }));
      sentLen = safe;
    }
  };
  const onText = (t: string) => {
    full += t;
    if (markerAt < 0) {
      const i = full.indexOf(MARKER);
      if (i >= 0) {
        markerAt = i;
        let cut = i;
        while (cut > sentLen && /\s/.test(full[cut - 1])) cut--;
        if (cut > sentLen) {
          send(sse.text({ delta: full.slice(sentLen, cut) }));
          sentLen = cut;
        }
      } else {
        flushSafe();
      }
    }
  };

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const evt = JSON.parse(json);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parts = evt?.candidates?.[0]?.content?.parts as any[] | undefined;
          if (parts) {
            for (const p of parts) if (typeof p.text === 'string') onText(p.text);
          }
        } catch {
          /* mảnh JSON dở — bỏ qua */
        }
      }
    }
  } catch (e) {
    // Lỗi GIỮA stream: đã có thể gửi text rồi → KHÔNG ném (tránh trùng với
    // fallback). Xả nốt phần an toàn rồi kết thúc êm.
    console.error('[gemini] lỗi giữa stream:', (e as Error).message);
  }

  // Hết stream: xả nốt đuôi nếu chưa gặp marker.
  if (markerAt < 0 && full.length > sentLen) {
    send(sse.text({ delta: full.slice(sentLen) }));
    sentLen = full.length;
  }
  // An toàn: nếu chưa gửi ký tự nào mà có nội dung (marker rơi đầu) → xả nguyên văn.
  if (sentLen === 0 && full.trim()) {
    send(sse.text({ delta: full }));
    return [];
  }

  if (markerAt < 0) return [];
  return full
    .slice(markerAt + MARKER.length)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}
