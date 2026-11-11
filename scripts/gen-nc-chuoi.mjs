// scripts/gen-nc-chuoi.mjs — SINH lib/nghiem-chung/chuoi.zh-cn.generated.mjs từ bản zh-tw (OpenCC, 0 token).
//   node scripts/gen-nc-chuoi.mjs          # ghi file
//   node scripts/gen-nc-chuoi.mjs --check  # chỉ báo file đang commit có khớp zh-tw không (npm run check:ncchuoi)
// `twp` = phồn thể Đài Loan + từ vựng (資料→资料, 軟體→软件…) rồi sang giản thể đại lục. Chạy được trên Node 20+ (đọc chuoi-data.mjs thuần).
import { readFileSync, writeFileSync } from 'node:fs';
import { Converter } from 'opencc-js';
import { zhTw as CHUOI_ZH_TW } from '../lib/nghiem-chung/chuoi-data.mjs';

const OUT = new URL('../lib/nghiem-chung/chuoi.zh-cn.generated.mjs', import.meta.url);
const conv = Converter({ from: 'twp', to: 'cn' });
const out = Object.fromEntries(Object.entries(CHUOI_ZH_TW).map(([k, v]) => [k, conv(v)]));
const json = `// SINH bằng scripts/gen-nc-chuoi.mjs (OpenCC twp→cn từ zhTw trong chuoi-data.mjs) — ĐỪNG sửa tay.
export default ${JSON.stringify(out, null, 1)};
`;
if (process.argv.includes('--check')) {
  const same = readFileSync(OUT, 'utf8') === json;
  console.log(
    same
      ? 'chuoi.zh-cn.generated.mjs khớp zh-tw.'
      : 'chuoi.zh-cn.generated.mjs LỆCH zh-tw — chạy: node scripts/gen-nc-chuoi.mjs'
  );
  process.exit(same ? 0 : 1);
}
writeFileSync(OUT, json);
console.log(`Đã ghi ${Object.keys(out).length} chuỗi zh-cn.`);
