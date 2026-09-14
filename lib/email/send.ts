// lib/email/send.ts
// ============================================================
// Nguồn DUY NHẤT gọi Resend — MỌI email (transactional lẫn marketing) trong
// hệ thống phải đi qua `sendTransactionalEmail`/`sendMarketingEmail`, không
// tự import `resend` ở nơi khác.
//
// Henry chốt (2026-09-14): một nhà cung cấp duy nhất (Resend), không thêm
// nền tảng marketing automation ngoài. Xem `_patches/migration-email-infra.sql`
// cho phần bảng, `docs/luat/email.md` cho phần "vì sao".
//
// Hai quy tắc cứng bám theo đúng triết lý chống-trùng-đường-tiền của repo:
//   1. Dòng SỔ (`email_log`, UNIQUE dedupe_key) đi TRƯỚC làm mutex, gọi
//      Resend SAU — hai lượt gọi trùng `dedupeKey` chỉ gửi được MỘT lần.
//   2. `sendMarketingEmail` BẮT BUỘC kiểm `email_unsubscribes` trước khi gửi
//      và tự chèn link huỷ (Nghị định 91/2020/NĐ-CP) — không có đường nào
//      gửi thư quảng bá mà bỏ qua được hai việc này.
// Transactional (OTP/hoá đơn/PDF luận giải) KHÔNG qua bộ lọc unsubscribe —
// đây là email người dùng chủ động yêu cầu, không phải quảng cáo.
// ============================================================
import { Resend } from 'resend';
import { unsubscribeUrl } from './unsub-token';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Hai subdomain TÁCH RIÊNG để cô lập uy tín gửi: một khiếu nại spam ở thư
// quảng bá không kéo OTP/hoá đơn rơi vào thư rác theo (xem proposal đã chốt).
const FROM_TRANSACTIONAL =
  process.env.EMAIL_FROM_TRANSACTIONAL || 'Tử Vi Minh Bảo <noreply@mail.tuviminhbao.com>';
const FROM_MARKETING =
  process.env.EMAIL_FROM_MARKETING || 'Tử Vi Minh Bảo <tin@tin.tuviminhbao.com>';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

export interface SendEmailInput {
  /** Khoá chống gửi trùng — vd `invoice-<txn_id>`, `pdf-<slug>`,
   *  `crosssell-<user_id>-<tool_id>-<yyyy-mm-dd>`. PHẢI ổn định giữa các lần
   *  gọi lại (retry cron, double-click...), KHÔNG được random mỗi lần gọi. */
  dedupeKey: string;
  /** Tên template — chỉ để ghi sổ/tra cứu, không ảnh hưởng logic gửi. */
  template: string;
  to: string;
  subject: string;
  html: string;
  userId?: string;
}

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'unsubscribed' | 'not_configured' | 'send_failed' };

/** Chèn dòng `email_log` làm mutex. true = vừa chiếm được (chưa từng gửi). */
async function claim(input: SendEmailInput, kind: 'transactional' | 'marketing'): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/email_log`, {
      method: 'POST',
      // return=representation là bắt buộc: đây là cách DUY NHẤT phân biệt
      // "vừa chèn được" (mảng có 1 dòng) với "đã tồn tại, bị bỏ qua" (mảng
      // rỗng) khi dùng ignore-duplicates — không được đổi sang return=minimal.
      headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        dedupe_key: input.dedupeKey,
        kind,
        template: input.template,
        to_email: input.to,
        user_id: input.userId || null,
        status: 'pending',
      }),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Cập nhật kết quả gửi vào đúng dòng vừa `claim`. Best-effort — không chặn luồng. */
async function markResult(
  dedupeKey: string,
  patch: { status: string; provider_id?: string; error?: string },
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`,
      { method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(patch) },
    );
  } catch {
    /* best-effort — dòng 'pending' vẫn còn đó, tra thủ công được qua email_log */
  }
}

async function isUnsubscribed(email: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return true; // không rõ trạng thái -> fail-CLOSED cho marketing
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/email_unsubscribes?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=email&limit=1`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return true;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return true;
  }
}

async function dispatch(
  input: SendEmailInput,
  kind: 'transactional' | 'marketing',
): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) return { ok: false, reason: 'not_configured' };
  if (!(await claim(input, kind))) return { ok: false, reason: 'duplicate' };

  try {
    const { data, error } = await resend.emails.send({
      from: kind === 'transactional' ? FROM_TRANSACTIONAL : FROM_MARKETING,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      await markResult(input.dedupeKey, { status: 'failed', error: String(error.message || error) });
      return { ok: false, reason: 'send_failed' };
    }
    await markResult(input.dedupeKey, { status: 'sent', provider_id: data?.id });
    return { ok: true };
  } catch (err) {
    await markResult(input.dedupeKey, { status: 'failed', error: String((err as Error)?.message || err) });
    return { ok: false, reason: 'send_failed' };
  }
}

/** OTP/hoá đơn/PDF luận giải — email người dùng chủ động yêu cầu. */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return dispatch(input, 'transactional');
}

/**
 * Reminder/cross-sell/broadcast. Tự chặn nếu người nhận đã huỷ đăng ký, và
 * tự chèn link huỷ vào cuối `html` — KHÔNG cần nơi gọi tự nhớ làm việc này.
 * Trả `not_configured` (thay vì gửi thiếu link huỷ) nếu `EMAIL_UNSUB_SECRET`
 * chưa được set — vi phạm Nghị định 91/2020/NĐ-CP nếu gửi thiếu.
 */
export async function sendMarketingEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const unsubLink = unsubscribeUrl(input.to);
  if (!unsubLink) return { ok: false, reason: 'not_configured' };
  if (await isUnsubscribed(input.to)) return { ok: false, reason: 'unsubscribed' };

  const footer = `<hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5">
<p style="font-size:12px;color:#888">
  Tử Vi Minh Bảo — tuviminhbao.com<br>
  Bạn nhận được thư này vì đã đăng ký tài khoản tại tuviminhbao.com.
  <a href="${unsubLink}">Huỷ nhận email này</a>.
</p>`;

  return dispatch({ ...input, html: input.html + footer }, 'marketing');
}
