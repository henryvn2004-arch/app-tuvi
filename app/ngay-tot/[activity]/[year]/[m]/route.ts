// app/ngay-tot/[activity]/[year]/thang-[m]/route.ts — THE long-tail page
// vd: /ngay-tot/cuoi-hoi/2026/thang-5
export const revalidate = false;

import { NextRequest } from 'next/server';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageActivityMonth } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ activity: string; year: string; m: string }> },
) {
  const { activity, year, m } = await params;
  return toResponse(pageActivityMonth(makeCtx('vi'), activity, year, m));
}
