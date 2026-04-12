#!/usr/bin/env node
const fs = require('fs');
const filePath = process.argv[2] || 'public/index.html';
if (!fs.existsSync(filePath)) { console.error('Không tìm thấy:', filePath); process.exit(1); }
let html = fs.readFileSync(filePath, 'utf8');

// Tìm tất cả variants của cái card này và fix
let count = 0;
const patterns = [
  /Vận hạn năm \$\{[^}]+\}/g,
  /Vận hạn năm \$\{new Date\(\)\.getFullYear\(\)\}/g,
];
for (const p of patterns) {
  const before = html;
  html = html.replace(p, 'Vận hạn & tiểu vận năm nay');
  if (html !== before) count++;
}

// Cũng check file luan-giai.html nếu có
const f2 = 'public/luan-giai.html';
let count2 = 0;
if (fs.existsSync(f2)) {
  let h2 = fs.readFileSync(f2, 'utf8');
  for (const p of patterns) {
    const before = h2;
    h2 = h2.replace(p, 'Vận hạn & tiểu vận năm nay');
    if (h2 !== before) count2++;
  }
  if (count2 > 0) { fs.writeFileSync(f2, h2); console.log(`✓ luan-giai.html: ${count2} chỗ`); }
}

fs.writeFileSync(filePath, html);
console.log(`✓ index.html: ${count} chỗ`);
console.log(`Done`);
