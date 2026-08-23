// app/api/huong-nghiep-tre/route.ts
// POST /api/huong-nghiep-tre                     — dựng bản định hướng (1 pha)
// POST /api/huong-nghiep-tre?preview=1           — TÍNH THỬ, không thu tiền
// GET  /api/huong-nghiep-tre?action=history      — lịch sử đã dựng
// GET  /api/huong-nghiep-tre?action=cache-status — lượt XEM LẠI có miễn phí không
//
// Tool "Hướng Nghiệp Sớm Cho Con". Một pha: không sinh ảnh nên cả lượt chỉ tốn
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
import { computeLaso } from '@/lib/engine/laso';
import {
  computeHuongNghiepTre,
  hoSoTinhThu,
  hoSoDayDu,
  resolveMoiLo,
  type HuongNghiepTreProfile,
} from '@/lib/engine/huong-nghiep-tre';
import {
  HUONG_NGHIEP_TRE_SYSTEM_PROMPT,
  HUONG_NGHIEP_TRE_SCHEMA,
  buildHuongNghiepTrePrompt,
} from '@/lib/agent/huong-nghiep-tre-prompt';
import type { BirthParams } from '@/lib/contract/v1';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import {
  cacheFor,
  lasoKey,
  insertHistoryRow,
  userOwnsLaso,
} from '@/lib/portraits/cache';

const TOOL_ID = 'huong-nghiep-tre';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/**
 * `moiLo` vào khoá cache vì nó đổi giọng cả bản luận. `namXem` cũng vào khoá:
 * tool này đọc TUỔI của đứa trẻ để chọn lứa hoạt động, nên cùng một lá số ở hai
 * năm khác nhau phải ra hai bản khác nhau — thiếu năm trong khoá là đứa 12 tuổi
 * sang năm vẫn nhận đúng bộ hoạt động của lứa cũ.
 */
function cacheExtra(moiLo: string, namXem: number): string {
  return `lo:${moiLo}|nx:${namXem}`;
}

/**
 * 🔴 PHIÊN BẢN CẤU TRÚC payload. BUMP mỗi khi thêm/đổi khoá mà TRANG BẮT BUỘC
 * phải có để dựng đủ màn hình.
 *
 * Cùng cơ chế `day-con` vừa phải dựng ở #465, và tool này có ĐÚNG cái rủi ro
 * đó: `portrait_cache` khoá theo lá số, KHÔNG theo shape — nên đổi cấu trúc
 * xong thì mọi dòng cũ vẫn được trả về nguyên trạng, mãi mãi. Bên kia đã cắn
 * thật: khung mới lên prod, người chạy hôm trước mở lại thấy 4 khối im lặng
 * biến mất, không lỗi nào bắn ra.
 *
 * ⚠️ Cố ý KHÔNG nhét vào `lasoKey`: đổi khoá là mồ côi toàn bộ cache VÀ
 * `userOwnsLaso` — người đã trả tiền bị tính lại. Khoá giữ nguyên nên lượt dựng
 * lại vẫn miễn phí đúng cho họ.
 */
const SHAPE = 2;
/* Lịch sử bump:
   1 → 2 (lượt vá tuổi thật, #475): thêm khoá `laTreEm` mà trang đọc để ẩn nhãn
   lứa, thêm `xungHo` cho từng lứa, thêm hẳn lứa `vaodoi` (19–25) kèm 9 khối
   hoạt động mới. 🐞 Lượt đó QUÊN bump — đúng thứ khối chú thích ngay trên dặn
   phải làm — nên dòng cache ghi trước bản vá vẫn được trả nguyên trạng: đo
   được trên prod một dòng `tuoi=43` mang `lop:"lon"` (kẹp tuổi cũ) và KHÔNG có
   `laTreEm`. Quên bump là hỏng IM LẶNG, giống hệt ca `day-con` ở #465. */

/**
 * Vân tay CẤU TRÚC của `hoSoDayDu(p)` — `npm run check:cacheshape` canh khớp.
 * Đổi/thêm/bớt khoá ⇒ bộ dò đỏ và in vân tay mới, buộc bump `SHAPE` CÙNG LÚC.
 * (Lời dặn ở khối trên đã có sẵn từ đầu mà tôi vẫn quên — nên phải có máy canh.)
 */
const SHAPE_FINGERPRINT = '5242585a3d68';

/** Cửa DUY NHẤT vào cache của tool này; `shape` khai một lần tại đây. */
const CACHE = cacheFor(TOOL_ID, SHAPE);

interface Muc {
  viec?: string;
  viSao?: string;
}
interface BanDinhHuong {
  nhinRaCon?: string;
  viSaoHuongNay?: string;
  batDauTuDau?: Muc[];
  tranhLam?: Muc[];
  noiTheNao?: string;
  loLang?: string;
  mocKeTiep?: string;
  motCau?: string;
}

const clean = (v: unknown) => String(v == null ? '' : v).trim();

function normMuc(arr: unknown, max: number): { viec: string; viSao: string }[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, max)
    .map((m) => ({ viec: clean((m as Muc)?.viec), viSao: clean((m as Muc)?.viSao) }))
    .filter((m) => m.viec);
}

async function buildReport(
  p: HuongNghiepTreProfile,
  ten: string,
  userId: string,
  key: string,
) {
  const prompt = buildHuongNghiepTrePrompt(p, ten);

  const ask = async (nudge: boolean) => {
    try {
      const r = await llmTextFull({
        system: HUONG_NGHIEP_TRE_SYSTEM_PROMPT,
        prompt:
          prompt +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: HUONG_NGHIEP_TRE_SCHEMA,
        maxTokens: 4800, // nâng 50% cùng đợt (Henry chốt 2026-08-20)
      });
      void logLlmUsage(
        TOOL_ID,
        r.model,
        {
          input_tokens: r.usage.input_tokens,
          output_tokens: r.usage.output_tokens,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        // Thiếu tham số này là tool vô hình trong cột thời lượng của panel Biên
        // Lợi Nhuận — `llmTextFull` đã đo sẵn, chỉ việc chuyển tiếp.
        r.durationMs,
      );
      return r;
    } catch (e) {
      console.error('[huong-nghiep-tre] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  // Chỉ đòi `nhinRaCon` + `batDauTuDau`: hai khối làm nên món hàng. Thiếu mục
  // phụ thì giấu khối đó chứ KHÔNG vứt cả lượt người ta đã trả tiền.
  const okShape = (v: BanDinhHuong | null): v is BanDinhHuong =>
    Boolean(clean(v?.nhinRaCon)) && Array.isArray(v?.batDauTuDau) && v.batDauTuDau.length > 0;

  let res = await ask(false);
  if (!res) return err('Lỗi AI khi dựng bản định hướng. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.text) as BanDinhHuong | null;

  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(
      `[huong-nghiep-tre] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`,
    );
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await ask(true);
    if (!res) return err('Lỗi AI khi dựng bản định hướng. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.text) as BanDinhHuong | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(
      `[huong-nghiep-tre] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`,
    );
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  const payload = {
    success: true,
    ten,
    ...hoSoDayDu(p),
    nhinRaCon: clean(parsed.nhinRaCon),
    viSaoHuongNay: clean(parsed.viSaoHuongNay),
    batDauTuDau: normMuc(parsed.batDauTuDau, 3),
    tranhLam: normMuc(parsed.tranhLam, 2),
    noiTheNao: clean(parsed.noiTheNao),
    loLang: clean(parsed.loLang),
    mocKeTiep: clean(parsed.mocKeTiep),
    motCau: clean(parsed.motCau),
  };

  const row = {
    ten,
    moi_lo: p.moiLo.id,
    moi_lo_label: p.moiLo.label,
    lop: p.lop.id,
    huong: p.huong.goiY[0]?.id || '',
    huong_ten: p.huong.goiY[0]?.ten || '',
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
 *
 * 🔑 Đường tiền cắt bằng ĐÚNG MỘT DÒNG đọc ra được: `hoSoTinhThu` ở đây,
 * `hoSoDayDu` ở `buildReport`. Có bài kiểm canh đúng hai dòng đó.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của bé.', 400);

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const p = computeHuongNghiepTre(r.ls, gender, resolveMoiLo(String(body.moiLo || '')));
  return ok({
    success: true,
    preview: true,
    ten: String(body.name || '').trim().slice(0, 60),
    ...hoSoTinhThu(p),
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

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const profile = computeHuongNghiepTre(r.ls, gender, moiLo);

  // 🔴 CHẶN TRƯỚC KHI CHẠM VÍ. Tool này viết cho cha mẹ đọc về CON, nên lá số
  // đã trưởng thành thì bản đọc trả tiền sai từ gốc — không phải sai vài đại từ
  // mà sai cả đối tượng, cả giọng, cả bảng hoạt động. Bản đầu kẹp tuổi về lứa
  // 13–18 rồi bán tiếp: lá số 43 tuổi nhận một bản gọi mình là "bé trai".
  // Từ chối ở ĐÂY (trước `toolPaymentDenied`) nên người dùng KHÔNG mất Lượng.
  if (!profile.laTreEm) {
    return err(
      `Lá số này đã ${profile.tuoi} tuổi — đây không còn là câu hỏi định hướng sớm cho con. ` +
        'Phần thiên hướng ở trên vẫn đọc được và miễn phí. Muốn đọc hướng nghiệp cho người ' +
        'trưởng thành thì dùng Tử Vi Công Sở & Hướng Nghiệp.',
      422,
    );
  }

  const key = lasoKey(birth, cacheExtra(moiLo, profile.namXem));
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
    // là dựng bản định hướng miễn phí không giới hạn.
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

  const res = await buildReport(profile, ten, auth.user.id, key);
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
    `${SUPABASE_URL}/rest/v1/huong_nghiep_tre_reports?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,ten,moi_lo,moi_lo_label,lop,huong,huong_ten' +
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
  // Năm xem lấy từ CHÍNH engine, không nhận từ query: client tự khai năm là mở
  // đường tra một khoá cache khác với khoá lượt dựng sẽ dùng.
  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  const p = computeHuongNghiepTre(r.ls, birth.gender === 'nu' ? 'nu' : 'nam', resolveMoiLo(sp.get('lo')));
  const key = lasoKey(birth, cacheExtra(p.moiLo.id, p.namXem));
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
