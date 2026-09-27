// app/api/lich/route.ts
// LỊCH RIÊNG (docs/DAC-TRUNG-PLAN.md) — feed lịch ngày tốt / ngày nên tránh.
//   POST /api/lich   { chartId }   (đăng nhập) → { url, webcal, google }
//   GET  /api/lich?t=<token>       → text/calendar (ứng dụng lịch tự kéo mỗi ngày)
//
// GET không đăng nhập được (ứng dụng lịch không gửi header) — khoá bằng chữ ký
// HMAC trong token (lib/lich/feed.ts). Token sai/chữ ký lệch → 404, không lộ
// mục sổ nào tồn tại.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { chartIdCuaToken, kiemToken, taoToken, dungLich } from '@/lib/lich/feed';
import { birthParamsFromChart } from '@/lib/reports/chartMatch';
import { computeLaso } from '@/lib/engine/laso';
import { todayVN } from '@/lib/engine/van-ngay';
import type { ChartBirth } from '@/lib/charts/key';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://tuviminhbao.com';

async function authUser(request: NextRequest): Promise<{ id: string } | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SUPABASE_KEY },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? { id: u.id } : null;
}

async function docMuc(id: number): Promise<{ user_id: string; label: string | null; birth: ChartBirth } | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/user_charts?id=eq.${id}&select=user_id,label,birth`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const body = await parseBody(request);
  const chartId = Number(body.chartId);
  if (!Number.isInteger(chartId) || chartId <= 0) return err('Thiếu chartId.', 400);
  const muc = await docMuc(chartId);
  if (!muc || muc.user_id !== user.id) return err('Không tìm thấy.', 404);
  const t = taoToken(chartId, user.id);
  const url = `${SITE}/api/lich?t=${t}`;
  const webcal = url.replace(/^https:/, 'webcal:');
  return ok({
    success: true,
    url,
    webcal,
    google: 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(webcal),
  });
}

export async function GET(request: NextRequest) {
  const t = new URL(request.url).searchParams.get('t') || '';
  const id = chartIdCuaToken(t);
  if (id == null) return new Response('Not found', { status: 404 });
  const muc = await docMuc(id);
  if (!muc || !kiemToken(t, muc.user_id)) return new Response('Not found', { status: 404 });

  const b = birthParamsFromChart(muc.birth || {});
  if (!b) return new Response('Not found', { status: 404 });
  // Chi năm sinh không phụ thuộc giờ sinh — thiếu giờ thì mượn giờ Tý chỉ để
  // engine chịu lập lá số, KHÔNG dùng số nào khác của lá số tạm này.
  const ls = computeLaso({ ...b, hourBranch: b.hourBranch != null && b.hourBranch >= 0 ? b.hourBranch : 0 }).ls;
  const chiNamSinh = String(ls?.canChiNam || '').split(' ').pop() || '';
  if (!chiNamSinh) return new Response('Not found', { status: 404 });

  const ten = String(muc.label || muc.birth?.hoten || '').trim() || 'con';
  const ics = dungLich({ chartId: id, ten, chiNamSinh, tu: todayVN() });
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="lich-rieng.ics"',
      'Cache-Control': 'public, max-age=21600',
    },
  });
}
