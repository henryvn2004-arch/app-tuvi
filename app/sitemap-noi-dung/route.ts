// app/sitemap-noi-dung/route.ts — nhóm BÀI NGƯỜI VIẾT.
// khao_luan · nghien-cuu (master_articles) · tu-dien · tai-lieu · sách (~990 URL).
// Đây là nhóm CÓ nội dung thật, nên tỉ lệ index của nó là chỉ số đáng tin nhất
// về thẩm quyền tên miền — trộn chung với 8.478 trang chương trình thì con số
// đó bị pha loãng tới mức không đọc được.
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import {
  BASE_URL,
  fetchAllSlugs,
  rowLastmod,
  urlEntry,
  xmlUrlset,
  xmlResponse,
} from '@/lib/seo/sitemap-source';

export async function GET() {
  // `hasUpdatedAt = true` CHỈ cho tu_dien + sach_library — hai bảng duy nhất có
  // cột đó. Hỏi nhầm là PostgREST 400 và mất im lặng cả họ URL.
  const [khaoLuan, masterArticles, tuDien, taiLieu, sach] = await Promise.all([
    fetchAllSlugs('khao_luan'),
    fetchAllSlugs('master_articles'),
    fetchAllSlugs('tu_dien', true),
    fetchAllSlugs('tai_lieu'),
    fetchAllSlugs('sach_library', true),
  ]);

  const entries: string[] = [];
  const push = (prefix: string, rows: Awaited<ReturnType<typeof fetchAllSlugs>>) => {
    for (const r of rows) {
      if (r.slug) entries.push(urlEntry(`${BASE_URL}${prefix}${encodeURIComponent(r.slug)}`, rowLastmod(r)));
    }
  };

  push('/khao-luan/', khaoLuan);
  push('/nghien-cuu/', masterArticles);
  push('/tu-dien/', tuDien);
  push('/tai-lieu/', taiLieu);
  push('/tai-lieu/sach/', sach);

  return xmlResponse(xmlUrlset(entries));
}
