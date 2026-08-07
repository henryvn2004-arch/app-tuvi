// lib/seo/sitemap-source.ts — phần DÙNG CHUNG của mọi sitemap con.
//
// `sitemap.xml` nay là một sitemapindex trỏ tới 6 file con theo NHÓM. Chia ra
// KHÔNG làm Google crawl nhanh hơn (Mueller: *"no technical advantage by
// splitting them"*) — lợi ích duy nhất là ĐO ĐƯỢC: báo cáo GSC lọc theo từng
// sitemap, nên biết chính xác nhóm nào không được index thay vì nhìn một cục
// 10.986 URL rồi đoán.
//
// Vì có 6 route con, mọi thứ dùng chung phải nằm ở ĐÂY. Chép `fetchAllSlugs`
// sang từng file là đúng cái bẫy repo đã trả giá với `parseLlmJson`: bản chép
// tay không chỉ trôi khỏi nhau, nó còn tắt luôn bộ kiểm kiểu.

import { NextResponse } from 'next/server';
import { lastmodLine } from './lastmod';

export const BASE_URL = 'https://www.tuviminhbao.com';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export type SlugRow = { slug: string; created_at?: string; updated_at?: string };
export type SeoPageRow = { slug: string; category: string; created_at?: string };

/** Ngày sửa THẬT của một dòng: ưu tiên `updated_at`, lùi về `created_at`.
 *  Không có cả hai ⇒ `undefined` ⇒ bỏ hẳn thẻ (xem lib/seo/lastmod.ts). */
export function rowLastmod(r: SlugRow): string | undefined {
  return r.updated_at || r.created_at;
}

async function countRows(table: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'count=exact',
    },
    cache: 'no-store',
  });
  return parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
}

/** `hasUpdatedAt`: chỉ 2 bảng có cột này (`tu_dien`, `sach_library`). Hỏi cột
 *  không tồn tại thì PostgREST trả 400 → lượt đó ra mảng rỗng → mất im lặng cả
 *  một họ URL khỏi sitemap. Nên phải khai rõ chứ không hỏi bừa. */
export async function fetchAllSlugs(table: string, hasUpdatedAt = false): Promise<SlugRow[]> {
  const cols = hasUpdatedAt ? 'slug,created_at,updated_at' : 'slug,created_at';
  const total = await countRows(table);
  if (!total) return [];
  const pageSize = 1000;
  const offsets = Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i * pageSize);
  const results = await Promise.all(
    offsets.map((offset) =>
      fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&order=id.asc&limit=${pageSize}&offset=${offset}`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        },
      ).then((r) => (r.ok ? r.json() : [])),
    ),
  );
  return results.flat() as SlugRow[];
}

export async function fetchAllSeoPages(): Promise<SeoPageRow[]> {
  const total = await countRows('seo_pages');
  if (!total) return [];
  const pageSize = 1000;
  const offsets = Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i * pageSize);
  const results = await Promise.all(
    offsets.map((offset) =>
      fetch(
        `${SUPABASE_URL}/rest/v1/seo_pages?select=slug,category,created_at&order=id.asc&limit=${pageSize}&offset=${offset}`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        },
      ).then((r) => (r.ok ? r.json() : [])),
    ),
  );
  return results.flat() as SeoPageRow[];
}

export function escXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// `changefreq`/`priority` CỐ Ý không có: Google bỏ qua cả hai. `lastmod` là thứ
// duy nhất còn tác dụng — và chỉ khi nó đúng.
export function urlEntry(loc: string, lastmod?: string | null): string {
  return `  <url>\n    <loc>${escXml(loc)}</loc>${lastmodLine(lastmod)}\n  </url>`;
}

export function xmlUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

export function xmlSitemapIndex(locs: string[]): string {
  const rows = locs.map((l) => `  <sitemap><loc>${escXml(l)}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</sitemapindex>`;
}

/** CDN cache 1h — bot không cần sitemap thời gian thực. */
export function xmlResponse(xml: string, ttl = 3600): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=86400`,
    },
  });
}
