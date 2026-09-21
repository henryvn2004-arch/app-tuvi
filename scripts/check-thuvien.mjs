#!/usr/bin/env node
/**
 * BỘ DÒ: `bo_suu_tap` của `thu_vien_muc` ('sao-cung' | 'khai-niem' | 'nap-am')
 * là MỘT bộ giá trị lặp lại ở NHIỀU nơi (constraint DB, script seed, route
 * công khai, cron, brand-check profile) — đổi/thêm ở một chỗ mà quên chỗ khác
 * là mồ côi dữ liệu (dòng draft không route nào phục vụ) hoặc 404 im lặng
 * (route đọc `bo_suu_tap` mà DB không còn ghi giá trị đó nữa).
 *
 * Cùng họ với check-cache-shape.mjs/check-railfields.mjs: nhiều nguồn cho
 * cùng một tập hằng số, không có gì tự động giữ chúng khớp nhau ngoài bộ dò
 * này.
 */
import { readFileSync } from 'node:fs';

const BST_CANON = ['sao-cung', 'khai-niem', 'nap-am'];

function read(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function sameSet(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

let ok = true;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  ok = false;
};

// 1. Constraint trong migration khớp canon — nguồn SỰ THẬT của DB thật.
const migration = read('_patches/migration-thu-vien.sql');
if (migration) {
  const m = migration.match(/bo_suu_tap in \(([^)]+)\)/);
  const values = m ? m[1].split(',').map((s) => s.trim().replace(/'/g, '')) : [];
  if (!sameSet(values, BST_CANON)) {
    fail(
      `_patches/migration-thu-vien.sql: constraint bo_suu_tap = [${values.join(', ')}], khác canon [${BST_CANON.join(', ')}]`
    );
  }
} else {
  fail('không đọc được _patches/migration-thu-vien.sql');
}

// 2. thu_vien_muc PHẢI nằm trong PUBLISH_GATED_TABLES — thiếu là dòng draft
//    lộ thẳng qua REST công khai của Supabase (RLS chặn được, nhưng bộ lọc
//    ở tầng route là lớp phòng thủ THỨ HAI, xem check-publish-filter.mjs).
const filter = read('lib/content/publish-filter.ts');
if (filter && !/PUBLISH_GATED_TABLES\s*=\s*\[[^\]]*'thu_vien_muc'/.test(filter)) {
  fail(`lib/content/publish-filter.ts: thiếu 'thu_vien_muc' trong PUBLISH_GATED_TABLES`);
} else if (!filter) {
  fail('không đọc được lib/content/publish-filter.ts');
}

// 3. brand-check.ts phải có profile 'thu-vien', và cron phải gọi ĐÚNG profile đó.
const brandCheck = read('lib/content/brand-check.ts');
if (brandCheck && !/'thu-vien':\s*\{/.test(brandCheck)) {
  fail(`lib/content/brand-check.ts: thiếu profile 'thu-vien'`);
} else if (!brandCheck) {
  fail('không đọc được lib/content/brand-check.ts');
}

const cron = read('app/api/cron/thu-vien-build/route.ts');
if (cron && !/profile:\s*'thu-vien'/.test(cron)) {
  fail(`app/api/cron/thu-vien-build/route.ts: không gọi brandCheck với profile:'thu-vien'`);
} else if (!cron) {
  fail('không đọc được app/api/cron/thu-vien-build/route.ts');
}

// 4. gen-thu-vien-index.mjs phải còn seed đúng 2 bo_suu_tap nó phụ trách
//    (sao-cung/nap-am — 'khai-niem' do seed-khai-niem.mjs phụ trách riêng).
const genScript = read('scripts/gen-thu-vien-index.mjs');
if (genScript) {
  for (const b of ['sao-cung', 'nap-am']) {
    if (!genScript.includes(`'${b}'`)) fail(`scripts/gen-thu-vien-index.mjs: thiếu literal '${b}'`);
  }
} else {
  fail('không đọc được scripts/gen-thu-vien-index.mjs');
}

// 5. 2 route công khai (hub + trang lẻ) phải khai ĐỦ VÀ ĐÚNG canon, không
//    thiếu (route 404 cho bộ sưu tập có thật) và không thừa (route chờ dữ
//    liệu KHÔNG BAO GIỜ tồn tại vì DB chặn ở constraint).
function checkKeys(p, re, label) {
  const src = read(p);
  if (!src) {
    fail(`không đọc được ${p}`);
    return;
  }
  const keys = [...src.matchAll(re)].map((m) => m[1]);
  const uniq = [...new Set(keys)];
  if (!sameSet(uniq, BST_CANON)) {
    fail(`${p} (${label}): khai [${uniq.join(', ')}], khác canon [${BST_CANON.join(', ')}]`);
  }
}
checkKeys('app/thu-vien/[bst]/route.ts', /^\s*'([a-z-]+)':\s*\{/gm, 'BST_CONFIG');
checkKeys('app/thu-vien/[bst]/[slug]/route.ts', /^\s*'([a-z-]+)':\s*'/gm, 'BST_LABEL');

// 6. Hub /thu-vien phải trỏ đủ 3 href — thiếu là bộ sưu tập tồn tại nhưng
//    không ai tìm ra (index gián tiếp qua internal link, không chỉ sitemap).
const hub = read('app/thu-vien/route.ts');
if (hub) {
  for (const b of BST_CANON) {
    if (!hub.includes(`/thu-vien/${b}`)) fail(`app/thu-vien/route.ts: thiếu href /thu-vien/${b}`);
  }
} else {
  fail('không đọc được app/thu-vien/route.ts');
}

// 7. sitemap-trang phải nộp 3 hub + /thu-vien — trang tĩnh QUAN TRỌNG NHẤT
//    (phải index 100%) mà thiếu ở sitemap thì Google chỉ thấy qua internal
//    link, chậm hơn hẳn.
const sitemapTrang = read('app/sitemap-trang/route.ts');
if (sitemapTrang) {
  for (const b of ['/thu-vien', ...BST_CANON.map((x) => `/thu-vien/${x}`)]) {
    if (!sitemapTrang.includes(`'${b}'`)) fail(`app/sitemap-trang/route.ts: thiếu '${b}'`);
  }
} else {
  fail('không đọc được app/sitemap-trang/route.ts');
}

// 8. seed-khai-niem.mjs: slug KHÔNG được trùng (guard runtime đã có ở
//    main(), đây là bản static để CI bắt được TRƯỚC khi ai đó chạy script).
const seed = read('scripts/seed-khai-niem.mjs');
if (seed) {
  const slugs = [...seed.matchAll(/^\s*\['([a-z0-9-]+)',/gm)].map((m) => m[1]);
  if (!slugs.length)
    fail(
      'scripts/seed-khai-niem.mjs: không tách được slug nào — regex có thể đã trôi khỏi format file'
    );
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dup.length) fail(`scripts/seed-khai-niem.mjs: slug trùng: ${[...new Set(dup)].join(', ')}`);
} else {
  fail('không đọc được scripts/seed-khai-niem.mjs');
}

if (ok) {
  console.log(
    `✅ thu_vien_muc: bo_suu_tap canon [${BST_CANON.join(', ')}] khớp constraint DB · publish-filter · brand-check · cron · 2 route công khai · hub · sitemap · slug seed không trùng.`
  );
} else {
  process.exit(1);
}
