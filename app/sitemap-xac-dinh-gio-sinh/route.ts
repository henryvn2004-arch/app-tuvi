// app/sitemap-xac-dinh-gio-sinh/route.ts — hồ sơ ĐOÁN GIỜ SINH đã mở index (cùng luật với
// app/sitemap-nghiem-chung: hồ sơ chưa mở mang noindex thì không vào sitemap).
export const revalidate = 86400;

import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';
import { danhMuc } from '@/lib/nghiem-chung/store';

export async function GET() {
  const urls = danhMuc()
    .filter((x) => x.indexed && x.gioDoan)
    .map((x) => urlEntry(`${BASE_URL}/xac-dinh-gio-sinh/${x.slug}`));
  return xmlResponse(xmlUrlset(urls));
}
