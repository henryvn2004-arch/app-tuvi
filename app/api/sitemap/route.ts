// app/api/sitemap/route.ts
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL     = 'https://www.tuviminhbao.com';
const CACHE_TTL    = 3600; // CDN cache 1h — bots don't need real-time sitemap

async function fetchAllSlugs(table: string) {
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' } }
  );
  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);
  if (!total) return [];
  const pageSize = 1000;
  const offsets = Array.from({length: Math.ceil(total/pageSize)}, (_, i) => i * pageSize);
  const results = await Promise.all(
    offsets.map(offset =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?select=slug,created_at&order=id.asc&limit=${pageSize}&offset=${offset}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.ok ? r.json() : [])
    )
  );
  return results.flat() as { slug: string; created_at?: string }[];
}

// Paginate through seo_pages (Supabase caps at 1000 rows per request)
// Fetch total count first, then all batches in parallel
async function fetchAllSeoPages() {
  // Get total count first
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_pages?select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' } }
  );
  const totalCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);
  if (!totalCount) return [];

  const pageSize = 1000;
  const pages = Math.ceil(totalCount / pageSize);
  const offsets = Array.from({length: pages}, (_, i) => i * pageSize);

  const results = await Promise.all(
    offsets.map(offset =>
      fetch(`${SUPABASE_URL}/rest/v1/seo_pages?select=slug,category,created_at&order=id.asc&limit=${pageSize}&offset=${offset}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.ok ? r.json() : [])
    )
  );
  return results.flat() as { slug: string; category: string; created_at: string }[];
}

function escXml(s: string) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string) {
  return `  <url>\n    <loc>${escXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function GET() {
  const today = new Date().toISOString().slice(0,10);

  const staticPages = [
    { path:'/',               cf:'daily',   p:'1.0' },
    { path:'/nghien-cuu',    cf:'daily',   p:'0.8' },  // master articles listing
    { path:'/tac-gia',       cf:'weekly',  p:'0.8' },  // author listing
    { path:'/luan-giai.html', cf:'monthly', p:'1.0' },  // core product page
    { path:'/tu-vi',          cf:'weekly',  p:'0.9' },  // SEO pages index
    { path:'/tu-dien',        cf:'weekly',  p:'0.9' },  // từ điển index
    { path:'/about.html',     cf:'monthly', p:'0.5' },
    { path:'/resources.html', cf:'daily',   p:'0.8' },
    { path:'/blog.html',      cf:'daily',   p:'0.8' },
    { path:'/menh-kho.html',  cf:'daily',   p:'0.8' },
    { path:'/ngay-tot',       cf:'daily',   p:'0.9' },  // ngay-tot hub
    { path:'/van-han',        cf:'weekly',  p:'0.8' },  // van-han hub
    { path:'/xem-tuoi.html',  cf:'monthly', p:'0.7' },
    { path:'/xem-lam-an.html',cf:'monthly', p:'0.7' },
    { path:'/contact.html',   cf:'monthly', p:'0.4' },
    // Category hubs
    { path:'/kien-thuc-tuvi', cf:'weekly',  p:'0.9' },
    { path:'/phong-thuy',     cf:'weekly',  p:'0.9' },
    { path:'/xem-tuong',      cf:'weekly',  p:'0.9' },
    { path:'/chon-ngay',      cf:'weekly',  p:'0.9' },
    { path:'/lam-dep',        cf:'weekly',  p:'0.8' },
    { path:'/dat-ten',        cf:'weekly',  p:'0.8' },
    // Tools
    { path:'/tools/an-sao.html',               cf:'monthly', p:'0.7' },
    { path:'/tools/ban-lam-viec.html',          cf:'monthly', p:'0.7' },
    { path:'/tools/bat-trach.html',             cf:'monthly', p:'0.7' },
    { path:'/tools/la-ban-phong-thuy.html',     cf:'monthly', p:'0.8' },
    { path:'/tools/huong-nha-phong-thuy.html',  cf:'monthly', p:'0.8' },
    { path:'/tools/boi-bai-tay.html',           cf:'monthly', p:'0.6' },
    { path:'/tools/cach-cuc.html',              cf:'monthly', p:'0.7' },
    { path:'/tools/chon-ngay-tot.html',         cf:'monthly', p:'0.7' },
    { path:'/tools/cua-hang-phong-thuy.html',   cf:'monthly', p:'0.7' },
    { path:'/tools/dai-van.html',               cf:'monthly', p:'0.7' },
    { path:'/tools/dat-ten-con.html',           cf:'monthly', p:'0.8' },
    { path:'/tools/dat-ten-doanh-nghiep.html',  cf:'monthly', p:'0.7' },
    { path:'/tools/han-nam.html',               cf:'monthly', p:'0.7' },
    { path:'/tools/hoang-dao.html',             cf:'daily',   p:'0.8' },
    { path:'/tools/khi-sac-ai.html',            cf:'monthly', p:'0.7' },
    // ── Trang standalone TỪNG BỊ SÓT khỏi sitemap ────────────────────────
    // Chúng đã tồn tại và có nội dung SEO đầy đủ nhưng chưa bao giờ được nộp,
    // tức phần việc viết trang coi như phí một nửa. `kim-lau.html` CỐ Ý không
    // có ở đây: nó đã 301 về trang trụ `/kim-lau` (đã khai bên trên) — thêm vào
    // là tự nộp một URL chuyển hướng.
    { path:'/tools/chan-dung-tien-kiep.html',   cf:'monthly', p:'0.8' },
    { path:'/tools/chan-dung-vo-chong.html',    cf:'monthly', p:'0.8' },
    { path:'/tools/cong-so.html',               cf:'monthly', p:'0.8' },
    { path:'/tools/da-lieu-ai.html',            cf:'monthly', p:'0.7' },
    { path:'/tools/day-con.html',               cf:'monthly', p:'0.8' },
    { path:'/tools/kieu-toc-ai.html',           cf:'monthly', p:'0.7' },
    { path:'/tools/ky-mon.html',                cf:'monthly', p:'0.6' },
    { path:'/tools/mai-hoa.html',               cf:'monthly', p:'0.6' },
    { path:'/tools/nguoi-khac.html',            cf:'monthly', p:'0.8' },
    { path:'/tools/nhan-mach.html',             cf:'monthly', p:'0.7' },
    { path:'/tools/personal-color.html',        cf:'monthly', p:'0.7' },
    { path:'/tools/trang-diem-ai.html',         cf:'monthly', p:'0.7' },
    { path:'/tools/trang-phuc-theo-ngay.html',  cf:'monthly', p:'0.7' },
    // Trang trụ cụm kim lâu (không phải trang tool nữa) — cầu đã xác nhận qua
    // GSC nên để ngang các hub chuyên mục.
    { path:'/kim-lau',                          cf:'monthly', p:'0.9' },
    { path:'/tools/kinh-dich.html',             cf:'monthly', p:'0.6' },
    { path:'/tools/luc-nham.html',              cf:'monthly', p:'0.6' },
    { path:'/tools/mau-sac-hop-menh.html',      cf:'monthly', p:'0.7' },
    { path:'/tools/nap-am.html',                cf:'monthly', p:'0.7' },
    { path:'/tools/ngay-tot.html',              cf:'daily',   p:'0.8' },
    { path:'/tools/ngu-hanh-ten.html',          cf:'monthly', p:'0.7' },
    { path:'/tools/nhan-tuong-ai.html',         cf:'monthly', p:'0.7' },
    { path:'/tools/oracle.html',                cf:'monthly', p:'0.6' },
    { path:'/tools/phong-thuy.html',            cf:'monthly', p:'0.8' },
    { path:'/tools/sao-nam.html',               cf:'monthly', p:'0.7' },
    { path:'/tools/tarot.html',                 cf:'monthly', p:'0.7' },
    { path:'/tools/than-so-hoc.html',           cf:'monthly', p:'0.7' },
    { path:'/tools/thanh-tuong-ai.html',        cf:'monthly', p:'0.7' },
    { path:'/tools/thanh-tuong-pro.html',       cf:'monthly', p:'0.7' },
    { path:'/tools/thu-tuong-ai.html',          cf:'monthly', p:'0.7' },
    { path:'/tools/tu-tru.html',                cf:'monthly', p:'0.6' },
    { path:'/tools/tuong-hop.html',             cf:'monthly', p:'0.7' },
    { path:'/tools/tuong-mat-ai.html',          cf:'monthly', p:'0.8' },
    { path:'/tools/van-thang.html',             cf:'monthly', p:'0.7' },
    { path:'/tools/xem-tuoi-sinh-con.html',     cf:'monthly', p:'0.7' },
  ];

  const [lasoRows, taiLieuRows, khaoLuanRows, sachRows, seoRows, pregenRows, tuDienRows, masterArticleRows] = await Promise.all([
    fetchAllSlugs('laso_public'),
    fetchAllSlugs('tai_lieu'),
    fetchAllSlugs('khao_luan'),
    fetchAllSlugs('sach_library'),
    fetchAllSeoPages(),
    fetchAllSlugs('laso_pregen'),
    fetchAllSlugs('tu_dien'),
    fetchAllSlugs('master_articles'),
  ]);

  const SEO_PRIORITY: Record<string, string> = {
    'tu-vi-nam-sinh':    '0.80',
    'van-han':           '0.75',
    'tuong-hop-hon-nhan':'0.70',
    'tuong-hop-lam-an':  '0.70',
    'y-nghia-sao':       '0.65',
  };

  const entries: string[] = [];
  for (const p of staticPages) entries.push(urlEntry(BASE_URL + p.path, today, p.cf, p.p));
  // laso_public → new static route
  for (const r of lasoRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.8'));
  // laso_pregen → static route
  for (const r of pregenRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'yearly', '0.7'));
  // tu_dien → static route
  for (const r of tuDienRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/tu-dien/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.8'));
  for (const r of taiLieuRows)  if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.6'));
  for (const r of sachRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/sach/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.65'));
  for (const r of khaoLuanRows)      if (r.slug) entries.push(urlEntry(`${BASE_URL}/khao-luan/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'weekly', '0.7'));
  for (const r of masterArticleRows) if (r.slug) entries.push(urlEntry(`${BASE_URL}/nghien-cuu/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'weekly', '0.75'));
  for (const r of (seoRows as any[])) {
    if (!r.slug) continue;
    // Category 'van-han' đã được 301 sang họ /van-han/* (bản nội dung dày hơn)
    // — xem `vanHanRedirectTarget` trong app/api/tu-vi/route.ts. Nộp URL chuyển
    // hướng vào sitemap là bắt Google đi một nhịp thừa cho 480 URL, và giữ hai
    // họ cùng tồn tại trong mắt nó đúng lúc mình đang cố gộp lại.
    if (r.category === 'van-han') continue;
    const prio = SEO_PRIORITY[r.category] || '0.65';
    entries.push(urlEntry(`${BASE_URL}/tu-vi/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', prio));
  }

  // ── Họ /van-han/* — bản CHUẨN sau khi gộp ────────────────────────────────────
  // Trước đây CHỈ có trang hub `/van-han` trong sitemap, còn 576 trang con thì
  // không được nộp — tức bản dày nhất, đúng từ khoá nhất lại là bản Google không
  // được mời vào. Sinh bằng thuật toán (không có bảng): 12 chi × 8 năm cấp 1,
  // 60 can chi × 8 năm cấp 2. Danh sách phải KHỚP `NAM_XEMS` trong
  // app/van-han/[slug]/route.ts — lệch là nộp URL 404.
  const VH_NAMS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const VH_CHI  = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
  const VH_CAN  = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
  for (const nam of VH_NAMS) {
    for (const chi of VH_CHI) {
      entries.push(urlEntry(`${BASE_URL}/van-han/tuoi-${chi}-nam-${nam}`, today, 'monthly', '0.85'));
    }
    // Cặp can-chi hợp lệ: cùng tính chẵn/lẻ (Giáp Tý có thật, Giáp Sửu không) —
    // đúng 60 tổ hợp của lục thập hoa giáp. Sinh đủ 120 là nộp 60 URL chết.
    for (let i = 0; i < 60; i++) {
      entries.push(
        urlEntry(`${BASE_URL}/van-han/${VH_CAN[i % 10]}-${VH_CHI[i % 12]}-nam-${nam}`, today, 'monthly', '0.75'),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`,
    },
  });
}
