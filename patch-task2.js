#!/usr/bin/env node
// patch-task2.js — Task #2: Social proof gần nút Pay
// Chạy: node patch-task2.js

const fs = require('fs');
const filePath = process.argv[2] || 'public/index.html';
if (!fs.existsSync(filePath)) { console.error('Không tìm thấy:', filePath); process.exit(1); }

let html = fs.readFileSync(filePath, 'utf8');
let ok = 0;

function rep(from, to, label) {
  if (!html.includes(from)) { console.warn('⚠ miss:', label); return; }
  html = html.replace(from, to);
  console.log('✓', label); ok++;
}

const SOCIAL_PROOF = `
          <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;max-width:440px;margin-left:auto;margin-right:auto;text-align:left">
            <div style="background:rgba(255,255,255,0.7);border-left:3px solid #c9a84c;padding:10px 14px;border-radius:0 6px 6px 0">
              <div style="font-size:13px;color:#333;line-height:1.5;font-style:italic">"Phần Quan Lộc nói đúng y chang tình huống tao đang gặp — cả cái cách nó diễn ra theo từng giai đoạn."</div>
              <div style="font-size:11px;color:#9A7B3A;margin-top:5px;font-weight:600">Trần M.K. — TP.HCM</div>
            </div>
            <div style="background:rgba(255,255,255,0.7);border-left:3px solid #c9a84c;padding:10px 14px;border-radius:0 6px 6px 0">
              <div style="font-size:13px;color:#333;line-height:1.5;font-style:italic">"Đọc phần đại vận xong ngồi im một lúc. Đúng y chang những gì đã xảy ra 3 năm nay."</div>
              <div style="font-size:11px;color:#9A7B3A;margin-top:5px;font-weight:600">Nguyễn T.H. — Hà Nội</div>
            </div>
          </div>`;

// 1. lockBox trong renderPreGenFree()
rep(
  `          <div class="paywall-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>
        </div>
        <div class="phan-claude-content"`,
  `          <div class="paywall-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>${SOCIAL_PROOF}
        </div>
        <div class="phan-claude-content"`,
  'lockBox social proof'
);

// 2. renderPaywall() function
rep(
  `      <div class="paywall-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>
    \`;
    body.appendChild(gate);`,
  `      <div class="paywall-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>${SOCIAL_PROOF}
    \`;
    body.appendChild(gate);`,
  'renderPaywall social proof'
);

fs.writeFileSync(filePath, html);
console.log(`\nDone: ${ok}/2 patches applied → ${filePath}`);
