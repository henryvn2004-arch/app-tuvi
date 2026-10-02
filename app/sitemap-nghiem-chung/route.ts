// app/sitemap-nghiem-chung/route.ts — hồ sơ Nghiệm Chứng ĐÃ MỞ INDEX.
// Chỉ hồ sơ có `indexed` (viết tay, hoặc slug trong data/nghiem-chung/indexed.txt
// lúc dựng manifest) — hồ sơ chưa mở mang noindex, đưa vào sitemap là tự mâu thuẫn.
export const revalidate = 86400;

import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';
import { danhMuc } from '@/lib/nghiem-chung/store';

export async function GET() {
  const urls = danhMuc()
    .filter((x) => x.indexed && !x.gioDoan)
    .map((x) => urlEntry(`${BASE_URL}/nghiem-chung/${x.slug}`));
  return xmlResponse(xmlUrlset(urls));
}
