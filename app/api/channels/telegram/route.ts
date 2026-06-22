// app/api/channels/telegram/route.ts
// ============================================================
// KÊNH TELEGRAM — webhook ↔ "bộ não" /api/v1 (Contract v1).
//
// Vỏ mỏng: nhận update Telegram → gọi runAgent IN-PROCESS (cùng loop
// với web) → gửi luận giải về.
//
// Tính phí (Lượng) — dùng CHUNG ví với web:
//   - User đã LIÊN KẾT tài khoản (telegram_links, qua /start <token> sinh
//     từ web) → trừ Lượng trên ví đó y hệt /api/v1/chat. Hết Lượng → mời nạp.
//   - CHƯA liên kết → cho FREE_DAILY_CAP lượt free/ngày (chống đốt token);
//     hết quota → mời liên kết tài khoản. Xem lib/channels/telegramLink.
//   - paywallDisabled() hoặc cost=0 → free toàn bộ (không đếm).
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
import type { ChatRequestV1, ChatMessage, ChatImage } from '@/lib/contract/v1';
import { runAgent } from '@/lib/agent/run';
import { getChatConfig } from '@/lib/config/appConfig';
import { paywallDisabled, getBalance, deductCredits, logTransaction } from '@/lib/billing/credits';
import {
  resolveLinkedUser,
  consumeLinkToken,
  getFreeUsageToday,
  incrFreeUsage,
  FREE_DAILY_CAP,
} from '@/lib/channels/telegramLink';
import {
  tgSendMessage,
  tgSendMessageReturnId,
  tgEditMessage,
  tgSendChatAction,
  tgFetchImage,
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
const MAX_TG_IMAGES = 3; // khớp MAX_IMAGES_PER_MSG trong runAgent

const WELCOME =
  'Xin chào! Mình là trợ lý Tử Vi Minh Bảo 🔮\n\n' +
  'Hỏi mình bất cứ điều gì về tử vi, vận hạn, tuổi tác... Để lập lá số, ' +
  'cho mình biết: giới tính, ngày/tháng/năm sinh (dương lịch), và giờ sinh.\n\n' +
  'Ví dụ: "Nữ, 03/06/1998, giờ Sửu, năm nay làm ăn sao?"\n\n' +
  'Lệnh: /new — trò chuyện mới · /link — dùng ví Lượng của bạn (nạp trên web).';

const ERR_MSG = 'Xin lỗi, mình gặp trục trặc khi xử lý. Bạn thử lại sau giây lát nhé.';

const SITE = 'https://tuviminhbao.com';

const LINK_OK =
  '✅ Đã liên kết tài khoản thành công!\n\n' +
  'Từ giờ bạn chat ở đây bằng ví Lượng của mình — nạp trên web là dùng được luôn tại Telegram. ' +
  'Hỏi mình về tử vi, vận hạn, tuổi tác... nhé!';

const LINK_FAIL =
  '⚠️ Liên kết không thành công — mã đã hết hạn hoặc đã được dùng.\n\n' +
  `Bạn tạo lại liên kết tại ${SITE} → Hồ sơ → Liên kết Telegram nhé.`;

// Hướng dẫn liên kết (dùng cho lệnh /link và khi hết lượt free).
const LINK_GUIDE =
  'Để chat thoải mái bằng ví Lượng của bạn:\n' +
  `1) Mở ${SITE}, đăng nhập\n` +
  '2) Vào Hồ sơ → mục Credits → bấm "Liên kết Telegram"\n' +
  '3) Bấm nút mở bot — xong, ví Lượng dùng chung ở đây.';

const freeCapMsg = () =>
  `Bạn đã dùng hết ${FREE_DAILY_CAP} lượt miễn phí hôm nay (reset mỗi ngày). 🌙\n\n` +
  LINK_GUIDE;

const noBalanceMsg = (balance: number, cost: number) =>
  `Bạn còn ${balance} Lượng, mỗi lượt cần ${cost} Lượng.\n\n` +
  `Nạp thêm tại ${SITE}/topup.html rồi quay lại chat nhé. 💳`;

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

  // Danh tính tính phí = telegram USER id (from.id). Ở chat riêng nó trùng
  // chat.id, nhưng dùng from.id mới đúng (tránh nhầm khi group/forward).
  const fromId = String(msg?.from?.id ?? chatId);

  // ── Ảnh đính kèm (nhân tướng / phong thủy) ───────────────────
  // Ảnh nén: photo[] (lấy bản LỚN NHẤT = phần tử cuối). Ảnh gửi dạng file
  // (không nén): document mime image/*. Caption đi kèm làm câu hỏi.
  const fileIds: string[] = [];
  const photo = msg?.photo;
  if (Array.isArray(photo) && photo.length) fileIds.push(photo[photo.length - 1].file_id);
  if (msg?.document?.mime_type?.startsWith('image/') && msg.document.file_id) {
    fileIds.push(msg.document.file_id);
  }
  const hasImage = fileIds.length > 0;
  const caption = (msg?.caption || '').trim();
  // Câu hỏi: text thường, hoặc caption của ảnh.
  const userText = text || caption;

  // Bỏ qua update không có chữ lẫn ảnh (sticker, vị trí, voice...).
  if (!userText && !hasImage) {
    await tgSendMessage(
      chatId,
      'Hiện mình trả lời tin nhắn dạng chữ hoặc ẢNH (khuôn mặt để xem tướng, không gian/nhà cửa để xem phong thủy). Bạn gõ câu hỏi hoặc gửi ảnh nhé!',
    );
    return;
  }

  // ── Lệnh ─────────────────────────────────────────────────────
  // /start [token]: token sinh từ web → liên kết ví Lượng.
  if (text === '/start' || text.startsWith('/start ')) {
    const token = text.startsWith('/start ') ? text.slice(7).trim() : '';
    await clearSession(chatId);
    if (token) {
      const uid = await consumeLinkToken(token, fromId);
      await tgSendMessage(chatId, uid ? LINK_OK : LINK_FAIL);
      return;
    }
    await tgSendMessage(chatId, WELCOME);
    return;
  }
  if (text === '/new' || text === '/reset') {
    await clearSession(chatId);
    await tgSendMessage(chatId, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }
  if (text === '/link') {
    const uid = await resolveLinkedUser(fromId);
    await tgSendMessage(
      chatId,
      uid
        ? '✅ Tài khoản này đã được liên kết — bạn đang dùng ví Lượng của mình.'
        : LINK_GUIDE,
    );
    return;
  }

  // ── Cổng tính phí (trước khi tốn token LLM) ──────────────────
  const cfg = await getChatConfig();
  const gate = await checkAccess(fromId, cfg.cost);
  if (!gate.allowed) {
    await tgSendMessage(chatId, gate.message || ERR_MSG);
    return;
  }

  // ── Hội thoại ────────────────────────────────────────────────
  await tgSendChatAction(chatId, 'typing');
  const progressId = await tgSendMessageReturnId(
    chatId,
    hasImage ? '🔮 Đang xem ảnh của bạn, chờ một chút…' : '🔮 Đang xem lá số của bạn, chờ một chút…',
  );

  // Tải ảnh (nếu có) → base64 cho runAgent. Tải lỗi thì bỏ qua, vẫn luận theo chữ.
  const images: ChatImage[] = [];
  if (hasImage) {
    for (const fid of fileIds.slice(0, MAX_TG_IMAGES)) {
      const img = await tgFetchImage(fid);
      if (img) images.push(img);
    }
  }

  const session = await loadSession(chatId);
  // Tin lượt này: gửi runAgent KÈM ảnh (base64). Nếu chỉ có ảnh không caption
  // → mồi câu hỏi mặc định để model luận.
  const userMsg: ChatMessage = { role: 'user', content: userText || 'Nhờ thầy xem giúp ảnh này.' };
  if (images.length) userMsg.images = images;
  const messages: ChatMessage[] = [...session.messages, userMsg];

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
    const req: ChatRequestV1 = {
      session_id: `tg-${chatId}`,
      messages,
      stream: true,
      // Đã có lá số từ phiên trước → truyền thẳng, server tính lại deterministic,
      // bot không phải hỏi lại ngày sinh dù text đã trôi khỏi cửa sổ 12 tin.
      ...(session.birth ? { birth: session.birth } : {}),
      client: { platform: 'telegram', version: '1.0.0' },
    };
    const collector = createSSECollector(onStatus);
    const { birth: agentBirth } = await runAgent(req, cfg, collector.send);
    working = false;

    const err = collector.getError();
    const answer = collector.getText().trim();

    if (err || !answer) {
      await deliver(chatId, progressId, ERR_MSG);
      return;
    }
    await deliver(chatId, progressId, answer);
    // Trả lời thành công → CHỐT tính phí (trừ Lượng / tăng lượt free).
    // Lỗi/không có câu trả lời thì KHÔNG tính (return ở nhánh trên).
    if (gate.commit) await gate.commit();
    // Lưu lịch sử + lá số đã lập (nếu có) cho lượt sau. KHÔNG lưu base64 ảnh:
    // tránh phình jsonb telegram_sessions và gửi lại ảnh cũ ở mọi lượt sau
    // (tốn token + sai ngữ cảnh). Giữ caption làm dấu vết "đã gửi ảnh".
    const savedUserMsg: ChatMessage = {
      role: 'user',
      content: images.length ? (userText ? `[ảnh] ${userText}` : '[Đã gửi ảnh]') : userText,
    };
    await saveSession(
      chatId,
      [...session.messages, savedUserMsg, { role: 'assistant', content: answer }],
      agentBirth,
    );
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

// ── Cổng tính phí ───────────────────────────────────────────
// Trả { allowed, message?, commit? }. commit() gọi SAU khi trả lời
// thành công (trừ Lượng nếu đã link / tăng lượt free nếu chưa link).
interface AccessGate {
  allowed: boolean;
  message?: string;
  commit?: () => Promise<void>;
}

async function checkAccess(fromId: string, cost: number): Promise<AccessGate> {
  // Tắt paywall hoặc giá 0 → free, không đếm.
  if (paywallDisabled() || cost <= 0) return { allowed: true };

  const userId = await resolveLinkedUser(fromId);
  if (userId) {
    // Đã liên kết → dùng ví Lượng chung với web.
    const balance = await getBalance(userId);
    if (balance < cost) return { allowed: false, message: noBalanceMsg(balance, cost) };
    return {
      allowed: true,
      commit: async () => {
        const newBal = await deductCredits(userId, cost);
        if (newBal != null) {
          await logTransaction({
            userId,
            amount: -cost,
            type: 'chat',
            description: 'Lượt luận giải Telegram',
          });
        }
      },
    };
  }

  // Chưa liên kết → cap lượt free/ngày.
  const used = await getFreeUsageToday(fromId);
  if (used >= FREE_DAILY_CAP) return { allowed: false, message: freeCapMsg() };
  return { allowed: true, commit: async () => void (await incrFreeUsage(fromId)) };
}

// ── Kiểu update tối thiểu của Telegram ──────────────────────
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
