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

// ── Hreflang / sitemap theo TỪNG bản ghi (i18n W33a, route `/<locale>/la-so/<slug>`) ─────────────────
// Chỉ bản ≠ vi có luận KHÔNG rỗng mới được coi là "đã dịch": trang `/ja/la-so/<slug>` của bản ghi chưa có
// bản ja phải noindex và không vào hreflang/sitemap. Đọc có hạn giờ (route lá số từng chết vì Supabase treo).

const NGOAI_NGU = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'] as const;
const READ_TIMEOUT_MS = 4000;
const NON_EMPTY = 'luan_giai=neq.%7B%7D';

function isNgoaiNgu(v: unknown): v is Locale {
  return typeof v === 'string' && (NGOAI_NGU as readonly string[]).includes(v);
}

async function readRows<T>(c: NonNullable<ReturnType<typeof conn>>, q: string, tag: string): Promise<T[] | null> {
  try {
    const r = await c.f(`${c.url}/rest/v1/${TABLE}?${q}`, {
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!r.ok) {
      console.error(`[luan-i18n] ${tag}`, r.status, (await r.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const rows = (await r.json()) as T[];
    return Array.isArray(rows) ? rows : null;
  } catch (err) {
    console.error(`[luan-i18n] ${tag}`, err);
    return null;
  }
}

/**
 * Các ngôn ngữ ≠ vi đã có bản luận không rỗng của `slug` (theo thứ tự `NGOAI_NGU`). `[]` = đã hỏi, chưa có
 * bản nào; `null` = KHÔNG hỏi được (bảng chưa có, mạng, thiếu env) — bên gọi coi như chưa dịch.
 */
export async function listLuanLocales(slug: string, e?: LuanI18nEnv): Promise<Locale[] | null> {
  if (!slug) return [];
  const c = conn(e);
  if (!c) return null;
  const rows = await readRows<{ locale?: unknown }>(
    c,
    `slug=eq.${encodeURIComponent(slug)}&${NON_EMPTY}&select=locale`,
    'locales'
  );
  if (!rows) return null;
  const co = new Set(rows.map((r) => r.locale).filter(isNgoaiNgu));
  return NGOAI_NGU.filter((l) => co.has(l));
}

export interface LuanI18nSlugRow {
  slug: string;
  created_at?: string;
  updated_at?: string;
}

/** Mọi slug đã có bản luận không rỗng ở `locale` (cho `sitemap-la-so.xml?lang=`). Lỗi ⇒ `[]`. */
export async function slugsLuanI18n(locale: Locale, e?: LuanI18nEnv): Promise<LuanI18nSlugRow[]> {
  if (!isNgoaiNgu(locale)) return [];
  const c = conn(e);
  if (!c) return [];
  const out: LuanI18nSlugRow[] = [];
  const PAGE = 1000;
  for (let off = 0; off < 100 * PAGE; off += PAGE) {
    const rows = await readRows<LuanI18nSlugRow>(
      c,
      `locale=eq.${encodeURIComponent(locale)}&${NON_EMPTY}&select=slug,created_at,updated_at` +
        `&order=slug.asc&limit=${PAGE}&offset=${off}`,
      'slugs'
    );
    if (!rows) break;
    out.push(...rows.filter((r) => r && typeof r.slug === 'string' && r.slug));
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Các ngôn ngữ ≠ vi có ít nhất MỘT bản luận không rỗng (để sitemap index chỉ khai file không rỗng). */
export async function localesCoLuanI18n(e?: LuanI18nEnv): Promise<Locale[]> {
  const c = conn(e);
  if (!c) return [];
  const co = await Promise.all(
    NGOAI_NGU.map((l) =>
      readRows<{ slug?: unknown }>(c, `locale=eq.${l}&${NON_EMPTY}&select=slug&limit=1`, 'co').then(
        (r) => !!r && r.length > 0
      )
    )
  );
  return NGOAI_NGU.filter((_, i) => co[i]);
}
