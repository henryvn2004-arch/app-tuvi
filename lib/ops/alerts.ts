// lib/ops/alerts.ts
// ============================================================
// S2 (track COO) — LƯU cảnh báo vận hành, tách khỏi việc GỬI.
//
// VÌ SAO TÁCH: cron anomaly-alerts trước đây thoát ngay từ dòng đầu nếu thiếu
// ADMIN_TELEGRAM_CHAT_ID — tức một kênh gửi chưa cấu hình làm CHẾT LUÔN cả hệ
// phát hiện, chứ không chỉ chặn đường gửi. Đó đúng là lỗ P0-1 lặp lại ở tầng
// khác: hệ thống im lặng vì nó đã chết, mà nhìn từ ngoài thì y hệt "mọi thứ ổn".
//
// Nay: LUÔN chạy check, LUÔN ghi vào `events` (event_type='ops_alert') để panel
// Vận Hành trong admin đọc được — đúng chủ trương Henry chốt "trang admin là nơi
// monitor chính, Telegram chỉ để đẩy cái khẩn". Telegram hỏng hay chưa cấu hình
// thì cảnh báo vẫn còn nguyên chỗ để xem.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface OpsAlert {
  key: string;
  text: string;
}

/**
 * Ghi các cảnh báo vừa bắn vào `events`. Best-effort.
 * `delivered` = đã đẩy được ra Telegram hay chưa — panel dùng để hiện rõ
 * "đã báo" vs "chỉ ghi log, chưa ai được báo".
 */
export async function logOpsAlerts(alerts: OpsAlert[], delivered: boolean): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !alerts.length) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(
        alerts.map((a) => ({
          event_type: 'ops_alert',
          platform: 'web',
          meta: { key: a.key, text: a.text, delivered },
        })),
      ),
    });
  } catch {
    /* best-effort — ghi log hỏng KHÔNG được làm hỏng lượt cron */
  }
}
