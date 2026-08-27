// lib/admin/alert.ts
// Cảnh báo mỗi lượt đăng nhập Admin (thành công/thất bại) qua Telegram +
// WhatsApp — best-effort, không chặn luồng đăng nhập. No-op nếu chưa cấu
// hình env tương ứng (ADMIN_TELEGRAM_CHAT_ID / ADMIN_WHATSAPP_NUMBER).
import { tgSendMessage } from '@/lib/channels/telegram';
import { waSendText } from '@/lib/channels/whatsapp';

const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';
const WA_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '';

export async function alertAdminLogin(
  success: boolean,
  email: string,
  ip: string,
  detail?: string
): Promise<void> {
  if (!TG_CHAT_ID && !WA_NUMBER) return;
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const text = success
    ? `✅ Đăng nhập Admin thành công\nEmail: ${email}\nIP: ${ip}${detail ? `\n${detail}` : ''}\nLúc: ${time}`
    : `🚨 ĐĂNG NHẬP ADMIN THẤT BẠI\nEmail thử: ${email || '(trống)'}\nIP: ${ip}\nLúc: ${time}${detail ? `\nLý do: ${detail}` : ''}`;
  await Promise.allSettled([
    TG_CHAT_ID ? tgSendMessage(TG_CHAT_ID, text) : Promise.resolve(),
    WA_NUMBER ? waSendText(WA_NUMBER, text) : Promise.resolve(),
  ]);
}

/**
 * Bắn tin Telegram cho admin mỗi khi có góp ý mới — best-effort, không chặn
 * việc lưu góp ý.
 *
 * Vì sao có: panel Góp Ý trong admin chỉ hữu ích nếu người ta MỞ nó. Góp ý
 * đến rải rác vài cái một tuần, không ai ngồi canh — không có tin đẩy thì
 * mục "mới" nằm đó cả tháng, và người góp ý học được rằng góp ý là vô ích.
 *
 * KHÔNG đổi emoji ở đây sang icon SVG: Telegram không render SVG (ngoại lệ
 * đã ghi trong luật icon của CLAUDE.md).
 */
export async function alertNewFeedback(opts: {
  email: string;
  kind: string;
  message: string;
  pageUrl?: string | null;
  /** 'up' | 'down' khi góp ý đến kèm một lá phiếu dưới bản luận giải. */
  rating?: string | null;
  /** Công cụ bị nhắc tới, nếu suy được từ nơi gửi. */
  toolId?: string | null;
}): Promise<void> {
  if (!TG_CHAT_ID && !WA_NUMBER) return;
  const KIND_LABEL: Record<string, string> = {
    bug: 'Lỗi kỹ thuật',
    noi_dung: 'Nội dung luận giải',
    tinh_nang: 'Đề xuất tính năng',
    thanh_toan: 'Thanh toán · Lượng',
    khac: 'Khác',
  };
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  // Cắt bớt: tin Telegram dài bị chia nhiều mảnh, mà đây chỉ là tin BÁO —
  // đọc đủ ý rồi mở panel Góp Ý xem nguyên văn.
  const body = (opts.message || '').slice(0, 600);
  // Emoji giữ nguyên ở đây: Telegram không render SVG (ngoại lệ đã ghi trong
  // luật icon của CLAUDE.md).
  const vote = opts.rating === 'down' ? '👎 ' : opts.rating === 'up' ? '👍 ' : '';
  const text =
    `${vote}💬 GÓP Ý MỚI\n` +
    `Loại: ${KIND_LABEL[opts.kind] || opts.kind}\n` +
    (opts.toolId ? `Công cụ: ${opts.toolId}\n` : '') +
    `Người gửi: ${opts.email || '(không rõ)'}\n` +
    (opts.pageUrl ? `Trang: ${opts.pageUrl}\n` : '') +
    `Lúc: ${time}\n\n` +
    `${body}${(opts.message || '').length > 600 ? '…' : ''}`;
  await Promise.allSettled([
    TG_CHAT_ID ? tgSendMessage(TG_CHAT_ID, text) : Promise.resolve(),
    WA_NUMBER ? waSendText(WA_NUMBER, text) : Promise.resolve(),
  ]);
}
