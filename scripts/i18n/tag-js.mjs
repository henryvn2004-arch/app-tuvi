#!/usr/bin/env node
// npm run i18n:tag-js -- public/nav.js --prefix js.nav --calls ddItem:3,ddSection:1 [--t T] [--dry]
// Cùng ý với i18n:tag nhưng cho chữ do JS dựng: bọc đối số thứ N (chuỗi '…' đơn)
// của các hàm liệt kê thành T('js.<ns>.<khoá>','chữ Việt') và ghi câu gốc vào vi.json.
// Chỉ đụng chuỗi nháy đơn THUẦN (không nối, không biến); gặp dạng khác thì liệt kê để làm tay.
import fs from 'node:fs';
import { arg } from './_common.mjs';
import { loadVi, writeJson, sortObj } from '../../lib/i18n/dict.mjs';

const file = process.argv[2];
const prefix = arg('prefix', '');
const calls = String(arg('calls', ''))
  .split(',')
  .filter(Boolean)
  .map((s) => s.split(':'));
const T = arg('t', 'T');
if (!file || !prefix.startsWith('js.') || !calls.length) {
  console.error(
    'Dùng: npm run i18n:tag-js -- public/x.js --prefix js.<ns> --calls hàm:thứTựĐốiSố[,…] [--t T]'
  );
  process.exit(2);
}
let src = fs.readFileSync(file, 'utf8');
const vi = loadVi();
// Chỉ dùng lại khoá `js.*`: server chỉ nhúng khoá js.* vào trang cho TVMB_I18N.t().
const byText = new Map(
  Object.entries(vi)
    .filter(([k]) => k.startsWith('js.'))
    .map(([k, v]) => [v, k])
);
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
function keyFor(text) {
  if (byText.has(text)) return byText.get(text);
  const slug =
    fold(text.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '))
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .slice(0, 6)
      .join('-')
      .slice(0, 40) || 'text';
  let key = `${prefix}.${slug}`;
  if (key in vi && vi[key] !== text)
    key +=
      '-' +
      Math.abs([...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))
        .toString(36)
        .slice(0, 4);
  vi[key] = text;
  byText.set(text, key);
  return key;
}
// Tách đối số cấp cao nhất của một lời gọi bắt đầu tại `open` (vị trí dấu '(').
function args(open) {
  const out = [];
  let depth = 0,
    i = open,
    start = open + 1,
    q = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (--depth === 0) {
        out.push([start, i]);
        return out;
      }
    } else if (c === ',' && depth === 1) {
      out.push([start, i]);
      start = i + 1;
    }
  }
  return null;
}
let done = 0;
const skipped = [];
for (const [name, nth] of calls) {
  const re = new RegExp(`\\b${name}\\(`, 'g');
  const edits = [];
  let m;
  while ((m = re.exec(src))) {
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 10), m.index))) continue; // định nghĩa hàm
    const a = args(m.index + m[0].length - 1);
    const seg = a && a[Number(nth) - 1];
    if (!seg) continue;
    const raw = src.slice(seg[0], seg[1]);
    const lit = /^\s*'((?:[^'\\]|\\.)*)'\s*$/.exec(raw);
    if (!lit) {
      if (/[ăâđêôơưÀ-ỹ]/.test(raw) && !raw.includes(`${T}(`))
        skipped.push(`${name}#${nth}: ${raw.trim().slice(0, 70)}`);
      continue;
    }
    const text = lit[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    if (!/[A-Za-zÀ-ỹ]{2}/.test(text)) continue;
    edits.push({ start: seg[0], end: seg[1], text: ` ${T}('${keyFor(text)}', '${lit[1]}')` });
    done++;
  }
  edits
    .sort((x, y) => y.start - x.start)
    .forEach((e) => (src = src.slice(0, e.start) + e.text + src.slice(e.end)));
}
console.log(`${file}: bọc ${done} chuỗi · vi.json ${Object.keys(vi).length} khoá`);
skipped.forEach((s) => console.log('  làm tay: ' + s));
if (!arg('dry', false)) {
  fs.writeFileSync(file, src);
  writeJson('vi.json', sortObj(vi));
}
