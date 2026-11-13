#!/usr/bin/env node
// npm run i18n:khung [-- --dry]
// Đồng bộ CHỮ KHUNG của route SSR `/ngay-tot` (lib/ngay-tot/khung.mjs — nguồn duy nhất) vào i18n/vi.json, khoá `ssr-ngay-tot.<khoá>`:
// thêm khoá mới, sửa câu gốc đã đổi, xoá khoá không còn trong bảng (kèm bản dịch mồ côi ở i18n/<locale>.json).
// Sau đó: `npm run i18n:next` đưa lại câu mới/đổi để dịch → `i18n:save` (zh-cn tự sinh từ zh-tw).
import { arg } from './_common.mjs';
import {
  loadVi,
  loadLocale,
  writeJson,
  sortObj,
  TRANSLATED,
  GENERATED,
} from '../../lib/i18n/dict.mjs';
import { buildZhCn } from './zhcn.mjs';
import { KHUNG } from '../../lib/ngay-tot/khung.mjs';

const PRE = 'ssr-ngay-tot.';
const vi = loadVi();
let add = 0,
  chg = 0,
  del = 0;
for (const [k, v] of Object.entries(KHUNG)) {
  if (!(PRE + k in vi)) add++;
  else if (vi[PRE + k] !== v) chg++;
  vi[PRE + k] = v;
}
for (const k of Object.keys(vi))
  if (k.startsWith(PRE) && !(k.slice(PRE.length) in KHUNG)) {
    delete vi[k];
    del++;
  }
console.log(`ssr-ngay-tot.* trong vi.json: +${add} · sửa ${chg} · xoá ${del}`);
if (!arg('dry', false)) {
  writeJson('vi.json', sortObj(vi));
  for (const l of TRANSLATED.filter((x) => !GENERATED[x])) {
    const d = loadLocale(l);
    const drop = Object.keys(d).filter((k) => k.startsWith(PRE) && !(k in vi));
    if (drop.length) {
      for (const k of drop) delete d[k];
      writeJson(`${l}.json`, sortObj(d));
    }
  }
  writeJson('zh-cn.json', sortObj(buildZhCn()));
  console.log(
    'Đã ghi. Chạy tiếp: npm run i18n:next -- --locale ja (dịch câu mới/đổi) → i18n:save → check:i18n'
  );
}
