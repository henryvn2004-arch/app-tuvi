// lib/channels/store.ts
// ============================================================
// LƯU TRỮ KÊNH CHAT — GENERIC ĐA-NỀN-TẢNG (Supabase, SERVICE KEY).
//
// Một bộ hàm dùng CHUNG cho mọi kênh webhook (Telegram, Messenger,
// WhatsApp, Zalo…). Khóa theo (platform, external_id/chat_id) trên các
// bảng generic chat_sessions / chat_links / chat_link_tokens / chat_usage
// (xem _patches/migration-channels-multiplatform.sql).
//
//   • Phiên hội thoại  : chatLoadSession / chatSaveSession / chatClearSession
//   • Liên kết ví Lượng: chatCreateLinkToken / chatConsumeLinkToken /
//                        chatResolveLinkedUser / chatGetLinkedExternalId / chatUnlink
//   • Lượt free/ngày    : chatGetFreeUsageToday / chatIncrFreeUsage
//
// Tất cả best-effort: lỗi/thiếu cấu hình → trả rỗng/null, KHÔNG ném (route
// không sập). Adapter từng kênh chỉ truyền `platform` của mình vào.
// ============================================================

import { randomBytes } from 'crypto';
import type { ChatMessage, BirthParams } from '@/lib/contract/v1';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};
const ready = () => !!(SUPABASE_URL && SUPABASE_KEY);

const HISTORY_KEEP = 12; // số message giữ lại cho slot-filling
const TOKEN_TTL_MIN = 15; // token liên kết sống bao lâu (phút)

// ── Phiên hội thoại (chat_sessions) ─────────────────────────
export interface ChatSession {
  messages: ChatMessage[];
  birth: BirthParams | null;
}

export async function chatLoadSession(platform: string, chatId: number | string): Promise<ChatSession> {
  if (!ready()) return { messages: [], birth: null };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_sessions?platform=eq.${encodeURIComponent(platform)}&chat_id=eq.${encodeURIComponent(String(chatId))}&select=messages,birth&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return { messages: [], birth: null };
    const rows = (await res.json()) as { messages?: ChatMessage[]; birth?: BirthParams | null }[];
    const msgs = rows[0]?.messages;
    return { messages: Array.isArray(msgs) ? msgs : [], birth: rows[0]?.birth ?? null };
  } catch {
    return { messages: [], birth: null };
  }
}

export async function chatSaveSession(
  platform: string,
  chatId: number | string,
  messages: ChatMessage[],
  birth: BirthParams | null = null,
): Promise<void> {
  if (!ready()) return;
  const trimmed = messages.slice(-HISTORY_KEEP);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {
    platform,
    chat_id: String(chatId),
    messages: trimmed,
    updated_at: new Date().toISOString(),
  };
  if (birth) row.birth = birth; // giữ lá số cũ nếu lượt này chưa lập được
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
  } catch {
    /* best-effort */
  }
}

export async function chatClearSession(platform: string, chatId: number | string): Promise<void> {
  if (!ready()) return;
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/chat_sessions?platform=eq.${encodeURIComponent(platform)}&chat_id=eq.${encodeURIComponent(String(chatId))}`,
      { method: 'DELETE', headers: SB_HEADERS },
    );
  } catch {
    /* best-effort */
  }
}

// ── Sổ lá số (chat_profiles) ────────────────────────────────
// Nhiều lá số ĐẶT TÊN cho mỗi (platform, chat_id). Cho phép 1 người dùng kênh
// chat lưu & gọi lại "anh Tony", "con gái"… mà không lẫn. Best-effort: bảng
// chưa có / lỗi → trả rỗng/false, KHÔNG ném (route không sập).
export interface ChatProfile {
  name: string;
  birth: BirthParams;
}

const enc = (s: string) => encodeURIComponent(s);
const PROFILE_NAME_MAX = 40;

/** Liệt kê sổ lá số của 1 người (mới cập nhật trước). */
export async function chatListProfiles(platform: string, chatId: number | string): Promise<ChatProfile[]> {
  if (!ready()) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_profiles?platform=eq.${enc(platform)}&chat_id=eq.${enc(String(chatId))}&select=name,birth&order=updated_at.desc`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { name?: string; birth?: BirthParams }[];
    return rows
      .filter((r) => r.name && r.birth)
      .map((r) => ({ name: r.name as string, birth: r.birth as BirthParams }));
  } catch {
    return [];
  }
}

/** Lấy 1 lá số theo tên (KHÔNG phân biệt hoa/thường). Khớp trong JS để tránh
 *  ký tự đặc biệt của ilike (% _) gây sai. Null nếu không có. */
export async function chatGetProfile(
  platform: string,
  chatId: number | string,
  name: string,
): Promise<ChatProfile | null> {
  const want = (name || '').trim().toLowerCase();
  if (!want) return null;
  const all = await chatListProfiles(platform, chatId);
  return all.find((p) => p.name.toLowerCase() === want) || null;
}

/** Lưu/cập nhật 1 lá số theo tên (upsert thủ công: có thì PATCH, chưa thì POST
 *  — vì unique index trên lower(name) là expression index, on_conflict của
 *  PostgREST không kham). Trả true nếu thành công. */
export async function chatSaveProfile(
  platform: string,
  chatId: number | string,
  name: string,
  birth: BirthParams,
): Promise<boolean> {
  if (!ready() || !birth) return false;
  const clean = (name || '').trim().slice(0, PROFILE_NAME_MAX);
  if (!clean) return false;
  const nowIso = new Date().toISOString();
  try {
    const existing = await chatGetProfile(platform, chatId, clean);
    if (existing) {
      // Khớp theo tên ĐÃ LƯU (eq, an toàn vì là giá trị chính xác từ DB).
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_profiles?platform=eq.${enc(platform)}&chat_id=eq.${enc(String(chatId))}&name=eq.${enc(existing.name)}`,
        {
          method: 'PATCH',
          headers: SB_HEADERS,
          body: JSON.stringify({ birth, name: clean, updated_at: nowIso }),
        },
      );
      return res.ok;
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_profiles`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ platform, chat_id: String(chatId), name: clean, birth, updated_at: nowIso }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Liên kết ví Lượng (chat_links + chat_link_tokens) ───────
/** Sinh token liên kết 1 lần cho user đang đăng nhập (web). Trả token, hoặc
 *  null nếu lỗi. Caller dựng deep link đặc thù nền tảng (t.me / m.me / wa.me). */
export async function chatCreateLinkToken(platform: string, userId: string): Promise<string | null> {
  if (!ready() || !userId) return null;
  // base64url an toàn cho start param (A-Za-z0-9_-, ≤64 ký tự).
  const token = randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_link_tokens`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ token, platform, user_id: userId, expires_at: expires }),
    });
    return res.ok ? token : null;
  } catch {
    return null;
  }
}

/** Bot tiêu thụ token: kiểm còn hạn & chưa dùng → ghi chat_links (upsert) →
 *  đánh dấu token đã dùng. Trả userId vừa link, hoặc null nếu sai/hết hạn/đã dùng. */
export async function chatConsumeLinkToken(
  platform: string,
  token: string,
  externalId: string,
): Promise<string | null> {
  if (!ready() || !token || !externalId) return null;
  try {
    const nowIso = new Date().toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_link_tokens?token=eq.${encodeURIComponent(token)}&platform=eq.${encodeURIComponent(platform)}&select=user_id,expires_at,used_at&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string; expires_at?: string; used_at?: string | null }[];
    const row = rows[0];
    if (!row?.user_id || row.used_at) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

    // Ghi map (upsert: 1 external_id chỉ trỏ 1 tài khoản, link lại thì đè).
    const up = await fetch(`${SUPABASE_URL}/rest/v1/chat_links`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ platform, external_id: externalId, user_id: row.user_id, linked_at: nowIso }),
    });
    if (!up.ok) return null;

    // Đánh dấu token đã dùng (best-effort).
    await fetch(`${SUPABASE_URL}/rest/v1/chat_link_tokens?token=eq.${encodeURIComponent(token)}`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ used_at: nowIso }),
    }).catch(() => {});

    return row.user_id;
  } catch {
    return null;
  }
}

/** Tra ngược external_id → user_id đã link (null nếu chưa). */
export async function chatResolveLinkedUser(platform: string, externalId: string): Promise<string | null> {
  if (!ready() || !externalId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?platform=eq.${encodeURIComponent(platform)}&external_id=eq.${encodeURIComponent(externalId)}&select=user_id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string }[];
    return rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
}

/** Tra xuôi user_id → external_id đã link (cho UI web). Null nếu chưa. */
export async function chatGetLinkedExternalId(platform: string, userId: string): Promise<string | null> {
  if (!ready() || !userId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?platform=eq.${encodeURIComponent(platform)}&user_id=eq.${encodeURIComponent(userId)}&select=external_id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { external_id?: string }[];
    return rows[0]?.external_id ?? null;
  } catch {
    return null;
  }
}

/** Gỡ link (web bấm "Hủy liên kết"). True nếu xóa được. */
export async function chatUnlink(platform: string, userId: string): Promise<boolean> {
  if (!ready() || !userId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?platform=eq.${encodeURIComponent(platform)}&user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: SB_HEADERS },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Lượt free/ngày (chat_usage) ─────────────────────────────
function todayVN(): string {
  // Ngày theo giờ VN (UTC+7) để cap reset đúng nửa đêm VN.
  const vn = new Date(Date.now() + 7 * 3600_000);
  return vn.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Số lượt free đã dùng hôm nay (0 nếu chưa có / lỗi). */
export async function chatGetFreeUsageToday(platform: string, externalId: string): Promise<number> {
  if (!ready() || !externalId) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_usage?platform=eq.${encodeURIComponent(platform)}&external_id=eq.${encodeURIComponent(externalId)}&day=eq.${todayVN()}&select=count&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { count?: number }[];
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Tăng lượt free hôm nay (atomic qua RPC) → count mới, hoặc null nếu lỗi. */
export async function chatIncrFreeUsage(platform: string, externalId: string): Promise<number | null> {
  if (!ready() || !externalId) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chat_incr_free_usage`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_platform: platform, p_ext: externalId, p_day: todayVN() }),
    });
    if (!res.ok) return null;
    const n = Number(await res.json());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Sức khỏe kênh (events, event_type='bot_reply') ──────────
// Log MỖI lượt (thành công lẫn lỗi) — nguồn ĐÚNG cho "tổng lượt" thay vì
// chat_usage (chỉ đếm free-tier, bỏ sót user đã link ví). Best-effort,
// KHÔNG throw — gọi từ core.runConversation qua onOutcome, không chặn trả lời.
export async function chatLogOutcome(
  platform: string,
  chatId: number | string,
  ok: boolean,
  reason?: string,
): Promise<void> {
  if (!ready()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        event_type: 'bot_reply',
        platform,
        session_id: `${platform}-${chatId}`,
        meta: { ok, reason: reason || null },
      }),
    });
  } catch {
    /* best-effort */
  }
}
