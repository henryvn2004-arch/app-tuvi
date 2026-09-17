#!/usr/bin/env node
/**
 * Sinh ảnh đại diện cho từng tool — webtoon/chibi, Minh Bảo neo ẢNH (giống
 * hero-banner) — xem `lib/media/tool-avatar-prompt.ts` cho bảng chủ đề từng
 * tool và khối phong cách chung.
 *
 * Ảnh là ASSET TĨNH, sinh MỘT LẦN rồi thôi (giống `gen-que-images.mjs`).
 *
 * 🔴 LUÔN gọi `images/edits` — neo `ANCHOR_IMAGE_PATH` (ảnh Minh Bảo đã
 * commit trong `public/`) để giữ đúng khuôn mặt qua 52 lượt vẽ riêng, không
 * phải `images/generations` thuần (tả bằng chữ thì trôi nhân vật — cùng bài
 * học đã cắn ở hero-banner V1, xem `scripts/gen-hero-banners.mjs`).
 *
 * Chạy ở NƠI CÓ `OPENAI_API_KEY` và ra được Internet:
 *   node scripts/gen-tool-avatars.mjs --sample            # 6 bức mẫu để duyệt phong cách
 *   node scripts/gen-tool-avatars.mjs --all                # trọn bộ đang bật
 *   node scripts/gen-tool-avatars.mjs --tool laso,tarot     # chỉ vài tool
 *   node scripts/gen-tool-avatars.mjs --all --dry-run        # chỉ in prompt
 *
 * Cờ: --out <thư mục> (mặc định `.tool-avatars/`) · --size (mặc định 1024x1024,
 * khổ vuông đúng chỗ dùng thật — xem `tool-avatar-prompt.ts`) · --quality
 * low|medium|high (mặc định medium) · --model (mặc định gpt-image-2).
 *
 * Bức đã có trong thư mục đích thì BỎ QUA — chạy lại sau khi đứt mạng không
 * đốt lại tiền cho phần đã xong. Dùng `--force` để vẽ đè.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

// ── nạp module prompt (TS) — cùng cách gen-que-images.mjs đã dùng: gọi CLI
// `tsc` để biên dịch tại chỗ, KHÔNG dùng `ts.transpileModule` (gói
// typescript@7 không còn xuất API biên dịch trong JS). Compile luôn
// `webtoon-style.ts` — `tool-avatar-prompt.ts` giờ import từ đó. ──
const TSC = join(ROOT, 'node_modules/.bin/tsc');
const outDir = mkdtempSync(join(tmpdir(), 'tool-avatar-prompt-'));
execFileSync(
  TSC,
  [
    '--ignoreConfig',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--skipLibCheck',
    '--outDir',
    outDir,
    join(ROOT, 'lib/media/tool-avatar-prompt.ts'),
    join(ROOT, 'lib/media/hero-banner-prompt.ts'),
    join(ROOT, 'lib/media/webtoon-style.ts'),
  ],
  { stdio: 'inherit' }
);
const { TOOL_AVATARS, buildToolAvatarPrompt, ANCHOR_IMAGE_PATH } = require(
  join(outDir, 'tool-avatar-prompt.js')
);
if (
  !Array.isArray(TOOL_AVATARS) ||
  typeof buildToolAvatarPrompt !== 'function' ||
  typeof ANCHOR_IMAGE_PATH !== 'string'
) {
  console.error(
    '❌ không nạp được TOOL_AVATARS/buildToolAvatarPrompt/ANCHOR_IMAGE_PATH từ bản dịch — dừng trước khi đốt tiền vẽ.'
  );
  process.exit(1);
}

const anchorPath = join(ROOT, ANCHOR_IMAGE_PATH);
if (!existsSync(anchorPath)) {
  console.error(
    `❌ thiếu ảnh neo "${ANCHOR_IMAGE_PATH}" — không vẽ được, dừng trước khi đốt tiền.`
  );
  process.exit(1);
}
const anchorBytes = readFileSync(anchorPath);
const anchorFileName = ANCHOR_IMAGE_PATH.split('/').pop();
const anchorMime = anchorFileName.endsWith('.webp') ? 'image/webp' : 'image/png';

// ── cờ dòng lệnh ──
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);
const OUT = flag('--out', join(ROOT, '.tool-avatars'));
const SIZE = flag('--size', '1024x1024');
const QUALITY = flag('--quality', 'medium');
const MODEL = flag('--model', 'gpt-image-2');
const DRY = has('--dry-run');
const FORCE = has('--force');

// Đợt 2 (2026-09-17, sau khi Henry đổi hướng bỏ Minh Bảo): 1 tool đại diện
// MỖI NHÓM thầy/cô trong 11 nhóm (`master-groups.ts`) — vì giờ cái cần duyệt
// là 11 THIẾT KẾ NHÂN VẬT khác nhau (tuổi/giới tính/trang phục), không phải
// đa dạng loại deliverable trong CÙNG một nhân vật Minh Bảo như đợt 1.
const SAMPLE = [
  'laso', // nhóm laso — ông thầy khăn đóng, áo the nâu
  'tu-binh', // nhóm tu-binh — ông thầy áo the xanh rêu
  'than-so-hoc', // nhóm than-so-hoc — ông thầy áo the xám
  'kinh-dich', // nhóm kinh-dich — bà cô áo dài chàm
  'bat-trach', // nhóm phong-thuy — ông thầy áo the xám (la bàn)
  'dien-tuong', // nhóm xem-tuong — bà áo bà ba nâu
  'ban-do-sao', // nhóm chiem-tinh-tay — bà áo dài xanh ngọc
  'dat-ten-con', // nhóm dat-ten-lich — bà ngoại áo bà ba
  'tuong-hop', // nhóm menh-ly — bà áo dài chàm đậm
  'personal-color', // nhóm phong-cach-ai — bà áo dài nâu
  'tarot', // nhóm boi-bai — bà khăn rằn, khăn choàng đỏ-vàng
];

let pick;
if (has('--all')) pick = TOOL_AVATARS.map((t) => t.id);
else if (flag('--tool'))
  pick = flag('--tool')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
else pick = SAMPLE;

const byId = new Map(TOOL_AVATARS.map((t) => [t.id, t]));
const bad = pick.filter((id) => !byId.has(id));
if (bad.length) {
  console.error(`tool_id không có trong TOOL_AVATARS: ${bad.join(', ')}`);
  process.exit(1);
}

const KEY = process.env.OPENAI_API_KEY || '';
if (!KEY && !DRY) {
  console.error(
    'Thiếu OPENAI_API_KEY. Đặt biến môi trường rồi chạy lại, hoặc dùng --dry-run để chỉ xem prompt.'
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

console.log(
  `${pick.length} tool · ${SIZE} · quality=${QUALITY}${DRY ? ' · DRY-RUN (không gọi API)' : ''}`
);
console.log(`Thư mục ra: ${OUT}\n`);

let daVe = 0,
  boQua = 0,
  loi = 0;

for (const id of pick) {
  const t = byId.get(id);
  const prompt = buildToolAvatarPrompt(t);
  const ten = `${id}.png`;
  const dich = join(OUT, ten);

  if (DRY) {
    console.log(`── ${t.id} — ${t.label}\n${prompt}\n`);
    continue;
  }
  if (existsSync(dich) && !FORCE) {
    boQua++;
    console.log(`⏭  ${ten} — đã có, bỏ qua`);
    continue;
  }

  try {
    // images/edits — neo ẢNH Minh Bảo, KHÔNG phải images/generations thuần
    // (xem ghi chú đầu file). Multipart: KHÔNG tự đặt Content-Type, boundary
    // do FormData sinh, gõ tay là hỏng.
    const fd = new FormData();
    fd.append('model', MODEL);
    fd.append('prompt', prompt);
    fd.append('size', SIZE);
    fd.append('quality', QUALITY);
    fd.append('n', '1');
    fd.append('image', new Blob([anchorBytes], { type: anchorMime }), anchorFileName);
    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: fd,
    });
    if (!r.ok) throw new Error(`${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new Error('API không trả ảnh');
    writeFileSync(dich, Buffer.from(b64, 'base64'));
    daVe++;
    console.log(`✅ ${ten}`);
  } catch (e) {
    loi++;
    console.error(`❌ ${id}: ${e.message}`);
  }
}

if (!DRY) {
  console.log(`\nVẽ mới ${daVe} · bỏ qua ${boQua} · lỗi ${loi}`);
  // ƯỚC TÍNH thô ở 1024×1024 quality=medium — số thật lấy từ events.meta.cost_vnd
  // (lib/agent/usage.ts), KHÔNG dùng con số này để tính tiền thật.
  const GIA_VND = { low: 400, medium: 1100, high: 3500 };
  console.log(
    `Chi phí ước tính lượt này: ~${(daVe * (GIA_VND[QUALITY] || 1100)).toLocaleString('vi-VN')}đ`
  );
  if (loi) process.exitCode = 1;
}
