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
import { buildToolDefs, executeTool, newToolContext, buildBirthFromInput, type ProfilePort } from '@/lib/tools/registry';
import { computeLaso, renderLasoCard } from '@/lib/engine/laso';
import { computeTuBinh } from '@/lib/engine/tubinh';
import { computeSinhCon, computeChonNgay, computeDatTen, computeDatTenDn } from '@/lib/engine/diachi';
// Template prompt + context formatter dùng CHUNG với /api/lasotuvi (một bộ não).
import { CHAT_SYSTEM_LASO, CHAT_SYSTEM_GENERAL, extractLasoContext, buildChatContext, focusHint, nguoiXemLine } from '@/lib/agent/prompts';
import { TOOLS_INSTRUCTION } from '@/lib/agent/tools';
import { type ChatConfig } from '@/lib/config/appConfig';
import {
  geminiEligible,
  geminiProseCapable,
  streamGemini,
  geminiToolsEligible,
  geminiToolsCapable,
  streamGeminiTurn,
  toGeminiTools,
  toGeminiContents,
} from '@/lib/agent/providers/gemini';
import { logLlmUsage, type LlmUsage } from '@/lib/agent/usage';
import { computePastLife } from '@/lib/engine/past-life';
import { pastLifeRailWrapper } from '@/lib/agent/past-life-story';

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

// Kết quả 1 lượt agent. Tách thành interface có TÊN (thay vì object literal
// inline trong chữ ký) để các nhánh provider bên trong tham chiếu lại được —
// trước đây phải viết Awaited<ReturnType<typeof runAgent>>, mà kiểu tự tham
// chiếu đó bị tsc hạ xuống 'any', nuốt luôn lỗi kiểu ở nhánh fallback.
export interface AgentResult {
  toolsUsed: string[];
  birth: BirthParams | null;
  activeProfile: string | null;
  subjectSwitched: boolean;
  // Thẻ lá số deterministic (engine render) khi vừa LẬP/MỞ lá số trong lượt —
  // kênh chat chèn lên đầu câu trả lời để người dùng nhận BẢN CHUẨN, không phụ
  // thuộc LLM. null nếu lượt này không lập/mở lá số (follow-up).
  lasoCard: string | null;
  // Gợi ý câu hỏi tiếp theo do LLM sinh (bám câu trả lời) → chip động ở rail.
  suggestions: string[];
}

/** Kết cục một lượt thử provider. `midStream` = đã stream chữ/chạy tool rồi mới
 *  hỏng → TUYỆT ĐỐI không được thử provider khác (sẽ ra hai câu trả lời chồng
 *  nhau trên màn hình người dùng). */
type ProviderOutcome = { ok: true; result: AgentResult } | { ok: false; midStream: boolean };

// ── Agent loop ──────────────────────────────────────────────
export async function runAgent(
  req: ChatRequestV1,
  cfg: ChatConfig,
  send: (s: string) => void,
  profiles: ProfilePort | null = null,
): Promise<AgentResult> {
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
    // tuong-hop = tương hợp HAI NGƯỜI BẤT KỲ (bạn/người thân/đối tác/đôi lứa) —
    // CÙNG cơ chế 2 lá số như xem-tuoi/xem-lam-an, chỉ khác khung luận (neutral).
    if (scenario.type === 'xem-tuoi' || scenario.type === 'xem-lam-an' || scenario.type === 'tuong-hop') {
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
    } else if (scenario.type === 'dat-ten-dn') {
      const r = computeDatTenDn(scenario.data || {});
      if (r) scn = { ...scenario, data: r };
    // nap-am + kim-lau + ngu-hanh-ten + than-so-hoc + bat-trach + kinh-dich:
    // KHÔNG recompute server-side — client (module dùng chung tools-shared/*.js =
    // nguồn chuẩn với trang standalone) đã gửi data đầy đủ trong scenario.data;
    // server chỉ luận → rail khớp ô giữa.
    }
    const bc = buildChatContext(scenarioToBody(scn, req.messages as ChatMessage[]));
    system = bc.systemForCall;
    // Bát Tự 1 người: đẩy "Người xem" (tên+giới tính từ birth) vào system → xưng
    // hô đúng (luật XƯNG_HO_RULE trong CHAT_SYSTEM_TU_BINH). Các scenario 2 người
    // (xem-tuoi/tương-hợp) đã có tên đôi bên trong context nên bỏ qua.
    if (req.birth && scenario.type === 'tu-binh') {
      const nx = nguoiXemLine(req.birth.name, req.birth.gender);
      if (nx) system += '\n\n' + nx;
    }
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
        // "Người xem: <tên> (giới tính)" lên đầu context → model xưng hô đúng
        // (luật XƯNG_HO_RULE trong CHAT_SYSTEM_LASO). birth.name/gender do client gửi.
        lasoCtx = nguoiXemLine(req.birth.name, req.birth.gender) + extractLasoContext(res.ls, '', { full: true });
        focusHintText = focusHint(lastQ);
      }
    }
    const hasLaso = !!ctx.ls;

    // Prompt: LUÔN dùng TEMPLATE chung lib/agent/prompts (một nguồn với
    // /api/lasotuvi — sửa hình dạng/luật luận 1 chỗ; chứa shape 3 lớp +
    // luật vận hạn theo tầng + độ dài chuẩn). app_config.chat.system_prompt
    // (nếu có) KHÔNG còn thay thế template mà chèn vào như LỚP TÔNG (persona)
    // — chỉnh giọng văn trong DB không cần deploy, shape vẫn được giữ.
    // Văn phong tác giả (thầy) cho luồng lá số — cùng cơ chế như scenario
    // (buildChatContext), nhưng birth-path xưa nay bỏ qua. Gộp CÙNG tone DB.
    const authorPersona = req.authorName && req.authorStyle
      ? `Phong cách: Bạn đang thể hiện phong cách của ${req.authorName} — ${req.authorStyle}`
      : '';
    const toneParts = [
      cfg.systemPrompt
        ? `TÔNG/PHONG CÁCH (tùy chỉnh — CHỈ đổi giọng văn, KHÔNG đổi hình dạng/độ dài/luật luận bên dưới):\n${cfg.systemPrompt}`
        : '',
      authorPersona,
    ].filter(Boolean);
    const tone = toneParts.length ? toneParts.join('\n\n') : undefined;
    system = hasLaso
      ? CHAT_SYSTEM_LASO(lasoCtx, undefined, tone)
      : CHAT_SYSTEM_GENERAL(undefined, tone);
    system += '\n\n' + timeContext(); // thời gian chuẩn múi giờ VN (đè bản inline của template)
    system += TOOLS_INSTRUCTION(hasLaso, !!profiles);

    // ── Vỏ bọc kể chuyện (req.wrap) — CHỈ thêm lớp giọng, KHÔNG đụng dữ liệu.
    // Rail của tool Chân Dung Tiền Kiếp: người xem vừa đọc xong đời một nhân
    // vật dựng từ chính lá số này, nên hỏi tiếp về nhân vật thay vì hỏi thẳng
    // về cung/sao. Nhân vật được tính LẠI Ở SERVER từ birth (deterministic —
    // cùng lá số ra cùng người) nên chắc chắn trùng bản đang hiện trên màn
    // hình, và client không phải gửi chữ nào vào system.
    if (req.wrap === 'past-life' && ctx.ls && req.birth) {
      try {
        const g = req.birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
        system += '\n\n' + pastLifeRailWrapper(computePastLife(ctx.ls, g));
      } catch (e) {
        // Hỏng lớp vỏ thì vẫn trả lời được như luận giải thường — không chặn lượt.
        console.error('[runAgent] pastLifeRailWrapper lỗi:', (e as Error)?.message);
      }
    }

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

  // Áp luật bám hội thoại + sinh gợi ý câu hỏi tiếp cho MỌI nhánh prompt.
  system = system + '\n\n' + CHAT_FOLLOWUP_RULE + '\n\n' + CHAT_SUGGEST_RULES;
  let suggestions: string[] = [];

  send(sse.status({ text: hasImages ? 'Đang xem ảnh...' : 'Đang suy xét...' }));

  // ── PROVIDER ROUTING: kịch bản prose-thuần nhẹ có thể đi GEMINI (rẻ ~97%,
  // nhanh hơn) thay vì Sonnet. Bật/tắt từng tool qua app_config
  // `chat.provider_routes` (không deploy). geminiEligible đã guard cứng: chỉ
  // các kịch bản data-driven KHÔNG tool + KHÔNG ảnh mới vào đây; laso/luận-giải/
  // bát-tự (tool-call) và vision LUÔN dùng Sonnet. Lỗi Gemini ở request-time →
  // fallback SẠCH xuống loop Anthropic bên dưới (chưa gửi byte nào).
  const scenarioType = scenario?.type || 'laso';
  if (geminiEligible(scenarioType, hasImages, cfg.providerRoutes)) {
    try {
      suggestions = await streamGemini(system, convo, cfg, send);
      return {
        toolsUsed,
        birth: capturedBirth,
        activeProfile: ctx.activeProfile,
        subjectSwitched: ctx.subjectSwitched,
        lasoCard: null,
        suggestions,
      };
    } catch (e) {
      console.error('[runAgent] Gemini lỗi → fallback Sonnet:', (e as Error)?.message);
      // rơi xuống loop Anthropic bên dưới (an toàn: chưa stream text nào)
    }
  }

  // ── PROVIDER ROUTING (LÁ SỐ có TOOL): luận-giải/lá-số ('laso') có thể đi
  // GEMINI với function-calling THẬT (lap_la_so, tra_tieu_van, ...). Đây là
  // nhóm VƯƠNG MIỆN có paywall → MẶC ĐỊNH giữ Sonnet (providerRoutes
  // 'laso'='anthropic'); admin flip 'laso'='gemini' qua app_config để bật,
  // revert 1 dòng không deploy. Fallback SẠCH về Sonnet nếu Gemini lỗi lúc
  // chưa stream chữ nào (progressed=false). Prompt/data/tool/loop y hệt bản
  // Sonnet — chỉ khác nơi gọi model.
  // Đường Gemini function-calling, gói thành closure vì được gọi ở HAI chỗ:
  //   1) route chỉ định Gemini  → chạy trước, lỗi thì rơi xuống Anthropic;
  //   2) Anthropic chết sạch    → fallback ngược lên đây (xem cuối hàm).
  // Trả về kết quả khi xong; trả null khi hỏng mà CHƯA stream chữ nào (caller
  // được phép thử provider khác); trả {failedMidStream:true} khi đã stream dở
  // (caller KHÔNG được thử lại — sẽ ra hai câu trả lời chồng nhau).
  const runGeminiTools = async (): Promise<ProviderOutcome> => {
    const gTools = toGeminiTools(tools);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gContents: any[] = toGeminiContents(convo);
    let progressed = false;
    try {
      for (let round = 0; round <= cfg.maxRounds; round++) {
        const forceAnswer = round === cfg.maxRounds; // vòng cuối: bỏ tool để ép trả lời
        const turn = await streamGeminiTurn(system, gContents, forceAnswer ? null : gTools, cfg, send);
        progressed = progressed || turn.sentText || turn.functionCalls.length > 0;

        if (!forceAnswer && turn.functionCalls.length) {
          gContents.push({ role: 'model', parts: turn.modelParts });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const respParts: any[] = [];
          for (const fc of turn.functionCalls) {
            toolsUsed.push(fc.name);
            if (fc.name === 'lap_la_so' && fc.args) {
              const b = buildBirthFromInput(fc.args);
              if (b) capturedBirth = b;
            }
            const run = await executeTool(fc.name, (fc.args || {}) as Record<string, unknown>, ctx);
            send(sse.toolCall({ name: fc.name, args: safeArgs(fc.args) }));
            send(sse.status({ text: run.label }));
            const rc = typeof run.content === 'string' ? run.content : JSON.stringify(run.content);
            respParts.push({ functionResponse: { name: fc.name, response: { result: rc } } });
          }
          gContents.push({ role: 'user', parts: respParts });
          continue;
        }
        suggestions = turn.suggestions;
        break;
      }
      const justBuilt = toolsUsed.includes('lap_la_so') || toolsUsed.includes('mo_la_so');
      const lasoCard = justBuilt && ctx.ls ? renderLasoCard(ctx.ls, ctx.birth) : null;
      return {
        ok: true,
        result: {
          toolsUsed,
          birth: ctx.birth ?? capturedBirth,
          activeProfile: ctx.activeProfile,
          subjectSwitched: ctx.subjectSwitched,
          lasoCard,
          suggestions,
        },
      };
    } catch (e) {
      console.error('[runAgent] Gemini-tools lỗi:', (e as Error)?.message);
      // progressed = đã stream dở / đã chạy tool → caller không được thử lại.
      return { ok: false, midStream: progressed };
    }
    // Vòng lặp kết thúc mà không return (không thể xảy ra — vòng cuối luôn ép
    // trả lời rồi break) → coi như hỏng sạch, caller thử provider khác.
    return { ok: false, midStream: false };
  };

  // Gọi lượt 1: route chỉ định Gemini cho nhóm lá số → chạy Gemini trước.
  let geminiToolsTried = false;
  if (geminiToolsEligible(scenarioType, hasImages, cfg.providerRoutes)) {
    geminiToolsTried = true;
    const r = await runGeminiTools();
    if (r.ok) return r.result;
    if (r.midStream) {
      // Đã stream dở → báo lỗi và đóng lượt, KHÔNG thử Anthropic (tránh trả trùng).
      send(sse.error({ code: 'internal', message: 'Gemini error mid-stream' }));
      const justBuilt = toolsUsed.includes('lap_la_so') || toolsUsed.includes('mo_la_so');
      return {
        toolsUsed,
        birth: ctx.birth ?? capturedBirth,
        activeProfile: ctx.activeProfile,
        subjectSwitched: ctx.subjectSwitched,
        lasoCard: justBuilt && ctx.ls ? renderLasoCard(ctx.ls, ctx.birth) : null,
        suggestions,
      };
    }
    // Hỏng sạch → rơi xuống loop Anthropic bên dưới.
  }


  // Mỗi vòng = 1 lượt STREAM DUY NHẤT (gộp "quyết định tool" + "trả lời"). Trước
  // đây lượt KHÔNG dùng tool tốn 2 lần gọi model — 1 lần non-stream để quyết
  // định (sinh full câu trả lời rồi VỨT) + 1 lần streamFinal sinh LẠI y hệt để
  // stream → gấp đôi output (phần đắt nhất). Nay stream thẳng: nếu model đòi
  // tool thì bắt tool_use ngay trong stream, chạy tool rồi lặp; nếu trả text
  // thẳng thì chính stream đó LÀ câu trả lời (bỏ hẳn call thứ 2).
  const totalUsage: LlmUsage = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  // Mốc để biết loop Anthropic đã LÀM GÌ chưa: nếu nó chết mà chưa chạy tool
  // nào và chưa stream chữ nào thì fallback sang Gemini vẫn SẠCH.
  const toolsBeforeAnthropic = toolsUsed.length;
  for (let round = 0; round <= cfg.maxRounds; round++) {
    const forceAnswer = round === cfg.maxRounds; // vòng cuối: ép trả lời, cấm tool
    const turn = await streamTurn(system, convo, tools, cfg, send, forceAnswer);
    totalUsage.input_tokens += turn.usage.input_tokens;
    totalUsage.cache_creation_input_tokens += turn.usage.cache_creation_input_tokens;
    totalUsage.cache_read_input_tokens += turn.usage.cache_read_input_tokens;
    totalUsage.output_tokens += turn.usage.output_tokens;

    // ── FALLBACK NGƯỢC: Anthropic chết (hết credit, 5xx kéo dài) → thử Gemini.
    // Trước đây streamTurn bắn thẳng sse.error tại chỗ, nên một mình Anthropic
    // hết tiền là kéo sập cả rail dù Gemini vẫn sống — đúng ca Henry gặp. Chỉ
    // fallback khi CHƯA stream gì (round 0, chưa tool nào) để không trả trùng,
    // và chỉ sang đường Gemini mà kịch bản này thật sự đi được (guard prose/
    // vision/tools giữ nguyên; route bị bỏ qua vì đây là cứu hộ, không phải
    // lựa chọn ưu tiên).
    if (turn.stopReason === 'error') {
      const cleanSoFar = round === 0 && toolsUsed.length === toolsBeforeAnthropic;
      if (cleanSoFar && !geminiToolsTried && geminiToolsCapable(scenarioType, hasImages)) {
        console.error('[runAgent] Anthropic chết → fallback Gemini (tools):', turn.errorBody);
        geminiToolsTried = true;
        const r = await runGeminiTools();
        if (r.ok) return r.result;
      } else if (cleanSoFar && geminiProseCapable(scenarioType, hasImages)) {
        console.error('[runAgent] Anthropic chết → fallback Gemini (prose):', turn.errorBody);
        try {
          suggestions = await streamGemini(system, convo, cfg, send);
          return {
            toolsUsed,
            birth: capturedBirth,
            activeProfile: ctx.activeProfile,
            subjectSwitched: ctx.subjectSwitched,
            lasoCard: null,
            suggestions,
          };
        } catch (e) {
          console.error('[runAgent] Fallback Gemini cũng lỗi:', (e as Error)?.message);
        }
      }
      // Hết đường → giờ mới báo lỗi cho người dùng.
      send(sse.error({ code: 'internal', message: turn.errorBody || 'Anthropic error' }));
      break;
    }

    if (!forceAnswer && turn.stopReason === 'tool_use' && turn.toolUses.length) {
      convo.push({ role: 'assistant', content: turn.assistantContent });

      const results = [];
      for (const tu of turn.toolUses) {
        toolsUsed.push(tu.name);
        // Agent vừa lập lá số từ text → ghi lại birth (đã chuẩn hóa server-side:
        // giờ/giới tính/năm/âm-dương) để phiên sau dùng thẳng.
        if (tu.name === 'lap_la_so' && tu.input) {
          const b = buildBirthFromInput(tu.input);
          if (b) capturedBirth = b;
        }
        const run = await executeTool(tu.name, tu.input || {}, ctx);
        send(sse.toolCall({ name: tu.name, args: safeArgs(tu.input) }));
        send(sse.status({ text: run.label }));
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: run.content });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    // Không tool (hoặc vòng cuối bị ép) → câu trả lời đã stream xong trong turn này.
    suggestions = turn.suggestions;
    break;
  }

  // ctx.birth phản ánh lá số đang xem cuối lượt (mo_la_so có thể đã đổi sang lá
  // số khác) → ưu tiên nó. activeProfile/subjectSwitched cho kênh lưu & reset thread.
  // Thẻ lá số CHỈ render khi lượt này vừa LẬP (lap_la_so) hoặc MỞ (mo_la_so) lá
  // số — không lặp ở các lượt follow-up (lúc đó lá số đã hiện trước đó rồi).
  const justBuilt = toolsUsed.includes('lap_la_so') || toolsUsed.includes('mo_la_so');
  const lasoCard = justBuilt && ctx.ls ? renderLasoCard(ctx.ls, ctx.birth) : null;
  // Tag cost theo scenario.type nếu có (khớp tool_pricing), ngược lại 'chat' —
  // CHÍNH type mà /api/v1/chat + gate.ts ghi vào credit_transactions cho MỌI
  // lượt rail (kể cả có lá số) → bucket cost khớp thẳng bucket doanh thu thật.
  void logLlmUsage(scenario?.type || 'chat', cfg.model, totalUsage);
  return {
    toolsUsed,
    birth: ctx.birth ?? capturedBirth,
    activeProfile: ctx.activeProfile,
    subjectSwitched: ctx.subjectSwitched,
    lasoCard,
    suggestions,
  };
}

// ── STREAM 1 lượt: vừa stream text về client (tách "SUGGEST:") vừa BẮT tool_use ──
// Gộp "quyết định tool" + "trả lời" vào MỘT lần gọi model (thay cặp
// callAnthropic non-stream + streamFinal cũ) → lượt KHÔNG dùng tool hết bị gấp
// đôi output. Trả về: stopReason, toolUses (đã parse input), assistantContent
// (khối để đẩy vào convo khi có tool), suggestions (tách dòng SUGGEST cuối câu).
async function streamTurn(
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convo: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[],
  cfg: ChatConfig,
  send: (s: string) => void,
  forceAnswer: boolean,
): Promise<{
  stopReason: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolUses: { id: string; name: string; input: any }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assistantContent: any[];
  suggestions: string[];
  usage: LlmUsage;
  /** Chỉ có khi stopReason==='error' — nội dung lỗi để caller báo NẾU không
   *  fallback được. Xem ghi chú ở nhánh non-200 bên dưới. */
  errorBody?: string;
}> {
  const usage: LlmUsage = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    stream: true,
    // TTL 1h: prefix (tools + system, gồm full lá số) giữ ấm qua khoảng nghỉ giữa
    // các tin → follow-up đọc cache 0.1×. Cần beta 'extended-cache-ttl-2025-04-11'.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: convo,
  };
  if (tools.length) {
    payload.tools = tools;
    // Vòng cuối: cấm tool để ÉP model trả lời (tránh lặp tool vô hạn).
    if (forceAnswer) payload.tool_choice = { type: 'none' };
  }
  const resp = await postAnthropic(payload);
  if (!resp.ok) {
    const body = (await resp.text()).slice(0, 500);
    console.error(`[runAgent.streamTurn] Anthropic non-200: ${resp.status} — ${body}`);
    // CỐ Ý KHÔNG gửi sse.error ở đây. Trước đây gửi ngay tại chỗ, nghĩa là mọi
    // lỗi Anthropic (hết credit, 5xx kéo dài) đều đập thẳng vào mặt người dùng
    // và KHÔNG còn đường cứu — dù Gemini vẫn sống. Nay trả lỗi lên cho caller:
    // caller thử fallback sang Gemini trước, chỉ khi hết đường mới báo lỗi.
    return {
      stopReason: 'error',
      errorBody: 'Anthropic error: ' + body,
      toolUses: [],
      assistantContent: [],
      suggestions: [],
      usage,
    };
  }

  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let stopReason = 'end_turn';
  // Khối nội dung theo index (text tích lũy text_delta; tool_use tích lũy input_json_delta).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  // ── Tách dòng "SUGGEST: q1 | q2 | q3" ở CUỐI câu trả lời (y hệt bản cũ) ──
  const MARKER = 'SUGGEST:';
  const GUARD = 24; // giữ đuôi để bắt marker bị cắt ngang nhiều delta
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
        if (evt.type === 'message_start') {
          logCacheUsage('streamTurn', evt.message?.usage);
          const u = evt.message?.usage;
          if (u) {
            usage.input_tokens = u.input_tokens || 0;
            usage.cache_creation_input_tokens = u.cache_creation_input_tokens || 0;
            usage.cache_read_input_tokens = u.cache_read_input_tokens || 0;
          }
        } else if (evt.type === 'content_block_start') {
          const cb = evt.content_block || {};
          blocks[evt.index] =
            cb.type === 'tool_use'
              ? { type: 'tool_use', id: cb.id, name: cb.name, partial: '' }
              : { type: 'text', text: '' };
        } else if (evt.type === 'content_block_delta') {
          const b = blocks[evt.index];
          if (evt.delta?.type === 'text_delta') {
            if (b) b.text += evt.delta.text;
            onText(evt.delta.text);
          } else if (evt.delta?.type === 'input_json_delta') {
            if (b) b.partial += evt.delta.partial_json;
          }
        } else if (evt.type === 'message_delta') {
          if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
          if (evt.usage?.output_tokens != null) usage.output_tokens = evt.usage.output_tokens;
        }
      } catch {
        /* mảnh JSON dở — bỏ qua */
      }
    }
  }

  // Hết stream: xả nốt đuôi text nếu chưa gặp marker.
  if (markerAt < 0 && full.length > sentLen) {
    send(sse.text({ delta: full.slice(sentLen) }));
    sentLen = full.length;
  }
  // AN TOÀN: chưa stream ký tự nào mà VẪN có nội dung (marker rơi đầu) → xả nguyên văn.
  let suppressSuggest = false;
  if (sentLen === 0 && full.trim()) {
    console.warn(
      `[runAgent.streamTurn] câu trả lời hiển thị rỗng sau khi tách SUGGEST (fullLen=${full.length}, markerAt=${markerAt}) — xả nguyên văn`,
    );
    send(sse.text({ delta: full }));
    suppressSuggest = true;
  } else if (sentLen === 0 && !full.trim() && stopReason !== 'tool_use') {
    console.warn(`[runAgent.streamTurn] model trả completion RỖNG (fullLen=${full.length})`);
  }

  // Dựng assistantContent + toolUses từ các khối (input_json_delta → object).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assistantContent: any[] = [];
  const toolUses: { id: string; name: string; input: unknown }[] = [];
  for (const b of blocks) {
    if (!b) continue;
    if (b.type === 'tool_use') {
      let input: unknown = {};
      try {
        input = b.partial ? JSON.parse(b.partial) : {};
      } catch {
        input = {};
      }
      assistantContent.push({ type: 'tool_use', id: b.id, name: b.name, input });
      toolUses.push({ id: b.id, name: b.name, input });
    } else if (b.type === 'text' && b.text) {
      assistantContent.push({ type: 'text', text: b.text });
    }
  }

  const suggestions =
    suppressSuggest || markerAt < 0
      ? []
      : full
          .slice(markerAt + MARKER.length)
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4);

  return { stopReason, toolUses, assistantContent, suggestions, usage };
}

// ── Luật sinh gợi ý câu hỏi tiếp theo (chip động) ────────────
// Model kết thúc bằng 1 dòng "SUGGEST: q1 | q2 | q3"; streamTurn cắt dòng này
// KHÔNG cho lộ ra câu trả lời, trả về mảng cho client làm chip gợi ý bám hội thoại.
// Xử lý tin NGẮN/TIẾP NỐI: chống lỗi model coi "ok/ừ/có" là câu hỏi mới rồi luận
// lại từ đầu. Lịch sử hội thoại ĐÃ được gửi kèm (10 tin gần nhất) → model có đủ
// bối cảnh, chỉ cần buộc nó BÁM vào. Áp cho mọi nhánh (lá số/kịch bản/general).
const CHAT_FOLLOWUP_RULE =
  'BÁM HỘI THOẠI (QUAN TRỌNG): Các tin phía trên là bối cảnh — đọc kỹ và nối tiếp tự nhiên như một cuộc trò chuyện. ' +
  'Nếu tin CUỐI của người dùng là lời đồng ý / tiếp nối NGẮN ("ok", "ừ", "có", "vâng", "được", "ừ đi", "tiếp", "tiếp đi", ' +
  '"đồng ý", "sao nữa", "còn gì", "kể tiếp", "chi tiết hơn", "rồi sao"...) hoặc trỏ ngược ("cái đó", "vụ đó", "phần đó") — ' +
  'đó là ĐỒNG Ý / yêu cầu nói tiếp về CHÍNH câu hỏi hay đề nghị mà CHÍNH BẠN vừa nêu ở lượt trả lời TRƯỚC. ' +
  'Hãy luận TIẾP đúng chủ đề đó ngay, TUYỆT ĐỐI không hỏi lại "bạn muốn xem gì", không luận lại từ đầu, không đổi chủ đề.';

const CHAT_SUGGEST_RULES =
  'CUỐI CÙNG, sau khi luận xong, xuống dòng và ghi ĐÚNG một dòng bắt đầu bằng "SUGGEST: " ' +
  'gồm 3 câu hỏi ngắn (mỗi câu ≤ 12 từ) mà người dùng có thể muốn hỏi TIẾP, bám sát nội dung vừa luận, ' +
  'ngăn cách bằng " | ". Ví dụ: SUGGEST: Cung Quan Lộc ra sao? | Năm sau công việc thế nào? | Có nên đổi nghề? ' +
  'Dòng này KHÔNG phải nội dung luận (hệ thống tách ra làm nút gợi ý, không hiển thị). Không ghi gì sau 3 câu đó.';

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
  'tuong-hop': 'compatData',
  'tu-binh': 'tuBinhData',
  'xem-tuoi-sinh-con': 'sinhConData',
  'chon-ngay-tot': 'chonNgayData',
  'dat-ten-con': 'datTenData',
  'dat-ten-dn': 'datTenDnData',
  'nap-am': 'napAmData',
  'kim-lau': 'kimLauData',
  'ngu-hanh-ten': 'nguHanhTenData',
  'than-so-hoc': 'thanSoData',
  'bat-trach': 'batTrachData',
  'kinh-dich': 'kinhDichData',
  'hoang-dao': 'hoangDaoData',
  'ngay-tot': 'ngayTotData',
  'luc-nham': 'lucNhamData',
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
