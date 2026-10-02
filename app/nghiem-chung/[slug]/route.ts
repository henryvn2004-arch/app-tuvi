// app/nghiem-chung/[slug]/route.ts — hồ sơ giờ sinh KIỂM CHỨNG. Khuôn trang ở
// lib/nghiem-chung/trang-ho-so.ts (dùng chung với /xac-dinh-gio-sinh/[slug]).
export const revalidate = 604800;

import { NextRequest } from 'next/server';
import { trangHoSo } from '@/lib/nghiem-chung/trang-ho-so';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  return trangHoSo((await params).slug, 'nghiem-chung');
}
