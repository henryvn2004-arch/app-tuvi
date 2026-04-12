#!/usr/bin/env node
// patch-task5.js — Task #5: Anchor pricing / value framing
// Chạy: node patch-task5.js

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

// 1. paywall-gate trong renderPreGenFree() lockBox HTML
rep(
  `          <div class="paywall-price">$19</div>
          <div class="paywall-price-note">Thanh toán một lần · Truy cập vĩnh viễn</div>`,
  `          <div style="font-size:12px;color:#9A7B3A;margin-bottom:6px;letter-spacing:0.3px">24 khía cạnh cuộc đời · Bằng 1 buổi cà phê</div>
          <div class="paywall-price">$19</div>
          <div class="paywall-price-note">Xem offline thường 500k–1tr · Ở đây chỉ $19, nhận kết quả ngay</div>`,
  'lockBox price framing'
);

// 2. renderPaywall() function
rep(
  `      <div class="paywall-price">$19</div>
      <div class="paywall-price-note">Thanh toán một lần · Truy cập vĩnh viễn</div>`,
  `      <div style="font-size:12px;color:#9A7B3A;margin-bottom:6px;letter-spacing:0.3px">24 khía cạnh cuộc đời · Bằng 1 buổi cà phê</div>
      <div class="paywall-price">$19</div>
      <div class="paywall-price-note">Xem offline thường 500k–1tr · Ở đây chỉ $19, nhận kết quả ngay</div>`,
  'renderPaywall price framing'
);

// 3. tvc-paywall-overlay (chat paywall — static HTML)
rep(
  `          <div class="tvc-paywall-price">$19</div>
          <div class="tvc-paywall-price-note">Bao gồm 24 phần luận giải + Vấn đáp không giới hạn</div>`,
  `          <div style="font-size:11px;color:#9A7B3A;margin-bottom:5px">24 khía cạnh cuộc đời · Bằng 1 buổi cà phê</div>
          <div class="tvc-paywall-price">$19</div>
          <div class="tvc-paywall-price-note">Bao gồm 24 phần luận giải + Vấn đáp không giới hạn</div>`,
  'tvc-paywall price framing'
);

fs.writeFileSync(filePath, html);
console.log(`\nDone: ${ok}/3 patches applied → ${filePath}`);
