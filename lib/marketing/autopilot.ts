// lib/marketing/autopilot.ts
// ============================================================
// M0.6 (track Marketing Autopilot) — HẠ TẦNG DÙNG CHUNG cho autopilot THỰC
// THI THẬT (price_adjust/promo_grant/segment_nudge). Đây là mốc RỦI RO CAO
// nhất track (tự động tác động doanh thu + end-user) nên an toàn nằm ở
// THIẾT KẾ, không phải ở "nhớ tắt":
//
// 1. CÔNG TẮC TỔNG `app_config['marketing.autopilot_enabled']` — MẶC ĐỊNH
//    false. Code KHÔNG BAO GIỜ tự bật; Henry tự bật qua SQL/app_config khi
//    đã xem đủ log shadow-mode. Sai khi đọc lỗi mạng → coi như false (an
//    toàn = không hành động, không phải an toàn = cứ hành động).
// 2. MỖI loại hành động còn có "khoá phụ" riêng (per-tool price bounds rỗng
//    mặc định / budget khuyến mãi = 0 mặc định / budget nudge = 0 mặc định)
//    — tắt tổng CHƯA đủ, phải cấu hình rõ ràng từng loại mới có hiệu lực.
// 3. Khi tắt (shadow), cron vẫn chạy đều — TÍNH TOÁN đúng những gì "sẽ làm"
//    và ghi vào autopilot_actions + Telegram admin (prefix 🧪) để Henry xem
//    trước khi bật thật. Khi bật (live), input/logic HỆT NHAU, chỉ khác ở
//    bước cuối: áp dụng thật + prefix 🤖.
// 4. Mọi hành động LIVE đều có cooldown riêng (đọc lại autopilot_actions) —
//    không có action nào lặp lại tự do.
// ============================================================

import { tgSendMessage } from '@/lib/channels/telegram';
import { parseFirebaseServiceAccount, sendFcmPush } from '@/lib/channels/push';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ADMIN_TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
  return res.json();
}

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: SB_HEADERS,
    });
    if (!res.ok) return fallback;
    const rows = await res.json();
    return rows?.[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

// Công tắc tổng — fail-safe: bất kỳ lỗi/thiếu cấu hình nào đều → false.
export async function isAutopilotEnabled(): Promise<boolean> {
  return (await getConfig<boolean>('marketing.autopilot_enabled', false)) === true;
}

export type AutopilotActionType = 'price_adjust' | 'promo_grant' | 'segment_nudge';
export type AutopilotMode = 'shadow' | 'live';

export interface AutopilotAction {
  actionType: AutopilotActionType;
  mode: AutopilotMode;
  target: string;
  before?: unknown;
  after?: unknown;
  reason: string;
  meta?: Record<string, unknown>;
}

// Ghi 1 hành động (shadow hoặc live) vào autopilot_actions — nguồn cho panel
// admin + cooldown. Best-effort, không throw (không chặn cron).
export async function logAutopilotAction(a: AutopilotAction): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/autopilot_actions`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        action_type: a.actionType,
        mode: a.mode,
        target: a.target,
        before: a.before ?? null,
        after: a.after ?? null,
        reason: a.reason,
        meta: a.meta ?? null,
      }),
    });
  } catch {
    /* best-effort */
  }
}

// Cooldown: có action_type+target nào LIVE trong `days` ngày gần đây chưa?
// (shadow không tính cooldown — đề xuất lặp lại mỗi lần chạy không sao, vì
// KHÔNG có hiệu lực thật; chỉ hành động LIVE mới cần giãn cách.)
export async function inCooldown(actionType: AutopilotActionType, target: string, days: number): Promise<boolean> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/autopilot_actions?action_type=eq.${actionType}&target=eq.${encodeURIComponent(target)}&mode=eq.live&ts=gte.${since}&select=id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return false;
    const rows: unknown[] = await res.json();
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Gửi tin nhắn TRỰC TIẾP cho 1 user (không phải admin) qua kênh có sẵn —
// Telegram trước (đã link ví), rồi Push (thiết bị đăng ký), else bỏ qua.
// Dùng chung cho promo_grant + segment_nudge (M0.6.3/6.4). Best-effort.
export async function notifyUserBestChannel(userId: string, text: string): Promise<'telegram' | 'push' | 'none'> {
  try {
    const linkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?platform=eq.telegram&user_id=eq.${userId}&select=external_id&limit=1`,
      { headers: SB_HEADERS },
    );
    const linkRows: { external_id: string }[] = linkRes.ok ? await linkRes.json() : [];
    if (linkRows.length) {
      await tgSendMessage(linkRows[0].external_id, text);
      return 'telegram';
    }
  } catch {
    /* thử kênh khác */
  }
  try {
    const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    if (!FIREBASE_SA) return 'none';
    const tokRes = await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}&enabled=eq.true&select=token`, {
      headers: SB_HEADERS,
    });
    const tokRows: { token: string }[] = tokRes.ok ? await tokRes.json() : [];
    if (!tokRows.length) return 'none';
    const sa = parseFirebaseServiceAccount(FIREBASE_SA);
    await sendFcmPush(sa, tokRows.map((r) => r.token), 'Tử Vi Minh Bảo', text, { url: '/app', kind: 'autopilot' });
    return 'push';
  } catch {
    return 'none';
  }
}

// Gộp N hành động của 1 lượt cron thành 1 tin Telegram admin (tránh spam —
// mỗi cron gửi TỐI ĐA 1 tin, dù xử lý bao nhiêu target).
export async function notifyAutopilotRun(title: string, lines: string[]): Promise<void> {
  if (!ADMIN_TG_CHAT_ID || !lines.length) return;
  const text = `${title}\n\n` + lines.map((l) => `• ${l}`).join('\n');
  try {
    await tgSendMessage(ADMIN_TG_CHAT_ID, text);
  } catch {
    /* best-effort */
  }
}
