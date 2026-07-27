// lib/ops/refund.ts
// ============================================================
// S3 (track COO) — HOÀN LƯỢNG khi lượt chạy trả phí hỏng.
//
// VẤN ĐỀ ĐANG VÁ: `requireCredits()` (public/tuvi-paywall.js) trừ Lượng TRƯỚC
// rồi mới chạy việc, và toàn repo KHÔNG có đường hoàn nào (`grep -ri refund`
// = 0). Tool hỏng ⇒ người dùng mất tiền, không nhận được gì, và không ai biết.
//
// VÌ SAO HOÀN TIỀN CHỨ KHÔNG SỬA SLUG:
// `generateToolSlug` gắn `Date.now()` nên mỗi lần bấm lại là một lượt mua mới —
// thử lại sau khi hỏng bị trừ tiếp. Sửa slug thành tất định nghe gọn hơn NHƯNG
// đổi luôn giá bán: cùng ngày sinh sẽ vẽ lại MIỄN PHÍ vô hạn, mà ảnh sinh ngẫu
// nhiên nên người dùng sẽ re-roll thoải mái. Hoàn tiền cho kết quả kinh tế y
// hệt ở lượt HỎNG (trừ rồi hoàn = không mất gì) mà KHÔNG đụng giá ở lượt thành
// công. Nên vá bằng hoàn tiền, giữ nguyên slug.
//
// AN TOÀN — 2 lớp khoá như M0.6:
//   1. Công tắc tổng `ops.auto_refund.enabled`, mặc định FALSE. Lỗi đọc config
//      cũng coi như false. Tắt thì vẫn TÍNH + GHI LOG (shadow) để xem trước.
//   2. Trần Lượng hoàn mỗi ngày, mặc định 0 — bật công tắc tổng CHƯA đủ, phải
//      khai thêm trần dương.
// Cộng thêm: idempotent theo slug (một lượt mua hoàn tối đa một lần).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

const REFUND_TYPE = 'refund';

interface RefundConfig {
  enabled: boolean;
  dailyCapCredits: number;
}

const DEFAULTS: RefundConfig = { enabled: false, dailyCapCredits: 0 };

async function getRefundConfig(): Promise<RefundConfig> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return DEFAULTS;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.ops.auto_refund&select=value&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!r.ok) return DEFAULTS;
    const rows = (await r.json()) as { value?: Partial<RefundConfig> }[];
    return { ...DEFAULTS, ...(rows[0]?.value || {}) };
  } catch {
    // Đọc config hỏng → coi như TẮT. Fail-safe: thà không hoàn còn hơn hoàn loạn.
    return DEFAULTS;
  }
}

/** Số Lượng đã hoàn từ 00:00 UTC hôm nay (để áp trần ngày). */
async function refundedToday(): Promise<number> {
  try {
    const since = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions` +
        `?type=eq.${REFUND_TYPE}&created_at=gte.${encodeURIComponent(since)}&select=amount`,
      { headers: SB_HEADERS },
    );
    if (!r.ok) return Number.POSITIVE_INFINITY; // đọc hụt → coi như chạm trần, không hoàn
    const rows = (await r.json()) as { amount: number }[];
    return rows.reduce((s, x) => s + Math.max(0, Number(x.amount) || 0), 0);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/** Lượt mua mang `slug` này đã được hoàn chưa (idempotent). */
async function alreadyRefunded(slug: string): Promise<boolean> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions` +
        `?slug=eq.${encodeURIComponent(slug)}&type=eq.${REFUND_TYPE}&select=id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!r.ok) return true; // đọc hụt → coi như đã hoàn, tránh hoàn hai lần
    return ((await r.json()) as unknown[]).length > 0;
  } catch {
    return true;
  }
}

/** Số Lượng đã bị trừ cho lượt mua này (trị tuyệt đối). 0 nếu không tìm thấy. */
async function chargedFor(userId: string, slug: string): Promise<number> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions` +
        `?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(slug)}` +
        `&amount=lt.0&select=amount&order=created_at.desc&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!r.ok) return 0;
    const rows = (await r.json()) as { amount: number }[];
    return rows.length ? Math.abs(Number(rows[0].amount) || 0) : 0;
  } catch {
    return 0;
  }
}

export interface RefundOutcome {
  mode: 'live' | 'shadow';
  refunded: boolean;
  credits: number;
  reason: string;
}

/**
 * Hoàn Lượng cho một lượt chạy trả phí đã HỎNG VÌ LỖI HỆ THỐNG.
 *
 * Nơi gọi phải tự lọc trước: CHỈ gọi khi `isUserFault(reason)` là false — user
 * nhập sai ngày sinh hay chưa thanh toán thì không có gì để hoàn.
 *
 * ⚠️ Tool Chân Dung Tiền Kiếp chạy 2 pha (story + image) trên CÙNG một slug.
 * Quy ước ở đây: hoàn MỘT LẦN ở lần hỏng đầu tiên, kể cả khi pha kia đã xong.
 * Tức có lúc hoàn đủ tiền dù người dùng đã nhận được nửa sản phẩm — chấp nhận
 * có chủ đích: rộng rãi với người dùng, và giữ logic idempotent đơn giản thay
 * vì phải điều phối trạng thái giữa hai request chạy song song.
 */
export async function maybeRefund(p: {
  toolId: string;
  userId: string;
  slug: string;
  reason: string;
}): Promise<RefundOutcome | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !p.userId || !p.slug) return null;

  const cfg = await getRefundConfig();
  const credits = await chargedFor(p.userId, p.slug);
  if (!credits) return null; // lượt này không hề bị trừ tiền → không có gì để hoàn

  if (await alreadyRefunded(p.slug)) return null;

  const live = cfg.enabled && cfg.dailyCapCredits > 0;
  const mode: 'live' | 'shadow' = live ? 'live' : 'shadow';

  if (!live) {
    await logRefund(p, credits, 'shadow', 'chưa bật ops.auto_refund');
    return { mode, refunded: false, credits, reason: 'shadow' };
  }

  const spent = await refundedToday();
  if (spent + credits > cfg.dailyCapCredits) {
    await logRefund(p, credits, 'shadow', `chạm trần ngày (${spent}/${cfg.dailyCapCredits})`);
    return { mode, refunded: false, credits, reason: 'daily_cap' };
  }

  // Cộng lại Lượng qua CHÍNH RPC add_credits mà nạp tiền vẫn dùng (service key;
  // anon đã bị revoke ở S0), rồi ghi sổ để đối soát và để áp trần lần sau.
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_credits`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_user_id: p.userId, p_amount: credits }),
    });
    if (!r.ok) throw new Error(await r.text());
  } catch (e) {
    await logRefund(p, credits, 'shadow', `add_credits lỗi: ${String(e).slice(0, 120)}`);
    return { mode, refunded: false, credits, reason: 'error' };
  }

  await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: p.userId,
      amount: credits, // DƯƠNG = cộng lại
      type: REFUND_TYPE,
      slug: p.slug,
      description: `Hoàn Lượng: ${p.toolId} lỗi (${p.reason})`,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});

  await logRefund(p, credits, 'live', 'đã hoàn');
  return { mode, refunded: true, credits, reason: 'ok' };
}

/**
 * Bọc Response của một route tool TRẢ PHÍ: hỏng vì lỗi HỆ THỐNG thì cân nhắc
 * hoàn Lượng, rồi trả lại CHÍNH Response đó không đổi.
 *
 * Dùng lại phân loại của S1 (`reasonFromStatus` + `isUserFault`) nên chỉ một
 * nơi duy nhất định nghĩa "lỗi nào là lỗi hệ thống" — hoàn tiền và bảng Sức
 * Khỏe Tool không bao giờ bất đồng về việc lượt đó có hỏng thật hay không.
 */
export async function refundIfSystemFailure(
  res: Response,
  p: { toolId: string; userId: string; slug: string },
): Promise<Response> {
  const { reasonFromStatus, isUserFault } = await import('./tool-outcome');
  const reason = reasonFromStatus(res.status);
  if (!reason || isUserFault(reason)) return res; // thành công, hoặc lỗi do người dùng
  try {
    await maybeRefund({ ...p, reason });
  } catch {
    /* hoàn tiền hỏng KHÔNG được đổi phản hồi trả về cho người dùng */
  }
  return res;
}

/** Ghi vào `events` để panel Vận Hành đọc — cả lượt shadow lẫn lượt thật. */
async function logRefund(
  p: { toolId: string; userId: string; slug: string; reason: string },
  credits: number,
  mode: 'live' | 'shadow',
  note: string,
): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        event_type: 'refund',
        tool_id: p.toolId,
        user_id: p.userId,
        platform: 'web',
        meta: { mode, credits, slug: p.slug, fail_reason: p.reason, note },
      }),
    });
  } catch {
    /* best-effort */
  }
}
