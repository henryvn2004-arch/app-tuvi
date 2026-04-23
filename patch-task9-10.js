#!/usr/bin/env node
// patch-task9-10.js — Exit intent (#9) + Stream text (#10)
// Chạy: node patch-task9-10.js

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

// ── TASK #10: Stream text — reveal từng <p> với delay ──────────────────────
// Thêm hàm streamIntoEl() thay thế cho innerHTML dump thẳng
rep(
  `  function renderMarkdown(text) {`,
  `  // Task #10: stream paragraphs vào element với delay nhỏ
  function streamIntoEl(el, htmlContent, onDone) {
    el.innerHTML = htmlContent;
    const paras = el.querySelectorAll('p, h2, h3');
    if (!paras.length) { if (onDone) onDone(); return; }
    paras.forEach(p => { p.style.opacity = '0'; p.style.transform = 'translateY(6px)'; p.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; });
    let i = 0;
    function next() {
      if (i >= paras.length) { if (onDone) onDone(); return; }
      paras[i].style.opacity = '1';
      paras[i].style.transform = 'translateY(0)';
      i++;
      setTimeout(next, 60);
    }
    setTimeout(next, 50);
  }

  function renderMarkdown(text) {`
);

// Thay claudeBox.innerHTML = renderMarkdown(...) trong loadNextPhanUnlocked()
rep(
  `      // Điền content, ẩn lock box
      if (claudeBox) {
        claudeBox.innerHTML = renderMarkdown(data.luanGiai);
        claudeBox.style.display = '';
      }
      if (lockBox) lockBox.style.display = 'none';`,
  `      // Điền content với stream effect, ẩn lock box
      if (claudeBox) {
        claudeBox.style.display = '';
        streamIntoEl(claudeBox, renderMarkdown(data.luanGiai) + \`<div class="ux-share-bar"><button onclick="uxCopySection(this, \${_currentPhan})" class="ux-share-btn">📋 Sao chép phần này</button></div>\`);
      }
      if (lockBox) lockBox.style.display = 'none';`,
  'stream text in loadNextPhanUnlocked'
);

// ── TASK #9: Exit intent — nhẹ, 1 lần/session ──────────────────────────────
// Thêm CSS cho exit intent popup
rep(
  `</style>`,
  `/* Task #9: Exit intent */
.exit-intent-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9999; align-items:center; justify-content:center; }
.exit-intent-overlay.show { display:flex; }
.exit-intent-box { background:#fff; border-top:3px solid #c9a84c; padding:32px 28px; max-width:380px; width:90%; border-radius:4px; text-align:center; position:relative; }
.exit-intent-close { position:absolute; top:10px; right:14px; background:none; border:none; font-size:18px; cursor:pointer; color:#999; }
.exit-intent-title { font-size:20px; font-weight:400; color:#061A2E; margin-bottom:10px; }
.exit-intent-desc { font-size:14px; color:#666; line-height:1.6; margin-bottom:20px; }
.exit-intent-btn { display:inline-block; padding:12px 28px; background:#061A2E; color:#c9a84c; border:1.5px solid #c9a84c; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; font-family:inherit; border-radius:2px; }
.exit-intent-btn:hover { background:#c9a84c; color:#061A2E; }
.exit-intent-skip { display:block; margin-top:12px; font-size:12px; color:#aaa; cursor:pointer; background:none; border:none; font-family:inherit; }
</style>`,
  'add exit intent CSS'
);

// Thêm HTML popup trước </body>
rep(
  `<script src="/nav.js"></script>`,
  `<!-- Task #9: Exit intent popup -->
<div class="exit-intent-overlay" id="exit-intent-overlay">
  <div class="exit-intent-box">
    <button class="exit-intent-close" onclick="document.getElementById('exit-intent-overlay').classList.remove('show')">✕</button>
    <div style="font-size:28px;margin-bottom:12px">✦</div>
    <div class="exit-intent-title">Lá số của bạn đã sẵn sàng</div>
    <div class="exit-intent-desc">Lá số được lưu lại — bạn có thể quay lại xem bất cứ lúc nào sau khi mở khóa.</div>
    <button class="exit-intent-btn" onclick="initiatePayment();document.getElementById('exit-intent-overlay').classList.remove('show')">Mở Khóa Luận Giải →</button>
    <button class="exit-intent-skip" onclick="document.getElementById('exit-intent-overlay').classList.remove('show')">Để sau</button>
  </div>
</div>

<script src="/nav.js"></script>`,
  'add exit intent HTML'
);

// Thêm JS logic exit intent — chỉ trigger sau khi thấy paywall, 1 lần/session
rep(
  `  window.luanGiaiNhanh = luanGiaiNhanh;`,
  `  window.luanGiaiNhanh = luanGiaiNhanh;

  // Task #9: Exit intent
  (function() {
    let _triggered = false;
    let _paywallSeen = false;

    // Mark paywall seen khi result-section active
    const _obs = new MutationObserver(() => {
      if (document.getElementById('result-section')?.classList.contains('active')) {
        setTimeout(() => { _paywallSeen = true; }, 3000); // chờ 3s mới arm
      }
    });
    const _rs = document.getElementById('result-section');
    if (_rs) _obs.observe(_rs, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('mouseleave', (e) => {
      if (e.clientY > 10) return; // chỉ trigger khi mouse ra top
      if (_triggered || !_paywallSeen) return;
      if (sessionStorage.getItem('exit_intent_shown')) return;
      // Không show nếu đã paid (overlay ẩn = đã paid)
      const overlay = document.getElementById('tvc-paywall-overlay');
      if (overlay && overlay.style.display === 'none') return;
      _triggered = true;
      sessionStorage.setItem('exit_intent_shown', '1');
      document.getElementById('exit-intent-overlay')?.classList.add('show');
    });
  })();`,
  'add exit intent JS logic'
);

fs.writeFileSync(filePath, html);
console.log(`\nDone: ${ok}/5 patches applied → ${filePath}`);
