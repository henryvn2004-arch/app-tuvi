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
// Mặc định Gemini 2.5 Flash — A/B cho thấy trung thành với dữ liệu lá số/cổ
// pháp (KHÔNG bịa sao, không lẫn miếu/hãm như Flash-Lite), tiếng Việt sát
// Sonnet; vẫn rẻ ~85% so Sonnet. Đổi model không cần sửa code: đặt env
// GEMINI_MODEL (vd 'gemini-2.5-flash-lite' cho tool nhẹ nếu muốn tiết kiệm thêm).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Kịch bản AN TOÀN cho Gemini: prose-thuần, dữ liệu đã tính sẵn, KHÔNG cần
// tool, KHÔNG ảnh. Guard CỨNG — dù DB cấu hình nhầm route sang 'gemini' cho
// laso/luan-giai/bat-tu/xem-tuong/phong-thuy thì vẫn KHÔNG rơi vào đây.
export const GEMINI_PROSE_SCENARIOS = new Set<string>([
  // Mệnh Lý / Huyền Học (đợt thí điểm đầu)
  'nap-am', 'kim-lau', 'ngu-hanh-ten', 'than-so-hoc', 'bat-trach', 'kinh-dich', 'mai-hoa', 'ky-mon',
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

/**
 * Kịch bản này có ĐI ĐƯỢC Gemini prose không, BỎ QUA cấu hình route?
 *
 * Khác `geminiEligible` ở đúng một chỗ: không đọc `providerRoutes`. Dùng cho
 * FALLBACK KHẨN CẤP khi Anthropic chết (hết credit, 5xx kéo dài) — lúc đó
 * "route nói dùng Anthropic" không còn nghĩa lý gì, cái cần biết chỉ là đường
 * Gemini có xử lý nổi kịch bản này không. Các guard an toàn (prose/vision,
 * ảnh chỉ cho vision) GIỮ NGUYÊN — fallback không được phép phá chúng.
 */
export function geminiProseCapable(scenarioType: string, hasImages: boolean): boolean {
  if (!GEMINI_KEY) return false;
  const inProse = GEMINI_PROSE_SCENARIOS.has(scenarioType);
  const inVision = GEMINI_VISION_SCENARIOS.has(scenarioType);
  if (!inProse && !inVision) return false;
  if (hasImages && !inVision) return false;
  return true;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_TRIES = 3;

// Chuyển convo (message Anthropic: {role, content: string | blocks}) → Gemini
// contents ({role:'user'|'model', parts:[{text}|{inline_data}]}). Dùng chung
// cho cả luồng prose lẫn function-calling (laso).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGeminiContents(convo: any[]): any[] {
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

// ============================================================
// FUNCTION-CALLING — cho luồng LÁ SỐ (luận-giải / lá-số), tool-call thật.
// Đây là nhóm "vương miện" có paywall: mặc định GIỮ Sonnet (appConfig
// providerRoutes 'laso'='anthropic'). Chỉ chạy Gemini khi admin flip route
// sang 'gemini' qua app_config — revert 1 dòng, không deploy. run.ts còn có
// fallback về Sonnet khi Gemini lỗi ở request-time (chưa stream gì).
// ============================================================

// Kịch bản dùng TOOL (chỉ 'laso' — luận-giải/lá-số). KHÔNG gộp vào
// GEMINI_PROSE_SCENARIOS vì đường này cần function-calling, không phải prose.
export const GEMINI_TOOLS_SCENARIOS = new Set<string>(['laso']);

export function geminiToolsEligible(
  scenarioType: string,
  hasImages: boolean,
  routes: Record<string, string> | undefined,
): boolean {
  if (!GEMINI_KEY) return false;
  if (hasImages) return false; // luồng lá số có ảnh → giữ Sonnet cho chắc
  if (!GEMINI_TOOLS_SCENARIOS.has(scenarioType)) return false;
  const r = routes || {};
  // KHÔNG rơi về r._default — vương miện chỉ đi Gemini khi admin CHỦ ĐỘNG
  // flip đúng key scenarioType (vd routes.laso='gemini'). Trước đây fallback
  // qua _default khiến chat.provider_routes={_default:'gemini'} (đặt để bật
  // Gemini cho nhóm prose) vô tình kéo luôn laso — vương miện có paywall —
  // sang Gemini ngoài ý muốn.
  const pick = r[scenarioType] || 'anthropic';
  return pick === 'gemini';
}

/** Bản BỎ QUA route của `geminiToolsEligible` — xem ghi chú ở
 *  `geminiProseCapable`. Chỉ dùng cho fallback khẩn cấp khi Anthropic chết. */
export function geminiToolsCapable(scenarioType: string, hasImages: boolean): boolean {
  if (!GEMINI_KEY) return false;
  if (hasImages) return false;
  return GEMINI_TOOLS_SCENARIOS.has(scenarioType);
}

// JSON Schema (Anthropic input_schema) → Schema an toàn cho Gemini (OpenAPI
// subset): giữ type/description/enum/items/properties(đệ quy)/required, bỏ field
// lạ (additionalProperties, $schema...) để Gemini không từ chối.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeGeminiSchema(s: any): any {
  if (!s || typeof s !== 'object') return s;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  if (s.type) out.type = s.type;
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.items) out.items = sanitizeGeminiSchema(s.items);
  if (s.properties && typeof s.properties === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out.properties = {} as any;
    for (const [k, v] of Object.entries(s.properties)) out.properties[k] = sanitizeGeminiSchema(v);
  }
  if (Array.isArray(s.required) && s.required.length) out.required = s.required;
  return out;
}

// Tool Anthropic ([{name,description,input_schema}]) → Gemini functionDeclarations.
// Tool KHÔNG tham số (properties rỗng) → bỏ 'parameters' (Gemini hiểu là no-arg).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGeminiTools(anthropicTools: any[]): any[] {
  if (!anthropicTools?.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decls = anthropicTools.map((t: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = { name: t.name, description: t.description };
    const props = t.input_schema?.properties;
    if (props && Object.keys(props).length) d.parameters = sanitizeGeminiSchema(t.input_schema);
    return d;
  });
  return [{ functionDeclarations: decls }];
}

/**
 * Một lượt STREAM Gemini có function-calling. Stream text về client (tách
 * SUGGEST y hệt) + gom functionCall nếu model gọi tool. Trả:
 *  - functionCalls: [{name,args}] để run.ts chạy tool
 *  - modelParts: parts để append làm 'model' turn (giữ ngữ cảnh cho vòng sau)
 *  - suggestions, sentText (có stream chữ nào chưa — để quyết fallback)
 * Ném lỗi CHỈ ở request-time (chưa stream gì) → run.ts fallback Sonnet sạch.
 */
export async function streamGeminiTurn(
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geminiTools: any[] | null,
  cfg: ChatConfig,
  send: (s: string) => void,
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionCalls: { name: string; args: any }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelParts: any[];
  suggestions: string[];
  sentText: boolean;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: cfg.maxTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
  };
  if (geminiTools && geminiTools.length) body.tools = geminiTools;
  const url =
    `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

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
      const t = (await resp.text()).slice(0, 300);
      throw new Error(`gemini non-200: ${resp.status} — ${t}`);
    }
  }
  if (!resp || !resp.ok || !resp.body) throw new Error('gemini: không có response body');

  const MARKER = 'SUGGEST:';
  const GUARD = 24;
  let full = '';
  let sentLen = 0;
  let markerAt = -1;
  let sentText = false;
  const flushSafe = () => {
    if (markerAt >= 0) return;
    const safe = full.length - GUARD;
    if (safe > sentLen) {
      send(sse.text({ delta: full.slice(sentLen, safe) }));
      sentLen = safe;
      sentText = true;
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
          sentText = true;
        }
      } else {
        flushSafe();
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const functionCalls: { name: string; args: any }[] = [];
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
            for (const p of parts) {
              if (typeof p.text === 'string') onText(p.text);
              else if (p.functionCall) {
                functionCalls.push({ name: p.functionCall.name, args: p.functionCall.args || {} });
              }
            }
          }
        } catch {
          /* mảnh JSON dở — bỏ qua */
        }
      }
    }
  } catch (e) {
    console.error('[gemini-tools] lỗi giữa stream:', (e as Error).message);
  }

  if (markerAt < 0 && full.length > sentLen) {
    send(sse.text({ delta: full.slice(sentLen) }));
    sentLen = full.length;
    sentText = true;
  }
  let suppress = false;
  if (sentLen === 0 && full.trim() && !functionCalls.length) {
    send(sse.text({ delta: full }));
    sentText = true;
    suppress = true;
  }

  // modelParts = text (nếu có) + functionCall(s) — để append làm 'model' turn.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelParts: any[] = [];
  if (full.trim()) modelParts.push({ text: full });
  for (const fc of functionCalls) modelParts.push({ functionCall: { name: fc.name, args: fc.args } });

  const suggestions =
    suppress || markerAt < 0
      ? []
      : full
          .slice(markerAt + MARKER.length)
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4);

  return { functionCalls, modelParts, suggestions, sentText };
}
