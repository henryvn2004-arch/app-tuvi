#!/usr/bin/env node
// scripts/check-la-vong.mjs
// ============================================================
// P4 (2026-09) — Thiên La/Địa Võng đổi từ 2 sao CỐ ĐỊNH tại Thìn/Tuất (mọi lá
// số) sang NHÃN của Đà La theo trường phái Thiên Lương: chỉ hiện khi Đà La
// rơi đúng Thìn (→"Thiên La") hoặc Tuất (→"Địa Võng"). Không cần oracle vendor
// — đây là tính TỰ NHẤT QUÁN của engine (Thiên La có mặt ⟺ Đà La ở Thìn; Địa
// Võng có mặt ⟺ Đà La ở Tuất; không bao giờ cả hai cùng lúc), tự kiểm được mà
// không cần nguồn ngoài. Đà La chỉ phụ thuộc (canNam, gioitinh) — vét cạn 10
// can × 2 giới = 20 ca là đủ phủ toàn miền, dư ra vài chiNam/gioIdx cho thực tế.
// Gate CI (xem lint.yml). Red-team: revert tạm về cố định, xác nhận báo đỏ.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const g = globalThis;
g.window = g;
if (!g.location) g.location = { protocol: 'https:', hostname: 'x', href: 'https://x/' };
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const { anSaoLaSo } = new Function('window', 'globalThis', engineSrc + '\nreturn {anSaoLaSo};')(
  g,
  g
);

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

function starPalace(ls, name) {
  const hits = ls.palaces.filter((p) => p.stars.some((s) => s.ten === name)).map((p) => p.diaChi);
  return hits;
}

let total = 0;
const bad = [];
for (let ci = 0; ci < 10; ci++) {
  for (let cj = 0; cj < 12; cj++) {
    if (ci % 2 !== cj % 2) continue; // 60 cặp can-chi hợp lệ
    for (const gioitinh of ['nam', 'nu']) {
      for (const gioIdx of [0, 6]) {
        total++;
        const ls = anSaoLaSo({
          ngayAL: 10,
          thangAL: 5,
          namAL: 1990,
          canNam: CAN[ci],
          chiNam: CHI[cj],
          gioIdx,
          gioitinh,
          namXem: 2026,
        });
        const daLaAt = starPalace(ls, 'Đà La');
        const thienLaAt = starPalace(ls, 'Thiên La');
        const diaVongAt = starPalace(ls, 'Địa Võng');
        if (daLaAt.length !== 1) {
          bad.push(
            `${CAN[ci]} ${CHI[cj]} ${gioitinh}: Đà La không đúng 1 vị trí (${daLaAt.join(',')})`
          );
          continue;
        }
        const daLaChi = daLaAt[0];
        const expectThienLa = daLaChi === 'Thìn' ? [daLaChi] : [];
        const expectDiaVong = daLaChi === 'Tuất' ? [daLaChi] : [];
        if (JSON.stringify(thienLaAt) !== JSON.stringify(expectThienLa)) {
          bad.push(
            `${CAN[ci]} ${CHI[cj]} ${gioitinh} giờ${gioIdx}: Đà La@${daLaChi}, Thiên La@[${thienLaAt}] kỳ vọng [${expectThienLa}]`
          );
        }
        if (JSON.stringify(diaVongAt) !== JSON.stringify(expectDiaVong)) {
          bad.push(
            `${CAN[ci]} ${CHI[cj]} ${gioitinh} giờ${gioIdx}: Đà La@${daLaChi}, Địa Võng@[${diaVongAt}] kỳ vọng [${expectDiaVong}]`
          );
        }
      }
    }
  }
}

console.log(`Tổng ca dò: ${total}`);
console.log(`Lệch: ${bad.length}`);
if (bad.length) {
  console.error(bad.slice(0, 20).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    '✓ La-Võng khớp quy tắc Thiên Lương trên toàn miền: Thiên La ⟺ Đà La@Thìn, Địa Võng ⟺ Đà La@Tuất, không bao giờ cả hai.'
  );
}
