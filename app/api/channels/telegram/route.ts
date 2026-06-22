// app/api/channels/telegram/route.ts
// ============================================================
// KÊNH TELEGRAM — webhook ↔ "bộ não" /api/v1 (Contract v1).
//
// Vỏ mỏng: nhận update Telegram → gọi runAgent IN-PROCESS (cùng loop
// với web) → gửi luận giải về. KHÔNG tính phí (user Telegram chưa gắn
// tài khoản Supabase) → lượt free.
//
// QUAN TRỌNG — webhook PHẢI ack 200 NGAY rồi xử lý NỀN (waitUntil):
//   luận giải mất 20–60s; nếu xử lý xong mới trả 200 thì Telegram
//   "Read timeout" → retry → 504 dồn. Ack tức thì → Telegram yên.
//
// UX khi chờ (Telegram không stream từng chữ như web):
//   - gửi NGAY 1 tin "đang xem lá số…" rồi EDIT theo tiến trình agent
//     (status: lập lá số → tra vận hạn → suy xét) → người dùng thấy
//     "đang chạy", không tưởng treo.
//   - giữ "typing…" sống (Telegram tự tắt sau ~5s) bằng vòng lặp 4s.
//   - chốt: edit tin đó thành câu trả lời (phần dư >4096 gửi tin mới).
//
// Bảo mật: verify header secret_token. Phiên lưu ở telegram_sessions.
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import type { ChatRequestV1, ChatMessage } from '@/lib/contract/v1';
import { runAgent } from '@/lib/agent/run';
import { getChatConfig } from '@/lib/config/appConfig';
import {
  tgSendMessage,
  tgSendMessageReturnId,
  tgEditMessage,
  tgSendChatAction,
  splitText,
  loadSession,
  saveSession,
  clearSession,
  createSSECollector,
} from '@/lib/channels/telegram';

export const runtime = 'nodejs';
export const maxDuration = 300; // Pro: nền có đủ thời gian lập lá số + luận

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const MSG_LIMIT = 4096;

const WELCOME =
  'Xin chào! Mình là trợ lý Tử Vi Minh Bảo 🔮\n\n' +
  'Hỏi mình bất cứ điều gì về tử vi, vận hạn, tuổi tác... Để lập lá số, ' +
  'cho mình biết: giới tính, ngày/tháng/năm sinh (dương lịch), và giờ sinh.\n\n' +
  'Ví dụ: "Nữ, 03/06/1998, giờ Sửu, năm nay làm ăn sao?"\n\n' +
  'Gõ /new để bắt đầu cuộc trò chuyện mới.';

const ERR_MSG = 'Xin lỗi, mình gặp trục trặc khi xử lý. Bạn thử lại sau giây lát nhé.';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  waitUntil(handleUpdate(update));
  return ok();
}

// ── Xử lý nền (sau khi đã ack 200) ──────────────────────────
async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text || '').trim();

  if (!chatId) return;

  // Bỏ qua update không phải tin nhắn text (ảnh, sticker, callback...).
  if (!text) {
    await tgSendMessage(chatId, 'Hiện mình chỉ trả lời tin nhắn dạng chữ. Bạn gõ câu hỏi nhé!');
    return;
  }

  // ── Lệnh ─────────────────────────────────────────────────────
  if (text === '/start') {
    await clearSession(chatId);
    await tgSendMessage(chatId, WELCOME);
    return;
  }
  if (text === '/new' || text === '/reset') {
    await clearSession(chatId);
    await tgSendMessage(chatId, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  // ── Hội thoại ────────────────────────────────────────────────
  await tgSendChatAction(chatId, 'typing');
  const progressId = await tgSendMessageReturnId(chatId, '🔮 Đang xem lá số của bạn, chờ một chút…');

  const history = await loadSession(chatId);
  const messages: ChatMessage[] = [...history, { role: 'user', content: text }];

  // Giữ "typing…" sống suốt quá trình (Telegram tự tắt sau ~5s).
  let working = true;
  const keepTyping = (async () => {
    while (working) {
      await sleep(4000);
      if (working) await tgSendChatAction(chatId, 'typing');
    }
  })();

  // Edit thanh tiến trình theo status của agent (throttle 2.5s tránh rate-limit).
  let lastEdit = Date.now();
  const onStatus = (status: string) => {
    const now = Date.now();
    if (progressId && now - lastEdit > 2500) {
      lastEdit = now;
      void tgEditMessage(chatId, progressId, '🔮 ' + status);
    }
  };

  try {
    const cfg = await getChatConfig();
    const req: ChatRequestV1 = {
      session_id: `tg-${chatId}`,
      messages,
      stream: true,
      client: { platform: 'telegram', version: '1.0.0' },
    };
    const collector = createSSECollector(onStatus);
    await runAgent(req, cfg, collector.send);
    working = false;

    const err = collector.getError();
    const answer = collector.getText().trim();

    if (err || !answer) {
      await deliver(chatId, progressId, ERR_MSG);
      return;
    }
    await deliver(chatId, progressId, answer);
    // Lưu lịch sử (gồm câu trả lời) cho lượt sau slot-filling.
    await saveSession(chatId, [...messages, { role: 'assistant', content: answer }]);
  } catch {
    working = false;
    await deliver(chatId, progressId, ERR_MSG);
  } finally {
    working = false;
    await keepTyping.catch(() => {});
  }
}

// Chốt nội dung vào tin tiến trình (edit); phần dư >4096 gửi thành tin mới.
async function deliver(chatId: number, progressId: number | null, text: string): Promise<void> {
  if (!progressId) {
    await tgSendMessage(chatId, text);
    return;
  }
  const parts = splitText(text, MSG_LIMIT);
  await tgEditMessage(chatId, progressId, parts[0]);
  for (const p of parts.slice(1)) await tgSendMessage(chatId, p);
}

function ok() {
  return new Response('ok', { status: 200 });
}

// ── Kiểu update tối thiểu của Telegram ──────────────────────
interface TgUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}
