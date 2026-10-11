// scripts/nghiem-chung/pack.ts
// ============================================================
// Bước 1 của pipeline Nghiệm Chứng — KHÔNG gọi LLM.
// Với mỗi người có giờ sinh: chọn bài Wikipedia dài nhất (tiếng Anh hoặc
// tiếng bản xứ, qua sitelinks Wikidata), chạy engine (bản kê lá số + giờ
// cạnh bên nếu sát ranh giới canh giờ), ghi gói `work/nghiem-chung/pack/<slug>.json`.
//
//   npx tsx scripts/nghiem-chung/pack.ts --qids Q1,Q2      # vài người
//   npx tsx scripts/nghiem-chung/pack.ts --from 0 --to 500 # theo thứ tự ưu tiên
//
// Đầu vào: data/nghiem-chung/celebs.jsonl (xuất từ celeb_births, chỉ cột công khai).
//   --shard k/n : chỉ đóng gói phần k (0-based) của n — chia theo thứ tự ưu tiên, xen kẽ.
// Gói đã có thì bỏ qua (chạy lại an toàn). Wikimedia: UA đàng hoàng, ≤4 luồng,
// lùi lại khi 429 — đã bị chặn một lần khi gọi trần.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { danhSach, sitelinks, dongGoi, type Celeb } from '@/lib/nghiem-chung/sinh/goi';

// Giữ đường import cũ của các script khác (gemini.ts, con-lai.ts, brief.ts, doan-gio.ts…).
export { slugify, bacQuocGia, danhSach, banXu, sitelinks, extract, gon, gioCanh, type Celeb } from '@/lib/nghiem-chung/sinh/goi';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const PACK = join(WORK, 'pack');
mkdirSync(PACK, { recursive: true });

const argv = process.argv.slice(2);
const opt = (k: string) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function main() {
  const all = danhSach();
  writeFileSync(join(WORK, 'queue.txt'), all.map((c) => c.slug).join('\n') + '\n');
  let pick = all;
  if (opt('qids')) {
    const set = new Set(opt('qids')!.split(','));
    pick = all.filter((c) => set.has(c.qid));
  } else if (opt('slugs')) {
    const set = new Set(opt('slugs')!.split(','));
    pick = all.filter((c) => set.has(c.slug));
  } else if (opt('shard')) {
    const [k, n] = opt('shard')!.split('/').map(Number);
    pick = all.filter((_, i) => i % n === k);
  } else {
    pick = all.slice(Number(opt('from') || 0), Number(opt('to') || all.length));
  }
  // Đã có hồ sơ hoặc đã bị loại trừ thì khỏi đóng gói lại.
  const daXong = (slug: string) =>
    existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${slug}.json.gz`)) ||
    existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${slug}.txt`));
  pick = pick.filter((c) => !daXong(c.slug));
  pick = pick.filter((c) => !existsSync(join(PACK, `${c.slug}.json`)));
  console.log(`Cần đóng gói: ${pick.length}`);
  let done = 0;
  let fail = 0;
  for (let i = 0; i < pick.length; i += 200) {
    const chunk = pick.slice(i, i + 200);
    let sl: Record<string, Record<string, string>>;
    try {
      sl = await sitelinks(chunk.map((c) => c.qid));
    } catch (e) {
      console.error(`✗ lô ${i}: sitelinks hỏng (${(e as Error).message}) — bỏ qua, chạy lại sẽ bù`);
      fail += chunk.length;
      continue;
    }
    await pool(chunk, 4, async (c) => {
      try {
        const pack = await dongGoi(c, sl[c.qid] || {});
        writeFileSync(join(PACK, `${c.slug}.json`), JSON.stringify(pack));
        done++;
      } catch (e) {
        fail++;
        console.error(`✗ ${c.slug}: ${(e as Error).message}`);
      }
    });
    console.log(`… ${done} xong, ${fail} lỗi`);
  }
}

if (process.argv[1]?.endsWith('pack.ts')) main();
