// scripts/i18n/ns-refs.mjs — khoá `js.*` mà MỘT trang thực sự gọi, so với tập server NHÚNG vào trang đó.
//
// Server (lib/i18n/render.mjs) nhúng theo NAMESPACE đoán từ trang (shell.js → shell + SOFT_NS; nav.js
// đầy đủ → nav; T('js.x.…') nội tuyến → x). File JS dùng chung mà gọi khoá của namespace KHÁC (vd shell.js
// gọi js.nav.* hay js.xemtuoi.*) thì ở trang không nhúng namespace đó, chữ đứng nguyên tiếng Việt — IM
// LẶNG, vì bộ dò cũ chỉ hỏi "khoá có trong vi.json không". Dùng chung cho check:i18n và i18n:fix-ns.
import fs from 'node:fs';
import path from 'node:path';
import { detectJsNamespaces, detectSoftNamespaces } from '../../lib/i18n/render.mjs';

export const REF_RE = /\b(?:T|_tvmbT)\(\s*'(js\.[\w.-]+)'/g;
export const refsIn = (src) => [...src.matchAll(REF_RE)].map((m) => m[1]);
export const nsOf = (k) => k.split('.')[1];

/** Các file JS dùng chung mà trang nạp (thẻ <script src> + những file shell.js tự nạp). */
export function scriptsOf(html) {
  const out = new Set();
  const has = (f) => new RegExp(`<script[^>]+src=["']/${f.replace('.', '\\.')}`, 'i').test(html);
  for (const f of ['shell.js', 'tuvi-paywall.js', 'auth.js', 'tool-prices.js', 'tuvi-form.js'])
    if (has(f)) out.add(f);
  for (const f of [
    'laso-chart.js',
    'tools-shared/hook-layer.js',
    'tools-shared/ai-loading-steps.js',
    'tools-shared/cung-ngay-sinh.js',
    'tools-shared/sample-hint.js',
  ])
    if (has(f)) out.add(f);
  if (out.has('shell.js'))
    ['tuvi-paywall.js', 'auth.js', 'tool-prices.js', 'tuvi-form.js'].forEach((f) => out.add(f));
  if (detectJsNamespaces(html).includes('nav')) out.add('nav.js');
  return [...out];
}

/** [{file, key, from}] — khoá được gọi mà namespace KHÔNG được nhúng ở trang `file`. */
export function unembedded(publicDir) {
  const cache = new Map();
  const read = (f) => {
    if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(publicDir, f), 'utf8'));
    return cache.get(f);
  };
  const bad = [];
  for (const f of fs.readdirSync(publicDir).filter((x) => x.endsWith('.html'))) {
    const html = read(f);
    const ns = new Set([...detectJsNamespaces(html), 'common', ...detectSoftNamespaces(html)]);
    const srcs = [[f, html], ...scriptsOf(html).map((s) => [s, read(s)])];
    for (const [from, src] of srcs)
      for (const k of refsIn(src)) if (!ns.has(nsOf(k))) bad.push({ file: f, key: k, from });
  }
  return bad;
}
