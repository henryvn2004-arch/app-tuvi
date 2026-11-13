// proxy.ts — đa ngôn ngữ (Next 16: `middleware` đã đổi tên thành `proxy`).
// Hợp đồng ở lib/i18n/locales.ts · quy ước ở docs/i18n/QUY-UOC.md.
//
//   /<locale>/<đường dẫn cũ>  → bóc tiền tố, gắn header x-tvmb-locale, giao cho
//                               app/i18n-render (dựng HTML đã dịch phía SERVER).
//   /vi/...                   → 308 về URL không tiền tố (vi ở gốc, MỘT URL/nội dung).
//   đường dẫn vi              → đi tiếp nguyên trạng, chỉ gắn header `Link` hreflang
//                               cho những trang đã có bản dịch (HTML tĩnh không chèn
//                               được thẻ <link>; Google đọc hreflang qua header).
//
// CỐ Ý không redirect theo Accept-Language hay cookie: crawler phải thấy mỗi URL
// ổn định một nội dung. Gợi ý ngôn ngữ là thanh nhẹ phía client (public/i18n.js).
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, LOCALE_HEADER } from '@/lib/i18n/locales';
import { linkHeaderForVi, normPath } from '@/lib/i18n/links.mjs';
import { isSelfManaged, localizedSsrTarget, LOCALIZED_SSR } from '@/lib/i18n/self-managed.mjs';
import { singleLocaleOf } from '@/lib/i18n/single-locale.mjs';
import availability from '@/i18n/availability.json';

const AVAIL = availability as Record<string, string[]>;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const seg = pathname.split('/')[1] || '';

  // Cổng nội bộ không được gọi thẳng từ ngoài.
  if (seg === 'i18n-render' || Object.values(LOCALIZED_SSR).includes('/' + seg))
    return new NextResponse('Not found', { status: 404 });

  if (isLocale(seg)) {
    const rest = pathname.slice(seg.length + 1) || '/';
    if (seg === 'vi') {
      const to = req.nextUrl.clone();
      to.pathname = rest;
      return NextResponse.redirect(to, 308);
    }
    // `/ja/ja/...` hay `/ja/en/...` không phải URL hợp lệ.
    if (isLocale(rest.split('/')[1] || '')) return new NextResponse('Not found', { status: 404 });
    // Trang chỉ một ngôn ngữ (lib/i18n/single-locale.mjs): sai ngôn ngữ ⇒ 404; đúng ⇒ phục vụ nguyên file.
    const only = singleLocaleOf(normPath(rest));
    if (only && only !== seg) return new NextResponse('Not found', { status: 404 });
    const url = req.nextUrl.clone();
    // Route tự dịch + tự quản SEO (lib/i18n/self-managed.mjs): chỉ bóc tiền tố + gắn header.
    // Route SSR đã dịch (`/ngay-tot`): rewrite sang cây nội bộ có ngôn ngữ trong đường dẫn.
    url.pathname =
      localizedSsrTarget(seg, rest) ??
      (only || isSelfManaged(rest) ? rest : `/i18n-render/${seg}${rest === '/' ? '' : rest}`);
    const headers = new Headers(req.headers);
    headers.set(LOCALE_HEADER, seg);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // Trang chỉ một ngôn ngữ không có bản vi: về URL có tiền tố.
  const only = singleLocaleOf(normPath(pathname));
  if (only) {
    const to = req.nextUrl.clone();
    to.pathname = `/${only}${normPath(pathname)}`;
    return NextResponse.redirect(to, 308);
  }

  const res = NextResponse.next();
  const link = linkHeaderForVi(normPath(pathname), AVAIL[normPath(pathname)]);
  if (link) res.headers.set('Link', link);
  return res;
}

export const config = {
  // Bỏ _next, api và mọi file có đuôi (ảnh/js/css/font/xml…) TRỪ .html — trang
  // tĩnh trong public/ có đuôi .html (vd /chinh-sach-bao-mat.html) vẫn phải qua đây.
  matcher: ['/((?!_next/|api/|.*\\.(?!html$)[A-Za-z0-9]+$).*)'],
};
