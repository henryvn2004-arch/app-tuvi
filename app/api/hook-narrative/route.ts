// app/api/hook-narrative/route.ts
// POST /api/hook-narrative — "tầng hook kể chuyện", dùng CHUNG cho mọi tool có
// tầng hook (`public/tools-shared/hook-layer.js`). Đây là lớp NÓI THÊM đặt
// LÊN TRÊN facts deterministic đã có (`HookFacts.*` phía client) — KHÔNG thay
// thế chúng: hết quota/lỗi mạng/parse hỏng → trả `{allowed:false}`, client tự
// lùi về khối hkl-fact cũ (xem hook-layer.js `mount()`), KHÔNG báo lỗi.
//
// Route CHỦ ĐỘNG generic theo `facts` chứ không đọc riêng lá số của tool nào —
// cùng một bộ facts (đã chốt bởi `HookFacts.*` của tool đó) thì luôn ra cùng
// một nội dung, nên khoá cache băm THẲNG trên (`toolId` + `facts`), không cần
// biết laSoText/birth. Nhờ vậy route này dùng lại được cho MỌI tool sau này mà
// không phải sửa file này.
//
// 60 → 300: cùng lý do các route LLM khác trong repo (llmTextFull tự thử tuần
// tự 3 provider trước khi coi là hỏng).
export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { ok, err, options, parseBody } from '@/lib/cors';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logLlmParseFail } from '@/lib/agent/usage';
import { previewGate, previewIpHash } from '@/lib/billing/anon-preview';
import { previewCacheGet, previewCachePut } from '@/lib/llm/preview-cache';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { parseLlmJson } from '@/lib/llm/json';
import { HOOK_NARRATIVE_SYSTEM, HOOK_NARRATIVE_SCHEMA, buildHookNarrativePrompt, type HookFactInput } from '@/lib/agent/hook-prompt';

const TONES = new Set(['good', 'bad', 'neutral']);
const MIN_FACTS = 2;
const MAX_FACTS = 3;

function clean(v: unknown, max: number): string {
  return String(v == null ? '' : v)
    .replace(/[\r\n`<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function validRawFacts(v: unknown): v is Record<string, unknown>[] {
  if (!Array.isArray(v) || v.length < MIN_FACTS || v.length > MAX_FACTS) return false;
  return v.every((f) => {
    if (!f || typeof f !== 'object') return false;
    const r = f as Record<string, unknown>;
    return typeof r.title === 'string' && r.title.trim() && typeof r.body === 'string' && r.body.trim() && TONES.has(r.tone as string);
  });
}

function cleanFacts(raw: Record<string, unknown>[]): HookFactInput[] {
  return raw.map((f) => ({
    title: clean(f.title, 120),
    body: clean(f.body, 240),
    tone: f.tone as HookFactInput['tone'],
    caption: f.caption ? clean(f.caption, 60) : undefined,
  }));
}

interface HookNarrativeBox {
  tieuDe: string;
  hookNgan: string;
  moTa: string;
}
interface HookNarrativeResult {
  tagHook: string;
  hookTitleLine1: string;
  hookTitleLine2: string;
  hookTitleHighlight: string;
  introText: string;
  quoteHook: string;
  boxes: HookNarrativeBox[];
}

/**
 * Vừa KIỂM SHAPE vừa CẮT CHUỖI trong một bước — model trả sai shape (thiếu
 * khoá, sai số box) thì trả `null`, nơi gọi tự thử lại / rơi về `allowed:false`.
 */
function parseHookResult(raw: unknown, wantBoxes: number): HookNarrativeResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const boxesRaw = r.boxes;
  if (!Array.isArray(boxesRaw) || boxesRaw.length !== wantBoxes) return null;
  const boxes: HookNarrativeBox[] = [];
  for (const b of boxesRaw) {
    if (!b || typeof b !== 'object') return null;
    const bo = b as Record<string, unknown>;
    const tieuDe = clean(bo.tieuDe, 40);
    const hookNgan = clean(bo.hookNgan, 160);
    const moTa = clean(bo.moTa, 240);
    if (!tieuDe || !hookNgan || !moTa) return null;
    boxes.push({ tieuDe, hookNgan, moTa });
  }
  const hookTitleLine1 = clean(r.hookTitleLine1, 120);
  const quoteHook = clean(r.quoteHook, 160);
  if (!hookTitleLine1 || !quoteHook) return null;
  return {
    tagHook: clean(r.tagHook, 24) || 'Tổng quan nhanh',
    hookTitleLine1,
    hookTitleLine2: clean(r.hookTitleLine2, 120),
    hookTitleHighlight: clean(r.hookTitleHighlight, 140),
    introText: clean(r.introText, 240),
    quoteHook,
    boxes,
  };
}

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  const toolId = clean(body.toolId, 40);
  const toolLabel = clean(body.toolLabel, 60) || toolId;
  if (!toolId || !validRawFacts(body.facts)) return err('Thiếu hoặc sai dữ kiện.', 400);
  const facts = cleanFacts(body.facts);

  // Băm trên (toolId, facts) — CỐ Ý không dùng `previewKey` (khoá đó đòi
  // laSoText/namXem/hoTen, hình dạng riêng của tool "laso"). Cùng facts luôn
  // ra cùng nội dung bất kể tool nào gửi tới, nên khoá theo đúng thứ quyết
  // định nội dung.
  const cacheKey = createHash('sha256')
    .update(`hook-narrative|${toolId}|${JSON.stringify(facts)}`)
    .digest('hex');

  const hit = await previewCacheGet(cacheKey);
  if (hit) {
    try {
      return ok({ ...(JSON.parse(hit) as HookNarrativeResult), allowed: true, cached: true });
    } catch (e) {
      console.error('[hook-narrative] cache hỏng, dựng lại:', (e as Error)?.message);
    }
  }

  const auth = await authUserFromRequest(request);
  const pKey = 'error' in auth ? clean(body.anonId, 80) : auth.user.id;
  const gate = await previewGate(pKey, previewIpHash(request), toolId);
  if (!gate.allowed) return ok({ allowed: false, reason: gate.reason });

  const prompt = buildHookNarrativePrompt(toolLabel, facts);
  const ask = async (nudge: boolean) => {
    try {
      return await llmTextFull({
        system: HOOK_NARRATIVE_SYSTEM,
        prompt:
          prompt +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: HOOK_NARRATIVE_SCHEMA,
        // Khối nhỏ (1 câu mở + N box ngắn) — 1200 dư cho cả retry.
        maxTokens: 1200,
        // System GIỐNG HỆT nhau ở MỌI lượt gọi route này (mọi tool, mọi lá
        // số) — không phải "lặp lại cùng lá số" như luận giải 24 phần, nhưng
        // vẫn là chuỗi cố định lặp lại nhiều lượt nên bật cache có lợi.
        cacheSystem: true,
      });
    } catch (e) {
      console.error('[hook-narrative] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  let res = await ask(false);
  if (!res) return ok({ allowed: false, reason: 'llm_error' });
  let parsed = parseHookResult(parseLlmJson(res.text), facts.length);

  if (!parsed) {
    const t = String(res.text || '');
    console.error(`[hook-narrative] parse hỏng (len=${t.length}) — thử lại`);
    void logLlmParseFail(toolId, res.model, t, 1);
    res = await ask(true);
    if (!res) return ok({ allowed: false, reason: 'llm_error' });
    parsed = parseHookResult(parseLlmJson(res.text), facts.length);
  }

  void logLlmUsage(
    toolId,
    res.model,
    {
      input_tokens: res.usage.input_tokens,
      output_tokens: res.usage.output_tokens,
      cache_creation_input_tokens: res.usage.cache_creation_input_tokens,
      cache_read_input_tokens: res.usage.cache_read_input_tokens,
    },
    res.durationMs,
  );

  if (!parsed) {
    const t = String(res.text || '');
    console.error(`[hook-narrative] parse hỏng LẦN 2 (len=${t.length})`);
    void logLlmParseFail(toolId, res.model, t, 2);
    return ok({ allowed: false, reason: 'parse_error' });
  }

  previewCachePut({ key: cacheKey, toolId, phan: -1, text: JSON.stringify(parsed) });
  return ok({ ...parsed, allowed: true, cached: false });
}
