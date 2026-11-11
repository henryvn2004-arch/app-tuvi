// app/xac-dinh-gio-sinh/[slug]/route.ts — hồ sơ giờ sinh SUY ĐOÁN (12 lá số, giờ nào khớp đời
// nhất). Cùng khuôn với Nghiệm Chứng: lib/nghiem-chung/trang-ho-so.ts.
// Ngôn ngữ đọc từ header `x-tvmb-locale` (proxy W4 bóc tiền tố /<locale> rồi gắn) ⇒ cùng một đường dẫn nội bộ phát
// ra nhiều ngôn ngữ. PHẢI dynamic: ISR khoá theo đường dẫn, không theo header — để `revalidate` là một bản dịch
// bị cache thành trang của ngôn ngữ khác. Bộ nhớ đệm vẫn do `Cache-Control: s-maxage` của response lo (CDN theo URL gốc).
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { localeFromHeaders } from '@/lib/i18n/locales';
import { trangHoSo } from '@/lib/nghiem-chung/trang-ho-so';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  return trangHoSo((await params).slug, 'xac-dinh-gio-sinh', localeFromHeaders(req.headers));
}
