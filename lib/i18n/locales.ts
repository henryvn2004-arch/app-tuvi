// lib/i18n/locales.ts — NGUỒN DUY NHẤT danh sách ngôn ngữ của tuviminhbao.com.
// Hợp đồng chung cho mọi luồng việc đa ngôn ngữ — xem docs/i18n/WORKPLAN.md.
// Đổi file này là đổi hợp đồng: báo lại ở WORKPLAN trước khi sửa.

export const LOCALES = ['vi', 'en', 'ja', 'ko', 'zh-tw', 'zh-cn'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';

/** Tiền tố URL. `vi` KHÔNG có tiền tố để mọi link cũ đã chia sẻ không chết. */
export function localePrefix(l: Locale): string {
  return l === 'vi' ? '' : `/${l}`;
}

/** Mã BCP-47 cho `hreflang` và `<html lang>`. */
export const HREFLANG: Record<Locale, string> = {
  vi: 'vi',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  'zh-tw': 'zh-Hant-TW',
  'zh-cn': 'zh-Hans-CN',
};

/**
 * Tên hiện trong bộ chọn ngôn ngữ — viết bằng CHÍNH ngôn ngữ đó, KHÔNG dùng cờ
 * quốc gia (cờ là emoji màu — trái luật icon; và cờ cho tiếng Trung là chuyện
 * chính trị Đài/Trung).
 */
export const LOCALE_LABEL: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
};

/**
 * Header mà proxy gắn sau khi bóc tiền tố `/<locale>` khỏi URL. Route handler
 * đọc ngôn ngữ qua `localeFromHeaders`, KHÔNG tự parse URL.
 */
export const LOCALE_HEADER = 'x-tvmb-locale';

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export function localeFromHeaders(h: Headers): Locale {
  const v = h.get(LOCALE_HEADER);
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
