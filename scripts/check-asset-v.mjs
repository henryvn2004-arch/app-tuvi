#!/usr/bin/env node
// npm run check:assetv — CÙNG một file tĩnh (/x.js, /x.css) được nạp với HAI `?v=` khác nhau ở hai nơi là lỗi
// cache: trang giữ số cũ dính bản JS cũ trong cache trình duyệt (luật "bump ?v= ở MỌI nơi", CLAUDE.md
// "Thứ tự deploy"). Quét mọi chuỗi `/đường-dẫn.(js|css)?v=<số>` trong public/ + app/ + lib/ (HTML tĩnh, JS dựng
// <script> lười, route SSR tự in HTML). Chỉ xét `?v=` là SỐ: `?v=${BIẾN}` do mã tự ghép (CLIENT_V…) có bộ dò riêng.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['public', 'app', 'lib'];
const EXT = /\.(html|js|mjs|ts|tsx)$/;
const SKIP = new Set(['node_modules', '.next', 'i18n-long']);
const RE = /(\/[A-Za-z0-9_./-]+\.(?:js|css))\?v=(\d+)\b/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

const seen = new Map(); // tệp → Map(v → [nơi])
let refs = 0;
for (const d of DIRS)
  for (const f of walk(path.join(ROOT, d))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(RE)) {
      refs++;
      if (!seen.has(m[1])) seen.set(m[1], new Map());
      const byV = seen.get(m[1]);
      if (!byV.has(m[2])) byV.set(m[2], []);
      byV.get(m[2]).push(path.relative(ROOT, f));
    }
  }

const bad = [...seen].filter(([, byV]) => byV.size > 1);
if (bad.length) {
  console.error(`check:assetv — ${bad.length} tệp được nạp với nhiều ?v= khác nhau:`);
  for (const [file, byV] of bad) {
    console.error(` ✗ ${file}`);
    for (const [v, where] of [...byV].sort((a, b) => b[0] - a[0]))
      console.error(
        `     ?v=${v}: ${[...new Set(where)].slice(0, 4).join(', ')}${where.length > 4 ? ` … (+${where.length - 4})` : ''}`
      );
  }
  console.error('   Sửa: đưa MỌI nơi về số LỚN nhất (và bump tiếp nếu vừa đổi nội dung file).');
  process.exit(1);
}
console.log(
  `check:assetv OK — ${seen.size} tệp tĩnh · ${refs} lần nạp có ?v= · mỗi tệp đúng một số`
);
