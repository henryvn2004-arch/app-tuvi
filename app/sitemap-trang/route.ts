// app/sitemap-trang/route.ts — nhóm TRANG TĨNH (trang chủ · hub chuyên mục · tools).
// Nhóm quan trọng nhất: đây là thứ phải index 100%. Tách riêng để GSC nói được
// ngay khi một trang tool rơi khỏi index, thay vì chìm trong 10.986 URL.
export const dynamic = 'force-dynamic';

import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';

// CỐ Ý KHÔNG có lastmod: mình không theo dõi ngày sửa của mấy trang này ở bất
// cứ đâu, mà bịa một ngày còn tệ hơn bỏ trống — xem lib/seo/lastmod.ts.
const STATIC_PAGES = [
    '/',
    '/nghien-cuu',            // master articles listing
    '/tac-gia',               // author listing
    '/luan-giai.html',        // core product page
    '/tu-vi',                 // SEO pages index
    '/tu-dien',               // từ điển index
    '/about.html',
    '/resources.html',
    '/blog.html',
    '/menh-kho.html',
    '/ngay-tot',              // ngay-tot hub
    '/van-han',               // van-han hub
    '/xem-tuoi.html',
    '/xem-lam-an.html',
    '/contact.html',
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
    '/tools/kinh-dich.html',
    '/tools/luc-nham.html',
    '/tools/mau-sac-hop-menh.html',
    '/tools/nap-am.html',
    '/tools/ngay-tot.html',
    '/tools/ngu-hanh-ten.html',
    '/tools/nhan-tuong-ai.html',
    '/tools/oracle.html',
    '/tools/phong-thuy.html',
    '/tools/sao-nam.html',
    '/tools/tarot.html',
    '/tools/than-so-hoc.html',
    '/tools/thanh-tuong-ai.html',
    '/tools/thanh-tuong-pro.html',
    '/tools/thu-tuong-ai.html',
    '/tools/tu-tru.html',
    '/tools/tuong-hop.html',
    '/tools/tuong-mat-ai.html',
    '/tools/van-thang.html',
    '/tools/xem-tuoi-sinh-con.html',
];

export async function GET() {
  return xmlResponse(xmlUrlset(STATIC_PAGES.map((p) => urlEntry(BASE_URL + p))));
}
