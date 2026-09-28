// app/api/channels/telegram/route.ts
// ============================================================
// KÊNH TELEGRAM — webhook ↔ "bộ não" /api/v1 (Contract v1).
//
// Vỏ mỏng: xác thực secret → chuẩn hoá update → lib/channels/router (dùng
// chung mọi kênh: lệnh, tài khoản — tin đầu tiên là có tài khoản + quà đăng
// ký như web —, tính phí giống rail web, nút gợi ý, nạp QR ngay trong chat).
// `/start <tham số>`: `login_<mã>` = đăng nhập web, còn lại = mã liên kết ví.
//
// QUAN TRỌNG — webhook PHẢI ack 200 NGAY rồi xử lý NỀN (waitUntil):
//   luận giải mất 20–60s; nếu xử lý xong mới trả 200 thì Telegram
//   "Read timeout" → retry → 504 dồn. Ack tức thì → Telegram yên.
//
// UX khi chờ (Telegram không stream từng chữ như web): gửi NGAY 1 tin "đang
// xem lá số…" rồi EDIT theo tiến trình agent, chốt bằng câu trả lời.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { FREE_DAILY_CAP } from '@/lib/channels/telegramLink';
import { telegramIO, telegramStore, telegramProfiles, clearSession } from '@/lib/channels/telegram';
import { handleChannelEvent, type ChannelKit } from '@/lib/channels/router';

export const runtime = 'nodejs';
export const maxDuration = 300; // Pro: nền có đủ thời gian lập lá số + luận

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const KIT: ChannelKit = {
  platform: 'telegram',
  label: 'Telegram',
  io: telegramIO,
  store: telegramStore,
  profiles: telegramProfiles,
  clearSession,
  freeCap: FREE_DAILY_CAP,
  maxReplyButtons: 15,
};

// Telegram health check / nhỡ mở bằng GET.
export async function GET() {
  return new Response(JSON.stringify({ channel: 'telegram', status: 'live' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  // ── Verify secret (Telegram gửi header này nếu setWebhook có secret_token) ──
  const sig = request.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!WEBHOOK_SECRET || sig !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return ok(); // ack để Telegram không retry
  }

  // ACK NGAY, xử lý NỀN — Telegram chỉ cần 200 nhanh.
  waitUntil(handleUpdate(update).catch((e) => console.error('[telegram] handleUpdate lỗi:', e)));
  return ok();
}

// ── Xử lý nền (sau khi đã ack 200) ──────────────────────────
async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (!chatId) return;

  // Người gửi (khoá ví/tài khoản) — khác chatId khi ở nhóm; chat riêng thì trùng.
  const fromId = String(msg?.from?.id ?? chatId);

  // Ảnh: photo (lấy bản lớn nhất) hoặc file ảnh gửi dạng document.
  const fileIds: string[] = [];
  const photo = msg?.photo;
  if (Array.isArray(photo) && photo.length) fileIds.push(photo[photo.length - 1].file_id);
  if (msg?.document?.mime_type?.startsWith('image/') && msg.document.file_id) {
    fileIds.push(msg.document.file_id);
  }

  let text = (msg?.text || msg?.caption || '').trim();
  // Deep link t.me/<bot>?start=<tham số>.
  if (text.startsWith('/start ')) {
    const arg = text.slice('/start '.length).trim();
    text = arg.startsWith('login_') ? `DN ${arg.slice('login_'.length)}` : `/link ${arg}`;
  }

  const cfg = await getChatConfig();
  await handleChannelEvent(KIT, { chatId, externalId: fromId, text, imageRefs: fileIds }, cfg);
}

function ok() {
  return new Response('ok', { status: 200 });
}

interface TgUpdate {
  message?: {
    chat?: { id?: number };
    from?: { id?: number };
    text?: string;
    caption?: string;
    // Ảnh nén: mảng nhiều kích cỡ (tăng dần) → phần tử cuối là lớn nhất.
    photo?: { file_id: string; file_size?: number }[];
    // Ảnh/tệp gửi dạng "file" (không nén).
    document?: { file_id?: string; mime_type?: string };
  };
}
