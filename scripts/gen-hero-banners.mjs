#!/usr/bin/env node
/**
 * Sinh ẢNH BANNER CHÍNH (khối hook `.intro-card` đầu trang tool) — tranh thủy
 * mặc khổ ngang, CÓ MÀU — bằng gpt-image-2. Xem `lib/media/hero-banner-prompt.ts`
 * cho phong cách + cảnh từng NHÓM (banner dùng CHUNG theo nhóm, không phải
 * 1 bức/tool — 11 nhóm phủ 52 tool, mỗi nhóm một nhân vật/đạo cụ đúng bản
 * chất cổ pháp của nhóm đó).
 *
 * Khác `gen-tool-avatars.mjs`: mỗi nhóm sinh NHIỀU biến thể để duyệt (chưa
 * chốt bức nào), không phải 1 bức/nhóm.
 *
 * Chạy ở NƠI CÓ `OPENAI_API_KEY` và ra được Internet:
 *   node scripts/gen-hero-banners.mjs --group tu-binh --n 15 --dry-run   # chỉ in prompt
 *   node scripts/gen-hero-banners.mjs --group tu-binh --n 15             # vẽ thật
 *   node scripts/gen-hero-banners.mjs --tool tu-binh --n 15              # tương đương (tool tự suy ra nhóm)
 *   node scripts/gen-hero-banners.mjs --all --n 3                        # mẫu 3 bức/nhóm cho TOÀN BỘ 11 nhóm
 *
 * Cờ: --out <thư mục> (mặc định `.hero-banners/<nhóm>/`) · --size (mặc định
 * 1536x1024 — khổ ngang RỘNG NHẤT gpt-image-2 hỗ trợ, không phải panorama thật;
 * crop bằng CSS object-fit ở khối hiển thị) · --quality low|medium|high
 * (mặc định medium) · --model (mặc định gpt-image-2, xem lib/image/openai-image.ts).
 */
import { writeFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

const TSC = join(ROOT, 'node_modules/.bin/tsc');
const outDir = mkdtempSync(join(tmpdir(), 'hero-banner-prompt-'));
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
    join(ROOT, 'lib/media/hero-banner-prompt.ts'),
    join(ROOT, 'lib/media/tool-avatar-prompt.ts'),
  ],
  { stdio: 'inherit' }
);
const { HERO_BANNER_GROUPS, resolveHeroGroup, buildHeroBannerPrompt } = require(
  join(outDir, 'hero-banner-prompt.js')
);
if (
  !Array.isArray(HERO_BANNER_GROUPS) ||
  typeof resolveHeroGroup !== 'function' ||
  typeof buildHeroBannerPrompt !== 'function'
) {
  console.error(
    '❌ không nạp được HERO_BANNER_GROUPS/resolveHeroGroup/buildHeroBannerPrompt từ bản dịch — dừng trước khi đốt tiền vẽ.'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);

const SIZE = flag('--size', '1536x1024');
const QUALITY = flag('--quality', 'medium');
const MODEL = flag('--model', 'gpt-image-2');
const N = parseInt(flag('--n', '15'), 10);
const DRY = has('--dry-run');

let groups;
if (has('--all')) {
  groups = HERO_BANNER_GROUPS;
} else {
  const raw = flag('--group') || flag('--tool') || 'laso';
  try {
    groups = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((idOrKey) => resolveHeroGroup(idOrKey));
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
  // Bỏ trùng — nhiều tool cùng --tool có thể suy ra cùng một nhóm.
  const seen = new Set();
  groups = groups.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
}

const KEY = process.env.OPENAI_API_KEY || '';
if (!KEY && !DRY) {
  console.error(
    'Thiếu OPENAI_API_KEY. Đặt biến môi trường rồi chạy lại, hoặc dùng --dry-run để chỉ xem prompt.'
  );
  process.exit(1);
}

console.log(
  `${groups.length} nhóm × ${N} biến thể · ${SIZE} · quality=${QUALITY} · model=${MODEL}${DRY ? ' · DRY-RUN (không gọi API)' : ''}\n`
);

let daVe = 0,
  loi = 0;

for (const g of groups) {
  const prompt = buildHeroBannerPrompt(g);
  const outBase = flag('--out', join(ROOT, '.hero-banners', g.id));
  mkdirSync(outBase, { recursive: true });

  if (DRY) {
    console.log(`── ${g.id} — ${g.label}\n${prompt}\n`);
    continue;
  }

  const already = existsSync(outBase)
    ? readdirSync(outBase).filter((f) => f.endsWith('.png')).length
    : 0;
  console.log(`── ${g.id}: đã có ${already} bức, vẽ thêm tới ${N}`);

  for (let i = already + 1; i <= N; i++) {
    const ten = `${g.id}-${String(i).padStart(2, '0')}.png`;
    const dich = join(outBase, ten);
    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          size: SIZE,
          quality: QUALITY,
          output_format: 'png',
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
      console.error(`❌ ${ten}: ${e.message}`);
    }
  }
}

if (!DRY) {
  console.log(`\nVẽ mới ${daVe} · lỗi ${loi}`);
  // Giá tra từ lib/agent/usage.ts (IMAGE_MODEL_PRICING) / app/api/admin/illus-images
  // — chỉ là ƯỚC TÍNH, số thật lấy từ events.meta.cost_vnd.
  const GIA_VND = { low: 400, medium: 1100, high: 3500 };
  const donGia =
    MODEL === 'gpt-image-1' ? { low: 500, medium: 1625, high: 6313 }[QUALITY] : GIA_VND[QUALITY];
  console.log(`Chi phí ước tính lượt này: ~${(daVe * (donGia || 1100)).toLocaleString('vi-VN')}đ`);
  if (loi) process.exitCode = 1;
}
