#!/usr/bin/env node
// npm run i18n:tag -- public/trang.html --prefix home [--dry]
// RÚT chữ Việt ra khỏi một trang HTML tĩnh: gắn data-i18n / data-i18n-attr vào
// HTML và ghi câu gốc vào i18n/vi.json. Chữ Việt VẪN ở nguyên trong HTML (làm
// fallback) nên chạy lệnh này không đổi gì với bản tiếng Việt. Chạy lại được
// (bỏ qua chỗ đã gắn). Khoá = <prefix>.<vài từ đầu>; câu Y HỆT đã có thì dùng lại khoá cũ.
//
// Ba lượt: (A) phần tử "lá" chỉ chứa chữ + thẻ inline → gắn data-i18n;
// (B) đoạn chữ lẻ còn sót → bọc <span data-i18n>; (C) thuộc tính placeholder/title/
// aria-label/alt + meta description/og/twitter → data-i18n-attr.
// Luôn đọc diff trước khi commit — đây là heuristic, không phải phép màu.
import fs from 'node:fs';
import { arg } from './_common.mjs';
import { loadVi, writeJson, sortObj } from '../../lib/i18n/dict.mjs';
import { scanElements, applyEdits, getAttr, parseAttrSpec } from '../../lib/i18n/core.mjs';

const file = process.argv[2];
const prefix = arg('prefix', '');
if (!file || file.startsWith('--') || !prefix) {
  console.error('Dùng: npm run i18n:tag -- public/trang.html --prefix <tiền-tố> [--dry]');
  process.exit(2);
}
let html = fs.readFileSync(file, 'utf8');
const vi = loadVi();
// Khoá `js.*` là chữ JS (nhúng riêng) — không dùng lại cho data-i18n trong HTML.
const byText = new Map(
  Object.entries(vi)
    .filter(([k]) => !k.startsWith('js.'))
    .map(([k, v]) => [v, k])
);
const stats = { leaf: 0, wrap: 0, attr: 0, reuse: 0 };

const ATTR = `(?:"[^"]*"|'[^']*'|[^>"'])*`;
const TOKEN = new RegExp(
  `<!--[\\s\\S]*?-->|<script\\b[\\s\\S]*?<\\/script\\s*>|<style\\b[\\s\\S]*?<\\/style\\s*>|<([a-zA-Z][\\w:-]*)(${ATTR})>|<\\/([a-zA-Z][\\w:-]*)\\s*>`,
  'g'
);
const CAND = new Set(
  'h1 h2 h3 h4 h5 h6 p li a button span div label td th summary figcaption legend dt dd blockquote strong em b small option title caption cite address'.split(
    ' '
  )
);
const INLINE = new Set('b i em strong br span a small u sup sub mark code wbr abbr s'.split(' '));
const SKIP_INSIDE = new Set(['pre', 'code', 'kbd', 'textarea', 'svg', 'select', 'option_no']);
const VI_DIAC = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

const plain = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
function worthy(s) {
  const t = plain(s).replace(/\s+/g, ' ').trim();
  if (!/[A-Za-zÀ-ỹ]{2}/.test(t)) return false;
  if (/^(https?:\/\/|www\.|[\w.+-]+@[\w.-]+)/i.test(t)) return false;
  if (!VI_DIAC.test(t) && !/\s/.test(t)) return false; // một từ Latin trơn (Zalo, Menu…)
  return true;
}
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
function keyFor(text) {
  const norm = text.replace(/\s+/g, ' ').trim();
  if (byText.has(norm)) {
    stats.reuse++;
    return byText.get(norm);
  }
  let slug =
    fold(plain(norm))
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .slice(0, 6)
      .join('-')
      .slice(0, 40) || 'text';
  let key = `${prefix}.${slug}`;
  if (key in vi && vi[key] !== norm)
    key +=
      '-' +
      Math.abs([...norm].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))
        .toString(36)
        .slice(0, 4);
  vi[key] = norm;
  byText.set(norm, key);
  return key;
}
const addAttrAfterName = (m, name, attrs, extra) => `<${name} ${extra}${attrs}>`;

// ── (A) phần tử lá ─────────────────────────────────────────────────────────
{
  const edits = [];
  TOKEN.lastIndex = 0;
  let m;
  const bodyAt = Math.max(0, html.search(/<body\b/i));
  while ((m = TOKEN.exec(html))) {
    const name = m[1]?.toLowerCase();
    if (!name || !CAND.has(name)) continue;
    if (m.index < bodyAt && name !== 'title') continue;
    if (/\sdata-i18n\s*=/.test(m[2])) continue;
    if (/\/\s*$/.test(m[2])) continue;
    // tìm thẻ đóng
    const openEnd = m.index + m[0].length;
    const save = TOKEN.lastIndex;
    let depth = 1;
    let t;
    let close = -1;
    while ((t = TOKEN.exec(html))) {
      if (t[1] && t[1].toLowerCase() === name) depth++;
      else if (t[3] && t[3].toLowerCase() === name && --depth === 0) {
        close = t.index;
        break;
      }
    }
    TOKEN.lastIndex = save;
    if (close < 0) continue;
    const inner = html.slice(openEnd, close);
    // lá = mọi thẻ bên trong đều inline
    const tags = [...inner.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)].map((x) =>
      x[1].toLowerCase()
    );
    if (tags.some((x) => !INLINE.has(x) || SKIP_INSIDE.has(x))) continue;
    if (/<!--/.test(inner) || /\{\{|\$\{|<%/.test(inner)) continue;
    if (!worthy(inner)) continue;
    const key = keyFor(inner);
    stats.leaf++;
    edits.push({
      start: m.index,
      end: openEnd,
      text: addAttrAfterName(m[0], m[1], m[2], `data-i18n="${key}"`),
    });
    TOKEN.lastIndex = close; // không đi vào trong phần tử đã gắn
  }
  html = applyEdits(html, edits);
}

// ── (B) chữ lẻ còn sót → <span data-i18n> ───────────────────────────────────
{
  const tagged = scanElements(html).filter((e) => e.key && e.innerStart >= 0);
  const inTagged = (pos) => tagged.some((e) => pos >= e.innerStart && pos < e.innerEnd);
  const bodyAt = Math.max(0, html.search(/<body\b/i));
  const edits = [];
  const stack = [];
  TOKEN.lastIndex = 0;
  let last = 0;
  let m;
  const consider = (start, end) => {
    if (start < bodyAt) return;
    const seg = html.slice(start, end);
    if (!worthy(seg) || inTagged(start)) return;
    if (stack.some((n) => SKIP_INSIDE.has(n) || n === 'title' || n === 'option')) return;
    if (/\{\{|\$\{|<%|\{%/.test(seg)) return;
    const lead = seg.match(/^\s*/)[0];
    const trail = seg.match(/\s*$/)[0];
    const core = seg.slice(lead.length, seg.length - trail.length);
    stats.wrap++;
    edits.push({
      start,
      end,
      text: `${lead}<span data-i18n="${keyFor(core)}">${core}</span>${trail}`,
    });
  };
  const VOIDS = new Set([
    'br',
    'hr',
    'img',
    'input',
    'meta',
    'link',
    'source',
    'wbr',
    'area',
    'col',
  ]);
  while ((m = TOKEN.exec(html))) {
    consider(last, m.index);
    last = m.index + m[0].length;
    if (m[1]) {
      const n = m[1].toLowerCase();
      if (!VOIDS.has(n) && !/\/\s*$/.test(m[2])) stack.push(n);
    } else if (m[3]) {
      const n = m[3].toLowerCase();
      const i = stack.lastIndexOf(n);
      if (i >= 0) stack.length = i;
    }
  }
  html = applyEdits(html, edits);
}

// ── (C) thuộc tính ──────────────────────────────────────────────────────────
{
  const bodyAt = Math.max(0, html.search(/<body\b/i));
  const edits = [];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    const name = m[1]?.toLowerCase();
    if (!name) continue;
    let attrs = m[2];
    const targets = [];
    if (name === 'meta') {
      const nm = (getAttr(attrs, 'name') || getAttr(attrs, 'property') || '').toLowerCase();
      if (
        [
          'description',
          'og:title',
          'og:description',
          'twitter:title',
          'twitter:description',
        ].includes(nm)
      )
        targets.push('content');
    } else if (m.index >= bodyAt) {
      targets.push('placeholder', 'title', 'aria-label', 'alt');
    }
    const pairs = parseAttrSpec(getAttr(attrs, 'data-i18n-attr'));
    const add = [];
    for (const a of targets) {
      const v = getAttr(attrs, a);
      if (v === undefined || pairs.some((p) => p.attr === a)) continue;
      const text = v.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      if (!worthy(text) || /\{\{|\$\{/.test(text)) continue;
      add.push(`${a}:${keyFor(text)}`);
    }
    if (!add.length) continue;
    stats.attr += add.length;
    const merged = [...pairs.map((p) => `${p.attr}:${p.key}`), ...add].join(';');
    attrs = /\sdata-i18n-attr\s*=/.test(attrs)
      ? attrs.replace(/(\sdata-i18n-attr\s*=\s*)(?:"[^"]*"|'[^']*')/, `$1"${merged}"`)
      : ` data-i18n-attr="${merged}"` + attrs;
    edits.push({ start: m.index, end: m.index + m[0].length, text: `<${m[1]}${attrs}>` });
  }
  html = applyEdits(html, edits);
}

console.log(
  `${file}: gắn ${stats.leaf} phần tử lá · bọc ${stats.wrap} đoạn lẻ · ${stats.attr} thuộc tính · dùng lại ${stats.reuse} khoá cũ · vi.json ${Object.keys(vi).length} khoá`
);
if (!arg('dry', false)) {
  fs.writeFileSync(file, html);
  writeJson('vi.json', sortObj(vi));
}
