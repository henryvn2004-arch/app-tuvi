// app/sitemap-pregen/route.ts
// ============================================================
// ⚠️ ĐÃ RÚT KHỎI SITEMAP — cố ý trả về sitemapindex RỖNG.
//
// Trước đây file này liệt kê 67 sitemap con (1960–2026), tổng 587.328 URL
// /la-so/* sinh bằng thuật toán. Đo bằng Google Search Console 28 ngày:
//
//   URL đã nộp qua sitemap ........ 616.715
//   Trang từng hiện trong kết quả .. 612  (0,099%)
//   Nhấp từ toàn bộ corpus này ..... 0
//
// Các trang /la-so/* THỰC SỰ được index và xếp hạng rất tốt — hạng 1,4–3,5.
// Vấn đề không phải index, mà là chúng chỉ khớp truy vấn dạng NGÀY SINH CHÍNH
// XÁC, thứ gần như không ai gõ: 842 hiển thị nhưng 0 nhấp, và GSC ẩn tên gần
// hết truy vấn vì quá hiếm. Trong khi đó những cụm CÓ cầu thật (kim lâu, ngày
// tốt, tử vi <can chi>) thì site nằm hạng 73–100.
//
// Nộp 587K URL không sinh nhấp làm loãng crawl của một site chỉ có 16 nhấp/28
// ngày. Rút xuống để dồn về ~35K trang có cầu thật.
//
// KHÔNG xoá route: trả 404 cho một sitemap đã submit thì GSC báo lỗi kéo dài.
// sitemapindex rỗng là cách de-list sạch — vẫn 200, vẫn XML hợp lệ, số URL về 0.
// KHÔNG đụng gì tới bản thân các trang /la-so/*: chúng vẫn sống, vẫn render,
// vẫn crawl được qua hub /menh-kho, và 1.444 lá số pregen THẬT + 32 lá số công
// khai vốn đã nằm trong sitemap.xml chính. Đây chỉ là thôi *nộp* phần suy đoán.
//
// Các route con /sitemap-pregen/[year] giữ nguyên, nay không còn ai trỏ tới.
// Muốn bật lại: khôi phục danh sách YEARS bên dưới + thêm lại dòng Sitemap
// trong public/robots.txt.
//
// 👉 Việc tay: vào GSC → Sitemaps, XOÁ mục sitemap-pregen.xml để dọn ngay,
//    thay vì đợi Google tự nhận ra nó rỗng.
// ============================================================
export const revalidate = false;

import { NextResponse } from 'next/server';

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
