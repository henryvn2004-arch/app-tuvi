// lib/ops/digest.ts
// ============================================================
// S5 (track COO) — DIGEST VẬN HÀNH: gói mọi thứ COO đo thành một bản đọc được.
//
// HAI QUYẾT ĐỊNH THIẾT KẾ:
//
// 1. KHÔNG dùng LLM. CMO Digest (M0.2) cần LLM vì nó diễn giải xu hướng kinh
//    doanh. Digest vận hành là SỰ KIỆN ĐÃ RỒI — "tool X hỏng 18%", "job Y trễ
//    3 ngày", "44 Lượng đang treo". Đưa qua LLM chỉ thêm tiền, thêm độ trễ, và
//    thêm rủi ro nó diễn đạt sai một con số vốn đã chính xác. Dựng thẳng từ dữ
//    liệu, không qua trung gian.
//
// 2. GỬI ĐỀU ĐẶN kể cả khi mọi thứ bình thường. Nghe ngược với "đừng spam",
//    nhưng đây đúng là bài học P0-1: một digest CHỈ gửi khi có vấn đề thì
//    KHÔNG PHÂN BIỆT ĐƯỢC với một digest đã chết. Nó phải là NHỊP TIM —
//    có nó đều đặn thì sự im lặng mới trở thành tín hiệu có nghĩa.
//    (Cảnh báo tức thời của S2 vẫn im khi không có gì — hai vai khác nhau:
//     S2 là chuông báo cháy, cái này là điểm danh.)
// ============================================================

import { CRON_RUNS_LIMIT, evaluateJobs, fetchPgcronRuns, syncJobFirstSeen, type CronRun } from './jobs';
import { checkEnv } from './preflight';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/**
 * ⚠️ `cache: 'no-store'` BẮT BUỘC trên mọi lượt đọc của file này — cùng lý do
 * đã ghi dài ở `lib/marketing/anomaly-alerts.ts`: Next nhớ kết quả GET kể cả
 * trong route `force-dynamic`, và một bản điểm danh đọc qua cache thì câu
 * "12 job, tất cả chạy đúng lịch" không còn nghĩa gì — nó chỉ nói rằng ảnh cũ
 * trông ổn. Digest 07:30 ngày 30/07 báo đúng câu đó, 2,5 giờ trước khi cảnh báo
 * nói ngược lại về cùng một bảng.
 */
const SB_FRESH = { headers: SB_HEADERS, cache: 'no-store' } as const;

async function rpc<T>(fn: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
      cache: 'no-store',
      body: JSON.stringify(params),
    });
    return r.ok ? ((await r.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface ToolRow {
  tool_id: string;
  attempts: number;
  errors: number;
  error_rate: number;
  p95_ms: number;
  last_error: string | null;
}
interface ReconRow {
  tool_id: string;
  charges: number;
  undelivered: number;
  credits_at_risk: number;
}

interface SecurityAudit {
  ham_ho_cho_anon?: unknown[];
  bom_su_kien?: unknown[];
  thiet_bi_cay?: unknown[];
  referral_bat_thuong?: unknown[];
  lech_so_du?: unknown[];
}
interface ChannelRow {
  platform: string;
  total: number;
  errors: number;
  error_rate: number;
}
interface ConfigRow {
  key: string;
  value: unknown;
}

/**
 * Xếp theo mức NGHIÊM TRỌNG, không theo thứ tự trong RPC — dòng đầu tiên là thứ
 * Henry đọc trước. `ham_ho_cho_anon` đứng đầu vì EXECUTE cho PUBLIC là mặc định
 * DỰNG SẴN của Postgres và `ALTER DEFAULT PRIVILEGES` không gỡ được, nên MỌI hàm
 * mới đều hở cho tới khi có người REVOKE — đây là lỗi TÁI PHÁT, không phải sự cố
 * một lần. `lech_so_du` đứng thứ hai vì đó là Lượng tự sinh ra không giao dịch
 * nào giải thích.
 */
const SEC_FIELDS: Array<[keyof SecurityAudit, string]> = [
  ['ham_ho_cho_anon', 'hàm SECURITY DEFINER còn hở cho anon'],
  ['lech_so_du', 'ví lệch số dư (Lượng tự sinh)'],
  ['bom_su_kien', 'bơm sự kiện'],
  ['thiet_bi_cay', 'thiết bị cày quà đăng ký'],
  ['referral_bat_thuong', 'referral bất thường'],
];

/**
 * ⚠️ BASELINE ĐÃ ĐIỀU TRA XONG — nêu MỘT dòng, KHÔNG dựng thành sự cố mới.
 *
 * Trước đây khối TIỀN bật cờ với MỌI `credits_at_risk > 0`, mà con số đó đứng
 * yên ở 44 từ tháng 7 (2 lượt test của chính Henry trên `chan-dung-vo-chong`,
 * không phải khách thật, không cần hoàn). Hệ quả: tiêu đề Telegram sáng nào cũng
 * "CÓ VIỆC CẦN XEM" — đúng kiểu mỏi cảnh báo mà file này ghi comment cảnh giác ở
 * đầu. Một bộ điểm danh kêu mỗi ngày thì chẳng mấy chốc bị ngó lơ, hỏng y như
 * khi nó im.
 */
const KNOWN_RISK_TOOL = 'chan-dung-vo-chong';
const KNOWN_CREDITS_AT_RISK = 44;

/**
 * Kho video lỗi upload YouTube. Căn nguyên KHÔNG phải token hết hạn mà là OAuth
 * consent screen còn ở chế độ **Testing** trong Google Cloud ⇒ refresh token
 * chết sau 7 ngày. Cấp token mới chỉ vá triệu chứng — phải PUBLISH APP.
 */
const KNOWN_YT_ERROR = 86;
/** Video đã có audio nhưng chưa render (khâu Railway mix). Đo 11/08: 41. */
const YT_PENDING_WARN = 60;

/**
 * Cổng ĐỐT TIỀN. Bật nhầm là mất tiền thật ngay lượt cron kế — `que_images.gen`
 * đang để `quality=high` (~4.1k đ mỗi bức). Cả hai PHẢI `enabled=false` khi
 * không có ai đang chủ động chạy batch.
 */
const MONEY_GATES = ['que_images.gen', 'chan_dung_thu.gen'] as const;

/**
 * Khoá đã GỠ CÓ CHỦ ĐÍCH. Sống lại nghĩa là có code đang đọc lại khoá chết rồi
 * im lặng rơi về mặc định SAI 20% (giá thật 829đ, mặc định cũ 1000đ) — loại lỗi
 * không ném exception, không ai thấy.
 */
const DEAD_CONFIG_KEYS = ['credits.vnd_per_credit'] as const;

/** Đọc bảng qua PostgREST. Cùng luật `no-store` như mọi lượt đọc trong file này. */
async function sel<T>(path: string, fallback: T): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return fallback;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, SB_FRESH);
    return r.ok ? ((await r.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

function tally(rows: Array<Record<string, unknown>>, field: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r[field] == null ? '' : String(r[field]);
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export interface OpsDigest {
  text: string;
  /** true nếu có ít nhất một mục cần Henry để mắt — panel dùng để tô màu. */
  hasIssues: boolean;
}

/** Dựng digest vận hành 24h. Thuần dữ liệu, không gọi LLM. */
export async function buildOpsDigest(): Promise<OpsDigest> {
  const [tools, recon, runsRes, pgcronRuns, sec, chans, cfgRows, mediaRows, ytRows] = await Promise.all([
    rpc<ToolRow[]>('tool_health', { p_hours: 24 }, []),
    rpc<ReconRow[]>('payment_reconcile', { p_days: 30 }, []),
    fetch(
      `${SUPABASE_URL}/rest/v1/cron_runs?select=job_key,status,started_at,note` +
        `&order=started_at.desc&limit=${CRON_RUNS_LIMIT}`,
      SB_FRESH,
    ).catch(() => null),
    // Job pg_cron (auto-pipeline) không ghi cron_runs — thiếu nguồn này thì nó
    // luôn hiện "chưa hề chạy" dù thực tế chạy đủ mỗi ngày.
    fetchPgcronRuns(),
    // Ngưỡng khai TRÙNG KHÍT với routine COO 07:00 đọc cùng hàm này. Hai bản báo
    // cáo cùng buổi sáng mà chạy hai ngưỡng khác nhau thì sớm muộn nói ngược
    // nhau về cùng một sự việc — đúng chuyện đã xảy ra hôm 30/07 giữa digest và
    // cảnh báo khi chúng đọc hai bản cache khác nhau.
    rpc<SecurityAudit | null>(
      'security_audit',
      { p_flood_events: 300, p_device_users: 5, p_referral_burst: 10 },
      null,
    ),
    rpc<ChannelRow[]>('channel_error_rate', { p_hours: 24 }, []),
    sel<ConfigRow[]>('app_config?select=key,value', []),
    sel<Array<Record<string, unknown>>>('media_posts?select=status&limit=5000', []),
    sel<Array<Record<string, unknown>>>('van_dap?select=yt_status&yt_status=not.is.null&limit=5000', []),
  ]);

  const runs: CronRun[] = [...(runsRes && runsRes.ok ? await runsRes.json() : []), ...pgcronRuns];
  // Cùng bản đồ first-seen với cảnh báo 3h/lượt — hai bộ dò đọc hai mốc khác
  // nhau thì digest 07:30 và cảnh báo 10:00 lại nói ngược nhau về CÙNG một job,
  // đúng chuyện đã xảy ra hôm 30/07 khi chúng nhìn hai bản cache khác nhau.
  const jobs = evaluateJobs(runs, await syncJobFirstSeen());
  const envs = checkEnv();

  const lines: string[] = [];
  let issues = 0;

  // ── Bảo mật ──
  // Đứng ĐẦU báo cáo cùng khối Tiền: đó là hai thứ hỏng thì không lấy lại được.
  // Tool lỗi hay job trễ thì chạy lại được; một hàm hở cho anon hay một ví lệch
  // số dư thì thiệt hại đã xảy ra rồi.
  if (!sec) {
    // KHÔNG được im. Đọc hụt mà bỏ qua thì bản điểm danh nói "sạch" trong khi
    // thật ra nó chưa hề nhìn — mù mà tưởng khoẻ đúng là lỗi hệ này sinh ra để tránh.
    issues++;
    lines.push('🔒 BẢO MẬT: KHÔNG đọc được security_audit ⇒ coi như CHƯA KIỂM (không phải sạch).');
  } else {
    const hits = SEC_FIELDS.map(
      ([k, label]) => [label, (sec[k] as unknown[] | undefined) || []] as const,
    ).filter(([, arr]) => arr.length > 0);
    if (!hits.length) {
      lines.push(`🔒 BẢO MẬT: ${SEC_FIELDS.length}/${SEC_FIELDS.length} mục sạch.`);
    } else {
      issues += hits.length;
      lines.push('🔒 BẢO MẬT — CÓ MỤC KHÔNG RỖNG:');
      for (const [label, arr] of hits) lines.push(`   • ${label}: ${arr.length} mục`);
    }
  }

  // ── Tiền ──
  const atRisk = recon.reduce((s, r) => s + Number(r.credits_at_risk || 0), 0);
  const riskRows = recon.filter((r) => Number(r.credits_at_risk) > 0);
  // Tool LẠ có Lượng treo là chuyện mới, kể cả khi tổng chưa vượt baseline —
  // baseline chỉ bao đúng `chan-dung-vo-chong`, không bao cả hệ thống.
  const riskNewTool = riskRows.filter((r) => r.tool_id !== KNOWN_RISK_TOOL);
  if (atRisk > KNOWN_CREDITS_AT_RISK || riskNewTool.length) {
    issues++;
    lines.push(`\n💰 TIỀN — ${atRisk} Lượng đã thu mà chưa giao và chưa hoàn:`);
    for (const r of riskRows) {
      lines.push(`   • ${r.tool_id}: ${r.undelivered}/${r.charges} lượt (${r.credits_at_risk} Lượng)`);
    }
  } else if (atRisk > 0) {
    lines.push(`\n💰 TIỀN: vẫn ${atRisk} Lượng cũ trên ${KNOWN_RISK_TOOL} (lượt test tháng 7, đã biết).`);
  } else {
    lines.push('\n💰 TIỀN: trừ Lượng và giao hàng khớp nhau, không có Lượng nào treo.');
  }

  // ── Tool ──
  const broken = tools.filter((t) => Number(t.errors) > 0).sort((a, b) => b.error_rate - a.error_rate);
  const totalRuns = tools.reduce((s, t) => s + Number(t.attempts || 0), 0);
  if (!tools.length) {
    // Nói rõ "chưa có dữ liệu" thay vì để trống — trống dễ đọc nhầm thành "khoẻ".
    lines.push('\n🩺 TOOL: chưa ghi nhận lượt chạy nào trong 24h (không đồng nghĩa mọi tool đều khoẻ).');
  } else if (!broken.length) {
    lines.push(`\n🩺 TOOL: ${tools.length} tool · ${totalRuns} lượt · không có lỗi hệ thống nào.`);
  } else {
    issues += broken.length;
    lines.push(`\n🩺 TOOL — ${broken.length}/${tools.length} tool có lỗi hệ thống (${totalRuns} lượt/24h):`);
    for (const t of broken.slice(0, 5)) {
      lines.push(`   • ${t.tool_id}: ${t.error_rate}% (${t.errors}/${t.attempts})`);
      if (t.last_error) lines.push(`     ↳ ${t.last_error}`);
    }
  }

  // ── Job ──
  // `stuck` loại khỏi `overdue` — cùng lý do như trong anomaly-alerts: một lượt
  // treo lâu thoả cả hai, kể hai lần cho một sự cố làm digest đọc như đang có
  // hai vấn đề.
  const stuck = jobs.filter((j) => j.stuck);
  const overdue = jobs.filter((j) => j.overdue && !j.stuck);
  const failing = jobs.filter((j) => j.failing);
  const skipping = jobs.filter((j) => j.skipStreak >= 3);
  if (!stuck.length && !overdue.length && !failing.length && !skipping.length) {
    lines.push(`\n⏰ JOB: ${jobs.length} job, tất cả chạy đúng lịch.`);
  } else {
    issues += stuck.length + overdue.length + failing.length + skipping.length;
    lines.push(
      `\n⏰ JOB — ${stuck.length} chết giữa lượt, ${overdue.length} quá hạn, ` +
        `${failing.length} lượt cuối lỗi, ${skipping.length} skip liên tiếp:`,
    );
    for (const j of stuck) lines.push(`   • ${j.label}: CHẾT GIỮA LƯỢT (nhịp tim còn treo)`);
    for (const j of overdue) {
      lines.push(`   • ${j.label}: ${j.lastRun ? 'trễ so với lịch ' + j.schedule : 'CHƯA HỀ có log'}`);
    }
    for (const j of failing) lines.push(`   • ${j.label}: lượt gần nhất LỖI`);
    for (const j of skipping) lines.push(`   • ${j.label}: skip ${j.skipStreak} lượt liên tiếp`);
  }

  // ── Phân phối ──
  const badChans = chans.filter((c) => Number(c.total) >= 20 && Number(c.error_rate) > 8);
  const media = tally(mediaRows, 'status');
  const yt = tally(ytRows, 'yt_status');
  const queued = media.queued || 0;
  const live = media.live || 0;
  const ytErr = yt.error || 0;
  const ytPending = yt.pending || 0;
  const distLines: string[] = [];

  if (badChans.length) {
    issues += badChans.length;
    for (const c of badChans) {
      distLines.push(`   • kênh ${c.platform}: lỗi ${c.error_rate}% (${c.errors}/${c.total})`);
    }
  }
  // 🪤 Đọc theo CẶP (queued, live), đừng đọc `queued` một mình. Bài bị chặn CỐ Ý
  // giữ nguyên `queued` chứ KHÔNG đánh `error` (thiết kế M3, để một token hỏng
  // không làm mất bài) ⇒ **0 dòng `error` không có nghĩa là ổn**.
  if (queued > 0 && live === 0) {
    issues++;
    distLines.push(
      `   • media_posts: ${queued} bài kẹt, 0 bài đã đăng ⇒ KÊNH BỊ CHẶN ` +
        `(thiếu FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN hoặc chưa có quyền pages_manage_posts) — KHÔNG phải trần publish`,
    );
  } else if (queued > 0) {
    // Chỉ tới nhánh này mới đáng nghi trần: đã có bài đi được mà vẫn dồn.
    distLines.push(`   • media_posts: ${queued} chờ / ${live} đã đăng — kiểm social.publish_daily ≥ build_daily × số kênh`);
  }
  if (ytErr > KNOWN_YT_ERROR) {
    issues++;
    distLines.push(`   • van_dap: ${ytErr} video lỗi upload (tăng so với mốc ${KNOWN_YT_ERROR}) — căn nguyên: OAuth consent screen còn ở chế độ Testing, phải PUBLISH APP chứ không phải cấp token mới`);
  }
  if (ytPending > YT_PENDING_WARN) {
    issues++;
    distLines.push(`   • van_dap: ${ytPending} video có audio mà chưa render (khâu Railway mix) — máy vẫn đẻ thêm mỗi ngày`);
  }
  if (!distLines.length) {
    lines.push(
      `\n📣 PHÂN PHỐI: ${queued} bài chờ đăng · ${live} đã đăng · ${ytErr} video lỗi YouTube (mốc cũ) · ${ytPending} chờ render.`,
    );
  } else {
    lines.push('\n📣 PHÂN PHỐI — có mục cần xem:');
    lines.push(...distLines);
  }

  // ── Cổng đốt tiền & khoá cấu hình ──
  const cfg = new Map(cfgRows.map((r) => [r.key, r.value]));
  const gatesOn = MONEY_GATES.filter((k) => (cfg.get(k) as { enabled?: boolean } | undefined)?.enabled === true);
  const revived = DEAD_CONFIG_KEYS.filter((k) => cfg.has(k));
  // ⚠️ `marketing.autopilot_enabled` VẮNG MẶT trong app_config là ĐÚNG — code
  // fail-safe về false khi thiếu khoá. Bắt lỗi "thiếu khoá" ở đây sẽ đẻ một cảnh
  // báo oan MỖI SÁNG. Chỉ quan tâm khi nó xuất hiện và bằng true.
  const autopilotLive = cfg.get('marketing.autopilot_enabled') === true;
  if (gatesOn.length || revived.length || autopilotLive) {
    issues += gatesOn.length + revived.length + (autopilotLive ? 1 : 0);
    lines.push('\n🤖 CỔNG — CÓ CÔNG TẮC ĐANG MỞ:');
    for (const k of gatesOn) lines.push(`   • ${k}.enabled = true — cổng ĐỐT TIỀN, mỗi lượt cron gọi model ảnh là mất tiền thật`);
    for (const k of revived) lines.push(`   • khoá đã gỡ "${k}" SỐNG LẠI — có code đang đọc nó rồi rơi về mặc định sai`);
    if (autopilotLive) lines.push('   • marketing.autopilot_enabled = true — autopilot đang hành động THẬT');
  } else {
    lines.push('\n🤖 CỔNG: 2 cổng đốt tiền đều tắt, autopilot vẫn shadow, không khoá chết nào sống lại.');
  }

  // ── Cấu hình ──
  const missing = envs.filter((e) => e.critical && !e.present);
  if (missing.length) {
    issues += missing.length;
    lines.push(`\n🔧 CẤU HÌNH — thiếu ${missing.length} biến BẮT BUỘC:`);
    for (const e of missing) lines.push(`   • ${e.key} — ${e.feature}`);
  } else {
    lines.push('\n🔧 CẤU HÌNH: đủ toàn bộ biến bắt buộc.');
  }

  return {
    text: lines.join('\n'),
    hasIssues: issues > 0,
  };
}

/** Lưu digest vào `events` để panel Vận Hành đọc — kể cả khi không gửi được. */
export async function logOpsDigest(d: OpsDigest, delivered: boolean): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        event_type: 'ops_digest',
        platform: 'web',
        meta: { text: d.text, has_issues: d.hasIssues, delivered },
      }),
    });
  } catch {
    /* best-effort */
  }
}
