// app/api/channels/zalo/route.ts
// ============================================================
// KÊNH ZALO OA — webhook ↔ "bộ não" (Contract v1).
//
// Vỏ mỏng giống Messenger: nhận sự kiện OA → gọi runConversation IN-PROCESS
// → gửi luận giải qua OA API (tin tư vấn). Zalo-đặc-thù nằm ở lib/channels/zalo:
//   • Chữ ký `X-ZEvent-Signature` = sha256(app_id + RAW body + timestamp + OA key).
//   • Không sửa được tin → gửi "đang xem…" 1 lần rồi gửi câu trả lời mới.
//
// ACK 200 NGAY rồi xử lý NỀN (waitUntil) — luận mất 20–60s. Tính phí: cổng
// chung buildAccessGate (ví Lượng nếu đã link, không thì freeCap lượt/ngày).
// ============================================================

import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getChatConfig } from '@/lib/config/appConfig';
import { runConversation } from '@/lib/channels/core';
import { buildAccessGate } from '@/lib/channels/gate';
import { chatLogOutcome } from '@/lib/channels/store';
import {
  ZALO_PLATFORM,
  verifyZaloSignature,
  zaloIO,
  zaloStore,
  zaloProfiles,
  zaloSendText,
  zaloClearSession,
} from '@/lib/channels/zalo';
import { consumeLinkToken, resolveLinkedUser, LINK_CMD } from '@/lib/channels/zaloLink';
import { getRailPrice } from '@/lib/billing/pricing';

export const runtime = 'nodejs';
export const maxDuration = 300;

const FREE_DAILY = Number(process.env.ZALO_FREE_DAILY || '3');

const ERR_MSG = 'Xin lỗi, mình gặp trục trặc khi xử lý. Bạn thử lại sau giây lát nhé.';
const SITE = 'https://tuviminhbao.com';

const WELCOME =
  'Xin chào! Đây là Hỏi Thầy — Tử Vi Minh Bảo 🔮\n\n' +
  'Hỏi mình bất cứ điều gì về tử vi, vận hạn, tuổi tác... Để lập lá số, cho mình biết: ' +
  'giới tính, ngày/tháng/năm sinh (dương lịch) và giờ sinh.\n\n' +
  'Ví dụ: "Nữ, 03/06/1998, giờ Sửu, năm nay làm ăn sao?"\n\n' +
  'Gửi ảnh khuôn mặt để xem tướng, ảnh nhà cửa để xem phong thủy.\n\n' +
  'Lệnh: /new — trò chuyện mới · /link — dùng ví Lượng của bạn (nạp trên web).';

const freeCapMsg =
  `Bạn đã dùng hết ${FREE_DAILY} lượt miễn phí hôm nay (reset mỗi ngày). 🌙\n\n` +
  `Liên kết tài khoản để chat bằng ví Lượng (gõ /link để xem cách), hoặc tiếp tục trên web tại ${SITE} nhé.`;

const noBalanceMsg = (balance: number, cost: number) =>
  `Bạn còn ${balance} Lượng, mỗi lượt cần ${cost} Lượng.\n\nNạp thêm tại ${SITE}/topup.html rồi quay lại chat nhé.`;

const LINK_OK =
  '✅ Đã liên kết tài khoản thành công!\n\n' +
  'Từ giờ bạn chat ở đây bằng ví Lượng của mình — nạp trên web là dùng được luôn tại Zalo.';

const LINK_FAIL =
  '⚠️ Liên kết không thành công — mã đã hết hạn hoặc đã được dùng.\n\n' +
  `Bạn tạo lại mã tại ${SITE}/app/tai-khoan → Kết nối → Zalo nhé.`;

const LINK_ALREADY = '✅ Tài khoản này đã được liên kết — bạn đang dùng ví Lượng của mình.';

const LINK_GUIDE =
  'Để chat bằng ví Lượng của bạn:\n' +
  `1) Mở ${SITE}, đăng nhập\n` +
  '2) Vào Tài khoản → Kết nối → bấm "Liên kết Zalo" để lấy mã\n' +
  '3) Nhắn cho OA này: /link <mã>';

// Zalo gọi thử URL khi cấu hình webhook — trả 200 để qua bước kiểm.
export async function GET() {
  return new Response('ok', { status: 200 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyZaloSignature(raw, request.headers.get('x-zevent-signature'))) {
    return new Response('forbidden', { status: 401 });
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

  if (name === 'follow') {
    const uid = ev.follower?.id;
    if (uid) await zaloSendText(uid, WELCOME);
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
  const hasImage = imageRefs.length > 0;

  if (!text && !hasImage) {
    await zaloSendText(
      uid,
      'Hiện mình trả lời tin nhắn dạng chữ hoặc ẢNH (khuôn mặt để xem tướng, không gian/nhà cửa để xem phong thủy). Bạn gõ câu hỏi hoặc gửi ảnh nhé!',
    );
    return;
  }

  if (text === '/start' || text === '/help') {
    await zaloSendText(uid, WELCOME);
    return;
  }

  if (text === '/new' || text === '/reset') {
    await zaloClearSession(uid);
    await zaloSendText(uid, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  if (text === LINK_CMD || text.startsWith(`${LINK_CMD} `)) {
    const token = text.slice(LINK_CMD.length).trim();
    if (token) {
      const linkedUid = await consumeLinkToken(token, uid);
      if (linkedUid) {
        await zaloSendText(uid, LINK_OK);
        return;
      }
      await zaloSendText(uid, (await resolveLinkedUser(uid)) ? LINK_ALREADY : LINK_FAIL);
      return;
    }
    await zaloSendText(uid, (await resolveLinkedUser(uid)) ? LINK_ALREADY : LINK_GUIDE);
    return;
  }

  // Cổng tính phí (trước khi tốn token LLM).
  const gate = await buildAccessGate({
    platform: ZALO_PLATFORM,
    externalId: uid,
    cost: await getRailPrice(cfg.cost),
    freeCap: FREE_DAILY,
    freeCapMsg,
    noBalanceMsg,
    txDescription: 'Lượt luận giải Zalo',
  });
  if (!gate.allowed) {
    await zaloSendText(uid, gate.message || ERR_MSG);
    return;
  }

  await runConversation(
    zaloIO,
    zaloStore,
    { chatId: uid, text, imageRefs },
    cfg,
    ERR_MSG,
    gate.commit,
    zaloProfiles,
    (okRun, reason) => void chatLogOutcome(ZALO_PLATFORM, uid, okRun, reason),
  );
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
