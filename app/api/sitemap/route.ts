// app/api/sitemap/route.ts
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL     = 'https://www.tuviminhbao.com';
const CACHE_TTL    = 6 * 60 * 60;

async function fetchSlugs(table: string, select = 'slug,created_at') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=10000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return await res.json() as { slug: string; created_at?: string }[];
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
    { path:'/about.html',     cf:'monthly', p:'0.5' },
    { path:'/resources.html', cf:'daily',   p:'0.8' },
    { path:'/blog.html',      cf:'daily',   p:'0.8' },
    { path:'/menh-kho.html',  cf:'daily',   p:'0.8' },
    { path:'/xem-tuoi.html',  cf:'monthly', p:'0.7' },
    { path:'/xem-lam-an.html',cf:'monthly', p:'0.7' },
    { path:'/contact.html',   cf:'monthly', p:'0.4' },
  ];

  const [lasoRows, taiLieuRows, khaoLuanRows, sachRows] = await Promise.all([
    fetchSlugs('laso_public'),
    fetchSlugs('tai_lieu'),
    fetchSlugs('khao_luan'),
    fetchSlugs('sach_library'),
  ]);

  const entries: string[] = [];
  for (const p of staticPages) entries.push(urlEntry(BASE_URL + p.path, today, p.cf, p.p));
  for (const r of lasoRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so.html?slug=${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.7'));
  for (const r of taiLieuRows)  if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.6'));
  for (const r of sachRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/sach/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'monthly', '0.65'));
  for (const r of khaoLuanRows) if (r.slug) entries.push(urlEntry(`${BASE_URL}/khao-luan/${encodeURIComponent(r.slug)}`, r.created_at?.slice(0,10)||today, 'weekly', '0.7'));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}, stale-while-revalidate=3600`,
    },
  });
}
