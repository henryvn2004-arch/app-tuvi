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

import { evaluateJobs, fetchPgcronRuns, type CronRun } from './jobs';
import { checkEnv } from './preflight';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

async function rpc<T>(fn: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
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

export interface OpsDigest {
  text: string;
  /** true nếu có ít nhất một mục cần Henry để mắt — panel dùng để tô màu. */
  hasIssues: boolean;
}

/** Dựng digest vận hành 24h. Thuần dữ liệu, không gọi LLM. */
export async function buildOpsDigest(): Promise<OpsDigest> {
  const [tools, recon, runsRes, pgcronRuns] = await Promise.all([
    rpc<ToolRow[]>('tool_health', { p_hours: 24 }, []),
    rpc<ReconRow[]>('payment_reconcile', { p_days: 30 }, []),
    fetch(
      `${SUPABASE_URL}/rest/v1/cron_runs?select=job_key,status,started_at,note&order=started_at.desc&limit=300`,
      { headers: SB_HEADERS },
    ).catch(() => null),
    // Job pg_cron (auto-pipeline) không ghi cron_runs — thiếu nguồn này thì nó
    // luôn hiện "chưa hề chạy" dù thực tế chạy đủ mỗi ngày.
    fetchPgcronRuns(),
  ]);

  const runs: CronRun[] = [...(runsRes && runsRes.ok ? await runsRes.json() : []), ...pgcronRuns];
  const jobs = evaluateJobs(runs);
  const envs = checkEnv();

  const lines: string[] = [];
  let issues = 0;

  // ── Tool ──
  const broken = tools.filter((t) => Number(t.errors) > 0).sort((a, b) => b.error_rate - a.error_rate);
  const totalRuns = tools.reduce((s, t) => s + Number(t.attempts || 0), 0);
  if (!tools.length) {
    // Nói rõ "chưa có dữ liệu" thay vì để trống — trống dễ đọc nhầm thành "khoẻ".
    lines.push('🩺 TOOL: chưa ghi nhận lượt chạy nào trong 24h (không đồng nghĩa mọi tool đều khoẻ).');
  } else if (!broken.length) {
    lines.push(`🩺 TOOL: ${tools.length} tool · ${totalRuns} lượt · không có lỗi hệ thống nào.`);
  } else {
    issues += broken.length;
    lines.push(`🩺 TOOL — ${broken.length}/${tools.length} tool có lỗi hệ thống (${totalRuns} lượt/24h):`);
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

  // ── Tiền ──
  const atRisk = recon.reduce((s, r) => s + Number(r.credits_at_risk || 0), 0);
  if (atRisk > 0) {
    issues++;
    lines.push(`\n💰 TIỀN — ${atRisk} Lượng đã thu mà chưa giao và chưa hoàn:`);
    for (const r of recon.filter((x) => Number(x.credits_at_risk) > 0)) {
      lines.push(`   • ${r.tool_id}: ${r.undelivered}/${r.charges} lượt (${r.credits_at_risk} Lượng)`);
    }
  } else {
    lines.push('\n💰 TIỀN: trừ Lượng và giao hàng khớp nhau, không có Lượng nào treo.');
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
