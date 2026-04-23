#!/usr/bin/env node
// patch-p1-loading.js — Animated loading indicator khi chờ P1 generate
// Chạy: node patch-p1-loading.js

const fs = require('fs');
const filePath = process.argv[2] || 'public/luan-giai.html';
if (!fs.existsSync(filePath)) { console.error('Không tìm thấy:', filePath); process.exit(1); }

let html = fs.readFileSync(filePath, 'utf8');
let ok = 0;

function rep(from, to, label) {
  if (!html.includes(from)) { console.warn('⚠ miss:', label); return; }
  html = html.replace(from, to);
  console.log('✓', label); ok++;
}

// 1. Thêm CSS animation vào <style>
rep(
  `</style>`,
  `/* P1 loading indicator */
@keyframes tvm-dot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
@keyframes tvm-bar{0%{width:5%}50%{width:80%}100%{width:95%}}
.tvm-loading-wrap{padding:28px 24px;background:#f9f7f2;border:1px solid #e8dfc8;border-radius:8px}
.tvm-loading-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.tvm-loading-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e8dfc8}
.tvm-loading-name{font-size:13px;font-weight:600;color:#061A2E}
.tvm-loading-sub{font-size:11px;color:#9A7B3A;margin-top:3px}
.tvm-loading-dots{display:flex;gap:5px;align-items:center;padding:12px 16px;background:#fff;border-radius:6px;border:1px solid #e8dfc8}
.tvm-dot{width:8px;height:8px;border-radius:50%;background:#c9a84c;display:inline-block}
.tvm-dot:nth-child(1){animation:tvm-dot 1.2s ease-in-out infinite}
.tvm-dot:nth-child(2){animation:tvm-dot 1.2s ease-in-out 0.2s infinite}
.tvm-dot:nth-child(3){animation:tvm-dot 1.2s ease-in-out 0.4s infinite}
.tvm-loading-label{font-size:12px;color:#999;margin-left:8px}
.tvm-bar-wrap{margin-top:10px;height:3px;background:#f0ebe0;border-radius:2px;overflow:hidden}
.tvm-bar-fill{height:100%;background:#c9a84c;border-radius:2px;animation:tvm-bar 2.5s ease-in-out infinite}
</style>`,
  'add loading CSS'
);

// 2. Thay thế loading text đơn giản bằng animated indicator
rep(
  `lockBox.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-lt)">Đang tải tổng quan lá số...</div>';`,
  `lockBox.innerHTML = '<div class="tvm-loading-wrap">' +
        '<div class="tvm-loading-header">' +
          '<img src="/thay-tuvi.webp" class="tvm-loading-avatar" onerror="this.style.display=\'none\'">' +
          '<div><div class="tvm-loading-name">Tử Vi Minh Bảo</div>' +
          '<div class="tvm-loading-sub">Đang luận giải Phần 1 — Tổng Quan Lá Số</div></div>' +
        '</div>' +
        '<div class="tvm-loading-dots">' +
          '<span class="tvm-dot"></span>' +
          '<span class="tvm-dot"></span>' +
          '<span class="tvm-dot"></span>' +
          '<span class="tvm-loading-label">Đang phân tích cách cục và khí chất bản mệnh...</span>' +
        '</div>' +
        '<div class="tvm-bar-wrap"><div class="tvm-bar-fill"></div></div>' +
      '</div>';`,
  'replace loading text with animated indicator'
);

fs.writeFileSync(filePath, html);
console.log(`\nDone: ${ok}/2 patches applied → ${filePath}`);
