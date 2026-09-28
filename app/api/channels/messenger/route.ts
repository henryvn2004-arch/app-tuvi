// app/api/channels/messenger/route.ts
// ============================================================
// KÊNH FACEBOOK MESSENGER — webhook ↔ "bộ não" (Contract v1).
//
// Vỏ mỏng: xác thực → chuẩn hoá sự kiện → lib/channels/router (dùng chung
// mọi kênh: lệnh, tài khoản, tính phí, nút gợi ý, nạp QR). Meta-đặc-thù:
//   • GET  → xác thực đăng ký webhook (hub.challenge).
//   • POST → xác thực X-Hub-Signature-256 (HMAC App Secret) trên RAW body,
//            rồi parse entry[].messaging[].
//   • Nút bấm về dạng quick_reply.payload / postback.payload = chữ soạn sẵn.
//   • m.me/<page>?ref=… → `login_<mã>` (đăng nhập web) hoặc mã liên kết ví.
//
// ACK 200 NGAY rồi xử lý NỀN (waitUntil) — luận mất 20–60s, Meta cần 200 nhanh
// nếu không sẽ retry.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { verifyMetaSignature, verifyWebhookChallenge } from '@/lib/channels/meta';
import { messengerIO, messengerStore, messengerProfiles, msgrClearSession } from '@/lib/channels/messenger';
import { FREE_DAILY_CAP } from '@/lib/channels/messengerLink';
import { handleChannelEvent, type ChannelKit } from '@/lib/channels/router';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_SECRET = process.env.MESSENGER_APP_SECRET || '';
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || '';

const KIT: ChannelKit = {
  platform: 'messenger',
  label: 'Messenger',
  io: messengerIO,
  store: messengerStore,
  profiles: messengerProfiles,
  clearSession: (chatId) => msgrClearSession(String(chatId)),
  freeCap: FREE_DAILY_CAP,
  maxReplyButtons: 13,
};

// ── GET: xác thực đăng ký webhook ───────────────────────────
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const challenge = verifyWebhookChallenge(url, VERIFY_TOKEN);
  if (challenge !== null) return new Response(challenge, { status: 200 });
  return new Response('forbidden', { status: 403 });
}

// ── POST: nhận sự kiện ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(APP_SECRET, raw, sig)) {
    return new Response('forbidden', { status: 401 });
  }

  let body: MsgrWebhook;
  try {
    body = JSON.parse(raw) as MsgrWebhook;
  } catch {
    return ok();
  }
  if (body.object !== 'page') return ok();

  waitUntil(handleWebhook(body));
  return ok();
}

async function handleWebhook(body: MsgrWebhook): Promise<void> {
  const cfg = await getChatConfig();
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      await handleEvent(ev, cfg).catch((e) =>
        console.error('[messenger] handleEvent lỗi:', e),
      );
    }
  }
}

async function handleEvent(ev: MsgrMessaging, cfg: Awaited<ReturnType<typeof getChatConfig>>): Promise<void> {
  const psid = ev.sender?.id;
  if (!psid) return;

  // m.me?ref (thread cũ → messaging_referrals; thread mới → Get Started kèm
  // referral): `login_<mã>` = đăng nhập web, còn lại = mã liên kết ví web.
  const ref = ev.referral?.ref || ev.postback?.referral?.ref;
  if (ref) {
    const text = ref.startsWith('login_') ? `DN ${ref.slice('login_'.length)}` : `/link ${ref}`;
    await handleChannelEvent(KIT, { chatId: psid, externalId: psid, text, imageRefs: [] }, cfg);
    return;
  }

  // Nút postback (Get Started, nút template) → chữ soạn sẵn trong payload.
  if (ev.postback) {
    const p = (ev.postback.payload || '').trim();
    const text = !p || /^get[_ ]?started$/i.test(p) ? '/start' : p;
    await handleChannelEvent(KIT, { chatId: psid, externalId: psid, text, imageRefs: [] }, cfg);
    return;
  }

  const m = ev.message;
  // Bỏ qua echo (tin do chính Page gửi) + sự kiện không phải tin nhắn.
  if (!m || m.is_echo) return;

  // Bấm quick reply → payload là đúng câu soạn sẵn (nhãn nút bị cắt ≤20 ký tự).
  const text = (m.quick_reply?.payload || m.text || '').trim();
  const imageRefs = (m.attachments || [])
    .filter((a) => a.type === 'image' && a.payload?.url)
    .map((a) => a.payload!.url as string);

  await handleChannelEvent(KIT, { chatId: psid, externalId: psid, text, imageRefs }, cfg);
}

function ok() {
  return new Response('EVENT_RECEIVED', { status: 200 });
}

// ── Kiểu webhook Messenger tối thiểu ────────────────────────
interface MsgrWebhook {
  object?: string;
  entry?: { messaging?: MsgrMessaging[] }[];
}
interface MsgrMessaging {
  sender?: { id?: string };
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
  // Liên kết ví: ref từ m.me?ref (referral) hoặc Get Started (postback.referral).
  referral?: { ref?: string };
  postback?: { payload?: string; referral?: { ref?: string } };
}
