// app/api/van-ngay/route.ts
// ============================================================
// Số liệu "Vận hôm nay" cho thẻ ở trang /app (và app native).
//
// GET  ?d=YYYY-MM-DD → tầng NGÀY: giống nhau với mọi người ⇒ cache CDN theo
//                      ngày. MIỄN PHÍ, không đăng nhập, không LLM, không DB.
// POST { d, birth }  → thêm tầng CÁ NHÂN (cung nhật hạn của chính lá số đó).
//                      Vẫn deterministic + KHÔNG tính tiền: đây là mồi kéo
//                      người ta quay lại mỗi ngày, thu phí ở đây thì không ai
//                      mở lần thứ hai. Lượt HỎI THẦY mới tính Lượng như cũ.
//
// ⚠️ KHÔNG chấm điểm/10 cho ngày. Luật đã chốt: chỉ ĐẠI VẬN có điểm thật,
// nguyệt/nhật hạn luận theo cung + chính tinh (xem CLAUDE.md, "đại vận là gốc").
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { computeVanNgay, computeVanNgayCaNhan, todayVN } from '@/lib/engine/van-ngay';
import { computeLaso } from '@/lib/engine/laso';
import type { BirthParams } from '@/lib/contract/v1';

// Tầng ngày không đổi trong 24h ⇒ để CDN giữ. `stale-while-revalidate` cho
// lượt đầu sau nửa đêm không phải chờ tính lại.
const DAY_CACHE = 'public, s-maxage=21600, stale-while-revalidate=86400';

function parseDate(s: string | null): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = +m[1]!, mo = +m[2]!, d = +m[3]!;
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export async function GET(req: NextRequest) {
  const q = parseDate(req.nextUrl.searchParams.get('d')) || todayVN();
  try {
    const data = computeVanNgay(q.d, q.m, q.y);
    return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': DAY_CACHE } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { d?: string; birth?: BirthParams };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body không phải JSON.' }, { status: 400 });
  }
  const q = parseDate(body?.d || null) || todayVN();

  let day;
  try {
    day = computeVanNgay(q.d, q.m, q.y);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  // Không có lá số → trả đúng tầng ngày, KHÔNG lỗi. Thẻ vẫn dùng được cho
  // khách chưa từng lập lá số; chỗ trống của khối cá nhân chính là CTA.
  const birth = body?.birth;
  if (!birth || !birth.day || !birth.month || !birth.year) {
    return NextResponse.json({ ok: true, ...day });
  }

  try {
    const r = computeLaso(birth, q.y);
    if (!r.ok) return NextResponse.json({ ok: true, ...day, caNhanError: r.error });
    const caNhan = computeVanNgayCaNhan(r.ls as Record<string, unknown>, day, q.d, q.m, q.y);
    return NextResponse.json({ ok: true, ...day, ...(caNhan ? { caNhan } : {}) });
  } catch (e) {
    // Lá số hỏng KHÔNG được kéo sập cả thẻ — tầng ngày vẫn đúng và vẫn đáng xem.
    console.warn('[van-ngay] tính lá số hỏng:', (e as Error).message);
    return NextResponse.json({ ok: true, ...day });
  }
}
