// lib/billing/viral-budget.ts
// ============================================================
// CẦU DAO NGÂN SÁCH ẢNH FREE + LƯỢT RAIL TẶNG  (Viral Loop V2.2)
//
// Vì sao cần: 2 tool chân dung tốn tiền model THẬT mỗi lượt gen (ảnh
// gpt-image-2 ~1.090đ + truyện LLM). Vòng lặp viral chỉ chạy được nếu người
// mới dùng thử được MIỄN PHÍ bằng Lượng quà tặng — nghĩa là mỗi lượt đó là
// tiền túi mình bỏ ra. Henry chốt trần **$15/tháng** cho khoản này: đây là
// THÍ NGHIỆM CÓ KIỂM SOÁT, không phải scale.
//
// ⚠️ `viral.free_gen_daily_cap = 6` suy từ giá CŨ (~$0.09/lượt). Sang
// gpt-image-2 một lượt còn ~$0.065 ⇒ **cùng $15/tháng nay mua được ~8 lượt/
// ngày**. CỐ Ý KHÔNG tự nới: trần là cần gạt ngân sách của Henry, không phải
// hằng số suy ra từ giá. Muốn nới thì một câu SQL trên `app_config`, không
// cần deploy.
//
// Hai thứ trong file này:
//  1. `freeGenGate` — chặn TRƯỚC khi trừ Lượng (và do đó trước khi gọi model)
//     khi lượt gen free toàn hệ thống trong ngày đã chạm trần. Chỉ tính người
//     CHƯA TỪNG NẠP; ai đã nạp đang tiêu tiền của chính họ nên không bao giờ
//     bị chặn.
//  2. `railFreeGrant/Consume/Remaining` — lượt rail TẶNG sau khi vẽ xong.
//     Vá đúng chỗ hụt: quà đăng ký 25 − giá tiền kiếp 25 = 0 Lượng, mà rail
//     tốn 5/lượt → người mới không hỏi được nhân vật câu nào, trong khi rail
//     mới là móc upsell thật của tool.
//
// Mọi thứ đọc từ `app_config` (`viral.*`) nên chỉnh được bằng SQL, không deploy.
// Xem _patches/migration-viral-budget.sql.
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

async function rpc<T>(fn: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return fallback;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(params),
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export interface FreeGenGate {
  allowed: boolean;
  reason?: string;
  used?: number;
  cap?: number;
}

/**
 * Lượt gen này có được phép chạy không (xét trần ngân sách ảnh free trong ngày).
 *
 * FAIL-OPEN có chủ đích: lỗi mạng/RPC → cho qua. Cầu dao này bảo vệ NGÂN SÁCH,
 * không bảo vệ an toàn — chặn oan một người đã trả tiền vì Supabase chớp một
 * nhịp thì tệ hơn nhiều so với lỡ mất vài lượt gen quá trần.
 */
export async function freeGenGate(userId: string, toolId: string): Promise<FreeGenGate> {
  if (!userId || !toolId) return { allowed: true };
  return rpc<FreeGenGate>(
    'viral_free_gen_gate',
    { p_user_id: userId, p_tool_id: toolId },
    { allowed: true, reason: 'gate_unavailable' },
  );
}

/** Lời từ chối tử tế khi chạm trần — KHÔNG phải lỗi, đừng nói giọng lỗi. */
export const FREE_GEN_CAP_MESSAGE =
  'Hôm nay số lượt dùng thử miễn phí đã hết. Bạn quay lại vào ngày mai nhé — ' +
  'hoặc nạp Lượng để dùng ngay không phải chờ.';

/** Số lượt rail tặng mỗi lần vẽ xong (0 = tắt). */
export async function railFreeTurnsPerGen(): Promise<number> {
  const n = Number(await getConfigValue<number>('viral.free_rail_turns', 2));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Tặng lượt rail sau khi vẽ xong. ĐẶT về mức n (không cộng dồn) — vẽ 3 lần
 *  không thành 6 lượt. Best-effort, không throw. */
export async function railFreeGrant(userId: string, n: number): Promise<number> {
  if (!userId || n <= 0) return 0;
  return rpc<number>('rail_free_grant', { p_user_id: userId, p_n: n }, 0);
}

/** Tiêu 1 lượt rail tặng. true = đã tiêu (nơi gọi KHÔNG trừ Lượng nữa). */
export async function railFreeConsume(userId: string): Promise<boolean> {
  if (!userId) return false;
  return rpc<boolean>('rail_free_consume', { p_user_id: userId }, false);
}

/** Còn bao nhiêu lượt rail tặng (để cổng paywall không chặn oan người hết Lượng
 *  nhưng vẫn còn lượt tặng). */
export async function railFreeRemaining(userId: string): Promise<number> {
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rail_free_turns?user_id=eq.${encodeURIComponent(userId)}&select=remaining&limit=1`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { remaining?: number }[];
    return Number(rows?.[0]?.remaining) || 0;
  } catch {
    return 0;
  }
}
