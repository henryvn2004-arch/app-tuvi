// lib/ops/tool-outcome.ts
// ============================================================
// S1 (track COO) — GIÁC QUAN: ghi nhận mỗi lượt chạy tool THÀNH CÔNG hay HỎNG.
//
// VÌ SAO CẦN: trước đây hệ thống KHÔNG có tín hiệu lỗi nào cho tool. Allowlist
// của /api/track có 11 loại event, không loại nào biểu thị thất bại; `tool_run`
// bắn lúc BẮT ĐẦU nên không nói được lượt đó có ra kết quả không. Hệ quả: tool
// hỏng chỉ được phát hiện khi admin tự chạy thử (đúng vụ "Lỗi phân tích kết quả
// AI." của Chân Dung Tiền Kiếp). S1 chỉ ĐO; S2 (canary) mới là cái báo động —
// nhưng không có S1 thì S2 không có gì để đọc.
//
// GHI VÀO ĐÂU: bảng `events` sẵn có (event_type='tool_outcome'), KHÔNG bảng
// mới — cùng nơi `llm_usage`, `llm_parse_fail`, `bot_reply` đang ghi.
//
// KHÔNG TRÙNG với thứ đã có:
//   • `chatLogOutcome` (D2) đã lo /api/v1/chat + 3 kênh chat → các route đó
//     KHÔNG gắn thêm.
//   • `withCronLog` đã lo mọi cron → cũng không gắn thêm.
//   • `logLlmParseFail` (lib/agent/usage.ts) lưu BẢN THÔ khi output LLM không
//     parse được — trả lời "model đã nói gì lúc hỏng". File này trả lời câu
//     khác: "lượt chạy có ra kết quả không". Hai vai bổ trợ nhau.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Lý do hỏng. Chia hai nhóm vì gộp chung là biến mọi thống kê thành rác: user
 * nhập sai ngày sinh hay hết Lượng KHÔNG phải sự cố hệ thống, và tool ít lượt
 * dùng sẽ bị mấy lỗi đó đẩy tỷ lệ lỗi lên trần rồi báo động giả liên miên.
 */
export type ToolFailReason =
  // — lỗi HỆ THỐNG: tính vào tỷ lệ sự cố, đáng báo động —
  | 'upstream_5xx' // nhà cung cấp ngoài (LLM/ảnh/storage) trả lỗi
  | 'llm_parse' // LLM trả text nhưng không bóc ra dữ liệu dùng được
  | 'timeout' // quá hạn
  | 'unknown' // ngoại lệ không phân loại được
  // — lỗi NGƯỜI DÙNG: ghi lại để phân tích, KHÔNG tính vào tỷ lệ sự cố —
  | 'bad_input' // thiếu/sai tham số
  | 'auth' // chưa đăng nhập / token hỏng
  | 'unpaid'; // chưa thanh toán cho lượt dùng

const USER_FAULT: ReadonlySet<string> = new Set(['bad_input', 'auth', 'unpaid']);

/** true nếu lý do này là lỗi phía người dùng (không tính vào tỷ lệ sự cố). */
export function isUserFault(reason?: string): boolean {
  return !!reason && USER_FAULT.has(reason);
}

/** Suy lý do hỏng từ mã HTTP mà route trả về. */
export function reasonFromStatus(status: number): ToolFailReason | undefined {
  if (status < 400) return undefined;
  if (status === 400 || status === 422) return 'bad_input';
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'unpaid';
  if (status === 408 || status === 504) return 'timeout';
  if (status >= 500) return 'upstream_5xx';
  return 'unknown';
}

/** Ghi một lượt chạy tool vào `events`. Best-effort — không bao giờ chặn luồng. */
export async function logToolOutcome(p: {
  toolId: string;
  ok: boolean;
  reason?: ToolFailReason;
  userId?: string | null;
  durationMs?: number;
  detail?: string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'tool_outcome',
        tool_id: p.toolId,
        user_id: p.userId || null,
        platform: 'web',
        meta: {
          ok: p.ok,
          reason: p.reason || null,
          // Ghi sẵn cờ này để truy vấn ở S2/S5 khỏi phải nhớ danh sách lý do
          // nào thuộc nhóm nào — logic phân loại nằm một chỗ duy nhất (file này).
          user_fault: p.ok ? false : isUserFault(p.reason),
          duration_ms: p.durationMs ?? null,
          detail: p.detail ? String(p.detail).slice(0, 300) : null,
        },
      }),
    });
  } catch {
    /* best-effort — telemetry hỏng KHÔNG được làm hỏng lượt phục vụ user */
  }
}

/**
 * Bọc một handler route và tự ghi outcome. Cùng khuôn với `withCronLog`
 * (lib/cron/log.ts) để đọc code thấy quen.
 *
 * Ngoại lệ được ghi nhận rồi NÉM LẠI — file này chỉ quan sát, không được đổi
 * hành vi lỗi sẵn có của route.
 *
 * ⚠️ HẠN CHẾ ĐÃ BIẾT — phản hồi dạng STREAM (SSE):
 * route trả stream (vd `/api/lasotuvi?action=chat`) chốt status 200 NGAY khi
 * mở stream, nên nếu lượt đó hỏng GIỮA CHỪNG thì ở đây vẫn ghi ok=true. Muốn
 * đúng thì phải bọc từng chỗ phát sự kiện bên trong stream — chưa làm vì:
 * (a) nhánh chat của các route này phần lớn đã được `chatLogOutcome` (D2) phủ
 * qua /api/v1/chat, (b) đổi lấy một mớ phức tạp cho phần hở nhỏ. Ghi ra đây để
 * lúc đọc số ở S2/S5 không tưởng nhầm là đã phủ kín.
 */
export async function withToolOutcome(
  toolId: string,
  handler: () => Promise<Response>,
  opts: { userId?: () => string | null | undefined } = {},
): Promise<Response> {
  const t0 = Date.now();
  try {
    const res = await handler();
    const reason = reasonFromStatus(res.status);
    let detail: string | undefined;
    if (reason) {
      // Bóc thông điệp lỗi từ body để log chẩn được ngay ("Lỗi phân tích kết
      // quả AI." khác hẳn "Không lập được lá số."), thay vì chỉ có mã HTTP.
      // Dùng clone() nên KHÔNG tiêu thụ mất body trả về cho client.
      detail = `HTTP ${res.status}`;
      try {
        const j = await res.clone().json();
        if (j?.error) detail += ` — ${j.error}`;
      } catch {
        /* body không phải JSON — giữ nguyên mã HTTP */
      }
    }
    await logToolOutcome({
      toolId,
      ok: !reason,
      reason,
      userId: opts.userId?.() ?? null,
      durationMs: Date.now() - t0,
      detail,
    });
    return res;
  } catch (e) {
    await logToolOutcome({
      toolId,
      ok: false,
      reason: 'unknown',
      userId: opts.userId?.() ?? null,
      durationMs: Date.now() - t0,
      detail: String(e),
    });
    throw e;
  }
}
