#!/usr/bin/env node
// scripts/compare-image-model.mjs
// ============================================================
// So HAI mức chất lượng (hoặc hai model) sinh ảnh trên CÙNG MỘT chuỗi prompt,
// dựng từ CHÍNH engine của prod — không phải prompt viết lại cho giống.
//
// Vì sao cần script riêng: container Claude Code bị egress policy chặn
// `api.openai.com` (403 ở bước CONNECT), nên lượt gọi thật phải chạy ở máy có
// mạng ra ngoài. Phần dựng prompt thì deterministic, chạy được mọi nơi — nên
// script in luôn prompt ra để đối chiếu kể cả khi không gọi API.
//
// DÙNG:
//   OPENAI_API_KEY=sk-... node scripts/compare-image-model.mjs \
//     --ngay 3 --thang 6 --nam 1998 --gio 1 --gioi nam
//
//   --duong            ngày dương lịch (mặc định: dương)
//   --am               ngày âm lịch
//   --gio <0..23>      giờ sinh, mặc định 1 (giờ Sửu)
//   --gioi nam|nu      mặc định nam
//   --quality a,b      mặc định "medium,high"
//   --model <tên>      mặc định gpt-image-2
//   --size <WxH>       mặc định 1024x1536
//   --out <thư mục>    mặc định ./so-sanh-anh
//   --chi-prompt       chỉ in prompt, KHÔNG gọi API (không cần key)
//
// Mỗi lượt lưu 1 file PNG + in token usage và chi phí quy ra đồng.
// ============================================================

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// ── Đọc cờ ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (ten, mac) => {
  const i = argv.indexOf('--' + ten);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : mac;
};
const co = (ten) => argv.includes('--' + ten);

// `hourBranch` là ĐỊA CHI 0..11 (Tý..Hợi), KHÔNG phải giờ đồng hồ — đây là chỗ
// dễ nhập nhầm nhất, nên script nhận cả hai: --chi 0..11, hoặc --gio 0..23 rồi
// tự quy đổi (giờ Tý ôm 23h–01h nên phải cộng 1 trước khi chia đôi).
const CHI_TEN = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
];
const chiFlag = flag('chi', null);
const gioFlag = flag('gio', null);
const hourBranch =
  chiFlag !== null
    ? Number(chiFlag)
    : gioFlag !== null
      ? Math.floor(((Number(gioFlag) + 1) % 24) / 2)
      : 1;

const birth = {
  day: Number(flag('ngay', 3)),
  month: Number(flag('thang', 6)),
  year: Number(flag('nam', 1998)),
  hourBranch,
  gender: flag('gioi', 'nam') === 'nu' ? 'nu' : 'nam',
  isLunar: co('am'),
};
const QUALITIES = flag('quality', 'medium,high')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MODEL = flag('model', 'gpt-image-2');
const SIZE = flag('size', '1024x1536');
const OUT = flag('out', join(process.cwd(), 'so-sanh-anh'));
const CHI_PROMPT = co('chi-prompt');

// ── Nạp engine THẬT (biên dịch TS ra thư mục tạm) ───────────────────────
const BUILD = join(tmpdir(), 'tuvi-cmp-' + process.pid);
rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });

console.log('• Biên dịch engine…');
// tsconfig riêng: repo dùng alias `@/` nên không compile trần được, mà mượn
// nguyên tsconfig gốc thì kéo theo cả cây Next.
const TSCONFIG = join(BUILD, 'tsconfig.json');
writeFileSync(
  TSCONFIG,
  JSON.stringify({
    compilerOptions: {
      module: 'commonjs',
      target: 'es2022',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      types: ['node'],
      baseUrl: ROOT,
      paths: { '@/*': ['./*'] },
      rootDir: ROOT,
      outDir: BUILD,
      noEmitOnError: false,
      ignoreDeprecations: '6.0',
    },
    files: [
      join(ROOT, 'lib/engine/laso.ts'),
      join(ROOT, 'lib/engine/past-life.ts'),
      join(ROOT, 'lib/agent/past-life-story.ts'),
    ],
  })
);
try {
  execSync(`npx tsc -p ${TSCONFIG}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) {
  // tsc vẫn phát JS kể cả khi có lỗi type ở file khác trong cây phụ thuộc —
  // chỉ dừng nếu file cần dùng thật sự không ra.
  const msg = String(e.stderr || '').slice(0, 600);
  if (msg.trim()) console.warn('  (tsc cảnh báo)\n' + msg);
}

const require = createRequire(import.meta.url);

// tsc KHÔNG viết lại alias `@/` trong JS phát ra, nên phải nối lại lúc chạy.
// Hook resolve thay vì sửa file: bản chạy giữ nguyên byte với bản prod, đúng
// điều kiện để kết quả so sánh này nói được điều gì về prod.
const Module = require('node:module');
const _resolve = Module._resolveFilename;
Module._resolveFilename = function (yeuCau, cha, ...rest) {
  if (yeuCau.startsWith('@/'))
    return _resolve.call(this, join(BUILD, yeuCau.slice(2)), cha, ...rest);
  try {
    return _resolve.call(this, yeuCau, cha, ...rest);
  } catch (e) {
    // Thư mục build chỉ chứa .js do tsc phát ra — thiếu file dữ liệu .json đi
    // kèm (bảng portrait-stars) và thiếu `tuvi-engine/dist` nằm ngoài cây lib.
    // Trượt thì tra lại ở ĐÚNG vị trí tương ứng trong repo: vẫn một nguồn dữ
    // liệu duy nhất, không nhân bản.
    if (yeuCau.startsWith('.') && cha?.filename?.startsWith(BUILD)) {
      const goc = join(ROOT, cha.filename.slice(BUILD.length + 1), '..', yeuCau);
      return _resolve.call(this, goc, cha, ...rest);
    }
    throw e;
  }
};

const { computeLaso } = require(join(BUILD, 'lib/engine/laso.js'));
const { computePastLife } = require(join(BUILD, 'lib/engine/past-life.js'));
const { buildFinalPastLifeImagePrompt } = require(join(BUILD, 'lib/agent/past-life-story.js'));

// ── Dựng prompt y như route pha `image` ─────────────────────────────────
const lasoRes = computeLaso(birth);
if (!lasoRes.ok || !lasoRes.ls) {
  console.error('✗ Không lập được lá số:', lasoRes.error);
  process.exit(1);
}
const profile = computePastLife(lasoRes.ls, birth.gender);

// `faceDescriptionEn` trong prod do một lượt LLM viết và là BEST-EFFORT (route
// vẫn vẽ khi nó rỗng). Để trống ở đây là CÓ CHỦ Ý: hai lượt so nhau phải nhận
// ĐÚNG một chuỗi, mà gọi LLM hai lần thì ra hai đoạn tả mặt khác nhau — lúc đó
// không còn biết ảnh khác nhau vì chất lượng hay vì lời tả.
const prompt = buildFinalPastLifeImagePrompt(profile, '');

console.log('\n' + '═'.repeat(72));
console.log(
  'LÁ SỐ   :',
  `${birth.gender === 'nu' ? 'Nữ' : 'Nam'} · ${birth.day}/${birth.month}/${birth.year} ` +
    `(${birth.isLunar ? 'âm' : 'dương'} lịch) · giờ ${CHI_TEN[birth.hourBranch] || '?'}`
);
console.log(
  'NHÂN VẬT:',
  profile.occupation.title,
  '·',
  profile.era.label,
  '·',
  `${profile.arc.portraitAge} tuổi`
);
console.log('═'.repeat(72));
console.log('\nPROMPT (' + prompt.length + ' ký tự):\n');
console.log(prompt);
console.log('\n' + '═'.repeat(72));

if (CHI_PROMPT) {
  console.log('\n(--chi-prompt: dừng ở đây, không gọi API)');
  rmSync(BUILD, { recursive: true, force: true });
  process.exit(0);
}

// ── Gọi API ─────────────────────────────────────────────────────────────
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error(
    '\n✗ Thiếu OPENAI_API_KEY. Chạy lại:  OPENAI_API_KEY=sk-... node scripts/compare-image-model.mjs'
  );
  process.exit(1);
}

// Giá USD/1M token — khớp IMAGE_MODEL_PRICING trong lib/agent/usage.ts.
// Sửa ở đó thì sửa cả đây (hai bản là hai bản, sớm muộn cũng trôi khỏi nhau).
const GIA = {
  'gpt-image-2': { text: 5, imgIn: 8, imgOut: 30 },
  'gpt-image-1': { text: 5, imgIn: 10, imgOut: 40 },
};
const USD_VND = 25000;

mkdirSync(OUT, { recursive: true });
const ketQua = [];

for (const quality of QUALITIES) {
  process.stdout.write(`\n• ${MODEL} · ${quality} · ${SIZE} … `);
  const t0 = Date.now();
  // Endpoint đổi được để test đường ghi file/báo cáo bằng stub cục bộ — lỗi ở
  // khâu SAU khi ảnh đã sinh là lỗi đắt nhất (tiền đã mất, ảnh thì không lưu).
  const r = await fetch(
    process.env.OPENAI_IMAGES_URL || 'https://api.openai.com/v1/images/generations',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      // Y HỆT body mà lib/image/openai-image.ts gửi.
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: SIZE,
        quality,
        output_format: 'png',
        n: 1,
      }),
    }
  );
  const giay = ((Date.now() - t0) / 1000).toFixed(1);

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.log(`✗ ${r.status}\n  ${t.slice(0, 400)}`);
    continue;
  }
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) {
    console.log('✗ không nhận được ảnh');
    continue;
  }

  const file = join(OUT, `${MODEL}-${quality}.png`);
  writeFileSync(file, Buffer.from(b64, 'base64'));

  const u = j?.usage || {};
  const textTok = u?.input_tokens_details?.text_tokens || 0;
  const outTok = u?.output_tokens || 0;
  const p = GIA[MODEL] || GIA['gpt-image-2'];
  const vnd = Math.round(((textTok * p.text + outTok * p.imgOut) / 1e6) * USD_VND);

  console.log(`✓ ${giay}s`);
  console.log(`  file      : ${file}`);
  console.log(`  token     : text ${textTok} · ảnh ra ${outTok}`);
  console.log(`  chi phí   : ${vnd.toLocaleString('vi-VN')}đ`);
  ketQua.push({ quality, giay, outTok, vnd, file });
}

if (ketQua.length > 1) {
  console.log('\n' + '═'.repeat(72));
  console.log('SO SÁNH');
  for (const k of ketQua) {
    console.log(
      `  ${k.quality.padEnd(7)} ${String(k.vnd).padStart(6)}đ  ${String(k.giay).padStart(6)}s  ${k.outTok} token`
    );
  }
  const [a, b] = ketQua;
  console.log(
    `\n  ${b.quality} đắt gấp ${(b.vnd / Math.max(a.vnd, 1)).toFixed(1)} lần ${a.quality}`
  );
  console.log('═'.repeat(72));
}

rmSync(BUILD, { recursive: true, force: true });
