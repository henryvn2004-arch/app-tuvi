// app/llms-full/[locale]/route.ts — `/llms-full-<locale>.txt` (rewrite ở next.config.mjs). Logic: lib/seo/llms-i18n.ts.
// Ngôn ngữ chưa dịch gì ⇒ 404.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { buildLlms, isLlmsLocale } from '@/lib/seo/llms-i18n';

export async function GET(_req: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale } = await ctx.params;
  if (!isLlmsLocale(locale)) return new NextResponse('Not found', { status: 404 });
  const body = await buildLlms(locale, true);
  if (body === null) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
