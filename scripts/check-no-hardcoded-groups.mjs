#!/usr/bin/env node
/**
 * Chặn tái phát: cách xếp công cụ và đường dẫn công cụ phải đọc từ DB
 * (`tool_groups` + `tool_pricing`) qua `public/tool-prices.js`, KHÔNG chép vào
 * file giao diện.
 *
 * Vì sao có bộ dò này: trước bản master grouping, cách xếp nằm ở BA mảng chép
 * tay không khớp nhau — `/cong-cu` xếp theo nhu cầu với 58 công cụ, dashboard
 * `/app` và sidebar Luận Đường xếp theo bộ môn với 34 công cụ. Cùng một sản
 * phẩm nói hai kiểu với cùng một người, và thêm công cụ mới là phải nhớ sửa
 * tay ba chỗ; quên một chỗ thì công cụ đó tàng hình mà không có gì báo. Bộ dò
 * chỉ kêu khi có người dựng lại đúng cái bẫy đó.
 *
 * Cùng tinh thần `scripts/check-no-hardcoded-prices.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'public');

// File được phép: chính module nguồn, và trang Admin (nơi SỬA dữ liệu).
const ALLOW = new Set(['tool-prices.js', 'admin.html', 'admin-login.html']);

const RULES = [
  {
    // Mảng nhóm chép tay. Phải là mảng của OBJECT có khoá kiểu nhóm — nếu chỉ
    // dò tên biến chứa "GROUPS" thì `TAM_HOP_GROUPS` (bảng tam hợp địa chi
    // trong engine, mảng của MẢNG) bị báo nhầm; bộ dò kêu oan vài lần là người
    // ta tắt nó đi, lúc đó nó thành vô dụng.
    re: /(?:var|let|const)\s+[A-Z_]*GROUPS[A-Z_]*\s*=\s*\[\s*\{[^}]*\b(?:key|group|g)\s*:/,
    msg: 'mảng nhóm chép tay — dùng ToolPrices.groups() (bảng `tool_groups`)',
  },
  {
    // Map tool_id → URL chép tay
    re: /(?:var|let|const)\s+TOOL_URLS\s*=\s*\{/,
    msg: 'map đường dẫn chép tay — dùng ToolPrices.pagePath()/appPath() (cột `page_path`/`app_path`)',
  },
  {
    // Mảng công cụ của sidebar
    re: /(?:var|let|const)\s+TOOLS\s*=\s*\[\s*\{\s*group\s*:/,
    msg: 'mảng công cụ chép tay cho sidebar — dựng từ ToolPrices.rows()',
  },
];

let bad = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!/\.(html|js)$/.test(f) || ALLOW.has(f)) continue;
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  for (const r of RULES) {
    const m = r.re.exec(src);
    if (!m) continue;
    const line = src.slice(0, m.index).split('\n').length;
    console.error(`✗ public/${f}:${line} — ${r.msg}`);
    bad++;
  }
}

if (bad) {
  console.error(
    `\n${bad} chỗ chép tay. Nguồn chuẩn là DB: bảng \`tool_groups\` (định nghĩa nhóm) và ` +
      '`tool_pricing` (nhóm của từng công cụ + đường dẫn). Sửa trong Admin, không cần deploy.'
  );
  process.exit(1);
}
console.log('✓ không có mảng nhóm/đường dẫn chép tay trong public/');
