// app/api/sitemap/route.ts — `/sitemap.xml` nay là SITEMAPINDEX, không còn là
// một cục 10.986 URL.
//
// 🔴 ĐÍNH CHÍNH tiền đề hay gặp: chia nhỏ KHÔNG làm Google crawl nhanh hơn.
// Nguyên văn Mueller: *"Google's systems handle both small sitemap files and big
// sitemap files in the same way… there's no technical advantage by splitting
// them"*. Lợi ích DUY NHẤT là GIÁM SÁT — báo cáo GSC lọc được theo từng sitemap,
// nên trả lời được "nhóm nào không được index" thay vì nhìn một con số gộp.
//
// Vì thế các nhóm dưới đây chia theo thứ mình sẽ HÀNH ĐỘNG KHÁC NHAU khi chúng
// hỏng, không phải chia cho tròn số:
//   trang     — trang tĩnh/tool, phải index 100%; rớt là sự cố
//   noi-dung  — bài người viết; tỉ lệ index của nó = thước đo thẩm quyền tên miền
//   seo       — trang SEO chương trình; rớt vì mỏng/trùng
//   van-han   — họ vừa gộp từ 2 nguồn; cần theo riêng để biết cú gộp có ăn không
//   la-so     — lá số người dùng trả tiền rồi chia sẻ; PHẢI index
//   la-so-pregen — đang bị rút khỏi index (noindex); theo riêng để biết khi nào xong
//
// KHÔNG nộp `sitemap-hubs.xml` và `sitemap-ngay-tot.xml` vào đây — hai file đó
// đã được nộp THẲNG trong GSC và khai trong robots.txt. Nộp cả hai đường là một
// URL đếm hai lần trong báo cáo, đúng thứ việc chia nhóm sinh ra để tránh.
export const dynamic = 'force-dynamic';

import { BASE_URL, xmlSitemapIndex, xmlResponse } from '@/lib/seo/sitemap-source';
import availability from '@/i18n/availability.json';
import { danhMuc } from '@/lib/nghiem-chung/store';
import { dbDanhMucDich } from '@/lib/nghiem-chung/i18n/db';
import type { NcLocale } from '@/lib/nghiem-chung/i18n/prose';
import { localesCoLuanI18n } from '@/lib/laso/luan-i18n';

const CHILDREN = [
  '/sitemap-trang.xml',
  '/sitemap-noi-dung.xml',
  '/sitemap-nghiem-chung.xml',
  '/sitemap-xac-dinh-gio-sinh.xml',
  '/sitemap-seo.xml',
  '/sitemap-van-han.xml',
  '/sitemap-la-so.xml',
  '/sitemap-la-so-pregen.xml',
];

// Sitemap theo ngôn ngữ (đa ngôn ngữ): chỉ liệt kê ngôn ngữ ĐÃ có ít nhất một trang dịch đủ.
const I18N_LOCALES = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'];

/**
 * Sitemap hồ sơ theo ngôn ngữ (W6 lọc theo `?lang=`): chỉ khai ngôn ngữ ĐÃ có ít nhất một hồ sơ dịch
 * + đã mở index ở bản gốc, tách Nghiệm Chứng / Xác Định Giờ Sinh như hai file vi. Lỗi DB ⇒ bỏ qua
 * (index vẫn trả về được, chỉ thiếu các dòng này lượt đó).
 */
async function ncLocaleSitemaps(): Promise<string[]> {
  try {
    const goc = new Map((await danhMuc()).filter((x) => x.indexed).map((x) => [x.slug, !!x.gioDoan]));
    const out: string[] = [];
    for (const l of I18N_LOCALES) {
      const has = (await dbDanhMucDich(l as NcLocale)).map((x) => goc.get(x.slug)).filter((g) => g !== undefined);
      if (has.some((g) => g === false)) out.push(`/sitemap-nghiem-chung.xml?lang=${l}`);
      if (has.some((g) => g === true)) out.push(`/sitemap-xac-dinh-gio-sinh.xml?lang=${l}`);
    }
    return out;
  } catch (e) {
    console.error('[sitemap] ncLocaleSitemaps:', (e as Error).message);
    return [];
  }
}

export async function GET() {
  const translated = new Set(Object.values(availability as Record<string, string[]>).flat());
  const i18n = I18N_LOCALES.filter((l) => translated.has(l)).map((l) => `/sitemap-i18n-${l}.xml`);
  // Lá số người dùng có bản luận dịch (i18n W33a) — chỉ ngôn ngữ đã có ít nhất một bản; lỗi kho ⇒ [].
  const laso = (await localesCoLuanI18n()).map((l) => `/sitemap-la-so.xml?lang=${l}`);
  return xmlResponse(
    xmlSitemapIndex([...CHILDREN, ...i18n, ...(await ncLocaleSitemaps()), ...laso].map((p) => BASE_URL + p))
  );
}
