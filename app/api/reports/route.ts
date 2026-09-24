// app/api/reports/route.ts
// GET /api/reports (Authorization: Bearer <token>) — danh sách report đã có
// của user hiện tại, cho tab "Tủ Báo Cáo". Đọc bảng user_reports bằng
// SERVICE_KEY (bypass RLS) nên PHẢI tự lọc theo user đã xác thực ở đây —
// không được tin bất kỳ userId nào từ query/body.
//
// ⚠️ user_reports là CACHE HIỂN THỊ, không phải cổng thanh toán — trang Tủ
// Báo Cáo vẫn phải gọi lại tool thật (route riêng của từng tool) để mở nội
// dung; route này chỉ trả "user có report nào, cho lá số nào".
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { authUserFromRequest } from '@/lib/api/tool-helpers';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_reports` +
        `?user_id=eq.${encodeURIComponent(auth.user.id)}` +
        `&select=tool_id,report_key,slug,status,created_at,updated_at` +
        `&order=updated_at.desc&limit=500`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return err('Không đọc được danh sách report', 502);
    const rows = (await res.json()) as unknown[];
    return ok({ reports: rows });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
