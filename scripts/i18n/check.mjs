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
import { renderLocalized, ASSET_V, CLIENT_V, GLOSSARY_V } from '../../lib/i18n/render.mjs';
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
import { SINGLE_LOCALE_PAGES } from '../../lib/i18n/single-locale.mjs';
import {
  SELF_MANAGED_PREFIXES,
  isSelfManaged,
  LOCALIZED_SSR,
} from '../../lib/i18n/self-managed.mjs';
import { KHUNG } from '../../lib/ngay-tot/khung.mjs';
import { VI_ONLY_PREFIXES, isViOnly } from '../../lib/i18n/vi-only.mjs';
import { REF_RE } from './ns-refs.mjs';

const errors = [];
const fail = (m) => errors.push(m);
const vi = loadVi();
const dicts = loadAllDicts();

// ── 0. tự kiểm: validateTranslation PHẢI bắt bản dịch làm rơi/sửa thuộc tính máy ──
// (bộ dò "xanh oan" nguy hơn đỏ oan — mỗi ca đột biến dưới đây phải bị từ chối).
{
  const vi0 = 'Đã mời: <strong id="refTotal" data-k="a" onclick="go(1)">—</strong>';
  const ok0 = 'Invited: <strong id="refTotal" data-k="a" onclick="go(1)">—</strong>';
  const mutants = [
    'Invited: <strong data-k="a" onclick="go(1)">—</strong>', // rơi id
    'Invited: <strong id="refTotl" data-k="a" onclick="go(1)">—</strong>', // sửa giá trị id
    'Invited: <strong id="refTotal" onclick="go(1)">—</strong>', // rơi data-*
    'Invited: <strong id="refTotal" data-k="a" onclick="go(2)">—</strong>', // sửa handler
  ];
  if (validateTranslation(vi0, ok0, 'en'))
    fail('core.mjs tagSignature: bản dịch GIỮ ĐỦ thuộc tính máy lại bị từ chối');
  if (validateTranslation('<span title="Mở">Mở</span>', '<span title="Open">Open</span>', 'en'))
    fail('core.mjs tagSignature: thuộc tính CHỮ (title) phải được dịch tự do');
  mutants.forEach((m, i) => {
    if (!validateTranslation(vi0, m, 'en'))
      fail(`core.mjs tagSignature: đột biến #${i + 1} (rơi/sửa id·data-*·on*) KHÔNG bị bắt`);
  });
}

// ── 0b. dữ liệu GỬI ĐI / KHOÁ TRA CỨU không được đi qua từ điển (W13c) ─────────
// Bản dịch là chữ HIỂN THỊ. Hàm dưới đây dựng câu truy vấn /api/search (kho tiếng Việt),
// văn bản lá số / ngữ cảnh / prompt gửi LLM, hoặc tra bảng theo tên cung của engine — bọc T()
// ở đây là ở /ja tra cứu hụt IM LẶNG (đã cắn: 12 tên cung trong QUERIES ⇒ mất sao tam phương).
// Thêm hàm dựng dữ liệu gửi server mới ⇒ ghi tên vào đây. Ca chạy thật: tests/i18n-lookup-keys.spec.ts.
const SERVER_BOUND = {
  'app-luan-giai.html': ['QUERIES', '_getTamPhuongStars'],
  'app-chu-trinh-cuoc-doi.html': ['QUERIES'],
  'app-xem-tuoi.html': ['QUERIES', 'buildPhanPrompt'],
  'app-bat-tu.html': ['buildGroupQuery', 'formatBatTuToText', 'buildPregenContextForPhan'],
  'app-van-han-nam.html': ['ragQuery'],
  // W32A: cả file dựng lá-số-TEXT gửi /api/lasotuvi + nạp trên server (lib/engine/laso.ts) — không có chỗ vẽ.
  'tuvi-laso-format.js': ['formatLaSoV2', 'buildDaiVanLines', 'formatSaoLuu', 'xuHuongCungW'],
  // phanLabels → `description` sổ tiền (labelForDesc) + khoá phần; nhãn hiển thị đi qua phanLabelsT.
  'luan-giai-core.js': ['phanLabels', 'PHAN_LABELS_BASE'],
  // facts → body POST /api/hook-narrative (prompt LLM + khoá cache); mọi trang dùng HookLayer.run (không vẽ fact) — W32A.
  'tools-shared/hook-facts.js': [
    '_daiVanFact',
    '_cungExtreme',
    'tongFactCung',
    'cachCucHiem',
    'cuongNhuocFact',
    'nguHanhThieuFact',
    'dungThanFact',
  ],
  // AUTHOR_ROSTER → authorName/authorStyle gửi /api/v1/chat; INVITE_MASTER_NAMES/TOPIC_CUNG khớp chữ người gõ
  // + so cung; TP_SINH/TP_KHAC so `===` với hành của engine (W13e: từng bọc T() ⇒ /ja sai quan hệ).
  // GUEST_MASTERS KHÔNG vào đây: `mon` là nhãn hiển thị (bọc đúng), chỉ `kw`/`cung` là dữ liệu.
  'shell.js': ['AUTHOR_ROSTER', 'INVITE_MASTER_NAMES', 'TOPIC_CUNG', 'TP_SINH', 'TP_KHAC'],
};
function bodyOf(src, name) {
  const m = new RegExp(
    `(?:function\\s+${name}\\s*\\([^)]*\\)\\s*|var\\s+${name}\\s*=\\s*)([\\[{])`
  ).exec(src);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const close = m[1] === '{' ? '}' : ']';
  let depth = 0;
  let q = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === m[1]) depth++;
    else if (c === close && --depth === 0) return src.slice(open, i + 1);
  }
  return null;
}
const T_CALL = /\b(?:T|_tvmbT)\(\s*'js\./;
for (const [f, names] of Object.entries(SERVER_BOUND)) {
  const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const n of names) {
    const b = bodyOf(src, n);
    if (b === null)
      fail(`public/${f}: không tìm thấy ${n} (đổi tên thì sửa SERVER_BOUND trong check.mjs)`);
    else if (T_CALL.test(b))
      fail(
        `public/${f}: ${n} gửi server / tra bảng mà có T()/_tvmbT() — giữ chữ Việt gốc, dịch ở chỗ HIỂN THỊ`
      );
  }
}
// `description` gửi /api/payment?action=deduct = sổ credit_transactions (một ngôn ngữ).
for (const f of fs.readdirSync(PUBLIC).filter((x) => /\.(js|html)$/.test(x))) {
  fs.readFileSync(path.join(PUBLIC, f), 'utf8')
    .split('\n')
    .forEach((l, i) => {
      if (/\bdescription\s*:/.test(l) && T_CALL.test(l))
        fail(`public/${f}:${i + 1}: description (sổ giao dịch) đi qua T() — gửi chữ Việt gốc`);
    });
}

// ── 0c. khoá được gọi phải nằm trong namespace server NHÚNG vào trang đó (W13c) ──
// File JS dùng chung gọi khoá namespace khác (shell.js → js.nav.*) ⇒ ở trang không nhúng namespace
// đó chữ đứng tiếng Việt IM LẶNG. Sửa: npm run i18n:fix-ns.
{
  const { unembedded } = await import('./ns-refs.mjs');
  const seen = new Set();
  for (const { file, key, from } of unembedded(PUBLIC)) {
    if (seen.has(from + key)) continue;
    seen.add(from + key);
    fail(
      `public/${from}: gọi ${key} nhưng ${file} không nhúng namespace đó — chạy npm run i18n:fix-ns`
    );
  }
}

// ── 0d. _tvmbT/_tvmbG/_tvmbHref là hàm TOÀN CỤC của auth.js: trang dùng chúng TRƯỚC thẻ auth.js (hoặc
// không nạp auth.js) phải tự khai bản dự phòng trước lần dùng đầu — không thì ReferenceError, vỡ cả bản vi.
for (const f of fs.readdirSync(PUBLIC).filter((x) => x.endsWith('.html'))) {
  const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const fn of ['_tvmbT', '_tvmbG', '_tvmbHref']) {
    const use = src.search(new RegExp(`\\b${fn}\\(`));
    if (use < 0) continue;
    const auth = src.search(/<script[^>]+src=["']\/auth\.js/);
    const own = src.search(new RegExp(`window\\.${fn}\\s*=|function\\s+${fn}\\s*\\(`));
    const ok = (auth >= 0 && auth < use) || (own >= 0 && own < use);
    if (!ok) fail(`public/${f}: gọi ${fn}() trước khi auth.js nạp mà không tự khai bản dự phòng`);
  }
}

// ── 0d. văn mẫu THEO NƯỚC (W32A-3): public/samples/<locale>/<file> ─────────────────────────────────
// Danh sách file có bộ riêng = SAMPLE_THEO_NUOC trong tuvi-paywall.js (client chỉ đọc file có tên ở đó). Mỗi file phải có
// đủ 5 locale, cùng bộ khoá phần với bản vi (+ `_meta` ghi rõ nhân vật hư cấu), thẻ hook đúng khuôn trang đọc, không còn
// chữ Việt ngoài 3 nhãn máy, và zh-cn = bản sinh từ zh-tw (scripts/i18n/samples-zhcn.mjs).
{
  const pw = fs.readFileSync(path.join(PUBLIC, 'tuvi-paywall.js'), 'utf8');
  const mm = /const SAMPLE_THEO_NUOC = (\[[^\]]*\]);/.exec(pw);
  if (!mm)
    fail('public/tuvi-paywall.js: không thấy SAMPLE_THEO_NUOC (đổi tên thì sửa check.mjs 0d)');
  const ds = mm ? JSON.parse(mm[1].replace(/'/g, '"')) : [];
  const LOCS = ['en', 'ja', 'ko', 'zh-tw', 'zh-cn'];
  const TOPIC = [
    'ban-than',
    'hon-nhan',
    'su-nghiep',
    'tai-chinh',
    'con-cai',
    'gia-dinh',
    'nha-cua',
    'suc-khoe',
    'van-han',
    'ten-goi',
  ];
  const VI_RE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
  const { buildSampleZhCn } = await import('./samples-zhcn.mjs');
  const zhcn = buildSampleZhCn();
  for (const f of ds) {
    const vi = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'samples', f), 'utf8'));
    const want = Object.keys(vi).sort().join(',');
    for (const l of LOCS) {
      const fp = path.join(PUBLIC, 'samples', l, f);
      if (!fs.existsSync(fp)) {
        fail(`public/samples/${l}/${f}: thiếu (file nằm trong SAMPLE_THEO_NUOC)`);
        continue;
      }
      const raw = fs.readFileSync(fp, 'utf8');
      const j = JSON.parse(raw);
      const { _meta, ...phan } = j;
      if (!_meta || String(_meta).length < 20)
        fail(`public/samples/${l}/${f}: thiếu _meta ghi rõ đây là mẫu, nhân vật hư cấu`);
      if (Object.keys(phan).sort().join(',') !== want)
        fail(`public/samples/${l}/${f}: bộ khoá phần lệch bản vi (${want})`);
      for (const [k, v] of Object.entries(phan)) {
        for (const line of String(v).split('\n')) {
          if (!line.startsWith('[')) {
            if (VI_RE.test(line))
              fail(`public/samples/${l}/${f} phần ${k}: còn chữ Việt — ${line.slice(0, 50)}`);
            continue;
          }
          const h =
            /^\[(TỐT|CẢNH BÁO|TRUNG TÍNH)\|([^\]|]{1,40})\|([a-z-]+)\]\s*\*\*(.+?)\*\*/.exec(line);
          if (!h || !TOPIC.includes(h[3]))
            fail(
              `public/samples/${l}/${f} phần ${k}: dòng hook sai khuôn [NHÃN|từ khoá|chủ đề] **…** — ${line.slice(0, 50)}`
            );
          else if (VI_RE.test(line.slice(h[0].length - h[4].length - 4)))
            fail(
              `public/samples/${l}/${f} phần ${k}: còn chữ Việt sau nhãn — ${line.slice(0, 50)}`
            );
        }
      }
      if (l === 'zh-cn' && zhcn[f] !== raw)
        fail(`public/samples/zh-cn/${f}: lệch bản sinh từ zh-tw — chạy npm run i18n:samples-zhcn`);
    }
  }
  for (const l of LOCS) {
    const dir = path.join(PUBLIC, 'samples', l);
    if (fs.existsSync(dir))
      for (const f of fs.readdirSync(dir))
        if (!ds.includes(f))
          fail(
            `public/samples/${l}/${f}: không có trong SAMPLE_THEO_NUOC — client không bao giờ đọc`
          );
  }
}

// ── 1. khoá phải có trong vi.json ───────────────────────────────────────────
const htmlFiles = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html'));
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const k of collectKeys(html))
    if (!(k in vi)) fail(`public/${f}: khoá "${k}" không có trong i18n/vi.json`);
}
// .js + <script> nội tuyến trong .html (vd topup.html). `_tvmbT` = bản toàn cục của auth.js.
// W27: + module dùng chung `tools-shared/*.js` (không đệ quy: `i18n-long/` là văn dài, bộ dò riêng) và mọi kiểu gọi
// trong REF_RE (I18n.tv/_tv/_lcT…) — trước đó khoá gõ sai trong module rơi về tiếng Việt IM LẶNG.
const jsFiles = [
  ...fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.js') || f.endsWith('.html')),
  ...fs
    .readdirSync(path.join(PUBLIC, 'tools-shared'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => 'tools-shared/' + f),
];
let jsRefs = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const m of src.matchAll(REF_RE)) {
    jsRefs++;
    if (!(m[1] in vi)) fail(`public/${f}: T('${m[1]}') — khoá không có trong i18n/vi.json`);
  }
}
// window.I18n được server chèn vào trang /<locale>/ với ?v=CLIENT_V; trang tự nạp thì phải cùng số,
// không thì hai bản khác nhau chạy trên cùng trang.
for (const f of htmlFiles) {
  const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
  for (const m of src.matchAll(/src=["']\/tools-shared\/glossary\.js(?:\?v=(\w+))?/g))
    if (m[1] !== GLOSSARY_V)
      fail(
        `public/${f}: /tools-shared/glossary.js?v=${m[1]} ≠ GLOSSARY_V=${GLOSSARY_V} (lib/i18n/render.mjs)`
      );
  for (const m of src.matchAll(/\/tools-shared\/i18n\.js(?:\?v=(\w+))?/g))
    if (m[1] !== CLIENT_V)
      fail(
        `public/${f}: /tools-shared/i18n.js?v=${m[1]} ≠ CLIENT_V=${CLIENT_V} (lib/i18n/render.mjs)`
      );
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
      // JSON-LD (W27): trang đã khai dịch đủ thì dữ liệu cấu trúc cũng phải theo ngôn ngữ — chuỗi tiếng Việt còn
      // sót = FAQ/HowTo lệch chữ hiển thị. Thêm khoá `ld.<trang>.*` (câu gốc = đúng chuỗi JSON-LD) rồi dịch.
      if (r.ldMissing.length)
        fail(
          `${p} [${l}]: JSON-LD còn ${r.ldMissing.length} chuỗi tiếng Việt chưa có bản dịch, vd "${r.ldMissing[0].slice(0, 60)}"`
        );
      if (/"inLanguage":\s*"vi"/.test(r.html)) fail(`${p} [${l}]: JSON-LD còn inLanguage "vi"`);
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

// ── 8. trang CHỈ MỘT ngôn ngữ (lib/i18n/single-locale.mjs) ───────────────────
{
  const metaOf = (html) =>
    /<meta\s+name=["']tvmb-single-locale["']\s+content=["']([^"']+)["']/i.exec(html)?.[1] || null;
  const urlByFile = await (await import('./_common.mjs')).urlToFile();
  const fileOf = new Map([...urlByFile].map(([u, f]) => [f, u]));
  for (const [u, l] of Object.entries(SINGLE_LOCALE_PAGES)) {
    if (!TRANSLATED.includes(l)) fail(`single-locale: ${u} khai ngôn ngữ "${l}" không hợp lệ`);
    const f = path.join(PUBLIC, u.replace(/^\//, ''));
    if (!fs.existsSync(f)) continue; // file có thể đến từ PR khác (W11) — chưa có thì bỏ qua, có rồi sẽ bị soi
    const m = metaOf(fs.readFileSync(f, 'utf8'));
    if (m !== l)
      fail(
        `public/${path.basename(f)}: thiếu/lệch <meta name="tvmb-single-locale" content="${l}"> (đang: ${m})`
      );
    if (pages[u] || avail[u])
      fail(
        `${u}: trang một ngôn ngữ không được có data-i18n/đăng ký trong pages.json/availability.json`
      );
  }
  for (const f of htmlFiles) {
    const m = metaOf(fs.readFileSync(path.join(PUBLIC, f), 'utf8'));
    if (m && SINGLE_LOCALE_PAGES[fileOf.get(f)] !== m)
      fail(
        `public/${f}: có meta tvmb-single-locale="${m}" nhưng không (hoặc lệch) trong lib/i18n/single-locale.mjs — proxy sẽ vẫn phục vụ nó dưới mọi ngôn ngữ`
      );
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

// ── 5b. route SSR chỉ tiếng Việt (W31b, lib/i18n/vi-only.mjs) ───────────────
// (a) bản sao VI_ONLY ở tools-shared/i18n.js khớp nguồn; (b) không mục nào đè lên trang ĐÃ khai dịch
// (I18n.href sẽ đưa khách từ /ja về bản vi của một trang có bản ja); (c) mỗi mục có route thật trong app/.
{
  const src = fs.readFileSync(path.join(PUBLIC, 'tools-shared/i18n.js'), 'utf8');
  const m = /var VI_ONLY = (\[[^\]]*\])/.exec(src);
  if (!m) fail('public/tools-shared/i18n.js: không thấy `var VI_ONLY = [...]`');
  else if (strip(new Function('return ' + m[1])()) !== strip(VI_ONLY_PREFIXES))
    fail('public/tools-shared/i18n.js: VI_ONLY lệch VI_ONLY_PREFIXES (lib/i18n/vi-only.mjs)');
  for (const p of Object.keys(pages))
    if (isViOnly(p))
      fail(
        `lib/i18n/vi-only.mjs: ${p} là trang đã đăng ký dịch (pages.json) nhưng rơi vào VI_ONLY`
      );
  for (const x of VI_ONLY_PREFIXES) {
    const dir = path.join(ROOT, 'app', x.replace(/^\/|\/$/g, ''));
    if (!fs.existsSync(dir))
      fail(`lib/i18n/vi-only.mjs: ${x} không có thư mục route app/${x.replace(/^\/|\/$/g, '')}`);
    if (isSelfManaged(x.replace(/\/$/, '')))
      fail(`lib/i18n/vi-only.mjs: ${x} trùng route tự quản (self-managed.mjs)`);
  }
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
{
  const authSrc = fs.readFileSync(path.join(PUBLIC, 'auth.js'), 'utf8');
  const m = /var _TVMB_LOCALES = (\[[^\]]*\])/.exec(authSrc);
  if (!m || strip(new Function('return ' + m[1])()) !== strip(pick(tsLoc, 'LOCALES')))
    fail('public/auth.js: _TVMB_LOCALES lệch LOCALES trong lib/i18n/locales.ts');
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

// ── 9. route SSR ĐÃ DỊCH (W33b `/ngay-tot`, lib/i18n/self-managed.mjs LOCALIZED_SSR) ─────────
// Chữ khung ở lib/ngay-tot/khung.mjs (nguồn duy nhất) ↔ vi.json `ssr-ngay-tot.*` ↔ bản dịch đủ 5 ngôn ngữ (zh-cn do mục 3 soi);
// mỗi khoá phải có chỗ dùng (dịch chữ không ai vẽ là chữ chết). Văn engine của route soi ở check:i18nlong (ns `ngay-tot`).
{
  const PRE = 'ssr-ngay-tot.';
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const code = read('lib/ngay-tot/pages.ts');
  for (const [k, v] of Object.entries(KHUNG)) {
    if (vi[PRE + k] !== v)
      fail(`vi.json: "${PRE + k}" lệch lib/ngay-tot/khung.mjs — chạy: npm run i18n:khung`);
    for (const l of TRANSLATED) {
      const e = dicts[l][PRE + k];
      if (!e || typeof e.t !== 'string' || !e.t)
        fail(`${l}.json: thiếu "${PRE + k}" (chữ khung /ngay-tot) — npm run i18n:next → i18n:save`);
    }
    if (!code.includes(`'${k}'`))
      fail(
        `lib/ngay-tot/khung.mjs: khoá "${k}" không được lib/ngay-tot/pages.ts dùng — gỡ khỏi bảng`
      );
  }
  for (const k of Object.keys(vi))
    if (k.startsWith(PRE) && !(k.slice(PRE.length) in KHUNG))
      fail(`vi.json: "${k}" mồ côi — không còn trong lib/ngay-tot/khung.mjs (npm run i18n:khung)`);
  for (const [x, dir] of Object.entries(LOCALIZED_SSR)) {
    if (isSelfManaged(x)) fail(`${x}: vừa tự quản vừa LOCALIZED_SSR — chọn một`);
    if (isViOnly(x))
      fail(
        `${x}: vừa nằm trong vi-only.mjs vừa LOCALIZED_SSR — đã dịch thì gỡ khỏi danh sách giữ-vi (cả bản sao VI_ONLY ở tools-shared/i18n.js)`
      );
    if (avail[x] || Object.keys(pages).some((u) => u === x || u.startsWith(x + '/')))
      fail(`${x}: route SSR đã dịch không được đăng ký trong pages.json/availability.json`);
    if (!fs.existsSync(path.join(ROOT, 'app', dir.slice(1), '[locale]')))
      fail(`${x}: thiếu cây nội bộ app${dir}/[locale]`);
    if (!read('proxy.ts').includes('localizedSsrTarget('))
      fail(
        'proxy.ts: không gọi localizedSsrTarget — /<locale>/ngay-tot sẽ rơi về i18n-render (noindex)'
      );
  }
}

if (errors.length) {
  console.error(`check:i18n — ${errors.length} lỗi:\n` + errors.map((e) => ' ✗ ' + e).join('\n'));
  process.exit(1);
}
const total = Object.keys(vi).length;
console.log(
  `check:i18n OK — ${total} khoá gốc · ${Object.keys(pages).length} trang · ${jsRefs} tham chiếu T() · ${sims} mô phỏng trang×ngôn ngữ · ${Object.keys(avail).length} trang có bản dịch`
);
