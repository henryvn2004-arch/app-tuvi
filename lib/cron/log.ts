// lib/cron/log.ts
// Ghi 1 dòng vào public.cron_runs mỗi lần một cron chạy (Vercel/pg_cron/edge).
// Dùng service key → bypass RLS (bảng khoá anon/authenticated). Nuốt mọi lỗi:
// KHÔNG bao giờ để việc logging làm hỏng chính cron. Admin đọc lại qua
// /api/payment?action=admin-cron-runs. Cặp với panel "Cron & Jobs" (admin.html).

export type CronRunStatus = 'ok' | 'error' | 'skip' | 'running';

export interface CronRunInput {
  job_key: string;
  source?: 'vercel' | 'pgcron' | 'edge';
  status?: CronRunStatus;
  started_at?: string; // ISO
  finished_at?: string; // ISO
  duration_ms?: number;
  note?: string;
}

export async function logCronRun(run: CronRunInput): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return; // chưa cấu hình → im lặng, không cản cron
  try {
    await fetch(`${url}/rest/v1/cron_runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        job_key: run.job_key,
        source: run.source ?? 'vercel',
        status: run.status ?? 'ok',
        started_at: run.started_at ?? new Date().toISOString(),
        finished_at: run.finished_at ?? new Date().toISOString(),
        duration_ms: run.duration_ms ?? null,
        note: (run.note ?? '').slice(0, 500) || null,
      }),
    });
  } catch {
    // nuốt: logging không được phép làm hỏng cron
  }
}

// Bọc 1 handler cron: đo thời gian, đọc kết quả JSON (ok:false → error), ghi log,
// rồi trả NGUYÊN response gốc. Mọi nhánh return của handler đều được log 1 chỗ.
export async function withCronLog(
  job_key: string,
  source: 'vercel' | 'pgcron' | 'edge',
  handler: () => Promise<Response>,
): Promise<Response> {
  const started_at = new Date().toISOString();
  const t0 = Date.now();
  let status: CronRunStatus = 'ok';
  let note = '';
  let resp: Response;
  try {
    resp = await handler();
    if (!resp.ok) status = 'error';
    try {
      const j = await resp.clone().json();
      if (j && typeof j === 'object') {
        if (j.ok === false || j.error) { status = 'error'; note = String(j.error ?? 'error'); }
        else if (j.skipped) { status = 'skip'; note = String(j.skipped); }
        else {
          // tóm tắt vài trường hữu ích nếu có
          const bits: string[] = [];
          for (const k of ['sent', 'failed', 'message', 'note', 'count', 'day', 'results']) {
            if (k in j && j[k] != null && typeof j[k] !== 'object') bits.push(`${k}=${j[k]}`);
          }
          note = bits.join(' · ');
        }
      }
    } catch { /* body không phải JSON — bỏ qua */ }
  } catch (e) {
    status = 'error';
    note = String(e);
    resp = new Response(JSON.stringify({ ok: false, error: note }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
  await logCronRun({ job_key, source, status, started_at, finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, note });
  return resp;
}
