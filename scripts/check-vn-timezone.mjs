#!/usr/bin/env node
/**
 * Canh NGUỒN DUY NHẤT của phép quy giờ sinh về hệ quy chiếu Việt Nam.
 *
 * 🔴 VÌ SAO. Người dùng nhập giờ sinh theo múi giờ nơi sinh; form quy về giờ VN
 * rồi mới lấy canh giờ. Dữ liệu người nổi tiếng phải đi qua ĐÚNG phép quy đổi
 * đó — hai bên lệch hệ quy chiếu thì mọi phép so "trùng giờ sinh" (badge
 * "CÙNG MỘT LÁ SỐ") đều vô nghĩa, mà KHÔNG có gì báo: canh giờ vẫn ra một con
 * số trông hoàn toàn hợp lệ.
 *
 * Ba hàm này trước nằm trong closure của `tuvi-form.js`, không export ra
 * `window.TuviForm`, nên Node không gọi được — đường mòn dễ đi nhất lúc đó là
 * CHÉP sang script import. Bộ dò này chặn đúng đường mòn ấy.
 *
 * Kiểm 4 thứ:
 *   1. `tuvi-form.js` KHÔNG tự khai lại ba hàm — phải lấy từ `window.VnTimezone`
 *   2. MỌI trang nạp `tuvi-form.js` cũng nạp `vn-timezone.js`, và nạp TRƯỚC
 *   3. Không file nào khác chép lại bảng mốc múi giờ VN
 *   4. Bảng mốc trong module khớp ĐÚNG tooltip đang hiện cho người dùng
 *
 * Tự red-team: dựng lại đúng bản chép tay rồi xác nhận phép 3 bắt được.
 *
 * Chạy: node scripts/check-vn-timezone.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const MODULE = 'public/tools-shared/vn-timezone.js';
const mod = readFileSync(join(ROOT, MODULE), 'utf-8');
const form = readFileSync(join(ROOT, 'public/tuvi-form.js'), 'utf-8');

// ── 1. tuvi-form.js không tự khai lại ────────────────────────
for (const fn of ['getVnUtcOffset', 'toVnHour', 'hourMinToGioIdx']) {
  if (new RegExp(`function\\s+${fn}\\s*\\(`).test(form)) {
    fail(`tuvi-form.js tự khai lại \`${fn}\` — phải lấy từ window.VnTimezone (${MODULE}).`);
  }
}
if (!/window\.VnTimezone/.test(form)) fail('tuvi-form.js không còn tham chiếu window.VnTimezone.');

// ── 2. Mọi trang nạp form cũng nạp module, và nạp TRƯỚC ──────
function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}
let pages = 0;
for (const f of htmlFiles(join(ROOT, 'public'))) {
  const s = readFileSync(f, 'utf-8');
  const iForm = s.search(/<script src="\/tuvi-form\.js/);
  if (iForm < 0) continue;
  pages++;
  const iTz = s.search(/<script src="\/tools-shared\/vn-timezone\.js/);
  const rel = f.slice(ROOT.length);
  if (iTz < 0) fail(`${rel}: nạp tuvi-form.js nhưng THIẾU /tools-shared/vn-timezone.js.`);
  else if (iTz > iForm)
    fail(`${rel}: vn-timezone.js nạp SAU tuvi-form.js — form sẽ ném lỗi lúc khởi tạo.`);
}
if (pages === 0) fail('Không tìm thấy trang nào nạp tuvi-form.js — bộ dò đang đo nhầm chỗ.');

// ── 3. Không nơi nào khác chép bảng mốc múi giờ ──────────────
// Dấu hiệu nhận dạng: mốc 1944-03-09 (UTC+9 thời Nhật) — con số này không xuất
// hiện ở đâu khác trong repo vì mục đích khác.
function allSources(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) allSources(p, out);
    else if (/\.(js|mjs|ts|html)$/.test(e)) out.push(p);
  }
  return out;
}
const MARK = /\b1944\s*,\s*3\s*,\s*9\b|\bD\(1944,\s*3,\s*9\)/;
for (const f of allSources(join(ROOT, 'public')).concat(allSources(join(ROOT, 'scripts')))) {
  // Loại CHÍNH module nguồn, và loại chính bộ dò này (nó cố ý chứa một bản
  // chép tay giả để red-team).
  if (f.includes('tools-shared') && f.endsWith('vn-timezone.js')) continue;
  if (f.endsWith('check-vn-timezone.mjs')) continue;
  if (MARK.test(readFileSync(f, 'utf-8'))) {
    fail(
      `${f.slice(ROOT.length)}: chép lại bảng mốc múi giờ VN — dùng VnTimezone.getVnUtcOffset().`
    );
  }
}

// ── 4. Bảng mốc khớp tooltip đang hiện cho người dùng ───────
// Tooltip là thứ NGƯỜI DÙNG đọc; VN_TZ_HISTORY là thứ MÁY tính. Lệch nhau thì
// một trong hai đang nói dối và không gì bắt được ngoài phép so này. So theo
// CẤU TRÚC (mốc bắt đầu + offset của từng dòng), không so chuỗi thô.
const tipRows = [...form.matchAll(/<li><b>([^<]*)<\/b>\s*\(UTC\+(\d)/g)].map((m) => {
  const start = m[1]
    .split('–')[0]
    .replace(/^Từ\s*/, '')
    .trim(); // "01/7/1955" hoặc "1942"
  const parts = start.split('/').map(Number);
  const [d, mo, y] = parts.length === 3 ? parts : [1, 1, parts[0]];
  return { from: [y, mo, d], offset: Number(m[2]) * 60 };
});
const tblRows = [...mod.matchAll(/from:\s*\[(\d+),\s*(\d+),\s*(\d+)\],\s*offset:\s*(\d+)/g)].map(
  (m) => ({
    from: [Number(m[1]), Number(m[2]), Number(m[3])],
    offset: Number(m[4]),
  })
);
if (!tipRows.length) fail('Không đọc được dòng nào từ tooltip múi giờ trong tuvi-form.js.');
if (tipRows.length !== tblRows.length) {
  fail(`Tooltip có ${tipRows.length} mốc, VN_TZ_HISTORY có ${tblRows.length} — lệch số mốc.`);
} else {
  for (let i = 0; i < tipRows.length; i++) {
    const a = tipRows[i],
      b = tblRows[i];
    if (a.offset !== b.offset || a.from.join('-') !== b.from.join('-')) {
      fail(
        `Mốc #${i + 1}: tooltip nói ${a.from.join('/')} → UTC+${a.offset / 60}, bảng nói ${b.from.join('/')} → UTC+${b.offset / 60}.`
      );
    }
  }
}

// ── RED-TEAM: dựng lại bản chép tay, phép 3 phải bắt ─────────
const forged = 'const D=(y,m,d)=>0; if (t >= D(1944, 3, 9)) return 540;';
if (!MARK.test(forged)) {
  fail(
    'RED-TEAM THẤT BẠI: mẫu nhận dạng KHÔNG bắt được bản chép tay dựng lại — bộ dò không có răng.'
  );
} else {
  console.log('   ↳ red-team: bản chép tay dựng lại BỊ BẮT ✓');
}

if (bad === 0) {
  console.log(
    `✅ Múi giờ VN một nguồn duy nhất (${MODULE}); ${pages} trang nạp đúng thứ tự; không còn bản chép tay; bảng khớp tooltip.`
  );
} else {
  console.error(
    `\n${bad} lỗi — giờ sinh người dùng và giờ sinh người nổi tiếng có thể đang ở HAI hệ quy chiếu khác nhau, mà canh giờ vẫn ra số trông hợp lệ.`
  );
  process.exitCode = 1;
}
