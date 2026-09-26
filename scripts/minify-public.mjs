#!/usr/bin/env node
/**
 * Bỏ CHÚ THÍCH + khoảng trắng thừa trong `public/**.js` và `public/*.css` LÚC
 * BUILD TRÊN VERCEL — không đổi tên biến, không nén logic.
 *
 * 🔴 VÌ SAO. Vercel phục vụ `public/` NGUYÊN VĂN (không qua bundler), mà mã ở
 * đây mang chú thích tiếng Việt dày đặc — chúng là tài liệu sống của repo, KHÔNG
 * được cắt khỏi nguồn. Đo 2026-09-26 (gzip -9):
 *   shell.js   111 KB → 55 KB   (tải trên MỌI trang /app, chặn parse)
 *   shell.css   31 KB → 12 KB   (chặn lần vẽ đầu)
 *   auth.js     19 KB → 10 KB · tuvi-paywall.js 38 KB → 18 KB
 * Trên 4G điện thoại đó là nửa số byte phải tải + parse trước khi thấy gì.
 *
 * 🔒 AN TOÀN:
 *   - Chỉ chạy khi `VERCEL=1` (hoặc `--force` để thử tay). Build trên máy dev
 *     và job `next-build` của CI KHÔNG đụng file — không bao giờ lỡ commit bản
 *     đã rút gọn, và mọi bộ dò `check:*` vẫn đọc nguồn có chú thích.
 *   - JS: terser `compress:false, mangle:false` — chỉ in lại cây cú pháp không
 *     kèm chú thích. Tên hàm/biến giữ nguyên ⇒ log lỗi prod vẫn đọc được,
 *     `window.X` giữa các file vẫn khớp. File nào terser ném lỗi ⇒ GIỮ NGUYÊN
 *     bản gốc (in cảnh báo), không bao giờ làm hỏng build.
 *   - CSS: chỉ bỏ `/* … *\/` NẰM NGOÀI chuỗi + dòng trống; không đụng giá trị.
 *   - Server cũng nạp vài file ở đây (`public/tuvi-ansao-engine.js`,
 *     `public/tools-shared/*.js`) — cùng mã, chỉ bớt chú thích, hành vi y hệt.
 *
 * Chạy: `node scripts/minify-public.mjs [--force]` (gọi từ `prebuild`).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const FORCE = process.argv.includes('--force');
if (process.env.VERCEL !== '1' && !FORCE) {
  console.log('minify-public: bỏ qua (chỉ chạy trên Vercel, hoặc --force)');
  process.exit(0);
}

const require = createRequire(import.meta.url);
// Terser đi kèm Next (đã ghim theo phiên bản `next` trong lockfile) — không
// thêm dependency mới chỉ cho một bước build.
const { minify } = require('next/dist/compiled/terser');

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const JS_DIRS = ['', 'tools-shared'];

function stripCssComments(src) {
  let out = '';
  let q = null;
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (q) {
      out += c;
      if (c === '\\') {
        out += src[i + 1] || '';
        i += 2;
        continue;
      }
      if (c === q) q = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      i = e < 0 ? src.length : e + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out.replace(/\n[ \t]*(?:\n[ \t]*)+/g, '\n');
}

const gz = (s) => zlib.gzipSync(s, { level: 9 }).length;
let before = 0;
let after = 0;
let files = 0;
let kept = 0;

for (const dir of JS_DIRS) {
  const abs = path.join(ROOT, dir);
  for (const f of fs.readdirSync(abs).sort()) {
    const p = path.join(abs, f);
    if (!fs.statSync(p).isFile()) continue;
    const isJs = f.endsWith('.js') && !f.endsWith('.min.js');
    const isCss = dir === '' && f.endsWith('.css');
    if (!isJs && !isCss) continue;
    const src = fs.readFileSync(p, 'utf8');
    let out = src;
    try {
      if (isJs) {
        const r = await minify(src, {
          compress: false,
          mangle: false,
          format: { comments: false },
        });
        if (!r || typeof r.code !== 'string') throw new Error('terser không trả mã');
        out = r.code;
      } else {
        out = stripCssComments(src);
      }
    } catch (e) {
      kept++;
      console.warn(`minify-public: GIỮ NGUYÊN ${path.join(dir, f)} — ${e && e.message}`);
      continue;
    }
    if (out.length >= src.length) continue;
    before += gz(src);
    after += gz(out);
    files++;
    fs.writeFileSync(p, out);
  }
}

console.log(
  `minify-public: ${files} file, gzip ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB` +
    (kept ? ` · ${kept} file giữ nguyên do lỗi phân tích` : '')
);
