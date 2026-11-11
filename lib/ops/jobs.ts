// lib/ops/jobs.ts
// ============================================================
// S4 (track COO) — SỔ ĐĂNG KÝ JOB + phát hiện "đáng lẽ phải chạy mà không chạy".
//
// VÌ SAO CẦN SỔ Ở SERVER: sổ cũ nằm hardcode trong `public/admin.html`
// (`CRON_JOBS`) và đã TRÔI khỏi thực tế — khai 5 job trong khi `vercel.json`
// có 9, tức `cmo-digest`, `anomaly-alerts` và 3 job autopilot HOÀN TOÀN VẮNG
// MẶT trên trang giám sát. Đó chính là lý do vụ CMO Digest chết 14 ngày không
// ai thấy: không phải nó bị bỏ qua, mà nó chưa bao giờ có mặt để mà nhìn.
// Đưa sổ về server để chỉ còn MỘT nguồn, và panel đọc từ đây.
//
// `everyMinutes` là thứ sổ cũ không có: chỉ có chuỗi mô tả cho người đọc, nên
// máy không thể tự kết luận job đã trễ. Đây là điều kiện để phát hiện job chết
// ÂM THẦM — loại hỏng nguy hiểm nhất vì nó không tạo ra dòng lỗi nào cả.
// ============================================================

export interface JobSpec {
  key: string;
  label: string;
  source: 'vercel' | 'edge' | 'pgcron' | 'actions';
  /** Chu kỳ kỳ vọng (phút). Dùng để tính "đã trễ". */
  everyMinutes: number;
  /** Mô tả lịch cho người đọc. */
  schedule: string;
  sink: string;
  /**
   * Đường dẫn route Vercel để BẤM CHẠY TAY (`path`), hoặc tên edge function
   * (`edge`). Có một trong hai thì panel hiện nút "▶ Chạy ngay".
   *
   * 🔑 VÌ SAO NẰM Ở ĐÂY chứ không phải một bảng riêng trong route admin: bản
   * đầu để `trigger: true` ở sổ này còn đường dẫn ở `CRON_TRIGGERS` bên
   * `app/api/payment/route.ts` — HAI danh sách chép tay cho cùng một thứ, và
   * chúng đã trôi khỏi nhau đúng như mọi lần: sổ khai 20 job có nút, bảng kia
   * chỉ biết 11, nên 9 job hiện nút bấm rồi trả về "Unknown job". Chính lớp
   * lỗi mà cuốn sổ này sinh ra để chống, tái phát ở tầng dưới một bậc.
   *
   * Nay chỉ còn MỘT nguồn; `npm run check:jobs` canh cho mỗi đường dẫn phải
   * có file route thật trên đĩa và mọi cron trong `vercel.json` phải có mặt ở
   * đây.
   */
  path?: string;
  edge?: string;
  /**
   * Ngày job được đưa vào sổ (YYYY-MM-DD, giờ VN). GHI CHÚ cho người đọc.
   *
   * ⚠️ KHÔNG còn là thứ quyết định ân hạn của job mới — `jobFirstSeen` mới là.
   * Lý do đổi: đây là một ngày GÕ TAY, và gõ SỚM hơn ngày merge thật thì bộ dò
   * bắn báo động ngay lượt quét đầu tiên sau deploy. Đã cắn thật: `prune-anon-trial`
   * khai `since: '2026-07-30'` nhưng code lên `main` lúc 01/08 21:57 VN — cảnh
   * báo "QUÁ HẠN" bắn lúc 22:00, tức 3 PHÚT sau deploy, cho một job mà lượt chạy
   * đầu tiên theo lịch còn cách đó 11 tiếng. Nó chạy `ok` sáng hôm sau.
   *
   * Điền vẫn tốt (người đọc panel cần biết job có từ bao giờ), nhưng điền sai
   * không còn gây báo giả nữa: một khi `jobFirstSeen` đã ghi được mốc cho job
   * thì ân hạn tính theo mốc đó, `since` chỉ còn là lối lùi.
   *
   * ⚠️ Đừng dùng `since` để "tắt" một cảnh báo phiền: nó không còn tác dụng đó
   * nữa, và trước kia thì đó chính là cách tự tạo điểm mù.
   */
  since?: string;
  /**
   * Job chạy bằng pg_cron: tên trong `cron.job`. Lịch sử chạy nằm ở
   * `cron.job_run_details`, KHÔNG có trong `cron_runs` — đọc qua RPC
   * `ops_pgcron_runs` (_patches/migration-ops-pgcron-runs.sql).
   */
  pgcronJob?: string;
  /**
   * Job chạy bằng GitHub Actions: tên file workflow trong `.github/workflows/`.
   *
   * 🔑 Job loại này KHÔNG đi qua `withCronLog` (nó chạy ngoài Vercel), nên nó
   * chỉ có mặt trong `cron_runs` nhờ tự ghi nhịp tim qua hàm edge `clip-ingest`
   * (`?job=1` — xem `scripts/job-heartbeat.mjs`). Không có nhịp tim đó thì cả
   * mắt xích này VẮNG MẶT trên panel, đúng lỗi gốc của track S4.
   *
   * ⚠️ Và vì thế nó KHÔNG có `path`/`edge` ⇒ panel không hiện nút "Chạy ngay":
   * bấm từ admin không kích được một workflow GitHub. Hiện nút rồi báo lỗi là
   * đúng cái bẫy "9 job hiện nút bấm rồi trả về Unknown job" đã ghi ở trên.
   */
  workflow?: string;
  /**
   * Ngưỡng "coi như đã chết" riêng cho job này (phút), ghi đè
   * `STALE_RUNNING_MINUTES`. CHỈ dùng cho job có thời gian chạy thật vượt xa
   * mức chung — `video-build` (GitHub Actions, render clip) đo được 48-98
   * phút/lượt, gấp 3-6 lần trần chung 15 phút, nên mọi lượt ĐANG chạy đều bị
   * báo "CHẾT GIỮA LƯỢT" oan trong lúc nó vẫn khoẻ.
   */
  staleMinutes?: number;
}

const H = 60;
const D = 24 * 60;

/**
 * Nguồn DUY NHẤT. Thêm cron mới trong `vercel.json` thì thêm ở đây luôn.
 *
 * ⚠️ HAI CÁI BẪY đã cắn một lần, đọc trước khi thêm dòng mới:
 *
 * 1. **Cron của Vercel chạy theo UTC.** `"0 3 * * *"` KHÔNG phải 3h sáng VN mà
 *    là 10h sáng VN. Bản đầu chép thẳng con số trong `vercel.json` vào `schedule`
 *    nên 4 job hiện sai giờ trên panel — lệch đúng 7 tiếng, đủ để nhìn vào sổ
 *    rồi kết luận sai xem job có chạy đúng hẹn không.
 *
 * 2. **`everyMinutes` là khoảng trống LỚN NHẤT giữa hai lượt, không phải khoảng
 *    trung bình.** Lịch chạy cụm (10·18·22h) có gap 8h → 4h → 12h; khai 8h thì
 *    ngưỡng quá hạn (1.5×) thành 12h, trùng khít gap thật, nên sáng nào job cũng
 *    bị báo trễ oan vài phút trước lượt chạy đầu ngày. Một bộ dò kêu nhầm mỗi
 *    ngày thì chẳng mấy chốc bị ngó lơ — hỏng y như khi nó im lặng.
 */
export const JOBS: JobSpec[] = [
  { key: 'cron-push', label: 'Push (web)', source: 'vercel', everyMinutes: D,
    schedule: '07:00 VN hằng ngày', sink: 'edge send-daily-push', path: '/api/cron-push' },
  // ── 5 job dưới đây TRƯỚC ĐÂY KHÔNG có trong sổ admin ──
  { key: 'ops-digest', label: 'Digest Vận Hành', source: 'vercel', everyMinutes: D,
    schedule: '07:30 VN hằng ngày', sink: 'Telegram admin + events', path: '/api/cron/ops-digest',
    since: '2026-07-28' },
  { key: 'cmo-digest', label: 'CMO Digest', source: 'vercel', everyMinutes: D,
    schedule: '08:00 VN hằng ngày', sink: 'Telegram admin', path: '/api/cron/cmo-digest' },
  { key: 'anomaly-alerts', label: 'Cảnh báo bất thường', source: 'vercel', everyMinutes: 3 * H,
    schedule: 'mỗi 3 giờ', sink: 'Telegram admin + events', path: '/api/cron/anomaly-alerts' },
  // Sinh ra sau sự cố 29/07 (Supabase bị hạ Pro→Free rồi pause, prod hỏng hơn
  // một ngày mà không ai được báo). Xem lib/ops/health-check.ts.
  { key: 'health-check', label: 'Canh prod còn sống', source: 'vercel', everyMinutes: 30,
    schedule: 'mỗi 30 phút', sink: 'Telegram admin', path: '/api/cron/health-check',
    since: '2026-07-29' },
  // Cảnh báo lỗi JS phía client gần-thời-gian-thực — xem lib/ops/error-alerts.ts.
  { key: 'error-alerts', label: 'Cảnh báo lỗi JS (client)', source: 'vercel', everyMinutes: 15,
    schedule: 'mỗi 15 phút', sink: 'Telegram admin + events', path: '/api/cron/error-alerts',
    since: '2026-09-08' },
  // Digest "dùng tool" mỗi 15 phút — xem lib/ops/tool-usage-alerts.ts. Đăng ký
  // mới + trả tiền báo NGAY tại chokepoint (lib/admin/alert.ts), KHÔNG qua cron.
  { key: 'tool-usage-alerts', label: 'Digest dùng tool (15 phút)', source: 'vercel', everyMinutes: 15,
    schedule: 'mỗi 15 phút', sink: 'Telegram + WhatsApp admin + events', path: '/api/cron/tool-usage-alerts',
    since: '2026-09-08' },
  // `since` từng ghi '2026-07-30' — SAI, code merge 01/08 21:57 VN (PR #347).
  // Chính dòng này đẻ ra cảnh báo giả lúc 22:00 cùng ngày; xem chú thích `since`.
  { key: 'prune-anon-trial', label: 'Dọn nhật ký dùng thử', source: 'vercel', everyMinutes: D,
    schedule: '09:00 VN hằng ngày', sink: 'anon_rail_hits + anon_preview_hits + luan_preview_cache',
    path: '/api/cron/prune-anon-trial',
    since: '2026-08-01' },
  // Refresh token Zalo dùng MỘT LẦN và chết sau ~3 tháng không dùng — xem
  // app/api/cron/zalo-token. Kênh chưa cấu hình thì chạy ra `skipped`.
  { key: 'zalo-token', label: 'Làm mới token Zalo OA', source: 'vercel', everyMinutes: D,
    schedule: '03:20 VN hằng ngày', sink: 'zalo_oa_tokens', path: '/api/cron/zalo-token',
    since: '2026-09-28' },
  // Tin nhắc chủ động cho người đã chat ở kênh — lib/channels/nudge.ts. Ngoài
  // 08–21h VN chạy ra `skipped` (vẫn ghi cron_runs). `since` = ngày merge.
  { key: 'chat-nudge', label: 'Tin nhắc kênh chat', source: 'vercel', everyMinutes: H,
    schedule: 'mỗi giờ (:07), gửi 08–21h VN', sink: 'chat_sessions.nudged_at + events', path: '/api/cron/chat-nudge',
    since: '2026-09-29' },
  // Bậc 1-3 của docs/GROWTH-DATA-PLAN.md — thay Windsor.ai. Snapshot GA4 +
  // Search Console + Clarity + Meta Ads mỗi ngày vào ext_metrics_daily; job
  // chưa từng chạy nên `since` = ngày merge, tránh bộ dò kêu ngay "CHƯA HỀ
  // chạy" (xem chú thích `since` ở trên).
  { key: 'ext-metrics', label: 'Kéo GA4 + GSC + Clarity + Meta Ads', source: 'vercel', everyMinutes: D,
    schedule: '05:00 VN hằng ngày', sink: 'ext_metrics_daily', path: '/api/cron/ext-metrics',
    since: '2026-09-15' },
  // Sinh hồ sơ Nghiệm Chứng bằng Claude API (5 người/lượt, ~100/đêm) → nc_ho_so. `since` = ngày merge.
  { key: 'nghiem-chung', label: 'Sinh hồ sơ Nghiệm Chứng (Claude API)', source: 'vercel', everyMinutes: D,
    schedule: '01:00–05:45 VN, mỗi 15 phút', sink: 'nc_ho_so · nc_loai_tru', path: '/api/cron/nghiem-chung',
    since: '2026-10-11' },
  // Sinh hồ sơ Xác Định Giờ Sinh bằng Claude API (5 người/lượt, 40/ngày) → nc_ho_so. `since` = ngày merge.
  { key: 'xac-dinh-gio-sinh', label: 'Sinh hồ sơ Xác Định Giờ Sinh (Claude API)', source: 'vercel', everyMinutes: D,
    schedule: '06:00–07:45 VN, mỗi 15 phút', sink: 'nc_ho_so · nc_loai_tru', path: '/api/cron/xac-dinh-gio-sinh',
    since: '2026-10-11' },
  // Reminder/cross-sell qua EMAIL — MẶC ĐỊNH TẮT (budget=0 trong app_config),
  // xem lib/marketing/email-reminder.ts / email-cross-sell.ts. `since` = ngày
  // merge: job chưa từng chạy nên cron_runs trống, thiếu mốc này bộ dò kêu
  // ngay "CHƯA HỀ chạy".
  // Sổ tiên tri GĐ2 (docs/DAC-TRUNG-PLAN.md) — nhắn Telegram lời phán đến hạn.
  { key: 'tien-tri-nhac', label: 'Thầy tự nhắn — Sổ tiên tri đến hạn', source: 'vercel', everyMinutes: D,
    schedule: '08:10 VN hằng ngày', sink: 'loi_tien_tri.nhac_at + Telegram', path: '/api/cron/tien-tri-nhac',
    since: '2026-09-28' },
  { key: 'email-cross-sell', label: 'Email — gợi ý tool liên quan', source: 'vercel',
    // T6 + CN: khoảng trống LỚN NHẤT là CN → T6 = 5 ngày.
    everyMinutes: 5 * D, schedule: 'T6 + CN 08:00 VN hằng tuần', sink: 'email_log', path: '/api/cron/email-cross-sell',
    since: '2026-09-14' },
  // Rút hàng đợi broadcast email nạp từ admin.html — xem
  // lib/marketing/email-broadcast.ts. Job vẫn "chạy" đều mỗi 15 phút dù không
  // có hàng đợi (trả `skipped`), khác 2 job trên vốn tắt hẳn bằng app_config.
  { key: 'email-broadcast-drain', label: 'Email — rút hàng đợi broadcast', source: 'vercel',
    everyMinutes: 15, schedule: 'mỗi 15 phút', sink: 'email_broadcast_queue', path: '/api/cron/email-broadcast-drain',
    since: '2026-09-14' },
  // ⏸ ĐÃ GỠ LỊCH 2026-11-11 (docs/nhat-ky/2026-11.md): cron-khao-luan, cron-master-write,
  // cron-daily-push, cron-khao-luan-tamly, thu-vien-build, tu-dien-sao-moi, topic-topup,
  // keyword-suggest, backlink-* (4), growth-accounts, growth-insights, autopilot-* (3),
  // media-build, seeding-build, content-pack, yt-drain, content-metrics, viral-seo-pages,
  // email-reminder-idle, email-abandoned-checkout; pg_cron auto-pipeline; Actions video-build.
  // Route vẫn nằm ở app/ — KHÔNG có trong sổ nên không bị báo "quá hạn". Để bật lại: đưa
  // lại dòng sổ (lấy từ git log của file này) VÀ dòng lịch tương ứng trong vercel.json.
];

export interface CronRun {
  job_key: string;
  status: string;
  started_at: string;
  note?: string | null;
}

/**
 * Số dòng `cron_runs` mỗi nơi phải nạp để `evaluateJobs` phán đúng. Dùng CHUNG
 * cho cả 3 chỗ đọc (cảnh báo 3h/lượt · digest vận hành · panel admin) — ba con
 * số chép tay là ba bộ dò nhìn ba cửa sổ khác nhau rồi kết luận khác nhau.
 *
 * VÌ SAO 1000 CHỨ KHÔNG PHẢI 300: cửa sổ là "N dòng gần nhất", nên MỘT job ồn
 * ào đủ sức đẩy các job khác ra ngoài, và job bị đẩy ra thì `evaluateJobs` đọc
 * thành "CHƯA HỀ chạy". Đo trên prod 30/07: 519/941 dòng là rác build-time
 * (xem migration-purge-fake-cron-runs.sql) và 315 dòng nữa của riêng `cron-push`
 * — 300 dòng gần nhất chỉ với tới 3 ngày trước, trong khi job TUẦN cần nhìn lại
 * tới 10,5 ngày (1,5 × chu kỳ) mới biết nó có trễ hay không.
 *
 * 1000 là trần `db-max-rows` mặc định của Supabase PostgREST — xin hơn cũng chỉ
 * nhận về 1000, nên đây là mức cao nhất còn trung thực.
 */
export const CRON_RUNS_LIMIT = 1000;

/**
 * `cron_runs` gần nhất, tối đa `perJob` dòng CHO MỖI job_key (RPC
 * `ops_recent_cron_runs`, xem `_patches/migration-ops-recent-cron-runs.sql`).
 *
 * THAY cho việc query thẳng "top N dòng gần nhất của TOÀN BẢNG" (đúng con số
 * `CRON_RUNS_LIMIT` cũ): job chạy mỗi 15 phút (error-alerts, tool-usage-alerts,
 * email-broadcast-drain) đủ sức sinh ~250 dòng/ngày, đẩy job TUẦN ra khỏi cửa
 * sổ 1000 dòng chỉ sau 3-4 ngày — `evaluateJobs` đọc thành "CHƯA HỀ chạy" cho
 * một job vẫn `ok` đều đặn. Lấy theo job_key thì job ồn ào không đụng được tới
 * cửa sổ của job khác.
 *
 * Best-effort: hỏng thì trả [], `evaluateJobs` lùi về "chưa có log" cho mọi
 * job — không được phép kéo sập panel Vận Hành hay digest.
 */
export async function fetchRecentCronRuns(perJob = 50): Promise<CronRun[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/rpc/ops_recent_cron_runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_per_job: perJob }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Lịch sử chạy pg_cron, trả về ĐÚNG shape `CronRun` để gộp thẳng vào mảng
 * truyền cho `evaluateJobs`. Xem _patches/migration-ops-pgcron-runs.sql.
 *
 * Best-effort: hỏng thì trả [] — thiếu nguồn này chỉ làm job pg_cron trông như
 * chưa chạy, KHÔNG được phép kéo sập panel Vận Hành hay digest.
 */
export async function fetchPgcronRuns(limit = 100): Promise<CronRun[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/rpc/ops_pgcron_runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_limit: limit }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Khoá `app_config` giữ mốc "lần đầu bộ dò nhìn thấy job này". */
const FIRST_SEEN_KEY = 'ops.job_first_seen';

/**
 * Đọc mốc first-seen, TỰ GHI cho job nào chưa có, rồi trả về bản đồ đầy đủ.
 *
 * VÌ SAO CẦN: ân hạn cho job mới trước đây neo vào `since` — một ngày gõ tay
 * trong code. Gõ sớm hơn ngày merge là bộ dò bắn báo động ngay lượt quét đầu
 * tiên sau deploy, cho một job còn chưa tới lượt chạy. Đã xảy ra với
 * `prune-anon-trial` (cảnh báo bắn 3 phút sau khi deploy). Mốc này thì máy tự
 * ghi nên không sai được: nó luôn ≥ thời điểm job có mặt trong bản build đang
 * chạy.
 *
 * CHỈ THÊM, KHÔNG BAO GIỜ SỬA khoá đã có — đó là điều khiến nó dùng được làm
 * mốc. Ghi đè mỗi lượt quét thì mọi job trắng log sẽ vĩnh viễn "vừa mới thấy"
 * và `overdue` không bao giờ kêu nữa, tức đổi một báo giả lấy một điểm mù, hệt
 * cái bẫy dòng `running` treo của `withCronLog`.
 *
 * Idempotent: không có khoá mới thì KHÔNG gọi ghi. Best-effort toàn phần —
 * hỏng thì trả về những gì đọc được (hoặc {}), để `evaluateJobs` lùi về đúng
 * hành vi cũ là neo vào `since`.
 */
export async function syncJobFirstSeen(): Promise<Record<string, string>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return {};
  const headers = { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };

  let seen: Record<string, string> = {};
  try {
    const res = await fetch(`${url}/rest/v1/app_config?key=eq.${FIRST_SEEN_KEY}&select=value`, {
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      const rows = await res.json();
      const v = rows?.[0]?.value;
      if (v && typeof v === 'object' && !Array.isArray(v)) seen = v as Record<string, string>;
    }
  } catch {
    return {};
  }

  const missing = JOBS.filter((j) => !seen[j.key]);
  if (!missing.length) return seen;

  const now = new Date().toISOString();
  const merged = { ...seen };
  for (const j of missing) merged[j.key] = now;
  try {
    await fetch(`${url}/rest/v1/app_config`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: FIRST_SEEN_KEY, value: merged }),
    });
  } catch {
    /* ghi hỏng → vẫn dùng `merged` cho lượt này; lượt sau ghi lại */
  }
  return merged;
}

export interface JobHealth extends JobSpec {
  /** Bấm chạy tay được — SUY TỪ `path`/`edge`, không phải một cờ khai riêng.
   *  Khai riêng thì bật cờ mà quên đường dẫn là mọc ra một nút chết. */
  trigger: boolean;
  lastRun: string | null;
  lastStatus: string | null;
  /** Quá HẠN vì trễ hơn 1.5× chu kỳ (đệm cho lệch giờ chạy). */
  overdue: boolean;
  minutesLate: number;
  /** Số lượt `skip` LIÊN TIẾP gần nhất. */
  skipStreak: number;
  /** Chưa có log nhưng CHƯA tới lượt chạy đầu tiên → cố ý không báo động. */
  awaitingFirstRun: boolean;
  /**
   * Lượt gần nhất KẾT THÚC bằng lỗi.
   *
   * Trước đây đây là một lỗ hổng im lặng hoàn toàn: một job bắn đúng lịch mà
   * lượt nào cũng `error` thì `overdue` không kêu (có log mới), `skipStreak`
   * cũng không (status là error chứ không phải skip) — nên nó hỏng đều đặn mà
   * không cảnh báo nào chạm tới. Cùng họ với vụ CMO Digest chết 14 ngày.
   */
  failing: boolean;
  /**
   * Lượt gần nhất còn treo ở `running` quá lâu → gần như chắc chắn đã bị GIẾT
   * NGANG (hết maxDuration, hết bộ nhớ, nền tảng 500) chứ không phải đang chạy.
   *
   * Đây là mặt còn lại của dòng nhịp tim trong lib/cron/log.ts. Có nó thì lượt
   * chết mới phân biệt được với lượt không bắn; KHÔNG có nó thì dòng `running`
   * treo lại làm `lastRun` luôn mới và bịt miệng `overdue` vĩnh viễn.
   */
  stuck: boolean;
}

/**
 * Quá mốc này mà dòng `running` chưa được chốt thì coi như lượt chạy đã chết.
 *
 * 15 phút là dư dả tới mức không thể báo oan: job nặng nhất trong sổ
 * (cron-master-write) đo được trung bình 21,9s, p90 26,1s, dài nhất 30,2s —
 * tức trần này gấp ~30 lần lượt chạy dài nhất từng thấy. Trần Vercel cho một
 * lượt gọi cũng thấp hơn nhiều, nên không có lượt chạy thật nào chạm tới đây.
 */
export const STALE_RUNNING_MINUTES = 15;

/**
 * Đối chiếu sổ với log thật.
 *
 * Hệ số 1.5× là đệm: cron nhà cung cấp hiếm khi chạy đúng phút, và job hằng
 * ngày lệch vài chục phút là bình thường. Dưới 1.5× mà đã báo thì mỗi tuần
 * mấy lần báo giả, rồi cảnh báo thật cũng bị bỏ qua theo.
 *
 * `runs` gộp CẢ hai nguồn: bảng `cron_runs` (job Vercel) và RPC
 * `ops_pgcron_runs` (job pg_cron — xem `pgcronJob`). Truyền thiếu nguồn nào
 * thì job thuộc nguồn đó lại thành "chưa hề chạy", đúng cái bẫy vừa vá.
 *
 * `firstSeen` từ `syncJobFirstSeen()`. Bỏ trống thì hàm vẫn chạy đúng như bản
 * cũ (neo ân hạn vào `since`) — cố ý giữ thuần và đồng bộ để 3 nơi gọi không
 * phải đổi kiến trúc, và để test gọi được mà không cần mạng.
 */
export function evaluateJobs(runs: CronRun[], firstSeen: Record<string, string> = {}): JobHealth[] {
  const byKey = new Map<string, CronRun[]>();
  for (const r of runs) {
    const arr = byKey.get(r.job_key) || [];
    arr.push(r);
    byKey.set(r.job_key, arr);
  }
  const now = Date.now();

  return JOBS.map((spec) => {
    // Job pg_cron để lại vết dưới TÊN pg_cron của nó, không phải key trong sổ.
    const logKey = spec.pgcronJob || spec.key;
    // `runs` đã được sắp mới→cũ từ query; sắp lại cho chắc.
    const rs = (byKey.get(logKey) || []).slice().sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    const last = rs[0] || null;
    const lastMs = last ? new Date(last.started_at).getTime() : 0;
    const minutesLate = last ? Math.max(0, Math.round((now - lastMs) / 60000) - spec.everyMinutes) : Infinity;

    // Đếm skip LIÊN TIẾP từ lần chạy gần nhất trở về trước. Một job `skip` đều
    // đặn hết lần này tới lần khác KHÔNG phải "bình thường" — nó đang không làm
    // được việc của nó, chỉ là im lặng thay vì báo lỗi (đúng vụ CMO Digest).
    // Bỏ qua dòng `running` ở đầu: trong mấy giây job đang chạy, nó không nói
    // được gì về chuỗi skip trước đó, mà để nó chặn thì streak đọc thành 0 và
    // cảnh báo skip biến mất đúng lúc job đang chạy.
    let skipStreak = 0;
    for (const r of rs) {
      if (r.status === 'running') continue;
      if (r.status === 'skip') skipStreak++;
      else break;
    }

    // Job vừa đưa vào sổ mà chưa có log thì CHƯA phải hỏng — nhiều khả năng
    // chỉ là chưa tới lượt chạy đầu tiên. Cho đúng một cửa sổ 1.5× chu kỳ kể
    // từ mốc đăng ký, hết cửa sổ đó mà vẫn trắng log thì mới là bất thường.
    // Giữ nguyên chủ ý gốc ("không log cũng cần biết"), chỉ bỏ phần kêu oan.
    //
    // Mốc: `firstSeen` (máy tự ghi) THAY THẾ `since` (gõ tay) khi đã có, chứ
    // KHÔNG lấy cái muộn hơn giữa hai cái.
    //
    // Bản đầu của bản vá này lấy `max(since, firstSeen)` và test bắt được lỗ:
    // như vậy thì sửa `since` sang một ngày TƯƠNG LAI là bịt được miệng bộ dò
    // cho một job đã chết — tự tay tạo đúng loại điểm mù mà cả track S4 sinh ra
    // để chống. `firstSeen` do máy ghi và không bao giờ bị sửa, nên một khi đã
    // có thì nó là mốc đáng tin duy nhất; `since` chỉ còn là lối lùi cho quãng
    // trước lượt đồng bộ đầu tiên (và cho test gọi hàm mà không cần mạng).
    //
    // Hệ quả ở lượt deploy ĐẦU TIÊN của cơ chế: mọi job đang trắng log được cấp
    // lại một cửa sổ ân hạn tính từ bây giờ. Cố ý chấp nhận — đổi lại là không
    // job nào bị kêu oan lúc vừa merge nữa.
    const sinceMs = spec.since ? Date.parse(spec.since + 'T00:00:00+07:00') : NaN;
    const seenMs = firstSeen[spec.key] ? Date.parse(firstSeen[spec.key]) : NaN;
    const anchorMs = Number.isFinite(seenMs) ? seenMs : sinceMs;
    const awaitingFirstRun =
      !last && Number.isFinite(anchorMs) && now - anchorMs < spec.everyMinutes * 1.5 * 60000;

    const stuck =
      last?.status === 'running' &&
      now - lastMs > (spec.staleMinutes ?? STALE_RUNNING_MINUTES) * 60000;
    const failing = last?.status === 'error';

    return {
      ...spec,
      trigger: Boolean(spec.path || spec.edge),
      lastRun: last?.started_at || null,
      lastStatus: last?.status || null,
      // Chưa từng có log cũng là quá hạn: job khai trong sổ mà không để lại vết
      // nào thì hoặc không chạy, hoặc không ghi log — cả hai đều cần biết.
      // Ngoại lệ DUY NHẤT: job mới đăng ký, chưa tới lượt chạy đầu (ở trên).
      overdue: awaitingFirstRun ? false : !last || now - lastMs > spec.everyMinutes * 1.5 * 60000,
      minutesLate: Number.isFinite(minutesLate) ? minutesLate : -1,
      skipStreak,
      awaitingFirstRun,
      failing,
      stuck,
    };
  });
}
