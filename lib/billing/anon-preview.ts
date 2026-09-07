// lib/billing/anon-preview.ts
// ============================================================
// CẦU DAO BẢN LUẬN XEM TRƯỚC (hard paywall)
// ============================================================
// Hard paywall đảo ngược thứ tự: gọi model THẬT cho 2 phần đầu ngay khi khách
// bấm chạy, cho đọc miễn phí, rồi mới dựng tường. Nghĩa là mỗi cú click từ
// quảng cáo tiêu tiền model TRƯỚC khi có đồng doanh thu nào — vốn đo được
// 243đ/phần × 2 ≈ 486đ (gemini-3.8-flash, `events.meta.cost_vnd` 09/2026).
//
// Ba lớp trần nằm trong RPC `anon_preview_consume`
// (_patches/migration-anon-preview.sql): theo key (trần ĐỜI) · theo IP/ngày ·
// toàn hệ thống/ngày. Mọi trần đọc `app_config` nên chỉnh bằng SQL, không deploy.
//
// HƯỚNG FAIL: CLOSED — giống `anon-trial.ts`, ngược với `viral-budget.ts`.
// Ở đây đối tượng là khách chưa trả gì và thứ đang phát là tiền model: chặn oan
// thì họ thấy đúng tấm tường vốn sẽ thấy, cho qua oan là rò tiền cho cả Internet.
//
// ⚠️ KHÁC `anon-trial.ts` ở chỗ đừng lẫn: file kia đếm CÂU RAIL của khách vô
// danh; file này đếm LƯỢT SINH BẢN LUẬN xem trước, và tính cho CẢ người đã
// đăng nhập (họ cũng đọc miễn phí phần xem trước). `key` = user_id nếu có,
// ngược lại anon_id do client khai — `anon_id` KHÔNG phải danh tính, nó chỉ là
// lớp trần thứ nhất, hai lớp còn lại mới là thứ chặn người cố tình.
// ============================================================

import { createHash } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export interface PreviewGateResult {
  allowed: boolean;
  /** 'ok' | 'disabled' | 'key_cap' | 'ip_cap' | 'global_cap' | 'error' */
  reason: string;
  /** số lá số xem trước CÒN LẠI sau lượt này */
  left: number;
}

/**
 * Băm IP để đếm theo IP mà KHÔNG lưu IP thô — không cần IP thật để đếm, mà giữ
 * IP thô là tự tạo thêm dữ liệu cá nhân phải bảo vệ. Muối khác chuỗi của
 * `anon-trial.ts` để hai bộ đếm không suy được sang nhau.
 */
function hashIp(ip: string): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`anon-preview|${SUPABASE_KEY || ''}|${ip}`).digest('hex').slice(0, 32);
}

/**
 * Rút IP khách từ header proxy. Vercel đặt `x-forwarded-for` = "client, proxy1,
 * proxy2" → lấy phần tử ĐẦU. Lấy phần tử cuối là lấy IP của proxy, tức cả thế
 * giới dùng chung một quota.
 */
export function previewIpHash(req: { headers: { get(name: string): string | null } }): string | null {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0].trim();
  const ip = first || req.headers.get('x-real-ip') || '';
  return hashIp(ip);
}

/**
 * Xin MỘT lượt sinh bản luận xem trước.
 *
 * ⚠️ GỌI SAU KHI ĐÃ TRA CACHE: lượt đọc lại một lá số đã sinh trước đó không
 * tốn đồng model nào, tiêu quota cho nó là tự bóp phễu bằng con số không có thật.
 */
export async function previewGate(
  key: string,
  ipHash: string | null,
  toolId: string,
): Promise<PreviewGateResult> {
  const FAIL_CLOSED: PreviewGateResult = { allowed: false, reason: 'error', left: 0 };
  if (!key || key.length < 6) return { allowed: false, reason: 'disabled', left: 0 };
  if (!SUPABASE_URL || !SUPABASE_KEY) return FAIL_CLOSED;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/anon_preview_consume`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_key: key, p_ip_hash: ipHash, p_tool_id: toolId }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[previewGate] RPC lỗi', res.status, await res.text().catch(() => ''));
      return FAIL_CLOSED;
    }
    const r = (await res.json()) as PreviewGateResult | null;
    if (!r || typeof r.allowed !== 'boolean') return FAIL_CLOSED;
    return { allowed: r.allowed, reason: r.reason || 'ok', left: Number(r.left) || 0 };
  } catch (e) {
    console.error('[previewGate] lỗi:', (e as Error)?.message);
    return FAIL_CLOSED;
  }
}
