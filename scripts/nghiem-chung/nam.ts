// scripts/nghiem-chung/nam.ts — tra bản kê vận NĂM cho agent viết hồ sơ.
//   npx tsx scripts/nghiem-chung/nam.ts <slug> <năm> [<năm>…]
// In ra JSON các câu engine kèm mã `N<năm>.*` để trỏ trong `laSoRef`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { banKeNam } from '@/lib/nghiem-chung/engine-ref';

async function main() {
  const [slug, ...years] = process.argv.slice(2);
  const pack = JSON.parse(readFileSync(join(process.cwd(), 'work', 'nghiem-chung', 'pack', `${slug}.json`), 'utf8'));
  const out = [];
  for (const y of years.map(Number)) {
    out.push(await banKeNam(pack.sinh.ngay, pack.sinh.gioEngine, pack.gioiTinh, y));
  }
  console.log(JSON.stringify(out, null, 1));
}
main();
