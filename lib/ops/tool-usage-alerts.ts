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
// 2026-09-09: Henry hỏi thêm "mỗi user on-site bao lâu, bao nhiêu clicks hay
// engagement" — thêm mục Top user hoạt động nhiều nhất vào CÙNG digest này
// (không dựng cron riêng). KHÔNG có bộ đếm click chung trong repo (chỉ vài CTA
// riêng lẻ như cta_click/unlock_click) nên "engagement" ở đây = số lượt
// tool_run + thời gian ở lại đo qua page_dwell (đã có sẵn từ track.js, xem
// nhat-ky 2026-09 mục "ĐO MỨC ĐỌC").
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
// Nâng từ 2000 lên 3000 khi gộp thêm page_dwell: event đó bắn ở MỌI lượt rời
// trang (141 trang), tần suất cao hơn hẳn tool_run (chỉ bắn khi có kết quả).
const FETCH_LIMIT = 3000;

// Top bao nhiêu user hiện trong digest — Henry đã CHỦ Ý chọn "top N" thay vì
// liệt kê hết (câu hỏi gốc: "dùng tool nhiều thì digest dài ra, chìm mất tin
// quan trọng"), cùng lý lẽ áp dụng lại ở đây cho mục user.
const TOP_USERS = 5;

interface UsageEventRow {
  ts: string;
  event_type: 'tool_run' | 'page_dwell';
  tool_id: string | null;
  user_id: string | null;
  anon_id: string | null;
  meta: { sec?: number } | null;
}

interface IdentityStat {
  toolRuns: number;
  dwellSec: number;
  userId: string | null;
  anonId: string | null;
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

/**
 * Email của tài khoản thật, để hiện trong digest thay vì UUID trần. Best-effort
 * — tra hỏng thì digest vẫn hiện được, chỉ thiếu email. Cùng endpoint GoTrue
 * admin mà `app/api/payment/route.ts` đã dùng (tra CHIỀU NGƯỢC: ở đó tra theo
 * email ra id, ở đây tra theo id ra email).
 */
async function resolveEmail(userId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: SB_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { email?: string };
    return j.email || null;
  } catch {
    return null;
  }
}

export interface ToolUsageDigest {
  /** Có gì để báo không — rỗng thì cron không gửi tin (im lặng đúng nghĩa). */
  text: string | null;
  total: number;
  checked: string[];
}

/**
 * Đọc `events` (tool_run + page_dwell) mới hơn cursor, gộp theo `tool_id` VÀ
 * theo NGƯỜI (user_id, hoặc anon_id nếu chưa đăng nhập), trả về MỘT đoạn tin
 * digest (hoặc null nếu 15 phút qua không ai dùng tool nào). LUÔN dời cursor
 * trước khi trả về — an toàn kể cả khi phần gửi tin bên gọi hỏng.
 */
export async function buildToolUsageDigest(): Promise<ToolUsageDigest> {
  const cursor = await getCursor();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?event_type=in.(tool_run,page_dwell)&ts=gt.${encodeURIComponent(cursor)}` +
      `&select=ts,event_type,tool_id,user_id,anon_id,meta&order=ts.asc&limit=${FETCH_LIMIT}`,
    { headers: SB_HEADERS, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`đọc events tool_run/page_dwell: ${await res.text()}`);
  const rows = (await res.json()) as UsageEventRow[];

  if (!rows.length) return { text: null, total: 0, checked: ['tool_run', 'page_dwell'] };

  // Dời cursor NGAY sau khi đọc thành công, theo TS lớn nhất của TOÀN BỘ lô
  // (cả hai loại event, đọc chung một câu truy vấn) — một lượt retry
  // (withCronLog opts.retry) gọi lại hàm này sẽ không đọc trùng dòng vừa thấy.
  await setCursor(rows[rows.length - 1].ts);

  // Cursor đã dời xong; giờ mới xét "có gì để BÁO không". Job này tên
  // tool-usage-alerts nên tín hiệu chính vẫn là tool_run — không có dòng nào
  // thì coi như không có gì để báo, dù lô đọc có thể vẫn chứa page_dwell (khi
  // đó nó chỉ được tiêu thụ để dời cursor, không bị lặp lại chờ tool_run tới).
  const toolRunRows = rows.filter((r) => r.event_type === 'tool_run');
  if (!toolRunRows.length) return { text: null, total: 0, checked: ['tool_run', 'page_dwell'] };

  const byTool = new Map<string, { count: number; anon: number }>();
  let anonTotal = 0;
  for (const r of toolRunRows) {
    const id = r.tool_id || '(không rõ)';
    const g = byTool.get(id) || { count: 0, anon: 0 };
    g.count++;
    if (!r.user_id) {
      g.anon++;
      anonTotal++;
    }
    byTool.set(id, g);
  }

  // Gộp theo NGƯỜI — khoá bằng user_id khi đã đăng nhập, rơi về anon_id khi
  // chưa (đúng cách track.js định danh khách vô danh xuyên suốt session).
  const byIdentity = new Map<string, IdentityStat>();
  for (const r of rows) {
    const key = r.user_id ? `u:${r.user_id}` : r.anon_id ? `a:${r.anon_id}` : null;
    if (!key) continue; // dòng thiếu cả hai — không định danh được, bỏ qua
    const stat = byIdentity.get(key) || { toolRuns: 0, dwellSec: 0, userId: r.user_id, anonId: r.anon_id };
    if (r.event_type === 'tool_run') stat.toolRuns++;
    else {
      const sec = Number(r.meta?.sec);
      // `page_dwell` chốt ở lượt ẩn tab ĐẦU TIÊN mỗi lượt tải trang (xem
      // track.js) — cộng dồn nhiều dòng trong cùng cửa sổ 15 phút là cộng
      // dồn NHIỀU LƯỢT TẢI TRANG, không phải phóng đại một phiên duy nhất.
      if (Number.isFinite(sec) && sec > 0) stat.dwellSec += sec;
    }
    byIdentity.set(key, stat);
  }

  // Xếp theo SỐ LƯỢT DÙNG TOOL trước (đúng tên job — tool-usage), thời gian ở
  // lại chỉ là ngữ cảnh phụ thêm vào cùng dòng.
  const topIdentities = [...byIdentity.values()]
    .filter((s) => s.toolRuns > 0)
    .sort((a, b) => b.toolRuns - a.toolRuns || b.dwellSec - a.dwellSec)
    .slice(0, TOP_USERS);

  const userLines: string[] = [];
  for (const s of topIdentities) {
    const label = s.userId
      ? (await resolveEmail(s.userId)) || `user ${s.userId.slice(0, 8)}`
      : `khách ẩn danh ${(s.anonId || '?').slice(0, 8)}`;
    const mins = s.dwellSec > 0 ? `, ~${Math.round(s.dwellSec / 60)} phút ở lại` : '';
    userLines.push(`• ${label} — ${s.toolRuns} lượt tool${mins}`);
  }

  const toolLines = [...byTool.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([id, g]) => `• ${id}: ${g.count} lượt${g.anon ? ` (${g.anon} ẩn danh)` : ''}`);

  const truncatedNote = rows.length >= FETCH_LIMIT ? ' (đọc chạm trần, có thể còn sót)' : '';
  const text =
    `📊 ${toolRunRows.length} lượt dùng tool trong 15 phút qua${truncatedNote} ` +
    `(${anonTotal} ẩn danh)\n` +
    toolLines.join('\n') +
    (byTool.size > 15 ? `\n… và ${byTool.size - 15} tool khác` : '') +
    (userLines.length ? `\n\n👤 Top ${userLines.length} user hoạt động nhiều nhất:\n${userLines.join('\n')}` : '');

  return { text, total: toolRunRows.length, checked: ['tool_run', 'page_dwell'] };
}
