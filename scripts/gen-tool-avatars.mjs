#!/usr/bin/env node
/**
 * Sinh ảnh đại diện cho từng tool (line art vàng kim / nền navy, phong cách
 * Luo Pan) bằng gpt-image-1 — xem `lib/media/tool-avatar-prompt.ts` cho bảng
 * chủ đề từng tool và khối phong cách chung.
 *
 * Ảnh là ASSET TĨNH, sinh MỘT LẦN rồi thôi (giống `gen-que-images.mjs`).
 *
 * Chạy ở NƠI CÓ `OPENAI_API_KEY` và ra được Internet:
 *   node scripts/gen-tool-avatars.mjs --sample            # 5 bức mẫu để duyệt phong cách
 *   node scripts/gen-tool-avatars.mjs --all                # trọn bộ đang bật
 *   node scripts/gen-tool-avatars.mjs --tool laso,tarot     # chỉ vài tool
 *   node scripts/gen-tool-avatars.mjs --all --dry-run        # chỉ in prompt
 *
 * Cờ: --out <thư mục> (mặc định `.tool-avatars/`) · --size (mặc định 1024x1024)
 * · --quality low|medium|high (mặc định medium).
 *
 * Bức đã có trong thư mục đích thì BỎ QUA — chạy lại sau khi đứt mạng không
 * đốt lại tiền cho phần đã xong. Dùng `--force` để vẽ đè.
 */
import { writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

// ── nạp module prompt (TS) — cùng cách gen-que-images.mjs đã dùng: gọi CLI
// `tsc` để biên dịch tại chỗ, KHÔNG dùng `ts.transpileModule` (gói
// typescript@7 không còn xuất API biên dịch trong JS). ──
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
  ],
  { stdio: 'inherit' }
);
const { TOOL_AVATARS, buildToolAvatarPrompt } = require(join(outDir, 'tool-avatar-prompt.js'));
if (!Array.isArray(TOOL_AVATARS) || typeof buildToolAvatarPrompt !== 'function') {
  console.error(
    '❌ không nạp được TOOL_AVATARS/buildToolAvatarPrompt từ bản dịch — dừng trước khi đốt tiền vẽ.'
  );
  process.exit(1);
}

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
const DRY = has('--dry-run');
const FORCE = has('--force');

// Trải đủ sắc thái để duyệt phong cách: Tarot (bài) · Kinh Dịch (hào) ·
// Bát Trạch (la bàn) · Chân Dung Vợ Chồng (hai người) · Phong Thủy Bàn Làm Việc
// (đồ vật) · Bản Đồ Sao (chiêm tinh Tây, khác hẳn cổ pháp Trung Hoa).
const SAMPLE = [
  'tarot',
  'kinh-dich',
  'bat-trach',
  'chan-dung-vo-chong',
  'ban-lam-viec',
  'ban-do-sao',
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
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: SIZE,
        quality: QUALITY,
        n: 1,
      }),
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
  const GIA_VND = { low: 500, medium: 1300, high: 5000 }; // ước tính ở 1024×1024, xem que-images route cho bảng đối chiếu
  console.log(
    `Chi phí ước tính lượt này: ~${(daVe * (GIA_VND[QUALITY] || 1300)).toLocaleString('vi-VN')}đ`
  );
  if (loi) process.exitCode = 1;
}
