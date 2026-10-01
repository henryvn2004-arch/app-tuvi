// scripts/nghiem-chung/con-lai.ts — in danh sách slug CÒN PHẢI VIẾT của một phần (shard):
// đã có gói, chưa có hồ sơ, chưa bị loại trừ. Theo thứ tự ưu tiên của pack.ts.
//   npx tsx scripts/nghiem-chung/con-lai.ts --shard 2/6 [--limit 150] [--json]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { danhSach } from './pack';

const argv = process.argv.slice(2);
const opt = (k: string) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const ROOT = process.cwd();
const [k, n] = (opt('shard') || '0/1').split('/').map(Number);
const limit = Number(opt('limit') || 1e9);
const all = danhSach().filter((_, i) => i % n === k);
const cho = all.filter(
  (c) =>
    existsSync(join(ROOT, 'work', 'nghiem-chung', 'pack', `${c.slug}.json`)) &&
    !existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${c.slug}.json.gz`)) &&
    !existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${c.slug}.txt`)),
);
const xong = all.filter(
  (c) =>
    existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${c.slug}.json.gz`)) ||
    existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${c.slug}.txt`)),
).length;
const out = cho.slice(0, limit).map((c) => c.slug);
if (argv.includes('--json')) console.log(JSON.stringify(out));
else {
  console.error(`phần ${k}/${n}: ${all.length} người · xong ${xong} · có gói chờ viết ${cho.length}`);
  console.log(out.join('\n'));
}
