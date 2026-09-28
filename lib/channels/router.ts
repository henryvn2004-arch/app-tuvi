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
import { chatConsumeLinkToken, chatGetAuthor, chatLogOutcome, chatLoadSession } from './store';
import { ensureChatUser } from './account';
import { accountProfiles, saveChart } from './charts';
import { createHandoffUrl, lasoPath } from './handoff';
import { claimLoginCode, parseLoginCode } from './login';
import { GOP_CMD, isShadowUser, maskEmail, parseEmail, startEmailLink, verifyEmailLink, hasPendingEmailLink } from './email-link';
import { TOPUP_CMD, createChatTopup, parseTopup, topupCaption, topupChoices, vietQrImageUrl } from './topup';
import { GUESTS, detectMention, guestById, guestFromMoi, hoiChanDuoc, moiCau, pickGuests, type GuestId } from './guests';
import { toolCatalog } from './catalog';
import { THAY_LIST, anhThay, chonThay, gioiThieuThay, thayCuaChat, timThay, type Thay } from './author';
import { getRailPrice, getToolPrice } from '@/lib/billing/pricing';
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

// Lệnh = CÂU TIẾNG VIỆT mà nút gửi đi: Zalo hiện nguyên chữ `reply` thành tin
// của khách, Telegram in nó lên bàn phím — khách không bao giờ phải gõ "/".
// Dạng "/…" chỉ còn là bí danh cho nút cũ nằm trong lịch sử chat.
const CMD = {
  menu: ['/start', '/help', '/menu', 'menu'],
  moi: ['/new', '/reset', 'trò chuyện mới'],
  thay: ['đổi thầy', 'chọn thầy', '/thay'],
  thayKhac: 'hỏi ý thầy khác',
  laso: ['sổ lá số', '/laso', '/so'],
  web: ['/web', 'mở trên web'],
  link: '/link',
  moiThay: '/moi',
  hoiChan: ['mời 3 thầy hội chẩn', '/hoichan'],
  congCu: ['công cụ', 'cong cu', '/congcu'],
  congCuNhom: 'công cụ:',
  nap: ['nạp lượng', 'nạp tiền', TOPUP_CMD],
};
/** "nạp 100k" / "nạp 200.000đ" (nút nạp gửi đúng dạng này) → phần số tiền. */
const NAP_SO_RE = /^(?:nạp|\/nap)\s+(\S.*)$/;

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
    if (!token) return handleGop(kit, ev, await ensureChatUser(kit.platform, ev.externalId));
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

  // ── Gộp tài khoản web ngay trong chat (email → mã 6 số) ──────────────
  if (GOP_CMD.includes(t)) return handleGop(kit, ev, userId);
  const email = parseEmail(text);
  if (email) return handleGopEmail(kit, ev, userId, email);
  if (userId && /^\d{6}$/.test(text) && (await hasPendingEmailLink(kit.platform, ev.externalId))) {
    return handleGopMa(kit, ev, text, await getRailPrice(cfg.cost));
  }

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

  if (CMD.menu.includes(t)) return sendWelcome(kit, ev, userId, await getRailPrice(cfg.cost));

  if (CMD.moi.includes(t)) {
    await kit.clearSession(ev.chatId);
    await io.sendText(ev.chatId, 'Đã bắt đầu cuộc trò chuyện mới. Bạn hỏi gì nào?');
    return;
  }

  if (t === CMD.thayKhac) return handleThay(kit, ev, '');
  const thayCmd = CMD.thay.find((c) => t === c || t.startsWith(`${c} `));
  if (thayCmd) {
    // "đổi thầy 3" / "Chọn Thầy Tâm Kính" là lệnh; "đổi thầy thì có khác gì…"
    // (không ra tên thầy nào) là câu hỏi — để thầy trả lời.
    const arg = text.slice(thayCmd.length).trim();
    if (!arg || timThay(arg) || thayCmd.startsWith('/')) return handleThay(kit, ev, arg);
  }

  if (CMD.laso.includes(t)) return handleSoLaSo(kit, ev, userId);

  if (CMD.web.includes(t)) {
    const session = await chatLoadSession(kit.platform, ev.chatId);
    const url = userId ? await createHandoffUrl(userId, session.birth ? lasoPath(session.birth) : '/app', session.birth) : null;
    await sendMenu(io, ev.chatId, 'Mở bản đầy đủ trên web — đã đăng nhập sẵn, đúng lá số bạn đang xem:', url ? [{ title: 'Mở trên web', url }] : [{ title: 'Mở trên web', url: SITE }]);
    return;
  }

  if (CMD.nap.includes(t)) return handleTopup(kit, ev, userId, '');
  // "nạp 100k" là lệnh chỉ khi phần sau là SỐ TIỀN — "nạp tiền bằng gì" là câu hỏi.
  const napSo = t.match(NAP_SO_RE)?.[1];
  if (napSo && (t.startsWith('/') || /^[\d.,\s]+(k|đ|vnd|vnđ)?$/.test(napSo))) {
    return handleTopup(kit, ev, userId, napSo);
  }

  // Chữ "công cụ" chỉ khớp khi đứng MỘT MÌNH — "công cụ nào xem được…" là câu hỏi.
  if (CMD.congCu.includes(t)) return handleCongCu(kit, ev, userId, '');
  if (t.startsWith(CMD.congCuNhom) || t.startsWith('/congcu ')) {
    return handleCongCu(kit, ev, userId, t.replace(/^(công cụ:|\/congcu )/, '').trim());
  }

  // ── Mời thầy khác / hội chẩn (engine `addressMaster`/`hoiChan` của web) ──
  // Nút gửi "Mời Thầy <tên> cùng xem" / "Mời 3 thầy hội chẩn" ⇒ hỏi lại CHÍNH câu
  // vừa hỏi, lần này có thầy khách/nhóm cùng xem. Gõ "@Tâm Kính …" thì như web:
  // mời ngay trong câu.
  const session = await kit.store.load(ev.chatId);
  let askText = text;
  let addressMaster: GuestId | undefined;
  let hoiChan = false;
  const laHoiChan = CMD.hoiChan.includes(t);
  const khach = guestFromMoi(t);
  if (laHoiChan || khach || t.startsWith(`${CMD.moiThay} `)) {
    const cauTruoc = [...session.messages]
      .reverse()
      .find((m) => m.role === 'user' && typeof m.content === 'string' && !m.content.trim().startsWith('/'));
    if (!session.birth || !cauTruoc) {
      await io.sendText(ev.chatId, 'Cho thầy ngày giờ sinh và một câu hỏi trước đã, rồi mới mời thầy khác cùng xem nhé.');
      return;
    }
    const truoc = String(cauTruoc.content).replace(/^@[^,]*,\s*/, '');
    if (laHoiChan) {
      hoiChan = true;
      askText = truoc;
    } else {
      const g = khach || guestById(t.slice(CMD.moiThay.length).trim());
      if (!g) {
        await io.sendText(ev.chatId, `Thầy khách mời được: ${GUESTS.map((x) => `Thầy ${x.ten} (${x.mon})`).join(', ')}.`);
        return;
      }
      addressMaster = g.id;
      askText = `@${g.ten}, ${truoc}`;
    }
  } else {
    addressMaster = detectMention(text) ?? undefined;
  }

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
  // Lượt ĐẦU cuộc trò chuyện: thầy tự giới thiệu ngắn, ghép chung tin chờ
  // "đang xem…". Dấu "đã chào" = thầy ĐÃ được lưu vào chat_sessions.author_id
  // (lời chào/đổi thầy cũng lưu) — /new xoá dòng phiên nên chào lại từ đầu.
  const moiBatDau = !(await chatGetAuthor(kit.platform, String(ev.chatId)));
  if (moiBatDau) await chonThay(kit.platform, String(ev.chatId), thay);
  const outcome = await runConversation(
    io,
    kit.store,
    {
      chatId: ev.chatId,
      text: askText,
      imageRefs: ev.imageRefs,
      ...(addressMaster ? { addressMaster } : {}),
      ...(hoiChan ? { hoiChan: true } : {}),
      authorId: thay.id,
      authorName: thay.name,
      authorAvatarUrl: anhThay(thay),
      ...(moiBatDau ? { intro: await gioiThieuThay(thay) } : {}),
      userId,
    },
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

  await sendFollowUps(kit, ev, userId, outcome, cost, {
    cauHoi: askText,
    thayId: thay.id,
    daMoi: !!addressMaster || hoiChan,
    soTin: session.messages.length + 2,
  });
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
    const [rate, choices, bong] = await Promise.all([vndPerCredit(), topupChoices(), isShadowUser(userId)]);
    // Tài khoản bóng hết Lượng: rất có thể người này ĐÃ có ví trên web ⇒ mời gộp.
    const gop: ChatButton[] = bong ? [{ title: 'Gộp tài khoản web', reply: 'Gộp tài khoản web' }] : [];
    await sendMenu(
      kit.io,
      ev.chatId,
      `Mỗi câu hỏi ${vnd(cost * rate)} (${cost} Lượng) — ví của bạn còn ${balance} Lượng.\n\n` +
        'Nạp ngay tại đây: chọn mức, thầy gửi mã QR, quét bằng app ngân hàng là xong — không phải rời cuộc trò chuyện.' +
        (bong ? '\n\nĐã có tài khoản trên tuviminhbao.com? Bấm "Gộp tài khoản web" để dùng luôn ví đó ở đây.' : ''),
      [...gop, ...choices.slice(0, Math.max(0, kit.maxReplyButtons - gop.length))],
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
async function sendWelcome(kit: ChannelKit, ev: ChannelEvent, userId: string | null, cost: number): Promise<void> {
  const thay = await thayCuaChat(kit.platform, String(ev.chatId));
  const con = userId ? await conCauHoi(userId, cost) : '';
  const bong = userId ? await isShadowUser(userId) : false;
  const vi =
    (con ? `\n\n${con}` : '') +
    (bong ? '\n\nĐã có tài khoản trên tuviminhbao.com? Nhắn "Gộp tài khoản web" để dùng chung ví và sổ lá số.' : '');
  const web = userId ? await createHandoffUrl(userId, '/app/cong-cu') : null;
  await chaoThay(kit, ev, thay);
  await chonThay(kit.platform, String(ev.chatId), thay); // đánh dấu đã chào
  await sendMenu(
    kit.io,
    ev.chatId,
    'Đây là Hỏi Thầy — Tử Vi Minh Bảo.\n\n' +
      'Hỏi thầy bất cứ điều gì về tử vi, vận hạn, tuổi tác, công việc, tình duyên… Để lập lá số, cho thầy biết: ' +
      'giới tính, ngày/tháng/năm sinh (dương lịch) và giờ sinh.\n' +
      'Ví dụ: "Nữ, 03/06/1998, giờ Sửu, năm nay làm ăn sao?"\n\n' +
      'Gửi ảnh khuôn mặt để xem tướng, ảnh nhà cửa để xem phong thủy.\n\n' +
      `Nhóm Minh Bảo có ${THAY_LIST.length} thầy — đổi thầy lúc nào cũng được.` +
      vi,
    [
      { title: 'Đổi thầy', reply: 'Đổi thầy' },
      { title: 'Sổ lá số', reply: 'Sổ lá số' },
      { title: 'Nạp Lượng', reply: 'Nạp Lượng' },
      { title: 'Công cụ', reply: 'Công cụ' },
      ...(web ? [{ title: 'Kho công cụ trên web', url: web }] : []),
    ],
  );
}

/** Thầy tự giới thiệu: chân dung + lời chào + môn chuyên (kênh không gửi
 *  được ảnh thì chỉ chữ). */
async function chaoThay(kit: ChannelKit, ev: ChannelEvent, t: Thay): Promise<void> {
  const loi = await gioiThieuThay(t);
  if (kit.io.sendImage) await kit.io.sendImage(ev.chatId, anhThay(t), loi);
  else await kit.io.sendText(ev.chatId, loi);
}

// ── Gộp tài khoản web (lib/channels/email-link.ts) ─────────────────────
const DA_GOP = 'Tài khoản chat này đã dùng chung với tài khoản web của bạn rồi — ví Lượng và sổ lá số là một.';

async function handleGop(kit: ChannelKit, ev: ChannelEvent, userId: string | null): Promise<void> {
  if (userId && !(await isShadowUser(userId))) {
    await kit.io.sendText(ev.chatId, DA_GOP);
    return;
  }
  await kit.io.sendText(
    ev.chatId,
    'Nhắn email bạn đã dùng trên tuviminhbao.com (đăng ký bằng Google thì là địa chỉ Gmail đó), vd: ten@gmail.com\n\n' +
      'Thầy gửi mã 6 số vào email để xác nhận. Nhắn mã lại đây là xong — Lượng và lá số ở đây gộp về tài khoản web.',
  );
}

async function handleGopEmail(kit: ChannelKit, ev: ChannelEvent, userId: string | null, email: string): Promise<void> {
  if (!userId) {
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  if (!(await isShadowUser(userId))) {
    await kit.io.sendText(ev.chatId, DA_GOP);
    return;
  }
  const r = await startEmailLink(kit.platform, ev.externalId, email);
  if (r === 'limited') {
    await kit.io.sendText(ev.chatId, 'Bạn đã xin mã nhiều lần rồi — thử lại sau khoảng một giờ nhé.');
    return;
  }
  if (r === 'error') {
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  await kit.io.sendText(
    ev.chatId,
    `Nếu ${email} có tài khoản trên tuviminhbao.com, thầy vừa gửi mã 6 số vào đó (xem cả mục Spam/Quảng cáo). ` +
      'Nhắn mã vào đây trong 10 phút để gộp.\n\n' +
      'Không thấy thư? Có thể bạn đăng ký bằng email khác — nhắn email đó thay vào.',
  );
}

async function handleGopMa(kit: ChannelKit, ev: ChannelEvent, code: string, cost: number): Promise<void> {
  const r = await verifyEmailLink(kit.platform, ev.externalId, code);
  if (r.ok) {
    const con = await conCauHoi(r.userId, cost);
    await kit.io.sendText(
      ev.chatId,
      `✅ Đã gộp vào tài khoản web ${maskEmail(r.email)}. Từ giờ ở đây dùng chung ví Lượng và sổ lá số với web.` +
        (con ? `\n\n${con}` : ''),
    );
    return;
  }
  const msg =
    r.reason === 'wrong'
      ? `Mã chưa đúng — còn ${r.left} lần thử.`
      : r.reason === 'locked'
        ? 'Nhập sai quá nhiều lần. Nhắn lại email để lấy mã mới nhé.'
        : r.reason === 'expired'
          ? 'Mã đã hết hạn. Nhắn lại email để lấy mã mới nhé.'
          : ERR_MSG;
  await kit.io.sendText(ev.chatId, msg);
}

// ── Nhóm thầy ──────────────────────────────────────────────────────────
async function handleThay(kit: ChannelKit, ev: ChannelEvent, arg: string): Promise<void> {
  const hienTai = await thayCuaChat(kit.platform, String(ev.chatId));
  if (arg) {
    const moi = timThay(arg);
    if (moi) {
      const ok = await chonThay(kit.platform, String(ev.chatId), moi);
      if (!ok) {
        await kit.io.sendText(ev.chatId, ERR_MSG);
        return;
      }
      await chaoThay(kit, ev, moi);
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
      `${dong.join('\n')}\n\nĐổi thầy: bấm tên bên dưới, hoặc nhắn "đổi thầy <số>", vd "đổi thầy 3".`,
    khac.slice(0, kit.maxReplyButtons).map(({ x }) => ({ title: `Thầy ${x.name}`, reply: `Chọn Thầy ${x.name}` })),
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
  cost: number,
  luot: { cauHoi: string; thayId: string; daMoi: boolean; soTin: number },
): Promise<void> {
  const links: ChatButton[] = [];
  // Link sang web chỉ khi có tài khoản — đăng nhập sẵn + đúng lá số.
  if (userId && outcome.toolSuggest?.path) {
    const url = await createHandoffUrl(userId, outcome.toolSuggest.path, outcome.birth);
    if (url) links.push({ title: outcome.toolSuggest.label, url });
  }
  // Bản luận giải đầy đủ (trang báo cáo trên web, trả bằng CÙNG ví): mời lúc
  // vừa lập lá số, rồi nhắc lại mỗi ~3 lượt hỏi — không phải lượt nào cũng mời.
  if (userId && outcome.birth && (outcome.lasoShown || luot.soTin % 6 === 0)) {
    const url = await createHandoffUrl(userId, lasoPath(outcome.birth), outcome.birth);
    if (url) links.push({ title: await nhanLuanGiai(), url });
  }
  // Mời thầy khác: thầy khách hợp câu hỏi (cùng luật web) + hội chẩn khi là
  // quyết định lớn. Lượt vừa mời rồi thì thôi, chỉ để lối đổi thầy.
  const moi: ChatButton[] = [];
  if (outcome.birth && !luot.daMoi) {
    const g = pickGuests(luot.cauHoi, luot.thayId, outcome.birth, 1)[0];
    if (g) moi.push({ title: `Ý Thầy ${g.ten}`, reply: moiCau(g) });
    if (hoiChanDuoc(luot.cauHoi, luot.thayId)) moi.push({ title: 'Mời 3 thầy hội chẩn', reply: 'Mời 3 thầy hội chẩn' });
  }
  if (!moi.length) moi.push({ title: 'Hỏi ý thầy khác', reply: 'Hỏi ý thầy khác' });
  const room = Math.max(0, Math.min(kit.maxReplyButtons, 5) - links.length - moi.length);
  const goiY: ChatButton[] = outcome.suggestions.slice(0, Math.min(room, 3)).map((q) => ({ title: q, reply: q }));
  const head = outcome.toolSuggest?.lyDo || 'Bạn muốn hỏi tiếp gì?';
  const con = userId ? await conCauHoi(userId, cost) : '';
  await sendMenu(kit.io, ev.chatId, con ? `${head}\n\n${con}` : head, [...links, ...moi, ...goiY]);
}

/** Nhãn nút bản luận giải đầy đủ — giá VNĐ là chính (luật "VNĐ là giá CHÍNH"),
 *  đọc từ `tool_pricing['laso']`; đọc hụt thì không ghi giá (không chép số). */
async function nhanLuanGiai(): Promise<string> {
  const [credits, rate] = await Promise.all([getToolPrice('laso'), vndPerCredit()]);
  return credits && credits > 0 ? `Luận giải ${vnd(credits * rate)}` : 'Luận giải đầy đủ';
}

// ── Menu công cụ (nhóm + công cụ đọc từ DB, mở web đã đăng nhập) ────────
async function handleCongCu(kit: ChannelKit, ev: ChannelEvent, userId: string | null, arg: string): Promise<void> {
  const groups = await toolCatalog();
  const khoWeb = userId ? await createHandoffUrl(userId, '/app/cong-cu') : null;
  const tatCa: ChatButton = { title: 'Xem tất cả trên web', url: khoWeb || `${SITE}/app/cong-cu` };
  // Nút gửi "Công cụ: <tên nhóm>"; "/congcu <số>" của nút cũ vẫn nhận.
  const i = Number(arg) - 1;
  const g =
    (arg && groups.find((x) => x.title.toLowerCase() === arg)) || (Number.isInteger(i) && i >= 0 ? groups[i] : undefined);
  if (!g) {
    if (!groups.length) return sendMenu(kit.io, ev.chatId, 'Kho công cụ của Tử Vi Minh Bảo:', [tatCa]).then(() => {});
    await sendMenu(
      kit.io,
      ev.chatId,
      'Bạn muốn xem về việc gì? Chọn một nhóm — hoặc cứ hỏi thẳng thầy, thầy tự chọn công cụ hợp.',
      [
        ...groups.slice(0, Math.max(1, kit.maxReplyButtons - 1)).map((x) => ({
          title: x.title,
          reply: `Công cụ: ${x.title}`,
        })),
        tatCa,
      ],
    );
    return;
  }
  const tools = g.tools.slice(0, 4);
  const btns: ChatButton[] = [];
  for (const t of tools) {
    const url = userId ? await createHandoffUrl(userId, t.path) : null;
    btns.push({ title: t.label, url: url || `${SITE}${t.path}` });
  }
  await sendMenu(
    kit.io,
    ev.chatId,
    `${g.title}:\n${tools.map((t) => `• ${t.label}`).join('\n')}\n\nBấm để mở — đã đăng nhập sẵn, đúng lá số của bạn.`,
    [...btns, ...(g.tools.length > tools.length ? [tatCa] : [])],
  );
}

/**
 * "Còn N câu hỏi (M lượt tặng)" — cùng công thức đồng hồ rail web
 * (`public/shell.js`: lượt tặng + floor(số dư / giá mỗi câu)). Đọc SAU khi
 * lượt vừa rồi đã chốt phí. Rỗng khi miễn phí (paywall tắt/giá 0).
 */
async function conCauHoi(userId: string, cost: number): Promise<string> {
  if (paywallDisabled() || cost <= 0) return '';
  const [free, balance] = await Promise.all([railFreeRemaining(userId), getBalance(userId)]);
  const n = free + Math.floor(balance / cost);
  if (n <= 0) return `Bạn đã dùng hết câu hỏi — nhắn "Nạp Lượng" để nạp ngay tại đây.`;
  return `Còn ${n} câu hỏi${free > 0 ? ` (${free} lượt tặng)` : ''}.`;
}
