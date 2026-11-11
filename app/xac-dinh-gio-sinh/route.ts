// app/xac-dinh-gio-sinh/route.ts — trang tổng hợp mục Đoán Giờ Sinh. Khuôn chung: lib/nghiem-chung/trang-hub.ts.
// Ngôn ngữ đọc từ header `x-tvmb-locale` (proxy W4 bóc tiền tố /<locale> rồi gắn) ⇒ cùng một đường dẫn nội bộ phát
// ra nhiều ngôn ngữ. PHẢI dynamic: ISR khoá theo đường dẫn, không theo header — để `revalidate` là một bản dịch
// bị cache thành trang của ngôn ngữ khác. Bộ nhớ đệm vẫn do `Cache-Control: s-maxage` của response lo (CDN theo URL gốc).
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { localeFromHeaders } from '@/lib/i18n/locales';
import { trangHub } from '@/lib/nghiem-chung/trang-hub';

export async function GET(req: NextRequest): Promise<Response> {
  return trangHub(req, 'xac-dinh-gio-sinh', localeFromHeaders(req.headers));
}
