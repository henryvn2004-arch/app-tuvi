// lib/channels/account.ts
// ============================================================
// TÀI KHOẢN TỪ KÊNH CHAT — người nhắn tin lần đầu là có tài khoản.
//
// Trước đây người dùng Zalo/Messenger/WhatsApp/Telegram chỉ là một
// `external_id` với vài lượt free/ngày; muốn có ví, lá số, trí nhớ thì phải
// lên web đăng ký rồi gõ "/link <mã>". Nay tin nhắn ĐẦU TIÊN tạo luôn một
// tài khoản thật trong auth.users ("tài khoản bóng") và ghi map vào
// `chat_links` — từ đó ví Lượng, sổ lá số, trí nhớ dùng chung với web.
//
// 🔑 Vì sao tạo tài khoản THƯỜNG (có email tổng hợp) chứ không ẩn danh:
//   • Quà chào mừng do trigger `handle_new_user_signup()` cấp khi INSERT
//     auth.users (bỏ qua `is_anonymous`). Tài khoản thường ⇒ nhận ĐÚNG quà
//     của web, cùng cấu hình `credits.signup_bonus_variants` — marketing chỉ
//     chỉnh một chỗ. Lượt rail tặng (`rail.signup_free_turns`) web cấp ở
//     `/api/signup-signal`; ở đây cấp cùng hàm, cùng cấu hình.
//   • Có email thì `generateLink` dùng được ⇒ link chat → web tự đăng nhập
//     (lib/channels/handoff.ts).
// Email dạng `<kênh>.<id>@chat.tuviminhbao.com` — KHÔNG có hộp thư. Mọi đường
// gửi email phải bỏ qua domain này (`isShadowEmail`, chặn ở lib/email/send.ts).
//
// Chống tạo trùng: email tất định theo (kênh, id) + UNIQUE email của
// auth.users là mutex. Hai webhook cùng lúc ⇒ lượt thua nhận "email đã tồn
// tại" rồi tra lại id qua RPC `chat_user_id_by_email`.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { chatResolveLinkedUser } from './store';
import { shadowEmail } from './shadow-email';
import { railFreeGrant, railSignupFreeTurns } from '@/lib/billing/viral-budget';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

function admin() {
  return createClient(SUPABASE_URL || '', SUPABASE_KEY || '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function userIdByEmail(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chat_user_id_by_email`, {
      method: 'POST',
      headers: SB_HEADERS,
      cache: 'no-store',
      body: JSON.stringify({ p_email: email }),
    });
    if (!res.ok) {
      console.error('[chat-account] chat_user_id_by_email lỗi', res.status, await res.text().catch(() => ''));
      return null;
    }
    const id = (await res.json()) as string | null;
    return typeof id === 'string' && id ? id : null;
  } catch (e) {
    console.error('[chat-account] chat_user_id_by_email lỗi mạng', e);
    return null;
  }
}

/**
 * Tài khoản của người đang nhắn: đã có map → trả luôn; chưa có → tạo tài
 * khoản bóng + ghi map. null khi thiếu cấu hình/lỗi — nơi gọi rơi về hành vi
 * cũ (lượt free/ngày theo external_id), kênh không sập.
 */
export async function ensureChatUser(platform: string, externalId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !externalId) return null;
  const linked = await chatResolveLinkedUser(platform, externalId);
  if (linked) return linked;

  const email = shadowEmail(platform, externalId);
  let userId: string | null = null;
  let created = false;
  try {
    const { data, error } = await admin().auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { chat_origin: platform },
      user_metadata: { chat_platform: platform },
    });
    if (data?.user?.id) {
      userId = data.user.id;
      created = true;
    } else if (error) {
      // Trùng email = lượt khác đã tạo (hoặc lượt trước chết trước khi ghi map).
      userId = await userIdByEmail(email);
      if (!userId) console.error('[chat-account] createUser lỗi', error.message);
    }
  } catch (e) {
    console.error('[chat-account] createUser lỗi mạng', e);
    return null;
  }
  if (!userId) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_links`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ platform, external_id: externalId, user_id: userId, linked_at: new Date().toISOString() }),
    });
    if (!res.ok) console.error('[chat-account] ghi chat_links lỗi', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[chat-account] ghi chat_links lỗi mạng', e);
  }

  // Lượt rail tặng khi đăng ký — cùng hàm/cấu hình với /api/signup-signal.
  // Chỉ lượt THẮNG (vừa tạo user) mới cấp ⇒ một lần mỗi tài khoản.
  if (created) {
    const n = await railSignupFreeTurns();
    if (n > 0 && !(await railFreeGrant(userId, n))) {
      console.error('[chat-account] rail_free_grant thất bại', userId);
    }
  }

  // Đọc lại map: nếu một lượt khác ghi trước (vd vừa /link tài khoản web) thì
  // map đó thắng — không bao giờ đè.
  return (await chatResolveLinkedUser(platform, externalId)) || userId;
}
