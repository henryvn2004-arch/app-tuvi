// lib/admin/loginAttempts.ts
// Rate-limit + audit log cho đăng nhập admin (xem
// _patches/migration-admin-login-attempts.sql). Trước PR này /api/admin/login
// không có giới hạn thử nào ngoài rate-limit mặc định của Supabase Auth —
// countRecentFailures cho phép chặn SỚM (trước khi gọi Supabase) để vừa
// chống dò mật khẩu vừa tránh spam cảnh báo Telegram/WhatsApp khi bị dội bom.
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export type LoginAttemptEntry = {
  email?: string;
  ip: string;
  success: boolean;
  // `google-resume` = khôi phục phiên đã lưu khi mở lại tab (không phải người
  // vừa bấm đăng nhập). Tách nhãn để lọc được khỏi lượt đăng nhập THẬT khi đọc
  // nhật ký; cột `method` dưới DB là text tự do nên không cần migration.
  method: 'password' | 'google' | 'google-resume';
  detail?: string;
};

/** Số lượt THẤT BẠI (kể cả bị chặn) trong `windowMinutes` phút gần nhất theo email hoặc IP. */
export async function countRecentFailures(
  field: 'email' | 'ip',
  value: string,
  windowMinutes: number
): Promise<number> {
  if (!value) return 0;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const col = field === 'email' ? 'email' : 'ip';
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_login_attempts?${col}=eq.${encodeURIComponent(value)}&success=eq.false&created_at=gte.${encodeURIComponent(since)}&select=id&limit=200`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

/** Ghi 1 dòng audit — best-effort, không chặn luồng đăng nhập nếu lỗi. */
export async function logLoginAttempt(entry: LoginAttemptEntry): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/admin_login_attempts`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        email: entry.email || null,
        ip: entry.ip,
        success: entry.success,
        method: entry.method,
        detail: entry.detail || null,
      }),
    });
  } catch (e) {
    console.error('[admin/loginAttempts] log failed', e);
  }
}
