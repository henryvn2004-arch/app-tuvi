#!/usr/bin/env node
/**
 * Đẩy kho ảnh đã nhập lên Supabase Storage rồi điền `url` vào manifest.
 *
 *   node scripts/stock-upload.mjs --dry-run
 *   node scripts/stock-upload.mjs
 *
 * ============================================================
 * 🔐 VÌ SAO TÁCH KHỎI `stock-ingest.mjs`
 * ============================================================
 * Bước này cần `SUPABASE_SERVICE_KEY` — khoá mở toang cả DB, và khoá này đã
 * phải xoay MỘT LẦN vì lộ. Gộp vào script nhập kho thì ai muốn thử nhập vài
 * bức cũng phải cầm khoá đó trong tay.
 *
 * Tách ra thì: nhập kho chạy được ở bất cứ đâu (chỉ cần khoá Pixabay, thứ lộ
 * ra thì tối đa là hết quota tìm kiếm), còn lượt đẩy — CHẠY ĐÚNG MỘT LẦN —
 * mới cần khoá nặng, và chỉ chạy ở máy Henry.
 *
 * ⛔ KHÔNG đưa bước này vào GitHub Actions. Đây là quyết định đã chốt ở track
 * `clip-ingest`: Actions chỉ được ĐỌC URL công khai, không được cầm service
 * key. Đẩy ảnh là việc một lần, không phải việc của khâu dựng hằng ngày.
 *
 * ⚠️ CHƯA CHẠY ĐƯỢC LƯỢT THÀNH CÔNG NÀO tại thời điểm viết: container phiên
 * làm việc không có `SUPABASE_SERVICE_KEY`. Mới chứng minh được các nhánh TỪ
 * CHỐI. Lượt đẩy thật đầu tiên là phép thử thật; chỗ đáng nhìn nếu hỏng là
 * mã trả về của bước ghi Storage.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const STAGE = join(ROOT, 'remotion/public/stock');
const MANIFEST = join(ROOT, 'lib/video/stock-manifest.json');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');

/**
 * Bucket RIÊNG, không dùng chung `portraits`.
 *
 * `portraits` đang chứa chân dung do model sinh cho người dùng — trộn ảnh
 * stock vào đó là hai loại nội dung khác hẳn nhau về nguồn gốc và quyền dùng
 * nằm chung một chỗ, rồi có ngày dọn nhầm.
 */
const BUCKET = 'stock';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!existsSync(MANIFEST)) {
  console.error(`🔴 Chưa có ${MANIFEST}. Chạy \`node scripts/stock-ingest.mjs\` trước.`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const pending = manifest.images.filter((i) => !i.url);

if (!pending.length) {
  console.log(`✓ Cả ${manifest.images.length} ảnh đều đã có \`url\` — không còn gì để đẩy.`);
  process.exit(0);
}

// Soát ĐỦ file trên đĩa TRƯỚC khi đẩy byte nào: đẩy được nửa chừng rồi mới
// phát hiện thiếu file là để lại manifest nửa vời, chỗ khó dò nhất.
const missing = pending.filter((i) => !existsSync(join(STAGE, i.file)));
if (missing.length) {
  console.error(`🔴 Thiếu ${missing.length} file trên đĩa, ví dụ: ${missing[0].file}`);
  console.error('   Kho ảnh nằm ngoài git. Chạy lại `node scripts/stock-ingest.mjs` để tải về.');
  process.exit(1);
}

const totalBytes = pending.reduce((s, i) => s + statSync(join(STAGE, i.file)).size, 0);
console.log(
  `Sẽ đẩy ${pending.length} ảnh · ${(totalBytes / 1048576).toFixed(1)} MB → bucket "${BUCKET}"`
);

if (DRY) {
  for (const i of pending.slice(0, 5)) console.log(`   [dry] ${i.file}`);
  if (pending.length > 5) console.log(`   … và ${pending.length - 5} bức nữa`);
  console.log('\n[dry-run] Không gọi mạng, không ghi gì.');
  process.exit(0);
}

if (!SB_URL || !SB_KEY) {
  console.error('\n🔴 Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY.');
  console.error('   Đặt ở môi trường CỦA MÁY chạy lượt đẩy, không đặt vào GitHub Actions.');
  console.error('   ⚠️ `.env` nằm trong .gitignore nên KHÔNG tới container cloud —');
  console.error('   lượt đẩy này phải chạy ở nơi thật sự có khoá.');
  process.exit(1);
}

const H = { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY };
let ok = 0;
const failed = [];

for (const img of pending) {
  const path = `${img.file}`;
  const body = readFileSync(join(STAGE, img.file));
  try {
    const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      // `x-upsert` để chạy lại sau khi đứt giữa chừng không vướng "đã tồn tại".
      headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body,
    });
    if (!up.ok) throw new Error(`${up.status} ${(await up.text()).slice(0, 120)}`);
    img.url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    ok++;
    if (ok % 10 === 0) console.log(`   … ${ok}/${pending.length}`);
  } catch (e) {
    failed.push({ file: img.file, why: e.message });
    console.error(`   🔴 ${img.file}: ${e.message}`);
  }
}

// Ghi manifest KỂ CẢ khi có bức hỏng: bức nào đã đẩy được thì đã có `url`, và
// lượt chạy sau chỉ nhặt phần còn thiếu. Bỏ hết đi rồi làm lại từ đầu là đẩy
// lại cả những bức đã xong.
mkdirSync(join(ROOT, 'lib/video'), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n════ XONG ════`);
console.log(`  đẩy được  ${ok}/${pending.length}`);
if (failed.length) {
  console.log(`  hỏng      ${failed.length} — chạy lại script để thử nốt phần thiếu`);
  process.exit(1);
}
console.log(`  manifest  đã điền \`url\`, commit file này là khâu dựng dùng được kho.`);
