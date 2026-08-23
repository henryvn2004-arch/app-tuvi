// app/api/lasotuvi/route.ts
// 60 → 300: Kimi K3 primary + Opus 5 backup-1 + Gemini Flash backup-2 (chốt
// Henry 2026-08-20) nghĩa là MỘT lượt có thể thử tới 3 provider TUẦN TỰ
// (mỗi provider tự retry lỗi tạm thời trước khi coi là hỏng), cộng thêm trần
// token vừa nâng 50% cùng đợt → 60s không còn đủ, dễ ăn timeout của Vercel
// (trả về trang lỗi nền tảng "An error occurred..." — KHÔNG PHẢI JSON, làm
// client vỡ khi JSON.parse). Đồng bộ với các route LLM nặng khác đã ở 300.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody, CORS_HEADERS } from '@/lib/cors';
// Lõi dùng chung — trích sang lib/agent (một bộ não).
import { execLasoTool, toolLabel } from '@/lib/agent/tools';
import { buildChatContext, nguoiXemLine } from '@/lib/agent/prompts';
// Prompt bản luận giải 24 phần — DỜI sang lib để tool "Vận Hạn 12 Tháng
// Tới" dùng lại đúng 4 phần đầu mà không chép bản thứ hai (Next chặn export
// lạ trong route file). Xem lib/agent/luan-giai-doc.ts.
import { buildPromptCached } from '@/lib/agent/luan-giai-doc';
// LLM Gemini-primary + Anthropic-backup (provider từ app_config
// 'chat.standalone_provider'). callLLMTools trả shape Anthropic → giữ nguyên
// vòng lặp tool bên dưới; llmTextFull cho luận 24 phần (phan) — bản `Full` để
// lấy được usage + thời lượng, xem chú thích tại chỗ gọi.
import { llmTextFull, callLLMTools } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { withToolOutcome } from '@/lib/ops/tool-outcome';

// ─── LLM client (Gemini-primary + Anthropic-backup) ────────────
// Trả shape Anthropic ({content, stop_reason, usage}) dù provider nào → vòng
// lặp tool phía dưới KHÔNG đổi.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callLLM(system: any, convo: any[], tools: any[], toolChoiceNone = false, maxTokens = 2250): Promise<any> {
  return callLLMTools(system, convo, tools, toolChoiceNone, maxTokens);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(content: any[]): string {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// ─── Cộng dồn chi phí một LƯỢT chat (kể cả các vòng tool-use) ──
// Đường rail cũ này đi qua callLLMTools trong VÒNG LẶP, nên phải cộng dồn rồi
// ghi MỘT dòng cuối lượt — y như runAgent (lib/agent/run.ts) làm cho /api/v1/chat.
// Ghi từng vòng thì một câu hỏi của người dùng nở ra 2–4 dòng `llm_usage`, đếm
// "số lượt" ở panel Biên LN thành vô nghĩa.
class ChatUsageTally {
  private readonly t0 = Date.now();
  private model = '';
  private readonly u = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  private rounds = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(data: any): void {
    if (!data) return;
    // Giữ model của vòng GẦN NHẤT: fallback provider có thể xảy ra giữa chừng.
    if (data.model) this.model = data.model;
    this.u.input_tokens += data.usage?.input_tokens || 0;
    this.u.output_tokens += data.usage?.output_tokens || 0;
    this.u.cache_creation_input_tokens += data.usage?.cache_creation_input_tokens || 0;
    this.u.cache_read_input_tokens += data.usage?.cache_read_input_tokens || 0;
    this.rounds += 1;
  }

  get plain() {
    return { input_tokens: this.u.input_tokens, output_tokens: this.u.output_tokens, rounds: this.rounds };
  }

  /** Lượt hỏng trước khi gọi được provider nào → KHÔNG ghi dòng chi phí 0đ. */
  flush(toolId: string): void {
    if (!this.rounds || !this.model) return;
    void logLlmUsage(toolId, this.model, this.u, Date.now() - this.t0);
  }
}

// Bucket chi phí của lượt rail. CỐ Ý *không* dùng 'laso' cho lượt chat có lá số:
// 'laso' là tool_id của Luận Giải 24 phần (1.500 Lượng) — trộn vào là bóp méo
// đúng con số biên LN vừa vá. Lượt rail thu tiền qua `credit_transactions
// .type='chat'`, nên bucket chi phí phải là 'chat' thì hai vế mới ghép được.
// Kịch bản phi-lá-số giữ nguyên tên tool (mirror `scenario?.type` của run.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chatUsageToolId(body: any, hasLaso: boolean): string {
  const t = body?.toolType;
  return hasLaso || !t || t === 'laso' ? 'chat' : String(t);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const { systemForCall, tools, maxTokens, lasoDataForTools } = buildChatContext(body);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const MAX_ROUNDS = 3;
  const toolsUsed: string[] = [];
  let finalText = '';
  const tally = new ChatUsageTally();
  const hasLaso = !!(lasoDataForTools?.palaces?.length);
  const usageToolId = chatUsageToolId(body, hasLaso);

  try {
    for (let round = 0; round <= MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS;
      const data = await callLLM(systemForCall, convo, tools, lastRound, maxTokens);
      const content = data.content || [];
      tally.add(data);

      if (data.stop_reason === 'tool_use' && !lastRound) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolUses = content.filter((b: any) => b.type === 'tool_use');
        convo.push({ role: 'assistant', content });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = toolUses.map((tu: any) => {
          toolsUsed.push(tu.name);
          const resultText = execLasoTool(tu.name, lasoDataForTools, tu.input);
          return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
        });
        convo.push({ role: 'user', content: results });
        continue;
      }

      finalText = textOf(content);
      break;
    }
  } catch (e: unknown) {
    // Token của các vòng ĐÃ chạy là chi phí thật dù lượt hỏng — vẫn ghi sổ.
    tally.flush(usageToolId);
    return err((e as Error).message);
  }

  tally.flush(usageToolId);
  const toolType = body.toolType || 'laso';
  return ok({
    answer: finalText || 'Xin lỗi, có lỗi xảy ra.',
    scenario: hasLaso ? 'laso' : toolType,
    toolsUsed,
    usage: tally.plain,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChatStream(body: any): Promise<Response> {
  const { messages } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const { systemForCall, tools, maxTokens, lasoDataForTools } = buildChatContext(body);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  function send(obj: object) {
    writer.write(enc.encode('data: ' + JSON.stringify(obj) + '\n\n'));
  }

  const tally = new ChatUsageTally();
  const usageToolId = chatUsageToolId(body, !!(lasoDataForTools?.palaces?.length));

  (async () => {
    const MAX_ROUNDS = 3;
    const toolsUsed: string[] = [];

    try {
      for (let round = 0; round <= MAX_ROUNDS; round++) {
        const lastRound = round === MAX_ROUNDS;

        if (lastRound) {
          // Vòng chốt: buộc trả text (không tool). Gemini generateContent không
          // stream token-by-token qua đây → gửi 1 khối text (frontend cộng dồn
          // như thường). Giữ đúng shape event {type:'text'} / {type:'error'}.
          try {
            const data = await callLLM(systemForCall, convo, tools, true, maxTokens);
            tally.add(data);
            const text = textOf(data.content || []);
            if (text) send({ type: 'text', text });
          } catch (e: unknown) {
            send({ type: 'error', message: (e as Error).message });
          }
          break;
        }

        const data = await callLLM(systemForCall, convo, tools, false, maxTokens);
        tally.add(data);
        const content = data.content || [];

        if (data.stop_reason === 'tool_use') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolUses = content.filter((b: any) => b.type === 'tool_use');
          convo.push({ role: 'assistant', content });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const results = toolUses.map((tu: any) => {
            toolsUsed.push(tu.name);
            send({ type: 'tool', name: tu.name, label: toolLabel(tu.name) });
            const resultText = execLasoTool(tu.name, lasoDataForTools, tu.input);
            return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
          });
          convo.push({ role: 'user', content: results });
          continue;
        }

        // Model answered without tools — emit the text we already have
        const text = textOf(content);
        if (text) send({ type: 'text', text });
        break;
      }
    } catch (e: unknown) {
      send({ type: 'error', message: (e as Error).message });
    }

    // Ghi TRƯỚC khi đóng stream, và ở đường chung của cả nhánh lỗi lẫn nhánh
    // thành công — đặt trong `try` là lượt hỏng giữa chừng mất hết dấu chi phí.
    tally.flush(usageToolId);
    send({ type: 'done', toolsUsed });
    writer.close();
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  });
}


// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

async function runPost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);

  if (action === 'chat') return body.stream ? handleChatStream(body) : handleChat(body);

  const { laSoText, phan, docs, hoTen, gioiTinh } = body as { laSoText?: string; phan?: number; docs?: string; hoTen?: string; gioiTinh?: string };
  if (!laSoText || !phan) return err('Thiếu dữ liệu', 400);

  let systemForLLM: string;
  let prompt: string;
  try {
    // "Người xem: <tên> (giới tính)" lên đầu prompt → xưng hô đúng (client gửi hoTen/gioiTinh).
    const nx = nguoiXemLine(hoTen, gioiTinh);
    const cached = buildPromptCached(Number(phan), laSoText, docs);
    systemForLLM = cached.system;
    prompt = (nx ? nx + '\n' : '') + cached.prompt;
  }
  catch (e: unknown) { return err('buildPrompt error: ' + (e as Error).message); }

  try {
    // Henry chốt 2026-08-20: nâng ĐỀU 50% mọi trần token trong repo — retest
    // sau khi bật Kimi K3 primary bắt được bản luận giải bị CẮT NGANG giữa
    // câu (model sinh vượt trần rồi API cắt sạch, không phải lỗi mạng).
    const maxTok = phan === 1 ? 3000 : phan === 14 ? 4500 : phan === 24 ? 2100
      : (phan >= 2 && phan <= 13) ? 1650 : (phan >= 15 && phan <= 23) ? 1650 : 1500;

    // Prompt caching (Code #1, xem CLAUDE.md track tối ưu chi phí Opus):
    // `systemForLLM` = SYSTEM_PROMPT + TOÀN VĂN lá số (buildPromptCached),
    // GIỐNG HỆT NHAU byte-for-byte ở cả 24 lượt của MỘT người xem → bật
    // `cacheSystem:true` để nhánh Anthropic đóng breakpoint `cache_control`
    // TTL 1h lên khối đó (Gemini/Kimi bỏ qua cờ này, không cache). Lượt đầu
    // ghi cache (đắt hơn ~1,25×), các lượt sau chỉ đọc (~0,1×) — điều kiện là
    // lượt mồi phải ghi cache XONG trước khi mở song song (xem
    // public/app-luan-giai.html `_startLuanGiaiAI`: chạy phần 1 riêng lẻ rồi
    // mới mở pool song song cho phần còn lại — né bẫy "3 lượt song song đầu
    // đều cache-miss").
    //
    // Dùng llmTextFull thay llmText để LẤY ĐƯỢC usage + thời lượng: trước đây
    // route này KHÔNG ghi một dòng `llm_usage` nào, nên Luận Giải — tool bán
    // chạy nhất (1.500 Lượng / 3 người) — hoàn toàn vô hình trong panel Biên
    // Lợi Nhuận, và cũng không có số nào để đặt ETA cho 24 phần.
    const r = await llmTextFull({ system: systemForLLM, prompt, maxTokens: maxTok, cacheSystem: true });
    const text = r.text;
    // tool_id 'laso' = ĐÚNG `tool_pricing.tool_id` của Luận Giải (events dùng
    // 'luan-giai', giao dịch dùng 'use_laso' — ba hệ tên lệch nhau, xem
    // tool_canon() trong CLAUDE.md). Ghi theo id mà GIÁ treo vào thì bucket chi
    // phí mới ghép được với bucket doanh thu.
    void logLlmUsage(
      'laso',
      r.model,
      {
        input_tokens: r.usage.input_tokens,
        cache_creation_input_tokens: r.usage.cache_creation_input_tokens,
        cache_read_input_tokens: r.usage.cache_read_input_tokens,
        output_tokens: r.usage.output_tokens,
      },
      r.durationMs,
    );

    let chartData = null;
    const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
    if (chartMatch) { try { chartData = JSON.parse(chartMatch[1].trim()); } catch { /* ignore */ } }
    const luanGiai = text.replace(/```chartdata[\s\S]*?```/, '').trim();
    return ok({ luanGiai, chartData, phan });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// S1 (track COO) — bọc để tự ghi lượt chạy thành công/hỏng vào `events`.
// Chỉ QUAN SÁT: ngoại lệ vẫn ném lại nguyên vẹn, Response trả về không đổi.
export async function POST(request: NextRequest) {
  return withToolOutcome('lasotuvi', () => runPost(request));
}
