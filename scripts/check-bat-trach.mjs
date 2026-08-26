#!/usr/bin/env node
/**
 * Canh bảng Du Niên Bát Trạch (`public/tools-shared/bat-trach.js`) — nguồn
 * DUY NHẤT cho cung mệnh + 8 sao (Sinh Khí…Tuyệt Mệnh) của mọi tool phong
 * thủy trong repo.
 *
 * Vì sao cần: repo từng có 3 bản chép tay độc lập (bat-trach.js cũ, GUA_DATA
 * lặp ở 7 trang Vision, GUA trong route.ts) — cả 3 TỰ MÂU THUẪN (không đối
 * xứng) và sai khác nhau 12-15/64 ô. Bảng giờ SINH bằng thuật toán (XOR nhị
 * phân quái), nhưng thuật toán cũng có thể gõ sai — script này canh:
 *   - mỗi cung đủ 4 sao cát + 4 sao hung, không thiếu/trùng
 *   - ĐỐI XỨNG: cung A nhìn cung B ra sao X thì cung B nhìn cung A cũng phải
 *     ra sao X (bắt buộc về mặt cổ pháp — không đối xứng là bảng sai)
 *   - Đông Tứ Mệnh chỉ có 4 hướng cát nằm trong Đông Tứ Trạch {N,E,SE,S},
 *     Tây Tứ Mệnh chỉ nằm trong Tây Tứ Trạch {W,NW,NE,SW} — không lẫn nhóm
 *   - getCungMenh() khớp 2 điểm neo đã tra cứu độc lập (VN + quốc tế)
 *   - KHÔNG còn bảng Du Niên chép tay nào tái xuất hiện ngoài bat-trach.js
 *
 * Bộ dò tự red-team: trước khi chạy check thật, phá đối xứng trên MỘT bảng
 * giả rồi xác nhận hàm kiểm tra bắt được — chứng minh bộ dò có "răng", không
 * phải luôn xanh vì đường phá không khớp.
 *
 * Chạy: node scripts/check-bat-trach.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const code = readFileSync(join(ROOT, 'public/tools-shared/bat-trach.js'), 'utf-8');
const mod = { exports: {} };
new Function('module', 'exports', code)(mod, mod.exports);
const BT = mod.exports;

let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const CUNGS = [1, 2, 3, 4, 6, 7, 8, 9];
const STAR8 = [
  'Sinh Khí',
  'Thiên Y',
  'Diên Niên',
  'Phục Vị',
  'Họa Hại',
  'Lục Sát',
  'Ngũ Quỷ',
  'Tuyệt Mệnh',
];
const DONG_TRACH = new Set(['N', 'E', 'SE', 'S']);
const TAY_TRACH = new Set(['W', 'NW', 'NE', 'SW']);

// ── 0. Red-team: bộ dò phải BẮT được bảng giả bị phá đối xứng ─────────────
function checkSymmetry(table) {
  // table: cung -> { good:{star:dir}, bad:{star:dir} }
  let ok = true;
  for (const a of CUNGS) {
    for (const b of CUNGS) {
      if (a === b) continue;
      const all = { ...table[a].good, ...table[a].bad };
      const dirOfB = BT.CUNG_DIR[b];
      const starAB = Object.entries(all).find(([, d]) => d === dirOfB)?.[0];
      const allB = { ...table[b].good, ...table[b].bad };
      const dirOfA = BT.CUNG_DIR[a];
      const starBA = Object.entries(allB).find(([, d]) => d === dirOfA)?.[0];
      if (starAB !== starBA) ok = false;
    }
  }
  return ok;
}
{
  const fakeGood = {};
  for (const c of CUNGS) fakeGood[c] = BT.duNienStars(c);
  // Phá đối xứng có chủ đích: đổi hướng Sinh Khí của cung 1 thành hướng của
  // Ngũ Quỷ — hai cung liên quan (4 và 8) sẽ không còn khớp ngược lại.
  const broken = JSON.parse(JSON.stringify(fakeGood));
  const tmp = broken[1].good['Sinh Khí'];
  broken[1].good['Sinh Khí'] = broken[1].bad['Ngũ Quỷ'];
  broken[1].bad['Ngũ Quỷ'] = tmp;
  if (checkSymmetry(broken)) {
    fail(
      'RED-TEAM: hàm kiểm đối xứng KHÔNG bắt được bảng đã bị phá — tự kiểm tra hỏng, sửa checkSymmetry() trước khi tin kết quả bên dưới.'
    );
  } else if (!checkSymmetry(fakeGood)) {
    fail(
      'RED-TEAM: bảng THẬT (chưa phá) lại bị báo lệch đối xứng — hàm kiểm đối xứng có lỗi dương tính giả.'
    );
  } else {
    console.log(
      '✅ Red-team: hàm kiểm đối xứng bắt đúng bảng giả bị phá, không báo nhầm bảng thật.'
    );
  }
}

// ── 1. Mỗi cung đủ 4 cát + 4 hung, không thiếu/trùng ───────────────────────
const realTable = {};
for (const c of CUNGS) {
  const t = BT.duNienStars(c);
  realTable[c] = t;
  const all = [...Object.keys(t.good), ...Object.keys(t.bad)];
  const uniq = new Set(all);
  if (uniq.size !== 8) fail(`cung ${c}: phải có đủ 8 sao không trùng, đang có ${all.join(', ')}`);
  for (const s of STAR8) if (!(s in t.good) && !(s in t.bad)) fail(`cung ${c}: thiếu sao ${s}`);
  if (Object.keys(t.good).length !== 4)
    fail(`cung ${c}: phải có đúng 4 sao cát, đang có ${Object.keys(t.good).length}`);
  if (Object.keys(t.bad).length !== 4)
    fail(`cung ${c}: phải có đúng 4 sao hung, đang có ${Object.keys(t.bad).length}`);
}

// ── 2. Đối xứng thật ────────────────────────────────────────────────────
if (!checkSymmetry(realTable)) {
  fail('Bảng Du Niên thật KHÔNG đối xứng — có lỗi trong duNienStars()/GUA_BIN/STAR_BY_XOR.');
}

// ── 3. Đông Tứ Mệnh chỉ cát ở Đông Tứ Trạch, Tây tương tự ──────────────────
for (const c of CUNGS) {
  const nhom = BT.NHOM[c];
  const catDirs = Object.values(realTable[c].good);
  const expect = nhom === 'Đông' ? DONG_TRACH : TAY_TRACH;
  for (const d of catDirs) {
    if (!expect.has(d))
      fail(`cung ${c} (${nhom} Tứ Mệnh): hướng cát ${d} không thuộc ${nhom} Tứ Trạch — lẫn nhóm.`);
  }
}

// ── 4. getCungMenh() khớp 2 điểm neo tra cứu độc lập (VN + quốc tế) ────────
const anchors = [
  {
    nam: 1990,
    gioitinh: 'nam',
    want: 1,
    note: 'nam 1990 → Khảm (khớp cách tính mệnh quái phổ biến VN + quốc tế)',
  },
  { nam: 2003, gioitinh: 'nam', want: 6, note: 'nam 2003 → cung 6 (ví dụ mốc sau-2000 đã tra)' },
];
for (const a of anchors) {
  const got = BT.getCungMenh(a.nam, a.gioitinh);
  if (got !== a.want)
    fail(`getCungMenh(${a.nam}, ${a.gioitinh}) = ${got}, phải = ${a.want} — ${a.note}`);
}
// getCungMenh không được rơi vào 5 hoặc ra ngoài [1..9]\{5}
for (let y = 1900; y <= 2035; y++) {
  for (const g of ['nam', 'nu']) {
    const c = BT.getCungMenh(y, g);
    if (c === 5 || c < 1 || c > 9)
      fail(
        `getCungMenh(${y}, ${g}) = ${c} — cung không hợp lệ (5 phải được quy về 2/8 ở compute(), nhưng hàm gốc không được trả 5 hoặc ngoài phạm vi).`
      );
  }
}

// ── 5. Không còn bảng Du Niên chép tay nào khác trong repo ─────────────────
// Chữ ký nhận diện CHÍNH XÁC (không phải đếm tên sao rời rạc, tránh dương
// tính giả với lookup theo TÊN SAO như STAR_DESC): một HƯỚNG (N/S/E/W/NE/NW/
// SE/SW) làm KHOÁ object ánh xạ thẳng sang TÊN SAO — đúng hình dạng
// `{SE:'Sinh Khí', ...}` (GUA_DATA cũ) hoặc `dir:'SE', cat:'Sinh Khí'` (mảng
// cũ của huong-nha-phong-thuy.html). ≥3 lần khớp trong 1 file mới báo, vì
// bảng thật luôn có ít nhất 4 cặp — 1-2 lần khớp rời rạc không đủ là bảng.
const STAR_RE = '(Sinh Khí|Thiên Y|Diên Niên|Phục Vị|Họa Hại|Lục Sát|Ngũ Quỷ|Tuyệt Mệnh)';
const DIR_RE = '(N|S|E|W|NE|NW|SE|SW)';
const SIG_A = new RegExp(`\\b${DIR_RE}\\s*:\\s*['"]${STAR_RE}['"]`, 'g');
const SIG_B = new RegExp(
  `dir\\s*:\\s*['"]${DIR_RE}['"]\\s*,\\s*cat\\s*:\\s*['"]${STAR_RE}['"]`,
  'g'
);

function walk(dir, exts, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '.next' || name === 'tuvi-engine')
      continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
}
const files = [];
walk(join(ROOT, 'public'), ['.html', '.js'], files);
walk(join(ROOT, 'app'), ['.ts', '.tsx'], files);
walk(join(ROOT, 'lib'), ['.ts'], files);

const ALLOW = new Set([
  join(ROOT, 'public/tools-shared/bat-trach.js'),
  join(ROOT, 'lib/engine/bat-trach.ts'),
]);
for (const f of files) {
  if (ALLOW.has(f)) continue;
  const src = readFileSync(f, 'utf-8');
  const hitsA = src.match(SIG_A) || [];
  const hitsB = src.match(SIG_B) || [];
  if (hitsA.length >= 3 || hitsB.length >= 3) {
    fail(
      `${f.replace(ROOT, '')}: có vẻ chứa bảng Du Niên chép tay (${hitsA.length + hitsB.length} cặp "hướng→sao" trực tiếp) — dùng BatTrachTool.duNienStars()/guaDataLegacy() thay vì chép hằng số.`
    );
  }
}

if (bad === 0) {
  console.log(
    `✅ Bảng Du Niên đối xứng, đủ 8 cung × 8 sao, đúng nhóm Đông/Tây Tứ Mệnh, getCungMenh khớp 2 điểm neo, không còn bảng chép tay nào ngoài bat-trach.js.`
  );
} else {
  console.error(
    `\n${bad} lỗi trong bảng Bát Trạch — ảnh hưởng trực tiếp tool /tools/bat-trach.html, huong-nha-phong-thuy, phong-thuy, cua-hang-phong-thuy, ban-lam-viec + engine cá nhân hoá tool số đẹp sắp tới.`
  );
  process.exitCode = 1;
}
