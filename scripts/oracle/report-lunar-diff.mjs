#!/usr/bin/env node
// scripts/oracle/report-lunar-diff.mjs
// ============================================================
// P1 ĐÃ XONG — bây giờ là bộ dò CI thật (exit non-zero khi lệch), không còn
// là công cụ đo tuỳ chọn. `_LUNAR_TABLE` (cả `public/tuvi-ansao-engine.js`
// lẫn `tuvi-engine/src/lunar/convert.ts`) được SINH bằng chính thuật toán của
// oracle "An Sao - Tử Vi Thiên Lương" (có hiệu chỉnh ΔT) cộng quy tắc múi giờ
// lịch sử VN: UTC+8 cho ngày dương < 1968-01-01, UTC+7 từ đó — VN đổi mốc này
// thật (nguồn: suckhoedoisong.vn, hanoimoi.vn; Tết Ất Sửu 1985 lệch lịch TQ
// một tháng nguyên — 21/1/1985 chứ không phải 20/2/1985). Xem
// scripts/gen-lunar-table.mjs. Bộ dò này canh bảng KHÔNG trôi khỏi oracle nữa.
//
// Cần scripts/oracle/vendor/ — nếu thiếu, tự thoát 0 kèm cảnh báo rõ (vendor
// không commit vào một số máy/CI khác — xem README ở đó); nhưng khi có mặt,
// MỌI lệch ngoài 4 "ngày rác" đã biết của oracle đều FAIL.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

let loadOracle;
try {
  ({ loadOracle } = await import('./load.mjs'));
} catch (e) {
  console.error('✗ Không nạp được scripts/oracle/load.mjs:', e.message);
  process.exit(1);
}

let O;
try {
  O = loadOracle();
} catch (e) {
  console.log('⚠ ' + e.message);
  console.log('  (bỏ qua oracle:lunar — thiếu scripts/oracle/vendor/, không gate được ở máy này)');
  process.exit(0);
}

// ── Nạp engine hiện tại (public/tuvi-ansao-engine.js) ────────
const g = globalThis;
g.window = g;
if (!g.location) {
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    href: 'https://tuviminhbao.com/',
  };
}
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const ours = new Function(
  'window',
  'globalThis',
  engineSrc + '\nreturn {solarToLunar,isLunarSupported,convertDuongToAm};'
)(g, g);

// ── Julian Day helpers (độc lập, tự viết lại — không tin bên nào) ───
function jdFromDate(d, m, y) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}
function fromJd(jd) {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return [
    e - Math.floor((153 * m + 2) / 5) + 1,
    m + 3 - 12 * Math.floor(m / 10),
    b * 100 + d - 4800 + Math.floor(m / 10),
  ];
}

// Quy tắc lịch sử VN: UTC+8 trước 1968-01-01, UTC+7 từ đó.
const VN_SWITCH_YMD = 19680101;
function tzForVN(d, m, y) {
  return y * 10000 + m * 100 + d < VN_SWITCH_YMD ? 8 : 7;
}

// 4 "ngày rác" đã biết của oracle: nó tự trả day:0 đúng vào ngày tháng âm mới
// bắt đầu — CẢ THÁNG chứa ngày rác này lệch 1 so với oracle (bảng = oracle.day+1).
// ⚠️ Đính chính (i18n W3, 2026-11): bảng VN KẾ THỪA bug này chứ không miễn
// nhiễm. Ngày rác là ngày oracle ước lượng sai chỉ số lunation và báo SANG tháng
// mới trong khi sóc thật rơi vào HÔM SAU; generator lấy ngày đó làm mùng 1 ⇒ 4
// tháng này của bảng VN mở SỚM một ngày (dựng lại theo quy tắc chuẩn — sóc
// oracle + trung khí astronomy-engine — ra 20/4/1939, 23/3/1947, 8/5/2054,
// 10/4/2062; HKO cũng mở 20/4/1939, 23/3/1947 với cùng UTC+8). Ghi ở
// docs/luat/engine-cophap.md, CHƯA sửa — đổi bảng VN là đổi lá số đang chạy.
// Liệt kê theo [năm dương, tháng dương bắt đầu ngày rác] để loại đúng phạm vi
// — không loại rộng hơn mức cần.
const KNOWN_ORACLE_DAY_BUG_MONTHS = new Set([
  '1939-3', // ngày rác 19/4/1939 → tháng 3 âm lịch 1939
  '1947-2', // ngày rác 22/3/1947 → tháng 2 nhuận âm lịch 1947
  '2054-4', // ngày rác 7/5/2054 → tháng 4 âm lịch 2054
  '2062-3', // ngày rác 9/4/2062 → tháng 3 âm lịch 2062
]);

const START = jdFromDate(1, 1, 1900);
const END = jdFromDate(31, 12, 2100);

let total = 0,
  nDay = 0,
  nMonth = 0,
  nYear = 0,
  nKnownBugSkipped = 0;
const unexpected = [];

for (let jd = START; jd <= END; jd++) {
  const [d, m, y] = fromJd(jd);
  const b = ours.solarToLunar(d, m, y);
  if (!b) continue;
  total++;
  const tz = tzForVN(d, m, y);
  const a = O.solarToLunar(d, m, y, tz);
  if (!a) continue; // không nên xảy ra trong 1900-2100

  if (a.month !== b.month || a.year !== b.year) {
    if (a.year !== b.year) nYear++;
    else nMonth++;
    if (unexpected.length < 20) {
      unexpected.push(
        `${d}/${m}/${y}: bảng=${b.day}/${b.month}/${b.year} oracle=${a.day}/${a.month}/${a.year}`
      );
    }
    continue;
  }
  if (a.day !== b.day) {
    const key = `${a.year}-${a.month}`;
    if (KNOWN_ORACLE_DAY_BUG_MONTHS.has(key) && b.day === a.day + 1) {
      nKnownBugSkipped++;
      continue;
    }
    nDay++;
    if (unexpected.length < 20) {
      unexpected.push(
        `${d}/${m}/${y}: bảng=${b.day}/${b.month}/${b.year} oracle=${a.day}/${a.month}/${a.year}`
      );
    }
  }
}

const totalUnexpected = nDay + nMonth + nYear;

console.log('=== oracle:lunar — bảng lịch âm hiện tại vs oracle (quy tắc lịch sử VN) ===\n');
console.log(`Tổng ngày dò (1900-01-01 → 2100-12-31): ${total}`);
console.log(`Đã loại (bug đếm ngày CỦA ORACLE, 4 tháng đã biết): ${nKnownBugSkipped}`);
console.log(`Lệch NGÀY (ngoài phạm vi đã biết) : ${nDay}`);
console.log(`Lệch THÁNG (xoay cả 12 cung)       : ${nMonth}`);
console.log(`Lệch NĂM (sai can chi/Cục/Lộc Tồn) : ${nYear}`);

let bad = 0;
if (totalUnexpected > 0) {
  console.error(`\n✗ oracle:lunar — ${totalUnexpected} ngày LỆCH không nằm trong phạm vi đã biết:`);
  console.error(unexpected.join('\n'));
  console.error(
    '\nBảng lịch âm đã trôi khỏi oracle — kiểm scripts/gen-lunar-table.mjs / apply-lunar-table.mjs có bị chạy lại đúng cách không.'
  );
  bad++;
} else {
  console.log(
    '\n✓ oracle:lunar [vn] — bảng lịch âm khớp 100% oracle (trừ đúng 4 tháng có bug đếm ngày của họ).'
  );
}

// ════════════════════════════════════════════════════════════════════════
// BẢNG THEO NƠI SINH (i18n W3): cn · kr · jp — quy tắc + nguồn ở scripts/lunar-lich.mjs
// ════════════════════════════════════════════════════════════════════════
// Mỗi bảng qua 4 lớp, đều VÉT CẠN 1900-01-01 → 2100-12-31:
//   A. so oracle HND (cùng quy tắc múi giờ) — chỉ được lệch ở (i) ngày rác day:0
//      (bảng xếp nó về tháng trước) và (ii) đúng danh sách PIN_HND bên dưới;
//   B. so nguồn NGOÀI: cn ↔ HKO (scripts/fixtures/lunar-ref-hko.json),
//      kr ↔ KASI (lunar-ref-kasi.json — KASI chỉ phục vụ tới 31/12/2050),
//      jp ↔ KASI từ 2/1912 (cùng kinh tuyến 135°E). 2051–2100 kr/jp KHÔNG có nguồn
//      ngoài — chỉ còn lớp A (HND) và C;
//   C. cấu trúc: kr ≡ jp từ 1912 · giai đoạn GMT+8:30 của Hàn (1954-03-21 →
//      1961-08-09) không đổi ngày âm nào · mốc đã biết (Tết 1985, Seollal 1997,
//      nhuận 2017);
//   D. đầu vào lạ: lịch không tồn tại ⇒ null, ngoài biên ⇒ null.
const { LICH_TZ, ymdOf } = await import('../lunar-lich.mjs');
const fail = (m) => {
  console.error('✗ ' + m);
  bad++;
};
const DAYS = [];
for (let jd = START; jd <= END; jd++) DAYS.push(fromJd(jd));

// Tháng mà bản chính xác (gen-lunar-table.mjs) CỐ Ý khác HND — kèm lý do, khoảng ngày [từ, tới].
const PIN_HND = {
  cn: [],
  // Đại Thử 2017 = 22/7 15:15 UT = 00:15 ngày 23/7 giờ Seoul/Tokyo ⇒ tháng 24/6–22/7
  // không có trung khí ⇒ nhuận THÁNG 5 (KASI: 24/6/2017 = 윤5월 1일). HND dùng
  // kinh độ Mặt Trời rút gọn (sai ~15 phút) nên ra nhuận tháng 6 như lịch Trung.
  // Tháng 11/1911 (mở 20/12/1911 theo UTC+8) vắt qua mốc đổi sang UTC+9 ngày
  // 1/1/1912: HND tính từng ngày bằng múi của CHÍNH ngày đó nên 1–18/1/1912 nó
  // đếm lại theo UTC+9 (lệch 1 ngày); bảng giữ mùng 1 đã định lúc mở tháng — khớp KASI.
  kr: [
    [19120101, 19120118],
    [20170624, 20170821],
  ],
  jp: [[20170624, 20170821]],
};
// Tháng cn khác HKO — lịch in thời đó tính cho Bắc Kinh 116°25′E, sóc rơi
// 00:01–00:05 giờ 120°E (xem scripts/lunar-lich.mjs). [mùng 1 theo HKO, mùng 1 tháng sau theo HKO).
const PIN_HKO = [
  [19141117, 19141217],
  [19160203, 19160304],
  [19201109, 19201209],
];
const inRange = (v, ranges) => ranges.some(([a, b]) => v >= a && v <= b);

function refLookup(rows) {
  // rows: [[ymd mùng 1, tháng, nhuận]] tăng dần → hàm (d,m,y) ⇒ {day,month,leap} | null
  const jds = rows.map(([s]) =>
    jdFromDate(s % 100, Math.floor(s / 100) % 100, Math.floor(s / 10000))
  );
  return (d, m, y) => {
    const j = jdFromDate(d, m, y);
    if (j < jds[0]) return null;
    let lo = 0,
      hi = jds.length - 1,
      i = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (jds[mid] <= j) {
        i = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (i === jds.length - 1) return null; // tháng cuối không biết độ dài
    return { day: j - jds[i] + 1, month: rows[i][1], leap: rows[i][2] };
  };
}
const loadRef = (f) => {
  const p = join(ROOT, 'scripts', 'fixtures', f);
  return refLookup(JSON.parse(readFileSync(p, 'utf-8')).rows);
};
const HKO = loadRef('lunar-ref-hko.json');
const KASI = loadRef('lunar-ref-kasi.json');

// Tháng nhuận: vanilla BỎ cờ isLeap (nợ cố ý) ⇒ suy nhuận từ chính bảng: hai
// mùng 1 liền nhau mang cùng số tháng ⇒ tháng sau là nhuận.
function leapOf(lich, d, m, y) {
  const r = ours.solarToLunar(d, m, y, lich);
  const j = jdFromDate(d, m, y) - r.day + 1; // mùng 1 tháng này
  const [pd, pm, py] = fromJd(j - 1);
  const p = ours.solarToLunar(pd, pm, py, lich);
  return p && p.month === r.month ? 1 : 0;
}

const vnDiff = {};
for (const lich of ['cn', 'kr', 'jp']) {
  let nHnd = 0,
    nPin = 0,
    nJunk = 0,
    nRef = 0,
    nRefPin = 0,
    nVn = 0,
    nVnMonth = 0;
  const ex = [];
  for (const [d, m, y] of DAYS) {
    const v = ymdOf(d, m, y);
    const b = ours.solarToLunar(d, m, y, lich);
    if (!b) {
      fail(`[${lich}] ${d}/${m}/${y} trong biên mà trả null`);
      continue;
    }
    // A. HND
    const a = O.solarToLunar(d, m, y, LICH_TZ[lich](v));
    if (a.day !== b.day || a.month !== b.month || a.year !== b.year) {
      if (a.day === 0) nJunk++;
      else if (inRange(v, PIN_HND[lich])) nPin++;
      else {
        nHnd++;
        if (ex.length < 10)
          ex.push(
            `HND ${d}/${m}/${y}: bảng=${b.day}/${b.month}/${b.year} oracle=${a.day}/${a.month}/${a.year}`
          );
      }
    }
    // B. nguồn ngoài
    // jp ↔ KASI chỉ từ tháng mở SAU mốc 1/1/1912 (tháng vắt qua mốc còn theo UTC+8 của Hàn).
    const ref =
      lich === 'cn' ? HKO(d, m, y) : lich === 'kr' || v >= 19120201 ? KASI(d, m, y) : null;
    if (ref) {
      const leap = leapOf(lich, d, m, y);
      if (ref.day !== b.day || ref.month !== b.month || ref.leap !== leap) {
        if (lich === 'cn' && inRange(v, PIN_HKO)) nRefPin++;
        else {
          nRef++;
          if (ex.length < 10)
            ex.push(
              `${lich === 'cn' ? 'HKO' : 'KASI'} ${d}/${m}/${y}: bảng=${b.day}/${b.month}${leap ? 'N' : ''} nguồn=${ref.day}/${ref.month}${ref.leap ? 'N' : ''}`
            );
        }
      }
    }
    const c = ours.solarToLunar(d, m, y);
    if (c.day !== b.day || c.month !== b.month || c.year !== b.year) {
      nVn++;
      if (c.month !== b.month || c.year !== b.year) nVnMonth++;
    }
  }
  vnDiff[lich] = [nVn, nVnMonth];
  console.log(
    `\n[${lich}] HND: lệch ngoài phạm vi ${nHnd} · ngày rác day:0 ${nJunk} · ghim PIN_HND ${nPin} | ` +
      `${lich === 'cn' ? 'HKO' : 'KASI'}: lệch ${nRef}${lich === 'cn' ? ` · ghim PIN_HKO ${nRefPin}` : ''} | ` +
      `khác lịch VN: ${nVn} ngày (${nVnMonth} ngày khác tháng/năm âm)`
  );
  if (ex.length) console.error(ex.join('\n'));
  if (nHnd) fail(`[${lich}] ${nHnd} ngày lệch oracle HND ngoài phạm vi đã ghim`);
  if (nRef) fail(`[${lich}] ${nRef} ngày lệch nguồn ngoài (${lich === 'cn' ? 'HKO' : 'KASI'})`);
  // Ghim phải CÒN ĂN: hết lệch mà ghim vẫn nằm đó là ghim chết — báo để gỡ.
  if (PIN_HND[lich].length && !nPin)
    fail(`[${lich}] PIN_HND không còn khớp ngày lệch nào — gỡ ghim`);
  if (lich === 'cn' && nRefPin !== 30 + 30 + 30)
    fail(`[cn] PIN_HKO phải ăn đúng 90 ngày, ăn ${nRefPin}`);
}

// C. cấu trúc + mốc đã biết
for (const [d, m, y] of DAYS) {
  if (ymdOf(d, m, y) < 19120201) continue; // xem chú thích PIN_HND.kr
  const k = ours.solarToLunar(d, m, y, 'kr'),
    j = ours.solarToLunar(d, m, y, 'jp');
  if (k.day !== j.day || k.month !== j.month || k.year !== j.year) {
    fail(`kr ≠ jp ngày ${d}/${m}/${y} dù cùng UTC+9 từ 2/1912`);
    break;
  }
}
let n85 = 0;
for (let jd = jdFromDate(21, 3, 1954); jd <= jdFromDate(9, 8, 1961); jd++) {
  const [d, m, y] = fromJd(jd);
  const p = O.solarToLunar(d, m, y, 8.5),
    q = O.solarToLunar(d, m, y, 9);
  if (p.day !== q.day || p.month !== q.month || p.year !== q.year) n85++;
}
if (n85)
  fail(
    `Hàn 1954-03-21→1961-08-09: GMT+8:30 đổi ${n85} ngày âm so với GMT+9 — quy tắc kr phải xét lại`
  );
const MOC = [
  // [d, m, y, lich, ngày âm, tháng âm, nhuận] — nguồn trong chú thích
  [21, 1, 1985, 'vn', 1, 1, 0], // Tết Ất Sửu ở VN (lịch UTC+7)
  [20, 2, 1985, 'cn', 1, 1, 0], // Tết Ất Sửu ở Trung (HKO)
  [20, 2, 1985, 'kr', 1, 1, 0],
  [20, 2, 1985, 'jp', 1, 1, 0],
  [7, 2, 1997, 'cn', 1, 1, 0], // Xuân Tiết 1997 (HKO)
  [8, 2, 1997, 'kr', 1, 1, 0], // Seollal 1997 (KASI) — trễ Trung một ngày
  [24, 6, 2017, 'kr', 1, 5, 1], // 윤5월 1일 (KASI)
  [24, 6, 2017, 'jp', 1, 5, 1], // 閏5月 (UTC+9)
  [23, 7, 2017, 'cn', 1, 6, 1], // 闰六月 (HKO)
  [22, 12, 2033, 'cn', 1, 11, 1], // 闰十一月 2033 (HKO — "vấn đề 2033")
];
for (const [d, m, y, lich, ld, lm, lp] of MOC) {
  const r = ours.solarToLunar(d, m, y, lich);
  const leap = lich === 'vn' ? lp : leapOf(lich, d, m, y);
  if (!r || r.day !== ld || r.month !== lm || leap !== lp)
    fail(
      `mốc ${d}/${m}/${y} [${lich}] phải là ${ld}/${lm}${lp ? 'N' : ''}, nhận ${r ? `${r.day}/${r.month}${leap ? 'N' : ''}` : 'null'}`
    );
}
// D. đầu vào lạ
for (const lich of ['xx', 'constructor', '__proto__', 'VN'])
  if (
    ours.solarToLunar(15, 6, 1990, lich) !== null ||
    ours.convertDuongToAm(15, 6, 1990, 9, lich) !== null
  )
    fail(`lịch lạ '${lich}' phải trả null, không được rơi về bảng nào`);
for (const lich of ['vn', 'cn', 'kr', 'jp']) {
  if (ours.solarToLunar(31, 12, 1899, lich) !== null) fail(`[${lich}] trước biên phải null`);
  if (ours.solarToLunar(1, 1, 2101, lich) !== null) fail(`[${lich}] sau biên phải null`);
  if (!ours.isLunarSupported(1, 1, 1900, lich) || !ours.isLunarSupported(31, 12, 2100, lich))
    fail(`[${lich}] biên 1900-01-01 → 2100-12-31 phải được hỗ trợ`);
}
// `lich` bỏ trống / 'vn' phải là ĐÚNG đường cũ.
for (const [d, m, y] of DAYS.filter((_, i) => i % 7 === 0)) {
  const a = ours.solarToLunar(d, m, y),
    b = ours.solarToLunar(d, m, y, 'vn');
  if (a.day !== b.day || a.month !== b.month || a.year !== b.year) {
    fail(`'vn' khác mặc định tại ${d}/${m}/${y}`);
    break;
  }
}

if (bad) {
  console.error(`\n✗ oracle:lunar — ${bad} lỗi.`);
  process.exit(1);
}
console.log(
  `\n✓ oracle:lunar — cn khớp HKO 1901–2100 (trừ 3 tháng 1914/1916/1920 đã ghim), kr/jp khớp ` +
    `KASI 1900–2050, kr ≡ jp từ 2/1912, GMT+8:30 Hàn không đổi ngày âm, ${MOC.length} mốc đã biết đúng.`
);
