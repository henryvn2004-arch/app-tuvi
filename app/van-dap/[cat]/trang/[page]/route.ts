// app/van-dap/[cat]/trang/[page]/route.ts — trang cụm 1 danh mục, trang N≥2.
// Trang 1 KHÔNG phục vụ ở đây — luôn redirect về `/van-dap/<cat>` (URL gốc),
// cùng luật "trang 1 = URL gốc" đã dùng ở app/api/tu-vi-hub/route.ts.
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { khaoLuanCategory, fetchByCategory, renderCategoryPage, categoryPageUrl, PAGE_SIZE, BASE_URL } from '../../../_shared';
import { logAiCrawlerHit } from '@/lib/seo/ai-crawler-log';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cat: string; page: string }> },
) {
  const { cat, page: pageParam } = await params;
  logAiCrawlerHit(request.headers.get('user-agent'), `/van-dap/${cat}/trang/${pageParam}`);
  if (!khaoLuanCategory(cat)) return NextResponse.redirect(new URL('/van-dap', BASE_URL));

  const page = Math.floor(Number(pageParam));
  if (!Number.isFinite(page) || page < 1) return NextResponse.redirect(new URL(categoryPageUrl(cat, 1), BASE_URL));
  if (page === 1) return NextResponse.redirect(new URL(categoryPageUrl(cat, 1), BASE_URL), 308);

  const rows = await fetchByCategory(cat);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (page > totalPages) return NextResponse.redirect(new URL(categoryPageUrl(cat, 1), BASE_URL));

  const html = renderCategoryPage({ cat, page, rows });
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
