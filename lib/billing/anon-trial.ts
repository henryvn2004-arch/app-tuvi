// lib/billing/anon-trial.ts
// ============================================================
// DÙNG THỬ RAIL CHO KHÁCH CHƯA ĐĂNG KÝ
// ============================================================
// Vì sao có file này: đo prod 30 ngày được 618 khách ghé → 6 đăng ký (0,97%).
// Quà đăng ký 25 Lượng (= 12 câu rail ở giá mới) là đủ dùng thử, NHƯNG nó nằm
// sau cửa đăng ký mà 99% người ghé không mở. `/api/v1/chat` trả 401 CỨNG khi
// thiếu token → khách an sao xong (miễn phí) muốn hỏi MỘT câu cũng không được.
//
// Vốn một lượt rail: 35đ (đo từ `events.meta.cost_vnd`). Cho không vài câu gần
// như không tốn gì — nhưng "gần như không tốn gì" × Internet = tốn thật, nên
// mọi thứ ở đây là về CẦU DAO. Ba lớp trần nằm trong RPC
// `anon_rail_trial_consume` (xem `_patches/migration-anon-rail-trial.sql`):
// theo anon_id (trần đời) · theo IP/ngày · toàn hệ thống/ngày.
//
// HƯỚNG FAIL: CLOSED. Ngược với `viral-budget.ts` (fail-OPEN) và ngược có lý do
// — cầu dao ảnh gác người ĐÃ TRẢ TIỀN nên chặn oan họ tệ hơn lỡ vài lượt; ở đây
// đối tượng là khách vô danh chưa trả gì, chặn oan thì họ thấy đúng lời mời đăng
// ký vốn sẽ thấy, còn cho qua oan là rò tiền cho bất kỳ ai trên Internet.
// ============================================================

import { createHash } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export interface AnonTrialResult {
  allowed: boolean;
  /** 'ok' | 'disabled' | 'anon_cap' | 'ip_cap' | 'global_cap' | 'error' */
  reason: string;
  /** số câu dùng thử CÒN LẠI sau lượt này */
  left: number;
}

/**
 * Băm IP để đếm theo IP mà KHÔNG lưu IP thô — không cần IP thật để đếm, mà giữ
 * IP thô là tự tạo thêm dữ liệu cá nhân phải bảo vệ. Muối lấy từ service key
 * (đã là secret sẵn) nên không cần thêm env mới.
 */
function hashIp(ip: string): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`anon-rail|${SUPABASE_KEY || ''}|${ip}`).digest('hex').slice(0, 32);
}

/**
 * Rút IP khách từ header proxy. Vercel đặt `x-forwarded-for` = "client, proxy1,
 * proxy2" → lấy phần TỬ ĐẦU. Lấy phần tử cuối là lấy IP của proxy, tức cả thế
 * giới dùng chung một quota.
 */
export function clientIpHash(req: { headers: { get(name: string): string | null } }): string | null {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0].trim();
  const ip = first || req.headers.get('x-real-ip') || '';
  return hashIp(ip);
}

async function rpc<T>(fn: string, body: Record<string, unknown>, fallback: T): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return fallback;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Xin MỘT lượt dùng thử. Tăng đếm NGAY khi cấp phép (không đợi câu trả lời xong)
 * — lượt đã gọi model là đã tốn tiền, kể cả khi model lỗi sau đó. Đếm sau khi
 * thành công là mở đường gọi model rồi tự ngắt kết nối để không bị tính.
 */
export async function anonTrialConsume(anonId: string, ipHash: string | null): Promise<AnonTrialResult> {
  const FAIL_CLOSED: AnonTrialResult = { allowed: false, reason: 'error', left: 0 };
  if (!anonId || anonId.length < 6) return { allowed: false, reason: 'disabled', left: 0 };
  const r = await rpc<AnonTrialResult | null>(
    'anon_rail_trial_consume',
    { p_anon_id: anonId, p_ip_hash: ipHash },
    null,
  );
  if (!r || typeof r.allowed !== 'boolean') return FAIL_CLOSED;
  return { allowed: r.allowed, reason: r.reason || 'ok', left: Number(r.left) || 0 };
}

/** XEM còn bao nhiêu câu dùng thử — KHÔNG tiêu lượt. Cho đồng hồ của rail. */
export async function anonTrialStatus(anonId: string): Promise<{ cap: number; used: number; left: number }> {
  const ZERO = { cap: 0, used: 0, left: 0 };
  if (!anonId || anonId.length < 6) return ZERO;
  const r = await rpc<{ cap?: number; used?: number; left?: number } | null>(
    'anon_rail_trial_status',
    { p_anon_id: anonId },
    null,
  );
  if (!r) return ZERO;
  return { cap: Number(r.cap) || 0, used: Number(r.used) || 0, left: Number(r.left) || 0 };
}
