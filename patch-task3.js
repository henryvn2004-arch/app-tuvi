#!/usr/bin/env node
// patch-task3.js — Task #3: Progress indicator gợi tò mò
// Chạy: node patch-task3.js   (từ thư mục root repo)

const fs = require('fs');
const path = require('path');
const filePath = process.argv[2] || path.join('public', 'index.html');

if (!fs.existsSync(filePath)) {
  console.error('Không tìm thấy:', filePath);
  process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');
let ok = 0;

function rep(from, to, label) {
  if (!html.includes(from)) { console.warn('⚠ miss:', label); return; }
  html = html.replace(from, to);
  console.log('✓', label);
  ok++;
}

// 1. Thêm helper arrays + _loaderMsg() — chèn trước "Chuẩn hóa slug"
rep(
  `  // Chuẩn hóa slug — strip dấu tiếng Việt`,
  `  // ── Task #3: rotating loader messages ──
  const _LOADER_MSGS_ANSAO = [
    'Đang định vị Tử Vi tại cung Mệnh...',
    'Đang an sao theo cổ pháp...',
    'Đang tính cục số và nạp âm...',
  ];
  const _LOADER_MSGS_RAG = [
    'Đang tra cứu tàng thư cổ pháp...',
    'Đang tìm tài liệu tham chiếu...',
    'Đang đối chiếu với kinh điển Tử Vi...',
  ];
  const _LOADER_MSGS_PHAN = (label) => [
    \`Thầy đang đọc \${label}...\`,
    \`Đang luận giải \${label}...\`,
    \`Đang phân tích \${label}...\`,
    'Sắp xong — đang viết luận giải...',
  ];
  function _loaderMsg(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  // ────────────────────────────────────────────────────────

  // Chuẩn hóa slug — strip dấu tiếng Việt`,
  'insert helper arrays'
);

// 2. luanGiai() — an sao message
rep(
  `document.getElementById('loader-text').textContent = 'Đang an sao lá số...';
      document.getElementById('progress-fill').style.width = '20%';

      // Convert DL → AL`,
  `document.getElementById('loader-text').textContent = _loaderMsg(_LOADER_MSGS_ANSAO);
      document.getElementById('progress-fill').style.width = '20%';

      // Convert DL → AL`,
  'luanGiai an sao msg'
);

// 3. luanGiaiNhanh() — an sao message (context khác: dòng tiếp là "const conv")
rep(
  `document.getElementById('loader-text').textContent = 'Đang an sao lá số...';
      document.getElementById('progress-fill').style.width = '20%';

      const conv = convertDuongToAm`,
  `document.getElementById('loader-text').textContent = _loaderMsg(_LOADER_MSGS_ANSAO);
      document.getElementById('progress-fill').style.width = '20%';

      const conv = convertDuongToAm`,
  'luanGiaiNhanh an sao msg'
);

// 4. loadNextPhan() — phan loading spinner text
rep(
  `phanLoadingText.textContent = \`Đang tải: \${PHAN_LABELS[_currentPhan]}...\`;`,
  `phanLoadingText.textContent = _loaderMsg(_LOADER_MSGS_PHAN(PHAN_LABELS[_currentPhan]));`,
  'phanLoadingText'
);

// 5. loadNextPhan() — RAG step
rep(
  `loaderText.textContent = \`Tìm tài liệu... (1/2)\`;`,
  `loaderText.textContent = _loaderMsg(_LOADER_MSGS_RAG);`,
  'RAG loader msg'
);

// 6. loadNextPhan() — luận giải step
rep(
  `loaderText.textContent = \`Đang luận giải: \${PHAN_LABELS[_currentPhan]}... (2/2)\`;`,
  `loaderText.textContent = _loaderMsg(_LOADER_MSGS_PHAN(PHAN_LABELS[_currentPhan]));`,
  'luan giai loader msg'
);

fs.writeFileSync(filePath, html);
console.log(`\nXong: ${ok}/6 patches applied → ${filePath}`);
