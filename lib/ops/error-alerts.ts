// lib/ops/error-alerts.ts
// ============================================================
// Cảnh báo GẦN-THỜI-GIAN-THỰC cho lỗi JS chạy trên máy người dùng — Henry hỏi
// "có tracker nào báo lỗi liền không" (2026-09-08). Nguồn dữ liệu đã có sẵn từ
// trước: track.js bắt window.onerror/unhandledrejection, gộp lỗi lặp + chặn lũ
// ở CLIENT, rồi bắn event 'js_error' vào bảng `events` qua /api/track — phủ đủ
// MỌI trang (kể cả /app/*), khác hẳn Sentry cũ (7/141 trang, đang gỡ dần).
//
// Cái còn thiếu là ĐƯỜNG ĐẨY: trước bản này 'js_error' chỉ nằm trong `events`
// chờ ai đó tự mở panel lên đọc. File này thêm một con trỏ (cursor) kiểu
// "đã xử lý tới đâu" — mỗi lượt cron đọc events mới hơn cursor, gộp theo thông
// điệp lỗi, đẩy Telegram admin nếu đủ ngưỡng, rồi luôn dời cursor tới ts mới
// nhất VỪA ĐỌC (không phụ thuộc Telegram gửi có tới nơi hay không) — khác cách
// anomaly-alerts.ts giữ cooldown theo lượt GỬI THÀNH CÔNG: ở đó cảnh báo là một
// TRẠNG THÁI còn đúng tới tận khi được xử lý (nên phải gửi lại nếu lượt trước
// mất tin), còn đây là một DÒNG SỰ KIỆN — dữ liệu vẫn nằm nguyên trong `events`
// (và trong `ops_alert` do logOpsAlerts ghi) nên bỏ lỡ một lượt đẩy Telegram
// không làm mất dấu vết, chỉ mất mỗi lượt NHẮC.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const CURSOR_KEY = 'ops.js_error_cursor';

// Job xếp lịch mỗi 15 phút (lib/ops/jobs.ts). Lần chạy ĐẦU TIÊN chưa có cursor
// thì chỉ nhìn lại 20 phút — đủ trùm một chu kỳ + đệm trễ, KHÔNG quét ngược cả
// lịch sử `events` (có thể hàng chục nghìn dòng js_error cũ, đẩy hết vào một
// tin Telegram là spam vô nghĩa cho một lượt lỗi cấu hình/deploy).
const FIRST_RUN_LOOKBACK_MS = 20 * 60 * 1000;

// Một lỗi chỉ xuất hiện ĐÚNG 1 lần trong cả cửa sổ nhiều khả năng là nhiễu
// thoáng qua (mạng chớp, extension lạ) — bắt LẶP LẠI ≥2 mới đủ tin để làm phiền
// người nhận. Ngưỡng thấp CỐ Ý (khác hẳn `toolHardFailSample` bên anomaly-alerts):
// đây là lỗi CHẠY TRÊN TRÌNH DUYỆT NGƯỜI DÙNG THẬT, phát hiện sớm quan trọng
// hơn lọc nhiễu triệt để.
const MIN_COUNT_TO_ALERT = 2;

// Trần số dòng đọc mỗi lượt — chặn một vòng lặp hỏng bơm hàng chục nghìn dòng
// trong 15 phút làm lượt cron này quá nặng. Đủ dư cho lưu lượng thật: track.js
// đã tự chặn tối đa 8 lỗi/lượt tải trang.
const FETCH_LIMIT = 1000;

interface JsErrorRow {
  ts: string;
  path: string | null;
  meta: { message?: string; src?: string; line?: number; stack?: string; kind?: string } | null;
}

interface ErrorGroup {
  message: string;
  kind: string;
  count: number;
  paths: Set<string>;
  sampleStack: string | null;
  firstTs: string;
}

async function getCursor(): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.${CURSOR_KEY}&select=value`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (res.ok) {
      const rows = await res.json();
      const v = rows?.[0]?.value;
      if (typeof v === 'string' && v) return v;
    }
  } catch {
    /* rơi về mặc định bên dưới */
  }
  return new Date(Date.now() - FIRST_RUN_LOOKBACK_MS).toISOString();
}

async function setCursor(ts: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/app_config`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: CURSOR_KEY, value: ts }),
    });
  } catch {
    /* best-effort — cursor không nhích thì lượt sau đọc lại, không mất dữ liệu */
  }
}

export interface FiredAlert {
  key: string;
  text: string;
}

/**
 * Đọc `events` (event_type='js_error') mới hơn cursor, gộp theo thông điệp,
 * trả về các nhóm đủ ngưỡng để báo. LUÔN dời cursor trước khi trả về (xem chú
 * thích đầu file) — an toàn kể cả khi Telegram bên gọi gửi hỏng.
 */
export async function checkJsErrors(): Promise<{ fired: FiredAlert[]; checked: string[] }> {
  const cursor = await getCursor();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?event_type=eq.js_error&ts=gt.${encodeURIComponent(cursor)}` +
      `&select=ts,path,meta&order=ts.asc&limit=${FETCH_LIMIT}`,
    { headers: SB_HEADERS, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`đọc events js_error: ${await res.text()}`);
  const rows = (await res.json()) as JsErrorRow[];

  if (!rows.length) return { fired: [], checked: ['js_error'] };

  // Dời cursor NGAY sau khi đọc thành công, trước khi gộp/gửi — một lượt retry
  // (withCronLog opts.retry) gọi lại hàm này sẽ không đọc trùng các dòng vừa
  // thấy, kể cả khi phần gửi Telegram phía sau ném lỗi.
  const lastTs = rows[rows.length - 1].ts;
  await setCursor(lastTs);

  const groups = new Map<string, ErrorGroup>();
  for (const r of rows) {
    const msg = (r.meta?.message || '(không có thông điệp)').trim();
    const key = `${r.meta?.kind || 'error'}|${msg}`;
    const g = groups.get(key);
    if (g) {
      g.count++;
      if (r.path) g.paths.add(r.path);
    } else {
      groups.set(key, {
        message: msg,
        kind: r.meta?.kind || 'error',
        count: 1,
        paths: new Set(r.path ? [r.path] : []),
        sampleStack: r.meta?.stack || null,
        firstTs: r.ts,
      });
    }
  }

  const fired: FiredAlert[] = [];
  let i = 0;
  for (const g of [...groups.values()].sort((a, b) => b.count - a.count)) {
    if (g.count < MIN_COUNT_TO_ALERT) continue;
    i++;
    const paths = [...g.paths].slice(0, 3).join(', ') || '(không rõ trang)';
    const stackLine = g.sampleStack ? g.sampleStack.split('\n')[0].trim() : '';
    fired.push({
      key: `js_error:${g.kind}:${g.message}`.slice(0, 200),
      text:
        `${g.message} — ${g.count} lượt (${g.kind})\n` +
        `   ↳ trang: ${paths}` +
        (stackLine ? `\n   ↳ ${stackLine.slice(0, 200)}` : ''),
    });
  }

  const truncatedNote =
    rows.length >= FETCH_LIMIT ? [`đọc chạm trần ${FETCH_LIMIT} dòng — có thể còn lỗi chưa gộp hết`] : [];

  return { fired, checked: ['js_error', ...truncatedNote] };
}
