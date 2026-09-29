// Phiên đăng nhập: token Zalo → /api/channels/zalo-mini/login → tokenHash →
// Supabase /auth/v1/verify → phiên Supabase. Từ đó mọi API web gọi bằng Bearer
// như trình duyệt. Đổi tokenHash ở CLIENT (không ở server) vì Supabase giới hạn
// /verify theo IP — xem lib/channels/handoff.ts của web.
import { getAccessToken, getUserInfo } from 'zmp-sdk';
import { API_BASE, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { load, save } from './storage';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // giây epoch
}

const KEY = 'tvmb.session';
let current = load<Session>(KEY);
let inflight: Promise<Session> | null = null;

function toSession(d: {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
}): Session {
  if (!d.access_token || !d.refresh_token) throw new Error('Phiên đăng nhập không hợp lệ');
  const expires_at = d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600);
  return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at };
}

async function supabaseAuth(path: string, body: unknown): Promise<Session> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error_description || d.msg || `Đăng nhập lỗi (${r.status})`);
  return toSession(d);
}

async function loginWithZalo(): Promise<Session> {
  const accessToken = await getAccessToken();
  // `idByOA` chỉ là gợi ý để server gộp với tài khoản đã nhắn OA — server tự
  // kiểm lại, thiếu thì vẫn đăng nhập được (tài khoản riêng của Mini App).
  let idByOA: string | undefined;
  try {
    idByOA = (await getUserInfo({})).userInfo.idByOA;
  } catch {
    idByOA = undefined;
  }
  const r = await fetch(`${API_BASE}/api/channels/zalo-mini/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, idByOA }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.tokenHash)
    throw new Error(d.error || 'Chưa đăng nhập được, thử lại sau giây lát');
  return supabaseAuth('verify', { type: 'magiclink', token_hash: d.tokenHash });
}

/** Access token còn hạn; tự xoay (refresh) hoặc đăng nhập lại. Gộp mọi lượt gọi song song. */
export async function freshToken(force = false): Promise<string> {
  if (!force && current && current.expires_at - Date.now() / 1000 > 60) return current.access_token;
  inflight = inflight || renew(current?.refresh_token);
  return (await inflight).access_token;
}

async function renew(rt: string | undefined): Promise<Session> {
  try {
    let s: Session | null = null;
    if (rt) {
      try {
        s = await supabaseAuth('token?grant_type=refresh_token', { refresh_token: rt });
      } catch (e) {
        console.warn('[session] refresh hỏng, đăng nhập lại', e);
      }
    }
    s = s || (await loginWithZalo());
    current = s;
    save(KEY, s);
    return s;
  } finally {
    inflight = null;
  }
}

/** fetch tới API web kèm Bearer; 401 thì xoay token một lần rồi gọi lại. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const call = async (token: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  const res = await call(await freshToken());
  return res.status === 401 ? call(await freshToken(true)) : res;
}

/** authFetch + đọc JSON; lỗi HTTP ném Error mang câu của server. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || d.message || `Lỗi máy chủ (${res.status})`);
  return d as T;
}
