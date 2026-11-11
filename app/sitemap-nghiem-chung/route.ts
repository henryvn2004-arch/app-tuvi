// app/sitemap-nghiem-chung/route.ts — hồ sơ Nghiệm Chứng ĐÃ MỞ INDEX.
// Chỉ hồ sơ có `indexed` (viết tay, hoặc slug trong data/nghiem-chung/indexed.txt
// lúc dựng manifest) — hồ sơ chưa mở mang noindex, đưa vào sitemap là tự mâu thuẫn.
//
// Đa ngôn ngữ (W6): ngôn ngữ đọc từ header `x-tvmb-locale` (proxy W4), hoặc `?lang=ja` để dùng khi chưa có proxy.
// Ngôn ngữ ngoài `vi` chỉ liệt kê hồ sơ ĐÃ có bản dịch duyệt VÀ đã mở index ở bản gốc.
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
  const goc = (await danhMuc()).filter((x) => x.indexed && !x.gioDoan);
  const co = locale === DEFAULT_LOCALE ? null : new Set((await dbDanhMucDich(locale as NcLocale)).map((x) => x.slug));
  const urls = goc
    .filter((x) => !co || co.has(x.slug))
    .map((x) => urlEntry(`${BASE_URL}${localePrefix(locale)}/nghiem-chung/${x.slug}`));
  return xmlResponse(xmlUrlset(urls));
}
