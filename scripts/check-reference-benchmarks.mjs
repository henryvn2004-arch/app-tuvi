#!/usr/bin/env node
// scripts/check-reference-benchmarks.mjs
// ============================================================
// "3 lá số vàng" — 3 trường hợp có sẵn TRONG chính bộ tự-kiểm của bản tham
// khảo "An Sao - Tử Vi Thiên Lương" (hàm `regressionTest()`,
// scripts/oracle/vendor/an-sao-thien-luong.js:6132-6252). Giá trị mong đợi
// bên dưới CHÉP NGUYÊN VĂN từ các hằng số `expected`/điều kiện `ok` trong
// hàm đó — không tính lại qua oracle loader, để bộ dò này KHÔNG phụ thuộc
// scripts/oracle/vendor/ (chạy được ở mọi máy, mọi lúc, gate CI được).
//
// Khác với check:lasogolden (đóng băng từ CHÍNH engine mình — không chứng
// minh được gì nếu công thức mình sai từ đầu), 3 ca này là XÁC NHẬN ĐỘC LẬP:
// nếu engine mình vô tình đổi công thức mà đúng bằng phép thử của MÌNH
// (golden fixture tự sinh từ chính engine) thì vẫn có thể lọt; đối chiếu với
// giá trị người khác tự khẳng định độc lập thì không lọt kiểu đó.
//
// Chỉ so phần AN SAO (Mệnh/Thân/Cục/14 chính tinh/Tuần/Triệt/Lộc Tồn) — bỏ
// tiểu hạn ring, Sao Át Chủ, vận hạn tháng, lưu đại hạn: engine hiện tại
// CHƯA có các tầng đó (xem workplan Nhánh C, chưa làm).
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let failed = 0;
const fail = (msg) => {
  console.error('  ✗ ' + msg);
  failed++;
};
const ok = (msg) => console.log('  ✓ ' + msg);

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
const E = new Function(
  'window',
  'globalThis',
  engineSrc + '\nreturn {anSaoLaSo, convertDuongToAm};'
)(g, g);

function palaceOf(ls, starName) {
  const p = ls.palaces.find((p) => p.stars.some((s) => s.ten === starName));
  return p ? p.idx : null;
}

const CASES = [
  {
    name: 'Benchmark A — Canh Thân 07/07/1980 07:07 Nam',
    source: 'regressionTest() sample1980, vendor/an-sao-thien-luong.js:6143-6169',
    input: { d: 7, m: 7, y: 1980, hour: 7, gender: 'nam' },
    expected: {
      menhIdx: 2, // oracle menh=3 (1-idx) → idx 0-based = 2
      thanIdx: 10, // oracle than=11 → 10
      cucNumber: 5,
      // oracle 1-idx branch → trừ 1 để so idx 0-based
      chinhTinh: {
        'Vũ Khúc': 2,
        'Thiên Tướng': 2,
        'Thái Dương': 3,
        'Thiên Lương': 3,
        'Thất Sát': 4,
        'Thiên Cơ': 5,
        'Tử Vi': 6,
        'Phá Quân': 8,
        'Liêm Trinh': 10,
        'Thiên Phủ': 10,
        'Thái Âm': 11,
        'Tham Lang': 0,
        'Thiên Đồng': 1,
        'Cự Môn': 1,
      },
      tuan: [0, 1],
      triet: [6, 7],
    },
  },
  {
    name: 'Benchmark C — Giáp Tuất 04/11/1994 07:15 Nữ',
    source: 'regressionTest() sample1994, vendor/an-sao-thien-luong.js:6171-6191',
    input: { d: 4, m: 11, y: 1994, hour: 7, gender: 'nu' },
    expected: {
      // Tuần VÀ Triệt phải đồng cung Thân–Dậu (oracle 9,10 1-idx → 8,9)
      tuan: [8, 9],
      triet: [8, 9],
    },
  },
  {
    name: 'Benchmark B — Kỷ Mùi 02/08/1979 08:00 Nam (Âm Nam)',
    source: 'regressionTest() sample1979 (phần đặt sao), vendor/an-sao-thien-luong.js:6193-6230',
    note:
      'Chỉ so phần placement độc lập trường phái. BỎ tieuRing/annualMonths/lưuĐạiHạn/Át Chủ ' +
      '— engine hiện tại chưa có các tầng đó (Nhánh C). Kình/Đà là ca ÂM NAM (Kỷ=âm+Nam) — ' +
      'trường phái Thiên Lương ĐẢO chiều so với Nam phái cố định hiện tại (P3 chưa làm) → chỉ ' +
      'báo THÔNG TIN, không fail.',
    input: { d: 2, m: 8, y: 1979, hour: 8, gender: 'nam' },
    expected: {
      menhIdx: 3, // oracle menh=4 → 3
      thanIdx: 11, // oracle than=12 → 11
      cucNumber: 6,
      locTonIdx: 6, // oracle Lộc Tồn=7 → 6, KHÔNG phụ thuộc trường phái
    },
    knownDivergentInfo: {
      // Trường phái Thiên Lương (P3 chưa làm) — chỉ log, không fail.
      kinhDuongIdx: 5, // oracle Kình Dương=6 → 5
      daLaIdx: 7, // oracle Đà La=8 → 7
    },
  },
];

for (const c of CASES) {
  const { d, m, y, hour, gender } = c.input;
  let conv, ls;
  try {
    conv = E.convertDuongToAm(d, m, y, hour);
    if (!conv) throw new Error('convertDuongToAm trả null (ngoài biên lịch âm?)');
    const al = conv.amLich;
    ls = E.anSaoLaSo({
      ngayAL: al.day,
      thangAL: al.month,
      namAL: al.year,
      canNam: conv.canNam,
      chiNam: conv.chiNam,
      gioIdx: conv.gioIdx,
      gioitinh: gender,
      namXem: 2026,
    });
  } catch (e) {
    fail(`${c.name}: engine ném lỗi — ${e.message}`);
    continue;
  }

  const before = failed;
  const exp = c.expected;

  if (exp.menhIdx !== undefined && ls.menhIdx !== exp.menhIdx) {
    fail(`${c.name}: menhIdx=${ls.menhIdx}, kỳ vọng ${exp.menhIdx}`);
  }
  if (exp.thanIdx !== undefined && ls.thanIdx !== exp.thanIdx) {
    fail(`${c.name}: thanIdx=${ls.thanIdx}, kỳ vọng ${exp.thanIdx}`);
  }
  if (exp.cucNumber !== undefined) {
    const CUC_NUMBER = {
      'Thủy Nhị Cục': 2,
      'Mộc Tam Cục': 3,
      'Kim Tứ Cục': 4,
      'Thổ Ngũ Cục': 5,
      'Hỏa Lục Cục': 6,
    };
    if (CUC_NUMBER[ls.cuc] !== exp.cucNumber) {
      fail(`${c.name}: cục="${ls.cuc}" (số ${CUC_NUMBER[ls.cuc]}), kỳ vọng số ${exp.cucNumber}`);
    }
  }
  if (exp.chinhTinh) {
    for (const [star, idx] of Object.entries(exp.chinhTinh)) {
      const got = palaceOf(ls, star);
      if (got !== idx) fail(`${c.name}: ${star} tại cung ${got}, kỳ vọng ${idx}`);
    }
  }
  if (exp.tuan) {
    const gotTuan = ls.palaces
      .filter((p) => p.stars.some((s) => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt'))
      .map((p) => p.idx)
      .sort();
    if (JSON.stringify(gotTuan) !== JSON.stringify([...exp.tuan].sort()))
      fail(`${c.name}: Tuần tại ${JSON.stringify(gotTuan)}, kỳ vọng ${JSON.stringify(exp.tuan)}`);
  }
  if (exp.triet) {
    const gotTriet = ls.palaces
      .filter((p) => p.stars.some((s) => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt'))
      .map((p) => p.idx)
      .sort();
    if (JSON.stringify(gotTriet) !== JSON.stringify([...exp.triet].sort()))
      fail(
        `${c.name}: Triệt tại ${JSON.stringify(gotTriet)}, kỳ vọng ${JSON.stringify(exp.triet)}`
      );
  }
  if (exp.locTonIdx !== undefined) {
    const got = palaceOf(ls, 'Lộc Tồn');
    if (got !== exp.locTonIdx) fail(`${c.name}: Lộc Tồn tại cung ${got}, kỳ vọng ${exp.locTonIdx}`);
  }

  if (c.knownDivergentInfo) {
    const gotKinh = palaceOf(ls, 'Kình Dương');
    const gotDa = palaceOf(ls, 'Đà La');
    const { kinhDuongIdx, daLaIdx } = c.knownDivergentInfo;
    const matches = gotKinh === kinhDuongIdx && gotDa === daLaIdx;
    console.log(
      `  ℹ ${c.name}: Kình=${gotKinh} Đà=${gotDa} (Thiên Lương: Kình=${kinhDuongIdx} Đà=${daLaIdx}) — ${matches ? 'ĐÃ khớp Thiên Lương' : 'đang theo Nam phái cố định (chờ P3)'}, không fail`
    );
  }

  if (failed === before) ok(`${c.name}${c.note ? ' — ' + c.note : ''}`);
}

if (failed) {
  console.error(
    `\n✗ check:refbenchmarks — ${failed} lệch với 3 lá số vàng (nguồn: chính tác giả bản Thiên Lương).`
  );
  process.exit(1);
}
console.log(
  '\n✓ check:refbenchmarks — khớp cả 3 lá số vàng (xác nhận độc lập với golden fixture tự sinh).'
);
