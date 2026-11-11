#!/usr/bin/env node
// npm run i18n:next -- --locale ja --n 200 [--page /app] [--stale]
// In MỘT lô khoá cần dịch dạng JSON — chỉ khoá thiếu/cũ, không đưa cả file, để
// phiên dịch tốn ít token. Thứ tự: chữ shell dùng ở mọi trang → trang ưu tiên
// (i18n/priority.json) → các trang còn lại → khoá chưa gắn trang nào.
import { arg } from './_common.mjs';
import {
  loadVi,
  loadLocale,
  loadPages,
  readJson,
  keyState,
  pageKeys,
  TRANSLATED,
  GENERATED,
} from '../../lib/i18n/dict.mjs';
import { SOFT_NS } from '../../lib/i18n/render.mjs';

const locale = arg('locale', '');
if (!TRANSLATED.includes(locale)) {
  console.error(`Cần --locale một trong: ${TRANSLATED.join(' ')}`);
  process.exit(2);
}
if (GENERATED[locale]) {
  console.error(
    `${locale} được SINH từ ${GENERATED[locale]} bằng OpenCC — dịch ${GENERATED[locale]} rồi chạy npm run i18n:zhcn.`
  );
  process.exit(2);
}
const n = Math.max(1, parseInt(arg('n', '100'), 10) || 100);
const onlyPage = arg('page', '');
const vi = loadVi();
const dict = loadLocale(locale);
const pages = loadPages();
const prio = readJson('priority.json', []);

const order = [];
const seen = new Set();
const push = (k) => {
  if (!seen.has(k) && k in vi) {
    seen.add(k);
    order.push(k);
  }
};
if (onlyPage) {
  const pg = pages[onlyPage];
  if (!pg) {
    console.error(`Không có trang ${onlyPage} trong pages.json`);
    process.exit(2);
  }
  pageKeys(pg, vi).forEach(push);
} else {
  Object.keys(vi)
    .filter((k) => k.startsWith('js.shell.'))
    .forEach(push);
  // Chữ JS đường MUA (W13): khung app, tường trả phí, đăng nhập, nhãn giá, trang nạp —
  // không chặn độ đủ của trang (SOFT_NS) nên không lọt vào pageKeys bên dưới.
  for (const ns of [...SOFT_NS, 'topup'])
    Object.keys(vi)
      .filter((k) => k.startsWith(`js.${ns}.`))
      .forEach(push);
  const rest = Object.keys(pages).filter((p) => !prio.includes(p));
  for (const p of [...prio.filter((x) => pages[x]), ...rest]) pageKeys(pages[p], vi).forEach(push);
  Object.keys(vi).forEach(push);
}
const todo = order
  .map((k) => ({ k, s: keyState(vi, dict, k) }))
  .filter((x) => x.s !== 'fresh' && (!arg('stale', false) || x.s === 'stale'));
const batch = todo.slice(0, n).map(({ k, s }) => {
  const it = { k, vi: vi[k] };
  if (s === 'stale') it.old = dict[k].t; // bản dịch cũ để sửa theo câu gốc mới
  return it;
});
const head = {
  locale,
  batch: batch.length,
  remaining: todo.length - batch.length,
  note:
    'giữ nguyên thẻ HTML và {token}; trả {"khoá":"bản dịch"} rồi: npm run i18n:save -- --locale ' +
    locale +
    ' --file <tệp>',
};
process.stdout.write(
  `{${Object.entries(head)
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(',')},"items":[\n${batch.map((b) => JSON.stringify(b)).join(',\n')}\n]}\n`
);
