#!/usr/bin/env node
// scripts/check-sao-luu.mjs
// ============================================================
// Canh SAO LƯU NĂM XEM (`anSaoLuuNam` / `danhGiaSaoLuu`, public/tuvi-ansao-engine.js)
// theo nguồn chính Văn Đằng Thái Thứ Lang mục 4.1–4.4 (Henry chốt 2026-09-29).
//
// 1. Mọi VÍ DỤ trong sách phải ra đúng (năm Mùi, Ất Mùi, năm Tý).
// 2. Luật hình học đúng trên CẢ 60 năm can chi: Tang = Thái Tuế +2, Hổ xung Tang,
//    Kình = Lộc +1, Đà = Lộc −1 (CỐ ĐỊNH, không đảo theo giới như Kình/Đà gốc).
// 3. Lưu Lộc Tồn / Lưu Thiên Mã dùng CÙNG bảng với sao gốc (Lộc Tồn/Thiên Mã của
//    người sinh cùng can/chi) — hai bảng không được trôi khỏi nhau.
// 4. Sao lưu KHÔNG lọt vào `palaces[].stars` (mọi chấm điểm/cách cục gốc đọc mảng đó).
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const g = globalThis;
g.window = g;
if (!g.location)
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    href: 'https://tuviminhbao.com/',
  };
const src = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const E = new Function(
  'window',
  'globalThis',
  src + '\nreturn {anSaoLuuNam, anSaoLaSo, convertDuongToAm, DIA_CHI, THIEN_CAN};'
)(g, g);

let failed = 0;
const fail = (m) => {
  console.error('  ✗ ' + m);
  failed++;
};
const DC = E.DIA_CHI;
const at = (L, ten) => DC[L.sao[ten]];

// Năm Ất Mùi gần nhất: 2015.
const mui = E.anSaoLuuNam(2015);
if (mui.canNamXem !== 'Ất' || mui.chiNamXem !== 'Mùi')
  fail(`2015 phải là Ất Mùi, ra ${mui.canNamXem} ${mui.chiNamXem}`);
const expMui = {
  'Lưu Thái Tuế': 'Mùi',
  'Lưu Tang Môn': 'Dậu',
  'Lưu Bạch Hổ': 'Mão',
  'Lưu Thiên Khốc': 'Hợi',
  'Lưu Thiên Hư': 'Sửu',
  'Lưu Lộc Tồn': 'Mão',
  'Lưu Kình Dương': 'Thìn',
  'Lưu Đà La': 'Dần',
};
for (const [ten, dc] of Object.entries(expMui))
  if (at(mui, ten) !== dc) fail(`Ví dụ sách (Ất Mùi): ${ten} phải ở ${dc}, ra ${at(mui, ten)}`);
const ty = E.anSaoLuuNam(2020); // Canh Tý
if (at(ty, 'Lưu Thiên Mã') !== 'Dần')
  fail(`Ví dụ sách (năm Tý): Lưu Thiên Mã phải ở Dần, ra ${at(ty, 'Lưu Thiên Mã')}`);

const m12 = (n) => ((n % 12) + 12) % 12;
for (let y = 1984; y < 2044; y++) {
  const L = E.anSaoLuuNam(y);
  const s = L.sao;
  if (s['Lưu Thái Tuế'] !== DC.indexOf(L.chiNamXem))
    fail(`${y}: Lưu Thái Tuế không ở cung chi năm`);
  if (s['Lưu Tang Môn'] !== m12(s['Lưu Thái Tuế'] + 2)) fail(`${y}: Lưu Tang Môn ≠ Thái Tuế +2`);
  if (s['Lưu Bạch Hổ'] !== m12(s['Lưu Tang Môn'] + 6))
    fail(`${y}: Lưu Bạch Hổ không xung Lưu Tang Môn`);
  if (s['Lưu Kình Dương'] !== m12(s['Lưu Lộc Tồn'] + 1)) fail(`${y}: Lưu Kình ≠ Lộc +1`);
  if (s['Lưu Đà La'] !== m12(s['Lưu Lộc Tồn'] - 1)) fail(`${y}: Lưu Đà ≠ Lộc −1`);
  if (Object.keys(s).length !== 9) fail(`${y}: phải đúng 9 sao lưu, có ${Object.keys(s).length}`);
}

// Bảng Lộc Tồn / Thiên Mã: người sinh năm Y có Lộc Tồn & Thiên Mã GỐC trùng Lưu
// Lộc Tồn & Lưu Thiên Mã của năm Y.
for (const y of [1990, 1991, 1994, 1996, 1998, 2001, 2003, 2005, 2008, 2012]) {
  const conv = E.convertDuongToAm(15, 6, y, 10);
  const { canNam, chiNam } = conv;
  const ls = E.anSaoLaSo({
    ngayAL: conv.amLich.day,
    thangAL: conv.amLich.month,
    namAL: conv.amLich.year,
    canNam,
    chiNam,
    gioIdx: 5,
    gioitinh: 'nam',
    namXem: y,
  });
  const L = E.anSaoLuuNam(conv.amLich.year);
  const posOf = (ten) => ls.palaces.findIndex((p) => p.stars.some((st) => st.ten === ten));
  if (posOf('Lộc Tồn') !== L.sao['Lưu Lộc Tồn'])
    fail(`${y}: bảng Lưu Lộc Tồn trôi khỏi bảng Lộc Tồn gốc`);
  if (posOf('Thiên Mã') !== L.sao['Lưu Thiên Mã'])
    fail(`${y}: bảng Lưu Thiên Mã trôi khỏi bảng Thiên Mã gốc`);
  if (
    ls.palaces.some((p) =>
      p.stars.some(
        (st) =>
          String(st.ten).startsWith('Lưu ') &&
          st.ten !== 'Lưu Hà' &&
          !String(st.ten).startsWith('Lưu Niên')
      )
    )
  )
    fail(`${y}: sao lưu lọt vào palaces[].stars`);
  const nLuu = ls.palaces.reduce(
    (n, p) => n + (p.luuStars || []).filter((x) => x.loai === 'luu').length,
    0
  );
  if (nLuu !== 9) fail(`${y}: luuStars phải có đủ 9 sao lưu, có ${nLuu}`);
  if (!ls.saoLuu || !Array.isArray(ls.saoLuu.diemNong)) fail(`${y}: thiếu ls.saoLuu.diemNong`);
}

if (failed) {
  console.error(
    `\n✗ check:saoluu — ${failed} lỗi. Nguồn: Thái Thứ Lang mục 4.1–4.4 (xem chú thích trên anSaoLuuNam).`
  );
  process.exit(1);
}
console.log(
  '✓ check:saoluu — 9 sao lưu khớp ví dụ Thái Thứ Lang, đúng luật trên 60 năm, không lọt vào sao gốc.'
);
