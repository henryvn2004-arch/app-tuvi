#!/usr/bin/env node
// npm run i18n:pages — sinh i18n/pages.json (trang → khoá) và i18n/availability.json
// (trang → ngôn ngữ ĐÃ dịch đủ). Hai file này SINH, đừng sửa tay; check:i18n kiểm cũ.
import { buildPages } from './_common.mjs';
import { loadVi, loadAllDicts, computeAvailability, writeJson } from '../../lib/i18n/dict.mjs';

export async function regen() {
  const pages = await buildPages();
  writeJson('pages.json', pages);
  const avail = computeAvailability(pages, loadVi(), loadAllDicts());
  writeJson('availability.json', avail);
  return { pages, avail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pages, avail } = await regen();
  console.log(
    `pages.json: ${Object.keys(pages).length} trang · availability.json: ${Object.keys(avail).length} trang có bản dịch`
  );
}
