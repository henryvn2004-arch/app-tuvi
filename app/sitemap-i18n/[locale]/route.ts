// app/sitemap-i18n/[locale]/route.ts — sitemap THEO NGÔN NGỮ (`/sitemap-i18n-<locale>.xml`,
// rewrite ở next.config.mjs), mỗi file kèm xhtml:link hreflang đủ bản đã dịch + x-default.
// Chỉ liệt kê trang đã dịch ĐỦ cho ngôn ngữ đó (i18n/availability.json — cùng nguồn với
// header Link của proxy và hreflang trong trang) ⇒ trang chưa dịch không bao giờ lọt sitemap.
import { NextResponse } from 'next/server';
import { isLocale } from '@/lib/i18n/locales';
import { escXml, xmlResponse } from '@/lib/seo/sitemap-source';
import { urlFor, HREFLANG } from '@/lib/i18n/links.mjs';
import availability from '@/i18n/availability.json';

export const dynamic = 'force-dynamic';

const AVAIL = availability as Record<string, string[]>;
const LANGS = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'];

export async function GET(_req: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale } = await ctx.params;
  if (!isLocale(locale) || locale === 'vi') return new NextResponse('Not found', { status: 404 });
  const rows: string[] = [];
  for (const [path, locales] of Object.entries(AVAIL)) {
    if (!locales.includes(locale)) continue;
    const alt = (l: string) =>
      `    <xhtml:link rel="alternate" hreflang="${(HREFLANG as Record<string, string>)[l]}" href="${escXml(urlFor(l, path))}"/>`;
    const links = ['vi', ...LANGS.filter((l) => locales.includes(l))].map(alt);
    links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(urlFor('vi', path))}"/>`);
    rows.push(`  <url>\n    <loc>${escXml(urlFor(locale, path))}</loc>\n${links.join('\n')}\n  </url>`);
  }
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>`);
}
