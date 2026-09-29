#!/usr/bin/env node
/**
 * Canh chiều ÂM → DƯƠNG (`public/tools-shared/am-duong.js`, gọi qua
 * `lib/engine/laso.ts` `lunarToSolar`/`solarDateOf`).
 *
 * 🔴 VÌ SAO CÓ BỘ DÒ NÀY. `computeTuBinh` từng đưa ngày ÂM của người nhập âm lịch
 * trong chat thẳng vào `tinhBatTu({ngayDL,thangDL,namDL})` — engine Bát Tự cần
 * ngày DƯƠNG (tiết khí) ⇒ tứ trụ sai hoàn toàn mà vẫn trông hợp lệ.
 *
 * Kiểm 4 thứ:
 *   1. Cặp âm↔dương đã biết (Tết, ngày trong năm có tháng nhuận).
 *   2. Ngày âm không tồn tại (30 của tháng thiếu, tháng 13) → null, không bịa.
 *   3. VÉT CẠN 1900–2100: mọi ngày dương thuộc tháng THƯỜNG đi dương→âm→dương
 *      phải về đúng chỗ; ngày thuộc tháng NHUẬN phải về tháng thường cùng số
 *      (quy ước ghi ở đầu am-duong.js).
 *   3b. Cờ NHUẬN: mọi ngày tháng nhuận đi dương→âm→dương(nhuận) phải về ĐÚNG chỗ;
 *      tháng mà năm đó không nhuận thì (nhuận) phải ra null, không lặng lẽ trả
 *      tháng thường.
 *   4. `computeTuBinh` + `namAm` còn đi qua bộ đổi (đọc tĩnh — CI Node 20 không
 *      chạy thẳng được TS).
 *
 * Chạy: node scripts/check-am-duong.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const ROOT = new URL('..', import.meta.url).pathname;
const require = createRequire(import.meta.url);
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const g = globalThis;
g.window = g;
if (!g.location)
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    href: 'https://tuviminhbao.com/',
  };
const V = new Function(
  'window',
  'globalThis',
  readFileSync(join(ROOT, 'public/tuvi-ansao-engine.js'), 'utf-8') +
    '\nreturn{solarToLunar,_LUNAR_TABLE};'
)(g, g);
delete g.window; // am-duong.js phải xuất qua module.exports, không phải window
const { lunarToSolar: raw } = require(join(ROOT, 'public/tools-shared/am-duong.js'));
if (typeof raw !== 'function') {
  console.error('❌ am-duong.js không xuất lunarToSolar');
  process.exit(1);
}
const l2s = (d, m, y, nhuan) => raw(d, m, y, V.solarToLunar, nhuan);
const fmt = (o) => (o ? `${o.day}/${o.month}/${o.year}` : 'null');

// ── 1. Cặp đã biết ────────────────────────────────────────────
const KNOWN = [
  // [ngày âm, tháng âm, năm âm] → [ngày, tháng, năm dương]
  [
    [1, 1, 1990],
    [27, 1, 1990],
  ], // Tết Canh Ngọ
  [
    [1, 1, 2000],
    [5, 2, 2000],
  ], // Tết Canh Thìn
  [
    [1, 1, 2023],
    [22, 1, 2023],
  ], // Tết Quý Mão
  [
    [1, 1, 2024],
    [10, 2, 2024],
  ], // Tết Giáp Thìn
  [
    [30, 12, 2023],
    [9, 2, 2024],
  ], // Giao thừa Quý Mão (năm âm 2023 rơi sang dương 2024)
  [
    [15, 8, 2024],
    [17, 9, 2024],
  ], // Trung thu 2024
  [
    [15, 2, 2023],
    [6, 3, 2023],
  ], // 2023 nhuận tháng 2 → không cờ thì lấy tháng THƯỜNG…
  [
    [15, 2, 2023, true],
    [5, 4, 2023],
  ], // …và đúng tháng NHUẬN khi có cờ
  [
    [1, 2, 2023, true],
    [22, 3, 2023],
  ], // mùng 1 tháng 2 nhuận Quý Mão
];
for (const [[d, m, y, nhuan], [ed, em, ey]] of KNOWN) {
  const r = l2s(d, m, y, nhuan);
  if (!r || r.day !== ed || r.month !== em || r.year !== ey)
    fail(`ÂL ${d}/${m}/${y} → ${fmt(r)}, đúng phải là ${ed}/${em}/${ey}`);
}

// ── 2. Ngày âm không tồn tại ─────────────────────────────────
// Tháng 1 ÂL 2024 là tháng thiếu (10/2 → 9/3/2024, tháng 2 bắt đầu 10/3).
for (const [d, m, y, why, nhuan] of [
  [30, 1, 2024, 'tháng 1/2024 chỉ có 29 ngày'],
  [1, 13, 2024, 'không có tháng 13'],
  [0, 1, 2024, 'không có ngày 0'],
  [1, 1, 1899, 'ngoài tầm bảng'],
  [15, 3, 2023, 'Quý Mão chỉ nhuận tháng 2, không nhuận tháng 3', true],
  [15, 2, 2024, 'Giáp Thìn không có tháng nhuận', true],
]) {
  const r = l2s(d, m, y, nhuan);
  if (r)
    fail(`ÂL ${d}/${m}${nhuan ? ' nhuận' : ''}/${y} (${why}) phải trả null, đang trả ${fmt(r)}`);
}

// ── 3. Vét cạn: dương → âm → dương ───────────────────────────
const T = V._LUNAR_TABLE;
// Tháng nhuận đọc THẲNG cột isLeap của bảng — nguồn độc lập với cách am-duong.js
// đếm đoạn, nên hai bên phải khớp nhau mới qua.
const LEAP = new Set(T.filter((r) => r[2]).map((r) => `${r[3]}-${r[1]}`));
let n = 0,
  nLeap = 0,
  nKhongNhuan = 0;
for (let i = 0; i + 1 < T.length; i++) {
  const [sk, , leap] = T[i];
  const start = Date.UTC(Math.floor(sk / 10000), (Math.floor(sk / 100) % 100) - 1, sk % 100);
  const nk = T[i + 1][0];
  const next = Date.UTC(Math.floor(nk / 10000), (Math.floor(nk / 100) % 100) - 1, nk % 100);
  for (let t = start; t < next; t += 86400000) {
    const dt = new Date(t);
    const [dd, mm, yy] = [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()];
    const al = V.solarToLunar(dd, mm, yy);
    if (!al || al.year < 1900) continue; // hàng đầu bảng là tháng 12 năm 1899
    const back = l2s(al.day, al.month, al.year);
    if (!back) {
      fail(`${dd}/${mm}/${yy} → ÂL ${fmt(al)} → null`);
      continue;
    }
    n++;
    if (leap) {
      // Tháng nhuận: phải về tháng THƯỜNG cùng số, tức đúng 29–30 ngày TRƯỚC.
      // Ngoại lệ: ngày 30 mà tháng thường chỉ có 29 ngày ⇒ ngày dương duy nhất
      // khớp là chính nó.
      nLeap++;
      const lui = (t - Date.UTC(back.year, back.month - 1, back.day)) / 86400000;
      const al2 = V.solarToLunar(back.day, back.month, back.year);
      const chinhNo = lui === 0 && al.day === 30;
      if ((!chinhNo && (lui < 29 || lui > 30)) || fmt(al2) !== fmt(al))
        fail(
          `${dd}/${mm}/${yy} (tháng nhuận, ÂL ${fmt(al)}) → ${fmt(back)} — không phải tháng thường cùng số`
        );
      const backN = l2s(al.day, al.month, al.year, true);
      if (!backN || backN.day !== dd || backN.month !== mm || backN.year !== yy)
        fail(`${dd}/${mm}/${yy} (tháng nhuận, ÂL ${fmt(al)}) → có cờ nhuận ra ${fmt(backN)}`);
    } else {
      if (back.day !== dd || back.month !== mm || back.year !== yy)
        fail(`${dd}/${mm}/${yy} → ÂL ${fmt(al)} → ${fmt(back)} (không về chỗ cũ)`);
      // Năm không nhuận tháng này ⇒ hỏi "nhuận" phải ra null.
      if (!LEAP.has(`${al.year}-${al.month}`)) {
        nKhongNhuan++;
        const r = l2s(al.day, al.month, al.year, true);
        if (r)
          fail(`ÂL ${fmt(al)} nhuận: năm đó không nhuận tháng ${al.month} mà vẫn ra ${fmt(r)}`);
      }
    }
    if (bad > 20) break;
  }
  if (bad > 20) break;
}
if (n < 73000) fail(`Vét cạn chỉ chạm ${n} ngày — bảng/vòng lặp hỏng (phải ~73.000)`);
if (nLeap < 2000) fail(`Vét cạn chỉ chạm ${nLeap} ngày tháng nhuận — nhánh nhuận không được kiểm`);
if (nKhongNhuan < 60000)
  fail(`Chỉ ${nKhongNhuan} ngày được hỏi "nhuận" ở tháng không nhuận — nhánh null không được kiểm`);

// ── 4. Nơi gọi còn đi qua bộ đổi (và còn chở cờ nhuận) ───────
const tubinh = readFileSync(join(ROOT, 'lib/engine/tubinh.ts'), 'utf-8');
if (!/const dl = solarDateOf\(birth\)/.test(tubinh) || !/ngayDL: day,/.test(tubinh))
  fail(
    'lib/engine/tubinh.ts: computeTuBinh không còn đổi ngày qua solarDateOf(birth) trước tinhBatTu'
  );
const laso = readFileSync(join(ROOT, 'lib/engine/laso.ts'), 'utf-8');
const solarDateOf = laso.match(/export function solarDateOf\([\s\S]*?\n}/);
if (
  !solarDateOf ||
  !/lunarToSolar\(day, month, year, birth\.isLeapMonth === true\)/.test(solarDateOf[0])
)
  fail('lib/engine/laso.ts: solarDateOf() không còn truyền cờ isLeapMonth vào lunarToSolar');
const namAm = laso.match(/export function namAm\([\s\S]*?\n}/);
if (!namAm || !/lunarToSolar\(b\.day, b\.month, b\.year, b\.isLeapMonth === true\)/.test(namAm[0]))
  fail(
    'lib/engine/laso.ts: namAm() nhánh isLunar không còn đổi âm→dương (kèm cờ nhuận) trước lunarOf'
  );

if (bad) {
  console.error(`\ncheck-am-duong: ${bad} lỗi`);
  process.exit(1);
}
console.log(
  `✓ check-am-duong: ${KNOWN.length} cặp đã biết · vét cạn ${n} ngày (${nLeap} ngày tháng nhuận, ${nKhongNhuan} lượt hỏi nhuận sai tháng → null) · nơi gọi còn đổi âm→dương`
);
