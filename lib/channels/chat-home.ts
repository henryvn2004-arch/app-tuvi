// lib/channels/chat-home.ts
// Link MỞ cuộc trò chuyện với Tử Vi Minh Bảo trên từng kênh — dùng cho trang
// đăng nhập web qua chat (và nơi nào cần "quay lại chat"). Mỗi kênh nhận thêm
// một tham số tùy khả năng của nó: Messenger `?ref=`, Telegram `?start=`,
// WhatsApp tin soạn sẵn `?text=`; Zalo không truyền được gì vào cuộc trò chuyện.
import { OA_ID } from './zaloLink';
import { PAGE_ID } from './messengerLink';
import { WA_NUMBER } from './whatsappLink';
import { BOT_USERNAME } from './telegramLink';

export interface ChatHome {
  platform: string;
  label: string;
  url: string;
}

/** Link mở từng kênh; `loginCode` → nhét mã đăng nhập vào chỗ kênh cho phép. */
export function chatHomes(loginCode?: string): ChatHome[] {
  const c = loginCode ? encodeURIComponent(loginCode) : '';
  return [
    { platform: 'zalo-oa', label: 'Zalo', url: OA_ID ? `https://zalo.me/${OA_ID}` : 'https://zalo.me' },
    { platform: 'messenger', label: 'Messenger', url: `https://m.me/${PAGE_ID}${c ? `?ref=login_${c}` : ''}` },
    { platform: 'whatsapp', label: 'WhatsApp', url: `https://wa.me/${WA_NUMBER}${c ? `?text=${encodeURIComponent('DN ' + loginCode)}` : ''}` },
    { platform: 'telegram', label: 'Telegram', url: `https://t.me/${BOT_USERNAME}${c ? `?start=login_${c}` : ''}` },
  ];
}
