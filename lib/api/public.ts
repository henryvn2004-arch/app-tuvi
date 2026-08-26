// lib/api/public.ts
// ============================================================
// API CÔNG KHAI — mục #8/14 (growth hack GH3a). Phần dùng chung của
// `/api/public/v1/*`: CORS, hợp đồng lỗi, đọc ngày, và luật cache.
//
// 🔑 VÌ SAO LÀ NAMESPACE RIÊNG chứ không phải "mở tài liệu cho route sẵn có":
// `/api/almanac`, `/api/qimen`, `/api/liuren`, `/api/natal` đều đã không cần
// auth — nhưng chúng là HỢP ĐỒNG NỘI BỘ, sinh ra để nuôi đúng một trang tool
// và đổi shape bất cứ lúc nào giao diện đó đổi. Đem đi quảng bá cho lập trình
// viên bên ngoài là vô tình ĐÓNG BĂNG chúng: từ đó mỗi lượt refactor giao diện
// là một lượt làm hỏng người lạ, mà mình không có cách nào biết.
// `/api/public/v1/*` là lời hứa CÓ Ý THỨC, đánh số phiên bản, tách hẳn.
//
// 🔑 VÌ SAO KHÔNG CÓ RATE LIMIT: dữ liệu lịch cho một ngày là BẤT BIẾN —
// 23/08/2026 sẽ mãi mãi là ngày Canh Tuất. Nên phòng thủ đúng tầng là CACHE
// chứ không phải đếm lượt: mỗi ngày cụ thể chỉ tính đúng MỘT lần trong đời,
// phần còn lại CDN trả. Rate limit trong môi trường serverless nhiều instance
// thì hoặc phải có Redis (chưa có), hoặc đếm theo từng instance — tức một cái
// khoá lỏng lẻo tạo cảm giác an toàn giả. Thứ thật sự gác ở đây là trần dải
// ngày + trần năm bên dưới.
// ============================================================

import { NextResponse } from 'next/server';

/** CORS mở — API này CỐ Ý cho gọi thẳng từ trình duyệt. Chỉ đọc, không có
 *  phiên đăng nhập nào để lộ, nên `*` là đúng chứ không phải lỏng lẻo. */
export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** Trần dải ngày một lượt. Giữ nhỏ để không ai biến endpoint thành máy xuất
 *  cả bộ lịch trong một request. */
export const MAX_RANGE_DAYS = 31;
/** Ngoài dải này thuật toán lịch âm của engine không còn được kiểm chứng. */
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Hợp đồng lỗi DUY NHẤT: `{ ok:false, error:{ code, message } }`.
 * `code` là chuỗi máy đọc được — người tích hợp bắt theo `code`, không bắt
 * theo câu chữ tiếng Việt (câu chữ được phép sửa, code thì không).
 */
export function apiError(code: string, message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: CORS });
}

/**
 * Số giây còn lại tới nửa đêm giờ Việt Nam.
 *
 * Dùng làm trần cache cho lượt gọi KHÔNG nêu ngày (mặc định = hôm nay): giữ
 * bản "hôm nay" qua nửa đêm là trả sai ngày cho mọi người, mà lỗi đó không có
 * gì báo. Nêu ngày cụ thể thì kết quả bất biến nên cache một năm.
 */
export function secondsToVnMidnight(now = new Date()): number {
  const vn = new Date(now.getTime() + 7 * 3600_000);
  const passed = vn.getUTCHours() * 3600 + vn.getUTCMinutes() * 60 + vn.getUTCSeconds();
  return Math.max(60, 86400 - passed);
}

export function apiOk(data: unknown, opts: { immutable: boolean }): NextResponse {
  const maxAge = opts.immutable ? 31536000 : secondsToVnMidnight();
  return NextResponse.json(
    { ok: true, ...(data as Record<string, unknown>) },
    {
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`,
      },
    },
  );
}

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

/** Hôm nay theo giờ Việt Nam — KHÔNG theo giờ máy chủ (Vercel chạy UTC). */
export function todayVn(): Ymd {
  const vn = new Date(Date.now() + 7 * 3600_000);
  return { y: vn.getUTCFullYear(), m: vn.getUTCMonth() + 1, d: vn.getUTCDate() };
}

/**
 * Đọc `YYYY-MM-DD` và kiểm ngày CÓ THẬT.
 *
 * ⚠️ Kiểm bằng cách dựng `Date` rồi so lại từng thành phần — `new Date(2026,1,30)`
 * lặng lẽ trôi sang 02/03 chứ không báo lỗi, nên nhận bừa là trả lịch của một
 * ngày khác hẳn ngày người ta hỏi.
 */
export function parseYmd(raw: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = +m[1]!, mo = +m[2]!, d = +m[3]!;
  if (y < MIN_YEAR || y > MAX_YEAR || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

export function ymdToUtc(v: Ymd): Date {
  return new Date(Date.UTC(v.y, v.m - 1, v.d));
}

export function isoOf(v: Ymd): string {
  return `${v.y}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`;
}

export interface DateSelection {
  days: Ymd[];
  /** true khi mọi ngày đều do người gọi nêu rõ ⇒ kết quả bất biến, cache lâu. */
  immutable: boolean;
}

/**
 * Đọc `?date=` hoặc `?from=&to=` từ query. Trả về lỗi dạng chuỗi để route tự
 * bọc `apiError` với đúng code của nó.
 */
export function readDates(sp: URLSearchParams): DateSelection | { err: [string, string] } {
  const date = sp.get('date');
  const from = sp.get('from');
  const to = sp.get('to');

  if (date && (from || to)) {
    return { err: ['conflicting_params', 'Dùng `date`, hoặc cặp `from`+`to` — không dùng cả hai.'] };
  }

  if (from || to) {
    if (!from || !to) return { err: ['missing_param', 'Dải ngày cần CẢ `from` và `to` (YYYY-MM-DD).'] };
    const a = parseYmd(from), b = parseYmd(to);
    if (!a) return { err: ['bad_date', `\`from\` không hợp lệ: "${from}". Cần YYYY-MM-DD trong ${MIN_YEAR}–${MAX_YEAR}.`] };
    if (!b) return { err: ['bad_date', `\`to\` không hợp lệ: "${to}". Cần YYYY-MM-DD trong ${MIN_YEAR}–${MAX_YEAR}.`] };
    const ta = ymdToUtc(a).getTime(), tb = ymdToUtc(b).getTime();
    if (tb < ta) return { err: ['bad_range', '`to` phải bằng hoặc sau `from`.'] };
    const n = Math.round((tb - ta) / 86400_000) + 1;
    if (n > MAX_RANGE_DAYS) return { err: ['range_too_long', `Tối đa ${MAX_RANGE_DAYS} ngày một lượt (đang xin ${n}).`] };
    const days: Ymd[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(ta + i * 86400_000);
      days.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() });
    }
    return { days, immutable: true };
  }

  if (date) {
    const a = parseYmd(date);
    if (!a) return { err: ['bad_date', `\`date\` không hợp lệ: "${date}". Cần YYYY-MM-DD trong ${MIN_YEAR}–${MAX_YEAR}.`] };
    return { days: [a], immutable: true };
  }

  // Không nêu gì → hôm nay giờ VN. KHÔNG bất biến.
  return { days: [todayVn()], immutable: false };
}
