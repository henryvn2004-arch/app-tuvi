// lib/onboarding/tasks.ts
// ============================================================
// "KHỞI HÀNH" — nhiệm vụ onboarding, thay M3. Nguồn DUY NHẤT định nghĩa "có
// những việc gì, làm xong thì căn cứ vào đâu mà biết, và thưởng bao nhiêu".
//
// ── VÌ SAO ĐỔI TỪ M3 (2026-08-24, xem docs/QUEST-PLAN.md §3/§4) ─────────────
// M3 (3 việc hành chính, thưởng lẻ từng bước): 4 lượt nhận / 2 người trong 66
// tài khoản. Không việc nào cho thấy SẢN PHẨM hay hơn — lưu lá số, bật push,
// liên kết kênh đều là thao tác, không phải trải nghiệm. Và thưởng lẻ từng
// bước thì người ta nhặt bước rẻ nhất rồi bỏ.
//
// "Khởi Hành" đổi sang BA VIỆC MỞ RA THỨ ĐỌC ĐƯỢC (lập lá số → hỏi Thầy → thử
// một công cụ) và thưởng THEO CHUỖI — chỉ cộng khi đủ cả ba, một dòng
// `onboarding_tasks` duy nhất khoá `khoi_hanh`. Hai việc "kênh liên lạc" cũ
// (bật thông báo · liên kết chat) GIỮ NGUYÊN nhưng tách sang tầng riêng —
// chúng là kênh nhắc, không phải bước làm quen sản phẩm.
//
// ── HAI LUẬT CỨNG (kế thừa từ M3, KHÔNG đổi) ─────────────────────────────────
// 1. **SERVER TỰ KIỂM, KHÔNG TIN CLIENT.** Mỗi bước tra thẳng bảng đã sinh ra
//    bằng chứng — `user_charts` (đã lập lá số) · `events` lọc `event_type`
//    (đã hỏi Thầy trong rail = 'chat_msg' · đã chạy xong 1 tool = 'tool_run',
//    cả hai đã bắn thật từ `shell.js`, không phải type mới chưa ai gọi). Client
//    khai "tôi làm rồi" không phải bằng chứng — phần thưởng ở đây là TIỀN.
// 2. **FAIL-CLOSED.** Đọc hụt bảng → coi như CHƯA xong. Ngược hẳn với cầu dao
//    ngân sách ảnh (`viral-budget.ts`, fail-OPEN) và ngược có lý do: bên kia
//    gác người ĐÃ TRẢ TIỀN nên chặn oan là tệ nhất; bên này đang PHÁT tiền nên
//    phát nhầm mới là tệ nhất.
//
// Chống nhận hai lần KHÔNG nằm ở đây mà ở khoá chính `(user_id, task_key)` của
// bảng `onboarding_tasks` + RPC `onboarding_task_claim` (một transaction, tái
// dùng NGUYÊN VẸN từ M3 — không cần migration mới, `task_key` chỉ là một
// chuỗi). Xem `_patches/migration-onboarding-tasks.sql` (bảng + RPC gốc) và
// `_patches/migration-khoi-hanh-onboarding.sql` (đổi mức thưởng).
//
// ── BẬC 0 (khách vô danh) ────────────────────────────────────────────────────
// Tiến độ 3 bước cho khách CHƯA đăng nhập tính hoàn toàn ở CLIENT (localStorage
// — xem khối "KHỞI HÀNH BẬC 0" trong `public/app-home.html` và cờ
// `_khTvpChatFlag` gắn ở `public/shell.js`). Module này KHÔNG biết gì về họ —
// không có user_id thì không có gì để tra. Thưởng chỉ trả khi họ tạo tài
// khoản, lúc đó bằng chứng đã nằm sẵn trong `user_charts`/`events` (họ dùng
// đúng những nút đó trước khi đăng ký) nên `syncOnboardingTasks` xử đúng ngay
// lượt gọi đầu tiên — không cần đường nào riêng để "chuyển bậc 0 → bậc 1".
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const SB_HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/** Mức thưởng mặc định — `app_config['onboarding.task_rewards']` ghi đè. */
const DEFAULT_REWARDS: Record<string, number> = {
  khoi_hanh: 15,
  bat_thong_bao: 10,
  lien_ket_kenh: 10,
};

export interface KhoiHanhStepDef {
  key: string;
  title: string;
  /** Câu tò mò/lý do — KHÔNG mô tả thao tác. Đây là chữ quyết định có bấm hay không. */
  desc: string;
  cta: string;
  /** Rỗng = làm ngay tại trang (script bên dưới tự xử ở app-home.html). */
  href: string;
  /** Bảng bằng chứng. */
  table: 'user_charts' | 'events';
  /** Có mặt khi bằng chứng là MỘT LOẠI event cụ thể trong `events`. */
  eventType?: string;
}

/**
 * Ba bước "Khởi Hành" — thứ tự đúng hành trình thật: có lá số thì hỏi mới có
 * gì để luận, luận xong mới biết còn công cụ nào khác đáng thử.
 *
 * 🔑 Mỗi bước MỞ RA một thứ đọc được, không phải một thao tác hành chính —
 * đúng bài học rút ra từ M3 (xem block comment đầu file).
 */
export const KHOI_HANH_STEPS: KhoiHanhStepDef[] = [
  {
    key: 'lap_la_so',
    title: 'Vén màn lá số của bạn',
    desc: 'Mọi lời Thầy luận, mọi công cụ trên Luận Đường đều bắt đầu từ đây. Nhập ngày giờ sinh — chưa đầy 10 giây, xem ngay.',
    cta: 'Lập lá số',
    href: '',
    table: 'user_charts',
  },
  {
    key: 'hoi_thay',
    title: 'Hỏi Thầy một câu bất kỳ',
    desc: 'Tình duyên, sự nghiệp, hay chuyện đang canh cánh trong lòng — hỏi thử một câu, Thầy luận thẳng theo đúng lá số của bạn, không phải câu trả lời chung chung.',
    cta: 'Hỏi ngay',
    href: '',
    table: 'events',
    eventType: 'chat_msg',
  },
  {
    key: 'mo_thu_cong_cu',
    title: 'Mở thử một công cụ bất kỳ',
    desc: '58 cánh cửa, mỗi cánh nhìn lá số của bạn theo một góc khác — tình duyên, sự nghiệp, vận hạn từng tháng. Bấm thử một cái xem Thầy nói gì.',
    cta: 'Khám phá công cụ',
    href: '/cong-cu',
    table: 'events',
    eventType: 'tool_run',
  },
];

export interface OnboardingTaskDef {
  key: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  table: string;
}

/**
 * Hai nhiệm vụ KÊNH LIÊN LẠC — giữ nguyên từ M3, chỉ tách sang tầng riêng
 * (không còn đứng chung với 3 bước làm quen sản phẩm). Vẫn thưởng ĐỘC LẬP
 * từng cái, không theo chuỗi như Khởi Hành — đây là hai kênh khác nhau, làm
 * cái nào cũng có giá trị riêng, không có lý do bắt làm đủ cả hai mới trả.
 *
 * ⛔ CỐ Ý KHÔNG có "xác minh email" (Supabase đã xác minh lúc đăng ký) và
 * "xác minh SĐT" (phải mua dịch vụ OTP cho quy mô hiện tại).
 * ⛔ CỐ Ý KHÔNG có "mời bạn": đã có thưởng riêng 15 Lượng
 * (`referral.signup_bonus_referrer`). Cộng thêm ở đây là trả hai lần.
 */
export const CHANNEL_TASK_DEFS: OnboardingTaskDef[] = [
  {
    key: 'bat_thong_bao',
    title: 'Bật nhắc vận hằng ngày',
    desc: 'Mỗi sáng một tin ngắn: hôm nay tốt hay xấu, hợp việc gì, có xung tuổi bạn không.',
    cta: 'Bật ngay',
    href: '',
    table: 'push_subscriptions',
  },
  // Nhiệm vụ nói "một kênh BẤT KỲ", KHÔNG khoá vào Telegram — `chat_links`
  // KHÔNG lọc `platform` nên kênh mới cắm vào tự tính, không phải sửa lại đây.
  {
    key: 'lien_ket_kenh',
    title: 'Liên kết một kênh chat',
    desc: 'Hỏi tử vi thẳng trong Telegram · Messenger · WhatsApp, không cần mở web. Đây cũng là đường nhắc duy nhất không phụ thuộc quyền thông báo của trình duyệt.',
    cta: 'Liên kết',
    href: '/profile.html#ketnoi',
    table: 'chat_links',
  },
];

export interface KhoiHanhStepState extends KhoiHanhStepDef {
  done: boolean;
}

export interface KhoiHanhState {
  steps: KhoiHanhStepState[];
  /** Cả ba bước đã có bằng chứng — CHƯA chắc đã cộng tiền, xem `claimed`. */
  done: boolean;
  /** Phần thưởng đã nằm trong ví (dòng `onboarding_tasks` khoá `khoi_hanh` tồn tại). */
  claimed: boolean;
  credits: number;
  /** Vừa được cộng trong CHÍNH lượt đồng bộ này. */
  justGranted: boolean;
}

export interface OnboardingTaskState extends OnboardingTaskDef {
  done: boolean;
  credits: number;
  justGranted: boolean;
}

export interface OnboardingState {
  khoiHanh: KhoiHanhState;
  channels: {
    tasks: OnboardingTaskState[];
    /** Tổng Lượng còn có thể nhận nếu làm nốt các kênh liên lạc. */
    pending: number;
  };
  /** Tổng Lượng vừa cộng trong lượt này (Khởi Hành + kênh liên lạc). */
  granted: number;
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

/** Bằng chứng: có ÍT NHẤT một dòng của chính người này (lọc thêm `eventType` khi có). */
async function hasEvidence(userId: string, table: string, eventType?: string): Promise<boolean> {
  const uid = encodeURIComponent(userId);
  const filter = eventType ? `&event_type=eq.${encodeURIComponent(eventType)}` : '';
  const rows = await sbGet(`${table}?user_id=eq.${uid}${filter}&select=user_id&limit=1`);
  return Array.isArray(rows) && rows.length > 0; // null (đọc hụt) → false
}

/**
 * Gọi RPC nhận thưởng. Trả về số Lượng THỰC SỰ được cộng (0 nếu đã nhận trước
 * hoặc mạng lỗi). Lỗi mạng ở đây trả 0 chứ không ném: bằng chứng vẫn còn
 * nguyên nên lượt đồng bộ sau sẽ thử cộng lại — mất một nhịp thì người dùng
 * vẫn nhận đủ, ném lỗi ra thì cả thẻ nhiệm vụ chết theo.
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

/**
 * Đồng bộ chuỗi Khởi Hành. `alreadyClaimed` đến từ lượt đọc `onboarding_tasks`
 * DUY NHẤT ở `syncOnboardingTasks` — tránh đọc lại bảng đó hai lần trong cùng
 * một request.
 */
async function syncKhoiHanh(
  userId: string,
  rewards: Record<string, number>,
  alreadyClaimed: boolean,
): Promise<KhoiHanhState> {
  const credits = Number(rewards?.khoi_hanh ?? DEFAULT_REWARDS.khoi_hanh ?? 0) || 0;

  if (alreadyClaimed) {
    return {
      steps: KHOI_HANH_STEPS.map((s) => ({ ...s, done: true })),
      done: true,
      claimed: true,
      credits,
      justGranted: false,
    };
  }

  const doneFlags = await Promise.all(
    KHOI_HANH_STEPS.map((s) => hasEvidence(userId, s.table, s.eventType)),
  );
  const steps = KHOI_HANH_STEPS.map((s, i) => ({ ...s, done: doneFlags[i] }));
  const allDone = doneFlags.every(Boolean);

  if (!allDone) {
    return { steps, done: false, claimed: false, credits, justGranted: false };
  }

  const got = await claimTask(userId, 'khoi_hanh', credits);
  return { steps, done: true, claimed: got > 0, credits, justGranted: got > 0 };
}

/**
 * Đồng bộ trạng thái Khởi Hành + kênh liên lạc, CỘNG NGAY phần vừa hoàn
 * thành. Gọi từ `handleOnboardingSync` (`app/api/payment/route.ts`,
 * action=onboarding-sync).
 *
 * 🔑 Cộng tự động thay vì bắt bấm nút "Nhận": người đã làm xong việc rồi thì
 * không có lý do bắt họ làm thêm một thao tác nữa để lấy thứ họ đã kiếm được.
 * Bù lại trang PHẢI hiện ra là vừa cộng bao nhiêu (`justGranted`).
 */
export async function syncOnboardingTasks(userId: string): Promise<OnboardingState> {
  const uid = encodeURIComponent(userId);
  const rewards = await getConfigValue<Record<string, number>>(
    'onboarding.task_rewards',
    DEFAULT_REWARDS,
  );

  const claimedRows = await sbGet(`onboarding_tasks?user_id=eq.${uid}&select=task_key`);
  const claimedSet = new Set(
    (claimedRows || []).map((r) => String((r as { task_key?: string }).task_key || '')),
  );

  const khoiHanh = await syncKhoiHanh(userId, rewards, claimedSet.has('khoi_hanh'));

  const channelTasks: OnboardingTaskState[] = [];
  let channelPending = 0;
  let granted = khoiHanh.justGranted ? khoiHanh.credits : 0;

  for (const def of CHANNEL_TASK_DEFS) {
    const credits = Number(rewards?.[def.key] ?? DEFAULT_REWARDS[def.key] ?? 0) || 0;

    if (claimedSet.has(def.key)) {
      channelTasks.push({ ...def, done: true, credits, justGranted: false });
      continue;
    }

    const done = await hasEvidence(userId, def.table);
    if (!done) {
      channelPending += credits;
      channelTasks.push({ ...def, done: false, credits, justGranted: false });
      continue;
    }

    const got = await claimTask(userId, def.key, credits);
    granted += got;
    channelTasks.push({ ...def, done: true, credits, justGranted: got > 0 });
  }

  return { khoiHanh, channels: { tasks: channelTasks, pending: channelPending }, granted };
}
