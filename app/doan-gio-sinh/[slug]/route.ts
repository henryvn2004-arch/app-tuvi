// app/doan-gio-sinh/[slug]/route.ts — hồ sơ giờ sinh SUY ĐOÁN (12 lá số, giờ nào khớp đời
// nhất). Cùng khuôn với Nghiệm Chứng: lib/nghiem-chung/trang-ho-so.ts.
export const revalidate = 604800;

import { NextRequest } from 'next/server';
import { trangHoSo } from '@/lib/nghiem-chung/trang-ho-so';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  return trangHoSo((await params).slug, 'doan-gio-sinh');
}
