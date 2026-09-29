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

import { messageHasNewBirth, runConversation, type ChannelIO, type ChatButton, type ProfileStore, type SessionStore } from './core';
import { buildAccessGate } from './gate';
import { sendMenu } from './format';
import { chatConsumeLinkToken, chatGetAuthor, chatLogEvent, chatLogOutcome, chatLoadMeta, chatLoadSession, chatPatchMeta, chatSetAuthor, type ChatMeta } from './store';
import { ensureChatUser } from './account';
import { accountProfiles, saveChart } from './charts';
import { createHandoffUrl, lasoPath } from './handoff';
import { chartImageUrl, type ChartKind } from '@/lib/og/laso-image';
import type { BirthParams } from '@/lib/contract/v1';
import { listPaidReports, paidReportPdf } from '@/lib/pdf/paid-reports';
import { currentNamXem } from '@/lib/engine/namxem';
import { computeLaso } from '@/lib/engine/laso';
import { todayVN } from '@/lib/engine/van-ngay';
import { claimLoginCode, parseLoginCode } from './login';
import { GOP_CMD, isShadowUser, maskEmail, parseEmail, startEmailLink, verifyEmailLink, hasPendingEmailLink } from './email-link';
import { TOPUP_CMD, createChatTopup, parseTopup, topupCaption, topupChoices, vietQrImageUrl } from './topup';
import { GUESTS, detectMention, guestById, guestFromMoi, moiCau, type GuestId } from './guests';
import { KHOANG_GOI_Y, LOI_LA_SO, SAN_PHAM_MON, chonTinhNang, dangDau, loiMon, nhanLuanGiai, nhanMon } from './goi-y';
import { cacChuDe, cungChuDe } from '@/lib/agent/luan-chu-de';
import { THAY_LIST, anhThay, chonThay, gioiThieuThay, thayCuaChat, timThay, type Thay } from './author';
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

// Lệnh = CÂU TIẾNG VIỆT mà nút gửi đi: Zalo hiện nguyên chữ `reply` thành tin
// của khách, Telegram in nó lên bàn phím — khách không bao giờ phải gõ "/".
// Dạng "/…" chỉ còn là bí danh cho nút cũ nằm trong lịch sử chat.
const CMD = {
  menu: ['/start', '/help', '/menu', 'menu'],
  moi: ['/new', '/reset', 'trò chuyện mới'],
  thay: ['đổi thầy', 'chọn thầy', '/thay'],
  thayKhac: 'hỏi ý thầy khác',
  laso: ['sổ lá số', '/laso', '/so'],
  bieuDo: ['biểu đồ', 'bieu do', 'xem biểu đồ'],
  pdf: ['nhận bản pdf', 'bản pdf', 'gửi pdf', 'nhận pdf', 'pdf', 'file pdf'],
  web: ['/web', 'mở trên web'],
  link: '/link',
  moiThay: '/moi',
  hoiChan: ['mời 3 thầy hội chẩn', '/hoichan'],
  congCu: ['công cụ', 'cong cu', '/congcu'],
  congCuNhom: 'công cụ:',
  nap: ['nạp lượng', 'nạp tiền', TOPUP_CMD],
  tatNhac: ['tắt nhắc', 'tat nhac', '/tatnhac'],
  batNhac: ['bật nhắc', 'bat nhac', '/batnhac'],
  deSau: ['để sau', 'de sau'],
};
/**
 * Việc thầy làm được NGAY TRONG CHAT (tool của runAgent) — nguồn cho nút chủ đề
 * sau lời chào và menu "Công cụ". Không link sang web: rời chat là mất khách.
 * `cau` = câu gửi thầy khi bấm; `huongDan` = việc cần ẢNH, trả lời hướng dẫn và
 * không gọi thầy; `khongCanLaSo` = hỏi được khi chưa có ngày sinh (Lục Nhâm).
 * Bấm việc cần lá số khi phiên CHƯA có ⇒ xin ngày giờ sinh (miễn phí, không gọi
 * thầy), lượt khách gửi ngày sinh thì ghép lại câu của việc đó.
 */
interface ViecChat {
  title: string;
  cau?: string;
  huongDan?: string;
  khongCanLaSo?: boolean;
}
const CHU_DE_MO: ViecChat[] = [
  { title: 'Tổng quan lá số', cau: 'Thầy luận giải tổng quan lá số Tử Vi của tôi.' },
  { title: 'Vận hạn năm nay', cau: 'Vận hạn năm nay của tôi thế nào?' },
  { title: 'Tình duyên', cau: 'Chuyện tình duyên, hôn nhân của tôi thế nào?' },
  { title: 'Sự nghiệp, tiền bạc', cau: 'Sự nghiệp và tiền bạc của tôi thế nào?' },
  { title: 'Sức khỏe, gia đạo', cau: 'Sức khỏe và gia đạo của tôi cần lưu ý gì?' },
];
const CONG_CU_CHAT: ViecChat[] = [
  { title: 'Luận giải lá số', cau: 'Thầy luận giải tổng quan lá số Tử Vi của tôi.' },
  { title: 'Vận hạn năm nay', cau: 'Vận hạn năm nay của tôi thế nào?' },
  { title: 'Xem ngày tốt', cau: 'Tôi cần chọn ngày tốt để làm một việc quan trọng, thầy xem giúp.' },
  {
    title: 'Hỏi việc đang phân vân',
    cau: 'Tôi đang phân vân một việc, thầy gieo quẻ xem giúp nên hay không.',
    khongCanLaSo: true,
  },
  {
    title: 'Xem tướng qua ảnh',
    huongDan: 'Con gửi một ảnh chân dung rõ mặt, nhìn thẳng, đủ sáng — ta xem tướng cho.',
  },
  { title: 'Vận tháng này', cau: 'Tháng này của tôi thế nào, ngày nào cần lưu ý?' },
  {
    title: 'Phong thủy nhà ở',
    huongDan: 'Con gửi ảnh chỗ cần xem (cửa chính, phòng khách, phòng ngủ, bàn làm việc…) — ta xem phong thủy cho.',
  },
];
const VIEC_CHAT = [...CHU_DE_MO, ...CONG_CU_CHAT];
/** Tạm TẮT mọi nút link sang web (gợi ý công cụ web, bản luận giải, mở sổ trên
 *  web) — rời app chat là mất khách (Henry chốt 2026-09-29). Bật lại: true. */
const NUT_WEB = false;
const timViec = (s: string) => VIEC_CHAT.find((v) => v.title.toLowerCase() === s.trim().toLowerCase());
const HOI_NGAY_SINH =
  'Để luận cho đúng, con cho ta xin: giới tính, ngày/tháng/năm sinh (dương lịch) và giờ sinh.\n' +
  'Ví dụ: "Nam, 09/05/1984, giờ Tý". Không nhớ giờ sinh thì cứ nói "không rõ giờ".';

/** "nạp 100k" / "nạp 200.000đ" (nút nạp gửi đúng dạng này) → phần số tiền. */
const NAP_SO_RE = /^(?:nạp|\/nap)\s+(\S.*)$/;

export async function handleChannelEvent(kit: ChannelKit, ev: ChannelEvent, cfg: ChatConfig): Promise<void> {
  const { io } = kit;
  let text = (ev.text || '').trim();
  let t = norm(text);
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
  // Trạng thái nút gợi ý + tin nhắc của phiên (null = chưa chạy migration-chat-nudge).
  const meta = await chatLoadMeta(kit.platform, ev.chatId);
  void ghiNhanTin(kit, ev, meta, t);

  // ── Tin nhắc chủ động (cron chat-nudge) — lệnh không tốn lượt ─────────
  if (CMD.tatNhac.includes(t) || CMD.batNhac.includes(t)) {
    const tat = CMD.tatNhac.includes(t);
    await chatPatchMeta(kit.platform, ev.chatId, tat ? { nudge_off: true } : { nudge_off: false, nudge_miss: 0 });
    await io.sendText(
      ev.chatId,
      tat ? 'Đã tắt tin nhắc. Muốn bật lại thì nhắn "Bật nhắc" nhé.' : 'Đã bật lại tin nhắc — thỉnh thoảng thầy nhắn hỏi thăm bạn.',
    );
    return;
  }
  if (CMD.deSau.includes(t)) {
    await io.sendText(ev.chatId, 'Ừ, lúc nào cần cứ nhắn thầy nhé.');
    return;
  }

  // ── Trả lời câu "câu này cho ai?" khi khách quay lại (hoiLaiKhiQuayLai) ──
  // Câu khách hỏi lúc quay lại được giữ ở goi_y.cho; chọn xong thì trả lời ĐÚNG câu đó.
  const cho = meta?.goiY?.cho;
  let traLoiCho = false;
  if (cho && t === norm(QUAY_LAI.tiep)) {
    text = cho;
    traLoiCho = true;
  } else if (cho && t.startsWith(norm(QUAY_LAI.laSo))) {
    const ten = text.slice(QUAY_LAI.laSo.length).trim();
    const p = await (userId ? accountProfiles(userId, kit.profiles) : kit.profiles).get(ev.chatId, ten);
    if (p) {
      // Người khác ⇒ hội thoại mới trên lá số đã lưu (giữ thầy đang tiếp chuyện).
      await kit.store.save(ev.chatId, [], p.birth);
      text = cho;
      traLoiCho = true;
    }
  } else if (cho && t === norm(QUAY_LAI.moi)) {
    // Xoá hẳn lá số cũ khỏi phiên (lưu `null` thì chatSaveSession GIỮ lá số cũ ⇒ tin sau
    // chưa kèm ngày sinh sẽ bị luận nhầm người), rồi trả lại thầy + câu đang giữ.
    const thayCu = await chatGetAuthor(kit.platform, String(ev.chatId));
    await kit.clearSession(ev.chatId);
    if (thayCu) await chatSetAuthor(kit.platform, String(ev.chatId), thayCu);
    await chatPatchMeta(kit.platform, ev.chatId, { goi_y: { cho } });
    await io.sendText(
      ev.chatId,
      'Được. Cho thầy giới tính, ngày tháng năm sinh (dương hay âm lịch) và giờ sinh của người đó — thầy lập lá số rồi trả lời luôn câu bạn vừa hỏi.',
    );
    return;
  } else if (cho && messageHasNewBirth(text)) {
    // Chọn "người mới" rồi gửi ngày sinh (hoặc gửi thẳng ngày sinh) ⇒ ghép câu đã giữ.
    text = `${text}\n${cho}`;
    traLoiCho = true;
  }
  t = norm(text);

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

  // Ảnh biểu đồ (engine, không tốn LLM ⇒ không tính phí): nút gửi đúng tên biểu đồ.
  // Bản PDF luận giải ĐÃ MUA (lib/pdf/paid-reports.ts). Nút chọn bản gửi "PDF 2: …".
  if (CMD.pdf.includes(t)) return handlePdf(kit, ev, userId, null);
  const pdfSo = t.match(/^pdf (\d+)(:|$)/)?.[1];
  if (pdfSo) return handlePdf(kit, ev, userId, Number(pdfSo) - 1);

  const cungLenh = cungTuLenh(t);
  if (cungLenh || t === XEM_TUNG_CUNG.toLowerCase() || t === 'từng cung') return handleCung(kit, ev, cungLenh);
  const bieuDo = BIEU_DO.find((b) => b.cau.includes(t));
  if (bieuDo || CMD.bieuDo.includes(t)) return handleBieuDo(kit, ev, bieuDo ?? null);

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
  if (CMD.congCu.includes(t) || t.startsWith(CMD.congCuNhom) || t.startsWith('/congcu ')) {
    return handleCongCu(kit, ev);
  }

  // ── Mời thầy khác / hội chẩn (engine `addressMaster`/`hoiChan` của web) ──
  // Nút gửi "Mời Thầy <tên> cùng xem" / "Mời 3 thầy hội chẩn" ⇒ hỏi lại CHÍNH câu
  // vừa hỏi, lần này có thầy khách/nhóm cùng xem. Gõ "@Tâm Kính …" thì như web:
  // mời ngay trong câu.
  const session = await kit.store.load(ev.chatId);

  let askText = text;
  const viec = hasImage ? undefined : timViec(text);
  if (viec?.huongDan) {
    await io.sendText(ev.chatId, viec.huongDan);
    return;
  }
  if (viec?.cau) {
    if (!session.birth && !viec.khongCanLaSo) {
      await io.sendText(ev.chatId, HOI_NGAY_SINH);
      await kit.store.save(
        ev.chatId,
        [...session.messages, { role: 'user', content: viec.title }, { role: 'assistant', content: HOI_NGAY_SINH }],
        null,
      );
      return;
    }
    askText = viec.cau;
  }
  // Lượt ngay sau khi xin ngày sinh cho một việc: ghép câu của việc đó vào. Không
  // trông vào lịch sử — tin có ngày sinh mới làm core bỏ lịch sử (người mới).
  const [truocDo, vuaHoi] = session.messages.slice(-2);
  if (!viec && !session.birth && vuaHoi?.content === HOI_NGAY_SINH && typeof truocDo?.content === 'string') {
    const cho = timViec(truocDo.content);
    if (cho?.cau) askText = `${text}\n${cho.cau}`;
  }
  let addressMaster: GuestId | undefined;
  let hoiChan = false;
  const laHoiChan = CMD.hoiChan.includes(t);
  const khach = guestFromMoi(t);
  // Khách quay lại sau lâu vắng mà phiên cũ đang xem một lá số ⇒ hỏi "câu này cho ai?"
  // trước khi trả lời (Henry 2026-09-29) — không thì câu "năm nay tôi thế nào" của người
  // mẹ bị luận trên lá số đứa con xem từ hôm qua. Chỉ hỏi MỘT lần (đã có `cho` thì thôi),
  // bỏ qua khi tin đã kèm ngày sinh mới (core tự hiểu là người mới) hoặc là nút mời thầy.
  if (
    !traLoiCho &&
    !cho &&
    !laHoiChan &&
    !khach &&
    !hasImage &&
    session.birth &&
    session.messages.length > 0 &&
    meta?.updatedAt &&
    Date.now() - Date.parse(meta.updatedAt) > QUAY_LAI.sauMs &&
    !messageHasNewBirth(text) &&
    (await hoiLaiKhiQuayLai(kit, ev, userId, meta, session.birth, text))
  )
    return;
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

  await sendFollowUps(kit, ev, userId, outcome, cost, meta, {
    cauHoi: askText,
    thayId: thay.id,
    daMoi: !!addressMaster || hoiChan,
    khach: addressMaster,
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
  // Đã mua bản luận giải nào → thêm nút nhận PDF ngay trong chat.
  const coPdf = !!userId && !!kit.io.sendFile && (await listPaidReports(userId)).length > 0;
  await chaoThay(kit, ev, thay);
  await chonThay(kit.platform, String(ev.chatId), thay); // đánh dấu đã chào
  // Kênh nhiều chỗ nút thì thêm các lối tiện ích sau nút chủ đề; Zalo (5 nút)
  // chỉ còn chủ đề — tiện ích đã nằm ở menu OA.
  await hoiVanDe(kit, ev, vi, [
    { title: 'Đổi thầy', reply: 'Đổi thầy' },
    { title: 'Sổ lá số', reply: 'Sổ lá số' },
    { title: 'Nạp Lượng', reply: 'Nạp Lượng' },
    { title: 'Công cụ', reply: 'Công cụ' },
    ...(coPdf ? [{ title: 'Bản PDF', reply: 'Bản PDF' }] : []),
  ]);
}

/** Sau lời chào: hỏi khách đang băn khoăn chuyện gì (nút chủ đề). Ngày giờ sinh
 *  xin SAU, khi khách đã chọn — xem `timViec` trong handleChannelEvent. */
async function hoiVanDe(kit: ChannelKit, ev: ChannelEvent, them = '', nutThem: ChatButton[] = []): Promise<void> {
  const session = await kit.store.load(ev.chatId);
  await sendMenu(
    kit.io,
    ev.chatId,
    (session.birth
      ? 'Con muốn hỏi thêm chuyện gì? Chọn bên dưới hoặc cứ nhắn thẳng cho ta.'
      : 'Con đang băn khoăn chuyện gì — công việc, tiền bạc, tình duyên, sức khỏe hay vận năm nay? Chọn bên dưới hoặc cứ kể thẳng cho ta.') +
      them,
    [...CHU_DE_MO.map((v) => ({ title: v.title, reply: v.title })), ...nutThem],
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
      await hoiVanDe(kit, ev);
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
  const web = NUT_WEB && userId ? await createHandoffUrl(userId, '/app/so-la-so') : null;
  const webBtn: ChatButton[] = web ? [{ title: 'Mở sổ trên web', url: web }] : [];
  if (!list.length) {
    await sendMenu(
      kit.io,
      ev.chatId,
      'Sổ lá số của bạn đang trống. Lập một lá số rồi nhờ thầy lưu kèm tên (vd "lưu lá số này tên anh Tony") — lần sau nhắn "xem lá số Tony" là mở lại.',
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

// ── Khách quay lại sau lâu vắng ──────────────────────────────────────
const QUAY_LAI = {
  /** Vắng quá bấy nhiêu thì hỏi lại "câu này cho ai?". */
  sauMs: 3 * 3600_000,
  // Câu nút gửi đi (khách thấy thành tin của mình).
  tiep: 'Tiếp lá số lần trước',
  laSo: 'Hỏi cho lá số: ',
  moi: 'Xem cho người mới',
};

const moTaLaSo = (b: BirthParams) => {
  const ngay = `${b.gender === 'nu' ? 'Nữ' : 'Nam'} ${b.day}/${b.month}/${b.year}${b.isLunar ? ' ÂL' : ''}`;
  return String(b.name || '').trim() ? `${String(b.name).trim()} (${ngay})` : ngay;
};
const cungLaSo = (a: BirthParams, b: BirthParams) =>
  a.day === b.day && a.month === b.month && a.year === b.year && a.gender === b.gender && !!a.isLunar === !!b.isLunar;

/** Giữ câu vừa hỏi rồi hỏi lại khách đang hỏi cho ai. false = không giữ được câu (lỗi ghi) ⇒
 *  caller trả lời bình thường, thà trả lời trên lá số cũ còn hơn làm mất câu hỏi. */
async function hoiLaiKhiQuayLai(
  kit: ChannelKit,
  ev: ChannelEvent,
  userId: string | null,
  meta: ChatMeta,
  birth: BirthParams,
  cau: string,
): Promise<boolean> {
  const ok = await chatPatchMeta(kit.platform, ev.chatId, { goi_y: { ...(meta.goiY || {}), cho: cau } });
  if (!ok) return false;
  const ds = await (userId ? accountProfiles(userId, kit.profiles) : kit.profiles).list(ev.chatId).catch((e) => {
    console.error('[channel-router] đọc sổ lá số lỗi', e);
    return [];
  });
  const max = Math.min(kit.maxReplyButtons, 5);
  const khac = ds.filter((p) => String(p.name || '').trim() && !cungLaSo(p.birth, birth)).slice(0, Math.max(0, max - 2));
  await sendMenu(kit.io, ev.chatId, `Chào lại bạn! Lần trước mình đang xem lá số ${moTaLaSo(birth)}. Câu này bạn hỏi cho ai?`, [
    { title: `Tiếp lá số ${moTaLaSo(birth)}`, reply: QUAY_LAI.tiep },
    ...khac.map((p) => ({ title: `Lá số ${p.name}`, reply: `${QUAY_LAI.laSo}${p.name}` })),
    { title: QUAY_LAI.moi, reply: QUAY_LAI.moi },
  ]);
  return true;
}

// ── Gợi ý sau câu trả lời (lib/channels/goi-y.ts) ─────────────────────
// Mặc định KHÔNG gửi gì thêm: cuối câu trả lời thầy đã tự hỏi lại, chip câu hỏi
// mỗi lượt làm tin loãng (Henry 2026-09-29). Sản phẩm CHỈ lúc vừa an lá số / vừa
// chọn kiểm chứng bằng môn khác; ngoài ra cách ≥ `KHOANG_GOI_Y` lượt mới mời MỘT
// tính năng hợp ngữ cảnh.
// "Còn N câu" chỉ hiện khi sắp hết (loiConCau).
async function sendFollowUps(
  kit: ChannelKit,
  ev: ChannelEvent,
  userId: string | null,
  outcome: NonNullable<Awaited<ReturnType<typeof runConversation>>>,
  cost: number,
  meta: ChatMeta | null,
  luot: { cauHoi: string; thayId: string; daMoi: boolean; khach?: GuestId },
): Promise<void> {
  const gy = meta?.goiY || {};
  const n = (gy.n || 0) + 1;
  const dem = userId ? await demCau(userId, cost) : null;
  const con = dem ? loiConCau(dem) : '';
  const denLuot = n - (gy.g || 0) >= KHOANG_GOI_Y;

  // Sản phẩm — CHỈ lượt vừa an xong lá số, hoặc lượt khách vừa chọn kiểm chứng
  // bằng môn khác (goi-y.ts). Link web có lá số điền sẵn, bất kể `NUT_WEB`.
  let sanPham: ChatButton | null = null;
  let loiSp = '';
  let spId: string | null = null;
  if (userId && outcome.birth && !dangDau(luot.cauHoi)) {
    const g = luot.khach ? guestById(luot.khach) : null;
    const mon = luot.khach ? SAN_PHAM_MON[luot.khach] : undefined;
    if (g && mon) {
      const url = await createHandoffUrl(userId, mon.path, outcome.birth);
      if (url) {
        sanPham = { title: mon.title, url };
        loiSp = loiMon(g.mon);
        spId = `mon:${g.id}`;
      }
    } else if (!luot.khach && outcome.lasoShown) {
      const url = await createHandoffUrl(userId, lasoPath(outcome.birth), outcome.birth);
      if (url) {
        sanPham = { title: await nhanLuanGiai(), url };
        loiSp = LOI_LA_SO;
        spId = 'luan-giai';
      }
    }
  }

  // Tính năng. Thẻ công cụ model tự gợi ý (goi_y_cong_cu) thắng: nó đã đọc cả
  // câu trả lời; không có thì chọn theo ngữ cảnh câu hỏi.
  let tinhNang: ChatButton | null = null;
  let tnId: string | undefined;
  if (denLuot && !sanPham) {
    if (NUT_WEB && userId && outcome.toolSuggest?.path) {
      const url = await createHandoffUrl(userId, outcome.toolSuggest.path, outcome.birth);
      if (url) {
        tinhNang = { title: outcome.toolSuggest.label, url };
        tnId = `cong-cu:${outcome.toolSuggest.toolId}`;
      }
    }
    if (!tinhNang) {
      const tn = chonTinhNang({
        cauHoi: luot.cauHoi,
        thayId: luot.thayId,
        birth: outcome.birth,
        daMoi: luot.daMoi,
        truoc: gy.tn,
        bieuDo: bieuDoHop(luot.cauHoi, outcome.lasoShown),
      });
      if (tn && 'path' in tn.nut) {
        if (NUT_WEB) {
          const url = userId ? await createHandoffUrl(userId, tn.nut.path, outcome.birth) : `${SITE}${tn.nut.path}`;
          if (url) tinhNang = { title: tn.nut.title, url };
        }
      } else if (tn && 'reply' in tn.nut) tinhNang = tn.nut;
      if (tinhNang) tnId = tn?.id;
    }
  }

  const nutMoi = sanPham || tinhNang;
  if (nutMoi) {
    const head =
      loiSp ||
      (tnId?.startsWith('cong-cu:') && outcome.toolSuggest?.lyDo) ||
      'Muốn xem thêm từ góc khác thì bấm nút dưới.';
    await sendMenu(kit.io, ev.chatId, con ? `${head}\n\n${con}` : head, [nutMoi]);
  } else if (con) await kit.io.sendText(ev.chatId, con);

  // Nhớ cho lượt sau: lượt vừa mời (giãn cách), nút tính năng vừa hiện (không
  // lặp), và nút TRẢ LỜI vừa gửi (nút link không gửi chữ về nên không đếm được bấm).
  const nut = tinhNang && 'reply' in tinhNang ? [{ t: norm(tinhNang.reply), k: `tinh-nang:${tnId}` }] : [];
  void chatPatchMeta(kit.platform, ev.chatId, {
    goi_y: { n, g: nutMoi ? n : gy.g, sp: sanPham ? n : gy.sp, tn: tnId ?? gy.tn, nut },
  });
  if (nutMoi)
    void chatLogEvent(kit.platform, ev.chatId, 'chat_goi_y', {
      action: 'show',
      tinh_nang: tnId || null,
      san_pham: spId,
    });
}

/** Chủ đề của một câu hỏi — lỗi thì coi như không rõ chủ đề (không chặn lượt trả lời). */
function chuDeCua(q: string): string[] {
  try {
    return cacChuDe(q);
  } catch (e) {
    console.error('[channel-router] cacChuDe lỗi', e);
    return [];
  }
}

/** Tin vừa tới là BẤM một nút gợi ý lượt trước? → ghi lượt bấm theo tầng. Và
 *  khách trả lời trong 48h sau tin nhắc → xoá đếm "bị lờ" (lib/channels/nudge.ts). */
async function ghiNhanTin(kit: ChannelKit, ev: ChannelEvent, meta: ChatMeta | null, t: string): Promise<void> {
  if (!meta) return;
  const bam = meta.goiY?.nut?.find((x) => x.t === t);
  if (bam) await chatLogEvent(kit.platform, ev.chatId, 'chat_goi_y', { action: 'click', kind: bam.k });
  if (meta.nudgedAt && meta.nudgeMiss > 0 && Date.now() - Date.parse(meta.nudgedAt) < 48 * 3600_000) {
    await chatPatchMeta(kit.platform, ev.chatId, { nudge_miss: 0 });
    await chatLogEvent(kit.platform, ev.chatId, 'chat_nudge', { action: 'reply' });
  }
}

// ── Menu công cụ: CHỈ việc thầy làm được ngay trong chat (CONG_CU_CHAT) ──
// Không liệt kê công cụ web: bấm là rời app chat, mất khách (Henry chốt
// 2026-09-29). Nút cũ "Công cụ: <nhóm>" trong lịch sử chat cũng về đây.
async function handleCongCu(kit: ChannelKit, ev: ChannelEvent): Promise<void> {
  const vua = CONG_CU_CHAT.slice(0, kit.maxReplyButtons);
  const con = CONG_CU_CHAT.slice(vua.length);
  await sendMenu(
    kit.io,
    ev.chatId,
    'Việc thầy làm được ngay tại đây — chọn một, hoặc cứ hỏi thẳng:' +
      (con.length ? `\n\nNgoài ra: ${con.map((v) => v.title.toLowerCase()).join(', ')} — nhắn đúng tên việc đó.` : ''),
    vua.map((v) => ({ title: v.title, reply: v.title })),
  );
}

// ── Bản PDF luận giải đã mua (lib/pdf/paid-reports.ts) ──────────────────
// Chỉ gửi bản đã trả tiền, chỉ các phần đã mua. Chưa mua gì → mời mua trên web.
async function handlePdf(kit: ChannelKit, ev: ChannelEvent, userId: string | null, idx: number | null): Promise<void> {
  const { io } = kit;
  if (!userId || !io.sendFile) {
    await io.sendText(ev.chatId, `Bạn xem và tải bản PDF luận giải tại ${SITE}/app/bao-cao nhé.`);
    return;
  }
  const list = await listPaidReports(userId);
  if (!list.length) {
    const session = await kit.store.load(ev.chatId);
    const url = await createHandoffUrl(userId, lasoPath(session.birth), session.birth);
    await sendMenu(
      io,
      ev.chatId,
      'Bạn chưa có bản luận giải nào đã mua. Mua bản luận giải đầy đủ trên web (trả bằng cùng ví Lượng), xong nhắn "bản PDF" là thầy gửi file vào đây.',
      url ? [{ title: await nhanLuanGiai(), url }] : [],
    );
    return;
  }
  if (idx == null && list.length > 1) {
    await sendMenu(
      io,
      ev.chatId,
      'Bạn muốn nhận bản nào?',
      list.slice(0, Math.min(kit.maxReplyButtons, 8)).map((r, i) => ({ title: `PDF ${i + 1}: ${r.label}`, reply: `PDF ${i + 1}: ${r.label}` })),
    );
    return;
  }
  const r = list[idx ?? 0];
  if (!r) {
    await io.sendText(ev.chatId, 'Không tìm thấy bản đó — nhắn "bản PDF" để xem lại danh sách nhé.');
    return;
  }
  await io.sendText(ev.chatId, `Thầy đang in bản PDF ${r.label}…`);
  try {
    const pdf = await paidReportPdf(r);
    await io.sendFile(ev.chatId, pdf.data, pdf.filename, `Bản PDF ${r.label} — lưu lại để đọc dần nhé.`);
  } catch (e) {
    console.error('[channel-router] gửi PDF lỗi', kit.platform, r.slug, e);
    const url = await createHandoffUrl(userId, '/app/bao-cao');
    await sendMenu(io, ev.chatId, 'Chưa gửi được file vào đây. Bạn mở bản đầy đủ trên web nhé:', [
      { title: 'Mở báo cáo', url: url || `${SITE}/app/bao-cao` },
    ]);
  }
}

// ── Ảnh biểu đồ (lib/og/laso-image.ts + app/api/og/<kind>) ──────────────
// Tên nút = câu khách gửi đi (không lộ "/"); nhận cả vài cách gõ tay thường gặp.
const BIEU_DO: { kind: ChartKind; nut: string; cau: string[]; loi: string; thay?: GuestId }[] = [
  {
    kind: 'duong-doi',
    nut: 'Xem đường đời',
    cau: ['xem đường đời', 'đường đời', 'biểu đồ đường đời'],
    loi: 'Đường đời qua 9 đại vận của bạn — chấm là điểm từng đại vận, dải vàng là đại vận đang đi. Muốn thầy luận giai đoạn nào, cứ hỏi.',
  },
  {
    kind: 'radar-cung',
    nut: 'Điểm mạnh yếu',
    cau: ['điểm mạnh yếu', 'điểm mạnh yếu 12 cung', 'mạnh yếu 12 cung'],
    loi: 'Điểm mạnh yếu của 12 cung trong lá số — trục nào càng xa tâm, cung đó càng vượng. Hỏi thầy về cung nào cũng được.',
  },
  {
    kind: 'van-12-thang',
    nut: 'Vận 12 tháng',
    cau: ['vận 12 tháng', 'vận 12 tháng tới', 'xem vận 12 tháng'],
    loi: '12 tháng âm tới của bạn — mỗi dòng là cung nguyệt hạn cùng sao cát, sao sát của tháng đó. Nhờ thầy luận tháng nào thì nhắn tháng đó.',
  },
  {
    kind: 'van-ngay',
    nut: 'Vận hôm nay',
    cau: ['vận hôm nay', 'vận ngày', 'xem vận hôm nay', 'hôm nay thế nào'],
    loi: 'Vận hôm nay theo lá số của bạn — tính chất ngày, cung nhật hạn, giờ hoàng đạo, và 7 ngày tới (viền đỏ là ngày xung tuổi).',
  },
  {
    kind: 'dai-van',
    nut: 'Chi tiết đại vận',
    cau: ['chi tiết đại vận', 'điểm đại vận', 'chấm điểm đại vận', 'bảng đại vận'],
    loi: 'Chín đại vận của bạn — mỗi vận 10 năm chấm theo Thiên Thời, Địa Lợi, Nhân Hòa; nền vàng là vận đang đi. Muốn thầy luận vận nào, cứ nhắn tuổi đó.',
  },
  {
    kind: 'tu-tru',
    nut: 'Lá số Bát Tự',
    cau: ['lá số bát tự', 'bát tự', 'tứ trụ', 'xem tứ trụ', 'lá số tứ trụ'],
    loi: 'Tứ trụ Bát Tự của bạn — can chi năm, tháng, ngày, giờ; cột Ngày là Nhật chủ.',
    thay: 'tam-kinh',
  },
  {
    kind: 'bat-trach',
    nut: 'Hướng hợp tuổi',
    cau: ['hướng hợp tuổi', 'hướng nhà hợp tuổi', 'bát trạch', 'xem hướng nhà'],
    loi: 'Tám hướng theo cung mệnh của bạn — ô xanh là hướng tốt nên đặt cửa, giường, bàn làm việc; ô đỏ là hướng nên tránh.',
    thay: 'huyen-khong',
  },
  {
    kind: 'than-so',
    nut: 'Thần số học',
    cau: ['thần số học', 'xem thần số học', 'số chủ đạo', 'con số chủ đạo'],
    loi: 'Thần số học theo họ tên và ngày sinh của bạn — vòng tròn lớn là bốn con số lõi, lưới bên dưới là biểu đồ ngày sinh.',
    thay: 'thanh-hu',
  },
];

/** Thần số học cần họ tên (ngày âm đã tự đổi sang dương) — thiếu thì ẩn nút, bấm tay thì nhắc bổ sung. */
const veDuoc = (kind: ChartKind, birth: BirthParams) => kind !== 'than-so' || !!String(birth.name || '').trim();
const THIEU_TEN = 'Thần số học tính từ HỌ TÊN khai sinh. Nhắn thầy họ tên đầy đủ nhé, rồi bấm lại "Thần số học".';

/** Biểu đồ hợp câu vừa hỏi: vừa lập lá số → đường đời; hướng nhà → Bát Trạch;
 *  Bát Tự → tứ trụ; đúng một chủ đề → ảnh cung đó; hỏi về tháng/năm → 12 tháng;
 *  về đời/tương lai → đường đời; còn lại → điểm mạnh yếu 12 cung. */
function bieuDoHop(q: string, lasoShown: boolean): { nut: string } {
  const t = norm(q);
  const by = (k: ChartKind) => BIEU_DO.find((b) => b.kind === k)!;
  // Vừa lập lá số: câu đó thường chứa ngày sinh ("… tháng 8 …") — đừng để chữ
  // "tháng" kéo sang biểu đồ 12 tháng.
  if (lasoShown) return by('duong-doi');
  if (/(hướng nhà|hướng cửa|hướng bếp|hướng giường|hướng bàn|phong thủy|bát trạch)/.test(t)) return by('bat-trach');
  if (/(bát tự|tứ trụ|tử bình|nhật chủ|dụng thần)/.test(t)) return by('tu-tru');
  // Câu hỏi đúng một chủ đề (tiền, tình duyên, công việc…) → ảnh chính cung đó.
  const cung = cungChuDe(chuDeCua(q)[0] || null);
  if (cung) return { nut: `Xem cung ${cung}` };
  if (/(hôm nay|ngày mai|tuần này)/.test(t)) return by('van-ngay');
  if (/(tháng|năm nay|năm sau|năm tới|sắp tới|khi nào|bao giờ)/.test(t)) return by('van-12-thang');
  if (/(đại vận|giai đoạn|vận 10 năm|mười năm)/.test(t)) return by('dai-van');
  if (/(cuộc đời|tương lai|sau này|về già|tuổi già)/.test(t)) return by('duong-doi');
  return by('radar-cung');
}

// ── Ảnh MỘT cung (app/api/og/cung) — "Cung Tài Bạch" / "Xem cung Tài Bạch" ──
const CUNG_TEN = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];
/** "cung tài bạch" / "xem cung tài bạch" → "Tài Bạch"; không phải lệnh ảnh cung → null. */
function cungTuLenh(t: string): string | null {
  const m = t.match(/^(?:xem )?cung (.+)$/);
  return (m && CUNG_TEN.find((c) => c.toLowerCase() === m[1].trim())) || null;
}
const XEM_TUNG_CUNG = 'Xem từng cung';

async function handleCung(kit: ChannelKit, ev: ChannelEvent, cung: string | null): Promise<void> {
  const session = await kit.store.load(ev.chatId);
  if (!session.birth) {
    await kit.io.sendText(ev.chatId, 'Cho thầy giới tính, ngày/tháng/năm sinh và giờ sinh trước đã, thầy lập lá số rồi vẽ từng cung cho bạn nhé.');
    return;
  }
  const nut = (c: string) => ({ title: `Cung ${c}`, reply: `Xem cung ${c}` });
  if (!cung) {
    await sendMenu(
      kit.io,
      ev.chatId,
      `Bạn muốn xem cung nào? Nhắn "Cung" + tên cung, ví dụ "Cung Tài Bạch".\n${CUNG_TEN.map((c) => `• ${c}`).join('\n')}`,
      ['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phu Thê', 'Tật Ách'].slice(0, kit.maxReplyButtons).map(nut),
    );
    return;
  }
  const url = chartImageUrl('cung', session.birth, currentNamXem(), undefined, cung);
  if (!url || !kit.io.sendImage) {
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  try {
    await kit.io.sendImage(ev.chatId, url);
  } catch (e) {
    console.error('[channel-router] gửi ảnh cung lỗi', kit.platform, cung, e);
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  // Nút tiếp: hỏi thầy về chính cung này + ba cung tam phương tứ chính (đọc từ engine).
  const r = computeLaso(session.birth, currentNamXem());
  type P = { cungName: string; tamHopCungs?: { cungName: string }[]; xungChieuCung?: { cungName: string } | null };
  const pal = ((r.ls?.palaces as P[] | undefined) || []).find((p) => p.cungName === cung);
  const tp = pal ? [...(pal.tamHopCungs || []).map((p) => p.cungName), pal.xungChieuCung?.cungName || ''].filter(Boolean) : [];
  const hoi = { title: 'Nhờ thầy luận cung này', reply: `Thầy luận kỹ giúp cung ${cung} của tôi` };
  await sendMenu(
    kit.io,
    ev.chatId,
    `Cung ${cung} của bạn — ô đỏ là cung này, ô vàng là tam phương tứ chính, mũi tên là Tứ Hóa Phi Tinh bay từ cung này đi. Lục giác bên phải là điểm 6 chiều của cung.`,
    [hoi, ...tp.map(nut)].slice(0, kit.maxReplyButtons),
  );
}

async function handleBieuDo(kit: ChannelKit, ev: ChannelEvent, b: (typeof BIEU_DO)[number] | null): Promise<void> {
  const session = await kit.store.load(ev.chatId);
  if (!session.birth) {
    await kit.io.sendText(ev.chatId, 'Cho thầy giới tính, ngày/tháng/năm sinh và giờ sinh trước đã, thầy lập lá số rồi vẽ biểu đồ cho bạn nhé.');
    return;
  }
  const birth = session.birth;
  const khac = (bo?: ChartKind) =>
    BIEU_DO.filter((x) => x.kind !== bo && veDuoc(x.kind, birth))
      .slice(0, kit.maxReplyButtons)
      .map((x) => ({ title: x.nut, reply: x.nut }));
  if (!b) {
    // Zalo chỉ 5 nút mà có nhiều ảnh hơn ⇒ liệt kê cả tên trong lời, gõ tên nào cũng nhận.
    const ds = BIEU_DO.filter((x) => veDuoc(x.kind, birth));
    await sendMenu(
      kit.io,
      ev.chatId,
      `Bạn muốn xem ảnh nào?\n${[...ds.map((x) => x.nut), `${XEM_TUNG_CUNG} (vd "Cung Tài Bạch")`].map((x) => `• ${x}`).join('\n')}`,
      khac(),
    );
    return;
  }
  if (!veDuoc(b.kind, birth)) {
    await kit.io.sendText(ev.chatId, THIEU_TEN);
    return;
  }
  const url = chartImageUrl(b.kind, session.birth, currentNamXem(), b.kind === 'van-12-thang' || b.kind === 'van-ngay' ? todayVN() : undefined);
  if (!url || !kit.io.sendImage) {
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  try {
    await kit.io.sendImage(ev.chatId, url);
  } catch (e) {
    console.error('[channel-router] gửi ảnh biểu đồ lỗi', kit.platform, b.kind, e);
    await kit.io.sendText(ev.chatId, ERR_MSG);
    return;
  }
  // Ảnh môn khác → nút mời đúng thầy môn đó luận (cùng câu nút "mời thầy" sẵn có).
  const g = b.thay ? guestById(b.thay) : null;
  const moi = g ? [{ title: nhanMon(g), reply: moiCau(g) }] : [];
  await sendMenu(kit.io, ev.chatId, b.loi, [...moi, ...khac(b.kind)].slice(0, kit.maxReplyButtons));
}

/**
 * "Còn N câu hỏi (M lượt tặng)" — cùng công thức đồng hồ rail web
 * (`public/shell.js`: lượt tặng + floor(số dư / giá mỗi câu)). Đọc SAU khi
 * lượt vừa rồi đã chốt phí. Rỗng khi miễn phí (paywall tắt/giá 0).
 */
async function conCauHoi(userId: string, cost: number): Promise<string> {
  const d = await demCau(userId, cost);
  return d ? loiConCau(d) : '';
}

/** Số câu hỏi còn lại; null khi miễn phí (paywall tắt/giá 0). */
async function demCau(userId: string, cost: number): Promise<{ n: number; free: number } | null> {
  if (paywallDisabled() || cost <= 0) return null;
  const [free, balance] = await Promise.all([railFreeRemaining(userId), getBalance(userId)]);
  return { n: free + Math.floor(balance / cost), free };
}

/** Chỉ lên tiếng khi SẮP HẾT (< 3 câu) — nhắc mỗi lượt làm tin loãng (Henry 2026-09-29). */
function loiConCau({ n, free }: { n: number; free: number }): string {
  if (n >= 3) return '';
  if (n <= 0) return `Bạn đã dùng hết câu hỏi — nhắn "Nạp Lượng" để nạp ngay tại đây.`;
  return `Còn ${n} câu hỏi${free > 0 ? ` (${free} lượt tặng)` : ''}.`;
}
