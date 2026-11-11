// app/sitemap-xac-dinh-gio-sinh/route.ts — hồ sơ ĐOÁN GIỜ SINH đã mở index (cùng luật với
// app/sitemap-nghiem-chung: hồ sơ chưa mở mang noindex thì không vào sitemap).
// Đa ngôn ngữ (W6): xem app/sitemap-nghiem-chung/route.ts — cùng cơ chế `x-tvmb-locale` / `?lang=`.
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';
import { danhMuc } from '@/lib/nghiem-chung/store';
import { dbDanhMucDich } from '@/lib/nghiem-chung/i18n/db';
import type { NcLocale } from '@/lib/nghiem-chung/i18n/prose';
import { DEFAULT_LOCALE, isLocale, localeFromHeaders, localePrefix } from '@/lib/i18n/locales';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('lang');
  const locale = localeFromHeaders(req.headers) !== DEFAULT_LOCALE ? localeFromHeaders(req.headers) : isLocale(q) ? q : DEFAULT_LOCALE;
  const goc = (await danhMuc()).filter((x) => x.indexed && x.gioDoan);
  const co = locale === DEFAULT_LOCALE ? null : new Set((await dbDanhMucDich(locale as NcLocale)).map((x) => x.slug));
  const urls = goc
    .filter((x) => !co || co.has(x.slug))
    .map((x) => urlEntry(`${BASE_URL}${localePrefix(locale)}/xac-dinh-gio-sinh/${x.slug}`));
  return xmlResponse(xmlUrlset(urls));
}
