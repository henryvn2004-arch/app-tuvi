#!/usr/bin/env node
/**
 * Mọi TRANG TOOL trong shell phải có lịch sử hội thoại.
 *
 * Vì sao cần bộ dò: lỗi này đã tái phát HAI lần theo cùng một đường — trang tool
 * mới chép từ khuôn của một trang cũ, mà khuôn đó thiếu khối lịch sử. Lần đầu
 * bắt được 6 tool (chan-dung-* · day-con · duyen-no · nguoi-khac · nhan-mach),
 * và ngay trong lượt gộp main của chính PR đó lại lòi ra tool thứ 7
 * (huong-nghiep-tre) sinh ra từ khuôn day-con CŨ. Không có gì báo: trang vẫn
 * chạy, chỉ là người dùng KHÔNG có đường nào mở lại phiên cũ.
 *
 * Hai thứ phải đi cùng nhau, thiếu một là hỏng im lặng:
 *   - window.SHELL_HISTORY = true  → bật lưu phiên + nút Lịch sử trong rail
 *   - <div id="shellRecent"></div> → chỗ mount khối "Phiên gần đây" trên trang
 * Bật cờ mà quên chỗ mount thì phiên có lưu nhưng không ai thấy; đặt chỗ mount
 * mà quên cờ thì khối vĩnh viễn rỗng (renderRecent thoát sớm khi !HIST_ON).
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'public';

// Trang shell KHÔNG phải công cụ ⇒ không có phiên hội thoại nào để liệt kê.
// Miễn trừ phải có LÝ DO ghi ngay tại đây, không phải danh sách câm.
const EXEMPT = {
  'app-home.html': 'bảng điều khiển, không phải công cụ — không sinh phiên nào',
  'app-tai-khoan.html': 'trang tài khoản, không phải công cụ',
};

const bad = [];
let checked = 0;

for (const f of fs.readdirSync(DIR).sort()) {
  if (!f.startsWith('app-') && f !== 'app.html') continue;
  if (!f.endsWith('.html')) continue;
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (!src.includes('SHELL_ACTIVE')) continue; // không phải trang shell
  if (EXEMPT[f]) continue;
  checked++;
  const hasFlag = /window\.SHELL_HISTORY\s*=\s*true/.test(src);
  const hasMount = src.includes('id="shellRecent"');
  if (hasFlag && hasMount) continue;
  const missing = [];
  if (!hasFlag) missing.push('window.SHELL_HISTORY=true (cạnh window.SHELL_ACTIVE)');
  if (!hasMount) missing.push('<div id="shellRecent"></div> (ngay sau <div id="introHost">)');
  bad.push({ f, missing });
}

if (bad.length) {
  console.error('✗ Trang tool trong shell thiếu lịch sử hội thoại:\n');
  for (const b of bad) {
    console.error('  ' + b.f);
    for (const m of b.missing) console.error('    thiếu: ' + m);
  }
  console.error(
    '\nThêm cả hai, hoặc nếu trang đó thật sự không phải công cụ thì khai vào\n' +
      'EXEMPT trong scripts/check-shell-history.mjs KÈM LÝ DO.'
  );
  process.exit(1);
}

console.log(`✓ ${checked} trang tool trong shell đều có lịch sử hội thoại`);
