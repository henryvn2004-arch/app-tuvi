// app/api/channels/messenger/route.ts
// ============================================================
// KÊNH FACEBOOK MESSENGER — webhook ↔ "bộ não" (Contract v1).
//
// Vỏ mỏng giống Telegram: nhận webhook Meta → gọi runConversation IN-PROCESS
// → gửi luận giải qua Send API. Khác Telegram ở phần Meta-đặc-thù:
//   • GET  → xác thực đăng ký webhook (hub.challenge).
//   • POST → xác thực X-Hub-Signature-256 (HMAC App Secret) trên RAW body,
//            rồi parse entry[].messaging[].
//   • Messenger không sửa được tin → adapter gửi "đang xem…" 1 lần (no edit).
//
// ACK 200 NGAY rồi xử lý NỀN (waitUntil) — luận mất 20–60s, Meta cần 200 nhanh
// nếu không sẽ retry. Tính phí: dùng chung cổng buildAccessGate (ví Lượng nếu
// đã link, không thì freeCap lượt/ngày). Liên kết ví từ web là việc làm sau.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { runConversation } from '@/lib/channels/core';
import { buildAccessGate } from '@/lib/channels/gate';
import { verifyMetaSignature, verifyWebhookChallenge } from '@/lib/channels/meta';
import { messengerIO, messengerStore, msgrSendText, msgrClearSession } from '@/lib/channels/messenger';
import { consumeLinkToken, resolveLinkedUser, LINK_CMD } from '@/lib/channels/messengerLink';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_SECRET = process.env.MESSENGER_APP_SECRET || '';
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || '';
const FREE_DAILY = Number(process.env.MESSENGER_FREE_DAILY || '3');
const PLATFORM = 'messenger';

const ERR_MSG = 'Xin lỗi, mình gặp trục trặc khi xử lý. Bạn thử lại sau giây lát nhé.';
const SITE = 'https://tuviminhbao.com';

const freeCapMsg =
  `Bạn đã dùng hết ${FREE_DAILY} lượt miễn phí hôm nay (reset mỗi ngày). 🌙\n\n` +
  `Bạn có thể tiếp tục trò chuyện không giới hạn trên web tại ${SITE} nhé.`;

const noBalanceMsg = (balance: number, cost: number) =>
  `Bạn còn ${balance} Lượng, mỗi lượt cần ${cost} Lượng.\n\nNạp thêm tại ${SITE}/topup.html rồi quay lại chat nhé. 💳`;

const LINK_OK =
  '✅ Đã liên kết tài khoản thành công!\n\n' +
  'Từ giờ bạn chat ở đây bằng ví Lượng của mình — nạp trên web là dùng được luôn tại Messenger.';

const LINK_FAIL =
  '⚠️ Liên kết không thành công — mã đã hết hạn hoặc đã được dùng.\n\n' +
  `Bạn tạo lại liên kết tại ${SITE} → Hồ sơ → Liên kết Messenger nhé.`;

const LINK_ALREADY = '✅ Tài khoản này đã được liên kết — bạn đang dùng ví Lượng của mình.';

const LINK_GUIDE =
  'Để chat bằng ví Lượng của bạn:\n' +
  `1) Mở ${SITE}, đăng nhập\n` +
  '2) Vào Hồ sơ → mục Credits → bấm "Liên kết Messenger"\n' +
  '3) Bấm mở Messenger để hoàn tất.';

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

  // Liên kết ví qua deep link m.me?ref (thread cũ → messaging_referrals;
  // thread mới → Get Started postback kèm referral). Tiêu thụ token rồi dừng.
  const refToken = ev.referral?.ref || ev.postback?.referral?.ref;
  if (refToken) {
    await handleLinkToken(psid, refToken);
    return;
  }

  const m = ev.message;
  // Bỏ qua echo (tin do chính Page gửi) + sự kiện không phải tin nhắn.
  if (!m || m.is_echo) return;

  const text = (m.text || '').trim();
  const imageRefs = (m.attachments || [])
    .filter((a) => a.type === 'image' && a.payload?.url)
    .map((a) => a.payload!.url as string);
  const hasImage = imageRefs.length > 0;

  if (!text && !hasImage) {
    await msgrSendText(
      psid,
      'Hiện mình trả lời tin nhắn dạng chữ hoặc ẢNH (khuôn mặt để xem tướng, không gian/nhà cửa để xem phong thủy). Bạn gõ câu hỏi hoặc gửi ảnh nhé!',
    );
    return;
  }

  // Lệnh tối thiểu: bắt đầu lại.
  if (text === '/new' || text === '/reset') {
    await msgrClearSession(psid);
    await msgrSendText(psid, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  // /link <token> (fallback chữ nếu ref không tới). /link trống → hướng dẫn.
  if (text === LINK_CMD || text.startsWith(`${LINK_CMD} `)) {
    const token = text.startsWith(`${LINK_CMD} `) ? text.slice(LINK_CMD.length + 1).trim() : '';
    if (token) {
      await handleLinkToken(psid, token);
      return;
    }
    const linked = await resolveLinkedUser(psid);
    await msgrSendText(psid, linked ? LINK_ALREADY : LINK_GUIDE);
    return;
  }

  // Cổng tính phí (trước khi tốn token LLM).
  const gate = await buildAccessGate({
    platform: PLATFORM,
    externalId: psid,
    cost: cfg.cost,
    freeCap: FREE_DAILY,
    freeCapMsg,
    noBalanceMsg,
    txDescription: 'Lượt luận giải Messenger',
  });
  if (!gate.allowed) {
    await msgrSendText(psid, gate.message || ERR_MSG);
    return;
  }

  await runConversation(
    messengerIO,
    messengerStore,
    { chatId: psid, text: text, imageRefs },
    cfg,
    ERR_MSG,
    gate.commit,
  );
}

/** Tiêu thụ token liên kết (từ ref hoặc "/link <token>") rồi trả lời phù hợp. */
async function handleLinkToken(psid: string, token: string): Promise<void> {
  const uid = await consumeLinkToken(token, psid);
  if (uid) {
    await msgrSendText(psid, LINK_OK);
    return;
  }
  const linked = await resolveLinkedUser(psid);
  await msgrSendText(psid, linked ? LINK_ALREADY : LINK_FAIL);
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
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
  // Liên kết ví: ref từ m.me?ref (referral) hoặc Get Started (postback.referral).
  referral?: { ref?: string };
  postback?: { payload?: string; referral?: { ref?: string } };
}
