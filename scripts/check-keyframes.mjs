#!/usr/bin/env node
/**
 * check-keyframes — chặn lỗi "animation trỏ tới @keyframes KHÔNG TỒN TẠI".
 *
 * VÌ SAO CÓ BỘ DÒ NÀY (đọc trước khi nới luật):
 * Repo có ~28 bản `@keyframes spin` chép tay. Đã cân nhắc gom về một chỗ và
 * QUYẾT ĐỊNH KHÔNG GOM: 23/25 trang liên quan không nạp một file CSS ngoài nào
 * (toàn bộ style inline, trang cố ý tự chứa), nên nơi dùng chung duy nhất là
 * `nav.js` — tức JS. Gom vào đó là đổi "spinner chạy bằng CSS thuần" thành
 * "spinner phải chờ nav.js thực thi xong" (nav.js còn `defer` ở vài trang) —
 * hạ độ bền để đổi lấy vài chục dòng CSS. Keyframe xoay là giá trị TẬN CÙNG
 * (`rotate(360deg)`, không bao giờ phải sửa) nên hai bản không có gì để trôi
 * khỏi nhau. Duplication ở đây vô hại.
 *
 * Cái CÓ hại là quên khai: `animation: spin .8s linear infinite` trỏ tới một
 * keyframe không tồn tại thì trình duyệt **không báo gì cả** — spinner vẫn hiện,
 * chỉ là đứng im. Không log, không lỗi, không có gì để tìm. Bộ dò này bắt đúng
 * chuyện đó, để việc giữ bản local là an toàn thay vì là canh bạc.
 *
 * LUẬT: mỗi tên keyframe được dùng phải khai được TỚI ĐƯỢC từ chính file đó —
 * trong file, hoặc trong stylesheet/script mà file đó nạp.
 * File .js/.css/.ts thì chỉ tính CHÍNH NÓ: module export ra ngoài phải tự lo
 * CSS của mình (bài học `orbHtml()` — hàm export mà không gọi `ensureStyle()`
 * trả về một ô vuông trần, không có gì báo lỗi).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PUBLIC = join(ROOT, 'public');

// Từ khoá hợp lệ trong shorthand `animation` — KHÔNG phải tên keyframe.
const RESERVED = new Set([
  'none',
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'infinite',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  'var',
  'auto',
]);

const isNumeric = (t) => /^-?[\d.]+(m?s|%)?$/.test(t);
const isFunc = (t) => /^(cubic-bezier|steps|linear|var)\(/.test(t);

/**
 * Bỏ CHÚ THÍCH trước khi quét. Không có bước này thì một dòng tài liệu nhắc tới
 * `animation:tpw-fade` cũng bị báo đỏ — và bộ dò kêu oan vài lần là người ta
 * tắt nó đi. Chỉ cắt `//` khi nó ĐỨNG ĐẦU dòng: cắt giữa dòng sẽ nuốt luôn
 * `https://…` rồi ăn mất phần khai animation nằm sau nó trên cùng dòng.
 */
function stripComments(text) {
  // Giữ NGUYÊN số dòng (thay khối chú thích bằng đúng ngần ấy '\n') để số dòng
  // báo lỗi còn trỏ đúng chỗ trong file gốc.
  const blank = (m) => '\n'.repeat((m.match(/\n/g) || []).length);
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .split('\n')
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l))
    .join('\n');
}

/** Tên keyframe khai trong một đoạn văn bản. */
function definedIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/g)) out.add(m[1]);
  return out;
}

/** Tên keyframe được DÙNG (animation / animation-name) trong một đoạn văn bản. */
function usedIn(text) {
  const out = new Map(); // name -> dòng đầu tiên
  const lineOf = (idx) => text.slice(0, idx).split('\n').length;

  for (const m of text.matchAll(/animation-name\s*:\s*([^;}'"`]+)/g)) {
    for (const raw of m[1].split(',')) {
      const t = raw.trim();
      if (t && !RESERVED.has(t) && !isFunc(t) && !out.has(t)) out.set(t, lineOf(m.index));
    }
  }
  // shorthand: bỏ time/số/hàm/từ khoá, phần còn lại là tên
  for (const m of text.matchAll(/(?<!-)\banimation\s*:\s*([^;}'"`]+)/g)) {
    for (const part of m[1].split(',')) {
      for (const tok of part.trim().split(/\s+/)) {
        const t = tok.trim();
        if (!t || RESERVED.has(t) || isNumeric(t) || isFunc(t)) continue;
        if (!/^[A-Za-z_][\w-]*$/.test(t)) continue;
        if (!out.has(t)) out.set(t, lineOf(m.index));
        break; // token hợp lệ đầu tiên của mỗi lớp animation là TÊN
      }
    }
  }
  return out;
}

/** Các file mà một trang HTML nạp (stylesheet + script cùng origin). */
function linkedAssets(html, file) {
  const paths = [];
  const add = (href) => {
    if (!href || /^https?:|^\/\//.test(href)) return;
    const clean = href.split('?')[0].split('#')[0];
    const p = clean.startsWith('/') ? join(PUBLIC, clean) : join(dirname(file), clean);
    if (existsSync(p)) paths.push(p);
  };
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
    const h = m[0].match(/href=["']([^"']+)["']/i);
    if (h) add(h[1]);
  }
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
  return paths;
}

// Duyệt cây bằng tay: CI chạy Node 20, `fs.globSync` chỉ có từ Node 22 —
// dùng nó thì bộ dò chết ngay trong CI thay vì bắt lỗi.
function walk(dir, exts, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, exts, acc);
    else if (exts.has(extname(name))) acc.push(p);
  }
  return acc;
}

const files = [
  ...walk(PUBLIC, new Set(['.html', '.js', '.css'])),
  ...walk(join(ROOT, 'app'), new Set(['.ts', '.tsx'])),
];

const problems = [];
let checked = 0;
let usages = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const text = stripComments(raw);
  const used = usedIn(text);
  if (!used.size) continue;
  checked++;

  const reachable = definedIn(text);
  if (file.endsWith('.html')) {
    for (const asset of linkedAssets(raw, file)) {
      try {
        for (const n of definedIn(stripComments(readFileSync(asset, 'utf8')))) reachable.add(n);
      } catch {
        /* asset không đọc được → coi như không cấp gì */
      }
    }
  }

  for (const [name, line] of used) {
    usages++;
    if (!reachable.has(name)) {
      problems.push(
        `${file.slice(ROOT.length + 1)}:${line}  dùng animation "${name}" mà KHÔNG có @keyframes ${name} tới được`
      );
    }
  }
}

if (problems.length) {
  console.error('❌ check-keyframes: animation trỏ tới keyframe không tồn tại\n');
  for (const p of problems) console.error('   ' + p);
  console.error(`\n   ${problems.length} chỗ hỏng. Trình duyệt KHÔNG báo lỗi loại này —`);
  console.error('   phần tử vẫn hiện, chỉ là đứng im. Khai @keyframes ngay trong file đó.');
  process.exit(1);
}

console.log(
  `✅ check-keyframes: ${usages} lượt dùng animation trên ${checked} file, keyframe đều khai được tới nơi.`
);
