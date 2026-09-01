#!/usr/bin/env node
// scripts/gen-laso-golden.mjs
// ============================================================
// Đóng băng ~N lá số THẬT từ engine HIỆN TẠI (public/tuvi-ansao-engine.js)
// ra scripts/fixtures/laso-golden.json — bộ dò hồi quy chính cho P0.
//
// Đây KHÔNG phải "bằng chứng đúng" (dùng oracle cho việc đó, xem
// scripts/oracle/) — đây là ẢNH CHỤP hành vi hiện tại, để MỌI thay đổi sau
// này (kể cả không cố ý) hiện thành DIFF đọc được, thay vì im lặng trôi.
//
// Chạy lại (ghi đè fixture) CHỈ khi cố ý đổi engine và đã đối chiếu xong với
// oracle — không chạy lại để "cho xanh".
//
// Dùng: node scripts/gen-laso-golden.mjs
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const g = globalThis;
g.window = g;
if (!g.location) {
  g.location = { protocol: 'https:', hostname: 'tuviminhbao.com', href: 'https://tuviminhbao.com/' };
}
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const E = new Function('window', 'globalThis', engineSrc + '\nreturn {anSaoLaSo, convertDuongToAm};')(g, g);

// 4 ngày sinh trải điều kiện (giống bộ mẫu của check-laso-markers.mjs, cộng
// thêm 1 ca năm nhuận để phủ biên) — nhân với đủ 12 giờ × 2 giới.
const BIRTH_DATES = [
  [3, 6, 1998], // dương nam thường
  [9, 5, 1984], // giáp tý — năm bắt đầu lục thập hoa giáp
  [21, 11, 1991], // âm nữ
  [15, 2, 2003], // sát Tết
  [12, 8, 2026], // sát mốc trăng non nhạy cảm (xem docs/nhat-ky)
];
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]; // 0=Tý .. 11=Hợi
const GENDERS = ['nam', 'nu'];
const NAM_XEM = 2026; // cố định — fixture phải tái lập được, không phụ thuộc "hôm nay"

// CHỈ giữ phần AN SAO (đúng phạm vi P0: "mọi thay đổi VỊ TRÍ SAO hiện thành
// diff"). Bỏ cachCuc/cachCucTungCung/cungScores/tieuVanScores/nguyetVanScores
// — đó là phân tích PHÁI SINH từ vị trí sao (~19MB cho 120 lá số nếu giữ hết,
// không hợp lý cho một fixture commit git); đổi vị trí sao đã tự hiện ra ở
// đây rồi, không cần fixture thứ hai cho lớp phân tích.
// Cũng bỏ tamHopCungs/xungChieuCung (VÒNG, JSON.stringify ném lỗi nếu giữ
// nguyên — xem lib/portraits/cache.ts).
function sanitize(ls) {
  const palaces = ls.palaces.map((p) => ({
    idx: p.idx,
    diaChi: p.diaChi,
    cungName: p.cungName,
    isMenh: p.isMenh,
    isThan: p.isThan,
    stars: p.stars.map((s) => ({ ten: s.ten, hoa: s.hoa, nhom: s.nhom, brightness: s.brightness })),
  }));
  return {
    canChiNam: ls.canChiNam,
    napAm: ls.napAm,
    amDuong: ls.amDuong,
    cuc: ls.cuc,
    canMenh: ls.canMenh,
    menhDC: ls.menhDC,
    thanDC: ls.thanDC,
    menhIdx: ls.menhIdx,
    thanIdx: ls.thanIdx,
    napAmHanh: ls.napAmHanh,
    menhThaiTue: ls.menhThaiTue,
    daiVans: ls.daiVans.map((v) => ({ cungIdx: v.cungIdx, diaChi: v.diaChi, tuoiStart: v.tuoiStart, tuoiEnd: v.tuoiEnd })),
    tieuHanIdx: ls.tieuHanIdx,
    chiNamXem: ls.chiNamXem,
    luuNienDaiHanIdx: ls.luuNienDaiHanIdx,
    palaces,
  };
}

const fixtures = [];
for (const [d, m, y] of BIRTH_DATES) {
  for (let gi = 0; gi < 12; gi++) {
    for (const gender of GENDERS) {
      const conv = E.convertDuongToAm(d, m, y, GIO_HOURS[gi]);
      if (!conv) throw new Error(`convertDuongToAm thất bại cho ${d}/${m}/${y} — ngoài biên bảng lịch âm?`);
      const al = conv.amLich;
      const ls = E.anSaoLaSo({
        ngayAL: al.day,
        thangAL: al.month,
        namAL: al.year,
        canNam: conv.canNam,
        chiNam: conv.chiNam,
        gioIdx: gi,
        gioitinh: gender,
        namXem: NAM_XEM,
      });
      fixtures.push({
        input: { d, m, y, gioIdx: gi, gender, namXem: NAM_XEM },
        output: sanitize(ls),
      });
    }
  }
}

const outPath = join(ROOT, 'scripts', 'fixtures', 'laso-golden.json');
writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + '\n', 'utf-8');
console.log(`✓ Đã ghi ${fixtures.length} lá số vào ${outPath.replace(ROOT + '/', '')}`);
