// app/sitemap-la-so-pregen/route.ts — 1.444 lá số dựng sẵn (`laso_pregen`).
//
// ⚠️ NHÓM NÀY ĐANG BỊ RÚT KHỎI INDEX — `buildPregenHTML` nay phát `noindex`.
//
// 🔑 Vì sao URL `noindex` vẫn NẰM TRONG sitemap, dù Google khuyên đừng:
// bài học #358 ghi thẳng — *rút khỏi sitemap KHÔNG deindex*. Pregen đã bị rút
// khỏi `sitemap-pregen.xml` từ hồi đó mà `/la-so/*` vẫn ăn impression đều, vẫn
// xếp hạng 1,4. Muốn Google GỠ một trang thì nó phải CRAWL LẠI trang đó để đọc
// thẻ `noindex`, và sitemap là đường mời crawl nhanh nhất mình có. Gỡ khỏi
// sitemap CÙNG LÚC đặt noindex là lặp lại đúng sai lầm cũ: trang biến khỏi lời
// mời nhưng ở lại trong index, có khi hàng tháng.
//
// ⏭️ VIỆC TIẾP: khi GSC báo nhóm này đã hết index (Pages → lọc theo sitemap này
// → "Excluded by 'noindex'" phủ gần hết), thì XOÁ file này + gỡ khỏi
// sitemapindex. Đó mới là lúc đúng để rút.
export const dynamic = 'force-dynamic';

import {
  BASE_URL,
  fetchAllSlugs,
  rowLastmod,
  urlEntry,
  xmlUrlset,
  xmlResponse,
} from '@/lib/seo/sitemap-source';

export async function GET() {
  const rows = await fetchAllSlugs('laso_pregen');
  const entries = rows
    .filter((r) => r.slug)
    .map((r) => urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  return xmlResponse(xmlUrlset(entries));
}
