// app/ngay-tot-i18n/[locale]/[[...path]]/route.ts — `/<locale>/ngay-tot/**` (ja · ko · en · zh-tw · zh-cn), W33b.
// Cổng NỘI BỘ: proxy.ts bóc tiền tố ngôn ngữ rồi rewrite `/ja/ngay-tot/lich/2026` → `/ngay-tot-i18n/ja/lich/2026`
// (lib/i18n/self-managed.mjs `LOCALIZED_SSR`); gọi thẳng từ ngoài là 404. Ngôn ngữ nằm TRONG đường dẫn (không phải header)
// nên ISR/`revalidate=false` khoá đúng theo URL — khác `nghiem-chung` phải `force-dynamic` vì đọc header, và giữ route vi tĩnh.
// Bộ dựng dùng CHUNG với bản vi (lib/ngay-tot/pages.ts). Route tự quản canonical/hreflang/noindex (renderPage).
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { isLocale } from '@/lib/i18n/locales';
import { makeCtx } from '@/lib/ngay-tot/dich';
import { dispatch } from '@/lib/ngay-tot/pages';
import { toResponse } from '@/lib/ngay-tot/shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ locale: string; path?: string[] }> },
) {
  const { locale, path } = await params;
  if (!isLocale(locale) || locale === 'vi') return new NextResponse('Not found', { status: 404 });
  const out = dispatch(makeCtx(locale), (path ?? []).filter(Boolean));
  if (!out) return new NextResponse('Not found', { status: 404 });
  return toResponse(out);
}
