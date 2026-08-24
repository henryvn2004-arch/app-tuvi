// lib/onboarding/tasks.ts
// ============================================================
// M3 — NHIỆM VỤ ONBOARDING. Nguồn DUY NHẤT định nghĩa "có những việc gì, làm
// xong thì căn cứ vào đâu mà biết, và thưởng bao nhiêu".
//
// ── VÌ SAO CÓ MỤC NÀY ───────────────────────────────────────────────────────
// Đo prod 07/08: 48 người đã nhận 25 Lượng quà đăng ký. Đổi lại, sau 4 tháng có
// 3 liên kết kênh chat · 2 lượt bật thông báo · 2 dòng `user_charts` của ĐÚNG
// một người · **0 dòng `referrals`**. Phát tiền mà không hỏi lại gì thì không
// nhận lại gì. Ba nhiệm vụ dưới đây đổi CÙNG khoản tiền đang phát lấy: một lá
// số nằm trong tài khoản, và một đường nhắn thẳng vào máy người dùng.
//
// ── HAI LUẬT CỨNG ───────────────────────────────────────────────────────────
// 1. **SERVER TỰ KIỂM, KHÔNG TIN CLIENT.** Mỗi nhiệm vụ tra thẳng bảng đã sinh
//    ra bằng chứng. Client khai "tôi làm rồi" không phải bằng chứng — phần
//    thưởng ở đây là TIỀN.
// 2. **FAIL-CLOSED.** Đọc hụt bảng → coi như CHƯA xong. Ngược hẳn với cầu dao
//    ngân sách ảnh (`viral-budget.ts`, fail-OPEN) và ngược có lý do: bên kia
//    gác người ĐÃ TRẢ TIỀN nên chặn oan là tệ nhất; bên này đang PHÁT tiền nên
//    phát nhầm mới là tệ nhất.
//
// Chống nhận hai lần KHÔNG nằm ở đây mà ở khoá chính `(user_id, task_key)` của
// bảng `onboarding_tasks` + RPC `onboarding_task_claim` (một transaction).
// Xem `_patches/migration-onboarding-tasks.sql`.
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const SB_HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/** Mức thưởng mặc định — `app_config['onboarding.task_rewards']` ghi đè. */
const DEFAULT_REWARDS: Record<string, number> = {
  luu_la_so: 10,
  bat_thong_bao: 10,
  lien_ket_kenh: 10,
};

export interface OnboardingTaskDef {
  key: string;
  title: string;
  /** Một câu nói RÕ làm xong thì được gì — không phải mô tả thao tác. */
  desc: string;
  /** Nhãn nút. Nhiệm vụ nào làm ngay tại chỗ thì `href` để trống. */
  cta: string;
  href: string;
  /** Bảng + bộ lọc PostgREST dùng làm bằng chứng đã hoàn thành. */
  table: string;
}

/**
 * Ba nhiệm vụ, chọn theo thứ ĐANG THIẾU chứ không theo thứ dễ làm.
 *
 * ⛔ CỐ Ý KHÔNG có "xác minh email" (Supabase đã xác minh lúc đăng ký — trả
 * tiền cho thứ đã có sẵn) và "xác minh SĐT" (phải mua dịch vụ OTP, cả một nhà
 * cung cấp mới cho 60 người).
 *
 * ⛔ CỐ Ý KHÔNG có "mời bạn": việc đó ĐÃ có thưởng riêng 15 Lượng
 * (`referral.signup_bonus_referrer`). Cộng thêm ở đây là trả hai lần cho một
 * việc — đúng lối mở đường farm. Trang chỉ BÀY mức thưởng sẵn có ra.
 */
export const TASK_DEFS: OnboardingTaskDef[] = [
  // `href` rỗng = làm NGAY TẠI CHỖ, không rời trang. Ô nhập lá số vốn đã nằm
  // trong thẻ "Vận hôm nay" ngay trên trang này, và `Shell.rememberBirth` tự
  // ghi lên sổ tài khoản cho người đã đăng nhập — nên đá họ sang một trang khác
  // để làm đúng việc đang có sẵn ở đây là tự thêm một chỗ rơi.
  {
    key: 'luu_la_so',
    title: 'Lưu lá số vào tài khoản',
    desc: 'Có lá số thì thẻ "Vận hôm nay" mới nói được vận RIÊNG của bạn, và Trợ lý mới luận theo đúng lá số bạn. Lưu trên tài khoản nên đổi máy vẫn còn.',
    cta: 'Nhập lá số',
    href: '',
    table: 'user_charts',
  },
  {
    key: 'bat_thong_bao',
    title: 'Bật nhắc vận hằng ngày',
    desc: 'Mỗi sáng một tin ngắn: hôm nay tốt hay xấu, hợp việc gì, có xung tuổi bạn không.',
    cta: 'Bật ngay',
    href: '',
    table: 'push_subscriptions',
  },
  // Nhiệm vụ nói "một kênh BẤT KỲ", KHÔNG khoá vào Telegram: prod đã có cả
  // Telegram, WhatsApp lẫn Messenger, và Zalo OA đang chờ duyệt. Phép kiểm đọc
  // `chat_links` KHÔNG lọc `platform` nên kênh mới cắm vào là tự tính — không
  // phải sửa lại mục này. (Bảng `chat_links` vốn đã generic đa nền tảng từ lúc
  // tách lõi kênh chat.)
  {
    key: 'lien_ket_kenh',
    title: 'Liên kết một kênh chat',
    desc: 'Hỏi tử vi thẳng trong Telegram · Messenger · WhatsApp, không cần mở web. Đây cũng là đường nhắc duy nhất không phụ thuộc quyền thông báo của trình duyệt.',
    cta: 'Liên kết',
    // `#ketnoi` mở thẳng tab Kết Nối — bước mở-tab-theo-hash vừa thêm vào
    // `account-core.js`. Trước đó tab chỉ đổi được bằng cú bấm, nên mọi liên
    // kết từ nơi khác đều đổ người ta xuống tab Lịch Sử rồi để tự đi tìm.
    //
    // Trỏ `/app/tai-khoan` (trang shell hiện hành) chứ không phải
    // `/profile.html` (bản standalone cũ) — nhánh `href` không rỗng trong
    // `questTaskGo()` (account-core.js) còn nhận diện đúng dạng
    // `/app/tai-khoan#<tab>` để chuyển tab TẠI CHỖ thay vì tải lại trang khi
    // người dùng đang đứng sẵn ở đó (tab Nhiệm Vụ).
    href: '/app/tai-khoan#ketnoi',
    table: 'chat_links',
  },
];

export interface OnboardingTaskState extends OnboardingTaskDef {
  done: boolean;
  credits: number;
  /** Vừa được cộng trong CHÍNH lượt đồng bộ này → trang có cớ báo cho người ta. */
  justGranted: boolean;
}

export interface OnboardingState {
  tasks: OnboardingTaskState[];
  /** Tổng Lượng vừa cộng trong lượt này (0 = không có gì mới). */
  granted: number;
  /** Tổng Lượng còn có thể nhận nếu làm nốt. */
  pending: number;
  allDone: boolean;
}

/** Một lượt GET PostgREST, trả `null` khi hỏng (để phân biệt với "rỗng"). */
async function sbGet(path: string): Promise<unknown[] | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: SB_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

/**
 * Đồng bộ trạng thái nhiệm vụ và CỘNG NGAY phần vừa hoàn thành.
 *
 * 🔑 Cộng tự động thay vì bắt bấm nút "Nhận": mỗi nút bấm là một chỗ rơi, và
 * người đã làm xong việc rồi thì không có lý do gì bắt họ làm thêm một thao tác
 * nữa để lấy thứ họ đã kiếm được. Bù lại trang PHẢI hiện ra là vừa cộng bao
 * nhiêu (`justGranted`) — cộng lén thì không ai biết mà cũng chẳng khuyến khích
 * được ai.
 */
export async function syncOnboardingTasks(userId: string): Promise<OnboardingState> {
  const uid = encodeURIComponent(userId);
  const rewards = await getConfigValue<Record<string, number>>(
    'onboarding.task_rewards',
    DEFAULT_REWARDS,
  );

  const claimedRows = await sbGet(`onboarding_tasks?user_id=eq.${uid}&select=task_key`);
  const claimed = new Set(
    (claimedRows || []).map((r) => String((r as { task_key?: string }).task_key || '')),
  );

  const tasks: OnboardingTaskState[] = [];
  let granted = 0;
  let pending = 0;

  for (const def of TASK_DEFS) {
    const credits = Number(rewards?.[def.key] ?? DEFAULT_REWARDS[def.key] ?? 0) || 0;

    // Đã nhận rồi → khỏi tra bảng bằng chứng, khỏi gọi RPC.
    if (claimed.has(def.key)) {
      tasks.push({ ...def, done: true, credits, justGranted: false });
      continue;
    }

    // Bằng chứng: có ÍT NHẤT một dòng của chính người này.
    // ⚠️ `chat_links` cố ý KHÔNG lọc `platform` — xem ghi chú ở TASK_DEFS.
    const rows = await sbGet(`${def.table}?user_id=eq.${uid}&select=user_id&limit=1`);
    const done = Array.isArray(rows) && rows.length > 0; // null (đọc hụt) → false

    if (!done) {
      pending += credits;
      tasks.push({ ...def, done: false, credits, justGranted: false });
      continue;
    }

    const got = await claimTask(userId, def.key, credits);
    granted += got;
    tasks.push({ ...def, done: true, credits, justGranted: got > 0 });
  }

  return { tasks, granted, pending, allDone: tasks.every((t) => t.done) };
}

/**
 * Gọi RPC nhận thưởng. Trả về số Lượng THỰC SỰ được cộng (0 nếu đã nhận trước).
 *
 * Lỗi mạng ở đây trả 0 chứ không ném: nhiệm vụ vẫn hiện là "đã xong", và lượt
 * đồng bộ sau sẽ cộng — vì dấu chỉ được ghi khi RPC chạy trọn. Mất một nhịp thì
 * người dùng vẫn nhận đủ; ném lỗi ra thì cả thẻ nhiệm vụ chết theo.
 */
async function claimTask(userId: string, taskKey: string, credits: number): Promise<number> {
  if (!SUPABASE_URL || !SERVICE_KEY) return 0;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/onboarding_task_claim`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: userId, p_task_key: taskKey, p_credits: credits }),
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const n = await res.json();
    return typeof n === 'number' && isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
