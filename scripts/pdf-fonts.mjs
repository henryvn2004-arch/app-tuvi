#!/usr/bin/env node
// npm run pdf:fonts — font CJK TĨNH cho PDF (lib/pdf/cjk-font.ts), i18n W18. Chạy trong `prebuild`.
//
// 🔴 Vì sao không dùng lát woff2 của `i18n:fonts` (trang web dùng): đó là font BIẾN THIÊN cắt ~120 lát
// CÙNG tên PostScript — pdfkit (react-pdf) cache font theo tên ⇒ glyph lát này vẽ bằng bảng của lát kia
// ⇒ chữ bóc ra được (`pdftotext` xanh) mà trang IN RA TRẮNG; bản mặc định còn là nét Thin. Đã đo bằng
// render PNG thật. PDF cần MỘT file tĩnh đủ chữ cho mỗi ngôn ngữ.
//
// Nguồn: bản TTF tĩnh của Google Fonts trong gói npm `@expo-google-fonts/noto-sans-*` (ghim phiên bản),
// tải QUA jsDelivr đúng 4 file thay vì cài 4 gói (~270 MB đủ mọi độ đậm) vào mọi lượt `npm ci`.
// Ghim sha256 — file đổi là DỪNG build, không âm thầm nhúng font lạ. Tải hỏng ⇒ exit 1 (build đỏ có
// tiếng, còn hơn PDF tiếng Nhật in ra trắng mà không ai biết).
// Ra `data/pdf-fonts/` (gitignore); các route dựng PDF mang theo qua `outputFileTracingIncludes`.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'data/pdf-fonts');
const VER = '0.4.4';
/** file đích → [gói, đường dẫn trong gói, sha256] */
export const PDF_FONTS = {
  'NotoSansJP-Regular.ttf': ['noto-sans-jp', '400Regular/NotoSansJP_400Regular.ttf', '6255ea4692e97ef27330304fb96fd650f9111f868cd585fcf2802d42823930e5'],
  'NotoSansKR-Regular.ttf': ['noto-sans-kr', '400Regular/NotoSansKR_400Regular.ttf', 'b4a747e78805bc25b610dcfc3003cb5fb2e2ec034763774b24216ed15889eef4'],
  'NotoSansTC-Regular.ttf': ['noto-sans-tc', '400Regular/NotoSansTC_400Regular.ttf', 'add35d53f70727657b4509531677c4e3712b67df3d54661efdee5d3a0c16d954'],
  'NotoSansSC-Regular.ttf': ['noto-sans-sc', '400Regular/NotoSansSC_400Regular.ttf', 'd45f67f0a7c0ca3f256950777ce6a61cc7ce5f9696d02900cbbaac25f8aa7d16'],
};

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const [file, [pkg, rel, want]] of Object.entries(PDF_FONTS)) {
  const dst = path.join(OUT, file);
  if (fs.existsSync(dst) && sha(fs.readFileSync(dst)) === want) continue;
  const url = `https://cdn.jsdelivr.net/npm/@expo-google-fonts/${pkg}@${VER}/${rel}`;
  let ok = false;
  for (let i = 1; i <= 3 && !ok; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const got = sha(buf);
      if (got !== want) throw new Error(`sha256 lệch (${got})`);
      fs.writeFileSync(dst, buf);
      ok = true;
    } catch (e) {
      console.error(`pdf:fonts: ${file} lượt ${i}/3 hỏng — ${e.message}`);
      if (i < 3) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  if (!ok) bad++;
}
if (bad) {
  console.error(`❌ pdf:fonts: thiếu ${bad} font — PDF tiếng Nhật/Hàn/Trung sẽ mất glyph. (Máy sau proxy: NODE_USE_ENV_PROXY=1)`);
  process.exit(1);
}
console.log(`pdf:fonts: ${Object.keys(PDF_FONTS).length} font CJK tĩnh → data/pdf-fonts/`);
