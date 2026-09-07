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
import { previewGate, previewIpHash } from '@/lib/billing/anon-preview';
import { previewOf } from '@/lib/llm/preview-fields';
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
  cacheFor,
  lasoKey,
  insertHistoryRow,
  userOwnsLaso,
} from '@/lib/portraits/cache';



const TOOL_ID = 'nguoi-khac';

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
const SHAPE = 6;

/** Vân tay CẤU TRÚC — `npm run check:cacheshape` canh khớp với `SHAPE` ở trên. */
const SHAPE_FINGERPRINT = 'f61088b7da86';

/** Cửa DUY NHẤT vào cache của tool này; `shape` khai một lần tại đây. */
const CACHE = cacheFor(TOOL_ID, SHAPE);

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

// ── BẢN XEM TRƯỚC (hard paywall Pha 3) ──────────────────────────────────────
// Miễn phí ĐÚNG 2/9 trường văn xuôi: `tinhKhi` (chân dung con người này) +
// `chamNoc` (điều làm họ khó chịu) — cùng lý do đã chọn ở day-con: hai đoạn
// vừa đọc xong là hook, còn lại (kế hoạch cho việc cụ thể, họ coi trọng gì,
// nên/tránh nói gì, lúc nào nên đưa việc tới, với bạn ra sao, câu chốt) là
// đúng phần đang bán. `khoiKhoa()` đã bỏ hai mục này khỏi danh sách "đang
// khoá" — xem chú thích ở đó.
const PREVIEW_KEEP_PROSE = ['tinhKhi', 'chamNoc'] as const;

/**
 * Dựng bản xem trước từ payload ĐẦY ĐỦ — dùng CHUNG cho cả nhánh cache-hit lẫn
 * nhánh vừa sinh xong trong `runPreview`, để hai đường không lệch hình dạng.
 *
 * 🔑 `previewOf` chỉ chạy trên PHẦN VĂN XUÔI (`proseFields`), không chạy trên
 * cả `full`: `full` còn mang `matDoc`/`than`/`daiVan`/`vanNam`/`quanHe`/`kieu`…
 * — những trường ĐÃ ĐƯỢC LỘ đúng mức qua `meta(p, ten, false)` ở trên, không
 * phải "đang khoá". Chạy allowlist trên cả `full` sẽ liệt chúng vào
 * `previewLocked` một cách sai lệch dù không hề bị giấu.
 */
function previewShape(full: Record<string, unknown>, p: NguoiKhacProfile, ls: Laso) {
  const proseFields = {
    keHoach: full.keHoach,
    tinhKhi: full.tinhKhi,
    chamNoc: full.chamNoc,
    coiTrong: full.coiTrong,
    nenNoi: full.nenNoi,
    tranhNoi: full.tranhNoi,
    thoiDiem: full.thoiDiem,
    voiBan: full.voiBan,
    motCau: full.motCau,
  };
  return {
    success: true,
    preview: true,
    ...meta(p, String(full.ten || ''), false),
    khoa: khoiKhoa(p),
    coSo: coSoDoc(ls, p),
    viecChon: viecChoQuanHe(p.quanHe.id).map((v) => ({ id: v.id, label: v.label })),
    ...previewOf(proseFields, PREVIEW_KEEP_PROSE, TOOL_ID),
  };
}

async function buildReport(
  p: NguoiKhacProfile,
  ten: string,
  userId: string,
  key: string,
  coLaSoBan: boolean,
  // Lá số gốc — chỉ dùng cho `previewShape` (câu trích cổ pháp). Đường trả
  // tiền truyền vào nhưng không đọc tới.
  ls: Laso,
  // Lượt XEM TRƯỚC: vẫn gọi model và vẫn ghi cache (để lượt trả tiền sau đó
  // KHÔNG phải sinh lại), nhưng TUYỆT ĐỐI không chạm hai thứ dưới đây.
  preview = false,
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
        maxTokens: 4500, // nâng 50% cùng đợt (Henry chốt 2026-08-20)
      });
      void logLlmUsage(TOOL_ID, r.model, {
        input_tokens: r.usage.input_tokens,
        output_tokens: r.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }, r.durationMs);
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
  if (!res) return err('Lỗi hệ thống khi dựng bản luận. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.text) as CamNang | null;

  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nguoi-khac] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`);
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await ask(true);
    if (!res) return err('Lỗi hệ thống khi dựng bản luận. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.text) as CamNang | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nguoi-khac] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`);
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả trả về.', 500);
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
  // 🔴 HAI DÒNG NÀY LÀ ĐƯỜNG TIỀN, KHÔNG PHẢI GHI SỔ — cùng luật đã áp cho
  // day-con: `insertHistoryRow` chính là thứ `userOwnsLaso` đọc để trả lời
  // "người này đã trả tiền cho lá số đó chưa", và `railFreeGrant` phát Lượng
  // rail. Gọi cả hai ở lượt xem trước là phát không cả tool.
  if (!preview) {
    insertHistoryRow(TOOL_ID, { ...row, user_id: userId, laso_key: key });
    void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});
  }
  // Ghi cache CẢ ở lượt xem trước là CỐ Ý: `portrait_cache` không mang ngữ
  // nghĩa sở hữu, nên dòng này chỉ có tác dụng làm lượt trả tiền ngay sau đó
  // tốn 0đ model.
  CACHE.put('main', key, { payload, row }, userId);
  return preview ? ok(previewShape(payload, p, ls)) : ok(payload);
}

/**
 * BẢN XEM TRƯỚC — hàm RIÊNG chứ không phải một cờ trong `runPost`: không chạm
 * thanh toán, không ghi lịch sử, không đòi đăng nhập.
 *
 * 🔴 ĐỔI Ở PHA 3 (2026-09): trước đây hàm này chạy **0 lượt LLM**, chỉ trả
 * tầng deterministic. Không một chữ nào model viết về NGƯỜI ĐANG ĐƯỢC XEM ⇒
 * không có gì để hook — đúng cái yếu đã sửa ở Luận Giải và Dạy Con. Nay gọi
 * model thật và giữ lại `tinhKhi` + `chamNoc` (xem `PREVIEW_KEEP_PROSE`).
 *
 * Thứ tự BẮT BUỘC: tra cache TRƯỚC, xin quota SAU — trúng cache là 0đ model
 * nên không được tiêu một suất `preview.free_runs` của chính người đó.
 *
 * Cầu dao chặn → KHÔNG báo lỗi, lùi về khung deterministic cũ (`khung`): bản
 * xem trước là quà, hỏng thì người dùng thấy đúng thứ họ sẽ thấy nếu tính năng
 * này chưa từng tồn tại, không phải một màn hình lỗi.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!validBirth(birth)) return err('Thiếu thông tin ngày sinh của người cần xem.', 400);

  const r = computeLaso(birth);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  let lsBan: Laso | null = null;
  const birthSelf = validBirth(body.birthSelf) ? (body.birthSelf as BirthParams) : null;
  if (birthSelf) {
    const rb = computeLaso(birthSelf);
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const quanHe = resolveQuanHe(String(body.quanHe || ''));
  const viec = resolveViec(String(body.viec || ''));
  const ten = String(body.name || '').trim().slice(0, 60);
  const p = computeNguoiKhac(r.ls, gender, quanHe, lsBan, undefined, viec);

  // Khung deterministic — luôn trả, kể cả khi cầu dao chặn hoặc chưa sinh
  // được chữ nào. Giữ trang có hình hài ngay cả ở nhánh xấu nhất.
  const khung = {
    success: true,
    preview: true,
    ...meta(p, ten, false),
    // Tên các khối chưa mở, sinh từ chính lá số này — tường khoá dựng từ đây
    // thay vì một mảng chữ chép cứng giống nhau cho mọi người.
    khoa: khoiKhoa(p),
    // C1 — bày engine ra. Lá chắn cho phản đối "AI nó bịa thôi". Hàm dùng
    // chung với `day-con`, câu trích cũng đi qua `locCachCuc` nên không nói về
    // thọ mệnh/bệnh tật/hôn nhân của người được xem.
    coSo: coSoDoc(r.ls, p),
    // Danh sách việc HỢP với quan hệ đang chọn, để trang dựng lại ô chọn khi
    // người dùng đổi quan hệ. Nguồn duy nhất là engine — trang chép bản thứ hai
    // thì hai bên trôi khỏi nhau.
    viecChon: viecChoQuanHe(quanHe).map((v) => ({ id: v.id, label: v.label })),
  };

  const key = lasoKey(birth, cacheExtra(quanHe, birthSelf, viec));
  const { cached } = await CACHE.get('main', key);
  if (cached) {
    CACHE.touch('main', key);
    return ok(previewShape(cached.payload as Record<string, unknown>, p, r.ls));
  }

  const auth = await authUserFromRequest(request);
  const pKey = 'error' in auth ? String(body.anonId || '') : auth.user.id;
  const gate = await previewGate(pKey, previewIpHash(request), TOOL_ID);
  if (!gate.allowed) {
    console.error(`[nguoi-khac] xem trước bị chặn (${gate.reason})`);
    return ok(khung);
  }

  return buildReport(p, ten, 'error' in auth ? '' : auth.user.id, key, Boolean(lsBan), r.ls, true);
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
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get('main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  // `free` xét cả dòng CŨ: người này đã trả tiền cho đúng lá số đó rồi. Còn
  // `cached` thì `CACHE.get` đã lọc — dòng cũ không bao giờ được phục vụ.
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
  let lsBan: Laso | null = null;
  if (birthSelf) {
    const rb = computeLaso(birthSelf);
    // Lá số người xem hỏng thì BỎ QUA phần "với bạn", KHÔNG chặn cả lượt —
    // phần chính vẫn dùng được, mà người ta đã trả tiền cho phần chính.
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }

  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const profile = computeNguoiKhac(r.ls, gender, quanHe, lsBan, undefined, viec);

  const res = await buildReport(profile, ten, auth.user.id, key, Boolean(lsBan), r.ls);
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
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get('main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
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
  // Rẽ nhánh NGAY tại cửa, trước cả `withToolOutcome`: lượt tính thử không sinh
  // gì để mà đo kết quả, và cũng không được dính vào sổ theo dõi hoàn tiền.
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
