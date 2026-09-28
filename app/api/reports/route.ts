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
//
// `?list=1` — danh sách cho trang Báo cáo (`/app/bao-cao`): CHỈ những báo cáo
// có NỘI DUNG để mở xem (Henry 2026-09-28: "chưa lưu thì bỏ dòng đó"). Hai
// nguồn, xem lib/reports/snapshots.ts: bản chụp `report_snapshots` + bản Luận
// Giải / Chu Trình cũ trong `laso_public` (của mình, hoặc đã trả tiền đúng slug).
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { portraitReportKeysForChart } from '@/lib/reports/chartMatch';
import type { ChartBirth } from '@/lib/charts/key';
import { classifyLuanGiaiSlug } from '@/lib/pdf/luan-giai-slug';
import { LEGACY_TOOL } from '@/lib/reports/snapshots';

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

    const params = new URL(request.url).searchParams;
    if (params.get('list') === '1') return ok({ items: await reportList(auth.user.id, rows) });

    const withCharts = params.get('withCharts') === '1';
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

interface ListItem {
  id: string;
  toolId: string;
  toolLabel: string | null;
  title: string;
  subtitle: string | null;
  hasImage: boolean;
  pdfSlug: string | null;
  updatedAt: string;
}

async function reportList(userId: string, reports: { tool_id: string; report_key: string; slug?: string | null }[]): Promise<ListItem[]> {
  const uid = encodeURIComponent(userId);
  const paidSlugs = reports
    .filter((r) => r.slug && (r.tool_id === 'laso' || r.tool_id === 'chu-trinh-cuoc-doi'))
    .map((r) => String(r.slug));
  // `{}` cũng là "không null" (đo prod: 19/32 dòng laso là `{}`) — lọc ở DB để
  // không phải kéo cả cột luan_giai (vài chục KB/dòng) về chỉ để soi rỗng.
  const lpSelect = 'luan_giai=not.is.null&luan_giai=neq.%7B%7D&select=slug,person_name,ngay_sinh,thang_sinh,nam_sinh,created_at';
  const [snapRes, mineRes, paidRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/report_snapshots?user_id=eq.${uid}` +
        `&select=id,tool_id,tool_label,title,subtitle,image_url,updated_at&order=updated_at.desc&limit=300`,
      { headers: SB_HEADERS, cache: 'no-store' },
    ),
    fetch(`${SUPABASE_URL}/rest/v1/laso_public?user_id=eq.${uid}&${lpSelect}&limit=200`, {
      headers: SB_HEADERS,
      cache: 'no-store',
    }),
    paidSlugs.length
      ? fetch(
          `${SUPABASE_URL}/rest/v1/laso_public?slug=in.(${paidSlugs.map((s) => `"${s.replace(/"/g, '')}"`).join(',')})` +
            `&${lpSelect}&limit=200`,
          { headers: SB_HEADERS, cache: 'no-store' },
        )
      : Promise.resolve(null),
  ]);
  if (!snapRes.ok) console.error('[reports] report_snapshots', snapRes.status);
  const snaps = snapRes.ok ? ((await snapRes.json()) as Record<string, string | null>[]) : [];
  const items: ListItem[] = snaps.map((r) => ({
    id: String(r.id),
    toolId: String(r.tool_id),
    toolLabel: r.tool_label,
    title: String(r.title),
    subtitle: r.subtitle,
    hasImage: !!r.image_url,
    // Nút "Gửi PDF" chỉ có cho bản cũ (biết slug) — bản chụp không mang slug.
    pdfSlug: null,
    updatedAt: String(r.updated_at),
  }));

  type Lp = { slug: string; person_name: string | null; ngay_sinh: number | null; thang_sinh: number | null; nam_sinh: number | null; created_at: string };
  const lpRows: Lp[] = [];
  for (const res of [mineRes, paidRes]) {
    if (!res) continue;
    if (!res.ok) { console.error('[reports] laso_public', res.status); continue; }
    lpRows.push(...((await res.json()) as Lp[]));
  }
  const seen = new Set<string>();
  for (const l of lpRows) {
    if (seen.has(l.slug)) continue;
    seen.add(l.slug);
    const tool = classifyLuanGiaiSlug(l.slug);
    if (!tool || !LEGACY_TOOL[tool]) continue;
    const ngay = [l.ngay_sinh, l.thang_sinh, l.nam_sinh].every((v) => v != null) ? `${l.ngay_sinh}/${l.thang_sinh}/${l.nam_sinh}` : '';
    items.push({
      id: 'lp:' + l.slug,
      toolId: LEGACY_TOOL[tool].toolId,
      toolLabel: LEGACY_TOOL[tool].label,
      title: LEGACY_TOOL[tool].label,
      subtitle: [l.person_name, ngay].filter(Boolean).join(' · ') || null,
      hasImage: false,
      pdfSlug: l.slug,
      updatedAt: l.created_at,
    });
  }
  items.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  return items;
}
