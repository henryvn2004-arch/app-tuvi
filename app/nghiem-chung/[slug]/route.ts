// app/nghiem-chung/[slug]/route.ts — hồ sơ giờ sinh KIỂM CHỨNG. Khuôn trang ở
// lib/nghiem-chung/trang-ho-so.ts (dùng chung với /xac-dinh-gio-sinh/[slug]).
// Ngôn ngữ đọc từ header `x-tvmb-locale` (proxy W4 bóc tiền tố /<locale> rồi gắn) ⇒ cùng một đường dẫn nội bộ phát
// ra nhiều ngôn ngữ. PHẢI dynamic: ISR khoá theo đường dẫn, không theo header — để `revalidate` là một bản dịch
// bị cache thành trang của ngôn ngữ khác. Bộ nhớ đệm vẫn do `Cache-Control: s-maxage` của response lo (CDN theo URL gốc).
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { localeFromHeaders } from '@/lib/i18n/locales';
import { trangHoSo } from '@/lib/nghiem-chung/trang-ho-so';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  return trangHoSo((await params).slug, 'nghiem-chung', localeFromHeaders(req.headers));
}
