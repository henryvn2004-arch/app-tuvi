// app/sitemap-la-so/route.ts — lá số NGƯỜI DÙNG TỰ CHIA SẺ (`laso_public`).
//
// 🔑 TÁCH HẲN khỏi `laso_pregen`: hai nhóm cùng sống ở /la-so/* nhưng nay đi hai
// hướng ngược nhau — nhóm này là trang người dùng đã TRẢ TIỀN rồi bấm chia sẻ
// (giữ index), còn pregen đang bị `noindex` để rút khỏi index. Gộp chung một
// file thì báo cáo GSC của nhóm này lúc nào cũng đỏ vì nhóm kia, và mình mất
// đúng thứ đang cần đo.
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
  const rows = await fetchAllSlugs('laso_public');
  const entries = rows
    .filter((r) => r.slug)
    .map((r) => urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  return xmlResponse(xmlUrlset(entries));
}
