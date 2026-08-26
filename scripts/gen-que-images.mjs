#!/usr/bin/env node
/**
 * Sinh bộ tranh 64 quẻ ("Quẻ Phục Hy bằng hình") bằng gpt-image-1.
 *
 * Ảnh là ASSET TĨNH, sinh MỘT LẦN rồi thôi — khác hẳn các job chạy hằng ngày mà
 * `CLAUDE.md` dặn tránh model sinh ảnh. Lý do của luật đó ("tiền đội theo số
 * bài") không áp ở đây: 64 bức là 64 lượt, xong là hết, mỗi lượt phục vụ về sau
 * tốn 0đ.
 *
 * Chạy ở NƠI CÓ `OPENAI_API_KEY` và ra được Internet:
 *   node scripts/gen-que-images.mjs --sample          # 5 bức mẫu để duyệt phong cách
 *   node scripts/gen-que-images.mjs --all             # trọn 64 bức
 *   node scripts/gen-que-images.mjs --que 22,23       # chỉ vài quẻ (số King Wen)
 *   node scripts/gen-que-images.mjs --all --dry-run   # chỉ in prompt, KHÔNG gọi API
 *
 * Cờ: --out <thư mục> (mặc định `.que-images/`) · --size (mặc định 1024x1536,
 * dáng trục treo dọc) · --quality low|medium|high (mặc định medium).
 *
 * Bức đã có trong thư mục đích thì BỎ QUA — chạy lại sau khi đứt mạng không đốt
 * lại tiền cho phần đã xong.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

// ── nạp module prompt (TS) bằng cách biên dịch tại chỗ ──
// ⚠️ PHẢI gọi `tsc` CLI chứ KHÔNG dùng `ts.transpileModule` như trước: gói
// `typescript@7` là bản port native, chỉ còn xuất `version`/`versionMajorMinor`
// — API biên dịch trong JS đã biến mất hẳn. CLI thì vẫn emit bình thường.
// Script này vốn chạy hàng phút mỗi bức nên thêm một lượt gọi tiến trình con
// không đáng kể.
const TSC = join(ROOT, 'node_modules/.bin/tsc');
const outDir = mkdtempSync(join(tmpdir(), 'que-prompt-'));
execFileSync(
  TSC,
  [
    // BẮT BUỘC: nêu tên file trên dòng lệnh trong khi cwd có `tsconfig.json` thì
    // tsc báo TS5112 rồi bỏ cuộc. Cờ này chạy trên cả TS 6 lẫn TS 7 (đã đo).
    '--ignoreConfig',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--skipLibCheck',
    '--outDir',
    outDir,
    join(ROOT, 'lib/media/que-image-prompt.ts'),
  ],
  { stdio: 'inherit' }
);
const { buildQueImagePrompt } = require(join(outDir, 'que-image-prompt.js'));
if (typeof buildQueImagePrompt !== 'function') {
  console.error('❌ không nạp được buildQueImagePrompt từ bản dịch — dừng trước khi đốt tiền vẽ.');
  process.exit(1);
}

const { QUE } = require(join(ROOT, 'public/tools-shared/kinh-dich.js'));

// ── cờ dòng lệnh ──
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);
const OUT = flag('--out', join(ROOT, '.que-images'));
const SIZE = flag('--size', '1024x1536');
const QUALITY = flag('--quality', 'medium');
const DRY = has('--dry-run');

const SAMPLE = [1, 2, 22, 23, 63]; // Càn · Khôn · Bí · Bác · Ký Tế — trải đủ sắc thái
let pick;
if (has('--all')) pick = QUE.map((_, i) => i + 1);
else if (flag('--que'))
  pick = flag('--que')
    .split(',')
    .map((s) => +s.trim());
else pick = SAMPLE;

const bad = pick.filter((k) => !(k >= 1 && k <= 64));
if (bad.length) {
  console.error(`Số quẻ không hợp lệ (phải 1–64): ${bad.join(', ')}`);
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

const prompts = pick.map((kw) => {
  const q = QUE[kw - 1];
  return buildQueImagePrompt({ kingWen: kw, li: q.li, ten: q.n, zh: q.zh, sacThai: q.f });
});

console.log(
  `${prompts.length} bức · ${SIZE} · quality=${QUALITY}${DRY ? ' · DRY-RUN (không gọi API)' : ''}`
);
console.log(`Thư mục ra: ${OUT}\n`);

let daVe = 0,
  boQua = 0,
  loi = 0;

for (const p of prompts) {
  const ten = `que-${String(p.phucHy).padStart(2, '0')}-kw${String(p.kingWen).padStart(2, '0')}-${p.hanTu}.png`;
  const dich = join(OUT, ten);

  if (DRY) {
    console.log(`── #${p.kingWen} ${p.ten} (Phục Hy ${p.phucHy}) · ${p.hanTu}\n${p.prompt}\n`);
    continue;
  }
  if (existsSync(dich)) {
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
        prompt: p.prompt,
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
    console.error(`❌ #${p.kingWen} ${p.ten}: ${e.message}`);
  }
}

if (!DRY) {
  console.log(`\nVẽ mới ${daVe} · bỏ qua ${boQua} · lỗi ${loi}`);
  // Đo prod ghi trong CLAUDE.md: gpt-image-1 ≈ 1.658đ/lượt.
  console.log(`Chi phí ước tính lượt này: ~${(daVe * 1658).toLocaleString('vi-VN')}đ`);
  if (loi) process.exitCode = 1;
}
