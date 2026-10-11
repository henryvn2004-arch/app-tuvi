// lib/nghiem-chung/store.ts — đọc hồ sơ Nghiệm Chứng (chỉ phía server).
//
// Ba nguồn, MỘT cửa:
//   · HO_SO (TS, viết tay) — ưu tiên.
//   · bảng nc_ho_so (Supabase) — hồ sơ do cron Vercel sinh (lib/nghiem-chung/db.ts); đọc SAU file.
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
import { dbTaiHoSo, dbDanhMuc } from './db';

const DIR = join(process.cwd(), 'data', 'nghiem-chung');

export interface MucManifest {
  slug: string;
  ten: string;
  ngheNghiep: string;
  namSinh: number;
  anhCommons?: string;
  tyLeBM: number | null;
  tyLeDV: number | null;
  /** Giờ sinh SUY ĐOÁN (giờ đoán) — thẻ hub không khoe tỷ lệ khớp. */
  gioDoan?: string;
  indexed: boolean;
}

export async function taiHoSo(slug: string): Promise<HoSoNghiemChung | null> {
  const tay = HO_SO.find((h) => h.slug === slug);
  if (tay) return tay;
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  const p = join(DIR, 'ho-so', `${slug}.json.gz`);
  if (!existsSync(p)) return dbTaiHoSo(slug);
  try {
    return JSON.parse(gunzipSync(readFileSync(p)).toString('utf8')) as HoSoNghiemChung;
  } catch (e) {
    console.error(`[nghiem-chung] hỏng hồ sơ ${slug}:`, (e as Error).message);
    return null;
  }
}

let cache: { at: number; ds: MucManifest[] } | null = null;
// Phần từ DB đổi mỗi đêm; 10 phút là đủ tươi mà không đọc DB mỗi lượt dựng trang.
const TTL_MS = 10 * 60 * 1000;

/** Hồ sơ viết tay (luôn index) + manifest hồ sơ sinh hàng loạt + hồ sơ do cron sinh (DB). */
export async function danhMuc(): Promise<MucManifest[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.ds;
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
  const coFile = new Set([...tay, ...sinh].map((x) => x.slug));
  const moi = (await dbDanhMuc()).filter((x) => !coFile.has(x.slug));
  const ds = [...tay, ...sinh.filter((x) => !tay.some((t) => t.slug === x.slug)), ...moi];
  cache = { at: Date.now(), ds };
  return ds;
}
