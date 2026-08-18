// scripts/job-heartbeat.mjs
// ============================================================
// Ghi NHỊP TIM của một lượt chạy trên GitHub Actions vào `cron_runs`, để nó
// hiện ở panel "Cron & Jobs" của admin cùng chỗ với mọi job khác.
//
// 🔴 VÌ SAO CẦN: lượt dựng clip chạy trên Actions, KHÔNG đi qua `withCronLog`
// (thứ mọi cron Vercel dùng để tự ghi sổ) ⇒ nó không để lại dòng nào trong
// `cron_runs` ⇒ panel giám sát không bao giờ thấy nó. Muốn biết lượt tuần này
// chạy ra sao phải mở tab Actions của GitHub — tức có một mắt xích của đường
// ống nằm NGOÀI chỗ người ta ngồi nhìn.
//
// Đó đúng là lớp lỗi đã đẻ ra cả track S4 (`lib/ops/jobs.ts`): job chạy thật mà
// vắng mặt trên trang giám sát thì chết bao lâu cũng không ai biết — CMO Digest
// từng chết 14 ngày vì chuyện này.
//
// 🔑 GHI QUA HÀM EDGE, KHÔNG ghi thẳng Supabase: runner CỐ Ý không cầm
// `SUPABASE_SERVICE_KEY` (khoá mở toang cả DB, đã phải xoay một lần vì lộ).
// Nó chỉ có `CLIP_INGEST_SECRET` — đúng cái khoá đã dùng để nộp clip.
//
// ⚠️ FAIL-SOFT TUYỆT ĐỐI: không ghi được nhịp tim thì KHÔNG được làm hỏng lượt
// dựng. Đây là lớp GIÁM SÁT, không phải lớp nghiệp vụ — để nó chặn lượt dựng
// là đổi một điểm mù lấy một lượt hỏng, tệ hơn hẳn.
// ============================================================

// ⚠️ Dựng URL Y HỆT `scripts/publish-clips.mjs` (cùng hàm edge, cùng secret).
// Hai chỗ ghép URL hai kiểu là hai bản sẽ trôi khỏi nhau — và ở đây thì lệch
// nghĩa là nhịp tim im lặng không ghi được trong khi clip vẫn nộp bình thường,
// tức đúng loại điểm mù mà khối này sinh ra để chống.
const SB_URL = (process.env.SUPABASE_URL || 'https://dciwkfdqhhddeymlisey.supabase.co').replace(
  /\/+$/,
  ''
);
const SECRET = process.env.CLIP_INGEST_SECRET || '';

/** Có đủ cấu hình để ghi sổ không. Thiếu thì mọi hàm dưới thành no-op. */
export const heartbeatEnabled = Boolean(SECRET);

async function post(body) {
  const res = await fetch(`${SB_URL}/functions/v1/clip-ingest?job=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-clip-secret': SECRET },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/**
 * Mở một lượt (`status='running'`). Trả `runId` để chốt lại sau, hoặc `null`
 * nếu không ghi được.
 */
export async function jobStart(jobKey, note) {
  if (!heartbeatEnabled) return null;
  try {
    const r = await post({ jobKey, status: 'running', note });
    console.log(`   [nhịp tim] mở lượt #${r.runId} cho '${jobKey}'`);
    return r.runId ?? null;
  } catch (e) {
    // Nói ra, đừng nuốt: điểm mù im lặng chính là thứ khối này sinh ra để chống.
    console.warn(`   ⚠️ không ghi được nhịp tim (mở lượt): ${e.message}`);
    return null;
  }
}

/**
 * Chốt một lượt đã mở.
 *
 * ⚠️ KHÔNG gọi được thì dòng `running` nằm treo — và đó là hành vi ĐÚNG, không
 * phải rác: bộ dò `stuck` đọc ra "job treo" trong 90 phút. Lượt dựng chạy tới
 * 150 phút nên bị runner thu hồi giữa chừng là ca dễ xảy ra, và đó chính là ca
 * cần nhìn thấy nhất.
 */
export async function jobEnd(runId, status, note) {
  if (!heartbeatEnabled || !runId) return;
  try {
    await post({ runId, status, note });
    console.log(`   [nhịp tim] chốt lượt #${runId}: ${status}`);
  } catch (e) {
    console.warn(`   ⚠️ không chốt được nhịp tim: ${e.message}`);
  }
}
