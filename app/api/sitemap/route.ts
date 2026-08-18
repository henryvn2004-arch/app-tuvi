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

const CHILDREN = [
  '/sitemap-trang.xml',
  '/sitemap-noi-dung.xml',
  '/sitemap-seo.xml',
  '/sitemap-van-han.xml',
  '/sitemap-la-so.xml',
  '/sitemap-la-so-pregen.xml',
];

export async function GET() {
  return xmlResponse(xmlSitemapIndex(CHILDREN.map((p) => BASE_URL + p)));
}
