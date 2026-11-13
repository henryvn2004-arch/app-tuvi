// app/sitemap-la-so/route.ts — lá số NGƯỜI DÙNG TỰ CHIA SẺ (`laso_public`).
//
// 🔑 TÁCH HẲN khỏi `laso_pregen`: hai nhóm cùng sống ở /la-so/* nhưng nay đi hai
// hướng ngược nhau — nhóm này là trang người dùng đã TRẢ TIỀN rồi bấm chia sẻ
// (giữ index), còn pregen đang bị `noindex` để rút khỏi index. Gộp chung một
// file thì báo cáo GSC của nhóm này lúc nào cũng đỏ vì nhóm kia, và mình mất
// đúng thứ đang cần đo.
//
// Đa ngôn ngữ (i18n W33a): `?lang=<locale>` chỉ liệt kê bản ghi ĐÃ có bản luận ở ngôn ngữ đó (cửa
// `lib/laso/luan-i18n.ts`) — bản chưa dịch là noindex, không được mời crawl. Sitemap index chỉ khai ngôn ngữ
// có ít nhất một bản (`localesCoLuanI18n`).
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/locales';
import { slugsLuanI18n } from '@/lib/laso/luan-i18n';
import {
  BASE_URL,
  fetchAllSlugs,
  rowLastmod,
  urlEntry,
  xmlUrlset,
  xmlResponse,
} from '@/lib/seo/sitemap-source';

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang');
  if (isLocale(lang) && lang !== 'vi') {
    const dich = await slugsLuanI18n(lang);
    return xmlResponse(
      xmlUrlset(dich.map((r) => urlEntry(`${BASE_URL}/${lang}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r))))
    );
  }
  const rows = await fetchAllSlugs('laso_public');
  const entries = rows
    .filter((r) => r.slug)
    .map((r) => urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  return xmlResponse(xmlUrlset(entries));
}
