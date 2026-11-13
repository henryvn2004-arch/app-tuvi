// app/ngay-tot/lich/[year]/route.ts — year hub: 12 tháng
export const revalidate = false;

import { NextRequest } from 'next/server';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageLichYear } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  return toResponse(pageLichYear(makeCtx('vi'), year));
}
