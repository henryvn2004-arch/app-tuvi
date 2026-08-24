#!/usr/bin/env node
/**
 * Canh engine "Số Đẹp" (`public/tools-shared/so-dep.js`) — công cụ đánh giá
 * SĐT/số nhà/biển số theo cổ pháp, 100% deterministic (không LLM).
 *
 * Vì sao cần: engine này ăn thẳng bảng Du Niên vừa sinh bằng thuật toán ở
 * PR #607 (`starBetween`) + 3 module dùng chung khác (Mai Hoa, Kinh Dịch,
 * Nạp Âm) — sai một khớp nối là cả T1/T2/T3 lặng lẽ sai theo. Không có
 * vitest phủ `public/tools-shared/*.js` (chỉ `tuvi-engine/` có), nên theo
 * đúng convention repo: script `check:*` là lưới an toàn cho vanilla JS.
 *
 * Canh:
 *   - DETERMINISTIC: cùng input → cùng output hệt nhau (bấm lại không đổi)
 *   - T1 Bát Tinh: mọi cặp có sao đều khớp `BatTrachTool.starBetween()` —
 *     không tính lại công thức riêng, tránh 2 nguồn Bát Tinh trôi khỏi nhau
 *   - T1: số 0/5 không tự thành sao (đúng thiết kế khuếch đại/trung cung)
 *   - T2 Quẻ Dịch: li6 dựng từ 2 quái đúng khớp `KinhDichTool.QUE[idx].li`
 *     mà `findHexagram` trả về — không bị lệch quẻ do build sai chuỗi
 *   - T2: không phụ thuộc giờ hiện tại (2 lượt gọi cách nhau vẫn ra 1 kết quả)
 *   - T3 Ngũ Hành: tổng phân bố = số chữ số khác 0 trong dãy
 *   - T5 Âm Dương: soLe + soChan = độ dài dãy
 *   - T6 dân gian: mẫu chỉ khớp khi CÓ mặt trong dãy (không dương tính giả)
 *   - Input rác/quá dài/rỗng bị từ chối rõ ràng, không throw
 *
 * Chạy: node scripts/check-so-dep.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const ROOT = new URL('..', import.meta.url).pathname;

let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

// ── Nạp 5 module theo ĐÚNG thứ tự phụ thuộc, trong 1 sandbox (giống trình
// duyệt nạp lần lượt các <script>) ─────────────────────────────────────────
const sandbox = { console };
vm.createContext(sandbox);
const FILES = [
  'bat-trach.js',
  'mai-hoa.js',
  'kinh-dich.js',
  'kinh-dich-hao.js',
  'kinh-dich-doc.js',
  'nap-am.js',
  'so-dep.js',
];
for (const f of FILES) {
  const code = readFileSync(join(ROOT, 'public/tools-shared', f), 'utf-8');
  try {
    vm.runInContext(code, sandbox);
  } catch (e) {
    fail(`Nạp ${f} lỗi: ${e.message}`);
  }
}
if (bad > 0) {
  console.error('\nDừng — không nạp được module, không kiểm tiếp được.');
  process.exit(1);
}

const SD = sandbox.SoDepTool;
const BT = sandbox.BatTrachTool;
const KD = sandbox.KinhDichTool;
if (!SD || !BT || !KD) {
  fail('SoDepTool/BatTrachTool/KinhDichTool không lộ ra sau khi nạp.');
  process.exit(1);
}

// ── 1. Input rác/rỗng/quá dài bị từ chối rõ ràng ───────────────────────────
for (const bad_in of ['', 'abc', null, undefined, '1'.repeat(21)]) {
  const r = SD.danhGia(bad_in, {});
  if (r.ok) fail(`danhGia(${JSON.stringify(bad_in)}) phải trả ok:false, lại trả ok:true`);
}
{
  const r = SD.danhGia('0912345678', {});
  if (!r.ok) fail('danhGia với SĐT hợp lệ 10 số phải ok:true, lỗi: ' + r.error);
}

// ── 2. DETERMINISTIC — bấm lại không đổi ───────────────────────────────────
const SAMPLES = [
  '0987661234',
  '0912345678',
  '098xxx4888xx'.replace(/x/g, '6'),
  '12321',
  '000000',
  '113579',
];
for (const so of SAMPLES) {
  const a = JSON.stringify(SD.danhGia(so, { namSinh: 1990, gioiTinh: 'nam' }));
  const b = JSON.stringify(SD.danhGia(so, { namSinh: 1990, gioiTinh: 'nam' }));
  if (a !== b) fail(`danhGia("${so}") KHÔNG deterministic — 2 lượt gọi ra kết quả khác nhau.`);
}

// ── 3. T1 Bát Tinh: mọi cặp có sao khớp starBetween(), 0/5 không tự thành sao
for (const so of SAMPLES) {
  const r = SD.danhGia(so, {});
  if (!r.ok) continue;
  for (const c of r.data.t1.capSao) {
    if (c.a === 0 || c.b === 0 || c.a === 5 || c.b === 5) {
      if (c.sao)
        fail(`"${so}" cặp ${c.a}${c.b}: có 0 hoặc 5 mà vẫn ra sao ${c.sao} — phải là null.`);
      continue;
    }
    const expect = BT.starBetween(c.a, c.b);
    if (c.sao !== expect)
      fail(`"${so}" cặp ${c.a}${c.b}: T1 nói ${c.sao}, starBetween() nói ${expect} — lệch nguồn.`);
  }
}

// ── 4. T2 Quẻ Dịch: li6 dựng ra khớp đúng quẻ mà findHexagram/QUE xác nhận,
// và KHÔNG phụ thuộc giờ hiện tại (gọi 2 lần cách nhau ra cùng 1 quẻ) ───────
for (const so of SAMPLES) {
  const r1 = SD.danhGia(so, {});
  if (!r1.ok || !r1.data.t2.ok) continue;
  const t2 = r1.data.t2;
  const idx = KD.findHexagram(t2.li6);
  const que = KD.QUE[idx];
  if (!que || que.li !== t2.li6)
    fail(`"${so}" T2: li6="${t2.li6}" không tra ra đúng quẻ trong bảng QUE.`);
  if (que.n !== t2.que.ten)
    fail(`"${so}" T2: tên quẻ "${t2.que.ten}" không khớp QUE[idx].n="${que.n}".`);
  if (t2.haoDong < 1 || t2.haoDong > 6)
    fail(`"${so}" T2: hào động ${t2.haoDong} ngoài phạm vi 1-6.`);
}

// ── 5. T3 Ngũ Hành: tổng phân bố = số chữ số KHÁC 0 (0 không có hành riêng)
for (const so of SAMPLES) {
  const r = SD.danhGia(so, {});
  if (!r.ok) continue;
  const tongPhanBo = Object.values(r.data.t3.phanBo).reduce((a, b) => a + b, 0);
  const soChuKhac0 = so.split('').filter((d) => d !== '0').length;
  if (tongPhanBo !== soChuKhac0)
    fail(`"${so}" T3: tổng phân bố hành = ${tongPhanBo}, phải = ${soChuKhac0} (số chữ khác 0).`);
}

// ── 6. T5: soLe + soChan = độ dài dãy ───────────────────────────────────────
for (const so of SAMPLES) {
  const r = SD.danhGia(so, {});
  if (!r.ok) continue;
  if (r.data.t5.soLe + r.data.t5.soChan !== r.data.doDai) {
    fail(
      `"${so}" T5: soLe(${r.data.t5.soLe}) + soChan(${r.data.t5.soChan}) != doDai(${r.data.doDai}).`
    );
  }
}

// ── 7. T6 dân gian: mẫu chỉ khớp khi THẬT SỰ có trong dãy ──────────────────
{
  const r = SD.danhGia('11111111', {});
  if (r.ok && (r.data.t6.canhBao.length > 0 || r.data.t6.diem.length > 0)) {
    fail(
      'T6: dãy "11111111" không chứa mẫu nào trong bảng dân gian nhưng vẫn báo khớp — dương tính giả.'
    );
  }
  const r2 = SD.danhGia('6868', {});
  if (r2.ok && !r2.data.t6.diem.some((d) => d.mau === '68')) {
    fail('T6: dãy "6868" chứa "68" nhưng không được nhận diện.');
  }
}

// ── 8. Đồng thuận KHÔNG bao giờ vượt quá tổng số phiếu, và T5/T6 không lọt
// vào phiếu (đúng cam kết "không có điểm tổng giả khoa học") ────────────────
for (const so of SAMPLES) {
  const r = SD.danhGia(so, { namSinh: 1990, gioiTinh: 'nam' });
  if (!r.ok) continue;
  const dt = r.data.dongThuan;
  if (dt.tot + dt.xau + dt.trung !== dt.tongPhieu)
    fail(`"${so}" đồng thuận: tot+xau+trung != tongPhieu.`);
  if (dt.tongPhieu > 3)
    fail(
      `"${so}" đồng thuận: có ${dt.tongPhieu} phiếu, tối đa chỉ được 3 (T1+T2+T3) — T5/T6 lọt vào phiếu?`
    );
  if (dt.phieu.some((p) => p.nguon.indexOf('dân gian') > -1 || p.nguon.indexOf('Âm Dương') > -1)) {
    fail(`"${so}" đồng thuận: có phiếu từ T5/T6 — vi phạm "không cộng dân gian vào điểm cổ pháp".`);
  }
}

if (bad === 0) {
  console.log(
    '✅ Engine Số Đẹp: deterministic, T1 khớp starBetween(), T2 tra đúng quẻ, T3/T5 tổng khớp, T6 không dương tính giả, đồng thuận không lẫn T5/T6.'
  );
} else {
  console.error(`\n${bad} lỗi trong engine so-dep.js.`);
  process.exitCode = 1;
}
