// app/api/channels/whatsapp/route.ts
// ============================================================
// KÊNH WHATSAPP (Cloud API) — webhook ↔ "bộ não" (Contract v1).
//
// Cùng khuôn Messenger (Meta Graph): GET xác thực hub.challenge, POST xác thực
// X-Hub-Signature-256 trên RAW body, ACK 200 ngay + xử lý nền. Khác ở SHAPE
// payload (entry[].changes[].value.messages[]) và cách tải ảnh (media-id).
// Nút bấm về dạng `interactive.button_reply/list_reply.id` = chữ soạn sẵn.
//
// Trả lời free-form chỉ trong cửa sổ 24h kể từ tin user — đủ cho bot trả lời
// tin đến. Lệnh, tài khoản, tính phí, nút gợi ý, nạp QR: lib/channels/router.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { verifyMetaSignature, verifyWebhookChallenge } from '@/lib/channels/meta';
import { whatsappIO, whatsappStore, whatsappProfiles, waClearSession } from '@/lib/channels/whatsapp';
import { FREE_DAILY_CAP } from '@/lib/channels/whatsappLink';
import { handleChannelEvent, type ChannelKit } from '@/lib/channels/router';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';

const KIT: ChannelKit = {
  platform: 'whatsapp',
  label: 'WhatsApp',
  io: whatsappIO,
  store: whatsappStore,
  profiles: whatsappProfiles,
  clearSession: (chatId) => waClearSession(String(chatId)),
  freeCap: FREE_DAILY_CAP,
  maxReplyButtons: 10,
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

  let text = '';
  const imageRefs: string[] = [];
  if (msg.type === 'text') {
    text = (msg.text?.body || '').trim();
  } else if (msg.type === 'interactive') {
    // Bấm nút/danh sách → id là đúng câu soạn sẵn.
    text = (msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || '').trim();
  } else if (msg.type === 'image' && msg.image?.id) {
    imageRefs.push(msg.image.id); // media-id → adapter GET url rồi tải
    text = (msg.image.caption || '').trim();
  }

  await handleChannelEvent(KIT, { chatId: from, externalId: from, text, imageRefs }, cfg);
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
  interactive?: { button_reply?: { id?: string }; list_reply?: { id?: string } };
}
