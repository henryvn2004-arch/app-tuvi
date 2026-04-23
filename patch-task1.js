#!/usr/bin/env node
// patch-task1.js — Task #1: P1 Tổng Quan free hoàn toàn
// Chạy: node patch-task1.js

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

// 1. Sau renderPreGenFree(), fetch P1 free (non-blocking)
rep(
  `      // ── Task #1: Fetch P1 preview thật (non-blocking) ──
      _fetchP1Preview();

      // ── Check payment status ──
      await checkAndRenderPaywall();`,
  `      // ── Task #1: P1 Tổng Quan free (non-blocking) ──
      _loadP1Free();

      // ── Check payment status ──
      await checkAndRenderPaywall();`,
  'update call name (if already patched)'
);

// fallback nếu chưa patch lần trước
rep(
  `      // ── Render pre-generated JS section (free, no Claude) ──
      await renderPreGenFree();
      // Show chatbot with lá số data
      // chatbot unlocks after payment via startClaudeluanGiai()
      document.getElementById('progress-fill').style.width = '100%';

      // ── Check payment status ──
      await checkAndRenderPaywall();`,
  `      // ── Render pre-generated JS section (free, no Claude) ──
      await renderPreGenFree();
      // Show chatbot with lá số data
      // chatbot unlocks after payment via startClaudeluanGiai()
      document.getElementById('progress-fill').style.width = '100%';

      // ── Task #1: P1 Tổng Quan free (non-blocking) ──
      _loadP1Free();

      // ── Check payment status ──
      await checkAndRenderPaywall();`,
  'inject _loadP1Free() call'
);

// 2. Thêm hàm _loadP1Free() — show P1 full, free
const FN = `
  // ── Task #1: Load P1 Tổng Quan free, không cần thanh toán ──
  async function _loadP1Free() {
    try {
      const lockBox   = document.getElementById('lock-box-1');
      const claudeBox = document.getElementById('claude-content-1');
      if (!lockBox || !claudeBox) return;

      // Show loading nhẹ trong lock box
      lockBox.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-lt)">Đang tải tổng quan lá số...</div>';

      let docs = '';
      try {
        const sr = await fetch('/api/search', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ query: QUERIES[1](), matchCount: 5 })
        });
        docs = (await sr.json()).docs || '';
      } catch(e) {}

      const resp = await fetch('/api/lasotuvi', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          hoTen: _hoTen, ngay: _ngay, thang: _thang, nam: _nam,
          gioiTinh: _gioitinh, namXem: _namXem,
          laSoText: _laSoText, phan: 1, docs
        })
      });
      const data = await resp.json();
      if (data.error || !data.luanGiai) {
        lockBox.style.display = 'none';
        return;
      }

      // Show full P1, ẩn lock box
      claudeBox.innerHTML = renderMarkdown(data.luanGiai)
        + \`<div class="ux-share-bar">
            <button onclick="uxCopySection(this, 1)" class="ux-share-btn">📋 Sao chép phần này</button>
          </div>\`;
      claudeBox.style.display = '';
      lockBox.style.display = 'none';
      updateMucLuc(1, 'done');

    } catch(e) { /* silent fail — lock box vẫn hiện như cũ */ }
  }

`;

rep(
  `  async function checkAndRenderPaywall() {`,
  FN + `  async function checkAndRenderPaywall() {`,
  'add _loadP1Free function'
);

fs.writeFileSync(filePath, html);
console.log(`\nDone: ${ok}/2 patches applied → ${filePath}`);
