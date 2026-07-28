// lib/analytics/ga4.ts
// ============================================================
// Đọc "sessions" THẬT từ GA4 Data API để thay 'visitors' của marketing_funnel
// (RPC cũ suy visitors từ page_view nội bộ — chỉ thấy traffic đã chạm track.js,
// thiếu hẳn organic/ads/social đo qua GA4). Auth bằng service-account JWT
// (RS256, self-signed, KHÔNG cần thư viện googleapis). Best-effort: thiếu env
// hoặc lỗi API → trả null, caller tự fallback về số nội bộ, KHÔNG chặn dashboard.
// ============================================================

import crypto from 'crypto';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const SERVICE_ACCOUNT_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedToken: { token: string; exp: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Nhận CẢ raw JSON lẫn base64 (Vercel/CI hay lưu key dạng base64 cho gọn 1 dòng —
// `scripts/ga4.mjs` đã nhận cả hai từ đầu, bản này thì chưa). Khớp dạng là quan
// trọng: parse hỏng ở đây trả null IM LẶNG → dashboard tụt về số nội bộ mà không
// báo gì, nên thêm cảnh báo để lần sau lộ ra ngay thay vì phải đi dò.
function parseServiceAccount(input: string): ServiceAccount | null {
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
    console.warn('[ga4] GA4_SERVICE_ACCOUNT_JSON không đọc được (cần raw JSON hoặc base64) — bỏ qua GA4, dùng số nội bộ.');
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (!SERVICE_ACCOUNT_JSON) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const sa = parseServiceAccount(SERVICE_ACCOUNT_JSON);
  if (!sa || !sa.client_email || !sa.private_key) return null;

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
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
    cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
    return data.access_token;
  } catch {
    return null;
  }
}

// Tổng sessions GA4 trong [fromDate, toDate] (YYYY-MM-DD, cả 2 đầu inclusive
// theo quy ước GA4 Data API). Trả null nếu chưa cấu hình/env thiếu/API lỗi.
export async function getGa4Sessions(fromDate: string, toDate: string): Promise<number | null> {
  if (!PROPERTY_ID) return null;
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: fromDate, endDate: toDate }],
        metrics: [{ name: 'sessions' }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rows?: Array<{ metricValues?: Array<{ value?: string }> }> };
    const val = data.rows?.[0]?.metricValues?.[0]?.value;
    return val != null ? Number(val) : 0;
  } catch {
    return null;
  }
}
