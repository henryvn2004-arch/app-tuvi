// lib/ops/preflight.ts
// ============================================================
// S4 (track COO) — KHAI BÁO env bắt buộc và quét cái đang thiếu.
//
// VÌ SAO CẦN: `ADMIN_TELEGRAM_CHAT_ID` chưa bao giờ được set trên Vercel, và
// hệ quả là CMO Digest + cảnh báo bất thường skip mỗi lượt suốt 14 ngày mà
// không ai biết. Tài liệu thì ghi "nên có sẵn — dùng chung với alert đăng
// nhập" — một PHỎNG ĐOÁN chưa ai kiểm. Không có nơi nào trong hệ thống trả lời
// được câu "tính năng này có đủ cấu hình để chạy không?".
//
// ⚠️ CHỈ báo cáo CÓ / KHÔNG CÓ. Tuyệt đối không trả về giá trị, không trả về
// độ dài, không trả về vài ký tự đầu — panel này nằm sau xác thực admin nhưng
// bí mật vẫn không có lý do gì để rời khỏi server.
// ============================================================

export interface EnvSpec {
  key: string;
  /** Tính năng sẽ hỏng nếu thiếu — để đọc là biết mất gì, không phải đi tra code. */
  feature: string;
  /**
   * `critical`: thiếu là hỏng thứ đang chạy hằng ngày → cảnh báo.
   * Không critical: chỉ tắt một tính năng phụ → hiện trên panel, không báo động.
   */
  critical: boolean;
}

export const REQUIRED_ENV: EnvSpec[] = [
  // ── Lõi: thiếu là sập ──
  { key: 'SUPABASE_URL', feature: 'Toàn bộ hệ thống', critical: true },
  { key: 'SUPABASE_SERVICE_KEY', feature: 'Toàn bộ hệ thống', critical: true },
  { key: 'CRON_SECRET', feature: 'Xác thực mọi cron', critical: true },

  // ── Vận hành & cảnh báo ──
  { key: 'TELEGRAM_BOT_TOKEN', feature: 'Bot Telegram + mọi cảnh báo', critical: true },
  { key: 'ADMIN_TELEGRAM_CHAT_ID', feature: 'CMO Digest · cảnh báo bất thường · cảnh báo tool hỏng', critical: true },

  // ── Nhà cung cấp AI ──
  { key: 'GEMINI_API_KEY', feature: 'LLM chính (rail chat, mọi tool luận giải)', critical: true },
  { key: 'ANTHROPIC_API_KEY', feature: 'LLM dự phòng — fallback hai chiều', critical: true },
  { key: 'OPENAI_API_KEY', feature: 'Sinh ảnh 2 tool Chân Dung + embeddings', critical: true },
  { key: 'REPLICATE_API_KEY', feature: 'Nhóm tool ghép ảnh / thử đồ', critical: false },

  // ── Thanh toán ──
  { key: 'PAYOS_CLIENT_ID', feature: 'Nạp Lượng qua PayOS', critical: false },
  { key: 'PAYOS_API_KEY', feature: 'Nạp Lượng qua PayOS', critical: false },
  { key: 'PAYOS_CHECKSUM_KEY', feature: 'Xác thực webhook PayOS', critical: false },
  { key: 'PAYPAL_CLIENT_ID', feature: 'Nạp Lượng qua PayPal', critical: false },
  { key: 'PAYPAL_CLIENT_SECRET', feature: 'Nạp Lượng qua PayPal', critical: false },
  // Thiếu khoá này KHÔNG ném lỗi — route im lặng rơi về endpoint sandbox, nên
  // khoá LIVE sẽ bị PayPal trả 401 và mọi lượt nạp báo "Lỗi kết nối PayPal"
  // mà không có gì chỉ ra nguyên nhân. Phải nhìn thấy được là nó đã set hay chưa.
  { key: 'PAYPAL_MODE', feature: 'Chọn PayPal live hay sandbox (thiếu = sandbox)', critical: false },
  // Thiếu khoá này thì webhook PayPal từ chối MỌI gói tin (fail-closed, vì đây
  // là cửa cộng Lượng mở ra Internet) ⇒ mất lưới đỡ cho khách trả tiền xong mà
  // đóng tab, và mất im lặng: PayPal cứ gửi, mình cứ trả 401.
  { key: 'PAYPAL_WEBHOOK_ID', feature: 'Webhook PayPal — lưới đỡ cộng Lượng khi khách không quay lại trang', critical: false },

  // ── Kênh phụ ──
  { key: 'FIREBASE_SERVICE_ACCOUNT', feature: 'Push app (FCM)', critical: false },
  { key: 'MESSENGER_PAGE_ACCESS_TOKEN', feature: 'Kênh Messenger', critical: false },
  { key: 'WHATSAPP_TOKEN', feature: 'Kênh WhatsApp', critical: false },

  // ── Phân tích ──
  { key: 'GA4_PROPERTY_ID', feature: 'Số khách ghé thật trong Funnel (thiếu thì dùng số nội bộ)', critical: false },
  { key: 'GA4_SERVICE_ACCOUNT_JSON', feature: 'Số khách ghé thật trong Funnel', critical: false },
];

export interface EnvStatus extends EnvSpec {
  present: boolean;
}

/** Trạng thái CÓ/KHÔNG của từng env. Không bao giờ trả về giá trị. */
export function checkEnv(): EnvStatus[] {
  return REQUIRED_ENV.map((s) => ({
    ...s,
    present: !!(process.env[s.key] || '').trim(),
  }));
}

/** Danh sách env bắt buộc đang thiếu — nuôi cảnh báo. */
export function missingCriticalEnv(): EnvStatus[] {
  return checkEnv().filter((e) => e.critical && !e.present);
}
