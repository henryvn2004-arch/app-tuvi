// lib/seo/indexnow.ts — IndexNow (Bing · Naver · Yandex…) cho URL đã dịch (W10).
// Cron: app/api/cron/indexnow. Key là FILE CÔNG KHAI public/<key>.txt (không phải bí mật — giao
// thức bắt buộc ai cũng đọc được để chứng minh quyền sở hữu host), nên nằm thẳng trong mã.
// Đổi key = đổi CẢ hằng này lẫn tên + nội dung file; cron tự kiểm file đang được phục vụ khớp
// hằng trước khi gửi (lệch ⇒ IndexNow trả 403 mà không ai thấy).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, localePrefix, type Locale } from '@/lib/i18n/locales';
import { urlFor } from '@/lib/i18n/links.mjs';
import { BASE_URL } from '@/lib/seo/sitemap-source';
import { danhMuc } from '@/lib/nghiem-chung/store';
import { sb, coDb } from '@/lib/nghiem-chung/db';
import { getConfigValue } from '@/lib/config/appConfig';
import { createHash } from 'node:crypto';

export const INDEXNOW_KEY = '6d87e02a5a507ff35b37cb74c1178b2f';
export const INDEXNOW_HOST = new URL(BASE_URL).host;
export const INDEXNOW_KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;
/** api.indexnow.org chia sẻ cho Bing/Yandex/Seznam…; Naver nhận qua endpoint riêng của họ. */
export const INDEXNOW_ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];

export interface Candidate {
  url: string;
  /** Băm nội dung đã/sẽ gửi: cùng URL cùng hash ⇒ không gửi lại; đổi hash ⇒ "URL đã đổi". */
  hash: string;
}

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);

// ── Trang tĩnh đã dịch ─────────────────────────────────────────────────────────

/**
 * Mọi (ngôn ngữ × trang) trong `i18n/availability.json`, hash = băm chữ ĐÃ DỊCH của các khoá
 * của trang (i18n/pages.json) ⇒ sửa bản dịch là URL tự hiện lại. Đọc bằng fs (có trong
 * `outputFileTracingIncludes`) để ngôn ngữ mới (ko…) không phải sửa file này.
 */
export function staticCandidates(): Candidate[] {
  const root = join(process.cwd(), 'i18n');
  const rd = (f: string) => JSON.parse(readFileSync(join(root, f), 'utf8'));
  const avail = rd('availability.json') as Record<string, string[]>;
  const pages = rd('pages.json') as Record<string, { keys: string[] }>;
  const dicts = new Map<string, Record<string, { t: string }>>();
  const out: Candidate[] = [];
  for (const [path, locales] of Object.entries(avail)) {
    const keys = pages[path]?.keys || [];
    for (const l of locales) {
      if (!dicts.has(l)) {
        try {
          dicts.set(l, rd(`${l}.json`));
        } catch {
          dicts.set(l, {});
        }
      }
      const d = dicts.get(l)!;
      out.push({ url: urlFor(l, path), hash: 'p:' + sha(keys.map((k) => d[k]?.t ?? '').join('\n')) });
    }
  }
  return out;
}

// ── Hồ sơ Nghiệm Chứng / Xác Định Giờ Sinh vừa dịch ────────────────────────────

/**
 * Bản dịch status=ok của hồ sơ ĐÃ MỞ INDEX ở bản gốc (cùng luật `sitemap-nghiem-chung`: hồ sơ
 * chưa mở index mang noindex, gửi IndexNow là tự mâu thuẫn). Hash = `updated_at`; mới nhất trước.
 */
export async function nghiemChungCandidates(): Promise<Candidate[]> {
  if (!coDb()) return [];
  const goc = new Map((await danhMuc()).filter((x) => x.indexed).map((x) => [x.slug, x]));
  const rows: { slug: string; locale: Locale; updated_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const r = await sb(
      `/nc_ho_so_i18n?status=eq.ok&select=slug,locale,updated_at&order=updated_at.desc,slug.asc,locale.asc&limit=1000&offset=${from}`,
    );
    if (!r.ok) throw new Error(`đọc nc_ho_so_i18n: ${r.status}`);
    const b = r.body as typeof rows;
    rows.push(...b);
    if (b.length < 1000) break;
  }
  const out: Candidate[] = [];
  for (const x of rows) {
    const g = goc.get(x.slug);
    if (!g || !(LOCALES as readonly string[]).includes(x.locale)) continue;
    const seg = g.gioDoan ? 'xac-dinh-gio-sinh' : 'nghiem-chung';
    out.push({ url: `${BASE_URL}${localePrefix(x.locale)}/${seg}/${x.slug}`, hash: 'u:' + x.updated_at });
  }
  return out;
}

// ── Sổ đã gửi (`indexnow_sent`) ───────────────────────────────────────────────

/** Đọc TOÀN BỘ sổ. Lỗi ⇒ ném (cron dừng, KHÔNG gửi — thiếu sổ mà gửi là gửi lại tất cả mỗi ngày). */
export async function loadSent(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const r = await sb(`/indexnow_sent?select=url,content_hash&order=url.asc&limit=1000&offset=${from}`);
    if (!r.ok) throw new Error(`đọc indexnow_sent: ${r.status} (đã chạy _patches/migration-i18n-seo.sql chưa?)`);
    const b = r.body as { url: string; content_hash: string }[];
    for (const x of b) m.set(x.url, x.content_hash);
    if (b.length < 1000) break;
  }
  return m;
}

export async function markSent(items: Candidate[]): Promise<void> {
  const now = new Date().toISOString();
  for (let i = 0; i < items.length; i += 500) {
    const body = items.slice(i, i + 500).map((c) => ({ url: c.url, content_hash: c.hash, sent_at: now }));
    const r = await sb('/indexnow_sent?on_conflict=url', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body),
    });
    // Ghi sổ hụt ⇒ lượt sau gửi lại đúng các URL này (vô hại nhưng phải kêu).
    if (!r.ok) console.error(`[indexnow] ghi sổ lô ${i}: ${r.status}`);
  }
}

// ── Gửi ────────────────────────────────────────────────────────────────────────

export interface IndexNowConfig {
  enabled: boolean;
  /** Trần số URL mỗi lượt (giao thức cho tới 10.000/lệnh). */
  maxPerRun: number;
}

export async function loadIndexNowConfig(): Promise<IndexNowConfig> {
  const raw = await getConfigValue<Partial<IndexNowConfig> | null>('seo.indexnow', null);
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
    maxPerRun: Number.isFinite(raw?.maxPerRun) && (raw!.maxPerRun as number) > 0 ? (raw!.maxPerRun as number) : 500,
  };
}

/** File key đang được phục vụ có khớp hằng không (bắt lệch key/file trước khi gửi). */
export async function keyFileOk(): Promise<boolean> {
  try {
    const r = await fetch(INDEXNOW_KEY_LOCATION, { cache: 'no-store' });
    return r.ok && (await r.text()).trim() === INDEXNOW_KEY;
  } catch {
    return false;
  }
}

/** POST một lô tới một endpoint; trả mã HTTP (0 = lỗi mạng). 200/202 = nhận. */
export async function submit(endpoint: string, urls: string[]): Promise<number> {
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_LOCATION, urlList: urls }),
      signal: AbortSignal.timeout(30000),
    });
    return r.status;
  } catch {
    return 0;
  }
}
