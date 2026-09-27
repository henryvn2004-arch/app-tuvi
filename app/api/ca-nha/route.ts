// app/api/ca-nha/route.ts
// "Cả nhà mình" GĐ3 (docs/DAC-TRUNG-PLAN.md) — dữ liệu cho trang `/app/ca-nha`.
//   POST /api/ca-nha  { owner?: ChartBirth }  → người hỏi + người nhà × 12 tháng âm
//
// Deterministic, 0 lượt LLM ⇒ miễn phí thật, không đi qua paywall. Cùng một
// nguồn số với tool rail `tra_ca_nha` (lib/engine/ca-nha.ts).
// `owner` là lá số đang nhớ ở MÁY này (`app_birth`) — server không lưu "lá số
// của tôi" ở đâu cả; thiếu thì trang chỉ xếp người nhà với nhau.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { listFamily } from '@/lib/charts/family';
import { birthParamsFromChart } from '@/lib/reports/chartMatch';
import { khungCaNha, type NguoiNhaVao } from '@/lib/engine/ca-nha';
import type { ChartBirth } from '@/lib/charts/key';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

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

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const body = await parseBody(request);
  const ownerRaw = (body.owner || null) as ChartBirth | null;
  const owner = ownerRaw ? birthParamsFromChart(ownerRaw) : null;

  const family = await listFamily(user.id, owner);
  const people: NguoiNhaVao[] = [];
  if (owner) people.push({ ten: String(ownerRaw?.hoten || '').trim() || 'Con', birth: owner, vaiTro: 'toi' });
  for (const m of family) people.push({ ten: m.ten, birth: m.birth, vaiTro: m.vaiTro });

  const k = khungCaNha(people);
  return ok({
    success: true,
    familyCount: family.length,
    thangs: k.thangs,
    trung: k.trung,
    nguoi: k.nguoi.map((n) => ({
      ten: n.ten,
      vaiTro: n.vaiTro,
      namSinh: n.birth.year,
      gioiTinh: n.birth.gender,
      loi: n.loi,
      cungTieuHan: n.cungTieuHan,
      cungLuuNien: n.cungLuuNien,
      thangs: n.thangs.map((t) => ({ cung: t.cungNguyetHan, sat: t.satTinh, bai: t.baiTinh, cat: t.catTinh, loi: t.loi })),
    })),
  });
}
