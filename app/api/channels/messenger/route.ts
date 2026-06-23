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
}
