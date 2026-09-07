// app/api/lasotuvi/route.ts
// 60 → 300: MỘT lượt có thể thử tới 3 provider TUẦN TỰ (mỗi provider tự retry
// lỗi tạm thời trước khi coi là hỏng — xem lib/llm/complete.ts), cộng thêm
// trần token nâng 50% (2026-08-20) → 60s không còn đủ, dễ ăn timeout của
// Vercel (trả về trang lỗi nền tảng "An error occurred..." — KHÔNG PHẢI JSON,
// làm client vỡ khi JSON.parse). Đồng bộ với các route LLM nặng khác đã ở 300.
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
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { previewGate, previewIpHash } from '@/lib/billing/anon-preview';
import { previewKey, previewCacheGet, previewCachePut } from '@/lib/llm/preview-cache';
import { hasAnySlugAccess, paywallDisabled } from '@/lib/billing/credits';

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

  const { laSoText, phan, docs, hoTen, gioiTinh, slug, bundleSlug, namXem, anonId } = body as {
    laSoText?: string; phan?: number; docs?: string; hoTen?: string; gioiTinh?: string;
    slug?: string; bundleSlug?: string; namXem?: number; anonId?: string;
  };
  if (!laSoText || !phan) return err('Thiếu dữ liệu', 400);
  const phanNum = Number(phan);

  // Chốt chặn thanh toán PHÍA SERVER — thiếu bước này thì gọi thẳng endpoint
  // (biết laSoText, tự sinh miễn phí từ an sao) là dựng bản luận 13/11 phần
  // KHÔNG GIỚI HẠN mà không cần trả tiền hay đăng nhập. Trước bản vá này route
  // KHÔNG có gate nào — thanh toán chỉ tồn tại ở CLIENT (`requireCredits` gọi
  // MỘT LẦN cho cả bó trước khi lặp fetch từng phần), server tin tuyệt đối.
  //
  // Phần 1 (tổng quan) CỐ Ý giữ MIỄN PHÍ, không đổi — đó là bản xem trước sản
  // phẩm đã có từ đầu (client không khoá phần 1 trong UI). Phần 2+ (laso) và
  // toàn bộ 14-24 (chu-trinh-cuoc-doi) đòi sở hữu MỘT trong hai slug: PHẦN vừa
  // mua lẻ (`slug` — CHỈ laso có, tiền tố `laso-p<NN>-`, tool mới sinh sau bản
  // vá này) hoặc cả BÓ (`bundleSlug` — slug ĐỊNH DẠNG CŨ, không tiền tố, giữ
  // NGUYÊN như trước bản vá: đổi định dạng slug bó sẽ mồ côi cache nội dung
  // `laso_public` VÀ quyền sở hữu của mọi người đã mua trước đây — xem
  // `lasoKey` trong CLAUDE.md, cùng họ bẫy). Cả hai trường có thể trống tuỳ
  // ngữ cảnh (mua lẻ chỉ có `slug`; mua bó/đã mở cả bó chỉ cần `bundleSlug`).
  //
  // Dùng `hasAnySlugAccess` (khớp CHÍNH XÁC từng slug), KHÔNG qua
  // `toolPaymentDenied` — hàm đó còn có đường lùi khớp THEO TIỀN TỐ tool_id
  // (`hasRecentToolPayment`, "vừa trả tiền cho tool này trong 20 phút"). Với
  // tool CHIA PHẦN, "vừa trả cho laso" không có nghĩa là "đã trả cho ĐÚNG
  // lá số/phần này" — bật đường lùi đó là cho qua mọi phần khác của MỌI lá số
  // khác trong 20 phút sau một lượt mua bất kỳ, vì slug PHẦN giờ bắt đầu bằng
  // "laso-" nên đường lùi kia SẼ khớp được nếu lỡ đi qua `toolPaymentDenied`.
  //
  // 🔴 HARD PAYWALL (2026-09-06) — LẰN RANH FREE DỜI TỪ 1 PHẦN SANG 2.
  // `FREE_PHAN` là bản xem trước: model chạy THẬT trên lá số của chính khách
  // TRƯỚC khi họ trả đồng nào, vì đó mới là thứ tạo được cái móc "đúng vl" mà
  // bảng điểm deterministic không bao giờ tạo được. Phần 3+ vẫn khoá cứng.
  //
  // 🔴 (2026-09-07) Chu Trình Cuộc Đời (phần 14-24, dùng CHUNG route này) nay
  // có ĐÚNG MỘT phần xem trước: ENGINE PHẦN 14 ("Tổng quan đại vận" — phần cục
  // bộ 1 của tool, xem app-chu-trinh-cuoc-doi.html) — hook tương đương phần 1
  // của Luận Giải. CỐ Ý hẹp: chỉ đúng con số 14, KHÔNG generalize thành "phần
  // đầu của mỗi tool dùng chung route" — 10 phần còn lại (15-24) vẫn khoá cứng
  // như trước. `preview.free_runs`/`ip_daily_cap`/`global_daily_cap`
  // (_patches/migration-anon-preview.sql) là NGÂN SÁCH DÙNG CHUNG cho mọi
  // tool_id xem trước (laso/chu-trinh-cuoc-doi/day-con/...) — một người đã hết
  // suất ĐỜI ở tool này thì cũng hết ở tool kia, đây là THIẾT KẾ (một ngân sách
  // "làm quen sản phẩm" cho cả trang), không phải bug cần tách theo tool_id.
  const FREE_PHAN = 2;
  const FREE_PHAN_CTCD = 14;
  const isPreview = phanNum <= FREE_PHAN || phanNum === FREE_PHAN_CTCD;
  const previewToolId = phanNum === FREE_PHAN_CTCD ? 'chu-trinh-cuoc-doi' : 'laso';

  if (!isPreview && !paywallDisabled()) {
    const auth = await authUserFromRequest(request);
    if ('error' in auth) return err(auth.error, auth.status);
    const owns = await hasAnySlugAccess(auth.user.id, [slug, bundleSlug].filter((s): s is string => !!s));
    if (!owns) return err('Lượt dùng này chưa được thanh toán.', 402);
  }

  // ── Đường XEM TRƯỚC: cache trước, cầu dao sau ────────────────────────────
  // Thứ tự này BẮT BUỘC (xem lib/llm/preview-cache.ts): trúng cache là 0đ model
  // nên không được tiêu một suất quota — người tải lại trang ba lần mà hết sạch
  // `preview.free_runs` thì với họ tool đang hỏng, không phải đang tiết kiệm.
  //
  // `pKey` = danh tính đã XÁC THỰC nếu có, ngược lại `anonId` client tự khai.
  // ⚠️ `anonId` KHÔNG phải danh tính (xoá localStorage là có cái mới) — nó chỉ
  // là lớp trần thứ nhất; hai lớp IP/ngày và toàn-hệ-thống/ngày trong RPC mới
  // là thứ chặn người cố tình. Xem _patches/migration-anon-preview.sql.
  let previewCacheKey = '';
  if (isPreview && !paywallDisabled()) {
    previewCacheKey = previewKey({ laSoText, phan: phanNum, namXem, hoTen, gioiTinh });
    const hit = await previewCacheGet(previewCacheKey);
    if (hit) return ok({ luanGiai: hit, chartData: null, phan, cached: true });

    const auth = await authUserFromRequest(request);
    const pKey = 'error' in auth ? (anonId || '') : auth.user.id;
    const gate = await previewGate(pKey, previewIpHash(request), previewToolId);
    if (!gate.allowed) {
      // 402 chứ không 429: với client đây KHÔNG phải "thử lại sau" mà là "hết
      // phần miễn phí, tới lúc trả tiền" — và trang phải dựng đúng tấm tường đó
      // thay vì hiện một lỗi kỹ thuật. `reason` để phân biệt khi đọc log:
      // 'key_cap' là người này hết suất (bình thường, đúng thiết kế), còn
      // 'global_cap'/'error' là cầu dao ngân sách hoặc DB hỏng — hai thứ cần
      // biết ngay chứ không được lẫn vào nhau.
      console.error(`[lasotuvi] xem trước bị chặn (${gate.reason}) phần ${phanNum}`);
      return err('Đã hết lượt xem trước miễn phí.', 402);
    }
  }

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
    //
    // 2026-09-02 — mấy con số dưới đây KHÔNG phải trần cho phần CHỮ. Đo bằng
    // prompt thật + lá số thật trên API Anthropic (xem docs/nhat-ky/2026-09.md
    // "Token NGHĨ ăn chung trần"): `buildAnthropicBody` KHÔNG truyền `thinking`,
    // mà Opus 5 mặc định TỰ BẬT nó — mọi lượt trả về đều có block
    // [thinking, text], và token nghĩ ăn chung `max_tokens` với token chữ.
    //   phần 4, trần 1650: bật thinking 1160 token cho 920 chữ
    //                      tắt thinking  570 token cho 993 chữ  ← nhiều chữ hơn, nửa token
    //   phần 1  1713 vs  777 · phần 2 1431 vs 831 · phần 14 1703 vs 1219
    // Tức phần nghĩ ăn ~500–900 token, trần hiệu dụng cho văn chỉ còn ~40–55%
    // con số ghi ở đây. Đó là cơ chế sinh ra 7,9% phần cụt giữa câu trên hàng
    // đã bán. CỘNG THÊM đúng phần đã đo thay vì đoán một con số tròn — và cộng
    // TƯỜNG MINH để lượt sau đọc là biết ngay nó dùng vào việc gì.
    const THINK_BUDGET = 900;
    // phan 2-13 nới 1650→2400 (2026-09-03, Henry): 11 phần cung (3-13) nới từ
    // 120-160→350-400 từ (thêm bộ câu hỏi trọng tâm mỗi cung + mỗi đoạn tự có
    // câu hook riêng — CUNG_DESC/PARAGRAPH_HOOK_RULE, lib/agent/luan-giai-doc.ts).
    // 1650 chỉ vừa đủ cho ~300 từ đo được trước đó (phần 2 mẫu thật 291 từ,
    // KHÔNG cụt) — 400 từ mà model hay overshoot thêm 10-30% thì sát trần cũ,
    // rủi ro cụt giữa câu (đúng bệnh đã đo 7,9%, xem chú thích trên). Phần 2
    // (Mệnh) vẫn giữ nguyên 220-280 từ, dư chỗ trong cùng ngân sách — không hại.
    const maxTok = THINK_BUDGET + (phan === 1 ? 3000 : phan === 14 ? 4500 : phan === 24 ? 2100
      : (phan >= 2 && phan <= 13) ? 2400 : (phan >= 15 && phan <= 23) ? 1650 : 1500);
    // 2026-09-02 — hạ độ nghĩ cho ĐÚNG nhóm route văn dài này. A/B mù 48 bản
    // (2 lá số × 8 phần × 3 nhánh, prompt thật): effort 'low' rẻ hơn 39%
    // output token mà chữ ra còn nhiều hơn, 16 cặp chấm mù không phân biệt
    // được chất lượng (8–6–2). Lý do chọn 'low' thay vì tắt hẳn thinking —
    // và vì sao THINK_BUDGET vẫn phải giữ (7/16 lượt model vẫn nghĩ) — ghi ở
    // `effort` trong lib/llm/complete.ts. Đừng hạ tiếp xuống mức thấp hơn mà
    // chưa đo: dưới 'low' không còn nấc nào, muốn rẻ nữa là phải đổi model.
    const EFFORT = 'low' as const;

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
    // 🔻 GỠ ép `provider:'anthropic'` (chốt Henry 2026-09-03, thay chốt
    // 2026-08-24). Primary nay là Gemini 3.8 Flash, Opus 5 lùi xuống lưới đỡ
    // NGAY SAU (CANONICAL_ORDER, xem lib/llm/complete.ts). Căn cứ — 104 lượt
    // gọi THẬT, 4 lá số × 2 model × 13 phần, cùng input/prompt/ngân sách token,
    // cùng hình chạy prod (phần 1 riêng → bể 3 song song):
    //   chi phí/lá số  Opus 11.215đ  vs  Gemini 2.669đ   (rẻ 4,2×)
    //   khách chờ      Opus    102s  vs  Gemini    16s   (nhanh 6,2×)
    //   0 lỗi · 0 phần cụt · 0 bịa điểm/10 · 0 nhắc sao không có trong lá số
    //   — ở CẢ HAI. Chấm mù 52 cặp không tách được chất văn.
    // ⚠️ `effort` và THINK_BUDGET trong `maxTok` GIỮ NGUYÊN dù Gemini bỏ qua
    // chúng: đó là ngân sách của nhánh Opus khi Gemini chết. Dọn đi là lượt
    // fallback bị cắt giữa câu.
    // Lật ngược KHÔNG cần deploy: đổi `chat.standalone_provider` trong
    // app_config sang 'anthropic'. Chi tiết: nhat-ky/2026-09.md.
    let r = await llmTextFull({ system: systemForLLM, prompt, maxTokens: maxTok, cacheSystem: true, effort: EFFORT });

    // ── Bị CẮT giữa câu → sinh lại MỘT lần với trần gấp đôi ────────────────
    // Đo 2026-09 trên 46 bản luận ĐÃ BÁN: 77/974 phần (7,9%) kết thúc giữa câu,
    // 33/46 bản (72%) dính ít nhất một phần — nặng nhất đúng mấy phần văn dài
    // (phần 1: 33,3%, phần 14: 17,8%). Suốt thời gian đó KHÔNG nhánh provider
    // nào đọc `stop_reason`, nên bản cụt đi thẳng tới khách mà không có gì báo.
    //
    // VÌ SAO SINH LẠI CHỨ KHÔNG NÂNG ĐỀU TRẦN: nâng đều chạm vào chi phí của
    // CẢ 92% lượt đang bình thường, mà trần đúng cho từng phần thì chưa ai đo.
    // Sinh lại chỉ nổ đúng ~8% lượt thật sự hỏng, tự nhắm mục tiêu, và chặn ở
    // MỘT lần — cắt tiếp lần hai thì giao bản dài nhất lấy được còn hơn quay
    // vòng đốt tiền. Trần đúng để chốt sau, khi log `[llm] … CẮT GIỮA CHỪNG`
    // đủ số liệu cho từng phần.
    if (r.truncated) {
      console.error(`[lasotuvi] phần ${phan} bị cắt ở trần ${maxTok} — sinh lại với ${maxTok * 2}`);
      try {
        const retry = await llmTextFull({ system: systemForLLM, prompt, maxTokens: maxTok * 2, cacheSystem: true, effort: EFFORT });
        // Chỉ nhận bản mới khi nó THẬT SỰ khá hơn: hết cụt, hoặc chí ít dài hơn.
        // Lượt hai vẫn có thể cụt (văn dài hơn trần mới) — lúc đó bản dài hơn
        // vẫn là bản ít thiệt cho người đọc hơn.
        if (!retry.truncated || retry.text.length > r.text.length) r = retry;
      } catch (e) {
        // Sinh lại hỏng thì GIỮ bản đầu — khách đã trả tiền, có chữ cụt vẫn hơn
        // không có gì. Nhưng phải kêu, đừng nuốt (luật `catch {}` rỗng trong CLAUDE.md).
        console.error(`[lasotuvi] sinh lại phần ${phan} hỏng, giữ bản đầu:`, (e as Error).message);
      }
    }
    const text = r.text;
    // tool_id ĐÚNG `tool_pricing.tool_id` để bucket chi phí ghép được với bucket
    // doanh thu (xem tool_canon() trong CLAUDE.md). Phần 1-13 (tổng quan + 12
    // cung) thuộc "Luận Giải Tử Vi" (laso); phần 14-24 (đại vận + tiểu vận) đã
    // TÁCH sang tool RIÊNG "Chu Trình Cuộc Đời" (chu-trinh-cuoc-doi) — route này
    // phục vụ CẢ HAI tool (client gửi đúng số phan engine của tool đang gọi) nên
    // phải chọn bucket theo SỐ PHẦN, không còn chép cứng 'laso' cho mọi lượt.
    void logLlmUsage(
      Number(phan) <= 13 ? 'laso' : 'chu-trinh-cuoc-doi',
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
    // Cất bản xem trước để lượt sau CÙNG lá số + CÙNG tên không đốt lại tiền
    // model lẫn một suất quota. Chỉ đường xem trước ghi — phần trả phí đã có
    // `laso_public` (qua /api/save-laso) làm kho của nó.
    if (previewCacheKey) {
      previewCachePut({ key: previewCacheKey, toolId: previewToolId, phan: phanNum, text: luanGiai });
    }
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
