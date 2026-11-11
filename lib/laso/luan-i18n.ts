// lib/laso/luan-i18n.ts — kho bản luận lá số theo NGÔN NGỮ ≠ vi (i18n W17).
//
// `laso_public.luan_giai` CHỈ giữ tiếng Việt (CLAUDE.md "Ngôn ngữ đầu ra LLM"). Bản ja/ko/zh-*/en của
// CÙNG slug nằm ở bảng con `laso_public_i18n` (khoá `(slug, locale)`, `_patches/migration-laso-public-i18n.sql`).
// File này là cửa DUY NHẤT chạm bảng đó.
//
// Luật:
//  · `vi` KHÔNG BAO GIỜ đi qua đây — cả hai hàm trả ngay cho `vi`, nên đường Việt không đổi một byte.
//  · Quyền sở hữu theo SLUG (credit_transactions), không theo ngôn ngữ: người đã mua bản vi đọc/sinh bản
//    ja của cùng lá số qua đúng cổng thanh toán cũ (`hasAnySlugAccess`/`requireCredits` re-access) — file
//    này KHÔNG kiểm tiền, chỉ là kho.
//  · Fail an toàn: bảng/hàm chưa có (migration chưa chạy), mạng lỗi, thiếu env ⇒ đọc trả `null` (bên gọi
//    sinh như cũ), ghi trả `false` + `console.error`. Không ném, không làm route 500.

import type { Locale } from '@/lib/i18n/locales';

export type LuanStore = Record<string, unknown>;

export interface LuanI18nRow {
  luanGiai: LuanStore;
  namXem: number | null;
}

/** Cho phép bộ dò (`check:lasoi18n`) bơm env/fetch giả. Route thật để trống. */
export interface LuanI18nEnv {
  url?: string;
  key?: string;
  fetch?: typeof fetch;
}

const TABLE = 'laso_public_i18n';
const RPC = 'laso_public_i18n_merge';

function conn(e?: LuanI18nEnv) {
  const url = e?.url ?? process.env.SUPABASE_URL;
  const key = e?.key ?? process.env.SUPABASE_SERVICE_KEY;
  const f = e?.fetch ?? fetch;
  return url && key ? { url, key, f } : null;
}

function isStore(v: unknown): v is LuanStore {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Bản luận đã lưu của `slug` ở `locale`. `vi` ⇒ `null` (bản Việt ở `laso_public`, bên gọi tự đọc như cũ).
 * Hụt / rỗng / bảng chưa có / lỗi ⇒ `null`.
 */
export async function readLuanI18n(
  slug: string,
  locale: Locale,
  e?: LuanI18nEnv
): Promise<LuanI18nRow | null> {
  if (locale === 'vi' || !slug) return null;
  const c = conn(e);
  if (!c) return null;
  try {
    const r = await c.f(
      `${c.url}/rest/v1/${TABLE}?slug=eq.${encodeURIComponent(slug)}` +
        `&locale=eq.${encodeURIComponent(locale)}&select=luan_giai,nam_xem&limit=1`,
      {
        headers: { apikey: c.key, Authorization: `Bearer ${c.key}` },
        cache: 'no-store',
      }
    );
    if (!r.ok) {
      // 404 PGRST205 = migration chưa chạy — hành vi cũ (sinh lại), không phải sự cố.
      console.error('[luan-i18n] read', r.status, (await r.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const rows = (await r.json()) as Array<{ luan_giai?: unknown; nam_xem?: unknown }>;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row || !isStore(row.luan_giai) || Object.keys(row.luan_giai).length === 0) return null;
    return {
      luanGiai: row.luan_giai,
      namXem: typeof row.nam_xem === 'number' ? row.nam_xem : null,
    };
  } catch (err) {
    console.error('[luan-i18n] read', err);
    return null;
  }
}

/**
 * Gộp NÔNG `luanGiai` (khoá theo số phần) vào bản `(slug, locale)` — nguyên tử ở DB (RPC). `vi` ⇒ không
 * làm gì (bản Việt ghi ở `laso_public` như cũ). Trả `true` khi đã ghi.
 */
export async function mergeLuanI18n(
  slug: string,
  locale: Locale,
  luanGiai: unknown,
  namXem: number | null,
  e?: LuanI18nEnv
): Promise<boolean> {
  if (locale === 'vi' || !slug) return false;
  if (!isStore(luanGiai) || Object.keys(luanGiai).length === 0) return false;
  const c = conn(e);
  if (!c) {
    console.error('[luan-i18n] merge: thiếu SUPABASE_URL/SUPABASE_SERVICE_KEY');
    return false;
  }
  try {
    const r = await c.f(`${c.url}/rest/v1/rpc/${RPC}`, {
      method: 'POST',
      headers: {
        apikey: c.key,
        Authorization: `Bearer ${c.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_slug: slug,
        p_locale: locale,
        p_luan_giai: luanGiai,
        p_nam_xem: Number.isFinite(namXem) ? namXem : null,
      }),
      cache: 'no-store',
    });
    if (!r.ok) {
      console.error('[luan-i18n] merge', r.status, (await r.text().catch(() => '')).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[luan-i18n] merge', err);
    return false;
  }
}
