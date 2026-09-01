#!/usr/bin/env node
// scripts/oracle/verify-tieuhan.mjs
// ============================================================
// P3 — Tiểu Hạn đổi sang trường phái Thiên Lương (Dương Nam/Âm Nữ thuận, Âm
// Nam/Dương Nữ nghịch — trước đây CỐ ĐỊNH theo giới, bất kể âm dương năm sinh).
// Tiểu Hạn KHÔNG phải "sao" nên nằm ngoài check-ansao-exhaustive.mjs — bộ dò
// này bù việc đó: đối chiếu VÉT CẠN 60 can-chi × 2 giới × 12 tuổi (1.440 ca,
// đủ 1 chu kỳ 12 năm) với oracle. Gate CI (xem lint.yml) — exit non-zero khi
// lệch. Red-team: revert tạm công thức, xác nhận báo đỏ đúng lệch cũ.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let loadOracle;
try {
  ({ loadOracle } = await import('./load.mjs'));
} catch (e) {
  console.error('✗ Không nạp được scripts/oracle/load.mjs:', e.message);
  process.exit(1);
}
let O;
try {
  O = loadOracle();
} catch (e) {
  console.log('⚠ ' + e.message);
  console.log(
    '  (bỏ qua verify-tieuhan — thiếu scripts/oracle/vendor/, không gate được ở máy này)'
  );
  process.exit(0);
}

const g = globalThis;
g.window = g;
if (!g.location) g.location = { protocol: 'https:', hostname: 'x', href: 'https://x/' };
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const ours = new Function('window', 'globalThis', engineSrc + '\nreturn {anSaoLaSo};')(g, g);

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

let total = 0;
const bad = [];
for (let ci = 0; ci < 10; ci++) {
  for (let cj = 0; cj < 12; cj++) {
    if (ci % 2 !== cj % 2) continue; // 60 cặp can-chi hợp lệ
    for (const g2 of [
      { our: 'nam', oracle: 'Nam' },
      { our: 'nu', oracle: 'Nữ' },
    ]) {
      for (let tuoi = 1; tuoi <= 12; tuoi++) {
        total++;
        // Gọi thẳng anSaoLaSo lấy tieuHanIdx qua kết quả trả về (namXem suy từ tuổi).
        const ls = ours.anSaoLaSo({
          ngayAL: 1,
          thangAL: 1,
          namAL: 1990,
          canNam: CAN[ci],
          chiNam: CHI[cj],
          gioIdx: 0,
          gioitinh: g2.our,
          namXem: 1990 + tuoi - 1,
        });
        const ourIdx = ls.tieuHanIdx;
        // viewChi là SỰ KIỆN LỊCH: chi của năm dương tương ứng luôn tiến +1 mỗi
        // năm, KHÔNG phụ thuộc hướng thuận/nghịch của thuật toán tiểu hạn (hướng
        // đó chỉ quyết định CUNG, không quyết định chi của năm đang xem) — nếu
        // suy viewChi từ dir rồi đưa lại vào tieuHanBranch (tự áp dir lần nữa)
        // thì dir² = 1 tự triệt tiêu, luôn ra chiều thuận giả — đã vấp bẫy này.
        const birthChi = cj + 1;
        const viewChi = ((((birthChi - 1 + (tuoi - 1)) % 12) + 12) % 12) + 1;
        const oracleBranch = O.tieuHanBranch(birthChi, viewChi, ci + 1, g2.oracle);
        const oracleIdx = oracleBranch - 1;
        if (ourIdx !== oracleIdx) {
          bad.push(
            `${CAN[ci]} ${CHI[cj]} ${g2.our} tuổi ${tuoi}: ours=${ourIdx} oracle=${oracleIdx}`
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
  console.log('✓ Tiểu Hạn khớp 100% oracle trên toàn miền 60 can-chi × 2 giới × 12 tuổi.');
}
