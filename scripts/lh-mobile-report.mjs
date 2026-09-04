#!/usr/bin/env node
/**
 * In gọn kết quả Lighthouse mobile ra STDOUT của job CI.
 *
 * 🔑 Vì sao cần script này thay vì đọc artifact: artifact `.lighthouseci/` là
 * file zip, đọc lại phải tải + giải nén ngoài CI. Log job thì đọc thẳng được.
 * Bản HTML trên temporary-public-storage là để NGƯỜI xem, không để máy đọc.
 *
 * Chỉ ĐỌC và IN. Không assert, không exit code khác 0 — đây là bước chẩn đoán,
 * không phải cổng chặn (xem đầu `lighthouserc.mobile-audit.json`).
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = '.lighthouseci';

// Các audit trực tiếp nói về trải nghiệm MOBILE. Tách theo nhóm để bản in
// đọc được bằng mắt thay vì đổ một danh sách dài.
const NHOM = {
  'Bố cục trên màn nhỏ': ['viewport', 'content-width', 'font-size', 'tap-targets', 'target-size'],
  'Nhìn / đọc được': [
    'color-contrast',
    'image-alt',
    'label',
    'link-name',
    'button-name',
    'html-has-lang',
  ],
  'Nhảy layout (CLS)': ['unsized-images', 'layout-shift-elements', 'non-composited-animations'],
  'Nặng / chậm': [
    'render-blocking-resources',
    'unused-javascript',
    'unminified-javascript',
    'legacy-javascript',
    'total-byte-weight',
    'uses-responsive-images',
    'modern-image-formats',
    'uses-text-compression',
    'server-response-time',
  ],
  'Lỗi thật lúc chạy': [
    'errors-in-console',
    'no-document-write',
    'deprecations',
    'third-party-cookies',
  ],
};

const METRICS = [
  ['first-contentful-paint', 'FCP'],
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
  ['speed-index', 'SI'],
  ['interactive', 'TTI'],
];

function pct(v) {
  return v === null || v === undefined ? ' -- ' : String(Math.round(v * 100)).padStart(3) + ' ';
}
function ten(url) {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? '/' : u.pathname;
  } catch {
    return url;
  }
}

const manifestPath = path.join(DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.log(`Không thấy ${manifestPath} — lhci chưa chạy hoặc chạy hỏng.`);
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const daiDien = manifest.filter((m) => m.isRepresentativeRun);
// Nếu không lượt nào được đánh dấu đại diện (numberOfRuns=1 vẫn có), lấy tất.
const rows = daiDien.length ? daiDien : manifest;

console.log('\n════════ ĐIỂM THEO TRANG (mobile 390×844, simulate) ════════');
console.log('Perf  A11y  BP   SEO   Trang');
for (const r of rows) {
  const s = r.summary || {};
  console.log(
    `${pct(s.performance)} ${pct(s.accessibility)} ${pct(s['best-practices'])} ${pct(s.seo)}  ${ten(r.url)}`
  );
}

console.log('\n════════ SỐ ĐO ════════');
const lhrs = new Map();
for (const r of rows) {
  let lhr;
  try {
    lhr = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  } catch (e) {
    console.log(`  (không đọc được ${r.jsonPath}: ${e.message})`);
    continue;
  }
  lhrs.set(r.url, lhr);
  const parts = METRICS.map(([id, ten]) => {
    const a = lhr.audits?.[id];
    return `${ten} ${a?.displayValue ?? '--'}`;
  });
  console.log(`${ten(r.url)}\n    ${parts.join('  ·  ')}`);
}

console.log('\n════════ AUDIT MOBILE KHÔNG ĐẠT (score < 1) ════════');
for (const [url, lhr] of lhrs) {
  const dong = [];
  for (const [nhom, ids] of Object.entries(NHOM)) {
    for (const id of ids) {
      const a = lhr.audits?.[id];
      if (!a) continue;
      // notApplicable / informative (score null, scoreDisplayMode manual|notApplicable) → bỏ
      if (a.score === null || a.score === undefined) continue;
      if (a.score >= 1) continue;
      const n = a.details?.items?.length;
      dong.push(
        `    [${nhom}] ${id} — ${a.title}` +
          (a.displayValue ? ` (${a.displayValue})` : '') +
          (n ? ` · ${n} phần tử` : '')
      );
    }
  }
  console.log(`\n${ten(url)}`);
  console.log(dong.length ? dong.join('\n') : '    (không audit mobile nào rớt)');
}

// Chi tiết đủ để đi sửa: phần tử cụ thể của các audit bố cục.
console.log('\n════════ CHI TIẾT PHẦN TỬ (bố cục màn nhỏ) ════════');
for (const [url, lhr] of lhrs) {
  for (const id of ['content-width', 'font-size', 'tap-targets', 'target-size']) {
    const a = lhr.audits?.[id];
    if (!a || a.score === null || a.score >= 1) continue;
    const items = a.details?.items ?? [];
    console.log(`\n${ten(url)} → ${id} (${a.displayValue || ''})`);
    if (a.explanation) console.log(`    ${a.explanation}`);
    for (const it of items.slice(0, 6)) {
      const sel =
        it.node?.selector ||
        it.tapTarget?.node?.selector ||
        it.source?.snippet ||
        it.selector ||
        JSON.stringify(it).slice(0, 160);
      const extra = it.fontSize ? ` fontSize=${it.fontSize}` : it.size ? ` size=${it.size}` : '';
      console.log(`    · ${String(sel).slice(0, 150)}${extra}`);
    }
    if (items.length > 6) console.log(`    … còn ${items.length - 6} phần tử`);
  }
}
console.log('');
