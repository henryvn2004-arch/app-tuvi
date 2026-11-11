// lib/nghiem-chung/i18n/db.ts — đọc bản dịch hồ sơ Nghiệm Chứng (nc_ho_so_i18n). Chỉ phía server.
// Schema: _patches/migration-nghiem-chung-i18n.sql. Mọi GET `cache:'no-store'` (qua `sb` của ../db).
// Lỗi/thiếu bảng ⇒ coi như CHƯA có bản dịch (route trả 404 cho ngôn ngữ đó), KHÔNG ném 500 và KHÔNG lùi về chữ Việt.
import { sb, coDb } from '../db';
import type { NcLocale } from './prose';

export interface BanDich {
  slug: string;
  locale: NcLocale;
  ten: string;
  ngheNghiep: string;
  f: Record<string, string>;
  sourceHash: string;
}

let loiDaBao = false;
function baoLoi(what: string, status: number, body: unknown) {
  // Thiếu bảng (chưa chạy migration) lặp lại mỗi lượt dựng trang — chỉ báo một lần mỗi tiến trình.
  if (loiDaBao) return;
  loiDaBao = true;
  console.error(`[nghiem-chung-i18n] ${what}: ${status} ${JSON.stringify(body).slice(0, 160)} (đã chạy _patches/migration-nghiem-chung-i18n.sql chưa?)`);
}

/** Bản dịch ĐÃ DUYỆT (status ok) của một hồ sơ ở một ngôn ngữ; không có ⇒ null. */
export async function dbTaiBanDich(slug: string, locale: NcLocale): Promise<BanDich | null> {
  if (!coDb()) return null;
  try {
    const r = await sb(
      `/nc_ho_so_i18n?slug=eq.${encodeURIComponent(slug)}&locale=eq.${locale}&status=eq.ok&select=ten,nghe_nghiep,data,source_hash&limit=1`,
    );
    if (!r.ok) {
      baoLoi(`đọc ${slug}/${locale}`, r.status, r.body);
      return null;
    }
    const x = (r.body as { ten: string; nghe_nghiep: string; data: { f?: Record<string, string> }; source_hash: string }[])[0];
    if (!x) return null;
    return { slug, locale, ten: x.ten, ngheNghiep: x.nghe_nghiep, f: x.data?.f || {}, sourceHash: x.source_hash };
  } catch (e) {
    console.error(`[nghiem-chung-i18n] đọc ${slug}/${locale}:`, (e as Error).message);
    return null;
  }
}

/** Các ngôn ngữ đã có bản dịch duyệt của một hồ sơ — nguồn của `hreflang`. */
export async function dbNgonNguCuaSlug(slug: string): Promise<NcLocale[]> {
  if (!coDb()) return [];
  try {
    const r = await sb(`/nc_ho_so_i18n?slug=eq.${encodeURIComponent(slug)}&status=eq.ok&select=locale`);
    if (!r.ok) {
      baoLoi(`đọc ngôn ngữ ${slug}`, r.status, r.body);
      return [];
    }
    return (r.body as { locale: NcLocale }[]).map((x) => x.locale);
  } catch (e) {
    console.error(`[nghiem-chung-i18n] đọc ngôn ngữ ${slug}:`, (e as Error).message);
    return [];
  }
}

export interface MucDich {
  slug: string;
  ten: string;
  ngheNghiep: string;
  sourceHash: string;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; ds: MucDich[] }>();

/** Danh mục các hồ sơ đã dịch duyệt ở một ngôn ngữ (hub + sitemap + liên kết chéo). */
export async function dbDanhMucDich(locale: NcLocale): Promise<MucDich[]> {
  const c = cache.get(locale);
  if (c && Date.now() - c.at < TTL_MS) return c.ds;
  if (!coDb()) return [];
  const ds: MucDich[] = [];
  try {
    for (let from = 0; ; from += 1000) {
      const r = await sb(
        `/nc_ho_so_i18n?locale=eq.${locale}&status=eq.ok&select=slug,ten,nghe_nghiep,source_hash&order=slug.asc&limit=1000&offset=${from}`,
      );
      if (!r.ok) {
        baoLoi(`đọc danh mục ${locale}`, r.status, r.body);
        break;
      }
      const rows = r.body as { slug: string; ten: string; nghe_nghiep: string; source_hash: string }[];
      for (const x of rows) ds.push({ slug: x.slug, ten: x.ten, ngheNghiep: x.nghe_nghiep, sourceHash: x.source_hash });
      if (rows.length < 1000) break;
    }
  } catch (e) {
    console.error(`[nghiem-chung-i18n] đọc danh mục ${locale}:`, (e as Error).message);
  }
  cache.set(locale, { at: Date.now(), ds });
  return ds;
}
