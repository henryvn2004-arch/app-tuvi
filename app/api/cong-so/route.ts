import { NextRequest, NextResponse } from 'next/server';
import { computeLaso, clockToBranch } from '@/lib/engine/laso';
import {
  computeCongSo,
  hoSoTinhThu,
  railData,
  railDataDayDu,
  resolveTrangThai,
} from '@/lib/engine/cong-so';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { toolPaymentDenied } from '@/lib/billing/credits';

const TOOL_ID = 'cong-so';

export const runtime = 'nodejs';
/**
 * ⚠️ BẮT BUỘC. Route GET không đọc API động nào sẽ bị Next coi là TĨNH và chạy
 * trọn vẹn ngay trong `next build` — mọi người xem sẽ nhận kết quả của lúc
 * build. Đây đúng bug `/api/cron-push` đã dính. `req.nextUrl` có đọc query nên
 * thực tế đã động, nhưng khai rõ là rẻ hơn đi chẩn lại lần sau.
 */
export const dynamic = 'force-dynamic';

interface DauVao {
  day: number;
  month: number;
  year: number;
  hourBranch: number;
  gender: 'nam' | 'nu';
  isLunar: boolean;
}

/** Đọc + kiểm ngày sinh. Trả chuỗi lỗi thay vì ném — hai đường gọi dùng chung. */
function docBirth(get: (k: string) => string | null): DauVao | string {
  const d = Number(get('d'));
  const m = Number(get('m'));
  const y = Number(get('y'));
  const gender = get('gt') === 'nu' ? ('nu' as const) : ('nam' as const);
  const isLunar = get('am') === '1';

  let hourBranch: number;
  const gio = get('gio');
  const h = get('h');
  if (gio !== null && gio !== '') hourBranch = Number(gio);
  else if (h !== null && h !== '') hourBranch = clockToBranch(Number(h));
  else return 'Thiếu giờ sinh.';

  if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12)
    return 'Ngày tháng sinh không hợp lệ.';
  if (!Number.isInteger(y) || y < 1900 || y > 2100)
    return 'Năm sinh phải trong khoảng 1900–2100.';
  if (!Number.isInteger(hourBranch) || hourBranch < 0 || hourBranch > 11)
    return 'Giờ sinh không hợp lệ (địa chi 0–11).';

  return { day: d, month: m, year: y, hourBranch, gender, isLunar };
}

const loi = (msg: string, status: number) => NextResponse.json({ ok: false, error: msg }, { status });

/**
 * GET /api/cong-so?d=&m=&y=&gio=&gt=&am=&tt=
 *
 * LƯỢT TÍNH THỬ — không auth, không gọi LLM, không trừ Lượng. Trả ba tầng đầu
 * (lĩnh vực · quy mô · vai) đúng như tool vẫn chạy từ trước; tầng NHÁNH bị gỡ
 * bằng `hoSoTinhThu`.
 *
 * 🔴 Vì sao tầng nhánh KHÔNG được đi qua đây: response này mang
 * `Cache-Control: public, s-maxage=86400`. Một lần rò là CDN phát lại phần trả
 * tiền cho MỌI người và không thu hồi được. Đây là lý do đường tiền phải là
 * POST riêng, không phải một cờ trên chính GET này.
 *
 * `gio` là ĐỊA CHI giờ (0=Tý..11=Hợi) — cùng quy ước với mọi tool Á Đông của
 * site. Nhận thêm `h` (giờ đồng hồ 0–23) cho tiện gọi từ nơi khác; quy đổi
 * bằng `clockToBranch` của engine chứ không tự map (đã có tiền lệ map sai).
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const birth = docBirth((k) => q.get(k));
    if (typeof birth === 'string') return loi(birth, 400);

    const r = computeLaso(birth);
    if (!r.ok || !r.ls) return loi(r.error || 'Không lập được lá số.', 400);

    const profile = computeCongSo(r.ls, resolveTrangThai(q.get('tt')));
    return NextResponse.json(
      { ok: true, hoSo: hoSoTinhThu(profile), rail: railData(profile), tinhThu: true },
      {
        // Kết quả phụ thuộc NĂM XEM (vận năm nay + tuổi ở từng chặng) nên KHÔNG
        // cache vĩnh viễn như bản đồ sao. Một ngày là đủ: năm chỉ đổi mỗi năm
        // một lần, mà CDN thì vẫn đỡ được đợt truy cập dồn.
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      }
    );
  } catch (e) {
    console.error('[api/cong-so] dựng hồ sơ hỏng:', e);
    return loi('Không dựng được hồ sơ nghề nghiệp.', 500);
  }
}

/**
 * POST /api/cong-so — ĐƯỜNG TRẢ TIỀN, trả thêm tầng NHÁNH.
 *
 * 🔑 Hàm RIÊNG, không phải một cờ trên GET. Đây là chốt chặn thanh toán của một
 * tool đang bán: trộn hai đường vào một chỗ rồi tin vào một câu `if` là cách
 * nhanh nhất để một hôm nào đó đường trả tiền lọt qua cửa. Cùng lý do đã ghi ở
 * `runPreview` của 3 tool cẩm nang.
 *
 * POST chứ không GET vì lượt gọi này ĐỘNG TỚI VÍ — để ở GET là mời trình
 * duyệt/CDN prefetch một endpoint tính tiền. Và `no-store` là BẮT BUỘC: cache
 * một phản hồi trả phí nghĩa là người sau đọc được mà không trả gì.
 *
 * Tool này 0 lượt LLM nên KHÔNG có `portrait_cache`, KHÔNG ghi lịch sử, KHÔNG
 * tặng lượt rail — xem lại cùng lá số được miễn phí nhờ `hasSlugAccess` trong
 * `toolPaymentDenied`, đúng cơ chế sẵn có.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authUserFromRequest(req);
    if ('error' in auth) return loi(auth.error, auth.status);

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return loi('Payload không hợp lệ.', 400);
    }

    const birth = docBirth((k) => {
      const v = body[k];
      return v === undefined || v === null ? null : String(v);
    });
    if (typeof birth === 'string') return loi(birth, 400);

    // ⚠️ `slug` PHẢI bắt đầu bằng ĐÚNG `tool_id`, được dài hơn, CẤM ngắn hơn —
    // `hasRecentToolPayment` lọc `slug=like.<tool_id>*`, slug ngắn hơn thì lưới
    // đỡ "đã trả tiền mà vẫn ăn 402" chết im lặng. Đã trả giá một lần ở Duyên Nợ.
    const slug = String(body.slug || '');
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, slug);
    if (denied) return loi(denied, 402);

    const r = computeLaso(birth);
    if (!r.ok || !r.ls) return loi(r.error || 'Không lập được lá số.', 400);

    const profile = computeCongSo(r.ls, resolveTrangThai(String(body.tt || '')));
    return NextResponse.json(
      { ok: true, hoSo: profile, rail: railDataDayDu(profile), tinhThu: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('[api/cong-so] mở tầng nhánh hỏng:', e);
    return loi('Không dựng được phần nhánh nghề.', 500);
  }
}
