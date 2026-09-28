// lib/channels/router.ts
// ============================================================
// ĐIỀU PHỐI MỘT TIN NHẮN KÊNH CHAT — dùng CHUNG cho Zalo OA, Messenger,
// WhatsApp, Telegram. Route từng kênh chỉ còn: xác thực webhook → chuẩn hoá
// sự kiện thành `ChannelEvent` → gọi `handleChannelEvent`.
//
// Trước bản này mỗi route tự chép lệnh (/new, /link…), cổng tính phí và chữ
// mời — bốn bản trôi khỏi nhau (Zalo có /thay, Messenger thì không; Telegram
// có cổng riêng). Gom về đây để một tính năng thêm một lần là có ở mọi kênh.
//
// Mỗi lượt:
//   1. Lệnh/nút bấm (menu, đổi thầy, sổ lá số, nạp tiền, mở web, mã đăng nhập,
//      liên kết) — xử lý rồi dừng, không tốn lượt luận.
//   2. Tài khoản: `ensureChatUser` — tin đầu tiên tạo luôn tài khoản thật,
//      nhận quà đăng ký y như web (lib/channels/account.ts).
//   3. Cổng tính phí GIỐNG HỆT rail web (/api/v1/chat): tiêu lượt tặng trước,
//      rồi mới trừ Lượng; hết thì gửi QR nạp ngay trong chat.
//   4. runConversation → nút gợi ý tiếp theo (câu hỏi gợi ý, mở lá số/công cụ
//      trên web đã đăng nhập sẵn, hỏi thầy khác).
// ============================================================

import { runConversation, type ChannelIO, type ChatButton, type ProfileStore, type SessionStore } from './core';
import { buildAccessGate } from './gate';
import { sendMenu } from './format';
import { chatConsumeLinkToken, chatLogOutcome, chatLoadSession } from './store';
import { ensureChatUser } from './account';
import { accountProfiles, saveChart } from './charts';
import { createHandoffUrl, lasoPath } from './handoff';
import { claimLoginCode, parseLoginCode } from './login';
import { TOPUP_CMD, createChatTopup, parseTopup, topupCaption, topupChoices, vietQrImageUrl } from './topup';
import { THAY_LIST, chonThay, thayCuaChat, timThay } from './author';
import { getRailPrice } from '@/lib/billing/pricing';
import { paywallDisabled, getBalance, deductCredits, logTransaction } from '@/lib/billing/credits';
import { railFreeRemaining, railFreeConsume } from '@/lib/billing/viral-budget';
import { vndPerCredit } from '@/lib/billing/packages';
import type { ChatConfig } from '@/lib/config/appConfig';

const SITE = 'https://tuviminhbao.com';
const ERR_MSG = 'Xin lỗi, mình gặp trục trặc khi xử lý. Bạn thử lại sau giây lát nhé.';

export interface ChannelKit {
  /** Khoá lưu trữ (chat_sessions/chat_links… cột platform). */
  platform: string;
  /** Tên kênh hiển thị ("Zalo"). */
  label: string;
  io: ChannelIO;
  store: SessionStore;
  /** Sổ lá số cũ theo cuộc trò chuyện (chat_profiles). */
  profiles: ProfileStore;
  clearSession(chatId: number | string): Promise<void>;
  /** Số lượt free/ngày khi KHÔNG tạo được tài khoản (đường lùi). */
  freeCap: number;
  /** Số nút "trả lời nhanh" tối đa kênh dựng được trong một tin. */
  maxReplyButtons: number;
}

export interface ChannelEvent {
  /** Nơi trả lời + khoá phiên. */
  chatId: number | string;
  /** Danh tính người gửi trên nền tảng (khoá chat_links). */
  externalId: string;
  text: string;
  imageRefs: string[];
}

const norm = (s: string) => s.trim().toLowerCase();
const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

// Lệnh nhận cả dạng gõ tay lẫn chữ trên nút (nút gửi lại đúng chữ `reply`).
const CMD = {
  menu: ['/start', '/help', '/menu', 'menu'],
  moi: ['/new', '/reset'],
  thay: '/thay',
  laso: ['/laso', '/so', 'sổ lá số'],
  web: ['/web'],
  link: '/link',
};

export async function handleChannelEvent(kit: ChannelKit, ev: ChannelEvent, cfg: ChatConfig): Promise<void> {
  const { io } = kit;
  const text = (ev.text || '').trim();
  const t = norm(text);
  const hasImage = ev.imageRefs.length > 0;

  if (!text && !hasImage) {
    await io.sendText(
      ev.chatId,
      'Hiện mình trả lời tin nhắn dạng chữ hoặc ẢNH (khuôn mặt để xem tướng, không gian/nhà cửa để xem phong thủy). Bạn gõ câu hỏi hoặc gửi ảnh nhé!',
    );
    return;
  }

  // ── Liên kết tài khoản web có sẵn (/link <mã> — mã tạo ở web) ─────────
  if (t === CMD.link || t.startsWith(`${CMD.link} `)) {
    const token = text.slice(CMD.link.length).trim();
    if (!token) {
      await io.sendText(
        ev.chatId,
        'Bạn đã có tài khoản ngay khi nhắn tin cho thầy — không cần liên kết gì thêm.\n\n' +
          `Nếu bạn CÓ SẴN tài khoản trên web và muốn gộp về một ví: đăng nhập ${SITE}, vào Tài khoản → Kết nối, lấy mã rồi nhắn "/link <mã>" ở đây.`,
      );
      return;
    }
    const uid = await chatConsumeLinkToken(kit.platform, token, ev.externalId);
    await io.sendText(
      ev.chatId,
      uid
        ? '✅ Đã liên kết với tài khoản web của bạn. Lượng, lá số đã lưu ở đây được gộp về tài khoản đó.'
        : '⚠️ Mã liên kết đã hết hạn hoặc đã được dùng. Bạn lấy mã mới trên web rồi nhắn lại nhé.',
    );
    return;
  }

  // Mọi đường còn lại cần tài khoản. null = thiếu cấu hình/lỗi → đường lùi
  // lượt free/ngày như trước (kênh không sập).
  const userId = await ensureChatUser(kit.platform, ev.externalId);

  // ── Mã đăng nhập web (trang /dang-nhap-chat) ──────────────────────────
  const loginCode = parseLoginCode(text);
  if (loginCode && userId) {
    const ok = await claimLoginCode(loginCode, userId, kit.platform);
    const explicit = !/^\d{6}$/.test(text);
    if (ok) {
      await io.sendText(ev.chatId, '✅ Đã xác nhận. Trang web của bạn sẽ tự đăng nhập trong vài giây.');
      return;
    }
    if (explicit) {
      await io.sendText(ev.chatId, '⚠️ Mã đăng nhập không đúng hoặc đã hết hạn. Bạn tải lại trang đăng nhập để lấy mã mới nhé.');
      return;
    }
    // Sáu chữ số trơn mà không khớp mã nào → coi là câu hỏi thường.
  }

  if (CMD.menu.includes(t)) return sendWelcome(kit, ev, userId);

  if (CMD.moi.includes(t)) {
    await kit.clearSession(ev.chatId);
    await io.sendText(ev.chatId, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  if (t === CMD.thay || t.startsWith(`${CMD.thay} `)) return handleThay(kit, ev, text.slice(CMD.thay.length).trim());

  if (CMD.laso.includes(t)) return handleSoLaSo(kit, ev, userId);

  if (CMD.web.includes(t)) {
    const session = await chatLoadSession(kit.platform, ev.chatId);
    const url = userId ? await createHandoffUrl(userId, session.birth ? lasoPath(session.birth) : '/app', session.birth) : null;
    await sendMenu(io, ev.chatId, 'Mở bản đầy đủ trên web — đã đăng nhập sẵn, đúng lá số bạn đang xem:', url ? [{ title: 'Mở trên web', url }] : [{ title: 'Mở trên web', url: SITE }]);
    return;
  }

  if (t === TOPUP_CMD || t.startsWith(`${TOPUP_CMD} `)) return handleTopup(kit, ev, userId, text.slice(TOPUP_CMD.length));

  // ── Cổng tính phí (trước khi tốn token LLM) ───────────────────────────
  const cost = await getRailPrice(cfg.cost);
  const gate = userId
    ? await accountGate(kit, ev, userId, cost)
    : await buildAccessGate({
        platform: kit.platform,
        externalId: ev.externalId,
        cost,
        freeCap: kit.freeCap,
        freeCapMsg: `Bạn đã dùng hết ${kit.freeCap} lượt miễn phí hôm nay (reset mỗi ngày). Bạn có thể tiếp tục trên web tại ${SITE} nhé.`,
        noBalanceMsg: (balance, c) => `Bạn còn ${balance} Lượng, mỗi lượt cần ${c} Lượng. Nạp thêm tại ${SITE}/topup.html nhé.`,
        txDescription: `Lượt luận giải ${kit.label}`,
      });
  if (!gate.allowed) {
    if (gate.message) await io.sendText(ev.chatId, gate.message);
    return;
  }

  const thay = await thayCuaChat(kit.platform, String(ev.chatId));
  const outcome = await runConversation(
    io,
    kit.store,
    { chatId: ev.chatId, text, imageRefs: ev.imageRefs, authorId: thay.id, authorName: thay.name, userId },
    cfg,
    ERR_MSG,
    gate.commit,
    userId ? accountProfiles(userId, kit.profiles) : kit.profiles,
    (okRun, reason) => void chatLogOutcome(kit.platform, ev.chatId, okRun, reason),
  );
  if (!outcome) return;

  // Lá số vừa xem → vào sổ tài khoản (nhãn rỗng = "đang dùng gần nhất", đúng
  // như tool web tự lưu) ⇒ mở web là thấy ngay, không nhập lại.
  if (userId && outcome.lasoShown && outcome.birth) void saveChart(userId, '', outcome.birth);

  await sendFollowUps(kit, ev, userId, outcome);
}

// ── Cổng tính phí cho người CÓ tài khoản — y hệt /api/v1/chat ──────────
async function accountGate(
  kit: ChannelKit,
  ev: ChannelEvent,
  userId: string,
  cost: number,
): Promise<{ allowed: boolean; message?: string; commit?: () => Promise<void> }> {
  if (paywallDisabled() || cost <= 0) return { allowed: true };
  const [freeLeft, balance] = await Promise.all([railFreeRemaining(userId), getBalance(userId)]);
  if (freeLeft <= 0 && balance < cost) {
    const rate = await vndPerCredit();
    const choices = await topupChoices();
    await sendMenu(
      kit.io,
      ev.chatId,
      `Mỗi câu hỏi ${vnd(cost * rate)} (${cost} Lượng) — ví của bạn còn ${balance} Lượng.\n\n` +
        'Nạp ngay tại đây: chọn mức, thầy gửi mã QR, quét bằng app ngân hàng là xong — không phải rời cuộc trò chuyện.',
      choices.slice(0, kit.maxReplyButtons),
    );
    return { allowed: false };
  }
  return {
    allowed: true,
    commit: async () => {
      // Lượt TẶNG tiêu trước, kiểm lại atomic ở DB (số đọc lúc nãy có thể cũ).
      if (freeLeft > 0 && (await railFreeConsume(userId))) return;
      const newBal = await deductCredits(userId, cost);
      if (newBal != null) {
        await logTransaction({ userId, amount: -cost, type: 'chat', description: `Lượt luận giải ${kit.label}` });
      } else {
        console.error(`[channel-router] trừ Lượng thất bại user=${userId} cost=${cost} kênh=${kit.platform}`);
      }
    },
  };
}

// ── Chào + menu ────────────────────────────────────────────────────────
async function sendWelcome(kit: ChannelKit, ev: ChannelEvent, userId: string | null): Promise<void> {
  const thay = await thayCuaChat(kit.platform, String(ev.chatId));
  let vi = '';
  if (userId) {
    const [bal, free] = await Promise.all([getBalance(userId), railFreeRemaining(userId)]);
    vi = `\n\nVí của bạn: ${bal} Lượng${free > 0 ? ` · ${free} câu hỏi tặng` : ''}.`;
  }
  const web = userId ? await createHandoffUrl(userId, '/app/cong-cu') : null;
  await sendMenu(
    kit.io,
    ev.chatId,
    'Xin chào! Đây là Hỏi Thầy — Tử Vi Minh Bảo 🔮\n\n' +
      'Hỏi thầy bất cứ điều gì về tử vi, vận hạn, tuổi tác, công việc, tình duyên… Để lập lá số, cho thầy biết: ' +
      'giới tính, ngày/tháng/năm sinh (dương lịch) và giờ sinh.\n' +
      'Ví dụ: "Nữ, 03/06/1998, giờ Sửu, năm nay làm ăn sao?"\n\n' +
      'Gửi ảnh khuôn mặt để xem tướng, ảnh nhà cửa để xem phong thủy.\n\n' +
      `Thầy ${thay.name} đang tiếp chuyện với bạn — nhóm Minh Bảo có ${THAY_LIST.length} thầy, đổi lúc nào cũng được.` +
      vi,
    [
      { title: 'Đổi thầy', reply: CMD.thay },
      { title: 'Sổ lá số', reply: CMD.laso[0] },
      { title: 'Nạp Lượng', reply: TOPUP_CMD },
      ...(web ? [{ title: 'Kho công cụ trên web', url: web }] : []),
    ],
  );
}

// ── Nhóm thầy ──────────────────────────────────────────────────────────
async function handleThay(kit: ChannelKit, ev: ChannelEvent, arg: string): Promise<void> {
  const hienTai = await thayCuaChat(kit.platform, String(ev.chatId));
  if (arg) {
    const moi = timThay(arg);
    if (moi) {
      const ok = await chonThay(kit.platform, String(ev.chatId), moi);
      await kit.io.sendText(ev.chatId, ok ? `Từ giờ Thầy ${moi.name} tiếp chuyện với bạn. Bạn hỏi gì nào?` : ERR_MSG);
      return;
    }
    await kit.io.sendText(ev.chatId, `Không tìm thấy thầy "${arg}".`);
  }
  const dong = THAY_LIST.map((x, i) => `${i + 1}. Thầy ${x.name}${x.id === hienTai.id ? ' (đang tiếp chuyện)' : ''}`);
  const khac = THAY_LIST.map((x, i) => ({ x, i })).filter(({ x }) => x.id !== hienTai.id);
  await sendMenu(
    kit.io,
    ev.chatId,
    `Nhóm Minh Bảo có ${THAY_LIST.length} thầy — mỗi thầy một lối luận riêng, hỏi thêm thầy khác là có ý kiến thứ hai trên cùng lá số:\n` +
      `${dong.join('\n')}\n\nĐổi thầy: bấm tên bên dưới, hoặc nhắn "/thay <số>", vd "/thay 3".`,
    khac.slice(0, kit.maxReplyButtons).map(({ x, i }) => ({ title: `Thầy ${x.name}`, reply: `${CMD.thay} ${i + 1}` })),
  );
}

// ── Sổ lá số (theo tài khoản, dùng chung với web) ─────────────────────
async function handleSoLaSo(kit: ChannelKit, ev: ChannelEvent, userId: string | null): Promise<void> {
  const store = userId ? accountProfiles(userId, kit.profiles) : kit.profiles;
  const list = await store.list(ev.chatId);
  const web = userId ? await createHandoffUrl(userId, '/app/so-la-so') : null;
  const webBtn: ChatButton[] = web ? [{ title: 'Mở sổ trên web', url: web }] : [];
  if (!list.length) {
    await sendMenu(
      kit.io,
      ev.chatId,
      'Sổ lá số của bạn đang trống. Lập một lá số rồi nhờ thầy lưu kèm tên (vd "lưu lá số này tên anh Tony") — lần sau nhắn "xem lá số Tony" là mở lại, trên web cũng thấy.',
      webBtn,
    );
    return;
  }
  const fmt = (b: { gender?: string; day?: number; month?: number; year?: number }) =>
    `${b.gender === 'nu' ? 'Nữ' : 'Nam'} ${b.day}/${b.month}/${b.year}`;
  await sendMenu(
    kit.io,
    ev.chatId,
    '🔖 Sổ lá số của bạn:\n' + list.map((p, i) => `${i + 1}. ${p.name} (${fmt(p.birth)})`).join('\n'),
    [
      ...list.slice(0, Math.max(0, kit.maxReplyButtons - webBtn.length)).map((p) => ({ title: p.name, reply: `Xem lá số ${p.name}` })),
      ...webBtn,
    ],
  );
}

// ── Nạp tiền ngay trong chat ───────────────────────────────────────────
async function handleTopup(kit: ChannelKit, ev: ChannelEvent, userId: string | null, arg: string): Promise<void> {
  if (!userId) {
    await kit.io.sendText(ev.chatId, `Bạn nạp Lượng tại ${SITE}/topup.html nhé.`);
    return;
  }
  const pick = await parseTopup(arg);
  if (pick.kind === 'menu' || pick.kind === 'invalid') {
    await sendMenu(
      kit.io,
      ev.chatId,
      (pick.kind === 'invalid' ? 'Mức nạp chưa đúng (từ 50.000đ đến 5.000.000đ). ' : '') +
        'Chọn mức nạp — thầy gửi mã QR ngay tại đây:',
      (await topupChoices()).slice(0, kit.maxReplyButtons),
    );
    return;
  }
  const order = await createChatTopup(userId, pick);
  if (!order) {
    await kit.io.sendText(ev.chatId, `Chưa tạo được mã nạp, bạn thử lại sau giây lát hoặc nạp tại ${SITE}/topup.html nhé.`);
    return;
  }
  const img = vietQrImageUrl(order);
  if (img && kit.io.sendImage) await kit.io.sendImage(ev.chatId, img);
  await sendMenu(kit.io, ev.chatId, topupCaption(order), [{ title: 'Mở trang thanh toán', url: order.checkoutUrl }]);
}

// ── Nút gợi ý sau câu trả lời ──────────────────────────────────────────
async function sendFollowUps(
  kit: ChannelKit,
  ev: ChannelEvent,
  userId: string | null,
  outcome: NonNullable<Awaited<ReturnType<typeof runConversation>>>,
): Promise<void> {
  const btns: ChatButton[] = [];
  // Link sang web chỉ khi có tài khoản — đăng nhập sẵn + đúng lá số.
  if (userId && outcome.toolSuggest?.path) {
    const url = await createHandoffUrl(userId, outcome.toolSuggest.path, outcome.birth);
    if (url) btns.push({ title: outcome.toolSuggest.label, url });
  }
  if (userId && outcome.lasoShown && outcome.birth) {
    const url = await createHandoffUrl(userId, lasoPath(outcome.birth), outcome.birth);
    if (url) btns.push({ title: 'Xem lá số đầy đủ', url });
  }
  const room = Math.max(0, Math.min(kit.maxReplyButtons, 5) - btns.length - 1);
  for (const s of outcome.suggestions.slice(0, Math.min(room, 3))) btns.push({ title: s, reply: s });
  btns.push({ title: 'Hỏi ý thầy khác', reply: CMD.thay });
  await sendMenu(kit.io, ev.chatId, outcome.toolSuggest?.lyDo || 'Bạn muốn hỏi tiếp gì?', btns);
}
