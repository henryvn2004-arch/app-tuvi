// lib/analytics/google-auth.ts
// ============================================================
// Auth service-account CHUNG cho mọi API Google đang dùng (GA4 Data API,
// Search Console API). Tự ký JWT RS256 rồi đổi lấy access token — KHÔNG cần
// thư viện `googleapis`.
//
// VÌ SAO TÁCH RA: Search Console dùng ĐÚNG bộ credential của GA4, chỉ khác mỗi
// `scope`. Chép nguyên khối auth sang file thứ hai là tạo hai bản sẽ trôi khỏi
// nhau — hôm nay giống hệt, mai sửa một bên (đúng như bug base64 chỉ được vá ở
// `scripts/ga4.mjs` mà quên `lib/analytics/ga4.ts`, để prod chạy sai hàng
// tháng trong im lặng). Một nguồn thì sửa một chỗ.
//
// Best-effort xuyên suốt: thiếu env / key hỏng / API lỗi → trả null, KHÔNG
// throw. Mọi thứ dựng trên đây chỉ làm giàu dashboard, không được phép kéo sập
// trang admin hay cron.
// ============================================================

import crypto from 'crypto';

/** Dùng CHUNG với GA4 — set một bộ, cả hai API cùng chạy. */
const SERVICE_ACCOUNT_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

// Cache THEO SCOPE: token của scope này không dùng được cho scope kia, gộp
// chung một biến là lúc gọi xen kẽ GA4/Search Console sẽ đưa nhầm token và
// nhận 403 rất khó lần.
const tokenCache = new Map<string, { token: string; exp: number }>();

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Nhận CẢ raw JSON lẫn base64 (Vercel/CI hay lưu key dạng base64 cho gọn 1 dòng).
// Khớp dạng là quan trọng: parse hỏng trả null IM LẶNG → dashboard tụt về số nội
// bộ mà không báo gì, nên có cảnh báo để lần sau lộ ra ngay thay vì phải đi dò.
export function parseServiceAccount(input: string): ServiceAccount | null {
  let raw = input.trim();
  if (!raw.startsWith('{')) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      /* để JSON.parse bên dưới quyết */
    }
  }
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    console.warn(
      '[google-auth] GA4_SERVICE_ACCOUNT_JSON không đọc được (cần raw JSON hoặc base64) — bỏ qua API Google.',
    );
    return null;
  }
}

/** Access token cho một scope Google. null = chưa cấu hình hoặc lỗi. */
export async function getGoogleAccessToken(scope: string): Promise<string | null> {
  if (!SERVICE_ACCOUNT_JSON) return null;
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(scope);
  if (cached && cached.exp - 60 > now) return cached.token;

  const sa = parseServiceAccount(SERVICE_ACCOUNT_JSON);
  if (!sa || !sa.client_email || !sa.private_key) return null;

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: sa.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  let signature: Buffer;
  try {
    signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key);
  } catch {
    return null;
  }
  const jwt = `${unsigned}.${base64url(signature)}`;

  try {
    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    tokenCache.set(scope, { token: data.access_token, exp: now + (data.expires_in || 3600) });
    return data.access_token;
  } catch {
    return null;
  }
}
