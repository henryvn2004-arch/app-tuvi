// lib/email/locale.ts
// ============================================================
// Ngôn ngữ ưa thích của người dùng, để MỌI email đi bằng đúng ngôn ngữ họ.
//
// Vì sao phải lưu DB mà không đọc cookie lúc gửi: hoá đơn gửi từ webhook PayPal
// (không có cookie), reminder/cross-sell/broadcast gửi từ cron (không có request).
// Cookie `tvmb_locale` chỉ đọc được lúc khách còn ngồi trước máy — mua hàng, gửi
// PDF — nên ghi vào bảng `user_locale` ở đúng hai khoảnh khắc đó
// (`_patches/migration-user-locale.sql`); chưa có dòng thì rơi về `user_metadata.locale` (lúc đăng ký).
// Đọc hụt/bảng chưa tạo ⇒ tiếng Việt,
// đúng hành vi trước W11 — không bao giờ làm hỏng việc gửi.
// ============================================================
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locales';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const COOKIE = 'tvmb_locale'; // phải khớp public/i18n.js

const SB = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/** Đọc cookie `tvmb_locale` từ header `Cookie`. null = không có/không hợp lệ. */
export function localeFromCookieHeader(cookie: string | null | undefined): Locale | null {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookie || '');
  const v = m ? decodeURIComponent(m[1]) : '';
  return isLocale(v) ? v : null;
}

/**
 * Ghi ngôn ngữ của người dùng (upsert). Best-effort: lỗi không được chặn luồng
 * mua hàng/gửi PDF, nhưng vẫn phải để lại dấu trong log (bảng chưa tạo thì ở đây).
 */
export async function saveUserLocale(userId: string, locale: Locale | null): Promise<void> {
  if (!locale || !userId || !SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_locale?on_conflict=user_id`, {
      method: 'POST',
      headers: { ...SB, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId, locale, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) console.error('[user-locale] ghi lỗi', res.status, await res.text());
  } catch (e) {
    console.error('[user-locale] ghi lỗi', e);
  }
}

/** Ngôn ngữ gắn lúc signUp/claimAccount (`public/auth.js`, W4b) ở `user_metadata.locale`. */
async function localeFromAuthMetadata(userId: string): Promise<Locale | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: SB,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const v = ((await res.json()) as { user_metadata?: { locale?: unknown } }).user_metadata?.locale;
    return isLocale(v) ? v : null;
  } catch (e) {
    console.error('[user-locale] đọc user_metadata lỗi', e);
    return null;
  }
}

/**
 * Ngôn ngữ của nhiều người trong MỘT lượt gọi (cron). Thiếu người nào → không có khoá đó.
 * Thứ tự ưu tiên: (1) bảng `user_locale` — cookie lúc MUA/gửi PDF, tức ngôn ngữ khách dùng gần nhất;
 * (2) `user_metadata.locale` — ngôn ngữ lúc ĐĂNG KÝ, chỉ dùng khi bảng không có dòng.
 */
export async function getUserLocales(userIds: string[]): Promise<Map<string, Locale>> {
  const out = new Map<string, Locale>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length || !SUPABASE_URL || !SUPABASE_KEY) return out;
  // Cắt lô để URL không vượt giới hạn độ dài.
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_locale?user_id=in.(${chunk.map(encodeURIComponent).join(',')})&select=user_id,locale`,
        { headers: SB, cache: 'no-store' },
      );
      if (!res.ok) {
        console.error('[user-locale] đọc lỗi', res.status);
        continue;
      }
      for (const r of (await res.json()) as { user_id: string; locale: string }[]) {
        if (isLocale(r.locale)) out.set(r.user_id, r.locale);
      }
    } catch (e) {
      console.error('[user-locale] đọc lỗi', e);
    }
  }
  // Người chưa có dòng nào: hỏi metadata, 10 người song song (mỗi lượt cron tối đa vài trăm người).
  const missing = ids.filter((id) => !out.has(id));
  for (let i = 0; i < missing.length; i += 10) {
    const part = missing.slice(i, i + 10);
    const got = await Promise.all(part.map(localeFromAuthMetadata));
    part.forEach((id, k) => {
      const l = got[k];
      if (l) out.set(id, l);
    });
  }
  return out;
}

export async function getUserLocale(userId: string | undefined): Promise<Locale> {
  if (!userId) return DEFAULT_LOCALE;
  return (await getUserLocales([userId])).get(userId) ?? DEFAULT_LOCALE;
}
