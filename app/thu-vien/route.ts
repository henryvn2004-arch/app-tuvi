// app/thu-vien/route.ts — THƯ VIỆN: nhà tra cứu tử vi & huyền học.
//
// 🔴 TRƯỚC 2026-09: trang này là lưới ảnh "Thư Viện Luận Đường" — bản luận
// người dùng bấm "Chia sẻ", AUTO OPT-IN (`gallery_opt_out=false` mặc định).
// Ai bấm chia sẻ để gửi riêng cho vợ/bạn thì mặc nhiên lên một trang công
// khai, trừ khi tự tìm ra nút ẩn. Không có trục chủ đề, không tra cứu được gì
// — nội dung là gì phụ thuộc hoàn toàn vào ai vừa bấm chia sẻ.
//
// NAY: trang thuần THAM KHẢO/TRA CỨU — không đọc `shared_results`, không hiện
// bất cứ dữ liệu cá nhân nào của người dùng. Gom 4 kho nội dung ĐÃ CÓ SẴN và
// ĐÃ INDEX (`tu_dien` · `khao_luan` · `master_articles` · `sach_library`)
// thành một cổng vào theo chủ đề, thay vì để rời rạc như trước.
//
// Lưới ảnh cũ không mất — `/ket-qua/[id]` (nơi các thẻ đó trỏ tới) vẫn sống
// nguyên, người đã chia sẻ không mất link nào.
//
// Bộ sưu tập SINH TỪ ENGINE đã lên: `/thu-vien/sao-cung` (113 tổ hợp chính
// tinh × cung có cách cục) · `/thu-vien/khai-niem` (54 thuật ngữ) ·
// `/thu-vien/nap-am` (30 nạp âm) — xem app/thu-vien/[bst]/route.ts. Đếm theo
// publish_status='published' nên trước khi cron app/api/cron/thu-vien-build
// chạy xong lượt đầu, thẻ vẫn hiện nhưng đếm 0 — route hub tự xử lý trạng
// thái rỗng, không phải 404.
export const revalidate = 3600;

import { NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { PUBLISH_GATED_TABLES, withPublished } from '@/lib/content/publish-filter';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Section {
  href: string;
  title: string;
  desc: string;
  count: number | null;
  countLabel: string;
}

/**
 * Đếm mỗi bảng bằng `Prefer: count=exact` + `HEAD` — không kéo dữ liệu, chỉ
 * lấy con số. Đếm hụt (lỗi mạng/schema) → `null`, trang vẫn dựng nhưng KHÔNG
 * bịa số: thẻ đó ẩn phần "N mục" thay vì hiện số cũ/số sai.
 *
 * Bảng nằm trong `PUBLISH_GATED_TABLES` (`khao_luan` · `master_articles`) thì
 * TỰ ĐỘNG lọc `publish_status=published` — đây là trang CÔNG KHAI, không phải
 * admin, nên đếm cả bài đã gỡ là bịa số cho người đọc. `npm run check:publish`
 * canh đúng chuyện này.
 */
async function demBang(table: string): Promise<number | null> {
  const base = `${SB_URL}/rest/v1/${table}?select=id`;
  const url = (PUBLISH_GATED_TABLES as readonly string[]).includes(table)
    ? withPublished(base)
    : base;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        Prefer: 'count=exact',
      },
    });
    if (!res.ok) return null;
    const range = res.headers.get('content-range'); // "0-24/132"
    const total = range?.split('/')[1];
    return total ? parseInt(total, 10) : null;
  } catch (e) {
    console.error('[thu-vien] đếm hỏng', table, e);
    return null;
  }
}

/** Đếm MỘT bộ sưu tập của thu_vien_muc (bo_suu_tap), chỉ tính dòng published
 * — HEAD + count=exact, không kéo dữ liệu. Cùng nguyên tắc `demBang`: đếm
 * hụt → null, ẩn số thay vì bịa. */
async function demBoSuuTap(bst: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/thu_vien_muc?bo_suu_tap=eq.${bst}&publish_status=eq.published&select=id`,
      {
        method: 'HEAD',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact' },
      },
    );
    if (!res.ok) return null;
    const range = res.headers.get('content-range');
    const total = range?.split('/')[1];
    return total ? parseInt(total, 10) : null;
  } catch (e) {
    console.error('[thu-vien] đếm bộ sưu tập hỏng', bst, e);
    return null;
  }
}

/** Đếm `celeb_births` (chưa bị chặn) cho card "Người Cùng Ngày Sinh" —
 * cùng bảng, cùng chuẩn no-store/HEAD, xem app/thu-vien/nguoi-cung-ngay-sinh. */
async function demCeleb(): Promise<number | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/celeb_births?blocked=is.false&select=id`, {
      method: 'HEAD',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact' },
    });
    if (!res.ok) return null;
    const range = res.headers.get('content-range');
    const total = range?.split('/')[1];
    return total ? parseInt(total, 10) : null;
  } catch (e) {
    console.error('[thu-vien] đếm celeb_births hỏng', e);
    return null;
  }
}

export async function GET(): Promise<Response> {
  const [tuDien, khaoLuan, nghienCuu, saoCung, khaiNiem, napAm, celeb] = await Promise.all([
    demBang('tu_dien'),
    demBang('khao_luan'),
    demBang('master_articles'),
    demBoSuuTap('sao-cung'),
    demBoSuuTap('khai-niem'),
    demBoSuuTap('nap-am'),
    demCeleb(),
  ]);

  const sections: Section[] = [
    {
      href: '/tu-dien',
      title: 'Từ Điển Tử Vi & Huyền Học',
      desc: 'Tra cứu theo mục: sao tử vi, cung số, khái niệm cổ pháp, tướng pháp, ngày tốt, phong thủy, làm đẹp và đặt tên theo ngũ hành.',
      count: tuDien,
      countLabel: 'mục tra cứu',
    },
    {
      href: '/thu-vien/sao-cung',
      title: 'Sao An Tại Từng Cung',
      desc: 'Ý nghĩa từng chính tinh khi an tại một cung cụ thể — tổng hợp cách cục cổ văn ghi lại cho đúng tổ hợp sao×cung đó.',
      count: saoCung,
      countLabel: 'tổ hợp',
    },
    {
      href: '/thu-vien/khai-niem',
      title: 'Khái Niệm Tử Vi & Huyền Học',
      desc: 'Thuật ngữ nền tảng của Tử Vi Đẩu Số, Bát Tự, Kỳ Môn Độn Giáp, Lục Nhâm và Hoàng lịch.',
      count: khaiNiem,
      countLabel: 'khái niệm',
    },
    {
      href: '/thu-vien/nap-am',
      title: 'Nạp Âm Lục Thập Hoa Giáp',
      desc: '30 tên nạp âm trong chu kỳ 60 năm — ngũ hành và ý nghĩa của từng nạp âm.',
      count: napAm,
      countLabel: 'nạp âm',
    },
    {
      href: '/thu-vien/nguoi-cung-ngay-sinh',
      title: 'Cùng Ngày Sinh — Dương Lịch',
      desc: 'Chọn ngày sinh dương lịch — xem ai cũng sinh ngày đó và thuộc cung hoàng đạo gì. Dữ liệu tổng hợp từ Wikidata.',
      count: celeb,
      countLabel: 'người',
    },
    {
      href: '/thu-vien/nguoi-cung-ngay-sinh-am-lich',
      title: 'Cùng Ngày Sinh — Âm Lịch',
      desc: 'Chọn ngày âm lịch (bất kể năm can chi) — xem ai cũng sinh ngày âm đó, kèm ngày dương lịch tương ứng của từng người.',
      count: celeb,
      countLabel: 'người',
    },
    {
      href: '/van-dap',
      title: 'Vấn Đáp',
      desc: 'Phân tích chuyên sâu theo chủ đề: tính cách, sự nghiệp, tài chính, hôn nhân, gia đình, con cái — đối chiếu với cổ pháp Tử Vi Đẩu Số.',
      count: khaoLuan,
      countLabel: 'bài vấn đáp',
    },
    {
      href: '/nghien-cuu',
      title: 'Nghiên Cứu Học Thuật',
      desc: 'Bài viết học thuật, chiêm nghiệm và thực hành từ góc nhìn lý luận — dành cho người muốn hiểu sâu hơn nguyên lý, không chỉ kết quả.',
      count: nghienCuu,
      countLabel: 'bài nghiên cứu',
    },
    {
      href: '/resources.html',
      title: 'Sách & Tài Liệu',
      desc: 'Tủ sách cổ pháp: tư liệu gốc và tổng hợp về Tử Vi Đẩu Số, Bát Tự, phong thủy — dùng để đối chiếu, không phải để thay luận giải.',
      count: null,
      countLabel: 'đầu sách',
    },
  ];

  // 🔑 HREF LÀ SỰ THẬT ĐÃ ĐỐI CHIẾU, KHÔNG PHẢI ĐOÁN: `/khao-luan` (không
  // slug) và `/tai-lieu` KHÔNG có rewrite bare-path trong next.config.mjs
  // (chỉ `/khao-luan/:slug` · `/tai-lieu/:slug` có slug mới khớp) → 404 cho
  // người thật, nên KHÔNG trỏ vào đó. `/van-dap` khác hẳn: nó là route SSR
  // thật (app/van-dap/route.ts), không phải alias/redirect — trỏ thẳng vào
  // đó là đúng, không phải giải pháp tạm. `tai-lieu.html` tự redirect slug
  // rỗng sang `/resources.html` — đó mới là listing thật cho tài liệu.
  // `sach_library` (168 dòng) KHÔNG khớp `/resources.html` (223 mục tĩnh, tự
  // viết tay, không đọc bảng đó) — hai nguồn cho cùng một thư mục, đếm theo
  // bảng rồi gắn vào trang kia là bịa số. Để `count: null` cho card này.
  //
  // `nguoi-cung-ngay-sinh`/`-am-lich` KHÔNG cộng vào tổng: cả hai đọc CÙNG một
  // số celeb_births (272k+ NGƯỜI), không phải "mục nội dung" cùng loại với
  // bài/thuật ngữ — cộng chung vừa đếm trùng đôi vừa thổi phồng badge sai bản chất.
  const NGAY_SINH_HREFS = ['/thu-vien/nguoi-cung-ngay-sinh', '/thu-vien/nguoi-cung-ngay-sinh-am-lich'];
  const totalKnown = sections
    .filter((s) => !NGAY_SINH_HREFS.includes(s.href))
    .reduce((s, x) => s + (x.count || 0), 0);

  const cards = sections
    .map(
      (s) => `<a class="lib-card" href="${esc(s.href)}">
      <div class="lib-card-top">
        <h2 class="lib-card-title">${esc(s.title)}</h2>
        ${s.count != null ? `<span class="lib-card-count">${s.count}</span>` : ''}
      </div>
      <p class="lib-card-desc">${esc(s.desc)}</p>
      <span class="lib-card-cta">${s.count != null ? esc(s.countLabel) : 'Xem thư mục'} →</span>
    </a>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Thư Viện Tử Vi &amp; Huyền Học | Tử Vi Minh Bảo</title>
<meta name="description" content="Tra cứu tử vi và huyền học theo cổ pháp: từ điển sao/cung, khảo luận chuyên sâu, nghiên cứu học thuật và tủ sách — tổng hợp một nơi, có nguồn dẫn.">
<meta property="og:title" content="Thư Viện Tử Vi &amp; Huyền Học — Tử Vi Minh Bảo">
<meta property="og:description" content="Tra cứu tử vi và huyền học theo cổ pháp: từ điển, khảo luận, nghiên cứu học thuật và tủ sách.">
<meta property="og:image" content="${BASE}/seal.webp">
<meta property="og:url" content="${BASE}/thu-vien">
<link rel="canonical" href="${BASE}/thu-vien">
<meta name="robots" content="index, follow">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preload" href="/fonts/noto-serif-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif-vietnamese-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif.css?v=1" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/fonts/noto-serif.css?v=1"></noscript>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Thư Viện Tử Vi Minh Bảo',
  description: 'Cổng tra cứu tử vi và huyền học theo cổ pháp',
  url: `${BASE}/thu-vien`,
  publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
  hasPart: sections.map((s) => ({
    '@type': 'CollectionPage',
    name: s.title,
    url: `${BASE}${s.href}`,
  })),
})}</script>
<link rel="stylesheet" href="/shell.css?v=63">
<style>
/* Nằm TRONG khung app (sidebar chung của shell.js) — bấm "Thư viện" ở sidebar
   không còn rơi ra trang có menu ☰ riêng của nav.js. Màu dùng biến của
   shell.css để theo luôn giao diện tối. */
.ws-body{padding:22px 26px 60px;max-width:1000px}
.lib-hero{padding:4px 0 22px;border-bottom:1px solid var(--line);margin-bottom:22px}
.lib-hero-title{font-family:var(--serif);font-size:26px;font-weight:600;color:var(--heading);line-height:1.3;margin:0 0 8px}
.lib-hero-desc{font-size:14px;color:var(--text-mid);max-width:640px;line-height:1.7;margin:0 0 12px}
.lib-hero-count{display:inline-block;background:var(--gold-lt);border:1px solid var(--line-2);color:var(--gold-soft);border-radius:20px;padding:4px 14px;font-size:12.5px;font-weight:600}
.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.lib-card{display:flex;flex-direction:column;text-decoration:none;color:inherit;background:var(--white);border:1px solid var(--line);border-radius:13px;padding:18px}
.lib-card:hover{border-color:var(--gold-soft)}
.lib-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.lib-card-title{font-family:var(--serif);font-size:16.5px;font-weight:600;color:var(--heading);line-height:1.35;margin:0}
.lib-card-count{flex-shrink:0;font-size:12px;font-weight:600;color:var(--gold-soft);background:var(--gold-lt);border-radius:20px;padding:2px 10px;white-space:nowrap}
.lib-card-desc{font-size:13px;color:var(--text-mid);line-height:1.6;flex:1;margin:0}
.lib-card-cta{margin-top:12px;font-size:12px;font-weight:600;color:var(--gold-soft)}
.lib-cta{margin-top:28px;background:var(--paper-2);border:1px solid var(--line);border-radius:14px;padding:22px;text-align:center}
.lib-cta b{font-family:var(--serif);font-size:16px;display:block;margin-bottom:6px;color:var(--heading)}
.lib-cta p{font-size:13.5px;color:var(--text-mid);margin:0 0 14px}
.lib-cta a{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-family:var(--serif);font-weight:600;font-size:15px;padding:10px 26px;border-radius:9px}
@media(max-width:700px){.ws-body{padding:16px 16px 48px}.lib-hero-title{font-size:22px}.lib-grid{grid-template-columns:1fr}}
</style>
</head><body>
<div class="shell">
  <aside class="sb" id="shell-sidebar"></aside>
  <main class="ws" id="ws">
    <div class="ws-top">
      <button class="btn mobile-only" onclick="document.getElementById('shell-sidebar').classList.toggle('open');window.shellSyncBackdrop&&shellSyncBackdrop()" aria-label="Menu">☰</button>
      <div class="ws-title"><b>Thư viện</b><span>Tra cứu tử vi &amp; huyền học theo cổ pháp</span></div>
    </div>
    <div class="ws-body">
      <div class="lib-hero">
        <h1 class="lib-hero-title">Thư Viện Tử Vi &amp; Huyền Học</h1>
        <p class="lib-hero-desc">Tổng hợp tri thức tử vi đẩu số theo cổ pháp — tra cứu theo mục, đọc khảo luận chuyên sâu, hoặc đối chiếu tư liệu gốc. Không cần nhập ngày sinh.</p>
        ${totalKnown > 0 ? `<span class="lib-hero-count">${totalKnown}+ mục nội dung</span>` : ''}
      </div>
      <div class="lib-grid">${cards}</div>
      <div class="lib-cta">
        <b>Muốn xem lá số của riêng bạn?</b>
        <p>Nhập ngày sinh — luận giải cá nhân hóa theo đúng lá số của bạn, không phải nội dung tổng hợp.</p>
        <a href="/app?utm_source=thu-vien&utm_medium=internal&utm_campaign=library">Hỏi Thầy →</a>
      </div>
    </div>
  </main>
</div>
<script src="/track.js?v=4" defer></script>
<script src="/nav.js?v=45" data-icons-only></script>
<script src="/auth.js?v=4"></script>
<script>window.SHELL_ACTIVE='thu-vien';</script>
<script src="/shell.js?v=113"></script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
