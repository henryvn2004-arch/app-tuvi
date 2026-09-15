#!/usr/bin/env node
/**
 * Sửa lại bản `.webp` SAI trong `portraits/illus/` (Supabase Storage).
 *
 * Một phiên khác (đang làm tính năng PDF) đã tạo webp bằng cách CROP DỌC
 * 1536×1024 (khổ ngang gốc) xuống 900×1024 — mất hẳn 2 bên khung hình, đúng
 * kiểu "cắt đầu cắt đuôi" Henry chụp màn hình báo. Script này đọc lại ĐÚNG
 * PNG gốc (nguồn thật, không đổi), encode webp KHÔNG resize/crop — assert
 * cứng kích thước ra phải khớp kích thước vào — rồi ghi đè + set
 * cache-control dài hạn (ảnh tĩnh, vẽ một lần dùng mãi, không có lý do gì
 * phải revalidate mỗi lượt xem).
 *
 * Tiện thể sửa luôn cache-control của chính file .png (đang `no-cache` vì
 * upload tay qua Supabase Studio không set) — dù sau khi đổi
 * `illus-match.js` sang trỏ `.webp` thì .png không còn được phục vụ nữa,
 * vẫn để lại làm nguồn dự phòng đúng đắn.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/reencode-illus.mjs
 *   node scripts/reencode-illus.mjs --dry-run              # chỉ liệt kê, không ghi
 *   node scripts/reencode-illus.mjs --local .illus          # thêm cả ảnh local mới gen (upload cả .png lẫn .webp)
 *   node scripts/reencode-illus.mjs --only dien-trach        # lọc id CHỨA đoạn này (test trước khi chạy hết,
 *                                                            # cũng dùng để chọn riêng một lứa vd "--only trung-nien")
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
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
const LOCAL_DIR = flag('--local', '');

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

/** Đổi PNG (bytes) → webp KHÔNG resize/crop — assert kích thước ra khớp kích
 * thước vào, dừng CẢ LƯỢT nếu lệch (đúng lỗi vừa vá, không lặp lại nó). */
async function toWebpSameSize(pngBuf) {
  const meta = await sharp(pngBuf).metadata();
  const webp = await sharp(pngBuf).webp({ quality: 82 }).toBuffer();
  const outMeta = await sharp(webp).metadata();
  if (outMeta.width !== meta.width || outMeta.height !== meta.height) {
    throw new Error(
      `kích thước lệch sau encode: vào ${meta.width}x${meta.height}, ra ${outMeta.width}x${outMeta.height}`
    );
  }
  return { webp, width: meta.width, height: meta.height };
}

async function fixOne(id) {
  const pngPath = `${PREFIX}/${id}.png`;
  const webpPath = `${PREFIX}/${id}.webp`;
  const { data: pngBlob, error: dlErr } = await supabase.storage.from(BUCKET).download(pngPath);
  if (dlErr) throw new Error(`tải ${pngPath} lỗi: ${dlErr.message}`);
  const pngBuf = Buffer.from(await pngBlob.arrayBuffer());
  const { webp, width, height } = await toWebpSameSize(pngBuf);

  if (DRY) {
    console.log(
      `(dry) ${id}: ${width}x${height} · png ${(pngBuf.length / 1024).toFixed(0)}KB → webp ${(webp.length / 1024).toFixed(0)}KB`
    );
    return { pngBytes: pngBuf.length, webpBytes: webp.length };
  }

  const up1 = await supabase.storage.from(BUCKET).upload(webpPath, webp, {
    contentType: 'image/webp',
    cacheControl: CACHE_CONTROL,
    upsert: true,
  });
  if (up1.error) throw new Error(`upload ${webpPath} lỗi: ${up1.error.message}`);

  // Vá luôn cache-control của chính .png (giữ nguyên bytes, chỉ set lại header).
  const up2 = await supabase.storage.from(BUCKET).upload(pngPath, pngBuf, {
    contentType: 'image/png',
    cacheControl: CACHE_CONTROL,
    upsert: true,
  });
  if (up2.error) throw new Error(`vá cache-control ${pngPath} lỗi: ${up2.error.message}`);

  console.log(
    `✅ ${id}  ·  ${width}x${height}  ·  png ${(pngBuf.length / 1024).toFixed(0)}KB → webp ${(webp.length / 1024).toFixed(0)}KB`
  );
  return { pngBytes: pngBuf.length, webpBytes: webp.length };
}

/** Ảnh local mới gen (chưa từng có trên Storage) — upload cả .png lẫn .webp
 * đúng cache-control ngay từ đầu, đỡ một vòng vá lại về sau. */
async function uploadLocal(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
  console.log(`\n${files.length} ảnh local trong ${dir} — upload lên Storage`);
  let ok = 0,
    loi = 0;
  for (const f of files) {
    const id = basename(f, '.png');
    if (ONLY && !id.includes(ONLY)) continue;
    try {
      const pngBuf = readFileSync(join(dir, f));
      const { webp, width, height } = await toWebpSameSize(pngBuf);
      if (DRY) {
        console.log(`(dry, local) ${id}: ${width}x${height}`);
        continue;
      }
      const pngPath = `${PREFIX}/${id}.png`;
      const webpPath = `${PREFIX}/${id}.webp`;
      const up1 = await supabase.storage.from(BUCKET).upload(pngPath, pngBuf, {
        contentType: 'image/png',
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
      if (up1.error) throw new Error(up1.error.message);
      const up2 = await supabase.storage.from(BUCKET).upload(webpPath, webp, {
        contentType: 'image/webp',
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
      if (up2.error) throw new Error(up2.error.message);
      console.log(
        `✅ ${id}  ·  ${width}x${height}  ·  png ${(pngBuf.length / 1024).toFixed(0)}KB → webp ${(webp.length / 1024).toFixed(0)}KB`
      );
      ok++;
    } catch (e) {
      loi++;
      console.error(`❌ ${id}: ${e.message}`);
    }
  }
  console.log(`\nLocal: upload ${ok} · lỗi ${loi}`);
}

async function main() {
  const ids = await listAllPng();
  const filtered = ONLY ? ids.filter((id) => id.includes(ONLY)) : ids;
  console.log(
    `${filtered.length}/${ids.length} ảnh trong Storage${ONLY ? ` (lọc "${ONLY}")` : ''}${DRY ? ' · DRY-RUN' : ''}`
  );

  let ok = 0,
    loi = 0,
    pngTotal = 0,
    webpTotal = 0;
  for (const id of filtered) {
    try {
      const r = await fixOne(id);
      pngTotal += r.pngBytes;
      webpTotal += r.webpBytes;
      ok++;
    } catch (e) {
      loi++;
      console.error(`❌ ${id}: ${e.message}`);
    }
  }
  console.log(
    `\nStorage: sửa ${ok} · lỗi ${loi} · tổng png ${(pngTotal / 1e6).toFixed(1)}MB → webp ${(webpTotal / 1e6).toFixed(1)}MB`
  );
  if (loi) process.exitCode = 1;

  if (LOCAL_DIR) {
    if (!existsSync(LOCAL_DIR)) {
      console.error(`❌ Không thấy thư mục local ${LOCAL_DIR}`);
      process.exitCode = 1;
      return;
    }
    await uploadLocal(LOCAL_DIR);
  }
}

main();
