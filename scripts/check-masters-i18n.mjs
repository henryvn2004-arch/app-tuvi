// Bộ dò tên 15 thầy bản ngữ (W19): bảng MASTERS trong public/tools-shared/i18n.js phải phủ ĐÚNG 15 id
// của AUTHOR_ROSTER (shell.js), mỗi locale có chữ; CJK không lẫn dấu Việt; en là ASCII (đã bỏ dấu).
import fs from 'node:fs';
import vm from 'node:vm';
const shell = fs.readFileSync('public/shell.js', 'utf8');
const src = fs.readFileSync('public/tools-shared/i18n.js', 'utf8');
const ids = [...shell.matchAll(/\{ id: '([a-z-]+)',\s+name: '/g)].map((m) => m[1]).sort();
let bad = 0;
const fail = (m) => {
  console.error('✗ ' + m);
  bad++;
};
if (ids.length !== 15) fail(`AUTHOR_ROSTER có ${ids.length} id, cần 15`);
const make = (lang) => {
  const win = {};
  vm.runInNewContext(src, {
    window: win,
    document: { documentElement: { getAttribute: () => lang }, getElementById: () => null },
  });
  return win.I18n;
};
const vi = make('vi');
if (
  vi.master('co-nguyet', 'Cổ Nguyệt') !== 'Cổ Nguyệt' ||
  vi.masterTitle('co-nguyet', 'Cổ Nguyệt') !== 'Thầy Cổ Nguyệt'
)
  fail('vi phải giữ nguyên tên Việt');
if (vi.master('khong-co', 'X') !== 'X') fail('id lạ phải rơi về chữ Việt');
for (const [hl, loc] of [
  ['en', 'en'],
  ['ja', 'ja'],
  ['ko', 'ko'],
  ['zh-hant-tw', 'zh-tw'],
  ['zh-hans-cn', 'zh-cn'],
]) {
  const I = make(hl);
  for (const id of ids) {
    const n = I.master(id, '§');
    if (n === '§' || !n) {
      fail(`${loc}/${id}: thiếu tên`);
      continue;
    }
    if (/[À-ỹ]/.test(n)) fail(`${loc}/${id}: còn dấu Việt "${n}"`);
    if (loc === 'en' ? !/^[A-Za-z ]+$/.test(n) : /[A-Za-z]/.test(n))
      fail(`${loc}/${id}: sai hệ chữ "${n}"`);
    if (!I.masterTitle(id, 'x').includes(n)) fail(`${loc}/${id}: danh hiệu thiếu tên`);
  }
}
if (bad) process.exit(1);
console.log(`✓ tên 15 thầy × 5 ngôn ngữ khớp AUTHOR_ROSTER (${ids.length} id)`);
