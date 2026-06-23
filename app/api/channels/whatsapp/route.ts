// app/api/channels/whatsapp/route.ts
// ============================================================
// KÊNH WHATSAPP (Cloud API) — webhook ↔ "bộ não" (Contract v1).
//
// Cùng khuôn Messenger (Meta Graph): GET xác thực hub.challenge, POST xác thực
// X-Hub-Signature-256 trên RAW body, ACK 200 ngay + xử lý nền. Khác ở SHAPE
// payload (entry[].changes[].value.messages[]) và cách tải ảnh (media-id).
//
// Trả lời free-form chỉ trong cửa sổ 24h kể từ tin user — đủ cho bot trả lời
// tin đến. Tính phí dùng chung buildAccessGate (ví Lượng nếu link / freeCap).
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { runConversation } from '@/lib/channels/core';
import { buildAccessGate } from '@/lib/channels/gate';
import { verifyMetaSignature, verifyWebhookChallenge } from '@/lib/channels/meta';
import { whatsappIO, whatsappStore, waSendText, waClearSession } from '@/lib/channels/whatsapp';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const FREE_DAILY = Number(process.env.WHATSAPP_FREE_DAILY || '3');
const PLATFORM = 'whatsapp';

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

  let body: WaWebhook;
  try {
    body = JSON.parse(raw) as WaWebhook;
  } catch {
    return ok();
  }
  if (body.object !== 'whatsapp_business_account') return ok();

  waitUntil(handleWebhook(body));
  return ok();
}

async function handleWebhook(body: WaWebhook): Promise<void> {
  const cfg = await getChatConfig();
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      for (const msg of change.value?.messages || []) {
        await handleMessage(msg, cfg).catch((e) => console.error('[whatsapp] handleMessage lỗi:', e));
      }
    }
  }
}

async function handleMessage(msg: WaMessage, cfg: Awaited<ReturnType<typeof getChatConfig>>): Promise<void> {
  const from = msg.from;
  if (!from) return;

  // Trích chữ + ảnh theo loại tin.
  let text = '';
  const imageRefs: string[] = [];
  if (msg.type === 'text') {
    text = (msg.text?.body || '').trim();
  } else if (msg.type === 'image' && msg.image?.id) {
    imageRefs.push(msg.image.id); // media-id → adapter GET url rồi tải
    text = (msg.image.caption || '').trim();
  }
  const hasImage = imageRefs.length > 0;

  if (!text && !hasImage) {
    await waSendText(
      from,
      'Hiện mình trả lời tin nhắn dạng chữ hoặc ẢNH (khuôn mặt để xem tướng, không gian/nhà cửa để xem phong thủy). Bạn gõ câu hỏi hoặc gửi ảnh nhé!',
    );
    return;
  }

  if (text === '/new' || text === '/reset') {
    await waClearSession(from);
    await waSendText(from, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  const gate = await buildAccessGate({
    platform: PLATFORM,
    externalId: from,
    cost: cfg.cost,
    freeCap: FREE_DAILY,
    freeCapMsg,
    noBalanceMsg,
    txDescription: 'Lượt luận giải WhatsApp',
  });
  if (!gate.allowed) {
    await waSendText(from, gate.message || ERR_MSG);
    return;
  }

  await runConversation(whatsappIO, whatsappStore, { chatId: from, text, imageRefs }, cfg, ERR_MSG, gate.commit);
}

function ok() {
  return new Response('EVENT_RECEIVED', { status: 200 });
}

// ── Kiểu webhook WhatsApp tối thiểu ─────────────────────────
interface WaWebhook {
  object?: string;
  entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[];
}
interface WaMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
}
