#!/usr/bin/env node
/**
 * Chặn `:root{...}` chép tay MỚI trùng giá trị với `public/theme.css`.
 *
 * Sprint 0 (reskin webtoon, 2026-09) gộp 40 file `public/*.html` +
 * `public/tools/*.html` từng tự khai `--navy`/`--gold`/... về một nguồn
 * (`theme.css`). Bộ dò này giữ cho việc gộp không trôi lại: PR sau thêm một
 * trang mới rồi copy-paste `:root{--navy:#061A2E;...}` từ trang cũ là quay
 * lại đúng bệnh cũ, và không có gì khác BẮT LỖI được vì đây chỉ là CSS.
 *
 * Không fail khi giá trị KHÁC canonical — đó là OVERRIDE CÓ CHỦ Ý (đã có ở
 * `upload.html`, `chat-v2.html`, `app-bat-tu.html`, và vài `--gold-bright`
 * khác nhau giữa họ trang) — chỉ fail khi TRÙNG HỆT, tức thuần chép tay.
 *
 * Bỏ qua `admin.html`/`admin-content.html`/`admin.css` (nội bộ, ngoài phạm
 * vi Sprint 0) và `shell.css`/`tools/tools.css` (nguồn cho họ trang khác,
 * gộp chúng về theme.css là việc của Sprint 2/3, chưa phải bây giờ).
 *
 * Chạy: node scripts/check-theme.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['admin.html', 'admin-content.html']);

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
}

/** Khối :root ĐẦU TIÊN ở độ sâu ngoặc 0 (không nằm trong @media). */
function firstTopLevelRoot(rawSrc) {
  const src = stripComments(rawSrc);
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      if (depth === 0) {
        let j = i - 1;
        while (j >= 0 && /\s/.test(src[j])) j--;
        const token = src.slice(Math.max(0, j - 4), j + 1);
        if (/:root$/.test(token)) {
          const closeIdx = src.indexOf('}', i);
          if (closeIdx !== -1) return rawSrc.slice(i + 1, closeIdx);
        }
      }
      depth++;
    } else if (c === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return null;
}

function normHex(v) {
  let s = v.trim().toLowerCase();
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (m3) s = `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
  return s;
}

const themeSrc = readFileSync(join(ROOT, 'public/theme.css'), 'utf8');
const CANON = {};
{
  const body = firstTopLevelRoot(themeSrc) || '';
  const varRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);?/g;
  let vm;
  while ((vm = varRe.exec(body))) CANON[vm[1]] = normHex(vm[2]);
}

const targets = [];
for (const dir of ['public', 'public/tools']) {
  for (const f of readdirSync(join(ROOT, dir))) {
    if (f.endsWith('.html') && !SKIP.has(f)) targets.push(join(dir, f));
  }
}

let bad = 0;
for (const rel of targets) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const body = firstTopLevelRoot(src);
  if (!body) continue;
  const varRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);?/g;
  let vm;
  const dupes = [];
  while ((vm = varRe.exec(body))) {
    const name = vm[1];
    if (CANON[name] !== undefined && normHex(vm[2]) === CANON[name]) dupes.push(name);
  }
  if (dupes.length) {
    bad++;
    console.error(`❌ ${rel} — chép tay trùng theme.css: ${dupes.join(', ')}`);
    console.error(
      `   Xoá khỏi :root cục bộ, thêm <link rel="stylesheet" href="/theme.css?v=1"> nếu chưa có.`
    );
  }
}

if (bad) {
  console.error(
    `\n${bad} file còn chép tay trùng public/theme.css. Xem docs/reskin-webtoon/PLAN.md Sprint 0.`
  );
  process.exit(1);
}
console.log(
  `✅ check:theme — không file nào chép tay trùng theme.css (${targets.length} file đã quét).`
);
