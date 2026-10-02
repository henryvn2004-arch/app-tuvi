// scripts/nghiem-chung/manifest.ts — dựng data/nghiem-chung/manifest.json từ
// các hồ sơ đã qua kiểm tra. Cờ `indexed` lấy từ data/nghiem-chung/indexed.txt
// (mỗi dòng một slug) — đợt mở index do người quyết, không do script.
//   npx tsx scripts/nghiem-chung/manifest.ts
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { dem, type HoSoNghiemChung } from '@/lib/nghiem-chung';

const DIR = join(process.cwd(), 'data', 'nghiem-chung');
const idxPath = join(DIR, 'indexed.txt');
const indexed = new Set(
  existsSync(idxPath)
    ? readFileSync(idxPath, 'utf8')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
);
const out = readdirSync(join(DIR, 'ho-so'))
  .filter((f) => f.endsWith('.json.gz'))
  .map((f) => {
    const h = JSON.parse(gunzipSync(readFileSync(join(DIR, 'ho-so', f))).toString('utf8')) as HoSoNghiemChung;
    return {
      slug: h.slug,
      ten: h.ten,
      ngheNghiep: h.ngheNghiep,
      namSinh: Number(h.sinh.ngay.slice(0, 4)),
      ...(h.anhCommons ? { anhCommons: h.anhCommons } : {}),
      tyLeBM: dem(h.banMenh).tyLe,
      tyLeDV: dem(h.daiVan).tyLe,
      ...(h.gioDoan ? { gioDoan: h.gioDoan.chon } : {}),
      indexed: indexed.has(h.slug),
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(out));
console.log(`manifest: ${out.length} hồ sơ, ${out.filter((x) => x.indexed).length} index`);
