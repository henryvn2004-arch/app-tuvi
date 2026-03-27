// api/sitemap.js
// Dynamic sitemap — Google bot request → fetch Supabase → trả XML
// URL: https://www.tuviminhbao.com/sitemap.xml  (route trong vercel.json)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BASE_URL = 'https://www.tuviminhbao.com';

// Cache 6 tiếng để tránh hammer Supabase
const CACHE_TTL = 6 * 60 * 60;

async function fetchSlugs(table, select = 'slug', extra = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${extra}&limit=10000`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return [];
  return await res.json();
}

function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escXml(loc)}</loc>`,
    lastmod   ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority  ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

module.exports = async function handler(req, res) {
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Static pages ──────────────────────────────────────────
  const staticPages = [
    { path: '/',                         changefreq: 'daily',   priority: '1.0' },
    { path: '/about.html',               changefreq: 'monthly', priority: '0.5' },
    { path: '/resources.html',           changefreq: 'daily',   priority: '0.8' },
    { path: '/blog.html',                changefreq: 'daily',   priority: '0.8' },
    { path: '/menh-kho.html',            changefreq: 'daily',   priority: '0.8' },
    { path: '/xem-tuoi.html',            changefreq: 'monthly', priority: '0.7' },
    { path: '/xem-lam-an.html',          changefreq: 'monthly', priority: '0.7' },
    { path: '/faqs.html',                changefreq: 'monthly', priority: '0.6' },
    { path: '/huong-dan-thanh-toan.html',changefreq: 'monthly', priority: '0.5' },
    { path: '/contact.html',             changefreq: 'monthly', priority: '0.4' },
  ];

  // ── 2. Fetch slugs từ Supabase (parallel) ───────────────────
  const [lasoRows, taiLieuRows, khaoLuanRows, sachRows] = await Promise.all([
    fetchSlugs('laso_public',  'slug,created_at'),
    fetchSlugs('tai_lieu',     'slug,created_at'),
    fetchSlugs('khao_luan',    'slug,created_at'),
    fetchSlugs('sach_library', 'slug,created_at'),
  ]);

  // ── 3. Build XML entries ──────────────────────────────────────
  const entries = [];

  // Static
  for (const p of staticPages) {
    entries.push(urlEntry({
      loc: BASE_URL + p.path,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
    }));
  }

  // Lá số — priority cao vì là user-generated, unique content
  for (const row of lasoRows) {
    if (!row.slug) continue;
    entries.push(urlEntry({
      loc: `${BASE_URL}/la-so.html?slug=${encodeURIComponent(row.slug)}`,
      lastmod: row.created_at ? row.created_at.slice(0, 10) : today,
      changefreq: 'monthly',
      priority: '0.7',
    }));
  }

  // Tài liệu
  for (const row of taiLieuRows) {
    if (!row.slug) continue;
    entries.push(urlEntry({
      loc: `${BASE_URL}/tai-lieu/${encodeURIComponent(row.slug)}`,
      lastmod: row.created_at ? row.created_at.slice(0, 10) : today,
      changefreq: 'monthly',
      priority: '0.6',
    }));
  }

  // Sách library
  for (const row of sachRows) {
    if (!row.slug) continue;
    entries.push(urlEntry({
      loc: `${BASE_URL}/tai-lieu/sach/${encodeURIComponent(row.slug)}`,
      lastmod: row.created_at ? row.created_at.slice(0, 10) : today,
      changefreq: 'monthly',
      priority: '0.65',
    }));
  }

  // Khảo luận
  for (const row of khaoLuanRows) {
    if (!row.slug) continue;
    entries.push(urlEntry({
      loc: `${BASE_URL}/khao-luan/${encodeURIComponent(row.slug)}`,
      lastmod: row.created_at ? row.created_at.slice(0, 10) : today,
      changefreq: 'weekly',
      priority: '0.7',
    }));
  }

  // ── 4. Wrap XML ───────────────────────────────────────────────
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    entries.join('\n'),
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL}, stale-while-revalidate=3600`);
  res.status(200).send(xml);
}
