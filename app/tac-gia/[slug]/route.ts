// app/tac-gia/[slug]/route.ts — Author profile page with JSON-LD Person schema (EEAT)
export const revalidate = 86400;
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
}

const CAT_LABEL: Record<string, string> = {
  'hoc-thuat': 'Học Thuật', 'luan-la-so': 'Luận Lá Số',
  'chiem-nghiem': 'Chiêm Nghiệm', 'thuc-hanh': 'Thực Hành', 'ly-luan': 'Lý Luận',
};

const AUTHOR_SHORT_BIO: Record<string, string> = {
  'bac-minh':   'Bắc Minh tiên sinh có hơn bốn mươi năm nghiên cứu và giảng dạy Tử Vi Đẩu Số tại các hội học thuật ở Thượng Hải và Hồng Kông. Tiên sinh được giới doanh nhân khu vực biết đến qua những buổi tham vấn kín — ít xuất hiện công khai nhưng uy tín trong giới chuyên môn là điều không cần phải bàn.',
  'co-nguyet':  'Cổ Nguyệt tiên sinh là một trong số ít học giả hiện nay nắm vững đồng thời cả Tử Vi Đẩu Số lẫn Tứ Trụ Tử Bình. Hoạt động chủ yếu trong các nhóm nghiên cứu tư nhân tại Đài Loan, tiên sinh có tiếng với những luận giải chắc chắn về mối tương quan giữa hai hệ thống mà nhiều người tưởng là độc lập với nhau.',
  'dau-nam':    'Đẩu Nam tiên sinh dành phần lớn sự nghiệp nghiên cứu tại các thư viện và hội học thuật ở Phúc Kiến và Quảng Đông. Tiên sinh hiếm khi nhận tham vấn cá nhân; những ai tiếp cận được thường là doanh nhân hoặc học giả được giới thiệu qua mạng lưới quen biết trong giới.',
  'dieu-khong': 'Diệu Không tiên sinh có nền tảng triết học Phật giáo sâu rộng, kết hợp với hơn ba mươi năm nghiên cứu Tử Vi Đẩu Số theo hướng ít phổ biến trong học thuật chính thống. Tiên sinh từng tham vấn cho một số tập đoàn lớn tại Hồng Kông về nhân sự và thời điểm — không xác nhận công khai nhưng cũng không phủ nhận.',
  'huyen-khong':'Huyền Không tiên sinh chuyên về hướng tiếp cận kết hợp Tử Vi Đẩu Số với phong thủy Huyền Không Phi Tinh — lĩnh vực giao thoa hiếm có chuyên gia thực sự am tường. Được giới thương nhân Hồng Kông và Đài Loan tìm đến qua giới thiệu, tiên sinh không quảng bá rộng rãi nhưng lịch tham vấn hiếm khi trống.',
  'linh-co':    'Linh Cổ tiên sinh thuộc thế hệ học giả được đào tạo trực tiếp từ các bậc thầy lớp trước — phương pháp học truyền tay, không qua lớp học chính thức. Hiện tiên sinh không nhận thêm học trò; những bài viết trong bộ sưu tập này là một trong số ít cách tiếp cận công khai duy nhất với tư tưởng của tiên sinh.',
  'linh-son':   'Linh Sơn tiên sinh có góc nhìn thiên về triết học và lý luận hơn là ứng dụng thực tiễn — điều không phổ biến trong giới mệnh lý vốn nghiêng về thực dụng. Các tổ chức và doanh nghiệp tìm đến tiên sinh thường là những người đã qua nhiều chuyên gia khác mà vẫn chưa có câu trả lời thỏa đáng.',
  'ngoc-tinh':  'Ngọc Tinh tiên sinh hoạt động trong giới học thuật Đài Loan với hướng nghiên cứu kết hợp tâm lý học hành vi và Tử Vi Đẩu Số — cách tiếp cận còn khá mới trong lĩnh vực này. Các luận giải của tiên sinh được chú ý đặc biệt ở độ chính xác khi phân tích nhân cách và đánh giá sự phù hợp trong quan hệ đối tác kinh doanh.',
  'nhat-nguyen':'Nhất Nguyên tiên sinh tập trung vào nghiên cứu lý luận và văn bản học của Tử Vi Đẩu Số — so sánh các dị bản, truy tìm nguồn gốc của các phương pháp luận giải qua nhiều thế kỷ phát triển. Tiên sinh được các hội học thuật tại Đài Loan và Trung Quốc đại lục mời tham vấn trong các dự án nghiên cứu và biên soạn tài liệu.',
  'tam-kinh':   'Tam Kinh tiên sinh là một trong số hiếm học giả hiện nay thực sự thông thạo ba hệ thống — Tử Vi Đẩu Số, Bát Tự Tử Bình và Kỳ Môn Độn Giáp. Cách làm của tiên sinh là đối chiếu cả ba để tìm điểm hội tụ, tạo ra những luận giải toàn diện hơn so với cách tiếp cận từng hệ thống riêng lẻ.',
  'thai-hu':    'Thái Hư tiên sinh có nền tảng triết học Đạo gia vững chắc, tiếp cận mệnh lý như một công cụ để hiểu quy luật biến đổi hơn là đoán định cứng nhắc. Tiên sinh từng đào tạo một số chuyên gia tư vấn đang hoạt động tại các công ty lớn ở Hồng Kông — không công khai danh sách nhưng ảnh hưởng trong giới là có thật.',
  'thanh-hu':   'Thanh Hư tiên sinh chuyên nghiên cứu mệnh lý theo hướng phân tích so sánh — xem xét cùng một cấu trúc lá số trong các bối cảnh xã hội và kinh tế khác nhau để hiểu rõ hơn đâu là yếu tố mệnh lý, đâu là yếu tố hoàn cảnh. Phương pháp này được giới học thuật đánh giá cao vì tính nghiêm túc và có hệ thống.',
  'thien-an':   'Thiên An tiên sinh có nhiều năm kinh nghiệm tham vấn thực tế cho các doanh nghiệp bất động sản và tài chính tại Hồng Kông — lĩnh vực mà quyết định về thời điểm và nhân sự có thể tạo ra chênh lệch lớn. Tiên sinh không quảng bá rộng rãi nhưng trong giới chuyên môn, danh sách chờ tham vấn thường kéo dài vài tháng.',
  'tinh-quang': 'Tinh Quang tiên sinh nghiên cứu Tử Vi Đẩu Số theo hướng thiên văn học — tìm kiếm sự tương đồng và liên hệ giữa hệ thống sao trong mệnh lý và các chu kỳ thiên văn thực tế. Hướng đi này thu hút sự quan tâm của một số nhà nghiên cứu độc lập tại Đài Loan và Singapore, dù còn gây tranh luận trong giới học thuật chính thống.',
  'tu-nguyen':  'Tử Nguyên tiên sinh chuyên sâu về phần lý luận tinh hệ Bắc Đẩu trong Tử Vi Đẩu Số — phần được xem là phức tạp nhất và ít được giải thích thấu đáo nhất trong hầu hết tài liệu hiện có. Tiên sinh viết và giảng với phong cách không thích đặt tên hay hệ thống hóa cứng nhắc, ưu tiên truyền đạt tư duy hơn là công thức.',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(master: any, articles: any[], realArticleCount: number) {
  const masterId = master.id;
  const name     = master.display_name || '';
  const bio      = master.bio || '';
  const url      = `${BASE}/tac-gia/${masterId}`;
  const specialty: string[] = Array.isArray(master.specialty_topics) ? master.specialty_topics : [];
  const styleSum = master.style_summary || '';
  const artCount = realArticleCount || articles.length;
  const authorBio = AUTHOR_SHORT_BIO[masterId] || '';

  const schemas = JSON.stringify([
    {
      '@context': 'https://schema.org', '@type': 'Person',
      name,
      description: bio,
      url,
      knowsAbout: ['Tử Vi Đẩu Số', 'Khoa Học Huyền Bí', ...specialty],
      sameAs: [],
      worksFor: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
      jobTitle: 'Nhà Nghiên Cứu Tử Vi Đẩu Số',
      inLanguage: 'vi',
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Tác Giả', item: BASE + '/tac-gia' },
        { '@type': 'ListItem', position: 3, name: name, item: url },
      ],
    },
    // ProfilePage structured data for EEAT signal
    {
      '@context': 'https://schema.org', '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person', name,
        description: bio,
        url,
        knowsAbout: ['Tử Vi Đẩu Số', ...specialty],
      },
      url,
      name: `${name} — Tác Giả Nghiên Cứu Tử Vi`,
    },
  ]);

  const artCards = articles.map(a => `<article class="art-row">
  <div class="art-meta">
    <span class="art-cat">${esc(CAT_LABEL[a.category] || a.category || '')}</span>
    <span class="art-date">${formatDate(a.created_at)}</span>
    ${a.word_count ? `<span class="art-words">${a.word_count} từ</span>` : ''}
  </div>
  <h3 class="art-title"><a href="/nghien-cuu/${esc(a.slug)}">${esc(a.title)}</a></h3>
  ${a.excerpt ? `<p class="art-excerpt">${esc(a.excerpt)}</p>` : ''}
</article>`).join('\n');

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(name)} — Tác Giả Nghiên Cứu Tử Vi | Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(bio || `Tác giả ${name} — nhà nghiên cứu Tử Vi Đẩu Số với ${artCount} bài viết học thuật.`)}">
<meta property="og:title" content="${esc(name)} — Tác Giả Nghiên Cứu Tử Vi">
<meta property="og:description" content="${esc(bio)}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${url}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">${schemas}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}.breadcrumb span{color:var(--border)}
.profile-header{background:var(--navy);padding:48px 40px 40px}
.profile-inner{max-width:860px;margin:0 auto;display:flex;gap:32px;align-items:flex-start}
.profile-avatar{width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid var(--gold-bright);color:var(--gold-bright);font-family:'Noto Serif',serif;font-size:32px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.profile-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.profile-details{flex:1;color:#fff}
.profile-name{font-family:'Noto Serif',serif;font-size:28px;font-weight:600;color:var(--gold-bright);margin-bottom:4px}
.profile-title{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px}
.profile-bio{font-size:15px;line-height:1.8;color:rgba(255,255,255,.8);font-weight:300;max-width:600px}
.profile-stats{display:flex;gap:24px;margin-top:18px}
.stat-item{text-align:center}
.stat-num{font-family:'Noto Serif',serif;font-size:22px;font-weight:600;color:var(--gold-bright)}
.stat-label{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1.5px;text-transform:uppercase}
.main{flex:1;max-width:860px;margin:0 auto;padding:40px 40px 80px;width:100%;display:grid;grid-template-columns:1fr 260px;gap:40px}
.articles-section h2{font-family:'Noto Serif',serif;font-size:16px;font-weight:600;color:var(--text-lt);letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid var(--border)}
.art-row{padding:20px 0;border-bottom:1px solid var(--border-lt)}
.art-row:last-child{border-bottom:none}
.art-meta{display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
.art-cat{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
.art-date{font-size:11px;color:var(--text-lt)}
.art-words{font-size:11px;color:var(--text-lt)}
.art-title{font-family:'Noto Serif',serif;font-size:17px;font-weight:600;margin-bottom:6px;line-height:1.4}
.art-title a{color:var(--navy);text-decoration:none}.art-title a:hover{color:var(--blue)}
.art-excerpt{font-size:13px;color:var(--text-lt);line-height:1.65;font-weight:300}
.sidebar{}
.sidebar-card{background:var(--gold-lt);border:1px solid #e6d9c0;border-radius:8px;padding:20px;margin-bottom:20px}
.sidebar-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.style-summary{font-size:13px;color:var(--text-mid);line-height:1.7;font-style:italic}
.specialty-tags{display:flex;flex-wrap:wrap;gap:6px}
.spec-tag{font-size:11px;background:#fff;border:1px solid #e6d9c0;color:var(--text-mid);padding:3px 10px;border-radius:12px}
.back-link{display:inline-block;margin-top:12px;font-size:13px;color:var(--blue);text-decoration:none}
.back-link:hover{text-decoration:underline}
.empty{color:var(--text-lt);font-style:italic;padding:32px 0}
@media(max-width:700px){.breadcrumb{padding-left:16px;padding-right:16px}.profile-header{padding:32px 16px}.profile-inner{flex-direction:column;gap:16px}.main{grid-template-columns:1fr;padding:24px 16px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="breadcrumb"><a href="/">Trang Chủ</a><span>›</span><a href="/tac-gia">Tác Giả</a><span>›</span><span>${esc(name)}</span></div>
<div class="profile-header">
  <div class="profile-inner">
    <div class="profile-avatar" data-init="${esc(name[0] || '?')}">
      <img src="/authors/${esc(masterId)}.jpg" alt="${esc(name)}"
        onerror="this.closest('.profile-avatar').innerHTML=this.closest('.profile-avatar').dataset.init">
    </div>
    <div class="profile-details">
      <div class="profile-name">${esc(name)}</div>
      <div class="profile-title">Nhà Nghiên Cứu Tử Vi Đẩu Số</div>
      ${bio ? `<div class="profile-bio">${esc(bio)}</div>` : ''}
      <div class="profile-stats">
        <div class="stat-item"><div class="stat-num">${artCount}</div><div class="stat-label">Bài Viết</div></div>
        ${specialty.length ? `<div class="stat-item"><div class="stat-num">${specialty.length}</div><div class="stat-label">Chuyên Đề</div></div>` : ''}
      </div>
    </div>
  </div>
</div>
<div class="main">
  <section class="articles-section">
    <h2>Bài Viết Của ${esc(name)}</h2>
    ${articles.length === 0 ? '<div class="empty">Chưa có bài viết nào.</div>' : artCards}
    <a href="/nghien-cuu" class="back-link">← Xem tất cả nghiên cứu</a>
  </section>
  <aside class="sidebar">
    ${styleSum ? `<div class="sidebar-card">
      <div class="sidebar-label">Văn Phong</div>
      <div class="style-summary">${esc(styleSum)}</div>
    </div>` : ''}
    ${specialty.length ? `<div class="sidebar-card">
      <div class="sidebar-label">Chuyên Đề</div>
      <div class="specialty-tags">${specialty.map((s: string) => `<span class="spec-tag">${esc(s)}</span>`).join('')}</div>
    </div>` : ''}
    ${authorBio ? `<div class="sidebar-card">
      <div class="sidebar-label">Về Tác Giả</div>
      <div class="style-summary">${esc(authorBio)}</div>
    </div>` : ''}
  </aside>
</div>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=19" defer></script>
</body></html>`;
}

function buildNotFound() {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Tác giả không tìm thấy — Tử Vi Minh Bảo</title>
<link rel="icon" type="image/webp" href="/seal.webp">
<script src="/auth.js" defer></script>
</head><body style="font-family:sans-serif;text-align:center;padding:80px">
<h1 style="color:#061A2E;font-family:Georgia,serif;margin-bottom:16px">Không tìm thấy tác giả</h1>
<a href="/tac-gia" style="color:#1455A4">← Về danh sách tác giả</a>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=19" defer></script>
</body></html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(new URL('/tac-gia', BASE));

  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  try {
    const [masterRes, articlesRes, countRes] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/master_profiles?id=eq.${encodeURIComponent(slug)}&select=*&limit=1`, { headers: sbHeaders }),
      fetch(`${SB_URL}/rest/v1/master_articles?master_id=eq.${encodeURIComponent(slug)}&select=slug,title,excerpt,category,word_count,created_at&order=created_at.desc&limit=50`, { headers: sbHeaders }),
      fetch(`${SB_URL}/rest/v1/master_articles?master_id=eq.${encodeURIComponent(slug)}&select=id`, { headers: { ...sbHeaders, 'Prefer': 'count=exact' } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const masterRows = masterRes.ok ? await masterRes.json() as any[] : [];
    if (!masterRows?.length) {
      return new NextResponse(buildNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = articlesRes.ok ? await articlesRes.json() : [];
    const contentRange = countRes.headers.get('Content-Range') || '';
    const realArticleCount = parseInt(contentRange.split('/')[1] || '0', 10) || articles.length;

    const html = buildHTML(masterRows[0], articles, realArticleCount);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e: unknown) {
    return new NextResponse(`<h1>Lỗi: ${(e as Error).message}</h1>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
