#!/usr/bin/env node
/**
 * npm run check:i18n — bộ dò đa ngôn ngữ (chạy trong lint CI).
 *
 * 1. Mọi khoá `data-i18n` / `data-i18n-attr` trong public/*.html VÀ mọi `T('js.…')`
 *    trong public/*.js phải có trong i18n/vi.json (thiếu = trang dịch thiếu IM LẶNG).
 * 2. i18n/pages.json + availability.json phải đúng với HTML và từ điển hiện tại (file SINH:
 *    chạy npm run i18n:pages). Cũ = hreflang/sitemap/proxy nói dối.
 * 3. i18n/zh-cn.json phải ĐÚNG bằng OpenCC(zh-tw.json) — không ai sửa tay zh-cn.
 * 4. MÔ PHỎNG chính thứ server trả ra (lib/i18n/render.mjs) cho từng trang × ngôn ngữ:
 *    trang khai là "đã dịch" thì không còn khoá thiếu, có <html lang>, canonical tự trỏ,
 *    hreflang ĐÚNG tập ngôn ngữ đã có + x-default; trang CHƯA dịch thì noindex và KHÔNG
 *    có hreflang/canonical (không phục vụ chữ Việt dưới /ja cho crawler).
 * 5. HTML tĩnh KHÔNG được tự khai hreflang cho bản chưa có (sẽ trôi khỏi sự thật).
 * 6. Hằng số trùng lặp (i18n.js, links.mjs) khớp lib/i18n/locales.ts — hợp đồng một nguồn;
 *    `?v=` của /i18n.js đồng nhất ở render.mjs/nav.js/shell.js; matcher của proxy phủ mọi trang.
 * 7. Mỗi bản dịch đã lưu: thẻ HTML + {token} khớp câu gốc (phòng ai sửa tay file JSON).
 *
 * "Bộ dò kêu oan là bộ dò bị tắt" — mọi lỗi dưới đây đều chỉ ra file/khoá cụ thể.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PUBLIC, buildPages } from './_common.mjs';
import { collectKeys, validateTranslation } from '../../lib/i18n/core.mjs';
import { renderLocalized, ASSET_V } from '../../lib/i18n/render.mjs';
import { HREFLANG as LINK_HREFLANG, urlFor } from '../../lib/i18n/links.mjs';
import {
  loadVi,
  loadAllDicts,
  loadLocale,
  loadPages,
  loadAvailability,
  computeAvailability,
  TRANSLATED,
} from '../../lib/i18n/dict.mjs';
import { buildZhCn } from './zhcn.mjs';
import { SELF_MANAGED_PREFIXES, isSelfManaged } from '../../lib/i18n/self-managed.mjs';

const errors = [];
const fail = (m) => errors.push(m);
const vi = loadVi();
const dicts = loadAllDicts();

// ── 1. khoá phải có trong vi.json ───────────────────────────────────────────
const htmlFiles = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html'));
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const k of collectKeys(html))
    if (!(k in vi)) fail(`public/${f}: khoá "${k}" không có trong i18n/vi.json`);
}
const jsFiles = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.js'));
let jsRefs = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const m of src.matchAll(/\bT\(\s*'(js\.[\w.-]+)'/g)) {
    jsRefs++;
    if (!(m[1] in vi)) fail(`public/${f}: T('${m[1]}') — khoá không có trong i18n/vi.json`);
  }
}
for (const [k, v] of Object.entries(vi))
  if (typeof v !== 'string' || !v.trim()) fail(`vi.json: khoá "${k}" rỗng`);

// ── 2. pages.json / availability.json không cũ ──────────────────────────────
const pages = await buildPages();
// Route tự quản SEO (lib/i18n/self-managed.mjs) không được đăng ký chồng vào pages.json/availability.
for (const u of Object.keys(pages))
  if (isSelfManaged(u))
    fail(
      `${u}: nằm dưới prefix tự quản (${SELF_MANAGED_PREFIXES.join(', ')}) — không đăng ký trong pages.json`
    );
const strip = (o) => JSON.stringify(o);
if (strip(pages) !== strip(loadPages()))
  fail('i18n/pages.json cũ so với HTML trong public/ — chạy: npm run i18n:pages');
const avail = computeAvailability(pages, vi, dicts);
if (strip(avail) !== strip(loadAvailability()))
  fail('i18n/availability.json cũ so với từ điển — chạy: npm run i18n:pages');

// ── 3. zh-cn = OpenCC(zh-tw) ────────────────────────────────────────────────
if (strip(buildZhCn()) !== strip(loadLocale('zh-cn')))
  fail(
    'i18n/zh-cn.json không khớp OpenCC(zh-tw.json) — chạy: npm run i18n:zhcn (zh-cn KHÔNG sửa tay)'
  );

// ── 7. bản dịch khớp cấu trúc câu gốc ───────────────────────────────────────
for (const l of TRANSLATED) {
  for (const [k, e] of Object.entries(dicts[l])) {
    if (!(k in vi)) continue; // mồ côi: bỏ qua (khoá gốc đã gỡ), không phải lỗi
    const err = validateTranslation(vi[k], e.t, l, { same: true });
    if (err) fail(`${l}.json: "${k}" — ${err}`);
  }
}

// ── 4. mô phỏng server ──────────────────────────────────────────────────────
let sims = 0;
for (const [p, page] of Object.entries(pages)) {
  const html = fs.readFileSync(path.join(PUBLIC, page.file), 'utf8');
  for (const l of TRANSLATED) {
    sims++;
    const r = renderLocalized({ html, locale: l, path: p, vi, dict: dicts[l], avail });
    const claims = (avail[p] || []).includes(l);
    if (r.complete !== claims)
      fail(
        `${p} [${l}]: availability.json nói ${claims ? 'ĐÃ' : 'CHƯA'} dịch nhưng render ${r.complete ? 'đủ' : 'thiếu ' + r.missing.slice(0, 3).join(',')}`
      );
    const hrefs = [
      ...r.html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g),
    ].map((m) => [m[1], m[2]]);
    const noindex = /<meta name="robots" content="noindex/.test(r.html);
    const lang = /<html\b[^>]*\blang="([^"]+)"/.exec(r.html)?.[1];
    if (lang !== LINK_HREFLANG[l]) fail(`${p} [${l}]: <html lang="${lang}"> ≠ ${LINK_HREFLANG[l]}`);
    if (r.complete) {
      if (noindex) fail(`${p} [${l}]: trang đã dịch đủ mà vẫn noindex`);
      const want = ['vi', ...TRANSLATED.filter((x) => (avail[p] || []).includes(x))].map((x) => [
        LINK_HREFLANG[x],
        urlFor(x, p),
      ]);
      want.push(['x-default', urlFor('vi', p)]);
      if (strip(hrefs) !== strip(want))
        fail(
          `${p} [${l}]: hreflang lệch.\n   có:  ${hrefs.map((h) => h[0]).join(' ')}\n   cần: ${want.map((h) => h[0]).join(' ')}`
        );
      if (!r.html.includes(`<link rel="canonical" href="${urlFor(l, p)}">`))
        fail(`${p} [${l}]: canonical không tự trỏ về ${urlFor(l, p)}`);
    } else {
      if (!noindex)
        fail(
          `${p} [${l}]: CHƯA dịch đủ mà thiếu noindex — crawler sẽ thấy chữ Việt dưới URL ngoại ngữ`
        );
      if (hrefs.length) fail(`${p} [${l}]: CHƯA dịch đủ mà vẫn khai hreflang`);
      if (/<link rel="canonical"/.test(r.html)) fail(`${p} [${l}]: trang noindex còn canonical`);
    }
  }
}

// ── 5. hreflang tĩnh trong public/*.html ────────────────────────────────────
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  const langs = [...html.matchAll(/<link\b[^>]*\bhreflang=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (!langs.length) continue;
  const url = Object.keys(pages).find((u) => pages[u].file === f);
  const have = new Set(['vi', 'x-default', ...(avail[url] || []).map((x) => LINK_HREFLANG[x])]);
  for (const g of langs)
    if (!have.has(g))
      fail(
        `public/${f}: khai hreflang="${g}" nhưng chưa có bản dịch đó — để server chèn hreflang (render.mjs), đừng viết tay`
      );
}

// ── 6. hằng số trùng lặp khớp hợp đồng ──────────────────────────────────────
const tsLoc = fs.readFileSync(path.join(ROOT, 'lib/i18n/locales.ts'), 'utf8');
const pick = (src, name) => {
  const m = new RegExp(`${name}[^=]*=\\s*(\\[[^\\]]*\\]|\\{[^}]*\\})`).exec(src);
  if (!m) return null;
  return new Function(`return (${m[1]})`)();
};
const jsI18n = fs.readFileSync(path.join(PUBLIC, 'i18n.js'), 'utf8');
for (const name of ['LOCALES', 'HREFLANG']) {
  const a = pick(tsLoc, name);
  const b = pick(jsI18n, name);
  if (!a || !b || strip(a) !== strip(b)) fail(`public/i18n.js: ${name} lệch lib/i18n/locales.ts`);
}
{
  const a = pick(tsLoc, 'LOCALE_LABEL');
  const b = pick(jsI18n, 'LABEL');
  if (!a || !b || strip(a) !== strip(b))
    fail('public/i18n.js: LABEL lệch LOCALE_LABEL trong lib/i18n/locales.ts');
}
{
  const a = pick(tsLoc, 'HREFLANG');
  if (strip(a) !== strip(LINK_HREFLANG))
    fail('lib/i18n/links.mjs: HREFLANG lệch lib/i18n/locales.ts');
  const L = pick(tsLoc, 'LOCALES');
  if (strip(L.filter((x) => x !== 'vi')) !== strip(TRANSLATED))
    fail('lib/i18n/dict.mjs: TRANSLATED lệch LOCALES (trừ vi)');
}
for (const [f, src] of [
  ['public/nav.js', fs.readFileSync(path.join(PUBLIC, 'nav.js'), 'utf8')],
  ['public/shell.js', fs.readFileSync(path.join(PUBLIC, 'shell.js'), 'utf8')],
]) {
  const v = /\/i18n\.js\?v=(\w+)/.exec(src)?.[1];
  if (v !== ASSET_V)
    fail(
      `${f}: /i18n.js?v=${v} ≠ ASSET_V=${ASSET_V} trong lib/i18n/render.mjs — đổi logic i18n.js thì bump CẢ BA chỗ`
    );
}
// proxy phủ mọi trang đã đăng ký
{
  const px = fs.readFileSync(path.join(ROOT, 'proxy.ts'), 'utf8');
  const m = /matcher:\s*\[\s*'([^']+)'/.exec(px);
  if (!m) fail('proxy.ts: không đọc được matcher');
  else {
    const re = new RegExp('^' + m[1].replace(/\\\\/g, '\\') + '$');
    for (const p of [...Object.keys(pages), '/ja', '/ja/app', '/ja/chinh-sach-bao-mat.html'])
      if (!re.test(p))
        fail(`proxy.ts matcher KHÔNG phủ ${p} — trang này sẽ không bao giờ được dịch`);
    for (const p of ['/_next/static/x.js', '/api/x', '/seal.webp', '/fonts/x.woff2'])
      if (re.test(p)) fail(`proxy.ts matcher phủ thừa ${p} (tốn một lượt hàm cho mỗi asset)`);
  }
}
// font CJK: script dựng phải còn
if (!fs.existsSync(path.join(ROOT, 'scripts/i18n/fonts.mjs')))
  fail('scripts/i18n/fonts.mjs mất — font CJK sẽ không được dựng');
if (
  !/i18n\/fonts\.mjs/.test(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8').match(/"prebuild":[^\n]*/)?.[0] || ''
  )
)
  fail('package.json: "prebuild" không gọi scripts/i18n/fonts.mjs — build prod sẽ thiếu font CJK');

if (errors.length) {
  console.error(`check:i18n — ${errors.length} lỗi:\n` + errors.map((e) => ' ✗ ' + e).join('\n'));
  process.exit(1);
}
const total = Object.keys(vi).length;
console.log(
  `check:i18n OK — ${total} khoá gốc · ${Object.keys(pages).length} trang · ${jsRefs} tham chiếu T() · ${sims} mô phỏng trang×ngôn ngữ · ${Object.keys(avail).length} trang có bản dịch`
);
