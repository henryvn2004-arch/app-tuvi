// app/api/sitemap/route.ts
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL     = 'https://www.tuviminhbao.com';
const CACHE_TTL    = 0; // no CDN cache — sitemap always fresh

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
    { path:'/luan-giai.html', cf:'monthly', p:'1.0' },  // core product page
    { path:'/tu-vi',          cf:'weekly',  p:'0.9' },  // SEO pages index
    { path:'/tu-dien',        cf:'weekly',  p:'0.9' },  // từ điển index
    { path:'/about.html',     cf:'monthly', p:'0.5' },
    { path:'/resources.html', cf:'daily',   p:'0.8' },
    { path:'/blog.html',      cf:'daily',   p:'0.8' },
    { path:'/menh-kho.html',  cf:'daily',   p:'0.8' },
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
    { path:'/tools/kim-lau.html',               cf:'monthly', p:'0.8' },
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

  const [lasoRows, taiLieuRows, khaoLuanRows, sachRows, seoRows, pregenRows, tuDienRows] = await Promise.all([
    fetchAllSlugs('laso_public'),
    fetchAllSlugs('tai_lieu'),
    fetchAllSlugs('khao_luan'),
    fetchAllSlugs('sach_library'),
    fetchAllSeoPages(),
    fetchAllSlugs('laso_pregen'),
    fetchAllSlugs('tu_dien'),
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
  for (const r of pregenRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, today, 'yearly', '0.7'));
  // tu_dien → static route
  for (const r of tuDienRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/tu-dien/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.8'));
  for (const r of taiLieuRows)  if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.6'));
  for (const r of sachRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/sach/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.65'));
  for (const r of khaoLuanRows) if (r.slug) entries.push(urlEntry(`${BASE_URL}/khao-luan/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'weekly', '0.7'));
  for (const r of (seoRows as any[])) {
    if (!r.slug) continue;
    const prio = SEO_PRIORITY[r.category] || '0.65';
    const cf   = r.category === 'van-han' ? 'yearly' : 'monthly';
    entries.push(urlEntry(`${BASE_URL}/tu-vi/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, cf, prio));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
