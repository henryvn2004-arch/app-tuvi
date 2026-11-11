#!/usr/bin/env node
// scripts/gen-lunar-table.mjs
// ============================================================
// P1 — regenerate _LUNAR_TABLE bằng thuật toán chính xác của oracle
// ("An Sao - Tử Vi Thiên Lương", có hiệu chỉnh ΔT) + quy tắc múi giờ lịch sử
// VN (UTC+8 trước 1968-01-01, UTC+7 từ đó — xem CLAUDE.md/workplan).
//
// KHÔNG ghi trực tiếp vào public/tuvi-ansao-engine.js hay
// tuvi-engine/src/lunar/convert.ts — chỉ IN ra bảng mới (JSON) để soát trước
// khi áp dụng bằng tay (apply-lunar-table.mjs).
//
// Cách hoạt động: quét TỪNG NGÀY dương từ biên dưới tới biên trên (có đệm),
// gọi oracle.solarToLunar(d,m,y,tz) mỗi ngày; mỗi khi bộ ba (tháng, nhuận,
// năm-âm) đổi so với ngày liền trước → ghi một dòng bảng mới tại ngày đó.
// oracle có 4 "ngày rác" đã biết (day:0, đúng lúc tháng mới bắt đầu — xem
// scripts/oracle/report-lunar-diff.mjs) → chuẩn hoá day:0 thành day:1 (đã
// verify: ngày liền sau luôn xác nhận đúng month/year, chỉ lệch mỗi field
// day). KHÔNG ảnh hưởng việc phát hiện chuyển tháng vì ta chỉ so (month,leap,year).
// ============================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const { loadOracle } = await import('./oracle/load.mjs');
const { LICH_TZ, LICH_LIST, jdFromDate, fromJd, ymdOf: ymd } = await import('./lunar-lich.mjs');
const O = loadOracle();

// `--lich vn|cn|kr|jp` (mặc định vn). Quy tắc múi giờ từng lịch + nguồn: scripts/lunar-lich.mjs.
//   vn → scripts/fixtures/lunar-table-new.json (đường cũ, apply-lunar-table.mjs ghi vào _LUNAR_TABLE)
//   khác → scripts/fixtures/lunar-table-<lich>.json (apply-lunar-table.mjs --extra mã hoá gọn
//          rồi ghi vào khối _LUNAR_EXTRA của cả hai engine)
const argi = process.argv.indexOf('--lich');
const LICH = argi > 0 ? process.argv[argi + 1] : 'vn';
if (!LICH_LIST.includes(LICH)) throw new Error(`--lich phải là một trong ${LICH_LIST.join('|')}`);
const tzFor = (d, m, y) => LICH_TZ[LICH](ymd(d, m, y));

// Đệm 2 tháng mỗi đầu để chắc chắn bắt đúng dòng bảng phủ được biên mong muốn.
const SCAN_START = jdFromDate(1, 11, 1899);
const SCAN_END = jdFromDate(28, 2, 2101);
const TARGET_MIN = 19000101; // giữ độ phủ >= bảng cũ (19000131)
const TARGET_MAX = 21001231;

const rows = [];
let prevKey = null;
let zeroDayCount = 0;
for (let jd = SCAN_START; jd <= SCAN_END; jd++) {
  const [d, m, y] = fromJd(jd);
  const tz = tzFor(d, m, y);
  const r = O.solarToLunar(d, m, y, tz);
  if (!r) throw new Error(`oracle.solarToLunar trả falsy tại ${d}/${m}/${y}`);
  if (r.day === 0) zeroDayCount++; // ngày rác đã biết — day không dùng để phát hiện chuyển tháng
  // ⚠️ "Ngày rác" day:0 KHÔNG chỉ sai field day: oracle ước lượng sai chỉ số
  // lunation k (lệch 1) nên ngày đó nó đã báo SANG tháng mới, trong khi sóc thật
  // rơi vào NGÀY HÔM SAU theo giờ của lịch (vd 26/3/2009 UTC+8: sóc 00:06 ngày
  // 27 — HKO mở tháng 3 ngày 27). Bảng VN cũ lấy luôn ngày rác làm mùng 1 ⇒ 4
  // tháng (1939-3, 1947-2 nhuận, 2054-4, 2062-3) mở SỚM một ngày — ghi ở
  // docs/luat/engine-cophap.md, CHƯA sửa (đổi bảng VN là đổi lá số đang chạy).
  // Bảng MỚI (cn/kr/jp) xếp ngày rác về tháng TRƯỚC — khớp HKO 100%.
  const key =
    r.day === 0 && LICH !== 'vn' && prevKey ? prevKey : `${r.month}|${r.leap ? 1 : 0}|${r.year}`;
  if (key !== prevKey) {
    rows.push([ymd(d, m, y), r.month, r.leap ? 1 : 0, r.year]);
    prevKey = key;
  }
}
console.log(
  `Quét xong: ${rows.length} dòng chuyển tháng, ${zeroDayCount} ngày rác (đã chuẩn hoá qua phát hiện chuyển tháng).`
);

// ── Bảng KHÁC VN: dựng theo QUY TẮC CHUẨN, trung khí tính chính xác ─────────
// Thuật toán HND của oracle quyết tháng nhuận bằng kinh độ Mặt Trời công thức
// rút gọn (sai tới ~0,01° ≈ 15 phút, không trừ ΔT). Với UTC+7/+8 may mắn không
// trúng ca sát biên nào trong 1900–2100 (bảng cn theo HND khớp HKO), nhưng
// UTC+9 thì trúng: Đại Thử 2017 rơi 00:15 giờ Seoul/Tokyo ngày 23/7 ⇒ Hàn/Nhật
// NHUẬN THÁNG 5 (KASI: 24/6/2017 = 윤5월 1일), HND lại ra nhuận tháng 6 như Trung.
// Nên bảng cn/kr/jp dựng lại từ đầu theo quy tắc (Aslaksen, "The Mathematics of
// the Chinese Calendar"):
//   • mùng 1 = NGÀY (giờ của lịch) chứa sóc — sóc lấy từ CHÍNH oracle `NewMoon`
//     (Meeus ch.49 + ΔT; lệch astronomy-engine ≤ 1 phút suốt 1900–2100);
//   • tháng chứa Đông Chí là tháng 11; giữa hai tháng 11 có 13 tháng thì tháng
//     ĐẦU TIÊN không chứa trung khí nào là tháng nhuận (mang số tháng trước);
//   • trung khí (kinh độ Mặt Trời bội số 30°) lấy từ `astronomy-engine`
//     (MIT, đối chứng JPL; có sẵn trong package-lock qua mingyu-core) — CHỈ dùng
//     trong script sinh bảng, không vào engine/sản phẩm.
// Bảng HND vẫn quét ở trên để in chỗ khác nhau (chẩn đoán); oracle:lunar ghim
// đúng danh sách chỗ khác đó và đối chứng bảng với HKO (cn) / KASI (kr).
let finalRows = rows;
if (LICH !== 'vn') {
  const A = createRequire(import.meta.url)('astronomy-engine');
  const JD_J2000 = 2451545.0;
  // JD (UT) → số ngày Julian của NGÀY DÂN SỰ theo giờ của lịch.
  const localDay = (jdUT) => {
    const g = Math.floor(jdUT + 0.5 + 8 / 24);
    const [d, m, y] = fromJd(g);
    return Math.floor(jdUT + 0.5 + LICH_TZ[LICH](ymd(d, m, y)) / 24);
  };
  // Lunation: k=0 ≈ 1900-01-01. Phủ 1898 → 2102.
  const S = [];
  for (let k = -30; k <= 2520; k++) S.push(localDay(O.NewMoon(k)));
  for (let i = 1; i < S.length; i++)
    if (S[i] - S[i - 1] !== 29 && S[i] - S[i - 1] !== 30)
      throw new Error(`tháng dài ${S[i] - S[i - 1]} ngày`);
  // Trung khí (bội số 30°) theo ngày dân sự của lịch + Đông Chí từng năm.
  const Z = [];
  const W = {};
  for (let y = 1897; y <= 2102; y++) {
    for (let L = 0; L < 360; L += 30) {
      // Xuân phân (0°) ~ 20/3: tìm từ 1/1 năm y, mỗi kinh độ một lần trong năm.
      const t = A.SearchSunLongitude(L, new A.AstroTime(new Date(Date.UTC(y, 0, 1))), 366);
      if (!t) throw new Error(`không tìm được kinh độ ${L}° năm ${y}`);
      const day = localDay(t.ut + JD_J2000);
      Z.push(day);
      if (L === 270) W[y] = day;
    }
  }
  Z.sort((a, b) => a - b);
  const hasZ = (i) => Z.some((z) => z >= S[i] && z < S[i + 1]);
  const lunOf = (day) => {
    for (let i = 0; i + 1 < S.length; i++) if (S[i] <= day && day < S[i + 1]) return i;
    throw new Error('ngoài tầm lunation');
  };
  const prec = [];
  for (let y = 1898; y <= 2102; y++) {
    const a = lunOf(W[y - 1]),
      b = lunOf(W[y]);
    const n = b - a;
    if (n !== 12 && n !== 13) throw new Error(`năm ${y}: ${n} tháng giữa hai Đông Chí`);
    let leapIdx = -1;
    if (n === 13)
      for (let i = a; i < b; i++)
        if (!hasZ(i)) {
          leapIdx = i;
          break;
        }
    if (n === 13 && leapIdx < 0)
      throw new Error(`năm ${y}: 13 tháng mà không có tháng thiếu trung khí`);
    let m = 10,
      ly = y - 1;
    for (let i = a; i < b; i++) {
      const leap = i === leapIdx ? 1 : 0;
      if (!leap) {
        m = m === 12 ? 1 : m + 1;
        if (m === 1) ly = y;
      }
      const [d, mo, yy] = fromJd(S[i]);
      prec.push([ymd(d, mo, yy), m, leap, ly]);
    }
  }
  finalRows = prec.filter(
    (r) => r[0] >= ymd(...fromJd(SCAN_START)) && r[0] <= ymd(...fromJd(SCAN_END))
  );
  // Chẩn đoán: tháng nào HND (oracle) khác bản chính xác.
  const key = (r) => r.join(',');
  const hnd = new Set(rows.map(key));
  const diff = finalRows.filter(
    (r) => !hnd.has(key(r)) && r[0] >= TARGET_MIN && r[0] <= TARGET_MAX
  );
  console.log(
    `[${LICH}] Bản chính xác khác HND (oracle) ở ${diff.length} dòng: ${diff.map(key).join(' | ')}`
  );
}

// Cắt về đúng khung mong muốn: giữ dòng cuối cùng có solar <= TARGET_MIN (để
// TARGET_MIN vẫn tra được đúng), và mọi dòng cho tới hết TARGET_MAX.
let startIdx = finalRows.findIndex((r) => r[0] > TARGET_MIN) - 1;
if (startIdx < 0) startIdx = 0;
let endIdx = finalRows.length - 1;
while (endIdx > 0 && finalRows[endIdx][0] > TARGET_MAX) endIdx--;
// endIdx phải là dòng CUỐI CÙNG có solar <= TARGET_MAX+dư, giữ nguyên dòng đó
// (nó cai quản mọi ngày tới trước dòng kế tiếp, bao gồm cả TARGET_MAX).
const trimmed = finalRows.slice(startIdx, endIdx + 1);

console.log(
  `Bảng sau khi cắt: ${trimmed.length} dòng. MIN=${trimmed[0][0]} MAX(dòng cuối)=${trimmed[trimmed.length - 1][0]}`
);
console.log(
  `(MAX thật của phạm vi phủ là ngày trước dòng-kế-tiếp-giả-định — xác nhận bằng check round-trip riêng.)`
);

const outPath = join(
  process.cwd(),
  'scripts',
  'fixtures',
  LICH === 'vn' ? 'lunar-table-new.json' : `lunar-table-${LICH}.json`
);
writeFileSync(outPath, JSON.stringify(trimmed));
console.log(`Đã ghi ${outPath} (${trimmed.length} dòng).`);
