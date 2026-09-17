// app/api/tai-mau/route.ts
// Proxy PDF mẫu từ bucket "samples" (Supabase Storage) qua domain riêng —
// link download hiện `tuviminhbao.com/tai-mau/...` thay vì lộ project ref Supabase.
// Rewrite: /tai-mau/:file -> /api/tai-mau?file=:file (xem next.config.mjs).
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const FILE_RE = /^mau-[a-z0-9-]+\.pdf$/;

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file') || '';
  if (!FILE_RE.test(file)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/samples/${file}`,
    { cache: 'no-store' },
  );
  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
