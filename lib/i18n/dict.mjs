// lib/i18n/dict.mjs — đọc từ điển + tính độ phủ. Node thuần, dùng chung cho
// route Next lẫn scripts/i18n/*.mjs.
//
// Định dạng (xem docs/i18n/QUY-UOC.md):
//   i18n/vi.json        { "khoá": "câu gốc tiếng Việt (mảnh HTML)" }        ← NGUỒN
//   i18n/<locale>.json  { "khoá": { "t": "bản dịch", "h": "hash câu gốc" } } ← bộ nhớ dịch
//   i18n/pages.json     { "/đường-dẫn": { file, keys:[…], js:['shell'] } }   ← SINH (i18n:pages)
//   i18n/availability.json { "/đường-dẫn": ["en","ja"] }                     ← SINH
// Hash lệch câu gốc hiện tại = bản dịch CŨ (stale): vẫn hiển thị (tốt hơn chữ
// Việt) nhưng `i18n:next` đưa lại để dịch lại.

import fs from 'node:fs';
import path from 'node:path';
import { hashVi } from './core.mjs';

export const TRANSLATED = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'];
/** zh-cn KHÔNG dịch riêng — sinh từ zh-tw bằng OpenCC. */
export const GENERATED = { 'zh-cn': 'zh-tw' };

const dir = () => path.join(process.cwd(), 'i18n');
const cache = new Map(); // file → { mtime, data }

export function readJson(name, fallback) {
  const f = path.join(dir(), name);
  let st;
  try {
    st = fs.statSync(f);
  } catch {
    return fallback;
  }
  const hit = cache.get(f);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  cache.set(f, { mtime: st.mtimeMs, data });
  return data;
}

export const loadVi = () => readJson('vi.json', {});
export const loadLocale = (l) => readJson(`${l}.json`, {});
export const loadPages = () => readJson('pages.json', {});
export const loadAvailability = () => readJson('availability.json', {});

/** Trạng thái một khoá ở một ngôn ngữ: 'fresh' | 'stale' | 'missing'. */
export function keyState(vi, dict, key) {
  const e = dict[key];
  if (!e || typeof e.t !== 'string' || !e.t) return 'missing';
  return e.h === hashVi(vi[key] ?? '') ? 'fresh' : 'stale';
}

/** Hàm tra cho translateHtml: có bản dịch (fresh hoặc stale) thì trả, không thì undefined. */
export function makeGetter(dict) {
  return (key) => {
    const e = dict[key];
    return e && typeof e.t === 'string' && e.t ? e.t : undefined;
  };
}

/** Khoá `js.<ns>.*` của vi.json — chữ do JS client dựng. */
export function jsKeys(vi, namespaces) {
  const out = [];
  for (const ns of namespaces) {
    const pre = `js.${ns}.`;
    for (const k of Object.keys(vi)) if (k.startsWith(pre)) out.push(k);
  }
  return out;
}

/** Tập khoá một trang cần: khoá HTML + khoá JS của các namespace nó nạp. */
export function pageKeys(page, vi) {
  return [...new Set([...(page.keys || []), ...jsKeys(vi, page.js || [])])];
}

/** Các ngôn ngữ mà MỌI khoá của trang đã có bản dịch. */
export function localesForPage(page, vi, dicts) {
  const keys = pageKeys(page, vi);
  if (!keys.length) return [];
  return TRANSLATED.filter((l) => keys.every((k) => keyState(vi, dicts[l] || {}, k) !== 'missing'));
}

export function computeAvailability(pages, vi, dicts) {
  const out = {};
  for (const p of Object.keys(pages).sort()) {
    const ls = localesForPage(pages[p], vi, dicts);
    if (ls.length) out[p] = ls;
  }
  return out;
}

export function loadAllDicts() {
  const d = {};
  for (const l of TRANSLATED) d[l] = loadLocale(l);
  return d;
}

export function writeJson(name, data) {
  const f = path.join(dir(), name);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 1) + '\n');
  cache.delete(f);
}

/** Sắp khoá để diff gọn và tránh xung đột merge khi nhiều phiên cùng lưu. */
export function sortObj(o) {
  return Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]])
  );
}
