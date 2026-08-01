#!/usr/bin/env node
/**
 * Chặn tái phát: giá Lượng bị chép cứng vào client.
 *
 * Bốn lần trong một ngày, cùng một bệnh — một con số suy ra từ giá được chép
 * tay sang chỗ khác rồi đứng im khi giá đổi: `/app` quảng cáo Luận Giải 150
 * trong khi trừ 25 · nút Diện Tướng ghi 5 mà trừ 8 · trang nạp hứa "64 lá số"
 * trong khi mua được 16 · bản dự phòng trôi lại ngay trong PR đi sửa nó.
 *
 * Không ai cố tình làm sai; chỉ là đồng bộ bằng tay thì sẽ sót. Nên chốt bằng
 * máy: giá chỉ được đọc từ `tool_pricing` / `credit_packages` qua
 * `public/tool-prices.js`, và chỉ `admin.html` (trang SỬA giá) được fetch thẳng.
 *
 * Chạy: node scripts/check-no-hardcoded-prices.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');

// Được phép fetch thẳng hai bảng giá.
const FETCH_ALLOWED = new Set(['public/admin.html', 'public/tool-prices.js']);

const RULES = [
  {
    id: 'fetch-truc-tiep',
    re: /rest\/v1\/(tool_pricing|credit_packages)/,
    msg: 'fetch thẳng bảng giá — dùng ToolPrices (public/tool-prices.js) thay vì tự fetch',
    allow: (f) => FETCH_ALLOWED.has(f),
  },
  {
    id: 'so-luong-cung',
    // "150 Lượng" / "25 lượng" viết thẳng trong markup hoặc chuỗi JS
    re: /\b\d{1,4}\s*[Ll]ượng\b/,
    msg: 'số Lượng viết cứng — dùng <span data-tvp-price="<tool_id>">…</span>',
    // Chỉ soi các Ô GIÁ CÔNG CỤ. Quà đăng ký / thưởng giới thiệu / số dư người
    // dùng cũng có chữ "Lượng" nhưng đến từ `app_config` và `user_credits`,
    // không phải `tool_pricing` — gom chung vào đây thì bộ dò kêu suốt ngày rồi
    // bị tắt, mà một bộ dò bị tắt thì tệ hơn không có.
    only: /(hero-cost">[^<]*?|Chi phí:\s*<strong>|paywall-price">|số dư · )$/,
    allow: (f) => f === 'public/admin.html',
  },
  {
    id: 'don-gia-cung',
    // hằng số quy đổi đ/Lượng từng gây báo giá sai gấp ~3 lần
    re: /\b(VND_PER_CREDIT|CUSTOM_FALLBACK_RATE)\b|\b2500\s*\)?\s*;?\s*\/\/.*[Ll]ượng/,
    msg: 'hằng số quy đổi đ/Lượng — suy từ credit_packages qua ToolPrices',
    // admin.html tự suy đơn giá từ `credit_packages` ngay trong trang (nó là
    // trang SỬA giá, không đọc qua ToolPrices).
    allow: (f) => f === 'public/admin.html',
  },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(html|js)$/.test(name)) out.push(p);
  }
  return out;
}

const problems = [];
for (const abs of walk(PUBLIC)) {
  const rel = relative(ROOT, abs).replace(/\\/g, '/');
  const lines = readFileSync(abs, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Bỏ qua dòng chú thích: các file này giải thích chính bài học ở trên,
    // nên nhắc "150 Lượng" trong comment là cố ý, không phải giá đang chạy.
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--'))
      return;
    for (const r of RULES) {
      if (r.allow(rel)) continue;
      if (r.only) {
        // chỉ báo khi con số nằm ngay sau một ô giá công cụ
        const m = line.match(/(.*?)\d{1,4}\s*[Ll]ượng/);
        if (!m || !r.only.test(m[1])) continue;
      }
      if (r.re.test(line))
        problems.push({ file: rel, line: i + 1, rule: r.id, msg: r.msg, text: t.slice(0, 110) });
    }
  });
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} chỗ chép cứng giá:\n`);
  for (const p of problems)
    console.error(`  ${p.file}:${p.line}  [${p.rule}] ${p.msg}\n      ${p.text}`);
  console.error('\nGiá chỉ sửa trong trang Admin. Client đọc qua ToolPrices.\n');
  process.exit(1);
}
console.log('✓ không có giá chép cứng trong public/');
