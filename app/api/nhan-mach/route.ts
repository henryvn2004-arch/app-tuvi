// app/api/nhan-mach/route.ts
// POST /api/nhan-mach                    — đọc cả sổ (1 pha)
// GET  /api/nhan-mach?action=history     — lịch sử đã dựng
//
// Tool "Sổ Nhân Mạch" (T3): 2–8 lá số + vai của từng người → bản đọc cả nhóm.
//
// ⚠️ KHÔNG có `action=cache-status` như các tool một-lá-số. Lý do: khoá cache ở
// đây phụ thuộc TOÀN BỘ danh sách, nên hỏi trước qua query string là phải nhét
// cả sổ vào URL. Trang vì thế đi thẳng paywall thường (`requireCredits`) —
// lượt xem lại vẫn miễn phí, chỉ là biết sau khi POST chứ không biết trước.

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
  computeNhanMach,
  railData,
  cleanTen,
  MIN_NGUOI,
  MAX_NGUOI,
  type NguoiVao,
  type NhanMachProfile,
} from '@/lib/engine/nhan-mach';
import { resolveQuanHe } from '@/lib/engine/nguoi-khac';
import {
  NHAN_MACH_SYSTEM_PROMPT,
  NHAN_MACH_SCHEMA,
  buildNhanMachPrompt,
} from '@/lib/agent/nhan-mach-prompt';
import type { BirthParams } from '@/lib/contract/v1';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import {
  lasoKey,
  getCachedPortrait,
  putCachedPortrait,
  touchCache,
  insertHistoryRow,
  userOwnsLaso,
} from '@/lib/portraits/cache';

const TOOL_ID = 'nhan-mach';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/**
 * Khoá cache của cả sổ.
 *
 * 🔑 SẮP các mục trước khi ghép: thêm cùng một nhóm người theo thứ tự khác nhau
 * phải ra CÙNG một khoá, nếu không thì mỗi lần đổi thứ tự trong sổ là một lượt
 * gen mới bị tính tiền cho đúng nội dung cũ. Vai đi kèm từng người vì đổi vai
 * là đổi cả cách đọc.
 *
 * Lá số NGƯỜI HỎI cũng vào khoá — mục "voiBan" đọc cung Phụ Mẫu/Huynh Đệ/Nô
 * Bộc trong lá số của họ, dùng chung cache giữa hai người hỏi là gán phần đó
 * của người này cho người kia (đúng lý do đã ghi ở T1).
 */
function soKey(list: NguoiVao[], birthSelf: BirthParams | null, births: BirthParams[]): string {
  const parts = list
    .map((n, i) => `${lasoKey(births[i])}:${n.vai}`)
    .sort()
    .join(',');
  return lasoKey(birthSelf || births[0], `nm:${parts}|self:${birthSelf ? lasoKey(birthSelf) : '-'}`);
}

interface NguoiOut {
  ten?: string;
  cachLamViec?: string;
  noiSao?: string;
}
interface CapOut {
  cap?: string;
  viec?: string;
}
interface BanDoc {
  tongQuan?: string;
  tungNguoi?: NguoiOut[];
  capChuY?: CapOut[];
  loHong?: string;
  tuanNay?: { viec?: string }[];
  voiBan?: string;
  motCau?: string;
}

const clean = (v: unknown) => String(v == null ? '' : v).trim();

/** Phần deterministic trả kèm — trang dựng được bảng ngay cả khi phần chữ mỏng. */
function meta(p: NhanMachProfile) {
  return {
    namXem: p.namXem,
    soNguoi: p.soNguoi,
    ban: p.ban ? { kieu: p.ban.kieu.ten, kieuId: p.ban.kieu.id, toaDo: p.ban.toaDo } : null,
    thanhVien: p.thanhVien.map((t) => ({
      ten: t.ten,
      vai: { id: t.vai.id, label: t.vai.label },
      gioiTinh: t.gioiTinh,
      kieu: { id: t.kieu.id, ten: t.kieu.ten, motCau: t.kieu.motCau },
      kieuPhu: t.kieuPhu ? { id: t.kieuPhu.id, ten: t.kieuPhu.ten } : null,
      lai: t.lai,
      toaDo: t.toaDo,
      chinhTinhMenh: t.chinhTinhMenh,
      chinhTinhQuanLoc: t.chinhTinhQuanLoc,
      than: t.than,
      vanNam: t.vanNam,
      voiBan: t.voiBan,
    })),
    phanBo: p.phanBo,
    thieuKieu: p.thieuKieu.map((k) => ({ id: k.id, ten: k.ten, motCau: k.motCau })),
    duaKieu: p.duaKieu ? { id: p.duaKieu.id, ten: p.duaKieu.ten } : null,
    nenTimThem: p.nenTimThem
      ? { id: p.nenTimThem.id, ten: p.nenTimThem.ten, motCau: p.nenTimThem.motCau }
      : null,
    cap: p.cap,
    thuTuTiepCan: p.thuTuTiepCan,
    // Bản PHẲNG cho rail. Trang gửi thẳng cái này vào `scenario.data` thay vì
    // tự dựng lại — một nguồn, nên ô giữa và rail không thể nói khác nhau.
    // ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị object, nên khoá nào ở
    // đây cũng phải là chuỗi/số.
    rail: railData(p),
  };
}

async function buildReport(p: NhanMachProfile, userId: string, key: string, coLaSoBan: boolean) {
  const prompt = buildNhanMachPrompt(p);

  const ask = async (nudge: boolean) => {
    try {
      const r = await llmTextFull({
        system: NHAN_MACH_SYSTEM_PROMPT,
        prompt:
          prompt +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: NHAN_MACH_SCHEMA,
        // Nhiều người ⇒ phần `tungNguoi` dài theo số người. Trần rộng hơn tool
        // một-người để bản 8 người không bị cắt giữa chừng.
        maxTokens: 4200,
      });
      void logLlmUsage(TOOL_ID, r.model, {
        input_tokens: r.usage.input_tokens,
        output_tokens: r.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });
      return r;
    } catch (e) {
      console.error('[nhan-mach] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  const okShape = (v: BanDoc | null): v is BanDoc =>
    Boolean(clean(v?.tongQuan)) && Array.isArray(v?.tungNguoi) && v.tungNguoi.length > 0;

  let res = await ask(false);
  if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.text) as BanDoc | null;

  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nhan-mach] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`);
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await ask(true);
    if (!res) return err('Lỗi AI khi dựng bản luận. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.text) as BanDoc | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.text || '');
    console.error(`[nhan-mach] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`);
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  // 🔑 Chỉ nhận những mục khớp ĐÚNG một cái tên trong sổ. Model bịa thêm người
  // là lỗi khó thấy nhất của tool này — bản đọc trông vẫn hợp lý, chỉ là có một
  // đồng nghiệp không tồn tại.
  const tenHopLe = new Set(p.thanhVien.map((t) => t.ten));
  const tungNguoi = (parsed.tungNguoi || [])
    .map((m) => ({
      ten: clean(m?.ten),
      cachLamViec: clean(m?.cachLamViec),
      noiSao: clean(m?.noiSao),
    }))
    .filter((m) => tenHopLe.has(m.ten))
    .slice(0, MAX_NGUOI);

  const payload = {
    success: true,
    ...meta(p),
    tongQuan: clean(parsed.tongQuan),
    tungNguoi,
    capChuY: (parsed.capChuY || [])
      .slice(0, 4)
      .map((c) => ({ cap: clean(c?.cap), viec: clean(c?.viec) }))
      .filter((c) => c.cap && c.viec),
    loHong: clean(parsed.loHong),
    tuanNay: (parsed.tuanNay || [])
      .slice(0, 3)
      .map((c) => ({ viec: clean(c?.viec) }))
      .filter((c) => c.viec),
    voiBan: coLaSoBan ? clean(parsed.voiBan) : '',
    motCau: clean(parsed.motCau),
  };

  const row = {
    so_nguoi: p.soNguoi,
    ten_nguoi: p.thanhVien.map((t) => t.ten).join(', ').slice(0, 300),
    thieu_kieu: p.thieuKieu.map((k) => k.id).join(',') || null,
  };
  insertHistoryRow(TOOL_ID, { ...row, user_id: userId, laso_key: key });
  void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});
  void putCachedPortrait(TOOL_ID, 'main', key, { payload, row }, userId);
  return ok(payload);
}

/**
 * W1 — TÍNH THỬ MIỄN PHÍ. Xem chú thích dài ở `app/api/nguoi-khac/route.ts`.
 *
 * ⚠️ Ở đây có thêm một chi tiết riêng: lượt tính thử lập tới `MAX_NGUOI` lá số
 * trong một request. Vẫn là tra bảng nên 0đ tiền model, nhưng đó là CPU thật —
 * trần 8 người của engine cũng chính là trần cho đường này.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const raw = Array.isArray(body.nguoi) ? (body.nguoi as Record<string, unknown>[]) : [];
  const hopLe = raw.filter((n) => validBirth(n?.birth)).slice(0, MAX_NGUOI);
  if (hopLe.length < MIN_NGUOI) {
    return err(`Cần ít nhất ${MIN_NGUOI} người có đủ ngày sinh để đọc được cả nhóm.`, 400);
  }
  const list: NguoiVao[] = [];
  for (let i = 0; i < hopLe.length; i++) {
    const b = hopLe[i].birth as BirthParams;
    const r = computeLaso(b);
    if (!r.ok || !r.ls) return err(`Không lập được lá số của "${cleanTen(hopLe[i].ten, i)}".`, 400);
    list.push({
      ten: cleanTen(hopLe[i].ten, i),
      vai: resolveQuanHe(String(hopLe[i].vai || '')),
      ls: r.ls,
      gioiTinh: b.gender === 'nu' ? 'nu' : 'nam',
    });
  }
  let lsBan: Laso | null = null;
  if (validBirth(body.birthSelf)) {
    const rb = computeLaso(body.birthSelf as BirthParams);
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }
  return ok({ success: true, preview: true, ...meta(computeNhanMach(list, lsBan)) });
}

async function runPost(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  const raw = Array.isArray(body.nguoi) ? (body.nguoi as Record<string, unknown>[]) : [];
  const hopLe = raw.filter((n) => validBirth(n?.birth)).slice(0, MAX_NGUOI);
  if (hopLe.length < MIN_NGUOI) {
    return err(`Cần ít nhất ${MIN_NGUOI} người có đủ ngày sinh để đọc được cả nhóm.`, 400);
  }

  const births = hopLe.map((n) => n.birth as BirthParams);
  const birthSelf = validBirth(body.birthSelf) ? (body.birthSelf as BirthParams) : null;
  const vaiList: NguoiVao[] = hopLe.map((n, i) => ({
    ten: cleanTen(n.ten, i),
    vai: resolveQuanHe(String(n.vai || '')),
    // `ls` điền sau khi qua cửa thanh toán — lập 8 lá số trước khi biết có được
    // chạy hay không là tính toán vứt đi.
    ls: null as unknown as Laso,
    gioiTinh: births[i].gender === 'nu' ? 'nu' : 'nam',
  }));

  const key = soKey(vaiList, birthSelf, births);
  const [cached, owns] = await Promise.all([
    getCachedPortrait(TOOL_ID, 'main', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  const free = Boolean(cached) && owns;

  if (!free) {
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

  for (let i = 0; i < vaiList.length; i++) {
    const r = computeLaso(births[i]);
    if (!r.ok || !r.ls) return err(`Không lập được lá số của "${vaiList[i].ten}".`, 400);
    vaiList[i].ls = r.ls;
  }
  let lsBan: Laso | null = null;
  if (birthSelf) {
    const rb = computeLaso(birthSelf);
    // Lá số người hỏi hỏng thì BỎ QUA phần "với bạn", KHÔNG chặn cả lượt.
    if (rb.ok && rb.ls) lsBan = rb.ls;
  }

  const profile = computeNhanMach(vaiList, lsBan);
  const res = await buildReport(profile, auth.user.id, key, Boolean(lsBan));
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
    `${SUPABASE_URL}/rest/v1/nhan_mach_reports?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,so_nguoi,ten_nguoi,thieu_kieu' +
      '&order=created_at.desc&limit=20',
    { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }, cache: 'no-store' },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  return ok({ success: true, items: await r.json() });
}

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  return err('Invalid action', 400);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
