#!/usr/bin/env node
// npm run i18n:fonts — dựng font CJK tự lưu trữ cho trang ja/ko/zh-tw/zh-cn.
// Nguồn: gói npm @fontsource-variable/noto-sans-{jp,kr,tc,sc} (devDependencies, KHÔNG
// commit file font). Chạy trong `prebuild`; ra public/fonts/cjk/*.woff2 +
// public/fonts/i18n-<locale>.css (cả hai gitignore, SINH).
//
// 🔑 Chỉ NẠP khi đúng ngôn ngữ: render.mjs chèn <link href="/fonts/i18n-<locale>.css">
// duy nhất cho locale CJK; trang vi/en không đụng tới. Và mỗi @font-face có
// unicode-range theo lát (≈120 lát/ngôn ngữ) nên trình duyệt chỉ tải đúng
// những lát có chữ trên trang, không tải cả 5 MB.
// 🔑 CLS: font-display:swap + ngăn xếp có font hệ thống CJK. Glyph CJK rộng đúng
// 1em ở hầu hết font nên đổi Noto ↔ hệ thống ít xô dòng; 'Be Vietnam Pro' đứng
// ĐẦU để chữ Latin/số giữ nét thương hiệu (nó không có glyph CJK nên CJK rơi xuống
// font kế tiếp). `:where()` giữ độ ưu tiên của luật = (0,1,1): thắng `body{font-family}`
// của trang nhưng thua mọi luật lớp của riêng từng khối (vd tiêu đề Noto Serif).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './_common.mjs';

const FONTS = {
  ja: {
    pkg: 'noto-sans-jp',
    family: 'Noto Sans JP',
    sys: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo'",
  },
  ko: { pkg: 'noto-sans-kr', family: 'Noto Sans KR', sys: "'Apple SD Gothic Neo','Malgun Gothic'" },
  'zh-tw': {
    pkg: 'noto-sans-tc',
    family: 'Noto Sans TC',
    sys: "'PingFang TC','Microsoft JhengHei'",
  },
  'zh-cn': { pkg: 'noto-sans-sc', family: 'Noto Sans SC', sys: "'PingFang SC','Microsoft YaHei'" },
};
const outDir = path.join(ROOT, 'public/fonts/cjk');
fs.mkdirSync(outDir, { recursive: true });
let slices = 0;
for (const [loc, f] of Object.entries(FONTS)) {
  const src = path.join(ROOT, 'node_modules/@fontsource-variable', f.pkg);
  if (!fs.existsSync(src)) {
    console.warn(`i18n:fonts: thiếu ${f.pkg} (npm ci chưa chạy?) — bỏ qua ${loc}`);
    continue;
  }
  let css = fs.readFileSync(path.join(src, 'wght.css'), 'utf8');
  const used = new Set();
  css = css
    .replace(/font-family:\s*'[^']*'/g, `font-family:'${f.family}'`)
    .replace(/url\(\.\/files\/([^)]+)\)\s*format\('woff2-variations'\)/g, (_m, file) => {
      used.add(file);
      return `url(/fonts/cjk/${file}) format('woff2')`;
    })
    .replace(/\/\*[^*]*\*\//g, '');
  for (const file of used) fs.copyFileSync(path.join(src, 'files', file), path.join(outDir, file));
  slices += used.size;
  const stack = `'Be Vietnam Pro','${f.family}',${f.sys},system-ui,sans-serif`;
  css += `\nhtml[lang]:where([lang="${loc === 'zh-tw' ? 'zh-Hant-TW' : loc === 'zh-cn' ? 'zh-Hans-CN' : loc}"]) :where(body,button,input,select,textarea){font-family:${stack}}\n`;
  fs.writeFileSync(
    path.join(ROOT, `public/fonts/i18n-${loc}.css`),
    css.replace(/\n\s*/g, '\n').trim() + '\n'
  );
}
console.log(
  `i18n:fonts: ${slices} lát woff2 → public/fonts/cjk · css → public/fonts/i18n-<locale>.css`
);
