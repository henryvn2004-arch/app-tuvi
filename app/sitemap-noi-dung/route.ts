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
  fetchAllThuVienMuc,
  rowLastmod,
  urlEntry,
  xmlUrlset,
  xmlResponse,
} from '@/lib/seo/sitemap-source';

export async function GET() {
  // `hasUpdatedAt = true` CHỈ cho tu_dien + sach_library — hai bảng duy nhất có
  // cột đó. Hỏi nhầm là PostgREST 400 và mất im lặng cả họ URL.
  const [khaoLuan, masterArticles, tuDien, taiLieu, sach, thuVienMuc] = await Promise.all([
    // `khao_luan` CÓ cột `updated_at` (chú thích cũ ở hàm gọi nói "chỉ tu_dien
    // + sach_library có cột đó" — đã trôi so với schema thật, xem cột trong
    // Supabase). Thiếu `true` ở đây làm sửa bài không đổi `lastmod`, Google
    // không biết mà crawl lại.
    fetchAllSlugs('khao_luan', true),
    fetchAllSlugs('master_articles'),
    fetchAllSlugs('tu_dien', true),
    fetchAllSlugs('tai_lieu'),
    fetchAllSlugs('sach_library', true),
    fetchAllThuVienMuc(),
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

  // `thu_vien_muc`: URL phụ thuộc `bo_suu_tap` (/thu-vien/{bst}/{slug}) — không
  // dùng `push()` vì tiền tố khác nhau theo từng dòng, không phải một bảng
  // = một tiền tố cố định như các dòng trên.
  for (const r of thuVienMuc) {
    if (!r.slug || !r.bo_suu_tap) continue;
    entries.push(
      urlEntry(`${BASE_URL}/thu-vien/${r.bo_suu_tap}/${encodeURIComponent(r.slug)}`, rowLastmod(r)),
    );
  }

  return xmlResponse(xmlUrlset(entries));
}
