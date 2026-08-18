#!/usr/bin/env node
// ============================================================
// DỰNG LẠI KHO NỀN VIDEO TỪ MANIFEST
//
// 🔴 VÌ SAO CẦN: file mp4 nằm NGOÀI git (97MB, `.gitignore` dòng 67) — đúng
// lối tranh quẻ và kho ảnh. Thứ commit là manifest. Nên một bản clone sạch
// (runner GitHub Actions) KHÔNG có byte nào của kho, và `OffthreadVideo` gặp
// 404 rồi kéo sập cả lượt render. Đo được: lượt Actions 32116193607 trượt cả
// hai clip đúng ở chỗ này — *"Received a status code of 404 while downloading
// file .../stock-video/tone/thien-nhien-toi/203449.mp4"*.
//
// 🔑 VÌ SAO TẢI THẲNG TỪ CDN PIXABAY chứ không qua Supabase Storage:
// đẩy lên Storage cần `SUPABASE_SERVICE_KEY` — khoá mở toang cả DB, và cả
// track này đã cố ý KHÔNG đưa nó vào Actions (xem `clip-ingest`). URL CDN của
// Pixabay là ĐƯỜNG DẪN CỐ ĐỊNH (`cdn.pixabay.com/video/<ngày>/<id>-<mã>_<khổ>.mp4`),
// không có chữ ký hết hạn như `webformatURL` của ảnh ⇒ pin được vào manifest
// và tải bằng HTTP TRẦN, runner không cần một khoá nào.
//
// ⚖️ Điều khoản: video KHÁC ảnh đúng một điểm — Pixabay ghi rõ *"Videos **may
// be embedded directly** in your applications"*. Ta vẫn TẢI VỀ (không hotlink
// lúc render) vì lý do khác luật: render lại sau 6 tháng phải ra đúng clip đó.
//
// ⚠️ ĐỐI CHỨNG ĐÃ CHẠY trước khi pin: đo lại độ động trên chính 7 file tải từ
// CDN rồi so với manifest (vốn đo trên bản ffmpeg thu nhỏ tại máy) — lệch tối
// đa **0,03** ở `mean` và **0,10** ở `spread`, cả 7 vẫn qua `MOTION_MIN` /
// `MOTION_SPREAD_MIN`. Tức đổi nguồn file KHÔNG đổi nghĩa phép đo của cổng.
// Đổi biến thể khổ (`variant`) thì phải đo lại — đừng sửa mò.
//
// Dùng:
//   node scripts/restore-stock.mjs            # tải phần còn thiếu
//   node scripts/restore-stock.mjs --dry-run  # chỉ liệt kê, 0 lượt mạng
//   node scripts/restore-stock.mjs --force    # tải lại kể cả file đã có
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { ensureProxyEnv, sleep, findFfmpeg } from './stock-lib.mjs';

ensureProxyEnv();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'lib/video/stock-video-manifest.json');
const DEST_DIR = path.join(ROOT, 'remotion/public/stock-video');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const FORCE = argv.includes('--force');

/**
 * Chấp nhận lệch nhẹ so với `bytes` trong manifest: CDN có thể mã hoá lại một
 * biến thể mà nội dung không đổi. Lệch quá ngưỡng này thì coi như file hỏng
 * (tải dở) và tải lại — thà tốn một lượt mạng còn hơn render ra clip đứng hình.
 */
const BYTE_TOLERANCE = 0.02;

/** Mọi mp4 hợp lệ có hộp `ftyp` trong 12 byte đầu. Bắt ca "tải về một trang lỗi". */
function looksLikeMp4(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(12);
    if (fs.readSync(fd, buf, 0, 12, 0) < 12) return false;
    return buf.slice(4, 8).toString('latin1') === 'ftyp';
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function ok(file, bytes) {
  if (!fs.existsSync(file)) return false;
  const got = fs.statSync(file).size;
  if (!bytes) return got > 0 && looksLikeMp4(file);
  return Math.abs(got - bytes) / bytes <= BYTE_TOLERANCE && looksLikeMp4(file);
}

/**
 * Thu nhỏ về khổ đã lưu — CHỈ chạy cho đoạn manifest đánh dấu `rescaled`, tức
 * Pixabay không phát sẵn biến thể đúng khổ. Tham số phải TRÙNG KHÍT lượt nhập
 * kho (`stock-video.mjs`), nếu không thì file dựng lại khác file cổng đã đo.
 */
function thuNho(src, dest, width) {
  execFileSync(findFfmpeg(), [
    '-hide_banner',
    '-v',
    'error',
    '-i',
    src,
    '-vf',
    `scale=${width}:-2`,
    '-c:v',
    'libx264',
    '-crf',
    '20',
    '-preset',
    'medium',
    '-an',
    '-movflags',
    '+faststart',
    '-y',
    dest,
  ]);
}

async function tai(v, dest) {
  const res = await fetch(v.url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Ghi ra file tạm rồi mới đổi tên: lượt tải đứt giữa chừng KHÔNG để lại một
  // file cụt trông như đã xong (lượt sau sẽ bỏ qua nó rồi render ra clip hỏng).
  const tmp = `${dest}.part`;
  fs.writeFileSync(tmp, buf);
  if (v.rescaled) {
    const nho = `${dest}.small`;
    thuNho(tmp, nho, v.width);
    fs.rmSync(tmp, { force: true });
    fs.renameSync(nho, dest);
  } else {
    fs.renameSync(tmp, dest);
  }
  return fs.statSync(dest).size;
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Không thấy manifest: ${MANIFEST}`);
    process.exit(1);
  }
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const videos = Array.isArray(m.videos) ? m.videos : [];
  if (!videos.length) {
    console.error('Manifest không có đoạn nào.');
    process.exit(1);
  }

  const thieuUrl = videos.filter((v) => !v.url);
  if (thieuUrl.length) {
    console.error(
      `${thieuUrl.length} đoạn trong manifest CHƯA có trường \`url\`:\n` +
        thieuUrl.map((v) => `  · ${v.file}`).join('\n') +
        `\n\nChạy \`node scripts/stock-video.mjs --bucket tone\` để nhập lại kho ` +
        `(lượt nhập ghi kèm URL CDN), hoặc bổ sung tay vào manifest.`
    );
    process.exit(1);
  }

  let coSan = 0;
  const canTai = [];
  for (const v of videos) {
    const dest = path.join(DEST_DIR, v.file);
    if (!FORCE && ok(dest, v.bytes)) coSan++;
    else canTai.push(v);
  }

  console.log(`Kho nền video: ${videos.length} đoạn · có sẵn ${coSan} · cần tải ${canTai.length}`);

  if (DRY) {
    for (const v of canTai) console.log(`  tải  ${v.file}  ←  ${v.url}`);
    console.log('(--dry-run: 0 lượt mạng)');
    return;
  }
  if (!canTai.length) {
    console.log('Đủ cả kho, không phải tải gì.');
    return;
  }

  let tong = 0;
  const hong = [];
  for (const v of canTai) {
    const dest = path.join(DEST_DIR, v.file);
    try {
      const n = await tai(v, dest);
      tong += n;
      if (!looksLikeMp4(dest)) throw new Error('không phải mp4 (thiếu hộp ftyp)');
      console.log(`  ✓ ${v.file}  ${(n / 1e6).toFixed(1)}MB`);
    } catch (e) {
      hong.push({ file: v.file, url: v.url, ly: e.message });
      console.log(`  ✗ ${v.file}  ${e.message}`);
    }
    // Tuần tự + nghỉ ngắn: cùng lối tôn trọng nhà cung cấp như `stock-video.mjs`.
    await sleep(250);
  }

  console.log(`Đã tải ${(tong / 1e6).toFixed(1)}MB.`);

  if (hong.length) {
    const huongDan =
      `URL CDN Pixabay là đường dẫn cố định, nên 404 ở đây nghĩa là nhà cung ` +
      `cấp đã GỠ đoạn phim. Chạy \`node scripts/stock-video.mjs --bucket tone\` ` +
      `để tuyển đoạn thay thế, rồi sửa \`backdropVideo\` trong ` +
      `\`lib/video/sources/insight.ts\` cho khớp.`;
    const danhSach = hong.map((h) => `  · ${h.file} — ${h.ly}\n    ${h.url}`).join('\n');

    /*
     * 🔑 HỎNG MỘT PHẦN ≠ HỎNG CẢ KHO — và phân biệt được hai ca đó mới là chỗ
     * đáng giá của khối này.
     *
     * Bản đầu `exit(1)` cho MỌI ca hỏng. Bước này chạy TRƯỚC bước dựng clip
     * trong workflow, nên đúng một đoạn phim bị Pixabay gỡ là **cả tuần không
     * giao được clip nào** — kể cả 5 clip khác có đủ nền. Nghịch thẳng tính
     * chất số 2 mà chính `build-video-batch.mjs` khai ở đầu file: *"hỏng một
     * clip KHÔNG kéo cả loạt"*.
     *
     * Nay chỉ chặn khi **KHO RỖNG HOÀN TOÀN** — đó là dấu hiệu của hạ tầng
     * (mất mạng, egress chặn), chứ một nhà cung cấp không xoá sạch kho trong
     * cùng một đêm. Hỏng lẻ thì kêu TO rồi đi tiếp: clip nào cần đúng đoạn đó
     * sẽ tự trượt ở `OffthreadVideo` và batch bắt riêng nó.
     *
     * 🪤 **Phép đo đầu của tôi SAI và red-team bắt được**: tôi chốt bằng
     * `tong === 0` (số byte tải về). Ca thật hay gặp nhất — 6 đoạn ĐÃ CÓ trên
     * đĩa, đúng 1 đoạn bị gỡ — cũng cho `tong === 0` vì không tải nổi byte nào,
     * nên nó đọc "kho vẫn còn 6 đoạn dùng được" thành "cả kho chết" rồi chặn.
     * Đại lượng đúng là **kho CÒN DÙNG ĐƯỢC bao nhiêu đoạn**, không phải tải về
     * bao nhiêu byte. Cùng lớp bài học "ô `fix` phải nêu đúng đại lượng phép đo
     * đọc" vừa vá ở `gate-machine`.
     *
     * ⚠️ Kêu to là BẮT BUỘC, không phải trang trí: kho thiếu âm thầm thì lượt
     * sau lại tưởng đủ. Vì thế còn ghi thẳng vào tóm tắt lượt chạy.
     */
    const dungDuoc = coSan + (canTai.length - hong.length);
    const toanBo = dungDuoc === 0;
    console.error(
      `\n${toanBo ? '🔴' : '⚠️'} ${hong.length} đoạn KHÔNG tải được:\n${danhSach}\n\n${huongDan}`
    );

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `\n## 🎞️ Kho nền video\n\n${toanBo ? '🔴' : '⚠️'} **${hong.length}/${videos.length} đoạn không tải được** (kho còn ${dungDuoc} đoạn dùng được)` +
          (toanBo ? ' — KHÔNG đoạn nào tải được, nhiều khả năng là mạng/egress.\n\n' : '\n\n') +
          `${danhSach}\n\n${huongDan}\n` +
          (toanBo
            ? ''
            : '\n> Vẫn dựng tiếp. Clip nào cần đúng đoạn thiếu sẽ tự trượt và được bắt riêng.\n')
      );
    }

    if (toanBo) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
