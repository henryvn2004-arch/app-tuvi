// app/api/channels/zalo/route.ts
// ============================================================
// KÊNH ZALO OA — webhook ↔ "bộ não" (Contract v1).
//
// Vỏ mỏng: xác thực chữ ký → chuẩn hoá sự kiện → lib/channels/router
// (dùng chung mọi kênh: lệnh, tài khoản, tính phí, nút gợi ý, nạp QR).
// Zalo-đặc-thù nằm ở lib/channels/zalo:
//   • Chữ ký `X-ZEvent-Signature` = sha256(app_id + RAW body + timestamp + OA key).
//   • Không sửa được tin → gửi "đang xem…" 1 lần rồi gửi câu trả lời mới.
//
// ACK 200 NGAY rồi xử lý NỀN (waitUntil) — luận mất 20–60s.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { handleChannelEvent, type ChannelKit } from '@/lib/channels/router';
import {
  ZALO_PLATFORM,
  verifyZaloSignature,
  zaloIO,
  zaloStore,
  zaloProfiles,
  zaloClearSession,
} from '@/lib/channels/zalo';

export const runtime = 'nodejs';
export const maxDuration = 300;

const KIT: ChannelKit = {
  platform: ZALO_PLATFORM,
  label: 'Zalo',
  io: zaloIO,
  store: zaloStore,
  profiles: zaloProfiles,
  clearSession: (chatId) => zaloClearSession(String(chatId)),
  freeCap: Number(process.env.ZALO_FREE_DAILY || '3'),
  maxReplyButtons: 5,
};

// Zalo gọi thử URL khi cấu hình webhook — trả 200 để qua bước kiểm.
export async function GET() {
  return new Response('ok', { status: 200 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get('x-zevent-signature');
  if (!verifyZaloSignature(raw, sig)) {
    // Chữ ký sai/thiếu → BỎ QUA nhưng vẫn trả 200, không 401. Lý do: Zalo chỉ
    // hiện OA Secret Key SAU KHI lưu được Webhook URL, mà lúc lưu nó POST thử
    // và đòi 200 — trả 401 thì kẹt vòng (thiếu khoá → 401 → không lưu được →
    // không thấy khoá). Bảo mật không đổi: request không hợp lệ vẫn không được
    // xử lý. Log để lần ra khi khoá lệch (khoá thiếu thì mọi tin đều rơi ở đây).
    console.error(
      `[zalo] webhook chữ ký không hợp lệ — bỏ qua (oaKey=${process.env.ZALO_OA_SECRET_KEY ? 'có' : 'THIẾU'}, header=${sig ? 'có' : 'thiếu'})`,
    );
    return ok();
  }
  let ev: ZaloEvent;
  try {
    ev = JSON.parse(raw) as ZaloEvent;
  } catch {
    return ok();
  }
  waitUntil(
    getChatConfig()
      .then((cfg) => handleEvent(ev, cfg))
      .catch((e) => console.error('[zalo] handleEvent lỗi:', e)),
  );
  return ok();
}

async function handleEvent(ev: ZaloEvent, cfg: Awaited<ReturnType<typeof getChatConfig>>): Promise<void> {
  const name = ev.event_name || '';

  // Quan tâm OA lần đầu → chào + menu (tạo luôn tài khoản).
  if (name === 'follow') {
    const uid = ev.follower?.id;
    if (uid) await handleChannelEvent(KIT, { chatId: uid, externalId: uid, text: '/start', imageRefs: [] }, cfg);
    return;
  }
  // Chỉ xử lý tin người dùng gửi; bỏ qua echo (oa_send_*) và sự kiện khác.
  if (!name.startsWith('user_send_')) return;
  const uid = ev.sender?.id;
  if (!uid) return;

  const text = (ev.message?.text || '').trim();
  const imageRefs =
    name === 'user_send_image'
      ? (ev.message?.attachments || [])
          .filter((a) => a.type === 'image' && a.payload?.url)
          .map((a) => a.payload!.url as string)
      : [];

  await handleChannelEvent(KIT, { chatId: uid, externalId: uid, text, imageRefs }, cfg);
}

function ok() {
  return new Response('ok', { status: 200 });
}

// ── Kiểu sự kiện Zalo OA tối thiểu ──────────────────────────
interface ZaloEvent {
  app_id?: string;
  event_name?: string;
  timestamp?: string;
  sender?: { id?: string };
  follower?: { id?: string };
  message?: {
    msg_id?: string;
    text?: string;
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
}
