#!/usr/bin/env node
// scripts/check-laso-golden.mjs
// ============================================================
// Cổng CHÍNH của P0: dựng lại 120 lá số trong scripts/fixtures/laso-golden.json
// bằng engine HIỆN TẠI, so từng trường với bản đã đóng băng. Lệch một sao,
// một cung, một trạng thái sáng-tối là ĐỎ.
//
// Không cần scripts/oracle/ — chạy được ở MỌI máy, MỌI lúc, gate CI được.
// Đây là bộ dò duy nhất trong repo trước giờ SO GIÁ TRỊ vị trí sao thật (các
// bộ dò khác — check:laso, check:cacheshape — chỉ so KHUNG/ĐƯỜNG DẪN KHOÁ).
//
// Sinh lại fixture (npm run gen:laso-golden) CHỈ khi cố ý đổi engine VÀ đã
// đối chiếu xong với oracle (scripts/oracle/check-ansao-exhaustive.mjs) —
// không chạy lại để "cho xanh".
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let failed = 0;
const fail = (msg) => {
  console.error('  ✗ ' + msg);
  failed++;
};

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

const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

const fixturePath = join(ROOT, 'scripts', 'fixtures', 'laso-golden.json');
let fixtures;
try {
  fixtures = JSON.parse(readFileSync(fixturePath, 'utf-8'));
} catch (e) {
  console.error(`✗ Không đọc được ${fixturePath}: ${e.message}`);
  console.error('  Chạy `node scripts/gen-laso-golden.mjs` để tạo fixture lần đầu.');
  process.exit(1);
}

function starSetKey(stars) {
  return stars
    .map((s) => `${s.ten}:${s.hoa || ''}:${s.nhom}:${s.brightness}`)
    .sort()
    .join('|');
}

let checkedPalaces = 0;
let checkedStars = 0;

for (const fx of fixtures) {
  const { d, m, y, gioIdx, gender, namXem } = fx.input;
  const label = `${d}/${m}/${y} giờ${gioIdx} ${gender}`;
  let conv, ls;
  try {
    conv = E.convertDuongToAm(d, m, y, GIO_HOURS[gioIdx]);
    const al = conv.amLich;
    ls = E.anSaoLaSo({
      ngayAL: al.day,
      thangAL: al.month,
      namAL: al.year,
      canNam: conv.canNam,
      chiNam: conv.chiNam,
      gioIdx,
      gioitinh: gender,
      namXem,
    });
  } catch (e) {
    fail(`${label}: engine ném lỗi khi dựng lại — ${e.message}`);
    continue;
  }

  const want = fx.output;
  const SCALAR_FIELDS = [
    'canChiNam',
    'napAm',
    'amDuong',
    'cuc',
    'canMenh',
    'menhDC',
    'thanDC',
    'menhIdx',
    'thanIdx',
    'napAmHanh',
    'tieuHanIdx',
    'chiNamXem',
    'luuNienDaiHanIdx',
  ];
  for (const f of SCALAR_FIELDS) {
    if (JSON.stringify(ls[f]) !== JSON.stringify(want[f])) {
      fail(
        `${label}: trường "${f}" lệch — fixture=${JSON.stringify(want[f])} vs hiện tại=${JSON.stringify(ls[f])}`
      );
    }
  }

  if (JSON.stringify(want.menhThaiTue) !== JSON.stringify(ls.menhThaiTue)) {
    fail(
      `${label}: menhThaiTue lệch — fixture=${JSON.stringify(want.menhThaiTue)} vs hiện tại=${JSON.stringify(ls.menhThaiTue)}`
    );
  }

  const gotDaiVans = ls.daiVans.map((v) => ({
    cungIdx: v.cungIdx,
    diaChi: v.diaChi,
    tuoiStart: v.tuoiStart,
    tuoiEnd: v.tuoiEnd,
  }));
  if (JSON.stringify(gotDaiVans) !== JSON.stringify(want.daiVans)) {
    fail(`${label}: daiVans (cung/tuổi khởi) lệch`);
  }

  for (const wp of want.palaces) {
    checkedPalaces++;
    const gp = ls.palaces.find((p) => p.idx === wp.idx);
    if (!gp) {
      fail(`${label}: mất cung idx=${wp.idx}`);
      continue;
    }
    if (
      gp.diaChi !== wp.diaChi ||
      gp.cungName !== wp.cungName ||
      gp.isMenh !== wp.isMenh ||
      gp.isThan !== wp.isThan
    ) {
      fail(`${label}: cung idx=${wp.idx} — diaChi/cungName/isMenh/isThan lệch`);
    }
    checkedStars += wp.stars.length;
    const gotStars = gp.stars.map((s) => ({
      ten: s.ten,
      hoa: s.hoa,
      nhom: s.nhom,
      brightness: s.brightness,
    }));
    if (starSetKey(gotStars) !== starSetKey(wp.stars)) {
      const wantSet = new Set(wp.stars.map((s) => s.ten));
      const gotSet = new Set(gotStars.map((s) => s.ten));
      const missing = [...wantSet].filter((n) => !gotSet.has(n));
      const extra = [...gotSet].filter((n) => !wantSet.has(n));
      const changedBrightnessOrHoa = wp.stars
        .filter((s) => gotSet.has(s.ten))
        .map((s) => ({ want: s, got: gotStars.find((g2) => g2.ten === s.ten) }))
        .filter(
          ({ want: w2, got: g2 }) =>
            w2.hoa !== g2.hoa || w2.brightness !== g2.brightness || w2.nhom !== g2.nhom
        );
      fail(
        `${label}: cung idx=${wp.idx} (${wp.cungName}) sao lệch — ` +
          (missing.length ? `mất: ${missing.join(',')} ` : '') +
          (extra.length ? `thừa: ${extra.join(',')} ` : '') +
          (changedBrightnessOrHoa.length
            ? `đổi hoa/sáng-tối: ${changedBrightnessOrHoa.map((c) => c.want.ten).join(',')}`
            : '')
      );
    }
  }
}

console.log(`Đã kiểm ${fixtures.length} lá số, ${checkedPalaces} cung, ${checkedStars} lượt sao.`);

if (failed) {
  console.error(`\n✗ check:laso-golden — ${failed} lệch so với fixture đã đóng băng.`);
  console.error('  Nếu đây là thay đổi CỐ Ý (đang làm P1-P4 theo workplan): đối chiếu với');
  console.error(
    '  scripts/oracle/check-ansao-exhaustive.mjs trước, rồi mới `node scripts/gen-laso-golden.mjs` để cập nhật fixture.'
  );
  process.exit(1);
}
console.log('\n✓ check:laso-golden — khớp fixture, không có trôi vị trí sao.');
