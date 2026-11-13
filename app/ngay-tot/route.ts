// app/ngay-tot/route.ts — /ngay-tot top hub (bộ dựng ở lib/ngay-tot/pages.ts; bản dịch ở app/ngay-tot-i18n)
export const revalidate = false;

import { makeCtx } from '@/lib/ngay-tot/dich';
import { pageHub } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET() {
  return toResponse(pageHub(makeCtx('vi')));
}
