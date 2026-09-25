// app/sitemap-trang/route.ts — nhóm TRANG TĨNH (trang chủ · hub chuyên mục · tools).
// Nhóm quan trọng nhất: đây là thứ phải index 100%. Tách riêng để GSC nói được
// ngay khi một trang tool rơi khỏi index, thay vì chìm trong 10.986 URL.
export const dynamic = 'force-dynamic';

import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';
import { KHAO_LUAN_CATEGORY_IDS } from '@/lib/content/khao-luan-categories';

// CỐ Ý KHÔNG có lastmod: mình không theo dõi ngày sửa của mấy trang này ở bất
// cứ đâu, mà bịa một ngày còn tệ hơn bỏ trống — xem lib/seo/lastmod.ts.
const STATIC_PAGES = [
    '/',
    '/nghien-cuu',            // master articles listing
    '/tac-gia',               // author listing
    '/app/luan-giai',         // core product page (301 từ /luan-giai.html cũ, 2026-09-14)
    '/tu-vi',                 // SEO pages index
    '/tu-dien',               // từ điển index
    '/thu-vien',              // thư viện — cổng tra cứu tổng
    '/thu-vien/sao-cung',     // hub sao × cung
    '/thu-vien/khai-niem',    // hub khái niệm
    '/thu-vien/nap-am',       // hub nạp âm
    '/thu-vien/nguoi-cung-ngay-sinh', // hub lịch 366 ngày dương — xem NGAY_SINH_PAGES bên dưới
    '/thu-vien/nguoi-cung-ngay-sinh-am-lich', // hub lịch 360 ngày âm — xem NGAY_SINH_AM_PAGES bên dưới
    '/about.html',
    '/phuong-phap',           // Tử Vi Nghiệm Chứng — quy trình 5 bước, trang DNA thương hiệu
    '/nguon-du-lieu.html', // ghi công nguồn dữ liệu (bắt buộc theo giấy phép CC BY)
    '/resources.html',
    '/van-dap',
    '/menh-kho.html',
    '/ngay-tot',              // ngay-tot hub
    '/xem-ngay-hom-nay',      // hoàng lịch đầy đủ HÔM NAY (thần sát/cửu tinh/bành tổ)
    '/van-han',               // van-han hub
    '/app/xem-tuoi',          // 301 từ /xem-tuoi.html cũ, 2026-09-19
    '/app/xem-lam-an',        // 301 từ /xem-lam-an.html cũ, 2026-09-19
    '/app/dien-tuong',        // 308 từ /tools/tuong-mat-ai.html cũ, 2026-09-25
    '/app/nhan-tuong',        // 308 từ /tools/nhan-tuong-ai.html cũ, 2026-09-25
    '/app/thu-tuong',         // 308 từ /tools/thu-tuong-ai.html cũ, 2026-09-25
    '/app/thanh-tuong',       // 308 từ /tools/thanh-tuong-ai.html cũ, 2026-09-25
    '/app/phong-thuy',        // 308 từ /tools/phong-thuy.html cũ, 2026-09-25
    '/contact.html',
    '/faqs.html',
    // Category hubs
    '/kien-thuc-tuvi',
    '/phong-thuy',
    '/xem-tuong',
    '/chon-ngay',
    '/lam-dep',
    '/dat-ten',
    // Tools
    '/tools/an-sao.html',
    '/tools/ban-lam-viec.html',
    '/tools/bat-trach.html',
    '/tools/la-ban-phong-thuy.html',
    '/tools/huong-nha-phong-thuy.html',
    '/tools/boi-bai-tay.html',
    '/tools/cach-cuc.html',
    '/tools/chon-ngay-tot.html',
    '/tools/cua-hang-phong-thuy.html',
    '/tools/dai-van.html',
    '/tools/dat-ten-con.html',
    '/tools/dat-ten-doanh-nghiep.html',
    '/tools/han-nam.html',
    '/tools/hoang-dao.html',
    '/tools/khi-sac-ai.html',
    // ── Trang standalone TỪNG BỊ SÓT khỏi sitemap ────────────────────────
    // Chúng đã tồn tại và có nội dung SEO đầy đủ nhưng chưa bao giờ được nộp,
    // tức phần việc viết trang coi như phí một nửa. `kim-lau.html` CỐ Ý không
    // có ở đây: nó đã 301 về trang trụ `/kim-lau` (đã khai bên dưới) — thêm vào
    // là tự nộp một URL chuyển hướng.
    '/tools/chan-dung-tien-kiep.html',
    '/tools/chan-dung-vo-chong.html',
    '/tools/cong-so.html',
    '/tools/da-lieu-ai.html',
    '/tools/day-con.html',
    '/tools/huong-nghiep-tre.html',
    '/tools/kieu-toc-ai.html',
    '/tools/ky-mon.html',
    '/tools/mai-hoa.html',
    '/tools/nguoi-khac.html',
    '/tools/nhan-mach.html',
    '/tools/personal-color.html',
    '/tools/trang-diem-ai.html',
    '/tools/trang-phuc-theo-ngay.html',
    // Trang trụ cụm kim lâu (không phải trang tool nữa) — cầu đã xác nhận qua
    // GSC nên để ngang các hub chuyên mục.
    '/kim-lau',
    '/bao-chi',
    '/nhung',
    '/api-docs',
    '/mcp-server',
    '/du-lieu',
    '/xong-dat',
    '/tools/kinh-dich.html',
    '/tools/luc-nham.html',
    '/tools/mau-sac-hop-menh.html',
    '/tools/nap-am.html',
    '/tools/ngay-tot.html',
    '/tools/ngu-hanh-ten.html',
    '/tools/oracle.html',
    '/tools/sao-nam.html',
    '/tools/tarot.html',
    '/tools/than-so-hoc.html',
    '/tools/thanh-tuong-pro.html',
    '/tools/tu-tru.html',
    '/tools/tuong-hop.html',
    '/tools/van-thang.html',
    '/tools/xem-tuoi-sinh-con.html',
];

// 366 trang hub theo NGÀY DƯƠNG LỊCH của app/thu-vien/nguoi-cung-ngay-sinh —
// tập cố định, sinh tại đây thay vì viết tay 366 dòng vào STATIC_PAGES.
// Cùng logic MONTH_DAYS với route đó (giữ nguyên `02-29` — có người thật
// sinh ngày này).
const NGAY_SINH_MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const NGAY_SINH_PAGES: string[] = (() => {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= NGAY_SINH_MONTH_DAYS[m - 1]; d++) {
      out.push(
        `/thu-vien/nguoi-cung-ngay-sinh/${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      );
    }
  }
  return out;
})();

// 360 trang hub theo NGÀY ÂM LỊCH (12 tháng × 30 ngày, không phân biệt tháng
// nhuận) của app/thu-vien/nguoi-cung-ngay-sinh-am-lich — cùng lý do sinh tại
// đây thay vì viết tay như NGAY_SINH_PAGES ở trên.
const NGAY_SINH_AM_PAGES: string[] = (() => {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 30; d++) {
      out.push(
        `/thu-vien/nguoi-cung-ngay-sinh-am-lich/${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      );
    }
  }
  return out;
})();

// 10 trang cụm /van-dap/<danh-mục> (trang 1, không phải /trang/N) — nguồn
// DUY NHẤT ở lib/content/khao-luan-categories.ts, thêm danh mục mới thì
// mảng này tự theo, không cần sửa ở đây.
const VAN_DAP_CAT_PAGES = KHAO_LUAN_CATEGORY_IDS.map((id) => `/van-dap/${id}`);

export async function GET() {
  const all = [...STATIC_PAGES, ...VAN_DAP_CAT_PAGES, ...NGAY_SINH_PAGES, ...NGAY_SINH_AM_PAGES];
  return xmlResponse(xmlUrlset(all.map((p) => urlEntry(BASE_URL + p))));
}
