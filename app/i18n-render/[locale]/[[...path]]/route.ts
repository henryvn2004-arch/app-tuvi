// app/i18n-render/[locale]/[[...path]]/route.ts — dựng trang `/<locale>/<path>`.
// Chỉ proxy.ts rewrite vào đây (gọi thẳng bị proxy chặn 404).
//
// Cách làm: lấy HTML tiếng Việt của CHÍNH trang đó qua một fetch nội bộ tới URL
// không tiền tố (nhờ vậy dùng lại nguyên bảng rewrites/redirects của
// next.config.mjs + mọi route SSR, không chép bảng sang chỗ thứ hai), rồi thay
// chữ theo từ điển NGAY TRÊN SERVER. Crawler nhận HTML đã chứa chữ ngôn ngữ đích.
//
// Trang chưa dịch đủ vẫn phục vụ được (người dùng bấm từ link) nhưng gắn
// `noindex` — header X-Robots-Tag + thẻ meta — và không vào hreflang/sitemap.
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, LOCALE_HEADER } from '@/lib/i18n/locales';
import { renderLocalized } from '@/lib/i18n/render.mjs';
import { loadVi, loadLocale, loadAvailability } from '@/lib/i18n/dict.mjs';
import { normPath, relFor } from '@/lib/i18n/links.mjs';

export const dynamic = 'force-dynamic';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ locale: string; path?: string[] }> }) {
  const { locale, path } = await ctx.params;
  if (!isLocale(locale) || locale === 'vi') return new NextResponse('Not found', { status: 404 });
  const rest = '/' + (path || []).join('/');
  // Chỉ phục vụ trang; API/asset không có bản dịch.
  if (/^\/(api|_next)(\/|$)/.test(rest)) return new NextResponse('Not found', { status: 404 });

  const origin = new URL(req.url).origin;
  const search = req.nextUrl.search;
  const headers: Record<string, string> = {
    accept: 'text/html,application/xhtml+xml',
    'user-agent': req.headers.get('user-agent') || 'tvmb-i18n',
    [LOCALE_HEADER]: locale,
  };
  // Preview Vercel khoá sau SSO: chuyển tiếp cookie phiên bảo vệ (và CHỈ nó —
  // không chuyển cookie đăng nhập để HTML dịch dùng chung được trên CDN).
  const jwt = /(?:^|;\s*)(_vercel_jwt=[^;]+)/.exec(req.headers.get('cookie') || '');
  if (jwt) headers.cookie = jwt[1];
  const bypass = req.headers.get('x-vercel-protection-bypass');
  if (bypass) headers['x-vercel-protection-bypass'] = bypass;

  const up = await fetch(origin + rest + search, { headers, redirect: 'manual', cache: 'no-store' });
  const avail = loadAvailability() as Record<string, string[]>;

  if (REDIRECTS.has(up.status)) {
    const loc = up.headers.get('location') || '/';
    const u = new URL(loc, origin);
    if (u.origin !== origin) return NextResponse.redirect(u, up.status);
    const target = normPath(u.pathname);
    // Đích đã dịch → ở lại ngôn ngữ; chưa dịch → về bản vi (không phục vụ chữ Việt dưới /ja).
    const dest = (avail[target] || []).includes(locale) ? relFor(locale, target) : u.pathname;
    return NextResponse.redirect(new URL(dest + u.search, origin), up.status);
  }

  const type = up.headers.get('content-type') || '';
  if (!/text\/html/i.test(type) || up.status >= 400) {
    // Không phải HTML (hoặc lỗi): trả nguyên, nhưng không để index bản lỗi.
    const h = new Headers();
    if (type) h.set('content-type', type);
    h.set('X-Robots-Tag', 'noindex');
    return new NextResponse(up.body, { status: up.status, headers: h });
  }

  const r = renderLocalized({
    html: await up.text(),
    locale,
    path: rest,
    vi: loadVi(),
    dict: loadLocale(locale),
    avail,
  });
  const h = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'content-language': locale,
    'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
  });
  if (!r.complete) h.set('X-Robots-Tag', 'noindex, follow');
  return new NextResponse(r.html, { status: 200, headers: h });
}
