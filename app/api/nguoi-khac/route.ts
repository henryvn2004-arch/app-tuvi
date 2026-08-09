// app/api/nguoi-khac/route.ts
// POST /api/nguoi-khac                  — dựng bản cẩm nang ứng xử (1 pha)
// GET  /api/nguoi-khac?action=history   — lịch sử đã dựng
// GET  /api/nguoi-khac?action=cache-status — lượt XEM LẠI có miễn phí không
//
// Tool "Lá Số Người Khác" (T1): nhập lá số sếp/đồng nghiệp/người thân → bản
// cẩm nang "làm sao sống chung với người này".
//
// Một pha (khác 2 tool chân dung): không sinh ảnh nên cả lượt chỉ tốn ĐÚNG một
// lượt LLM (~vài chục đồng), xong trong vài giây — không cần tách pha để giấu
// thời gian chờ.

export const maxDuration = 120;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { refundIfSystemFailure } from '@/lib/ops/refund';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logLlmParseFail } from '@/lib/agent/usage';
import { railFreeGrant, railFreeTurnsPerGen } from '@/lib/billing/viral-budget';
import { computeLaso, type Laso } from '@/lib/engine/laso';
import {
  computeNguoiKhac,
  resolveQuanHe,
  resolveViec,
  khoiKhoa,
  viecChoQuanHe,
  MAT_DOC_PREVIEW,
  coSoDoc,
  type NguoiKhacProfile,
} from '@/lib/engine/nguoi-khac';
import {
  NGUOI_KHAC_SYSTEM_PROMPT,
  NGUOI_KHAC_SCHEMA,
  buildNguoiKhacPrompt,
} from '@/lib/agent/nguoi-khac-prompt';
import type { BirthParams } from '@/lib/contract/v1';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import {
  lasoKey,
  getCachedPortrait,
  putCachedPortrait,
  touchCache,
  insertHistoryRow,
  userOwnsLaso,
} from '@/lib/portraits/cache';

const TOOL_ID = 'nguoi-khac';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/**
 * Khoá cache.
 *
 * 🔑 CÓ tính lá số NGƯỜI XEM vào khoá (khi họ có), khác hẳn 2 tool chân dung.
 * Lý do: mục "Người này với bạn" đọc cung Phụ Mẫu/Huynh Đệ/Nô Bộc trong lá số
 * CỦA NGƯỜI XEM — dùng chung một bản cache giữa hai người xem khác nhau là đem
 * phần "với bạn" của người này gán cho người kia. Đổi lại, cache gần như chỉ
 * còn phục vụ CHÍNH chủ xem lại; điều đó chấp nhận được vì đó đúng là ca đáng
 * tiền (không gian lá số ~260K tổ hợp nên trùng chéo vốn đã hiếm).
 */
function cacheExtra(quanHe: string, birthSelf?: BirthParams | null, viec?: string): string {
  // ⚠️ `viec` PHẢI nằm trong khoá: nó đổi hẳn một khối của bản luận (`keHoach`)
  // và đổi giọng phần còn lại. Bỏ ra ngoài thì người chọn "thương lượng lương"
  // nhận lại đúng bản đã dựng cho "báo tin xấu" — sai IM LẶNG, và tệ hơn là họ
  // vừa trả tiền cho nó. Cùng lối `moiLo` của tool Dạy Con.
  return `qh:${quanHe}|self:${birthSelf ? lasoKey(birthSelf) : '-'}|viec:${viec || 'hieu-them'}`;
}

interface Muc {
  viec?: string;
  vidu?: string;
}
interface CamNang {
  keHoach?: string;
  tinhKhi?: string;
  chamNoc?: string;
  coiTrong?: string;
  nenNoi?: Muc[];
  tranhNoi?: Muc[];
  thoiDiem?: string;
  voiBan?: string;
  motCau?: string;
}

/**
 * Phần deterministic trả kèm — client dựng được khung ngay cả khi phần chữ mỏng.
 *
 * `full=false` (đường TÍNH THỬ) cắt hai lớp:
 *
 * **A4 — vá lỗ payload.** Bỏ phần MÔ TẢ TÍNH CÁCH của kiểu người (`dongLuc` ·
 * `datChat` · `manh` · `yeu` · `moiTruongHop` · `moiTruongKy`). Giao diện KHÔNG
 * vẽ mấy trường đó ở bất kỳ đâu, mà rail thì tự tính lại ở server — tức chúng
 * chưa từng được client dùng. Nhưng lượt tính thử KHÔNG đòi đăng nhập, nên mở
 * devtools là có sẵn bản mô tả tính cách đầy đủ, 0đ. Cắt ở tầng payload, đừng
 * trông vào việc giao diện "quên" vẽ.
 *
 * **A1 — cắt dữ liệu ENGINE.** Đây là bước LẤY ĐI, cố ý đi SAU A3 (bước chỉ
 * THÊM) để phần free mất đi đã có thứ bù vào:
 *   • `matDoc` còn **2/5 mặt** (`MAT_DOC_PREVIEW` — xem lý do chia ở engine),
 *     và hai mặt đó chỉ còn TÊN SAO, **không kèm `cachCuc` hay `diem`**. Tên
 *     sao là thứ đối chiếu được với bất kỳ trang tử vi nào ⇒ đủ chứng minh
 *     engine đọc thật; còn `cachCuc` là bản diễn giải, tức là hàng.
 *   • `daiVan` + `vanNam` bỏ hẳn — đó là dữ liệu THỜI ĐIỂM, mà "lúc nào nên đưa
 *     việc lớn tới" (`thoiDiem`) chính là một khối trả tiền. Phát nguyên liệu
 *     thô của một khối đang bán là tự bán rẻ nó.
 *   • `than` + `voiBanCoSo` bỏ — `renderProse` mới dùng tới, tức đường tính thử
 *     đang chở hai trường không ai vẽ.
 *
 * Đường trả tiền GIỮ NGUYÊN hình dạng cả gói — đổi shape payload đã nằm trong
 * `portrait_cache` không đáng để dọn vài trường thừa.
 */
function meta(p: NguoiKhacProfile, ten: string, full = true) {
  return {
    ten,
    quanHe: { id: p.quanHe.id, label: p.quanHe.label, cungCuaBan: p.quanHe.cungCuaBan },
    viec: { id: p.viec.id, label: p.viec.label },
    gioiTinh: p.gioiTinh,
    kieu: {
      id: p.kieu.id,
      ten: p.kieu.ten,
      tuTuong: p.kieu.tuTuong,
      motCau: p.kieu.motCau,
      cauHoi: p.kieu.cauHoi,
      ...(full
        ? {
            dongLuc: p.kieu.dongLuc,
            datChat: p.kieu.datChat,
            manh: p.kieu.manh,
            yeu: p.kieu.yeu,
            moiTruongHop: p.kieu.moiTruongHop,
            moiTruongKy: p.kieu.moiTruongKy,
          }
        : {}),
    },
    kieuPhu: p.kieuPhu ? { id: p.kieuPhu.id, ten: p.kieuPhu.ten, motCau: p.kieuPhu.motCau } : null,
    lai: p.phan.lai,
    toaDo: { x: p.phan.xNorm, y: p.phan.yNorm },
    matDoc: full
      ? p.matDoc
      : p.matDoc
          .filter((m) => (MAT_DOC_PREVIEW as readonly string[]).includes(m.cung))
          .map((m) => ({ cung: m.cung, nhan: m.nhan, sao: m.sao, muon: m.muon })),
    ...(full
      ? { than: p.than, vanNam: p.vanNam, daiVan: p.daiVan, voiBanCoSo: p.voiBan }
      : {}),
    namXem: p.namXem,
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
  p: NguoiKhacProfile,
  ten: string,
  userId: string,
  key: string,
  coLaSoBan: boolean,
) {
  const prompt = buildNguoiKhacPrompt(p, ten);

  const ask = async (nudge: boolean) => {
    try {
      const r = await llmTextFull({
        system: NGUOI_KHAC_SYSTEM_PROMPT,
        prompt:
          prompt +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: NGUOI_KHAC_SCHEMA,
        maxTokens: 3000,
      });
      void logLlmUsage(TOOL_ID, r.model, {
        input_tokens: r.usage.input_tokens,
        output_tokens: r.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });
      return r;
    } catch (e) {
      console.error('[nguoi-khac] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  // Chỉ đòi `tinhKhi` + `nenNoi`: đó là hai khối làm nên món hàng. Thiếu một
  // mục phụ thì giấu khối đó đi chứ KHÔNG vứt cả lượt người ta đã trả tiền.
  const okShape = (v: CamNang | null): v is CamNang =>
    Boolean(clean(v?.tinhKhi)) && Array.isArray(v?.nenNoi) && v.nenNoi.length > 0;

  let res = await ask(false);
  if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.text) as CamNang | null;

  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nguoi-khac] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`);
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await ask(true);
    if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.text) as CamNang | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nguoi-khac] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`);
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  const payload = {
    success: true,
    ...meta(p, ten),
    // Người hỏi không nêu việc cụ thể thì KHÔNG nhận mục này dù model có viết —
    // cùng luật với `voiBan`: không có dữ kiện thì đó là lời chung chung.
    keHoach: p.viec.id === 'hieu-them' ? '' : clean(parsed.keHoach),
    tinhKhi: clean(parsed.tinhKhi),
    chamNoc: clean(parsed.chamNoc),
    coiTrong: clean(parsed.coiTrong),
    nenNoi: normMuc(parsed.nenNoi),
    tranhNoi: normMuc(parsed.tranhNoi),
    thoiDiem: clean(parsed.thoiDiem),
    // Không có lá số người xem thì KHÔNG nhận phần "với bạn" dù model có viết —
    // nó sẽ là lời chung chung không dựa trên dữ kiện nào.
    voiBan: coLaSoBan ? clean(parsed.voiBan) : '',
    motCau: clean(parsed.motCau),
  };

  const row = {
    ten,
    quan_he: p.quanHe.id,
    quan_he_label: p.quanHe.label,
    kieu: p.kieu.id,
    kieu_ten: p.kieu.ten,
  };
  insertHistoryRow(TOOL_ID, { ...row, user_id: userId, laso_key: key });
  void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});
  void putCachedPortrait(TOOL_ID, 'main', key, { payload, row }, userId);
  return ok(payload);
}

/**
 * W1 — TÍNH THỬ MIỄN PHÍ.
 *
 * Trả về ĐÚNG tầng deterministic (`meta`): kiểu người, toạ độ, 5 mặt đọc, đại
 * vận, vận năm. Toàn bộ là tra bảng — **0 lượt LLM, 0đ**. Phần chữ (thứ tốn
 * tiền) không nằm ở đây và không có đường nào lấy được từ đây.
 *
 * 🔑 HÀM RIÊNG, KHÔNG phải một cờ trong `runPost`. Đây là chốt chặn thanh toán
 * của một tool đang bán: trộn hai đường vào một hàm rồi tin vào một câu `if` là
 * cách nhanh nhất để một hôm nào đó đường trả tiền lọt qua cửa. Ở đây KHÔNG có
 * `toolPaymentDenied`, KHÔNG có `llmTextFull`, KHÔNG ghi lịch sử, KHÔNG ghi
 * cache, KHÔNG tặng lượt rail — có test canh đúng từng điều đó.
 *
 * KHÔNG đòi đăng nhập: cả điểm của W1 là cho người ta thấy chất lượng TRƯỚC
 * mọi bức tường, mà màn đăng nhập cũng là một bức tường.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của người cần xem.', 400);

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  let lsBan: Laso | null = null;
  if (validBirth(body.birthSelf)) {
    const rb = computeLaso(body.birthSelf as BirthParams);
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const quanHe = resolveQuanHe(String(body.quanHe || ''));
  const p = computeNguoiKhac(r.ls, gender, quanHe, lsBan, undefined, resolveViec(String(body.viec || '')));
  return ok({
    success: true,
    preview: true,
    ...meta(p, String(body.name || '').trim().slice(0, 60), false),
    // Tên các khối chưa mở, sinh từ chính lá số này — tường khoá dựng từ đây
    // thay vì một mảng chữ chép cứng giống nhau cho mọi người.
    khoa: khoiKhoa(p),
    // C1 — bày engine ra. CHỈ gắn ở đường TÍNH THỬ: đây đúng là chỗ người ta
    // chưa tin gì cả và đang cân xem có đáng trả tiền không. Ở bản đã trả tiền
    // thì phần chữ tự nó là bằng chứng, thêm vào chỉ là nhắc lại.
    coSo: coSoDoc(r.ls, p),
    // Danh sách việc HỢP với quan hệ đang chọn, để trang dựng lại ô chọn khi
    // người dùng đổi quan hệ. Nguồn duy nhất là engine — trang chép bản thứ hai
    // thì hai bên trôi khỏi nhau.
    viecChon: viecChoQuanHe(quanHe).map((v) => ({ id: v.id, label: v.label })),
  });
}

async function runPost(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của người cần xem.', 400);

  const quanHe = resolveQuanHe(String(body.quanHe || ''));
  const viec = resolveViec(String(body.viec || ''));
  const ten = String(body.name || '').trim().slice(0, 60);
  const birthSelf = validBirth(body.birthSelf) ? (body.birthSelf as BirthParams) : null;

  const key = lasoKey(birth, cacheExtra(quanHe, birthSelf, viec));
  const [cached, owns] = await Promise.all([
    getCachedPortrait(TOOL_ID, 'main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  const free = Boolean(cached) && owns;

  if (!free) {
    // Chốt chặn thanh toán PHÍA SERVER — thiếu bước này thì gọi thẳng endpoint
    // là dựng bản luận miễn phí không giới hạn.
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, String(body.slug || ''));
    if (denied) return err(denied, 402);
  }

  if (cached) {
    touchCache(TOOL_ID, 'main', key);
    if (!owns && cached.row) {
      insertHistoryRow(TOOL_ID, { ...cached.row, user_id: auth.user.id, laso_key: key });
      void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});
    }
    return ok({ ...cached.payload, cached: true, freeRerun: free });
  }

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  let lsBan: Laso | null = null;
  if (birthSelf) {
    const rb = computeLaso(birthSelf);
    // Lá số người xem hỏng thì BỎ QUA phần "với bạn", KHÔNG chặn cả lượt —
    // phần chính vẫn dùng được, mà người ta đã trả tiền cho phần chính.
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }

  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const profile = computeNguoiKhac(r.ls, gender, quanHe, lsBan, undefined, viec);

  const res = await buildReport(profile, ten, auth.user.id, key, Boolean(lsBan));
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
    `${SUPABASE_URL}/rest/v1/nguoi_khac_reports?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,ten,quan_he,quan_he_label,kieu,kieu_ten' +
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
  const self: BirthParams | null = sp.get('sy')
    ? {
        day: n('sd'),
        month: n('sm'),
        year: n('sy'),
        hourBranch: sp.get('sh') === null ? -1 : n('sh'),
        gender: sp.get('sg') === 'nu' ? 'nu' : 'nam',
        isLunar: sp.get('slunar') === '1',
      }
    : null;
  // `viec` phải có mặt ở đây y như lúc dựng khoá bên `runPost` — thiếu nó thì
  // câu hỏi "lượt xem lại này có miễn phí không" tra nhầm dòng cache, và trang
  // mở thẳng bản của một việc KHÁC mà không trừ Lượng.
  const key = lasoKey(birth, cacheExtra(resolveQuanHe(sp.get('qh')), self, resolveViec(sp.get('viec'))));
  const [cached, owns] = await Promise.all([
    getCachedPortrait(TOOL_ID, 'main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  return ok({ success: true, cached: Boolean(cached), free: Boolean(cached) && owns });
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
  // Rẽ nhánh NGAY tại cửa, trước cả `withToolOutcome`: lượt tính thử không sinh
  // gì để mà đo kết quả, và cũng không được dính vào sổ theo dõi hoàn tiền.
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
