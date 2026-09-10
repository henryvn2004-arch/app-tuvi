// app/api/chan-dung-vo-chong/route.ts
// POST /api/chan-dung-vo-chong           — sinh chân dung vợ/chồng từ lá số
// GET  /api/chan-dung-vo-chong?action=history — lịch sử đã sinh của user

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { refundIfSystemFailure } from '@/lib/ops/refund';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logImageUsage } from '@/lib/agent/usage';
import { railFreeGrant, railFreeTurnsPerGen } from '@/lib/billing/viral-budget';
import { computeLaso, formatLaSoV2 } from '@/lib/engine/laso';
import {
  computeSpouseMorphology,
  morphRows,
  getPhuTheReadout,
  getPhuTheChinhTinhElement,
} from '@/lib/engine/portrait';
import { PHU_THE_LUAN_GIAI_SYSTEM_PROMPT, buildPhuTheLuanGiaiPrompt } from '@/lib/agent/phu-the-luan-giai';
import {
  CHAN_DUNG_VO_CHONG_ANALYSIS_SYSTEM_PROMPT,
  buildChanDungVoChongAnalysisPrompt,
  buildFinalPortraitImagePrompt,
  type ChanDungVoChongAnalysis,
} from '@/lib/agent/chan-dung-vo-chong-prompt';
import { generatePortraitImage } from '@/lib/image/openai-image';
import type { BirthParams } from '@/lib/contract/v1';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import {
  cacheFor,
  insertHistoryRow,
  lasoKey,
  userOwnsLaso,
  birthFromQuery,
} from '@/lib/portraits/cache';



const TOOL_ID = 'chan-dung-vo-chong';

/**
 * 🔴 PHIÊN BẢN CẤU TRÚC payload. BUMP mỗi khi thêm/đổi/bớt khoá mà TRANG cần để
 * dựng đủ màn hình. Đổi CHỮ thì không bump (dòng cache cũ trả chữ cũ — khó
 * chịu, không vỡ); đổi KHOÁ mà quên bump thì trang ẩn khối IM LẶNG.
 *
 * Mở màn ở 1: payload hiện tại CHÍNH LÀ phiên bản 1, và dòng cache ghi trước
 * lượt cắm cơ chế (không có `_shape`) được đọc là 1 nên KHÔNG bị dựng lại oan.
 *
 * ⚠️ Cố ý KHÔNG nhét vào `lasoKey`: đổi khoá là mồ côi cả cache LẪN
 * `userOwnsLaso` ⇒ người đã trả tiền bị tính lại.
 */
// P1 (2026-09): bump vì `_LUNAR_TABLE` sinh lại theo oracle Thiên Lương — GIÁ
// TRỊ lá số của người sinh vào ngày lệch bảng cũ đổi, không phải cấu trúc
// payload (fingerprint giữ nguyên). Xem docs/nhat-ky/2026-09.md.
// P2 (2026-09): bump tiếp — sửa 5 bảng tra sao lệch oracle (Đào Hoa/Lưu Hà/
// Thiên Trù/Thiên Quan/Thiên Phúc), cùng lý do GIÁ TRỊ đổi, không phải cấu trúc.
// P3 (2026-09): bump tiếp — đổi Kình-Đà + Tứ Hóa can Canh sang trường phái
// Thiên Lương, cùng lý do GIÁ TRỊ đổi, không phải cấu trúc.
// P4 (2026-09): bump tiếp — La-Võng đổi từ 2 sao cố định Thìn/Tuất sang nhãn
// theo Đà La, cùng lý do GIÁ TRỊ đổi, không phải cấu trúc.
const SHAPE = 5;

/** Vân tay CẤU TRÚC — `npm run check:cacheshape` canh khớp với `SHAPE` ở trên. */
const SHAPE_FINGERPRINT = '8cfee3e40522';

/** Cửa DUY NHẤT vào cache của tool này; `shape` khai một lần tại đây. */
const CACHE = cacheFor(TOOL_ID, SHAPE);

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

/**
 * W1b — lượt TÍNH THỬ: chạy tầng deterministic rồi dừng.
 *
 * Hàm RIÊNG chứ không phải một cờ trong handleGenerate, đúng lý do đã ghi ở 3
 * tool cẩm nang: đây là chốt chặn thanh toán của một tool đang bán: trộn hai
 * đường vào một hàm rồi tin vào một câu `if` là cách nhanh nhất để một hôm nào
 * đó đường trả tiền lọt qua cửa. Trong này KHÔNG có `toolPaymentDenied`,
 * `llmTextFull`, `generatePortraitImage`, `insertHistoryRow`,
 * `putCachedPortrait`, `railFreeGrant`, `refundIfSystemFailure`.
 *
 * KHÔNG đòi đăng nhập — xem lý do ở app/api/chan-dung-tien-kiep/route.ts.
 *
 * Bày ra: cung Phu Thê (chính tinh/phụ tinh/cách cục/ý nghĩa) + BẢNG HÌNH THỂ
 * suy từ sao (khuôn mặt, mắt, mũi, vóc dáng… kèm sao nào quyết định nét nào).
 * Khoá: đoạn mô tả văn xuôi, hoàn cảnh gặp gỡ, luận giải Phu Thê, và bức tranh
 * — tức đúng phần tốn tiền model.
 *
 * ⚠️ CỐ Ý KHÔNG trả `spouseAge`: mốc tuổi neo vào `pickMarriageAgeAnchor` có
 * `Math.random()`, nên số ở lượt tính thử sẽ KHÁC số ở lượt trả tiền. Bày một
 * con số rồi đổi nó ngay sau khi thu tiền là tự tay phá thứ W1 sinh ra để xây.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!birth) return err('Thiếu thông tin ngày sinh.', 400);

  const lasoRes = computeLaso(birth);
  if (!lasoRes.ok || !lasoRes.ls) return err(lasoRes.error || 'Không lập được lá số.', 400);

  const userGender = birth.gender === 'nu' ? 'nu' : 'nam';
  const morph = computeSpouseMorphology(lasoRes.ls, userGender);
  return ok({
    success: true,
    preview: true,
    spouseGender: morph.spouseGender,
    coreStar: morph.coreStar,
    coreBrightness: morph.coreBrightness || '',
    coreIsSatTinh: morph.coreIsSatTinh,
    morph: morphRows(morph),
    phuThe: getPhuTheReadout(lasoRes.ls),
    // 6 chiều điểm cung Phu Thê (engine đã tính sẵn trong computeLaso, 0đ thêm)
    // — chỉ để vẽ biểu đồ hook ở client (HookFacts.tuvi.hexDimsForCung đọc
    // đúng shape này), KHÔNG phải field mới cho luận giải trả tiền.
    cungScoresPhuThe:
      ((lasoRes.ls.cungScores as Record<string, Record<string, number>>) || {})['Phu Thê'] || null,
  });
}

// ── Generate ──────────────────────────────────────────────────────────
async function handleGenerate(request: NextRequest, body: Record<string, unknown>) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const birth = body.birth as BirthParams | undefined;
  if (!birth) return err('Thiếu thông tin ngày sinh.', 400);

  // ── Cache theo lá số (xem lib/portraits/cache.ts) ─────────────────────
  // Tra TRƯỚC cả chốt thanh toán, vì kết quả tra quyết định luôn có phải trả
  // tiền hay không: người đã từng trả cho đúng lá số này thì xem lại miễn phí.
  const look = await CACHE.lookup('main', auth.user.id, birth);

  if (!look.free) {
    // Chốt chặn thanh toán PHÍA SERVER (S0 track COO) — xem chú thích cùng loại
    // ở app/api/chan-dung-tien-kiep/route.ts.
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, String(body.slug || ''));
    if (denied) return err(denied, 402);
  }

  if (look.cached) {
    CACHE.touch('main', look.key);
    // Người mới (vừa trả đủ tiền) cần dòng lịch sử của RIÊNG họ: để thấy trong
    // mục Lịch sử, và để lần sau được nhận diện là đã trả cho lá số này.
    if (!look.owns && look.cached.row) {
      insertHistoryRow(TOOL_ID, { ...look.cached.row, user_id: auth.user.id, laso_key: look.key });
      // Tặng lượt rail CHỈ cho lượt có trả tiền. Tặng cả ở lượt xem lại miễn
      // phí thì mở đúng một đường farm: mở lại chân dung cũ vài lần là có lượt
      // rail vô hạn.
      void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});
    }
    return ok({ ...look.cached.payload, cached: true, freeRerun: look.free });
  }

  const lasoRes = computeLaso(birth);
  if (!lasoRes.ok || !lasoRes.ls) return err(lasoRes.error || 'Không lập được lá số.', 400);

  const userGender = birth.gender === 'nu' ? 'nu' : 'nam';
  const morph = computeSpouseMorphology(lasoRes.ls, userGender);
  const phuThe = getPhuTheReadout(lasoRes.ls);
  const phuTheElement = getPhuTheChinhTinhElement(lasoRes.ls);

  // Lượt LLM RIÊNG: luận giải cung Phu Thê ĐẦY ĐỦ, ĐÚNG flow/văn phong tool
  // luan-giai (mode=phan, phan=12 — xem lib/agent/phu-the-luan-giai.ts) —
  // hiển thị cho user bên dưới chân dung, và làm nguồn CHÍNH XÁC hơn cho việc
  // suy đoán chênh lệch tuổi bạn đời (thay vì chỉ dựa danh sách cách cục thô
  // (B) bên dưới). Best-effort: lỗi thì bỏ qua, không chặn luồng vẽ ảnh.
  let phuTheLuanGiai = '';
  try {
    const laSoText = formatLaSoV2(lasoRes.ls);
    const llmRes = await llmTextFull({
      system: PHU_THE_LUAN_GIAI_SYSTEM_PROMPT,
      prompt: buildPhuTheLuanGiaiPrompt(laSoText, undefined, userGender),
      // 1350→1750 (2026-09-07, Henry): PHU_THE_DESC nới 150-220→200-260 từ +
      // thêm bộ câu hỏi trọng tâm (lib/agent/phu-the-luan-giai.ts) — trần
      // token tăng theo tỉ lệ từ tăng, tránh sát mép gây cắt giữa câu.
      maxTokens: 1750,
    });
    phuTheLuanGiai = llmRes.text.trim();
    void logLlmUsage('chan-dung-vo-chong', llmRes.model, {
      input_tokens: llmRes.usage.input_tokens,
      output_tokens: llmRes.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }, llmRes.durationMs);
  } catch {
    /* best-effort — không chặn vẽ ảnh nếu luận giải lỗi */
  }

  // Prompt phân tích + prompt sinh ảnh cuối cùng — tách sang
  // lib/agent/chan-dung-vo-chong-prompt.ts (2026-09): scripts/gen-tool-sample.mjs
  // (PDF "Xem mẫu") cần gọi ĐÚNG prompt thật, không chép tay bản thứ hai.
  let raw: string;
  try {
    const llmRes = await llmTextFull({
      system: CHAN_DUNG_VO_CHONG_ANALYSIS_SYSTEM_PROMPT,
      prompt: buildChanDungVoChongAnalysisPrompt(morph, phuThe, phuTheLuanGiai, userGender),
      maxTokens: 1650, // nâng 50% (Henry chốt 2026-08-20)
    });
    raw = llmRes.text;
    void logLlmUsage('chan-dung-vo-chong', llmRes.model, {
      input_tokens: llmRes.usage.input_tokens,
      output_tokens: llmRes.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }, llmRes.durationMs);
  } catch {
    return err('Lỗi khi mô tả chân dung. Vui lòng thử lại.', 500);
  }
  const parsed = parseLlmJson(raw) as ChanDungVoChongAnalysis | null;
  if (!parsed?.imagePrompt || !parsed?.description) return err('Lỗi phân tích kết quả trả về.', 500);

  const { finalPrompt, spouseAge, spouseGender } = buildFinalPortraitImagePrompt(
    parsed,
    morph,
    phuTheElement,
    userGender
  );

  let imageB64: string;
  try {
    const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1024x1536' });
    imageB64 = imgRes.b64;
    void logImageUsage('chan-dung-vo-chong', imgRes.model, imgRes.usage, imgRes.durationMs);
  } catch (e) {
    return err('Lỗi sinh ảnh: ' + (e instanceof Error ? e.message : 'không rõ'), 500);
  }

  // Upload Supabase Storage (bucket public 'portraits')
  const path = `${auth.user.id}/${Date.now()}.png`;
  const bytes = Buffer.from(imageB64, 'base64');
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/portraits/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'image/png',
    },
    body: bytes,
  });
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => '');
    return err('Lỗi lưu ảnh: ' + t.slice(0, 200), 500);
  }
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/portraits/${path}`;

  // Bộ cột lịch sử — dựng MỘT lần rồi dùng cho cả dòng của người sinh gốc lẫn
  // dòng của những người trúng cache về sau (`user_id` gắn lúc ghi, nên không
  // để trong này).
  const historyRow = {
    user_gender: userGender,
    spouse_gender: spouseGender,
    spouse_age: spouseAge,
    core_star: morph.coreStar,
    image_url: imageUrl,
    description: parsed.description,
    meeting_context: parsed.meetingContext || null,
    phu_the_luan_giai: phuTheLuanGiai || null,
  };
  // Lưu lịch sử — best-effort, không chặn response nếu lỗi ghi DB.
  insertHistoryRow(TOOL_ID, { ...historyRow, user_id: auth.user.id, laso_key: look.key });

  // Vẽ xong → tặng lượt rail miễn phí (V2.2, xem chan-dung-tien-kiep/route.ts).
  void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});

  const payload = {
    success: true,
    imageUrl,
    description: parsed.description,
    meetingContext: parsed.meetingContext || '',
    phuTheLuanGiai: phuTheLuanGiai || '',
    spouseGender,
    spouseAge,
    phuThe,
  };
  CACHE.put('main', look.key, { payload, row: historyRow }, auth.user.id);
  return ok(payload);
}

// ── History ───────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/spouse_portraits?user_id=eq.${auth.user.id}&select=id,created_at,image_url,description,meeting_context,phu_the_luan_giai,spouse_gender,spouse_age&order=created_at.desc&limit=20`,
    { cache: 'no-store', headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  const items = await r.json();
  return ok({ success: true, items });
}

// ── Cache status ──────────────────────────────────────────────────────
// Client hỏi TRƯỚC khi mở hộp thoại trừ Lượng: lá số này đã có sẵn kết quả
// chưa, và người đang hỏi có được xem lại miễn phí không. Thuần ĐỌC, không
// sinh gì, không trừ gì. Server vẫn tự kiểm lại y hệt lúc POST — endpoint này
// chỉ để khỏi hiện hộp thoại đòi tiền cho một lượt vốn không mất tiền.
async function handleCacheStatus(request: NextRequest, sp: URLSearchParams) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const key = lasoKey(birthFromQuery(sp));
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get('main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  // `cached` = có dòng DÙNG ĐƯỢC (dòng cũ đã bị lọc). `free` = đã trả tiền cho
  // lá số này, kể cả khi dòng cũ và sắp phải dựng lại.
  return ok({ success: true, cached: Boolean(cached), free: Boolean(cached || stale) && owns });
}

// ── Routes ────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return options();
}

async function runPost(request: NextRequest) {
  const body = await parseBody(request);
  const res = await handleGenerate(request, body);
  // Hoàn Lượng nếu hỏng vì lỗi HỆ THỐNG (S3 track COO). userId lấy lại từ token
  // ở đây thay vì luồn ra từ handleGenerate — rẻ hơn nhiều so với chi phí một
  // lượt sinh ảnh, và giữ handleGenerate không phải đổi chữ ký.
  const auth = await authUserFromRequest(request);
  if ('user' in auth) {
    return refundIfSystemFailure(res, {
      toolId: 'chan-dung-vo-chong',
      userId: auth.user.id,
      slug: String(body.slug || ''),
    });
  }
  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  if (action === 'cache-status') return handleCacheStatus(request, searchParams);
  return err('Invalid action', 400);
}

// S1 (track COO) — bọc để tự ghi lượt chạy thành công/hỏng vào `events`.
// Chỉ QUAN SÁT: ngoại lệ vẫn ném lại nguyên vẹn, Response trả về không đổi.
//
// Rẽ sang lượt tính thử NGAY TẠI ĐÂY, trước cả withToolOutcome — xem chú thích
// cùng loại ở app/api/chan-dung-tien-kiep/route.ts.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome('chan-dung-vo-chong', () => runPost(request));
}
