// app/ngay-tot/ngay/[year]/[m]/[d]/route.ts — day detail, 10 activity scores
export const revalidate = false;

import { NextRequest } from 'next/server';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageDay } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string; m: string; d: string }> },
) {
  const { year, m, d } = await params;
  return toResponse(pageDay(makeCtx('vi'), year, m, d));
}
