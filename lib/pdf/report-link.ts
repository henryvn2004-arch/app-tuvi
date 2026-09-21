// lib/pdf/report-link.ts
// ============================================================
// Magic link xem báo cáo luận giải (Pha 5b productize, 2026-09-17) — token
// ngẫu nhiên KHÔNG đoán được, bảng `report_links` (RLS bật, KHÔNG có policy —
// chỉ service_role chạm được, xem _patches/migration-report-links.sql).
//
// 🔑 KHÁC HẲN `/la-so/<slug>` (trang SEO công khai có sẵn): slug là hàm THUẦN
// của ngày sinh + giới tính (`makeLasoSlug`), KHÔNG bí mật — ai biết ngày giờ
// sinh của một người ĐÃ từng luận giải cũng tính ra được slug và đọc trọn nội
// dung. Token ở đây độc lập với slug, sinh bằng CSPRNG, không suy ngược được.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import type { LuanGiaiToolId } from './luan-giai';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Trả về token xem báo cáo của MỘT slug — sinh mới nếu chưa có, TÁI DÙNG nếu
 * đã có (UNIQUE(slug) trong `report_links`: mỗi báo cáo tối đa một link sống,
 * gọi lại route resend nhiều lần không đẻ thêm token mới mỗi lần).
 */
export async function getOrCreateReportToken(
  slug: string,
  toolId: LuanGiaiToolId,
  userId: string,
): Promise<string> {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: existing } = await sb.from('report_links').select('token').eq('slug', slug).maybeSingle();
  if (existing?.token) return existing.token as string;

  const token = randomBytes(24).toString('base64url');
  const { data, error } = await sb.from('report_links')
    .insert({ token, slug, tool_id: toolId, user_id: userId })
    .select('token').single();
  if (!error) return data.token as string;

  // Đua với một lượt gọi khác cho ĐÚNG slug này (double-click, 2 tab) —
  // UNIQUE(slug) chặn insert thứ hai, đọc lại token mà lượt kia vừa tạo.
  const { data: retry } = await sb.from('report_links').select('token').eq('slug', slug).maybeSingle();
  if (retry?.token) return retry.token as string;
  throw error;
}
