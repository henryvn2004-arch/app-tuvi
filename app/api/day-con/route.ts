// app/api/day-con/route.ts
// POST /api/day-con                    — dựng bản hướng dẫn nuôi dạy (1 pha)
// GET  /api/day-con?action=history     — lịch sử đã dựng
// GET  /api/day-con?action=cache-status — lượt XEM LẠI có miễn phí không
//
// Tool "Dạy Con Theo Lá Số" (T2). Một pha: không sinh ảnh nên cả lượt chỉ tốn
// ĐÚNG một lượt LLM.

// 120 → 300 (2026-08-20): llmTextFull nay chuỗi 3 provider (Kimi K3 → Opus 5
// → Gemini Flash) + trần token đã nâng 50% — cùng lý do lasotuvi/route.ts.
export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { refundIfSystemFailure } from '@/lib/ops/refund';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logLlmParseFail } from '@/lib/agent/usage';
import { railFreeGrant, railFreeTurnsPerGen } from '@/lib/billing/viral-budget';
import { computeLaso, type Laso } from '@/lib/engine/laso';
import { computeDayCon, resolveMoiLo, type DayConProfile } from '@/lib/engine/day-con';
import { coSoDoc } from '@/lib/engine/nguoi-khac';
import { DAY_CON_SYSTEM_PROMPT, DAY_CON_SCHEMA, buildDayConPrompt } from '@/lib/agent/day-con-prompt';
import type { BirthParams } from '@/lib/contract/v1';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import {
  cacheFor,
  lasoKey,
  insertHistoryRow,
  userOwnsLaso,
} from '@/lib/portraits/cache';

const TOOL_ID = 'day-con';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/**
 * Khoá cache — CÓ tính lá số cha/mẹ vào khoá (khi có), cùng lý do với T1: mục
 * "hai bên với nhau" đọc cung Tử Tức trong lá số CỦA CHA MẸ, nên dùng chung
 * một bản cache giữa hai người hỏi khác nhau là đem phần đó của người này gán
 * cho người kia. `moiLo` cũng vào khoá vì nó đổi giọng cả bản luận.
 */
function cacheExtra(moiLo: string, birthParent?: BirthParams | null): string {
  return `lo:${moiLo}|cm:${birthParent ? lasoKey(birthParent) : '-'}`;
}

interface Muc {
  viec?: string;
  vidu?: string;
}
interface HuongDan {
  conNguoi?: string;
  chatNoi?: string;
  dinhHuong?: string;
  vaoBangGi?: string;
  khoaLai?: string;
  nenLam?: Muc[];
  tranhLam?: Muc[];
  hoatDong?: string;
  loLang?: string;
  changNay?: string;
  voiChaMe?: string;
  motCau?: string;
}

/**
 * 🔴 PHIÊN BẢN CẤU TRÚC payload. BUMP mỗi khi thêm/đổi khoá mà TRANG BẮT BUỘC
 * phải có để dựng đủ màn hình.
 *
 * Vì sao cần: `portrait_cache` khoá theo lá số, KHÔNG theo shape — nên đổi cấu
 * trúc xong thì mọi dòng cũ vẫn được trả về nguyên trạng, mãi mãi. Đã cắn thật:
 * khung "5 Trục · 8 Chất" lên prod, người đã chạy tool hôm trước mở lại thấy
 * MỘT khối duy nhất còn sống (khối cũ) còn 4 khối mới im lặng biến mất, không
 * lỗi nào bắn ra. Dấu ở đây làm dòng cũ bị coi như CHƯA CÓ ⇒ dựng lại rồi GHI
 * ĐÈ.
 *
 * ⚠️ Cố ý KHÔNG nhét vào `lasoKey`: đổi khoá là mồ côi toàn bộ cache VÀ
 * `userOwnsLaso` — người đã trả tiền bị tính lại. Khoá giữ nguyên nên lượt dựng
 * lại vẫn miễn phí đúng cho họ.
 */
// P1 (2026-09): bump vì `_LUNAR_TABLE` sinh lại theo oracle Thiên Lương — GIÁ
// TRỊ lá số của người sinh vào ngày lệch bảng cũ đổi, không phải cấu trúc
// payload (fingerprint giữ nguyên). Xem docs/nhat-ky/2026-09.md.
const SHAPE = 3;

/**
 * Vân tay CẤU TRÚC hồ sơ engine (`computeDayCon`) — nguồn của `meta()` ở dưới.
 * `npm run check:cacheshape` canh khớp: đổi/thêm/bớt khoá ⇒ đỏ và in vân tay
 * mới, buộc bump `SHAPE` CÙNG LÚC. Chính bump 1→2 ở #465 là do quên mà ra.
 */
const SHAPE_FINGERPRINT = '4ec3392fed42';

/** Cửa DUY NHẤT vào cache của tool này; `shape` khai một lần tại đây. */
const CACHE = cacheFor(TOOL_ID, SHAPE);

/** Phần deterministic trả kèm — client dựng được khung ngay cả khi phần chữ mỏng. */
function meta(p: DayConProfile, ten: string) {
  return {
    ten,
    moiLo: { id: p.moiLo.id, label: p.moiLo.label, can: p.moiLo.can },
    gioiTinh: p.gioiTinh,
    tuoi: p.tuoi,
    namSinh: p.namSinh,
    kieu: {
      id: p.kieu.id,
      ten: p.kieu.ten,
      tuTuong: p.kieu.tuTuong,
      motCau: p.kieu.motCau,
      dongLuc: p.kieu.dongLuc,
    },
    kieuPhu: p.kieuPhu ? { id: p.kieuPhu.id, ten: p.kieuPhu.ten, motCau: p.kieuPhu.motCau } : null,
    lai: p.phan.lai,
    toaDo: { x: p.phan.xNorm, y: p.phan.yNorm },
    hoc: p.hoc,
    than: p.than,
    matDoc: p.matDoc,
    changHoc: p.changHoc,
    vanNam: p.vanNam,
    voiChaMeCoSo: p.voiChaMe,
    namXem: p.namXem,
    // Khung "5 Trục · 8 Chất" — tra bảng thuần, 0 lượt LLM ⇒ thuộc phần TÍNH
    // THỬ MIỄN PHÍ (W1). Tường chỉ đứng trên phần chữ do model viết.
    truc: p.assess.truc,
    khieu: p.assess.khieu,
    khieuNoiBat: p.assess.noiBat.map((k) => k.id),
    coNoiBat: p.assess.coNoiBat,
    chatThapNhat: p.assess.canDo,
    // 🪤 TÊN KHÁC khoá `hoatDong` mà model trả về. `payload` spread `meta()`
    // TRƯỚC rồi mới gán các khoá chữ — trùng tên là bảng hoạt động bị đè bằng
    // một đoạn văn, và trang mất hẳn khối gợi ý mà KHÔNG có lỗi nào bắn ra.
    goiYHoatDong: p.hoatDong,
  };
}

const clean = (v: unknown) => String(v == null ? '' : v).trim();

function normMuc(arr: unknown): { viec: string; vidu: string }[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 3)
    .map((m) => ({ viec: clean((m as Muc)?.viec), vidu: clean((m as Muc)?.vidu) }))
    .filter((m) => m.viec);
}

async function buildReport(
  p: DayConProfile,
  ten: string,
  userId: string,
  key: string,
  coLaSoChaMe: boolean,
) {
  const prompt = buildDayConPrompt(p, ten);

  const ask = async (nudge: boolean) => {
    try {
      const r = await llmTextFull({
        system: DAY_CON_SYSTEM_PROMPT,
        prompt:
          prompt +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: DAY_CON_SCHEMA,
        // 3.200 đủ cho 9 khoá; khung mới thêm `chatNoi`/`dinhHuong`/`hoatDong`
        // nên nới lên — chạm trần là JSON cụt và cả lượt rơi vào nhánh thử lại.
        // Nâng thêm 50% cùng đợt (Henry chốt 2026-08-20).
        maxTokens: 6600,
        // provider:'anthropic' (chốt Henry 2026-08-24): Dạy Con Theo Lá Số
        // thuộc nhóm tool "luận giải" quan trọng → Opus 5 primary (xem
        // lib/llm/complete.ts CANONICAL_ORDER). Lưu ý: `jsonSchema` KHÔNG có
        // tác dụng ép shape ở nhánh Anthropic (chỉ Gemini đọc field này) — vẫn
        // an toàn nhờ cơ chế `nudge` retry sẵn có ở hàm này khi JSON sai định
        // dạng.
        provider: 'anthropic',
      });
      void logLlmUsage(TOOL_ID, r.model, {
        input_tokens: r.usage.input_tokens,
        output_tokens: r.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }, r.durationMs);
      return r;
    } catch (e) {
      console.error('[day-con] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  // Chỉ đòi `conNguoi` + `nenLam`: hai khối làm nên món hàng. Thiếu mục phụ thì
  // giấu khối đó chứ KHÔNG vứt cả lượt người ta đã trả tiền.
  const okShape = (v: HuongDan | null): v is HuongDan =>
    Boolean(clean(v?.conNguoi)) && Array.isArray(v?.nenLam) && v.nenLam.length > 0;

  let res = await ask(false);
  if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.text) as HuongDan | null;

  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[day-con] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`);
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await ask(true);
    if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.text) as HuongDan | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[day-con] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`);
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  const payload = {
    success: true,
    ...meta(p, ten),
    conNguoi: clean(parsed.conNguoi),
    chatNoi: clean(parsed.chatNoi),
    dinhHuong: clean(parsed.dinhHuong),
    vaoBangGi: clean(parsed.vaoBangGi),
    khoaLai: clean(parsed.khoaLai),
    nenLam: normMuc(parsed.nenLam),
    tranhLam: normMuc(parsed.tranhLam),
    // Không đọc được tuổi thì KHÔNG nhận phần này dù model có viết — nó sẽ là
    // lời chung chung không dựa trên nhóm tuổi nào. Cùng lối với `voiChaMe`.
    hoatDong: p.hoatDong ? clean(parsed.hoatDong) : '',
    loLang: clean(parsed.loLang),
    changNay: clean(parsed.changNay),
    // Không có lá số cha/mẹ thì KHÔNG nhận phần đó dù model có viết — nó sẽ là
    // lời chung chung không dựa trên dữ kiện nào.
    voiChaMe: coLaSoChaMe ? clean(parsed.voiChaMe) : '',
    motCau: clean(parsed.motCau),
  };

  const row = {
    ten,
    moi_lo: p.moiLo.id,
    moi_lo_label: p.moiLo.label,
    kieu: p.kieu.id,
    kieu_ten: p.kieu.ten,
  };
  insertHistoryRow(TOOL_ID, { ...row, user_id: userId, laso_key: key });
  void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});
  // Ghi đè CHỈ ở nhánh dựng-lại-vì-shape-cũ. Không có vế này thì dòng hỏng nằm
  // nguyên và mỗi lượt xem lại đốt thêm một lượt model.
  CACHE.put('main', key, { payload, row }, userId);
  return ok(payload);
}

/**
 * W1 — TÍNH THỬ MIỄN PHÍ. Xem chú thích dài ở `app/api/nguoi-khac/route.ts`:
 * hàm RIÊNG chứ không phải một cờ trong `runPost`, 0 lượt LLM, không chạm
 * thanh toán / lịch sử / cache, không đòi đăng nhập.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của bé.', 400);

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  let lsChaMe: Laso | null = null;
  if (validBirth(body.birthParent)) {
    const rb = computeLaso(body.birthParent as BirthParams);
    if (rb.ok && rb.ls) lsChaMe = rb.ls;
  }
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const p = computeDayCon(r.ls, gender, resolveMoiLo(String(body.moiLo || '')), lsChaMe);
  return ok({
    success: true,
    preview: true,
    ...meta(p, String(body.name || '').trim().slice(0, 60)),
    // C1 — CHỈ ở lượt tính thử: lá chắn cho phản đối "AI nó bịa thôi", đúng chỗ
    // người ta chưa tin gì và đang cân xem có đáng trả tiền không. Hàm dùng
    // CHUNG với `nguoi-khac`, và câu trích cũng đi qua chính `locCachCuc` nên
    // không nói về thọ mệnh/bệnh tật của một đứa trẻ.
    coSo: coSoDoc(r.ls, p),
  });
}

async function runPost(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của bé.', 400);

  const moiLo = resolveMoiLo(String(body.moiLo || ''));
  const ten = String(body.name || '').trim().slice(0, 60);
  const birthParent = validBirth(body.birthParent) ? (body.birthParent as BirthParams) : null;

  const key = lasoKey(birth, cacheExtra(moiLo, birthParent));
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get('main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  // Dòng cũ đã bị `CACHE.get` trả về `cached: null` nên tự khắc DỰNG LẠI —
  // nhưng vẫn tính là "đã có" cho `free`, vì người này đã trả tiền cho đúng lá
  // số đó rồi; bắt trả lần nữa để lấy bản sửa lỗi của mình là sai.
  const free = Boolean(cached || stale) && owns;

  if (!free) {
    // Chốt chặn thanh toán PHÍA SERVER — thiếu bước này thì gọi thẳng endpoint
    // là dựng bản luận miễn phí không giới hạn.
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, String(body.slug || ''));
    if (denied) return err(denied, 402);
  }

  if (cached) {
    CACHE.touch('main', key);
    if (!owns && cached.row) {
      insertHistoryRow(TOOL_ID, { ...cached.row, user_id: auth.user.id, laso_key: key });
      void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});
    }
    return ok({ ...cached.payload, cached: true, freeRerun: free });
  }

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  let lsChaMe: Laso | null = null;
  if (birthParent) {
    const rb = computeLaso(birthParent);
    // Lá số cha/mẹ hỏng thì BỎ QUA phần "hai bên", KHÔNG chặn cả lượt.
    if (rb.ok && rb.ls) lsChaMe = rb.ls;
  }

  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const profile = computeDayCon(r.ls, gender, moiLo, lsChaMe);

  const res = await buildReport(profile, ten, auth.user.id, key, Boolean(lsChaMe));
  return refundIfSystemFailure(res, {
    toolId: TOOL_ID,
    userId: auth.user.id,
    slug: String(body.slug || ''),
  });
}

async function handleHistory(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/day_con_reports?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,ten,moi_lo,moi_lo_label,kieu,kieu_ten' +
      '&order=created_at.desc&limit=20',
    { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }, cache: 'no-store' },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  return ok({ success: true, items: await r.json() });
}

async function handleCacheStatus(request: NextRequest, sp: URLSearchParams) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);
  const n = (k: string) => Number(sp.get(k) || 0);
  const birth: BirthParams = {
    day: n('d'),
    month: n('m'),
    year: n('y'),
    hourBranch: sp.get('h') === null ? -1 : n('h'),
    gender: sp.get('g') === 'nu' ? 'nu' : 'nam',
    isLunar: sp.get('lunar') === '1',
  };
  const parent: BirthParams | null = sp.get('py')
    ? {
        day: n('pd'),
        month: n('pm'),
        year: n('py'),
        hourBranch: sp.get('ph') === null ? -1 : n('ph'),
        gender: sp.get('pg') === 'nu' ? 'nu' : 'nam',
        isLunar: sp.get('plunar') === '1',
      }
    : null;
  const key = lasoKey(birth, cacheExtra(resolveMoiLo(sp.get('lo')), parent));
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get('main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  // `cached` = có dòng DÙNG ĐƯỢC (dòng cũ đã bị lọc). `free` = đã trả tiền cho
  // lá số này, kể cả khi dòng cũ và sắp phải dựng lại.
  return ok({ success: true, cached: Boolean(cached), free: Boolean(cached || stale) && owns });
}

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  if (action === 'cache-status') return handleCacheStatus(request, searchParams);
  return err('Invalid action', 400);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
