// lib/llm/complete.ts
// ============================================================
// Helper LLM DÙNG CHUNG cho các route STANDALONE (không qua runAgent):
// cron, tuong-mat, phong-thuy, tubinh, xem-tuoi, lasotuvi...
//
// Gemini-PRIMARY + Anthropic-BACKUP: provider chính đọc từ app_config
// 'chat.standalone_provider' (mặc định 'gemini'); nếu provider chính lỗi
// → tự thử provider kia. Giữ Anthropic làm backup switch-được (đổi config
// 'anthropic' để đảo lại khi đã nạp credit).
//
// Hiện hỗ trợ NON-STREAM text (+ ảnh vision). Streaming + tool-call cho các
// route phức tạp (lasotuvi) làm ở bước sau.
// ============================================================

import { getChatConfig } from '@/lib/config/appConfig';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

export interface LlmImage {
  data: string; // base64 (không kèm data: prefix)
  mediaType?: string; // vd 'image/jpeg'
}
export interface LlmTextOpts {
  system?: string;
  prompt: string;
  images?: LlmImage[];
  maxTokens?: number;
}

async function geminiText(o: LlmTextOpts, maxTokens: number): Promise<string> {
  if (!GEMINI_KEY) throw new Error('gemini: thiếu GEMINI_API_KEY');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  for (const im of o.images || []) {
    parts.push({ inline_data: { mime_type: im.mediaType || 'image/jpeg', data: im.data } });
  }
  parts.push({ text: o.prompt });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
  };
  if (o.system) body.system_instruction = { parts: [{ text: o.system }] };
  const url = `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (j?.candidates?.[0]?.content?.parts as any[] | undefined)?.map((p) => p.text).filter(Boolean).join('') || '';
  if (!t) throw new Error('gemini: completion rỗng');
  return t;
}

async function anthropicText(o: LlmTextOpts, maxTokens: number): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error('anthropic: thiếu ANTHROPIC_API_KEY');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];
  for (const im of o.images || []) {
    content.push({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } });
  }
  content.push({ type: 'text', text: o.prompt });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: content.length === 1 ? o.prompt : content }],
  };
  if (o.system) body.system = o.system;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (j?.content as any[] | undefined)?.map((b) => b.text).filter(Boolean).join('') || '';
  if (!t) throw new Error('anthropic: completion rỗng');
  return t;
}

/**
 * Sinh text (non-stream) qua provider chính, tự fallback provider kia nếu lỗi.
 * Trả về text thuần (route tự parse/JSON như cũ).
 */
export async function llmText(o: LlmTextOpts): Promise<string> {
  const maxTokens = o.maxTokens ?? 2000;
  let primary = 'gemini';
  try {
    primary = (await getChatConfig()).standaloneProvider || 'gemini';
  } catch {
    /* getChatConfig không throw, nhưng phòng hờ → mặc định gemini */
  }
  const order = primary === 'anthropic' ? ['anthropic', 'gemini'] : ['gemini', 'anthropic'];
  let lastErr: unknown;
  for (const p of order) {
    try {
      if (p === 'gemini') return await geminiText(o, maxTokens);
      return await anthropicText(o, maxTokens);
    } catch (e) {
      lastErr = e;
      console.error(`[llmText] ${p} lỗi → thử backup:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error('llmText: không provider nào khả dụng');
}
