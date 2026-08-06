import { NextRequest, NextResponse } from 'next/server';
import { computeLaso, clockToBranch } from '@/lib/engine/laso';
import { computeCongSo, railData, resolveTrangThai } from '@/lib/engine/cong-so';

export const runtime = 'nodejs';
/**
 * ⚠️ BẮT BUỘC. Route GET không đọc API động nào sẽ bị Next coi là TĨNH và chạy
 * trọn vẹn ngay trong `next build` — mọi người xem sẽ nhận kết quả của lúc
 * build. Đây đúng bug `/api/cron-push` đã dính. `req.nextUrl` có đọc query nên
 * thực tế đã động, nhưng khai rõ là rẻ hơn đi chẩn lại lần sau.
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/cong-so?d=&m=&y=&gio=&gt=&am=&tt=
 *
 * Tool MIỄN PHÍ — không auth, không gọi LLM, không trừ Lượng. Toàn bộ kết quả
 * là tra bảng + đọc lại số engine đã tính, nên 0đ mỗi lượt. Chỉ rail mới tính
 * theo `chat.cost` chung như mọi tool khác.
 *
 * `gio` là ĐỊA CHI giờ (0=Tý..11=Hợi) — cùng quy ước với mọi tool Á Đông của
 * site. Nhận thêm `h` (giờ đồng hồ 0–23) cho tiện gọi từ nơi khác; quy đổi
 * bằng `clockToBranch` của engine chứ không tự map (đã có tiền lệ map sai).
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const d = Number(q.get('d'));
    const m = Number(q.get('m'));
    const y = Number(q.get('y'));
    const gender = q.get('gt') === 'nu' ? 'nu' : 'nam';
    const isLunar = q.get('am') === '1';
    const trangThai = resolveTrangThai(q.get('tt'));

    let hourBranch: number;
    if (q.get('gio') !== null && q.get('gio') !== '') {
      hourBranch = Number(q.get('gio'));
    } else if (q.get('h') !== null && q.get('h') !== '') {
      hourBranch = clockToBranch(Number(q.get('h')));
    } else {
      return NextResponse.json({ ok: false, error: 'Thiếu giờ sinh.' }, { status: 400 });
    }

    if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12) {
      return NextResponse.json({ ok: false, error: 'Ngày tháng sinh không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      return NextResponse.json({ ok: false, error: 'Năm sinh phải trong khoảng 1900–2100.' }, { status: 400 });
    }
    if (!Number.isInteger(hourBranch) || hourBranch < 0 || hourBranch > 11) {
      return NextResponse.json({ ok: false, error: 'Giờ sinh không hợp lệ (địa chi 0–11).' }, { status: 400 });
    }

    const r = computeLaso({ day: d, month: m, year: y, hourBranch, gender, isLunar });
    if (!r.ok || !r.ls) {
      return NextResponse.json({ ok: false, error: r.error || 'Không lập được lá số.' }, { status: 400 });
    }

    const profile = computeCongSo(r.ls, trangThai);
    return NextResponse.json(
      { ok: true, hoSo: profile, rail: railData(profile) },
      {
        // Kết quả phụ thuộc NĂM XEM (vận năm nay + tuổi ở từng chặng) nên KHÔNG
        // cache vĩnh viễn như bản đồ sao. Một ngày là đủ: năm chỉ đổi mỗi năm
        // một lần, mà CDN thì vẫn đỡ được đợt truy cập dồn.
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      }
    );
  } catch (e) {
    console.error('[api/cong-so] dựng hồ sơ hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không dựng được hồ sơ nghề nghiệp.' }, { status: 500 });
  }
}
