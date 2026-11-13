// app/ngay-tot/lich/[year]/thang-[m]/route.ts — month overview với toàn bộ ngày
export const revalidate = false;

import { NextRequest } from 'next/server';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageLichMonth } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string; m: string }> },
) {
  const { year, m } = await params;
  return toResponse(pageLichMonth(makeCtx('vi'), year, m));
}
