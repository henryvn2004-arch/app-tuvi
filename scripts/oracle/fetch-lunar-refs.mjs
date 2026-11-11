#!/usr/bin/env node
// scripts/oracle/fetch-lunar-refs.mjs
// ============================================================
// Tải BẢNG ĐỐI CHỨNG NGOÀI cho `npm run oracle:lunar` — chạy TAY khi cần làm
// mới (cần mạng), KHÔNG chạy trong CI. Kết quả commit vào scripts/fixtures/ để
// CI đối chiếu offline:
//
//   --hko   → scripts/fixtures/lunar-ref-hko.json
//             Đài Thiên văn Hồng Kông (HKO), "Gregorian-Lunar Calendar
//             Conversion Table" 1901–2100 (hko.gov.hk/en/gts/time/calendar/
//             text/files/T<năm>e.txt) — chuẩn UTC+8 cho Trung/Đài/HK/Ma Cao.
//   --kasi  → scripts/fixtures/lunar-ref-kasi.json
//             Viện Thiên văn & Vũ trụ Hàn Quốc (KASI), astro.kasi.re.kr/life/solc
//             (chính API trang "음양력 변환" của họ dùng). Đi chuỗi mùng 1 → mùng 1
//             theo độ dài tháng KASI trả (LUNC_EN_DD) từ 1/1/1900 tới mốc cuối KASI
//             phục vụ (getMaxDate — hiện 31/12/2050; 2051–2100 KHÔNG có nguồn Hàn),
//             ~2.500 request tuần tự, tự nối tiếp nếu bị ngắt (chạy lại là đi tiếp).
//
// Mỗi file: { source, fetchedAt, rows: [[yyyymmdd mùng 1, tháng, nhuận 0/1], …] }.
// Node `fetch` không tự đi qua proxy container: chạy với NODE_USE_ENV_PROXY=1.
// ============================================================
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FIX = join(ROOT, 'scripts', 'fixtures');
const { jdFromDate, fromJd, ymdOf } = await import('../lunar-lich.mjs');
const pad = (n) => String(n).padStart(2, '0');

async function get(url, as) {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return as === 'json' ? await r.json() : await r.text();
    } catch (e) {
      if (t === 4) throw new Error(`${url}: ${e.message}`, { cause: e });
      await new Promise((ok) => setTimeout(ok, 2000 * (t + 1)));
    }
  }
}

if (process.argv.includes('--hko')) {
  const rows = [];
  for (let y = 1901; y <= 2100; y++) {
    const txt = await get(`https://www.hko.gov.hk/en/gts/time/calendar/text/files/T${y}e.txt`);
    for (const line of txt.split(/\r?\n/)) {
      // Định dạng đổi giữa các năm: "1985/01/21" vs "2015/1/1", "month" vs "Month".
      const m = line.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d+)(?:st|nd|rd|th) Lunar month/i);
      if (!m) continue;
      const mon = +m[4];
      // HKO ghi tháng nhuận bằng CÙNG số thứ tự với tháng trước ("10th" hai lần).
      const leap = rows.length && rows[rows.length - 1][1] === mon ? 1 : 0;
      rows.push([ymdOf(+m[3], +m[2], +m[1]), mon, leap]);
    }
  }
  if (rows.length < 2470)
    throw new Error(`HKO: chỉ đọc được ${rows.length} mùng 1 — định dạng đổi?`);
  writeFileSync(
    join(FIX, 'lunar-ref-hko.json'),
    JSON.stringify({
      source: 'Hong Kong Observatory — Gregorian-Lunar Calendar Conversion Table 1901–2100',
      fetchedAt: new Date().toISOString().slice(0, 10),
      rows,
    })
  );
  console.log(`✓ HKO: ${rows.length} mùng 1`);
}

if (process.argv.includes('--kasi')) {
  const out = join(FIX, 'lunar-ref-kasi.json');
  // Bản nháp nối tiếp (có cả độ dài tháng để đi chuỗi) — xoá sau khi xong.
  const tmp = out + '.partial';
  const rows = existsSync(tmp) ? JSON.parse(readFileSync(tmp, 'utf-8')) : [];
  let cur = rows.length
    ? (() => {
        const [s, , , len] = rows[rows.length - 1];
        return jdFromDate(s % 100, Math.floor(s / 100) % 100, Math.floor(s / 10000)) + len;
      })()
    : jdFromDate(1, 1, 1900);
  // KASI chỉ phục vụ tới một mốc (getMaxDate — 2026-11 là 31/12/2050): đi tới đó thì dừng.
  const mx = await get('https://astro.kasi.re.kr/life/lunc/getMaxDate', 'json');
  const max = ymdOf(+mx[0].SOLC_DD, +mx[0].SOLC_MM, +mx[0].SOLC_YYYY);
  for (;;) {
    const [d, m, y] = fromJd(cur);
    if (ymdOf(d, m, y) > max) break;
    const j = await get(
      `https://astro.kasi.re.kr/life/solc?yyyy=${y}&mm=${pad(m)}&dd=${pad(d)}`,
      'json'
    );
    if (!j || +j.LUNC_DD !== 1)
      throw new Error(`KASI: ${d}/${m}/${y} không phải mùng 1 — ${JSON.stringify(j)}`);
    rows.push([ymdOf(d, m, y), +j.LUNC_MM, j.LUNC_LEAP_MM === '윤' ? 1 : 0, +j.LUNC_EN_DD]);
    if (rows.length % 50 === 0) {
      writeFileSync(tmp, JSON.stringify(rows));
      console.log(`  KASI ${rows.length} tháng · ${y}`);
    }
    cur += +j.LUNC_EN_DD;
  }
  writeFileSync(
    out,
    JSON.stringify({
      source: 'Korea Astronomy and Space Science Institute (KASI) — astro.kasi.re.kr/life/solc',
      fetchedAt: new Date().toISOString().slice(0, 10),
      maxDate: max,
      // Mùng 1 cuối cùng chỉ để chốt độ dài tháng trước nó (đọc tới max là hết).
      rows: rows.map(([s, mo, lp]) => [s, mo, lp]),
    })
  );
  rmSync(tmp, { force: true });
  console.log(`✓ KASI: ${rows.length} mùng 1`);
}
