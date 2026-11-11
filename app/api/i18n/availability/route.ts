// GET /api/i18n/availability — bản đồ "trang nào đã dịch sang ngôn ngữ nào" cho
// public/i18n.js (bộ chọn ngôn ngữ, thanh gợi ý, link sang bản dịch). Nguồn là
// i18n/availability.json (SINH bởi npm run i18n:pages) — cùng nguồn với header
// Link hreflang của proxy và sitemap, để ba nơi không bao giờ nói khác nhau.
import { NextResponse } from 'next/server';
import availability from '@/i18n/availability.json';

export function GET() {
  return NextResponse.json(availability, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
