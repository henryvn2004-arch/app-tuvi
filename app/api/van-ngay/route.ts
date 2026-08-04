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
import { computeVanNgay, computeVanNgayCaNhan, computeTuan, todayVN } from '@/lib/engine/van-ngay';
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

/**
 * `?tuan=0` tắt dải 7 ngày. Bấm vào một ngày trong dải thì thẻ chỉ cần dữ liệu
 * của NGÀY đó — dải vẫn neo ở hôm nay, xin lại 7 ngày nữa là phí băng thông và
 * làm dải nhảy theo ngày đang xem.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = parseDate(sp.get('d')) || todayVN();
  try {
    const data = computeVanNgay(q.d, q.m, q.y);
    const tuan = sp.get('tuan') === '0' ? undefined : computeTuan(q.d, q.m, q.y);
    return NextResponse.json(
      { ok: true, ...data, ...(tuan ? { tuan } : {}) },
      { headers: { 'Cache-Control': DAY_CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { d?: string; birth?: BirthParams; tuan?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body không phải JSON.' }, { status: 400 });
  }
  const q = parseDate(body?.d || null) || todayVN();
  const wantTuan = body?.tuan !== false;

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
    return NextResponse.json({
      ok: true, ...day,
      ...(wantTuan ? { tuan: computeTuan(q.d, q.m, q.y) } : {}),
    });
  }

  try {
    const r = computeLaso(birth, q.y);
    if (!r.ok) {
      return NextResponse.json({
        ok: true, ...day, caNhanError: r.error,
        ...(wantTuan ? { tuan: computeTuan(q.d, q.m, q.y) } : {}),
      });
    }
    const ls = r.ls as Record<string, unknown>;
    const caNhan = computeVanNgayCaNhan(ls, day, q.d, q.m, q.y);
    // Chi năm sinh để đánh dấu ngày xung tuổi CHÍNH người này trong dải.
    const chiNamSinh = String(ls.canChiNam || '').split(' ')[1] || undefined;
    return NextResponse.json({
      ok: true, ...day,
      ...(wantTuan ? { tuan: computeTuan(q.d, q.m, q.y, 7, chiNamSinh) } : {}),
      ...(caNhan ? { caNhan } : {}),
    });
  } catch (e) {
    // Lá số hỏng KHÔNG được kéo sập cả thẻ — tầng ngày vẫn đúng và vẫn đáng xem.
    console.warn('[van-ngay] tính lá số hỏng:', (e as Error).message);
    return NextResponse.json({
      ok: true, ...day,
      ...(wantTuan ? { tuan: computeTuan(q.d, q.m, q.y) } : {}),
    });
  }
}
