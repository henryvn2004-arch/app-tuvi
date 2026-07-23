// app/api/channels/telegram/route.ts
// ============================================================
// KÊNH TELEGRAM — webhook ↔ "bộ não" /api/v1 (Contract v1).
//
// Vỏ mỏng: nhận update Telegram → gọi runAgent IN-PROCESS (cùng loop
// với web) → gửi luận giải về.
//
// Tính phí (Lượng) — dùng CHUNG ví với web:
//   - User đã LIÊN KẾT tài khoản (chat_links, qua /start <token> sinh
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
// Bảo mật: verify header secret_token. Phiên lưu ở chat_sessions (generic,
// platform='telegram' — xem lib/channels/store + migration đa-nền-tảng).
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { paywallDisabled, getBalance, deductCredits, logTransaction } from '@/lib/billing/credits';
import { chatLogOutcome } from '@/lib/channels/store';
import {
  runConversation,
  type ChannelIO,
  type SessionStore,
  type ProfileStore,
  type AccessGate,
} from '@/lib/channels/core';
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
  loadSession,
  saveSession,
  clearSession,
  listProfiles,
  getProfile,
  saveProfile,
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
  'Lưu nhiều lá số: sau khi lập, đặt tên (vd "anh Tony") để lần sau nhắn "xem lá số Tony".\n\n' +
  'Lệnh: /new — trò chuyện mới · /laso — sổ lá số đã lưu · /link — dùng ví Lượng của bạn (nạp trên web).';

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

// ── Adapter Telegram cho lõi kênh (lib/channels/core) ───────
// I/O đặc thù + lưu phiên; điều phối 1 lượt nằm ở runConversation.
const telegramIO: ChannelIO = {
  platform: 'telegram',
  msgLimit: MSG_LIMIT,
  maxImages: MAX_TG_IMAGES,
  typing: (chatId) => tgSendChatAction(chatId, 'typing'),
  sendText: tgSendMessage,
  sendProgress: tgSendMessageReturnId,
  editText: (chatId, id, text) => tgEditMessage(chatId, Number(id), text),
  fetchImage: tgFetchImage,
};
const telegramStore: SessionStore = { load: loadSession, save: saveSession };
const telegramProfiles: ProfileStore = { list: listProfiles, get: getProfile, save: saveProfile };

// Nhãn ngắn cho 1 lá số trong sổ (giới + ngày sinh).
function birthLabel(b: { gender?: string; day?: number; month?: number; year?: number }): string {
  return `${b.gender === 'nu' ? 'Nữ' : 'Nam'} ${b.day}/${b.month}/${b.year}`;
}

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
  if (text === '/laso') {
    const list = await listProfiles(chatId);
    if (!list.length) {
      await tgSendMessage(
        chatId,
        'Sổ lá số của bạn đang trống. Lập một lá số rồi đặt tên để lưu, lần sau nhắn "xem lá số <tên>" là mở lại được.',
      );
    } else {
      const lines = list.map((p, i) => `${i + 1}. ${p.name} (${birthLabel(p.birth)})`).join('\n');
      await tgSendMessage(chatId, '🔖 Sổ lá số của bạn:\n' + lines + '\n\nNhắn "xem lá số <tên>" để mở lại.');
    }
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

  // ── Hội thoại — điều phối dùng CHUNG ở lib/channels/core ─────
  await runConversation(
    telegramIO,
    telegramStore,
    { chatId, text: userText, imageRefs: fileIds },
    cfg,
    ERR_MSG,
    gate.commit,
    telegramProfiles,
    (ok, reason) => void chatLogOutcome('telegram', chatId, ok, reason),
  );
}

function ok() {
  return new Response('ok', { status: 200 });
}

// ── Cổng tính phí ───────────────────────────────────────────
// Trả { allowed, message?, commit? }. commit() gọi SAU khi trả lời
// thành công (trừ Lượng nếu đã link / tăng lượt free nếu chưa link).
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
