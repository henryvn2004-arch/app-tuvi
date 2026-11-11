// scripts/i18n/_common.mjs — đồ dùng chung cho các lệnh i18n:*.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectKeys, normPath } from '../../lib/i18n/core.mjs';
import { detectJsNamespaces } from '../../lib/i18n/render.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(ROOT); // lib/i18n/dict.mjs đọc ./i18n theo cwd
export const PUBLIC = path.join(ROOT, 'public');

export function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

/** Bảng "URL → file HTML trong public/" lấy từ rewrites của next.config.mjs (nguồn duy nhất). */
export async function urlToFile() {
  const cfg = (await import(pathToFileURL(path.join(ROOT, 'next.config.mjs')).href)).default;
  const rules = await cfg.rewrites();
  const map = new Map();
  const served = new Set();
  for (const r of rules) {
    if (r.source.includes(':')) continue;
    const m = /^\/([\w.-]+\.html)(?:\?.*)?$/.exec(r.destination);
    if (!m || !fs.existsSync(path.join(PUBLIC, m[1]))) continue;
    map.set(normPath(r.source), m[1]);
    served.add(m[1]);
  }
  // Trang phục vụ thẳng theo tên file (vd /chinh-sach-bao-mat.html) — trừ file đã có URL đẹp.
  for (const f of fs.readdirSync(PUBLIC)) {
    if (f.endsWith('.html') && !served.has(f)) map.set('/' + f, f);
  }
  return map;
}

// Một file HTML phục vụ ở nhiều URL (vd app-luan-giai.html ở /app/la-so và /app/luan-giai):
// chỉ ĐĂNG KÝ MỘT URL (bản chuẩn) để hreflang/sitemap không đẻ nội dung trùng. Thêm vào đây khi gặp.
export const PREFER_URL = ['/app/luan-giai', '/app/xem-tuoi'];

/** Quét public/ → pages.json (chỉ trang có ≥1 khoá data-i18n). */
export async function buildPages() {
  const pages = {};
  const all = [...(await urlToFile())].sort((a, b) => a[0].localeCompare(b[0]));
  const byFile = new Map();
  for (const [url, file] of all) (byFile.get(file) || byFile.set(file, []).get(file)).push(url);
  const entries = all.filter(([url, file]) => {
    const urls = byFile.get(file);
    const pick = urls.find((u) => PREFER_URL.includes(u)) || urls[0];
    return url === pick;
  });
  for (const [url, file] of entries) {
    const html = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
    const keys = [...collectKeys(html)].sort();
    if (!keys.length) continue;
    pages[url] = { file, keys, js: detectJsNamespaces(html) };
  }
  return pages;
}
