// app/bao-chi/route.ts
// ============================================================
// TRANG BÁO CHÍ / MEDIA KIT — mục #3/14 track Digital Marketing.
//
// Hai vai, và vai thứ hai mới là lý do nó phải là route ĐỘNG:
//
//  1. Tài sản dùng chung cho MỌI kênh outreach — pitch guest post, pitch nhà
//     báo, nộp directory đều cần cùng một bộ: site là gì, số liệu thật, logo,
//     đoạn giới thiệu chép được. Không có trang này thì mỗi lượt pitch phải
//     kể lại từ đầu, và mỗi lần kể một kiểu.
//
//  2. NEO THỰC THỂ của cả site: đây là nơi DUY NHẤT khai Organization đầy đủ
//     kèm `sameAs`, mang `@id` mà 35 nút Organization khác trong repo trỏ về
//     (xem lib/seo/entity.ts).
//
// 🔴 LUẬT SỐ LIỆU — đọc trước khi thêm bất cứ con số nào vào đây:
//    CHỈ đăng số ĐẾM ĐƯỢC TỪ DB và kiểm chứng được từ ngoài (số công cụ, số
//    bài, số trang). TUYỆT ĐỐI KHÔNG đăng lượt truy cập / số người dùng /
//    doanh thu. Hai lý do: (a) cùng nguyên tắc `SITE_FACTS` của
//    lib/backlinks/content.ts — cấm bịa số với người ngoài; (b) số người dùng
//    thật hiện quá nhỏ, đăng lên vừa không giúp gì vừa mời người ta soi.
//    Đọc DB hỏng thì ẨN khối số liệu, KHÔNG rơi về số 0 hay số phỏng đoán.
// ============================================================
export const revalidate = 3600;

import { NextResponse } from 'next/server';
import { orgNode, SEO_BASE } from '@/lib/seo/same-as';

const SB_URL = process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Stat {
  label: string;
  value: number;
  note: string;
}

/** Đếm bằng `Prefer: count=exact` + `limit=0` — không tải nguyên bảng về. */
async function countOf(qs: string): Promise<number | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${qs}&limit=0`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const cr = res.headers.get('content-range') || '';
    const n = Number(cr.split('/')[1]);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function liveStats(): Promise<Stat[]> {
  const [tools, freeTools, khaoLuan, nghienCuu, tuDien, seoPages] = await Promise.all([
    countOf('tool_pricing?select=tool_id&enabled=is.true'),
    countOf('tool_pricing?select=tool_id&enabled=is.true&is_free=is.true'),
    countOf('khao_luan?select=id'),
    countOf('master_articles?select=id'),
    countOf('tu_dien?select=id'),
    countOf('seo_pages?select=id'),
  ]);
  const out: Stat[] = [];
  if (tools !== null) out.push({ label: 'Công cụ đang mở', value: tools, note: freeTools !== null ? `${freeTools} dùng miễn phí` : '' });
  if (khaoLuan !== null && nghienCuu !== null) out.push({ label: 'Bài khảo luận & nghiên cứu', value: khaoLuan + nghienCuu, note: 'do hệ thống soạn, có kiểm duyệt giọng văn' });
  if (tuDien !== null) out.push({ label: 'Mục từ điển thuật ngữ', value: tuDien, note: 'sao, cách cục, thuật ngữ cổ pháp' });
  if (seoPages !== null) out.push({ label: 'Trang tra cứu dựng sẵn', value: seoPages, note: 'tương hợp tuổi, vận hạn, ngày tốt' });
  return out;
}

const BOILERPLATE_NGAN =
  'Tử Vi Minh Bảo (tuviminhbao.com) là cổng mệnh lý trực tuyến tiếng Việt: lá số được lập bằng engine tất định theo cổ pháp, phần luận chỉ diễn giải trên số liệu đã tính chứ không tự sinh dữ liệu.';

const BOILERPLATE_DAI =
  'Tử Vi Minh Bảo (tuviminhbao.com) là cổng mệnh lý trực tuyến tiếng Việt, gộp Tử Vi Đẩu Số, Tử Bình, tướng số và phong thuỷ vào một chỗ. Điểm khác biệt kỹ thuật nằm ở ranh giới giữa phần TÍNH và phần LUẬN: toàn bộ phần AN SAO — vị trí 12 cung, chính tinh, phụ tinh, tứ hoá, đại vận, tiểu hạn — do một engine tất định tính ra theo đúng cổ pháp, cho cùng một đầu vào luôn ra cùng một kết quả. Phần luận chỉ được DIỄN GIẢI trên bộ số đã tính đó, và bị cấm tự bịa thêm sao hay cách cục nào. Nhờ tách bạch như vậy, mọi con số trên trang đều kiểm chứng lại được bằng tay theo sách.';

export async function GET() {
  const [org, stats] = await Promise.all([orgNode({ standalone: true }), liveStats()]);

  const statHtml = stats.length
    ? `<div class="stats">${stats
        .map(
          (s) => `<div class="stat"><div class="stat-n">${s.value.toLocaleString('vi-VN')}</div>
        <div class="stat-l">${esc(s.label)}</div>${s.note ? `<div class="stat-note">${esc(s.note)}</div>` : ''}</div>`,
        )
        .join('')}</div>
       <p class="tiny">Số liệu đếm trực tiếp từ cơ sở dữ liệu lúc trang được dựng, làm mới mỗi giờ. Trang này cố ý <b>không công bố</b> lượt truy cập hay số người dùng — chỉ đăng thứ kiểm chứng được từ bên ngoài.</p>`
    : '';

  const schemas = JSON.stringify([
    org,
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Thông tin báo chí — Tử Vi Minh Bảo',
      url: `${SEO_BASE}/bao-chi`,
      description: BOILERPLATE_NGAN,
      inLanguage: 'vi',
      about: { '@id': (org as { '@id': string })['@id'] },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${SEO_BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Thông tin báo chí', item: `${SEO_BASE}/bao-chi` },
      ],
    },
  ]);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thông Tin Báo Chí — Tử Vi Minh Bảo</title>
<meta name="description" content="Bộ thông tin dành cho nhà báo, blogger và đối tác: giới thiệu, số liệu thật, câu chuyện kỹ thuật, logo và cách liên hệ Tử Vi Minh Bảo.">
<link rel="canonical" href="${SEO_BASE}/bao-chi">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="Thông Tin Báo Chí — Tử Vi Minh Bảo">
<meta property="og:description" content="${esc(BOILERPLATE_NGAN)}">
<meta property="og:url" content="${SEO_BASE}/bao-chi">
<meta property="og:image" content="${SEO_BASE}/seal.webp">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${schemas.replace(/</g, '\\u003c')}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.6}
a{color:var(--blue)}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px}
.bc a{color:var(--text-lt);text-decoration:none}
.page{max-width:860px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 32px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:36px;font-weight:400;color:var(--navy);margin-bottom:12px}
h1 em{font-style:italic;color:var(--gold)}
.hero p{font-size:16px;color:var(--text-mid);max-width:620px}
section{padding:32px 0;border-bottom:1px solid var(--border-lt)}
h2{font-size:22px;font-weight:400;color:var(--navy);margin-bottom:14px}
h3{font-size:15px;font-weight:600;color:var(--navy);margin:18px 0 6px}
p{margin-bottom:12px;color:var(--text-mid)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:8px 0 14px}
.stat{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:8px;padding:16px}
.stat-n{font-size:26px;color:var(--navy)}
.stat-l{font-size:13px;color:var(--text);margin-top:2px}
.stat-note{font-size:11px;color:var(--text-lt);margin-top:4px}
.tiny{font-size:12px;color:var(--text-lt)}
blockquote{background:var(--bg-soft);border-left:3px solid var(--gold);padding:14px 16px;margin:10px 0;font-size:15px;color:var(--text)}
.assets{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:10px}
.asset{border:1px solid var(--border-lt);border-radius:8px;padding:14px;text-align:center;background:var(--bg-soft)}
.asset img{width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 8px}
.swatch{display:inline-block;width:64px;height:36px;border-radius:5px;border:1px solid var(--border-lt);vertical-align:middle;margin-right:8px}
code{background:var(--bg-soft);padding:1px 5px;border-radius:4px;font-size:13px}
ul{margin:0 0 12px 20px;color:var(--text-mid)}li{margin-bottom:6px}
@media(max-width:700px){.page,.bc{padding-left:16px;padding-right:16px}.hero{padding:28px 0 20px}h1{font-size:26px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><span>Thông tin báo chí</span></div>
<div class="page">

  <div class="hero">
    <div class="eyebrow">Media Kit</div>
    <h1>Thông Tin <em>Báo Chí</em></h1>
    <p>Trang này dành cho nhà báo, blogger và đối tác muốn viết về Tử Vi Minh Bảo. Mọi thứ ở đây <b>chép lại được tự do</b> — không cần xin phép.</p>
  </div>

  <section>
    <h2>Giới thiệu ngắn</h2>
    <blockquote>${esc(BOILERPLATE_NGAN)}</blockquote>
    <h3>Bản dài</h3>
    <blockquote>${esc(BOILERPLATE_DAI)}</blockquote>
  </section>

  <section>
    <h2>Số liệu</h2>
    ${statHtml || '<p class="tiny">Số liệu tạm thời chưa đọc được. Liên hệ để lấy con số mới nhất.</p>'}
  </section>

  <section>
    <h2>Câu chuyện kỹ thuật</h2>
    <h3>Ranh giới giữa phần tính và phần luận</h3>
    <p>Phần lớn ứng dụng bói toán để máy viết thẳng ra lời phán. Ở đây thì ngược lại: một engine tất định lo toàn bộ phần <b>an sao</b> theo cổ pháp, phần diễn giải chỉ được <b>luận</b> trên bộ số đã tính. Cùng một ngày sinh luôn ra cùng một lá số, và người biết xem tử vi có thể lấy sách ra đối chiếu từng cung.</p>
    <h3>Một lỗi công thức tự phát hiện — và vì sao nó đáng kể</h3>
    <p>Tháng 8/2026, khi rà lại công thức <b>Kim Lâu</b> (phép xem tuổi làm nhà, cưới hỏi), chúng tôi phát hiện bản đang chạy dùng chu kỳ 5 thay vì chu kỳ 9 theo cổ pháp. Đo lại trên dải tuổi 18–80: <b>46% số tuổi ra kết quả khác</b> — trong đó 16 tuổi trước đó bị báo là "bình thường" trong khi thực tế phạm Kim Lâu. Lỗi đã sửa, và cách sửa được ghi công khai trong nhật ký kỹ thuật của dự án.</p>
    <p>Chi tiết đó đáng kể vì nó là thứ một sản phẩm bói toán thường không tự nói ra: ở đây công thức <b>kiểm chứng được</b>, nên sai thì lộ ra và sửa được — khác hẳn một lời phán không ai đối chiếu nổi.</p>
  </section>

  <section>
    <h2>Có thể hỏi/viết về</h2>
    <ul>
      <li>Số hoá cổ thư tử vi: chuyển luật an sao trong sách thành mã chạy được, và những chỗ các bản sách nói khác nhau.</li>
      <li>Ranh giới đạo đức khi hệ thống luận mệnh: những điều hệ thống bị <b>cấm</b> nói (đoán bệnh, đoán đỗ trượt cho trẻ em, phán về hôn nhân của người vắng mặt).</li>
      <li>Vì sao một sản phẩm mệnh lý lại cần bộ kiểm thử tự động, và những lỗi mà bộ kiểm bắt được.</li>
      <li>Người Việt tra cứu gì nhiều nhất, theo dữ liệu tìm kiếm thật.</li>
    </ul>
  </section>

  <section>
    <h2>Dữ liệu mở cho nhà báo</h2>
    <p>Chúng tôi phát hành công khai một bộ dữ liệu thống kê tử vi theo giấy phép <b>CC BY 4.0</b> — dùng lại được cho bài báo, đồ hoạ, nghiên cứu, chỉ cần ghi nguồn. Tải CSV/JSON tại <a href="/du-lieu">trang dữ liệu mở</a>.</p>
    <p class="tiny">⚠️ Đọc kỹ phần cảnh báo trên trang đó: đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM SINH, <b>không phải</b> phân bố dân số Việt Nam. Viết "X% người Việt có mệnh Tử Vi" là sai.</p>
  </section>

  <section>
    <h2>Logo &amp; màu thương hiệu</h2>
    <div class="assets">
      <div class="asset"><img src="/seal.webp" alt="Triện Tử Vi Minh Bảo"><a href="/seal.webp" download>Tải triện (.webp)</a></div>
      <div>
        <div><span class="swatch" style="background:#061A2E"></span><code>#061A2E</code> — navy chủ đạo</div>
        <div style="margin-top:8px"><span class="swatch" style="background:#C9A84C"></span><code>#C9A84C</code> — vàng nhấn</div>
      </div>
    </div>
    <p class="tiny" style="margin-top:12px">Tên gọi: <b>Tử Vi Minh Bảo</b> (chữ Hán: 紫微明寶). Xin viết đủ dấu.</p>
  </section>

  <section style="border-bottom:none">
    <h2>Liên hệ</h2>
    <p>Email: <a href="mailto:contact@tuviminhbao.com">contact@tuviminhbao.com</a><br>
    Website: <a href="${SEO_BASE}">tuviminhbao.com</a></p>
    <p class="tiny">Nhà báo cần số liệu sâu hơn (thống kê tra cứu theo chủ đề, phân bố cách cục trong hàng nghìn lá số…) thì viết thư — chúng tôi tính được và gửi kèm cách tính.</p>
  </section>

</div>
<script src="/footer.js"></script>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=24" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
