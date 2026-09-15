#!/usr/bin/env node
/**
 * Sinh bản ẢNH NHỎ DÀNH RIÊNG CHO IN (`<id>-print.webp`) từ mọi ảnh minh hoạ
 * đã có trong `portraits/illus/` trên Supabase Storage.
 *
 * Vì sao cần: `.webp` màn hình (1536x1024, ~270KB, xem `illus-match.js`) đã
 * nén tốt cho HIỂN THỊ — nhưng Chromium `page.pdf()`/`window.print()` khi
 * nhúng ảnh vào PDF KHÔNG giữ nguyên byte WebP đã nén (Skia giải mã rồi nhúng
 * lại gần-như-lossless). PDF Luận Giải Lá Số (13 ảnh) đo thật ra ~41MB dù mỗi
 * ảnh nguồn chỉ ~270KB — vượt trần dung lượng bucket `samples`. Ảnh IN ra
 * nhỏ hơn (kích thước PIXEL nhỏ hơn hẳn) thì dù Chromium nhúng lossless cũng
 * nhỏ theo. `illus-match.js` `buildUrl()` đã trả thêm `printUrl` trỏ đúng
 * file này; các trang dùng `<picture><source media="print" srcset=printUrl>`.
 *
 * ⚠️ Resize CHỈ theo CHIỀU RỘNG (sharp tự suy chiều cao giữ tỉ lệ) — KHÔNG ép
 * cả hai chiều. Đây chính là lỗi đã vá ở #851 (900x1024 từ ảnh gốc 1536x1024
 * = CROP mất 40% ngang, không phải resize). Script assert lại tỉ lệ khung
 * hình ra khớp tỉ lệ vào (sai lệch < 0.5%) để không lặp lại bug đó.
 *
 * Đọc từ `.png` gốc (nguồn thật, không đổi) — không đọc lại từ `.webp` màn
 * hình để tránh nén-chồng-nén (double lossy).
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/gen-illus-print.mjs
 *   node scripts/gen-illus-print.mjs --dry-run        # chỉ liệt kê, không ghi
 *   node scripts/gen-illus-print.mjs --only dien-trach # lọc theo tiền tố id
 *   node scripts/gen-illus-print.mjs --width 640        # mặc định 640px rộng
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);
const DRY = has('--dry-run');
const ONLY = flag('--only', '');
const PRINT_WIDTH = parseInt(flag('--width', '640'), 10);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Thiếu biến môi trường ${name}.`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET = 'portraits';
const PREFIX = 'illus';
const CACHE_CONTROL = '31536000'; // 1 năm — ảnh tĩnh, vẽ một lần dùng mãi.

async function listAllPng() {
  let all = [],
    offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(PREFIX, { limit: 1000, offset });
    if (error) throw error;
    if (!data.length) break;
    all = all.concat(data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  return all.filter((f) => f.name.endsWith('.png')).map((f) => f.name.replace(/\.png$/, ''));
}

/** PNG gốc (bytes) → webp NHỎ CHO IN — resize CHỈ theo chiều rộng (sharp tự
 * suy chiều cao), assert tỉ lệ khung hình ra khớp tỉ lệ vào. */
async function toWebpPrint(pngBuf) {
  const meta = await sharp(pngBuf).metadata();
  const webp = await sharp(pngBuf).resize({ width: PRINT_WIDTH }).webp({ quality: 78 }).toBuffer();
  const outMeta = await sharp(webp).metadata();
  const ratioIn = meta.width / meta.height;
  const ratioOut = outMeta.width / outMeta.height;
  if (Math.abs(ratioIn - ratioOut) / ratioIn > 0.005) {
    throw new Error(
      `tỉ lệ khung hình lệch sau resize: vào ${meta.width}x${meta.height} (${ratioIn.toFixed(4)}), ra ${outMeta.width}x${outMeta.height} (${ratioOut.toFixed(4)})`
    );
  }
  return { webp, width: outMeta.width, height: outMeta.height };
}

async function fixOne(id) {
  const pngPath = `${PREFIX}/${id}.png`;
  const printPath = `${PREFIX}/${id}-print.webp`;
  const { data: pngBlob, error: dlErr } = await supabase.storage.from(BUCKET).download(pngPath);
  if (dlErr) throw new Error(`tải ${pngPath} lỗi: ${dlErr.message}`);
  const pngBuf = Buffer.from(await pngBlob.arrayBuffer());
  const { webp, width, height } = await toWebpPrint(pngBuf);

  if (DRY) {
    console.log(`(dry) ${id}: → ${width}x${height} · ${(webp.length / 1024).toFixed(0)}KB`);
    return { webpBytes: webp.length };
  }

  const up = await supabase.storage.from(BUCKET).upload(printPath, webp, {
    contentType: 'image/webp',
    cacheControl: CACHE_CONTROL,
    upsert: true,
  });
  if (up.error) throw new Error(`upload ${printPath} lỗi: ${up.error.message}`);

  console.log(`✅ ${id}  ·  ${width}x${height}  ·  ${(webp.length / 1024).toFixed(0)}KB`);
  return { webpBytes: webp.length };
}

async function main() {
  const ids = await listAllPng();
  const filtered = ONLY ? ids.filter((id) => id.startsWith(ONLY)) : ids;
  console.log(
    `${filtered.length}/${ids.length} ảnh trong Storage${ONLY ? ` (lọc "${ONLY}")` : ''}${DRY ? ' · DRY-RUN' : ''} — chiều rộng in ${PRINT_WIDTH}px`
  );

  let ok = 0,
    loi = 0,
    total = 0;
  for (const id of filtered) {
    try {
      const r = await fixOne(id);
      total += r.webpBytes;
      ok++;
    } catch (e) {
      loi++;
      console.error(`❌ ${id}: ${e.message}`);
    }
  }
  console.log(`\nXong: ${ok} ảnh · lỗi ${loi} · tổng ${(total / 1e6).toFixed(1)}MB`);
  if (loi) process.exitCode = 1;
}

main();
