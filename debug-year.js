const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const idx = html.indexOf('Vận hạn năm');
if (idx === -1) { console.log('Không thấy'); process.exit(); }
console.log(JSON.stringify(html.slice(idx - 10, idx + 120)));
