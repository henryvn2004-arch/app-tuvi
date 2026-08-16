#!/usr/bin/env node
/**
 * Quay màn hình THẬT một công cụ trên tuviminhbao.com bằng Playwright, lấy clip
 * làm nguyên liệu cho Remotion dựng video dọc 9:16.
 *
 *   node scripts/record-tool-demo.mjs --tool than-so-hoc
 *   node scripts/record-tool-demo.mjs --tool than-so-hoc --dry-run
 *   node scripts/record-tool-demo.mjs --tool than-so-hoc --base http://localhost:3000
 *
 * VÌ SAO QUAY MÀN HÌNH THẬT thay vì vẽ lại giao diện bằng React: giao diện vẽ
 * lại sẽ trôi khỏi trang thật ngay lần deploy sau, và người xem clip rồi vào
 * site sẽ thấy hai thứ khác nhau. Quay thật thì clip luôn đúng bản đang chạy —
 * quay lại là cập nhật.
 *
 * ⚠️ CHỈ quay các công cụ MIỄN PHÍ (18/54 tool, `tool_pricing.is_free = true`).
 * Tool trả phí cần tài khoản có Lượng và đụng vào đường thanh toán thật — không
 * để một script tự động chạy vào đó.
 *
 * Đã có file thì BỎ QUA (dùng `--force` để quay lại) — chạy lại sau khi đứt
 * mạng không phải quay lại từ đầu. Cùng lối `scripts/gen-que-images.mjs`.
 */
import { existsSync, mkdirSync, renameSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { chromium, devices } from '@playwright/test';
import { TOOL_RECIPES } from './tool-recipes.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'remotion/public/recordings');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const TOOL = val('--tool', '');
const BASE = val('--base', 'https://www.tuviminhbao.com');
const DRY = has('--dry-run');
const FORCE = has('--force');
const HEADED = has('--headed');

if (!TOOL) {
  console.error('Thiếu --tool. Các tool đã có công thức quay:');
  for (const k of Object.keys(TOOL_RECIPES)) console.error('  ' + k);
  process.exit(1);
}

const recipe = TOOL_RECIPES[TOOL];
if (!recipe) {
  console.error(`❌ Chưa có công thức quay cho "${TOOL}".`);
  console.error('   Thêm một mục vào scripts/tool-recipes.mjs rồi chạy lại.');
  process.exit(1);
}

// Phục vụ `public/` tại chỗ thì không có rewrite `/app/<tool>` của Next — phải
// dùng thẳng tên file. Nhận diện bằng chính địa chỉ máy cục bộ.
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);

/**
 * Chọn đường dẫn bằng cách THĂM DÒ THẬT, không đoán theo tên máy.
 *
 * 🪤 Bản đầu suy từ host (`localhost` ⇒ bản phục vụ tĩnh) và nó chặn oan đúng
 * cái đường mà chính thông báo lỗi của nó khuyên dùng: `next dev` cũng chạy ở
 * `127.0.0.1` nhưng CÓ đủ rewrite `/app/*` lẫn route API. Thứ quyết định không
 * phải tên máy mà là **đường dẫn thật có tồn tại không** — nên hỏi thẳng.
 *
 * 🔴 Và `localPath: null` vẫn phải hỏng TO khi không còn đường nào: mở
 * `/app/<tool>` trên một server tĩnh chỉ trả 404 rồi quay ra 20 giây trang
 * trắng — ca đó khâu soi file KHÔNG bắt được, vì mp4 vẫn đủ hình đủ tiếng.
 */
async function alive(path) {
  try {
    const r = await fetch(BASE + path, { method: 'GET', redirect: 'follow' });
    return r.ok;
  } catch {
    return false;
  }
}

let PAGE_PATH = recipe.path;
if (isLocal && !(await alive(recipe.path))) {
  if (!recipe.localPath) {
    console.error(`❌ "${TOOL}": ${BASE}${recipe.path} không mở được, và công cụ này`);
    console.error('   KHÔNG có đường thay thế ở bản phục vụ tĩnh (lý do khai trong');
    console.error('   scripts/tool-recipes.mjs: cần route API, hoặc trang nhận diện');
    console.error('   chế độ theo đường dẫn).');
    console.error('   → quay từ prod, hoặc `npm run dev` rồi --base http://127.0.0.1:3000');
    process.exit(1);
  }
  PAGE_PATH = recipe.localPath;
}

const outFile = join(OUT_DIR, `${TOOL}.webm`);

if (DRY) {
  console.log(`[dry-run] sẽ mở : ${BASE}${PAGE_PATH}`);
  console.log(`[dry-run] ghi ra : ${outFile}`);
  process.exit(0);
}

if (existsSync(outFile) && !FORCE) {
  console.log(`⏭  Đã có ${outFile} — bỏ qua (dùng --force để quay lại).`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
const tmpDir = join(OUT_DIR, `.tmp-${TOOL}`);
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

// ⚠️ Proxy: Chromium không tự đọc biến môi trường, phải truyền tường minh —
// NHƯNG chỉ khi quay trang ở xa. Bật proxy lúc quay máy cục bộ thì chính lượt
// gọi 127.0.0.1 cũng bị đẩy qua proxy và chết bằng `ERR_CONNECTION_RESET`
// (đã vấp thật, mất một lượt chẩn nhầm sang phía trang).
//
// 🔴 Và ghi lại để phiên sau khỏi mất công: trong container phát triển này,
// Chromium KHÔNG ra được Internet dù `curl`/`node fetch` ra bình thường — mọi
// host đều `ERR_CONNECTION_RESET`, kể cả host nằm trong NO_PROXY. Nên quay
// trang prod PHẢI chạy ở máy có mạng cho trình duyệt; ở đây thì phục vụ
// `public/` tại chỗ rồi quay (xem `--base`).
const PROXY = isLocal ? '' : process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: !HEADED,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(PROXY ? { proxy: { server: PROXY } } : {}),
});

// Khổ quay: dọc, tỉ lệ gần điện thoại thật. Emulate hẳn iPhone để trang chạy
// đúng nhánh CSS mobile — quay ở khổ desktop rồi cắt dọc sẽ ra bố cục mà người
// dùng điện thoại không bao giờ nhìn thấy.
const context = await browser.newContext({
  ...devices['iPhone 14 Pro'],
  // ⚠️ Kích thước quay phải TRÙNG KHÍT viewport của thiết bị đang giả lập
  // (iPhone 14 Pro = 393×852). Khai lệch thì Playwright chèn dải xám quanh
  // khung hình để bù tỉ lệ — dải đó đi thẳng vào clip và nhìn như lỗi render.
  recordVideo: { dir: tmpDir, size: { width: 393, height: 852 } },
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

let ok = false;
try {
  console.log(`▶  Mở ${BASE}${PAGE_PATH}`);
  // 'networkidle' treo vĩnh viễn ở môi trường chặn Google Fonts — bài học đã
  // ghi trong CLAUDE.md, đừng đổi lại.
  await page.goto(BASE + PAGE_PATH, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(recipe.settleMs ?? 2500);

  await recipe.run(page);

  ok = true;
  console.log('✓  Quay xong.');
} catch (e) {
  console.error('❌ Lỗi khi quay:', e.message);
} finally {
  await context.close(); // Playwright chỉ ghi file video khi context đóng.
  await browser.close();
}

if (errors.length) {
  console.warn(`⚠  Trang có ${errors.length} lỗi JS:`);
  for (const e of errors.slice(0, 3)) console.warn('   ' + e.split('\n')[0]);
}

const files = existsSync(tmpDir) ? readdirSync(tmpDir).filter((f) => f.endsWith('.webm')) : [];
if (!ok || files.length === 0) {
  rmSync(tmpDir, { recursive: true, force: true });
  console.error('❌ Không có file quay nào được tạo.');
  process.exit(1);
}

renameSync(join(tmpDir, files[0]), outFile);
rmSync(tmpDir, { recursive: true, force: true });
console.log(`✓  ${outFile}`);
