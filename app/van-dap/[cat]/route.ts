// app/van-dap/[cat]/route.ts — trang cụm 1 danh mục, trang 1.
// Trang N: xem app/van-dap/[cat]/trang/[page]/route.ts (dùng chung renderCategoryPage).
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { khaoLuanCategory, fetchByCategory, renderCategoryPage, BASE_URL } from '../_shared';
import { logAiCrawlerHit } from '@/lib/seo/ai-crawler-log';

export async function GET(request: NextRequest, { params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  logAiCrawlerHit(request.headers.get('user-agent'), `/van-dap/${cat}`);
  if (!khaoLuanCategory(cat)) return NextResponse.redirect(new URL('/van-dap', BASE_URL));

  const rows = await fetchByCategory(cat);
  const html = renderCategoryPage({ cat, page: 1, rows });
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
