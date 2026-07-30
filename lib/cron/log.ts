// lib/cron/log.ts
// Ghi 1 dòng vào public.cron_runs mỗi lần một cron chạy (Vercel/pg_cron/edge).
// Dùng service key → bypass RLS (bảng khoá anon/authenticated). Nuốt mọi lỗi:
// KHÔNG bao giờ để việc logging làm hỏng chính cron. Admin đọc lại qua
// /api/payment?action=admin-cron-runs. Cặp với panel "Cron & Jobs" (admin.html).
//
// ============================================================
// NHỊP TIM (2026-07-30) — vì sao ghi dòng `running` TRƯỚC khi chạy
//
// Bản trước chỉ ghi MỘT dòng, SAU khi handler xong. Nó bắt được exception (bọc
// try/catch) và bắt được response 5xx, nên nhìn code thì tưởng đã phủ hết. Thực
// tế nó bỏ sót đúng loại hỏng tệ nhất: lượt chạy bị GIẾT NGANG. Hàm hết
// maxDuration, hết bộ nhớ, hay nền tảng trả 500 trước khi vào handler — tiến
// trình chết, `logCronRun` ở dòng cuối không bao giờ chạy, và cron_runs KHÔNG
// CÓ DÒNG NÀO.
//
// Hệ quả đo được trên prod 29/07: hai lượt trả 500 thật (anomaly-alerts 09:00Z,
// cron-master-write 10:00Z, thấy trong runtime log Vercel) mà cron_runs trắng
// trơn. Bộ dò của S4 chỉ có cron_runs để đọc, nên nó phán "QUÁ HẠN" — đúng theo
// dữ liệu nó có, nhưng sai bản chất: một cái là nhà cung cấp trượt lịch, cái kia
// là lượt chạy của mình chết. Hai thứ đó cần hai phản ứng khác nhau, mà từ ngoài
// nhìn vào thì giống hệt nhau.
//
// Nay ghi trước một dòng `running` rồi PATCH nó thành trạng thái cuối. Lượt bị
// giết ngang để lại một dòng `running` treo — `evaluateJobs` gọi đó là `stuck`
// (lib/ops/jobs.ts). Im lặng biến thành một dấu vết đọc được.
//
// ⚠️ Dòng `running` treo mà KHÔNG có ai dò `stuck` thì còn tệ hơn bản cũ: nó làm
// `lastRun` luôn mới, tức job chết mà trông như vừa chạy xong, và `overdue` sẽ
// không bao giờ kêu nữa. Sửa `evaluateJobs` và sửa file này là MỘT việc, đừng
// tách ra.
// ============================================================

export type CronRunStatus = 'ok' | 'error' | 'skip' | 'running';

export interface CronRunInput {
  job_key: string;
  source?: 'vercel' | 'pgcron' | 'edge';
  status?: CronRunStatus;
  started_at?: string; // ISO
  /** `null` = chưa xong (dòng nhịp tim). `undefined` = mặc định "bây giờ". */
  finished_at?: string | null;
  duration_ms?: number | null;
  note?: string;
}

// Mọi lượt gọi Supabase trong file này là BEST-EFFORT, nên phải có trần thời
// gian. Không có trần thì một lượt fetch treo sẽ giữ hàm tới hết maxDuration rồi
// bị giết — tức chính việc GHI LOG trở thành nguyên nhân làm lượt chạy chết, và
// nó chết theo đúng cái kiểu không để lại log. Đây là một ứng viên thật cho hai
// lượt 500 ngày 29/07 (anomaly-alerts bình thường chỉ chạy 0,6s, p90 3,1s —
// không đủ nặng để tự hết 30s).
const SB_TIMEOUT_MS = 5000;

function sbEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

function sbHeaders(key: string, prefer: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: prefer,
  };
}

/**
 * Ghi một dòng cron_runs. Trả về `id` của dòng vừa ghi (để PATCH sau), hoặc
 * `null` nếu không ghi được / không đọc được id.
 */
export async function logCronRun(run: CronRunInput): Promise<number | null> {
  const env = sbEnv();
  if (!env) return null; // chưa cấu hình → im lặng, không cản cron
  try {
    const res = await fetch(`${env.url}/rest/v1/cron_runs?select=id`, {
      method: 'POST',
      headers: sbHeaders(env.key, 'return=representation'),
      signal: AbortSignal.timeout(SB_TIMEOUT_MS),
      body: JSON.stringify({
        job_key: run.job_key,
        source: run.source ?? 'vercel',
        status: run.status ?? 'ok',
        started_at: run.started_at ?? new Date().toISOString(),
        // Phân biệt "không truyền" (mặc định = bây giờ) với "truyền null" (dòng
        // nhịp tim: chưa xong). Dùng `?? now()` thì null bị hiểu thành "xong
        // ngay lúc bắt đầu", và một dòng running sẽ mang duration bằng 0.
        finished_at: run.finished_at === undefined ? new Date().toISOString() : run.finished_at,
        duration_ms: run.duration_ms ?? null,
        note: (run.note ?? '').slice(0, 500) || null,
      }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const id = Array.isArray(rows) ? rows[0]?.id : null;
    return typeof id === 'number' ? id : null;
  } catch {
    // nuốt: logging không được phép làm hỏng cron
    return null;
  }
}

/**
 * Xoá một dòng cron_runs. Best-effort.
 *
 * CHỈ dùng cho dòng nhịp tim của một lượt KHÔNG PHẢI LƯỢT CHẠY THẬT (prerender
 * lúc build — xem `isBuildPrerenderError`). Không dùng để dọn log: lịch sử chạy
 * là bằng chứng, xoá nó đi thì lần sau không chẩn được gì.
 */
async function deleteCronRun(id: number): Promise<void> {
  const env = sbEnv();
  if (!env) return;
  try {
    await fetch(`${env.url}/rest/v1/cron_runs?id=eq.${id}`, {
      method: 'DELETE',
      headers: sbHeaders(env.key, 'return=minimal'),
      signal: AbortSignal.timeout(SB_TIMEOUT_MS),
    });
  } catch {
    /* nuốt */
  }
}

/** Cập nhật dòng nhịp tim thành trạng thái cuối. Best-effort như logCronRun. */
export async function patchCronRun(id: number, fields: Partial<CronRunInput>): Promise<void> {
  const env = sbEnv();
  if (!env) return;
  try {
    await fetch(`${env.url}/rest/v1/cron_runs?id=eq.${id}`, {
      method: 'PATCH',
      headers: sbHeaders(env.key, 'return=minimal'),
      signal: AbortSignal.timeout(SB_TIMEOUT_MS),
      body: JSON.stringify({
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.finished_at !== undefined ? { finished_at: fields.finished_at } : {}),
        ...(fields.duration_ms !== undefined ? { duration_ms: fields.duration_ms } : {}),
        ...(fields.note !== undefined ? { note: (fields.note ?? '').slice(0, 500) || null } : {}),
      }),
    });
  } catch {
    /* nuốt */
  }
}

export interface WithCronLogOpts {
  /**
   * Thử lại ĐÚNG 1 lượt khi handler ném lỗi hoặc trả 5xx.
   *
   * ⚠️ CHỈ bật cho job IDEMPOTENT. Job có tác dụng phụ không lặp được (pop
   * topic_queue rồi viết bài, trừ Lượng, cấp quà) mà retry thì một lượt hỏng
   * giữa đường thành hai lượt tác dụng — tệ hơn hẳn việc bỏ một lượt.
   *
   * Cũng nói thẳng giới hạn: retry ở đây chỉ cứu được lỗi TRONG tiến trình.
   * Lượt bị giết ngang (timeout/OOM) thì không còn tiến trình nào để thử lại —
   * ca đó do dòng nhịp tim + `stuck` lo, không phải do retry.
   */
  retry?: boolean;
}

interface Attempt {
  status: CronRunStatus;
  note: string;
  resp: Response;
}

async function runOnce(handler: () => Promise<Response>): Promise<Attempt> {
  try {
    const resp = await handler();
    let status: CronRunStatus = resp.ok ? 'ok' : 'error';
    let note = '';
    try {
      const j = await resp.clone().json();
      if (j && typeof j === 'object') {
        if (j.ok === false || j.error) {
          status = 'error';
          note = String(j.error ?? 'error');
        } else if (j.skipped) {
          status = 'skip';
          note = String(j.skipped);
        } else {
          // tóm tắt vài trường hữu ích nếu có
          const bits: string[] = [];
          for (const k of ['sent', 'failed', 'message', 'note', 'count', 'day', 'results']) {
            if (k in j && j[k] != null && typeof j[k] !== 'object') bits.push(`${k}=${j[k]}`);
          }
          note = bits.join(' · ');
        }
      }
    } catch {
      /* body không phải JSON — bỏ qua */
    }
    return { status, note, resp };
  } catch (e) {
    const note = String(e);
    return {
      status: 'error',
      note,
      resp: new Response(JSON.stringify({ ok: false, error: note }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}

/**
 * Next đặt biến này trong lúc `next build` (PHASE_PRODUCTION_BUILD của
 * `next/constants`). Dùng chuỗi thẳng thay vì import để không kéo hằng số nội bộ
 * của Next vào runtime.
 */
const BUILD_PHASE = 'phase-production-build';

/**
 * Lượt "chạy" phát sinh do Next PRERENDER route lúc build, không phải do lịch.
 *
 * Route cron đọc `request.headers` mà thiếu `export const dynamic = 'force-dynamic'`
 * sẽ ném `DynamicServerError` ngay trong bước build — và trước bản này, mỗi lần
 * như thế đẻ một dòng `error` vào `cron_runs`. Mỗi push (kể cả preview của PR)
 * là một build, nên nó sinh rác theo cấp số: đo trên prod 30/07 được **519/941
 * dòng** là loại này (`migration-purge-fake-cron-runs.sql`).
 *
 * Hai hậu quả, cái sau nặng hơn cái trước:
 *   1. `evaluateJobs` đọc dòng cuối cùng để phán `failing` → 2 job autopilot bị
 *      báo "lượt gần nhất LỖI" suốt 3 ngày, trong khi lượt THẬT gần nhất của
 *      autopilot-price (07-27 01:00Z) là `ok`. Cảnh báo đúng theo dữ liệu, sai
 *      theo sự thật — loại tệ nhất, vì nó dạy người ta ngó lơ bộ dò.
 *   2. Cửa sổ "N dòng gần nhất" bị rác chiếm chỗ, đẩy job thật ra ngoài
 *      (xem `CRON_RUNS_LIMIT`).
 *
 * `export const dynamic` ở từng route vẫn là tuyến phòng thủ CHÍNH; đây là lưới
 * hứng cho route thứ N+1 mà ai đó quên khai — quên là chuyện chắc chắn xảy ra,
 * đã xảy ra 6 lần trên 6 route.
 */
function isBuildPrerenderError(note: string): boolean {
  return /DynamicServerError|Dynamic server usage/i.test(note);
}

// Bọc 1 handler cron: ghi dòng nhịp tim, đo thời gian, đọc kết quả JSON
// (ok:false → error), chốt log, rồi trả NGUYÊN response gốc. Mọi nhánh return
// của handler đều được log 1 chỗ.
export async function withCronLog(
  job_key: string,
  source: 'vercel' | 'pgcron' | 'edge',
  handler: () => Promise<Response>,
  opts: WithCronLogOpts = {},
): Promise<Response> {
  // Đang build thì đây KHÔNG phải một lượt chạy — chạy handler rồi trả về, đừng
  // để lại vết nào. Bỏ qua sớm ở đây còn tiết kiệm 2 lượt gọi Supabase mỗi
  // route cron mỗi build.
  if (process.env.NEXT_PHASE === BUILD_PHASE) return runOnce(handler).then((a) => a.resp);

  const started_at = new Date().toISOString();
  const t0 = Date.now();

  // Nhịp tim: ghi TRƯỚC khi chạy, để lượt bị giết ngang vẫn còn dấu.
  const runId = await logCronRun({
    job_key,
    source,
    status: 'running',
    started_at,
    finished_at: null,
    note: 'đang chạy…',
  });

  let att = await runOnce(handler);
  if (opts.retry && att.status === 'error') {
    const first = att.note;
    att = await runOnce(handler);
    att.note = `thử lại 1 lượt (lỗi đầu: ${first})${att.note ? ' · ' + att.note : ''}`;
  }

  // Lưới hứng cho ca `NEXT_PHASE` không được đặt (prerender ở ngữ cảnh khác):
  // xoá luôn dòng nhịp tim thay vì chốt nó thành `error`. CỐ Ý không hạ xuống
  // `skip` — `skip` là một trạng thái CÓ NGHĨA (job chạy mà không có việc) và
  // 3 lượt skip liên tiếp là một cảnh báo riêng; nhét rác vào đó chỉ đổi một
  // cảnh báo giả thành một cảnh báo giả khác.
  if (isBuildPrerenderError(att.note)) {
    if (runId != null) await deleteCronRun(runId);
    return att.resp;
  }

  // Lượt bị TỪ CHỐI XÁC THỰC (401) cũng không phải một lượt chạy của job: mọi
  // route cron đều kiểm `Bearer CRON_SECRET` NGAY ĐẦU handler, và `withCronLog`
  // bọc ở NGOÀI bước đó — nên một con bot quét URL cũng đẻ được một dòng
  // `error`, rồi `evaluateJobs` đọc dòng ấy thành «lượt gần nhất LỖI» và bắn
  // cảnh báo. Đó đúng là hình dạng của 2 cảnh báo giả sáng 30/07, chỉ khác
  // nguồn rác. 8 route cron đều phơi ra Internet nên đây là cửa vào có thật.
  //
  // KHÔNG che mất hỏng thật: nếu CRON_SECRET lệch (bị xoay, quên set) thì lượt
  // thật cũng 401 và bảng sẽ TRẮNG log — `overdue` bắt đúng ca đó, và "job im
  // lặng" là chẩn đoán chính xác hơn "job lỗi".
  if (att.resp.status === 401) {
    if (runId != null) await deleteCronRun(runId);
    return att.resp;
  }

  const final = {
    status: att.status,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    note: att.note,
  };
  // Không ghi được dòng nhịp tim (thiếu env / Supabase chớp) thì vẫn phải chốt
  // một dòng như bản cũ — thà có log muộn hơn không có log.
  if (runId != null) await patchCronRun(runId, final);
  else await logCronRun({ job_key, source, started_at, ...final });

  return att.resp;
}
