// lib/agent/run.ts
// ============================================================
// AGENT LOOP — "bộ não" dùng CHUNG cho mọi kênh (Contract v1).
//
// Tách khỏi app/api/v1/chat/route.ts để các adapter kênh khác
// (Telegram, Zalo OA, ...) gọi IN-PROCESS cùng một loop — không
// viết trùng, không self-HTTP. Signature giữ nguyên: runAgent(req,
// cfg, send) với send nhận chuỗi SSE đã format (lib/contract/v1).
//
// Web (/api/v1/chat) bọc send → ghi thẳng ra ReadableStream.
// Bot (Telegram) bọc send → gom các event 'text' thành 1 tin nhắn.
// ============================================================

import {
  sse,
  type ChatRequestV1,
  type ChatMessage,
  type ScenarioInput,
  type BirthParams,
} from '@/lib/contract/v1';
import { buildToolDefs, executeTool, newToolContext, type ProfilePort } from '@/lib/tools/registry';
import { computeLaso } from '@/lib/engine/laso';
import { computeTuBinh } from '@/lib/engine/tubinh';
import { computeSinhCon, computeChonNgay, computeDatTen } from '@/lib/engine/diachi';
// Template prompt + context formatter dùng CHUNG với /api/lasotuvi (một bộ não).
import { CHAT_SYSTEM_LASO, CHAT_SYSTEM_GENERAL, extractLasoContext, buildChatContext, focusHint } from '@/lib/agent/prompts';
import { TOOLS_INSTRUCTION } from '@/lib/agent/tools';
import { type ChatConfig } from '@/lib/config/appConfig';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const ANTHROPIC_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'prompt-caching-2024-07-31,extended-cache-ttl-2025-04-11',
};

// Mã lỗi TẠM THỜI của Anthropic (rate limit / quá tải / lỗi server) → đáng thử
// lại. Gọi qua fetch thô (không qua SDK) nên KHÔNG có auto-retry; tự retry ở
// đây để 1 cú 529 (overloaded) thoáng qua không làm hỏng cả lượt — nghi phạm
// chính khiến tin follow-up trả "gặp trục trặc".
const ANTHROPIC_RETRYABLE = new Set([429, 500, 502, 503, 529]);
const ANTHROPIC_MAX_TRIES = 3;

// POST lên Anthropic, thử lại khi gặp lỗi tạm thời (backoff 0.5s/1s). Trả về
// Response để caller tự đọc body (json/stream). Lỗi non-retryable hoặc thành
// công → trả ngay; hết lượt thử → trả Response cuối (caller xử lý non-ok).
async function postAnthropic(payload: unknown): Promise<Response> {
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < ANTHROPIC_MAX_TRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: ANTHROPIC_HEADERS,
      body: JSON.stringify(payload),
    });
    if (resp.ok || !ANTHROPIC_RETRYABLE.has(resp.status)) return resp;
    lastResp = resp;
    console.error(
      `[runAgent] Anthropic ${resp.status} (lần ${attempt + 1}/${ANTHROPIC_MAX_TRIES}) — thử lại`,
    );
  }
  return lastResp!;
}

// Log hiệu quả prompt-cache để theo dõi trên prod (xác nhận hit, bắt
// silent-invalidator). read>0 ở các lượt sau = cache đang trúng.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logCacheUsage(where: string, usage: any): void {
  if (!usage) return;
  const read = usage.cache_read_input_tokens ?? 0;
  const write = usage.cache_creation_input_tokens ?? 0;
  const uncached = usage.input_tokens ?? 0;
  console.log(`[runAgent.cache] ${where} read=${read} write=${write} uncached=${uncached}`);
}

// Số ảnh tối đa xử lý mỗi tin nhắn (chặn payload phình + chi phí).
const MAX_IMAGES_PER_MSG = 3;

// Hướng dẫn luận ẢNH — chèn vào system khi tin nhắn có ảnh. Gộp 2 nghiệp
// vụ ảnh (nhân tướng + phong thủy) vào CÙNG ô chat; model tự nhận diện.
const VISION_INSTRUCTION = `

=== XEM ẢNH (Nhân tướng học / Phong thủy) ===
Người dùng vừa GỬI ẢNH. Quan sát kỹ rồi luận đúng nghiệp vụ:
• Ảnh KHUÔN MẶT (nhân tướng): nhận xét tam đình (trán/mũi/cằm), ngũ quan (mắt, mũi, miệng, tai, lông mày), thần sắc, nốt ruồi/đặc điểm nổi bật → luận tính cách, sự nghiệp, tình duyên, tài lộc theo nhân tướng học Á Đông. Điềm đạm, có cơ sở; KHÔNG phán tuyệt đối hay hù dọa.
• Ảnh KHÔNG GIAN / NHÀ CỬA (phong thủy): nhận xét bố cục, hướng, ánh sáng, vật phẩm, điểm được và chưa được → gợi ý hóa giải, sắp đặt hợp phong thủy.
• Nếu KHÔNG rõ ảnh là mặt người hay không gian: mô tả những gì thấy rồi hỏi lại người dùng muốn xem theo hướng nào.
TUYỆT ĐỐI không bịa chi tiết không có trong ảnh. Ảnh mờ/thiếu sáng thì nói thẳng và xin ảnh rõ hơn.`;

// ── Agent loop ──────────────────────────────────────────────
export async function runAgent(
  req: ChatRequestV1,
  cfg: ChatConfig,
  send: (s: string) => void,
  profiles: ProfilePort | null = null,
): Promise<{
  toolsUsed: string[];
  birth: BirthParams | null;
  activeProfile: string | null;
  subjectSwitched: boolean;
}> {
  // Seed ctx với birth đang xem (req.birth) → "lưu lá số này tên X" chạy được cả
  // khi lượt này không gọi lại lap_la_so. profiles bật 3 tool sổ (kênh chat).
  const ctx = newToolContext(null, { profiles, birth: req.birth ?? null });
  const toolsUsed: string[] = [];
  // Birth đã biết (req.birth truyền sẵn) hoặc do agent lập qua tool lap_la_so
  // trong lượt này → trả về để adapter (Telegram) lưu theo phiên, đỡ hỏi lại.
  let capturedBirth: BirthParams | null = req.birth ?? null;

  // Câu hỏi mới nhất — để extractLasoContext khoanh cung liên quan.
  const lastQ = (req.messages as ChatMessage[])[req.messages.length - 1]?.content || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: any[];
  let system: string;
  // Gợi ý trọng tâm theo câu hỏi — nhét vào TIN NHẮN (không vào system) để
  // system mang full lá số giữ byte ổn định → prompt-cache trúng qua mọi lượt.
  let focusHintText = '';

  const scenario = req.scenario;
  if (scenario && scenario.type) {
    // ── Kịch bản PHI-LÁ-SỐ (Sprint 1.2): tương hợp, tử bình, sinh con,
    // chọn ngày, đặt tên. Dùng CHUNG buildChatContext (một bộ não) → prompt
    // + tool y hệt /api/lasotuvi; client gửi context đã tính sẵn trong
    // scenario.data. Không có lá số → ctx.ls null, tool chỉ còn xem_ngay_tot.
    let scn = scenario;
    // Sprint 1.3: TỬ BÌNH tính SERVER-SIDE từ birth (Zalo/native không cần
    // tự tính). Có birth → engine server lập bát tự, đè scenario.data; còn
    // không → dùng data client gửi (web có engine sẵn, vẫn chạy).
    if (scenario.type === 'tu-binh' && req.birth) {
      const tb = computeTuBinh(req.birth);
      if (tb.ok && tb.data) {
        scn = { ...scenario, data: tb.data as Record<string, unknown> };
      }
    }
    // Sprint 1.4: TƯƠNG HỢP (xem-tuoi/xem-lam-an) tính SERVER-SIDE — chỉ là
    // 2 lá số (computeLaso ×2, engine đã có, parity sẵn). Có birthA+birthB
    // trong data → server lập 2 lá số, đè data; còn không → dùng lsA/lsB
    // client gửi.
    if (scenario.type === 'xem-tuoi' || scenario.type === 'xem-lam-an') {
      const d = (scenario.data || {}) as Record<string, unknown>;
      if (d.birthA && d.birthB) {
        const a = computeLaso(d.birthA as BirthParams);
        const b = computeLaso(d.birthB as BirthParams);
        if (a.ok && a.ls && b.ok && b.ls) {
          scn = { ...scenario, data: { lsA: a.ls, lsB: b.ls, nameA: d.nameA, nameB: d.nameB } };
        }
      }
    }
    // Sprint 1.5: SINH CON / CHỌN NGÀY / ĐẶT TÊN — logic địa chi thuần
    // (lib/engine/diachi). Client gửi input thô → server dựng context-data.
    // compute* trả null nếu thiếu input thô → giữ data client (fallback).
    if (scenario.type === 'xem-tuoi-sinh-con') {
      const r = computeSinhCon(scenario.data || {});
      if (r) scn = { ...scenario, data: r };
    } else if (scenario.type === 'chon-ngay-tot') {
      const r = computeChonNgay(scenario.data || {});
      if (r) scn = { ...scenario, data: r };
    } else if (scenario.type === 'dat-ten-con') {
      const r = computeDatTen(scenario.data || {});
      if (r) scn = { ...scenario, data: r };
    }
    const bc = buildChatContext(scenarioToBody(scn, req.messages as ChatMessage[]));
    system = bc.systemForCall;
    tools = bc.tools;
  } else {
    // ── LÁ SỐ / GENERAL (Sprint 1.1): seed từ birth, prompt thương hiệu +
    // công cụ đầy đủ (lap_la_so, vận hạn, RAG). Dùng CHUNG extractLasoContext
    // với /api/lasotuvi → marker khớp prompt giàu.
    let lasoCtx = '';
    if (req.birth) {
      const res = computeLaso(req.birth);
      if (res.ok && res.ls) {
        ctx.ls = res.ls;
        // full=true: context TOÀN BỘ lá số, ĐỘC LẬP câu hỏi → system byte ổn
        // định cả phiên để prompt-cache trúng (trước đây nhét câu hỏi vào
        // system qua extractLasoContext(ls, lastQ) → cache vỡ mỗi tin).
        lasoCtx = extractLasoContext(res.ls, '', { full: true });
        focusHintText = focusHint(lastQ);
      }
    }
    const hasLaso = !!ctx.ls;

    // Prompt: LUÔN dùng TEMPLATE chung lib/agent/prompts (một nguồn với
    // /api/lasotuvi — sửa hình dạng/luật luận 1 chỗ; chứa shape 3 lớp +
    // luật vận hạn theo tầng + độ dài chuẩn). app_config.chat.system_prompt
    // (nếu có) KHÔNG còn thay thế template mà chèn vào như LỚP TÔNG (persona)
    // — chỉnh giọng văn trong DB không cần deploy, shape vẫn được giữ.
    const tone = cfg.systemPrompt
      ? `TÔNG/PHONG CÁCH (tùy chỉnh — CHỈ đổi giọng văn, KHÔNG đổi hình dạng/độ dài/luật luận bên dưới):\n${cfg.systemPrompt}`
      : undefined;
    system = hasLaso
      ? CHAT_SYSTEM_LASO(lasoCtx, undefined, tone)
      : CHAT_SYSTEM_GENERAL(undefined, tone);
    system += '\n\n' + timeContext(); // thời gian chuẩn múi giờ VN (đè bản inline của template)
    system += TOOLS_INSTRUCTION(hasLaso, !!profiles);
    tools = buildToolDefs(!!profiles);
  }

  // Có ảnh trong bất kỳ tin user nào → bật hướng dẫn luận ảnh (vision).
  const hasImages = (req.messages as ChatMessage[]).some(
    (m) => m.role === 'user' && Array.isArray(m.images) && m.images.length > 0,
  );
  if (hasImages) system += VISION_INSTRUCTION;

  // Map về định dạng Anthropic. Tin user có ảnh → content là MẢNG block
  // (image trước, text sau); còn lại giữ string cho gọn. Model đa phương
  // thức (sonnet) đọc trực tiếp ảnh base64.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = (req.messages as ChatMessage[]).slice(-10).map((m) => {
    const text = String(m.content).slice(0, 2000);
    const imgs = m.role === 'user' && Array.isArray(m.images) ? m.images : [];
    if (imgs.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks: any[] = imgs.slice(0, MAX_IMAGES_PER_MSG).map((im) => ({
        type: 'image',
        source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data },
      }));
      if (text) blocks.push({ type: 'text', text });
      else blocks.push({ type: 'text', text: 'Nhờ thầy xem giúp ảnh này.' });
      return { role: m.role, content: blocks };
    }
    return { role: m.role, content: text };
  });

  // Nhét gợi ý trọng tâm vào CUỐI tin user mới nhất (không vào system, để
  // system giữ ổn định cho cache). Xử lý cả content chuỗi lẫn mảng block (ảnh).
  if (focusHintText && convo.length) {
    const last = convo[convo.length - 1];
    if (last?.role === 'user') {
      if (typeof last.content === 'string') {
        last.content = last.content + '\n\n' + focusHintText;
      } else if (Array.isArray(last.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tb = last.content.find((b: any) => b.type === 'text');
        if (tb) tb.text += '\n\n' + focusHintText;
        else last.content.push({ type: 'text', text: focusHintText });
      }
    }
  }

  send(sse.status({ text: hasImages ? 'Đang xem ảnh...' : 'Đang suy xét...' }));

  for (let round = 0; round <= cfg.maxRounds; round++) {
    const lastRound = round === cfg.maxRounds;

    // Vòng cuối: ép trả lời, stream text trực tiếp.
    if (lastRound) {
      await streamFinal(system, convo, tools, cfg, send);
      break;
    }

    const data = await callAnthropic(system, convo, tools, cfg, false);
    const content = data.content || [];

    if (data.stop_reason === 'tool_use') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUses = content.filter((b: any) => b.type === 'tool_use');
      convo.push({ role: 'assistant', content });

      const results = [];
      for (const tu of toolUses) {
        toolsUsed.push(tu.name);
        // Agent vừa lập lá số từ text → ghi lại birth để phiên sau dùng thẳng.
        if (tu.name === 'lap_la_so' && tu.input) capturedBirth = toBirth(tu.input);
        const run = await executeTool(tu.name, tu.input || {}, ctx);
        send(sse.toolCall({ name: tu.name, args: safeArgs(tu.input) }));
        send(sse.status({ text: run.label }));
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: run.content });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    // Model trả lời thẳng (không tool) — stream lại cho mượt thay vì
    // dồn một cục: gọi vòng stream cuối với chính ngữ cảnh hiện tại.
    await streamFinal(system, convo, tools, cfg, send);
    break;
  }

  // ctx.birth phản ánh lá số đang xem cuối lượt (mo_la_so có thể đã đổi sang lá
  // số khác) → ưu tiên nó. activeProfile/subjectSwitched cho kênh lưu & reset thread.
  return {
    toolsUsed,
    birth: ctx.birth ?? capturedBirth,
    activeProfile: ctx.activeProfile,
    subjectSwitched: ctx.subjectSwitched,
  };
}

// Chuẩn hóa input tool lap_la_so → BirthParams (để lưu phiên Telegram).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBirth(input: any): BirthParams {
  return {
    day: Number(input.day),
    month: Number(input.month),
    year: Number(input.year),
    hourBranch: Number(input.hourBranch),
    gender: input.gender === 'nu' ? 'nu' : 'nam',
  };
}

// ── Gọi Anthropic (non-stream, để quyết định tool) ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropic(system: string, convo: any[], tools: any[], cfg: ChatConfig, toolChoiceNone: boolean): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    // TTL 1h: prefix (tools + system, gồm full lá số) giữ ấm qua khoảng nghĩ
    // giữa các tin (Telegram/WhatsApp thường > 5 phút) → follow-up đọc cache
    // 0.1× thay vì trả full. Cần beta 'extended-cache-ttl-2025-04-11'.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: convo,
  };
  if (tools.length) {
    payload.tools = tools;
    if (toolChoiceNone) payload.tool_choice = { type: 'none' };
  }
  const resp = await postAnthropic(payload);
  if (!resp.ok) {
    const body = (await resp.text()).slice(0, 500);
    // Log nguyên do (status + body) — trước đây throw bị core.ts nuốt im, log
    // Vercel rỗng nên không debug được tin follow-up "gặp trục trặc".
    console.error(`[runAgent.callAnthropic] Anthropic non-200: ${resp.status} — ${body}`);
    throw new Error('Anthropic error: ' + body);
  }
  const data = await resp.json();
  logCacheUsage('callAnthropic', data?.usage);
  return data;
}

// ── Vòng cuối: stream text về client ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamFinal(system: string, convo: any[], tools: any[], cfg: ChatConfig, send: (s: string) => void): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    stream: true,
    // TTL 1h: prefix (tools + system, gồm full lá số) giữ ấm qua khoảng nghĩ
    // giữa các tin (Telegram/WhatsApp thường > 5 phút) → follow-up đọc cache
    // 0.1× thay vì trả full. Cần beta 'extended-cache-ttl-2025-04-11'.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: convo,
  };
  if (tools.length) {
    payload.tools = tools;
    payload.tool_choice = { type: 'none' };
  }
  const resp = await postAnthropic(payload);
  if (!resp.ok) {
    const body = (await resp.text()).slice(0, 500);
    // Log nguyên do — trước đây chỉ gửi sse.error (kênh nuốt thành ERR_MSG),
    // không console.error nên log Vercel rỗng.
    console.error(`[runAgent.streamFinal] Anthropic non-200: ${resp.status} — ${body}`);
    send(sse.error({ code: 'internal', message: 'Anthropic error: ' + body }));
    return;
  }
  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const evt = JSON.parse(json);
        if (evt.type === 'message_start') logCacheUsage('streamFinal', evt.message?.usage);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          send(sse.text({ delta: evt.delta.text }));
        }
      } catch {
        /* ignore partial */
      }
    }
  }
}

// ── Thời gian thực (múi giờ VN) tiêm vào prompt ──────────────
// Không để trong app_config: prompt DB là text tĩnh, còn ngày phải
// tính mỗi request. LLM dùng đây để hiểu "năm nay / hôm nay".
function timeContext(): string {
  const now = new Date();
  const TZ = 'Asia/Ho_Chi_Minh';
  const dateStr = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(now);
  const year = new Intl.DateTimeFormat('en', { timeZone: TZ, year: 'numeric' }).format(now);
  return (
    `THÔNG TIN THỜI GIAN (server cung cấp, CHÍNH XÁC): Hôm nay là ngày ${dateStr}, năm hiện tại là ${year}. ` +
    `Khi user hỏi "năm nay/hôm nay là năm/ngày mấy" — trả lời thẳng theo đây, KHÔNG nói không biết. ` +
    `Khi user nói "năm nay" hãy hiểu là năm ${year}, "năm sau" là ${Number(year) + 1}; ` +
    `gọi công cụ tra vận hạn với đúng năm đó, không dùng năm mặc định khác.`
  );
}

// ── Map ScenarioInput → body cho buildChatContext (một bộ não) ──
// Mỗi kịch bản đẩy context qua đúng field mà extract* trong prompts.ts
// đang đọc — KHÔNG đổi shape so với /api/lasotuvi (giữ parity tuyệt đối).
const SCENARIO_FIELD: Record<string, string> = {
  'xem-tuoi': 'compatData',
  'xem-lam-an': 'compatData',
  'tu-binh': 'tuBinhData',
  'xem-tuoi-sinh-con': 'sinhConData',
  'chon-ngay-tot': 'chonNgayData',
  'dat-ten-con': 'datTenData',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scenarioToBody(scenario: ScenarioInput, messages: ChatMessage[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    toolType: scenario.type,
    messages,
    docs: scenario.docs,
    authorName: scenario.authorName,
    authorStyle: scenario.authorStyle,
  };
  const field = SCENARIO_FIELD[scenario.type];
  if (field) body[field] = scenario.data;
  return body;
}

// Chỉ giữ vài field an toàn để hiển thị nhãn tool_call cho client.
function safeArgs(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const o = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of ['nam', 'thang', 'ngay', 'viec', 'gender', 'year']) {
    if (o[k] != null) out[k] = o[k];
  }
  return out;
}
