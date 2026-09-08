// lib/ops/tool-usage-alerts.ts
// ============================================================
// Cảnh báo GẦN-THỜI-GIAN-THỰC khi có người DÙNG TOOL (kể cả khách vô danh) —
// Henry hỏi 2026-09-08, cùng lượt với cảnh báo đăng ký mới + trả tiền
// (lib/admin/alert.ts `alertNewSignup`/`alertNewPayment`, gọi thẳng tại
// chokepoint nên báo NGAY). Tool usage KHÔNG hợp để báo từng lượt như hai cái
// kia — Henry tự chọn gộp thành digest mỗi 15 phút sau khi được cảnh báo "dùng
// tool có thể hàng trăm lượt/ngày, báo từng lượt sẽ chìm luôn tin đăng ký/trả
// tiền quan trọng hơn".
//
// Tín hiệu dùng: event_type='tool_run' (KHÔNG phải 'tool_open') — 'tool_run'
// bắn đúng lúc tool đã TÍNH RA KẾT QUẢ (activation thật), 'tool_open' chỉ là
// mở trang xem. Xem public/shell.js dòng bắn 'tool_run': "86/95 người chạy
// tool là KHÁCH VÔ DANH" (đo prod 23/08) — event này đã tự phủ đúng yêu cầu
// "kể cả anonymous", không cần lọc gì thêm.
//
// Cùng khuôn cursor với lib/ops/error-alerts.ts: đọc `events` mới hơn một con
// trỏ lưu ở `app_config`, dời cursor NGAY sau khi đọc (trước khi gửi) để an
// toàn với retry và không phụ thuộc Telegram/WhatsApp gửi có tới nơi hay
// không — dữ liệu gốc vẫn còn nguyên trong `events`.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const CURSOR_KEY = 'ops.tool_usage_cursor';

// Job xếp lịch mỗi 15 phút (lib/ops/jobs.ts). Lần chạy ĐẦU TIÊN chưa có cursor
// chỉ nhìn lại 20 phút — đủ trùm một chu kỳ + đệm trễ, không dội cả lịch sử cũ.
const FIRST_RUN_LOOKBACK_MS = 20 * 60 * 1000;

// Trần số dòng đọc mỗi lượt — chặn một lượt bơm bất thường làm cron quá nặng.
const FETCH_LIMIT = 2000;

interface ToolRunRow {
  ts: string;
  tool_id: string | null;
  user_id: string | null;
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

export interface ToolUsageDigest {
  /** Có gì để báo không — rỗng thì cron không gửi tin (im lặng đúng nghĩa). */
  text: string | null;
  total: number;
  checked: string[];
}

/**
 * Đọc `events` (event_type='tool_run') mới hơn cursor, gộp theo `tool_id`,
 * trả về MỘT đoạn tin digest (hoặc null nếu 15 phút qua không ai dùng tool
 * nào). LUÔN dời cursor trước khi trả về — an toàn kể cả khi phần gửi tin bên
 * gọi hỏng.
 */
export async function buildToolUsageDigest(): Promise<ToolUsageDigest> {
  const cursor = await getCursor();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?event_type=eq.tool_run&ts=gt.${encodeURIComponent(cursor)}` +
      `&select=ts,tool_id,user_id&order=ts.asc&limit=${FETCH_LIMIT}`,
    { headers: SB_HEADERS, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`đọc events tool_run: ${await res.text()}`);
  const rows = (await res.json()) as ToolRunRow[];

  if (!rows.length) return { text: null, total: 0, checked: ['tool_run'] };

  // Dời cursor NGAY sau khi đọc thành công — một lượt retry (withCronLog
  // opts.retry) gọi lại hàm này sẽ không đọc trùng các dòng vừa thấy.
  const lastTs = rows[rows.length - 1].ts;
  await setCursor(lastTs);

  const byTool = new Map<string, { count: number; anon: number }>();
  let anonTotal = 0;
  for (const r of rows) {
    const id = r.tool_id || '(không rõ)';
    const g = byTool.get(id) || { count: 0, anon: 0 };
    g.count++;
    if (!r.user_id) {
      g.anon++;
      anonTotal++;
    }
    byTool.set(id, g);
  }

  const lines = [...byTool.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([id, g]) => `• ${id}: ${g.count} lượt${g.anon ? ` (${g.anon} ẩn danh)` : ''}`);

  const truncatedNote = rows.length >= FETCH_LIMIT ? ' (đọc chạm trần, có thể còn sót)' : '';
  const text =
    `📊 ${rows.length} lượt dùng tool trong 15 phút qua${truncatedNote} ` +
    `(${anonTotal} ẩn danh)\n` +
    lines.join('\n') +
    (byTool.size > 15 ? `\n… và ${byTool.size - 15} tool khác` : '');

  return { text, total: rows.length, checked: ['tool_run'] };
}
