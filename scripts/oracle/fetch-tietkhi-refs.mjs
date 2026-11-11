#!/usr/bin/env node
// scripts/oracle/fetch-tietkhi-refs.mjs
// ============================================================
// Tải BẢNG ĐỐI CHỨNG NGOÀI cho `npm run check:tietkhi` (bảng thời điểm tiết khí
// của Bát Tự lịch cn/kr/jp) — chạy TAY khi cần làm mới (cần mạng), KHÔNG chạy
// trong CI. Kết quả commit vào scripts/fixtures/:
//
//   --hko   → scripts/fixtures/tietkhi-ref-hko.json
//             Đài Thiên văn Hồng Kông, cột "Solar terms" của bảng "Gregorian-
//             Lunar Calendar Conversion Table" 1901–2100 (cùng file W3 đọc mùng 1,
//             hko.gov.hk/en/gts/time/calendar/text/files/T<năm>e.txt): NGÀY (giờ
//             UTC+8) của cả 24 tiết khí — không có giờ phút.
//   --naoj  → scripts/fixtures/tietkhi-ref-naoj.json
//             Đài Thiên văn Quốc gia Nhật (NAOJ), "暦要項 — 二十四節気および雑節"
//             (eco.mtk.nao.ac.jp/koyomi/yoko/<năm>/rekiyou<yy>2.html): giờ:PHÚT
//             JST của 24 tiết khí — chỉ những năm NAOJ còn đăng (hiện 2005→năm sau).
//
// Không có nguồn Hàn ở đây: bảng 24절기 của KASI chỉ phục vụ qua API data.go.kr
// cần khoá dịch vụ. Node `fetch` không tự đi qua proxy container:
// NODE_USE_ENV_PROXY=1 node scripts/oracle/fetch-tietkhi-refs.mjs --hko --naoj
// ============================================================
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIX = join(process.cwd(), 'scripts', 'fixtures');

async function get(url, { binary = false, allow404 = false } = {}) {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(url);
      if (allow404 && r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return binary ? new Uint8Array(await r.arrayBuffer()) : await r.text();
    } catch (e) {
      if (t === 4) throw new Error(`${url}: ${e.message}`, { cause: e });
      await new Promise((ok) => setTimeout(ok, 2000 * (t + 1)));
    }
  }
}

// Tên tiếng Anh của HKO → kinh độ. Tên đổi đôi chút giữa các năm ⇒ so sau khi bỏ
// khoảng trắng/hoa thường; gặp tên lạ là DỪNG (đừng bỏ sót im lặng).
const HKO_DEG = {
  moderatecold: 285,
  severecold: 300,
  springcommences: 315,
  springshowers: 330,
  insectswaken: 345,
  vernalequinox: 0,
  brightandclear: 15,
  cornrain: 30,
  summercommences: 45,
  cornforms: 60,
  cornonear: 75,
  summersolstice: 90,
  moderateheat: 105,
  greatheat: 120,
  autumncommences: 135,
  endofheat: 150,
  whitedew: 165,
  autumnalequinox: 180,
  colddew: 195,
  frost: 210,
  wintercommences: 225,
  lightsnow: 240,
  heavysnow: 255,
  wintersolstice: 270,
};

if (process.argv.includes('--hko')) {
  const rows = [];
  for (let y = 1901; y <= 2100; y++) {
    const txt = await get(`https://www.hko.gov.hk/en/gts/time/calendar/text/files/T${y}e.txt`);
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s.*?(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\s+(\S.*?)\s*$/i
      );
      if (!m) continue;
      const k = m[4]
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z]/g, '');
      if (!(k in HKO_DEG)) throw new Error(`HKO ${y}: tên tiết lạ "${m[4]}"`);
      rows.push([+m[1] * 10000 + +m[2] * 100 + +m[3], HKO_DEG[k]]);
    }
  }
  if (rows.length !== 200 * 24)
    throw new Error(`HKO: đọc được ${rows.length} tiết, cần ${200 * 24}`);
  writeFileSync(
    join(FIX, 'tietkhi-ref-hko.json'),
    JSON.stringify({
      source:
        'HKO Gregorian-Lunar Calendar Conversion Table 1901–2100, cột Solar terms (ngày UTC+8)',
      fetchedAt: new Date().toISOString().slice(0, 10),
      rows,
    }) + '\n'
  );
  console.log(`HKO: ${rows.length} tiết`);
}

if (process.argv.includes('--naoj')) {
  const rows = [];
  const dec = new TextDecoder('shift_jis');
  const den = new Date().getUTCFullYear() + 2;
  for (let y = 2000; y <= den; y++) {
    const yy = String(y % 100).padStart(2, '0');
    const buf = await get(`https://eco.mtk.nao.ac.jp/koyomi/yoko/${y}/rekiyou${yy}2.html`, {
      binary: true,
      allow404: true,
    });
    if (!buf) continue;
    const txt = dec
      .decode(buf)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ');
    const truoc = rows.length;
    for (const m of txt.matchAll(/(\d+)度\s+(\d+)月\s*(\d+)日\s+(\d+)時\s*(\d+)分/g)) {
      if (+m[1] % 15) continue; // 雑節 (土用 297°, 入梅 80°, 半夏生 100°…) cùng bảng — bỏ
      const p2 = (n) => String(n).padStart(2, '0');
      rows.push([+m[1], `${y}-${p2(m[2])}-${p2(m[3])}T${p2(m[4])}:${p2(m[5])}`]);
    }
    if (rows.length - truoc !== 24)
      throw new Error(`NAOJ ${y}: đọc được ${rows.length - truoc} tiết, cần 24`);
  }
  if (rows.length < 24 * 10)
    throw new Error(`NAOJ: chỉ ${rows.length} tiết — trang đổi định dạng?`);
  writeFileSync(
    join(FIX, 'tietkhi-ref-naoj.json'),
    JSON.stringify({
      source: 'NAOJ 暦要項 二十四節気 (giờ:phút JST, UTC+9)',
      fetchedAt: new Date().toISOString().slice(0, 10),
      rows,
    }) + '\n'
  );
  console.log(
    `NAOJ: ${rows.length} tiết (${rows[0][1].slice(0, 4)}–${rows[rows.length - 1][1].slice(0, 4)})`
  );
}
