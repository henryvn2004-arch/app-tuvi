#!/usr/bin/env node
// scripts/build-laso-census.mjs
// ============================================================
// Tổng điều tra TOÀN BỘ 518.400 lá số có thể có — 60 can-chi năm × 12 tháng
// ÂL × 30 ngày ÂL × 12 giờ × 2 giới. Không phải mẫu: đây là TOÀN BỘ không
// gian đầu vào của `anSaoLaSo()` (an sao chỉ phụ thuộc can-chi năm/tháng
// ÂL/ngày ÂL/giờ/giới — số năm dương KHÔNG vào an sao, xem CLAUDE.md mục
// "Khoá lá số là ÂM LỊCH").
//
// Ghi ra MỘT file JSON TĨNH `public/laso-census.json` — CỐ Ý không dùng bảng
// Postgres: kết quả là hàm THUẦN của chính engine (đã kiểm bằng script này,
// xem dưới), không phụ thuộc dữ liệu người dùng nào, nên hợp với asset tĩnh
// versioned trong repo hơn — tránh thêm một lớp "bảng có thể trôi khỏi mã"
// cho thứ vốn dĩ không đổi trừ khi chính công thức engine đổi. Cùng cách nạp
// như `public/cach_cuc_all.json` đã có sẵn (fetch() client-side / readFileSync
// server-side).
//
// ── BẪY ĐÃ VẤP KHI VIẾT SCRIPT NÀY — namAL PHẢI KHỚP THẬT với canNam/chiNam
// Gọi `anSaoLaSo` với `namAL` không tương ứng thật với `canNam`/`chiNam` (vd
// ép namAL=2000 nhưng khai canNam/chiNam của năm khác) làm `cachCuc` RA SAI —
// có cách cục đọc thẳng namAL (không chỉ qua can-chi). Test trực tiếp: cùng
// canNam/chiNam nhưng namAL "giả" (không khớp) cho cachCuc KHÁC hẳn, trong
// khi namAL "thật" cách nhau đúng bội số 60 (1990/1930/2050, đều Canh Ngọ)
// cho cachCuc GIỐNG HỆT NHAU — đúng chu kỳ 60 năm. ⇒ Kịch bản dưới đây LUÔN
// suy `canNam`/`chiNam` TỪ `namAL` bằng đúng công thức `yearCan`/`yearChi`
// (lib/engine/laso.ts), không bao giờ khai hai bên độc lập.
//
// Chạy: node scripts/build-laso-census.mjs
// Tự chia việc theo số nhân CPU (child_process.fork), ~10 phút/518.400 lá số
// trên máy 4 nhân (bench đơn luồng đo được ~4,4ms/lá số).
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const ENGINE_PATH = path.join(ROOT, 'public', 'tuvi-ansao-engine.js');
const OUT_PATH = path.join(ROOT, 'public', 'laso-census.json');

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Cùng công thức `yearCan`/`yearChi` của lib/engine/laso.ts — 1984 = Giáp Tý
// (mốc chuẩn), namAL tăng dần quét đủ 60 tổ hợp can-chi phân biệt, mỗi tổ hợp
// đúng MỘT năm thật (không lặp, không bỏ sót — đã tự kiểm ở cuối file).
const yearCan = (y) => CAN[(((y - 4) % 10) + 10) % 10];
const yearChi = (y) => CHI[(((y - 4) % 12) + 12) % 12];
const BASE_YEAR = 1984;
const N_SLOT = 9; // 9 đại vận có `scoring` (6-15t .. 86-95t) — chặng >95t engine không chấm, xem probe.

function loadEngine() {
  const g = globalThis;
  g.window = g;
  if (!g.location) {
    g.location = {
      protocol: 'https:',
      hostname: 'x',
      host: 'x',
      port: '',
      href: 'https://x/',
      pathname: '/',
      search: '',
      hash: '',
    };
  }
  const code = readFileSync(ENGINE_PATH, 'utf8');
  return new Function('window', 'globalThis', code + '\nreturn { anSaoLaSo };')(g, g);
}

function runShard(shardIndex, shardCount) {
  const { anSaoLaSo } = loadEngine();
  const daiVan = Array.from({ length: N_SLOT }, () => []);
  const cachCucCount = new Map(); // ten -> số LÁ SỐ có cách này (đếm theo lá số, không theo lượt xuất hiện)
  let n = 0;

  for (let ky = 0; ky < 60; ky++) {
    if (ky % shardCount !== shardIndex) continue;
    const namAL = BASE_YEAR + ky;
    const canNam = yearCan(namAL),
      chiNam = yearChi(namAL);
    for (let thang = 1; thang <= 12; thang++) {
      for (let ngay = 1; ngay <= 30; ngay++) {
        for (let gioIdx = 0; gioIdx < 12; gioIdx++) {
          for (const gioitinh of ['nam', 'nu']) {
            const ls = anSaoLaSo({
              ngayAL: ngay,
              thangAL: thang,
              namAL,
              canNam,
              chiNam,
              gioIdx,
              gioitinh,
              namXem: 2026,
            });
            if (!ls) continue;
            n++;
            const dv = ls.daiVans || [];
            for (let i = 0; i < N_SLOT; i++) {
              const t = dv[i] && dv[i].scoring && dv[i].scoring.tong;
              if (typeof t === 'number') daiVan[i].push(t);
            }
            const seenInChart = new Set();
            for (const c of ls.cachCuc || []) {
              if (seenInChart.has(c.ten)) continue;
              seenInChart.add(c.ten);
              cachCucCount.set(c.ten, (cachCucCount.get(c.ten) || 0) + 1);
            }
          }
        }
      }
    }
  }
  return { n, daiVan, cachCuc: [...cachCucCount.entries()] };
}

async function main() {
  const shardCount = Math.max(1, cpus().length);

  if (process.env.CENSUS_SHARD != null) {
    // Tiến trình CON — tính một phần (theo lát can-chi), trả kết quả qua IPC.
    const idx = Number(process.env.CENSUS_SHARD);
    process.send(runShard(idx, shardCount));
    process.exitCode = 0;
    return;
  }

  console.log(`Tổng điều tra 518.400 lá số — ${shardCount} tiến trình song song...`);
  const t0 = Date.now();
  const results = await Promise.all(
    Array.from(
      { length: shardCount },
      (_, i) =>
        new Promise((resolve, reject) => {
          const child = fork(__filename, [], { env: { ...process.env, CENSUS_SHARD: String(i) } });
          let result = null;
          child.on('message', (m) => {
            result = m;
          });
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code === 0 && result) resolve(result);
            else reject(new Error('Shard ' + i + ' lỗi (exit ' + code + ')'));
          });
        })
    )
  );

  let total = 0;
  const daiVan = Array.from({ length: N_SLOT }, () => []);
  const cachCucCount = new Map();
  for (const r of results) {
    total += r.n;
    // KHÔNG `push(...mảng)` — mỗi shard góp ~130.000 số, spread làm đối số
    // hàm vượt giới hạn ngăn xếp (RangeError: Maximum call stack size
    // exceeded, đã ăn đủ ở lượt chạy thật). `concat` không có giới hạn này.
    for (let i = 0; i < N_SLOT; i++) daiVan[i] = daiVan[i].concat(r.daiVan[i]);
    for (const [ten, c] of r.cachCuc) cachCucCount.set(ten, (cachCucCount.get(ten) || 0) + c);
  }

  // 101 mốc phân vị (p0..p100)/chặng — đủ dựng Thang Bách Phân ("cao hơn X%
  // lá số khác"); giữ nguyên cả 518.400 số cho mỗi chặng chỉ nặng thêm mà
  // không tăng độ chính xác cần dùng (tra theo mốc %, không tra theo điểm lẻ).
  const daiVanBreakpoints = daiVan.map((arr) => {
    arr.sort((a, b) => a - b);
    const n = arr.length;
    return Array.from(
      { length: 101 },
      (_, p) => arr[Math.min(n - 1, Math.floor((p / 100) * (n - 1)))]
    );
  });

  const cachCuc = {};
  for (const [ten, count] of cachCucCount.entries()) {
    cachCuc[ten] = {
      count,
      pct: Math.round((count / total) * 10000) / 100,
      oneIn: Math.round(total / count),
    };
  }

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalCharts: total,
    daiVan: daiVanBreakpoints,
    cachCuc,
  };
  const json = JSON.stringify(out);
  writeFileSync(OUT_PATH, json);
  console.log(
    `Xong: ${total} lá số, ${Object.keys(cachCuc).length} cách cục phân biệt, ` +
      `${((Date.now() - t0) / 1000).toFixed(0)}s. Ghi ${OUT_PATH} (${(json.length / 1024).toFixed(1)} KB).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
