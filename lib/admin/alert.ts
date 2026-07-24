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
