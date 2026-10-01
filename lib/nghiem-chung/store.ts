// lib/nghiem-chung/store.ts — đọc hồ sơ Nghiệm Chứng (chỉ phía server).
//
// Hai nguồn, MỘT cửa:
//   · HO_SO (TS, viết tay) — ưu tiên.
//   · data/nghiem-chung/ho-so/<slug>.json.gz — sinh hàng loạt qua
//     scripts/nghiem-chung/validate.ts (đã kiểm mã engine + trích dẫn).
//   · data/nghiem-chung/manifest.json — danh mục gọn cho hub + sitemap, sinh
//     bằng scripts/nghiem-chung/manifest.ts. Không đọc 13k file gz để dựng hub.
// File nằm ngoài public/ (không cho tải thô) và được kéo vào bundle route qua
// `outputFileTracingIncludes` (next.config.mjs).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { HO_SO, dem, type HoSoNghiemChung } from './index';

const DIR = join(process.cwd(), 'data', 'nghiem-chung');

export interface MucManifest {
  slug: string;
  ten: string;
  ngheNghiep: string;
  namSinh: number;
  anhCommons?: string;
  tyLeBM: number | null;
  tyLeDV: number | null;
  indexed: boolean;
}

export function taiHoSo(slug: string): HoSoNghiemChung | null {
  const tay = HO_SO.find((h) => h.slug === slug);
  if (tay) return tay;
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  const p = join(DIR, 'ho-so', `${slug}.json.gz`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(gunzipSync(readFileSync(p)).toString('utf8')) as HoSoNghiemChung;
  } catch (e) {
    console.error(`[nghiem-chung] hỏng hồ sơ ${slug}:`, (e as Error).message);
    return null;
  }
}

let cache: MucManifest[] | null = null;

/** Hồ sơ viết tay (luôn index) + manifest hồ sơ sinh hàng loạt. */
export function danhMuc(): MucManifest[] {
  if (cache) return cache;
  const tay: MucManifest[] = HO_SO.map((h) => ({
    slug: h.slug,
    ten: h.ten,
    ngheNghiep: h.ngheNghiep,
    namSinh: Number(h.sinh.ngay.slice(0, 4)),
    anhCommons: h.anhCommons,
    tyLeBM: dem(h.banMenh).tyLe,
    tyLeDV: dem(h.daiVan).tyLe,
    indexed: true,
  }));
  let sinh: MucManifest[] = [];
  const p = join(DIR, 'manifest.json');
  if (existsSync(p)) {
    try {
      sinh = JSON.parse(readFileSync(p, 'utf8')) as MucManifest[];
    } catch (e) {
      console.error('[nghiem-chung] hỏng manifest:', (e as Error).message);
    }
  }
  const coTay = new Set(tay.map((x) => x.slug));
  cache = [...tay, ...sinh.filter((x) => !coTay.has(x.slug))];
  return cache;
}
