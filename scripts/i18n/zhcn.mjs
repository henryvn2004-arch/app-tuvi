#!/usr/bin/env node
// npm run i18n:zhcn — SINH i18n/zh-cn.json từ i18n/zh-tw.json bằng OpenCC
// (tất định, 0 token). zh-cn KHÔNG dịch riêng; `i18n:save --locale zh-tw` tự gọi lệnh này.
import './_common.mjs';
import * as OpenCC from 'opencc-js';
import { loadLocale, writeJson, sortObj } from '../../lib/i18n/dict.mjs';

const conv = OpenCC.Converter({ from: 'twp', to: 'cn' }); // twp: có đổi cụm từ (軟體→软件)

export function buildZhCn() {
  const out = {};
  for (const [k, e] of Object.entries(loadLocale('zh-tw'))) out[k] = { t: conv(e.t), h: e.h };
  return sortObj(out);
}
export function generateZhCn() {
  const o = buildZhCn();
  writeJson('zh-cn.json', o);
  return Object.keys(o).length;
}

if (import.meta.url === `file://${process.argv[1]}`)
  console.log(`zh-cn.json: ${generateZhCn()} khoá (sinh từ zh-tw)`);
