// lib/admin/auth.ts
// Nguồn xác thực admin DÙNG CHUNG (login route, oauth-verify route,
// app/api/payment/route.ts) — tra bảng admin_users bằng service key, không
// còn hardcode 1 email admin duy nhất (xem _patches/migration-admin-users.sql).
export type AdminUser = { email: string; role: 'owner' | 'member'; team: string | null };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/** Tra 1 email trong admin_users (chỉ active=true). null nếu không phải admin. */
export async function getAdminUser(email: string): Promise<AdminUser | null> {
  if (!email) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,role,team&limit=1`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/** Đổi 1 Supabase access_token → {id,email} qua GoTrue /auth/v1/user. */
export async function getUserFromSupabaseToken(token: string): Promise<{ id: string; email?: string } | null> {
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
