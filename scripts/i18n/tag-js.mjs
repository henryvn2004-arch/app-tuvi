#!/usr/bin/env node
// npm run i18n:tag-js -- public/nav.js --prefix js.nav --calls ddItem:3,ddSection:1 [--t T] [--dry]
// Cùng ý với i18n:tag nhưng cho chữ do JS dựng: bọc đối số thứ N (chuỗi '…' đơn)
// của các hàm liệt kê thành T('js.<ns>.<khoá>','chữ Việt') và ghi câu gốc vào vi.json.
// Chỉ đụng chuỗi nháy đơn THUẦN (không nối, không biến); gặp dạng khác thì liệt kê để làm tay.
//
// Chế độ vùng dòng (W13): --lines 100-200,350-420 [--file public/x.html]
//   bọc MỌI chuỗi '…'/"…" có chữ Việt trong các vùng dòng đó, TRỪ ngữ cảnh dữ liệu:
//   so sánh (=== / case), khoá object, phần tử mảng/chỉ số, đối số của
//   indexOf/includes/test/match/split/replace/RegExp/getItem/track…, và chuỗi đã bọc.
//   Template literal `…` và chuỗi bị bỏ qua được LIỆT KÊ để làm tay. Đọc diff trước khi commit.
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
const lines = String(arg('lines', ''))
  .split(',')
  .filter(Boolean)
  .map((r) => r.split('-').map(Number));
if (!file || !prefix.startsWith('js.') || (!calls.length && !lines.length)) {
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
if (lines.length) tagLiterals();
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

// ── chế độ vùng dòng ─────────────────────────────────────────────────────────
function tagLiterals() {
  const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
  const DATA_CALL =
    /^(indexOf|lastIndexOf|includes|test|match|matchAll|split|replace|replaceAll|startsWith|endsWith|search|RegExp|getItem|setItem|removeItem|querySelector|querySelectorAll|getElementById|closest|event|log|warn|error|info|debug|track|zlTrack|trackConvert|foldVi)$/;
  const inRange = (ln) => lines.some(([a, b]) => ln >= a && ln <= (b || a));
  const edits = [];
  const stack = []; // { ch, call }
  let line = 1;
  let lastSig = ''; // ký tự có nghĩa cuối cùng (để phân biệt regex với phép chia)
  // File .html: chỉ quét bên trong <script> nội tuyến (không có src) — chữ HTML có dấu
  // nháy đơn sẽ làm lệch bộ tách chuỗi. Chữ HTML tĩnh thì dùng i18n:tag.
  const blocks = [];
  if (/\.html?$/i.test(file)) {
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
    let b;
    while ((b = re.exec(src)))
      if (!/\bsrc\s*=/i.test(b[1]) && !/type=["']application\/(ld\+)?json/i.test(b[1])) {
        const st = b.index + b[0].indexOf('>') + 1;
        blocks.push([st, st + b[2].length]);
      }
  }
  for (let i = 0; i < src.length; i++) {
    if (blocks.length && !blocks.some(([a, z]) => i >= a && i < z)) {
      const nx = blocks.find(([a]) => a > i);
      const to = nx ? nx[0] : src.length;
      line += (src.slice(i, to).match(/\n/g) || []).length;
      i = to - 1;
      lastSig = '';
      continue;
    }
    const c = src[i];
    if (c === '\n') {
      line++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i + 1] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      line += (src.slice(i, e).match(/\n/g) || []).length;
      i = e + 1;
      continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$|typeof$/.test(lastSig)) {
      let cls = false;
      for (i++; i < src.length && src[i] !== '\n'; i++) {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) break;
      }
      if (src[i] === '\n') i--; // không phải regex (phép chia): trả lại dấu xuống dòng cho bộ đếm dòng
      lastSig = 'r';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j++;
        j++;
      }
      const lit = src.slice(i, j + 1);
      const ln = line;
      line += (lit.match(/\n/g) || []).length;
      if (inRange(ln) && VI.test(lit)) {
        const before = src.slice(Math.max(0, i - 80), i).replace(/\s+$/, '');
        const after = src.slice(j + 1, j + 40).replace(/^\s+/, '');
        const top = stack[stack.length - 1];
        const wrapped = stack.some((s) => s.ch === '(' && (s.call === T || s.call === 'T'));
        const why = wrapped
          ? 'đã bọc'
          : c === '`'
            ? 'template'
            : /(===|!==|==|!=|\bcase)$/.test(before) || /^(===|!==|==|!=)/.test(after)
              ? 'so sánh'
              : after[0] === ':' && /[{,]$/.test(before)
                ? 'khoá object'
                : top && top.ch === '['
                  ? 'mảng/chỉ số'
                  : stack.some((s) => s.ch === '(' && DATA_CALL.test(s.call))
                    ? 'đối số dữ liệu'
                    : null;
        if (why === 'đã bọc');
        else if (why) skipped.push(`${ln} [${why}]: ${lit.slice(0, 90).replace(/\n/g, '⏎')}`);
        else {
          const text = new Function('return ' + lit)();
          edits.push({ start: i, end: j + 1, text: `${T}('${keyFor(text)}', ${lit})` });
          done++;
        }
      }
      i = j;
      lastSig = 's';
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      const call = /([\w$]+)\s*$/.exec(src.slice(Math.max(0, i - 40), i));
      stack.push({ ch: c, call: call ? call[1] : '' });
    } else if (c === ')' || c === ']' || c === '}') stack.pop();
    if (!/\s/.test(c)) {
      if (/[\w$]/.test(c)) {
        const w = /[\w$]+$/.exec(src.slice(Math.max(0, i - 20), i + 1))[0];
        lastSig = w === 'return' || w === 'typeof' ? w : 'w';
      } else lastSig = c;
    }
  }
  edits
    .sort((x, y) => y.start - x.start)
    .forEach((e) => (src = src.slice(0, e.start) + e.text + src.slice(e.end)));
}
