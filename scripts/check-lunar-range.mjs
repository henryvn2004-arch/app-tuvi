#!/usr/bin/env node
/**
 * Canh BIÊN của bảng âm lịch — hai bản cài đặt song song phải cùng biên và
 * cùng thất bại TO TIẾNG khi ra ngoài biên đó:
 *   • `public/tuvi-ansao-engine.js`  → trả `null`
 *   • `tuvi-engine/src/lunar/convert.ts` → ném `RangeError`
 *
 * 🔴 VÌ SAO CÓ BỘ DÒ NÀY. Cả hai bản từng có:
 *       if (idx < 0) return { day:1, month:1, year:yy };
 *   Tìm nhị phân trượt khỏi ĐẦU bảng thì hàm BỊA ra mùng 1 tháng 1 — không ném
 *   lỗi, không trả null. Hệ quả đo được: MỌI ngày dương của một năm trước 1900
 *   quy về CÙNG một ngày âm.
 *       1/1/1898 → AL 1/1/1898    15/6/1898 → AL 1/1/1898    31/12/1898 → AL 1/1/1898
 *   Cả một năm gộp vào MỘT lá số sai, mà lá số vẫn "trông hợp lệ" nên không có
 *   gì báo. Đúng thứ CLAUDE.md gọi là "xanh oan nguy hơn đỏ oan".
 *
 * Bộ dò kiểm 4 thứ:
 *   1. Hai bản khai CÙNG một biên (suy từ bảng, không gõ tay → không trôi được)
 *   2. Ngoài biên: vanilla trả null · TS ném RangeError  (KHÔNG bịa dữ liệu)
 *   3. TRIỆU CHỨNG THẬT: quét 1 năm ngay trong biên, số ngày âm phân biệt phải
 *      ~365. Đây là phép bắt được con bug gốc dù ai đó đổi cách thất bại.
 *   4. `convertDuongToAm` ngoài biên trả null, không ném ra ngoài
 *
 * Bộ dò TỰ RED-TEAM: dựng lại đúng hàm cũ (bịa {1,1,yy}) rồi xác nhận phép 3
 * BẮT ĐƯỢC nó — chứng minh bộ dò có răng, không phải luôn xanh.
 *
 * Chạy: node scripts/check-lunar-range.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

// ── Nạp bản vanilla (cần mock location như mọi nơi khác trong repo) ──
const g = globalThis;
g.window = g;
if (!g.location)
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    host: 'tuviminhbao.com',
    port: '',
    href: 'https://tuviminhbao.com/',
    pathname: '/',
    search: '',
    hash: '',
  };
const vanillaSrc = readFileSync(join(ROOT, 'public/tuvi-ansao-engine.js'), 'utf-8');
const V = new Function(
  'window',
  'globalThis',
  vanillaSrc +
    '\nreturn{solarToLunar,convertDuongToAm,isLunarSupported,LUNAR_MIN_YMD,LUNAR_MAX_YMD};'
)(g, g);

// ── Biên khai trong bản TS (đọc TĨNH: khỏi cần tuvi-engine/dist đã build) ──
const tsSrc = readFileSync(join(ROOT, 'tuvi-engine/src/lunar/convert.ts'), 'utf-8');
const tsDerivesMin = /LUNAR_MIN_YMD\s*=\s*_LUNAR_TABLE\[0\]!?\[0\]/.test(tsSrc);
const tsDerivesMax = /LUNAR_MAX_YMD\s*=\s*_LUNAR_TABLE\[_LUNAR_TABLE\.length\s*-\s*1\]!?\[0\]/.test(
  tsSrc
);
const tsThrows = /throw new RangeError/.test(tsSrc);

// Biên THẬT của bảng trong file TS (khớp mốc đầu + mốc cuối của mảng)
const tsTable = tsSrc.match(/_LUNAR_TABLE[^=]*=\s*(\[\[.*?\]\])\s*(?:as\b|;)/s);
if (!tsTable) fail('Không tìm thấy _LUNAR_TABLE trong tuvi-engine/src/lunar/convert.ts');
const tsRows = tsTable ? JSON.parse(tsTable[1]) : [];

// ── 1. Hai bản CÙNG BIÊN ──────────────────────────────────────
if (!tsDerivesMin || !tsDerivesMax) {
  fail(
    'Bản TS không SUY biên từ _LUNAR_TABLE — gõ tay là sẽ trôi khỏi bảng khi bảng được sinh lại.'
  );
}
if (!tsThrows) fail('Bản TS không còn ném RangeError khi ngoài biên.');
if (tsRows.length) {
  if (V.LUNAR_MIN_YMD !== tsRows[0][0])
    fail(`Biên DƯỚI lệch: vanilla ${V.LUNAR_MIN_YMD} vs TS ${tsRows[0][0]}`);
  if (V.LUNAR_MAX_YMD !== tsRows[tsRows.length - 1][0])
    fail(`Biên TRÊN lệch: vanilla ${V.LUNAR_MAX_YMD} vs TS ${tsRows[tsRows.length - 1][0]}`);
}

// ── 2. Ngoài biên KHÔNG được bịa dữ liệu ──────────────────────
for (const [d, m, y, nhan] of [
  [1, 1, 1898, 'trước biên'],
  [15, 6, 1899, 'trước biên'],
  [30, 1, 1900, 'ngay trước mốc đầu'],
  [1, 1, 2101, 'sau biên'],
]) {
  const r = V.solarToLunar(d, m, y);
  if (r !== null)
    fail(`solarToLunar(${d}/${m}/${y}) [${nhan}] phải trả null, nhận ${JSON.stringify(r)}`);
  const c = V.convertDuongToAm(d, m, y, 9);
  if (c !== null) fail(`convertDuongToAm(${d}/${m}/${y}) [${nhan}] phải trả null, nhận object`);
  if (V.isLunarSupported(d, m, y)) fail(`isLunarSupported(${d}/${m}/${y}) phải là false`);
}

// ── 3. Trong biên phải CHẠY, và ngày âm phải PHÂN BIỆT ────────
for (const [d, m, y] of [
  [31, 1, 1900],
  [15, 3, 1990],
  [31, 12, 2100],
]) {
  if (!V.solarToLunar(d, m, y)) fail(`solarToLunar(${d}/${m}/${y}) trong biên mà trả null`);
  if (!V.isLunarSupported(d, m, y)) fail(`isLunarSupported(${d}/${m}/${y}) phải là true`);
}

/** Số ngày âm PHÂN BIỆT khi quét trọn một năm dương. */
function distinctLunarDaysIn(year, fn) {
  const seen = new Set();
  const dt = new Date(Date.UTC(year, 0, 1));
  while (dt.getUTCFullYear() === year) {
    const r = fn(dt.getUTCDate(), dt.getUTCMonth() + 1, year);
    seen.add(r ? `${r.day}/${r.month}/${r.year}` : 'null');
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return seen.size;
}

// Kỳ vọng SUY TỪ CHÍNH BẢNG, không gõ hằng số: tra 4-bộ (ngày, tháng, NHUẬN,
// năm) cho từng ngày dương rồi đếm phân biệt sau khi BỎ cờ nhuận — đó đúng là
// thứ `solarToLunar` (bản vanilla, không trả `isLeap`) phải cho ra.
const vTable = JSON.parse(vanillaSrc.match(/const _LUNAR_TABLE = (\[\[.*?\]\]);/s)[1]);
function expectedDistinct(year) {
  const seen = new Set();
  const dt = new Date(Date.UTC(year, 0, 1));
  while (dt.getUTCFullYear() === year) {
    const target = year * 10000 + (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate();
    let lo = 0,
      hi = vTable.length - 1,
      idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (vTable[mid][0] <= target) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const [sk, lm, , ly] = vTable[idx];
    const sy = Math.floor(sk / 10000),
      sm = Math.floor(sk / 100) % 100,
      sd = sk % 100;
    const jd = (y, m, d) => {
      const a = Math.floor((14 - m) / 12),
        Y = y + 4800 - a,
        M = m + 12 * a - 3;
      return (
        d +
        Math.floor((153 * M + 2) / 5) +
        365 * Y +
        Math.floor(Y / 4) -
        Math.floor(Y / 100) +
        Math.floor(Y / 400) -
        32045
      );
    };
    const day = jd(year, dt.getUTCMonth() + 1, dt.getUTCDate()) - jd(sy, sm, sd) + 1;
    seen.add(`${day}/${lm}/${ly}`); // BỎ cờ nhuận — khớp bản vanilla
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return seen.size;
}

// 1901/1950 KHÔNG có tháng nhuận · 1990/2025 CÓ — cố ý lấy cả hai loại.
for (const y of [1901, 1950, 1990, 2025]) {
  const got = distinctLunarDaysIn(y, V.solarToLunar);
  const want = expectedDistinct(y);
  if (got !== want)
    fail(
      `Năm ${y}: ${got} ngày âm phân biệt, bảng nói phải là ${want} — hàm đang GỘP hoặc TÁCH sai.`
    );
}

// ── 3b. NỢ ĐÃ BIẾT: bản vanilla BỎ cờ nhuận ───────────────────
// Ghim lại bằng phép đo, KHÔNG sửa. `solarToLunar` vanilla trả {day,month,year}
// mà không có `isLeap`, nên ngày trong THÁNG NHUẬN đụng khoá với ngày cùng số
// trong tháng thường ⇒ hai người sinh khác tháng ra CÙNG một lá số.
// Bản TS `tuvi-engine` thì CÓ trả `isLeap`.
// ⚠️ KHÔNG tự sửa: cách tính tháng nhuận trong Tử Vi là chuyện CỔ PHÁP (có
// trường phái tính nửa đầu tháng nhuận theo tháng trước). CLAUDE.md: "KHÔNG sửa
// mò một công thức cổ pháp — nghi sai thì GHI LẠI". Dòng dưới ghim hiện trạng:
// đổi cách xử lý tháng nhuận sẽ làm bộ dò đỏ và bắt người sửa phải cố ý.
const leapYears = vTable.filter((r) => r[2] === 1).map((r) => r[3]);
if (!leapYears.includes(1990))
  fail('Bảng không còn ghi 1990 là năm có tháng nhuận — bảng đã đổi, xem lại các mốc kiểm.');
{
  const withLeap = new Set(),
    withoutLeap = new Set();
  for (const [sk, lm, leap, ly] of vTable.filter((r) => r[3] === 1990)) {
    withLeap.add(`${lm}|${leap}`);
    withoutLeap.add(`${lm}`);
    void sk;
    void ly;
  }
  if (withLeap.size === withoutLeap.size)
    fail('1990 lẽ ra phải có tháng trùng SỐ nhưng khác cờ nhuận — mốc kiểm hỏng.');
  if (!tsSrc.includes('isLeap: leap===1'))
    fail('Bản TS không còn trả `isLeap` — hai bản đã lệch nhau về tháng nhuận.');
  if (/return\s*\{\s*day:\s*lunarDay,\s*month:\s*lm,\s*year:\s*ly,\s*isLeap/.test(vanillaSrc)) {
    fail(
      'Bản vanilla NAY đã trả `isLeap` — đây là thay đổi CỔ PHÁP: cập nhật `docs/nhat-ky/` rồi sửa mốc kiểm này một cách cố ý.'
    );
  }
}

// ── 4. RED-TEAM: dựng lại hàm CŨ, phép 3 phải BẮT ĐƯỢC ────────
const buggy = (dd, mm, yy) => {
  const target = yy * 10000 + mm * 100 + dd;
  if (target < V.LUNAR_MIN_YMD) return { day: 1, month: 1, year: yy }; // đúng bug cũ
  return V.solarToLunar(dd, mm, yy);
};
const caught = distinctLunarDaysIn(1898, buggy);
if (caught >= 360) {
  fail(
    `RED-TEAM THẤT BẠI: dựng lại bug cũ mà phép đo vẫn ra ${caught} ngày phân biệt — bộ dò KHÔNG có răng, đừng tin màu xanh của nó.`
  );
} else {
  console.log(
    `   ↳ red-team: tái tạo bug cũ → chỉ ${caught} ngày âm phân biệt/365 ⇒ phép đo bắt được ✓`
  );
}

if (bad === 0) {
  console.log(
    `✅ Biên âm lịch khớp nhau ở hai bản (${V.LUNAR_MIN_YMD}–${V.LUNAR_MAX_YMD}); ngoài biên trả null / ném RangeError chứ không bịa lá số; trong biên số ngày âm phân biệt khớp ĐÚNG con số suy từ bảng (đã tính cả nợ tháng nhuận của bản vanilla).`
  );
} else {
  console.error(
    `\n${bad} lỗi ở biên âm lịch — mọi lá số ngoài tầm bảng sẽ SAI IM LẶNG (cả một năm gộp vào một lá số). Ảnh hưởng: mọi trang lá số, và mọi lượt import dữ liệu ngày sinh từ nguồn ngoài.`
  );
  process.exitCode = 1;
}
