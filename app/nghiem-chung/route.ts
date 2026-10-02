// app/nghiem-chung/route.ts — trang tổng hợp mục Nghiệm Chứng. Khuôn chung: lib/nghiem-chung/trang-hub.ts.
export const revalidate = 86400;

import { NextRequest } from 'next/server';
import { trangHub } from '@/lib/nghiem-chung/trang-hub';

export async function GET(req: NextRequest): Promise<Response> {
  return trangHub(req, 'nghiem-chung');
}
