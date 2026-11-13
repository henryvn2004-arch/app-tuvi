// app/ngay-tot/[activity]/route.ts — activity hub: 17 năm × 12 tháng grid
export const revalidate = false;

import { NextRequest } from 'next/server';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageActivity } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ activity: string }> },
) {
  const { activity } = await params;
  return toResponse(pageActivity(makeCtx('vi'), activity));
}
