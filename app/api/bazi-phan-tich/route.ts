import { NextRequest, NextResponse } from 'next/server';
import { phanTich, railData } from '@/lib/bazi/phan-tich';
import { computeTuBinh } from '@/lib/engine/tubinh';

export const runtime = 'nodejs';
/** ⚠️ BẮT BUỘC — xem chú thích ở `app/api/qimen/route.ts`. */
export const dynamic = 'force-dynamic';

/**
 * GET /api/bazi-phan-tich?d=&m=&y=&gio=&gt=
 *
 * TRẢ VỀ PHẦN PHÂN TÍCH, KHÔNG PHẢI TỨ TRỤ. Tứ trụ do engine của repo tính;
 * route này chỉ kèm `tuTruCheck` để phía gọi tự đối chiếu và BỎ phân tích nếu
 * lệch — xem chú thích đầu `lib/bazi/phan-tich.ts`.
 *
 * Tool MIỄN PHÍ — không auth, không trừ Lượng.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const d = Number(q.get('d'));
    const m = Number(q.get('m'));
    const y = Number(q.get('y'));
    const gio = Number(q.get('gio'));
    const gt = q.get('gt') === 'nu' ? 'nu' : 'nam';

    if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12) {
      return NextResponse.json({ ok: false, error: 'Ngày tháng không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      return NextResponse.json({ ok: false, error: 'Năm sinh phải trong khoảng 1900–2100.' }, { status: 400 });
    }
    if (!Number.isInteger(gio) || gio < 0 || gio > 11) {
      return NextResponse.json({ ok: false, error: 'Giờ sinh phải là địa chi 0–11.' }, { status: 400 });
    }

    // ── TỨ TRỤ: LẤY TỪ ENGINE CỦA REPO, không lấy của mingyu ──
    // Nguồn duy nhất cho tứ trụ trên toàn site vẫn là
    // `public/tubinh-ansao-engine.js`. mingyu chỉ cấp tầng PHÂN TÍCH.
    const bt = computeTuBinh({ day: d, month: m, year: y, hourBranch: gio, gender: gt });
    if (!bt.ok || !bt.data) {
      return NextResponse.json({ ok: false, error: bt.error || 'Không lập được tứ trụ.' }, { status: 400 });
    }
    const tuTru = (bt.data.tuTru as { ten: string; can: string; chi: string; napAm: string }[]).map(
      (t) => ({ ten: t.ten, can: t.can, chi: t.chi, canChi: `${t.can} ${t.chi}`, napAm: t.napAm })
    );

    const p = phanTich({ ngay: d, thang: m, nam: y, gioChi: gio, gioiTinh: gt });

    // ── CHỐT CHẶN LÚC CHẠY, fail-closed ──
    // Đã đo 576 lá (1962–2006): hai engine khớp 100% cả 4 trụ. Nhưng "khớp hôm
    // nay" không phải bảo đảm vĩnh viễn — nâng phiên bản mingyu là có thể lệch.
    // Lệch thì BỎ phần phân tích chứ không bày phân tích của một lá số khác:
    // tứ trụ đúng + thập thần của lá khác là thứ sai mà không ai nhìn ra.
    const khop = p.tuTruCheck.every((x, i) => x === tuTru[i]!.canChi);
    if (!khop) {
      console.error(
        '[api/bazi-phan-tich] TỨ TRỤ LỆCH GIỮA HAI ENGINE — đã bỏ phần phân tích.',
        { repo: tuTru.map((t) => t.canChi), mingyu: p.tuTruCheck }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        tuTru,
        phanTich: khop ? p : null,
        rail: khop ? railData(p) : null,
        ...(khop ? {} : { canhBao: 'Chưa hiển thị phần phân tích sâu cho lá số này.' }),
      },
      // Kết quả CHỈ phụ thuộc ngày sinh — không đổi theo thời gian, cache dài.
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
    );
  } catch (e) {
    console.error('[api/bazi-phan-tich] hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không phân tích được bát tự.' }, { status: 500 });
  }
}
