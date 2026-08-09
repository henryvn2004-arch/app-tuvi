// app/sitemap-seo/route.ts — nhóm TRANG SEO CHƯƠNG TRÌNH (`seo_pages` → /tu-vi/*).
// Nhóm đông nhất trong sitemap.xml (~8.478 URL). Tách riêng vì nó và nhóm bài
// người viết hỏng theo hai kiểu khác hẳn nhau: trang chương trình rớt index vì
// mỏng/trùng, bài người viết rớt vì không ai trỏ link tới.
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { BASE_URL, fetchAllSeoPages, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';

export async function GET() {
  const rows = await fetchAllSeoPages();
  const entries: string[] = [];
  for (const r of rows) {
    if (!r.slug) continue;
    // Category 'van-han' đã được 301 sang họ /van-han/* (bản nội dung dày hơn)
    // — xem `vanHanRedirectTarget` trong app/api/tu-vi/route.ts. Nộp URL chuyển
    // hướng vào sitemap là bắt Google đi một nhịp thừa cho 480 URL, và giữ hai
    // họ cùng tồn tại trong mắt nó đúng lúc mình đang cố gộp lại.
    if (r.category === 'van-han') continue;
    entries.push(urlEntry(`${BASE_URL}/tu-vi/${encodeURIComponent(r.slug)}`, r.created_at));
  }
  return xmlResponse(xmlUrlset(entries));
}
