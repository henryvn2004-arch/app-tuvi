// app/api/reports/route.ts
// GET /api/reports (Authorization: Bearer <token>) — danh sách report đã có
// của user hiện tại, cho tab "Tủ Báo Cáo". Đọc bảng user_reports bằng
// SERVICE_KEY (bypass RLS) nên PHẢI tự lọc theo user đã xác thực ở đây —
// không được tin bất kỳ userId nào từ query/body.
//
// ⚠️ user_reports là CACHE HIỂN THỊ, không phải cổng thanh toán — trang Tủ
// Báo Cáo vẫn phải gọi lại tool thật (route riêng của từng tool) để mở nội
// dung; route này chỉ trả "user có report nào, cho lá số nào".
//
// `?withCharts=1` nối thêm với Sổ Lá Số (`user_charts`) — trả kèm, cho mỗi
// lá số đã lưu, report_key CHỜ SẴN của 7 tool chân dung (xem
// lib/reports/chartMatch.ts vì sao CHỈ 7 tool, không phải cả 11).
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { portraitReportKeysForChart } from '@/lib/reports/chartMatch';
import type { ChartBirth } from '@/lib/charts/key';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

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
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return err('Không đọc được danh sách report', 502);
    const rows = (await res.json()) as { tool_id: string; report_key: string }[];

    const withCharts = new URL(request.url).searchParams.get('withCharts') === '1';
    if (!withCharts) return ok({ reports: rows });

    const owned = new Set(rows.map((r) => `${r.tool_id}::${r.report_key}`));
    const chartsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_charts` +
        `?user_id=eq.${encodeURIComponent(auth.user.id)}` +
        `&select=id,label,birth,relation,last_used_at&order=last_used_at.desc&limit=30`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    const chartsRaw = chartsRes.ok
      ? ((await chartsRes.json()) as { id: number; label: string; birth: ChartBirth; relation: string | null }[])
      : [];

    const charts = chartsRaw.map((c) => {
      const keys = portraitReportKeysForChart(c.birth || {});
      const owns: Record<string, boolean> = {};
      for (const [toolId, key] of Object.entries(keys)) owns[toolId] = owned.has(`${toolId}::${key}`);
      return { id: c.id, label: c.label, birth: c.birth, relation: c.relation, owns };
    });

    return ok({ reports: rows, charts });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
