#!/usr/bin/env node
// scripts/gen-fbcard-topic-preview.mjs
// ============================================================
// Sinh THỬ 1 cặp ảnh mẫu (2 style) cho bộ minh hoạ `.fb-card` phần luận giải
// (xem docs/nhat-ky/2026-09.md mục gom nhóm chủ đề — 10 nhóm x 3 sắc thái).
// Mục đích: cho Henry duyệt STYLE trước khi gen hàng loạt, KHÔNG phải bản cuối.
//
// Style A — "ink-wash" — cùng phong cách với PR #774 (36 ảnh "Vận riêng của
// bạn"). Prompt sinh gốc của #774 KHÔNG được commit (script chạy một lần rồi
// bỏ) nên bản này build lại bằng image-to-image: gọi /v1/images/edits, dùng
// CHÍNH một ảnh thật đã có trong `public/img/van-rieng/` làm reference — đúng
// cách #774 đã làm ("dùng đúng 1 ảnh mẫu làm reference thật, không đoán qua
// mô tả chữ").
//
// Style B — "flat" — vector phẳng, không dùng reference (đối nghịch hẳn với
// ink-wash nên img2img từ ảnh ink-wash sẽ kéo lệch), gọi thẳng
// /v1/images/generations với prompt mô tả phong cách flat illustration.
//
// ⚠️ CHẠY Ở NƠI CÓ `OPENAI_API_KEY` VÀ RA ĐƯỢC INTERNET THẬT — container
// Claude Code chặn `api.openai.com` ở tầng egress proxy (403 ngay lúc CONNECT,
// đã tự kiểm bằng `curl -v https://api.openai.com` trước khi viết script này),
// nên bản thân phiên này không tự gọi được, y hệt lý do `compare-image-model.mjs`
// và `scripts/load-brand-voice.mjs` đã ghi.
//
// DÙNG:
//   OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-preview.mjs
//   OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-preview.mjs --style ink-wash
//   OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-preview.mjs --style flat
//   node scripts/gen-fbcard-topic-preview.mjs --chi-prompt   # chỉ in prompt, không cần key/mạng
//
// Cờ: --topic <tên>       mặc định 'hon-nhan' (nhóm #2 trong bảng gom chủ đề)
//     --sentiment tot|canh-bao|trung-tinh   mặc định 'tot'
//     --ref <đường dẫn>   ảnh reference cho style ink-wash, mặc định
//                         public/img/van-rieng/thien-di-xau.webp (ảnh Henry đã
//                         đưa làm ví dụ style ở lượt chat này)
//     --model <tên>       mặc định gpt-image-2
//     --size <WxH>        mặc định 1024x1024 (ảnh cuối resize/crop sau, giống #774)
//     --out <thư mục>     mặc định ./fbcard-preview
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const argv = process.argv.slice(2);
const flag = (ten, mac) => {
  const i = argv.indexOf('--' + ten);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : mac;
};
const co = (ten) => argv.includes('--' + ten);

const TOPIC = flag('topic', 'hon-nhan');
const SENTIMENT = flag('sentiment', 'tot');
const REF = flag('ref', join(ROOT, 'public/img/van-rieng/thien-di-xau.webp'));
const MODEL = flag('model', 'gpt-image-2');
const SIZE = flag('size', '1024x1024');
const OUT = flag('out', join(process.cwd(), 'fbcard-preview'));
const CHI_PROMPT = co('chi-prompt');
const STYLE = flag('style', null); // null = cả hai

// ── Nội dung theo chủ đề + sắc thái (chỉ cần đúng 1 nhóm để test style) ────
const TOPICS = {
  'hon-nhan': {
    tot: 'A young East Asian couple in simple modern clothes, standing close together by a calm lake at sunrise, smiling warmly at each other, one gently holding the other\'s hand',
    'canh-bao': 'A young East Asian couple in simple modern clothes, standing a little apart with their backs half-turned to each other near a quiet lake, both looking down in quiet tension, storm clouds gathering over distant mountains',
    'trung-tinh': 'A young East Asian couple in simple modern clothes, walking side by side along a quiet lakeside path, calm and thoughtful expressions, neither smiling nor troubled',
  },
};

const SENT_KEY = { tot: 'tot', 'canh-bao': 'canh-bao', 'trung-tinh': 'trung-tinh' }[SENTIMENT] || 'tot';
const scene = (TOPICS[TOPIC] || TOPICS['hon-nhan'])[SENT_KEY];

// ── Style A: ink-wash (image-to-image, giữ style của #774) ────────────────
const INK_WASH_PROMPT = [
  `Repaint this exact artistic style — the same soft East Asian ink-wash watercolor technique, muted earthy palette, gentle atmospheric perspective, layered mountain silhouettes fading into mist, circular soft-edged composition, birds as tiny dark brush marks — but with a NEW subject:`,
  scene + '.',
  `Keep the same warm, quiet, painterly mood and the same circular vignette framing as the reference image. No text, no caption, no logo anywhere in the image.`,
].join('\n\n');

// ── Style B: flat illustration (text-to-image, không dùng reference) ──────
const FLAT_PROMPT = [
  `Modern flat vector illustration, the style used by contemporary product/marketing illustrations (clean geometric shapes, minimal shading, 3-4 flat solid colors plus one warm accent color, no gradients, no texture, generous negative space, rounded friendly character proportions).`,
  `Subject: ${scene}.`,
  `Square composition, centered subject, soft rounded background shape behind the figures. No text, no caption, no logo anywhere in the image.`,
].join('\n\n');

console.log('═'.repeat(72));
console.log('CHỦ ĐỀ  :', TOPIC, '· sắc thái:', SENT_KEY);
console.log('REF ẢNH :', REF, '(style A dùng làm image-to-image reference)');
console.log('═'.repeat(72));
console.log('\n[STYLE A — ink-wash, /v1/images/edits]\n');
console.log(INK_WASH_PROMPT);
console.log('\n' + '─'.repeat(72));
console.log('\n[STYLE B — flat illustration, /v1/images/generations]\n');
console.log(FLAT_PROMPT);
console.log('\n' + '═'.repeat(72));

if (CHI_PROMPT) {
  console.log('\n(--chi-prompt: dừng ở đây, không gọi API)');
  process.exit(0);
}

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error(
    '\n✗ Thiếu OPENAI_API_KEY. Chạy lại ở máy có mạng ra ngoài thật:\n' +
      '  OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-preview.mjs'
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

async function genInkWash() {
  process.stdout.write(`\n• Style A (ink-wash, img2img) … `);
  const t0 = Date.now();
  const refBytes = readFileSync(REF);
  const form = new FormData();
  form.append('model', MODEL);
  form.append('prompt', INK_WASH_PROMPT);
  form.append('size', SIZE);
  form.append('n', '1');
  form.append('image', new Blob([refBytes], { type: 'image/webp' }), 'reference.webp');

  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const giay = ((Date.now() - t0) / 1000).toFixed(1);
  if (!r.ok) {
    console.log(`✗ ${r.status}`);
    console.log((await r.text().catch(() => '')).slice(0, 400));
    return;
  }
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) return console.log('✗ không nhận được ảnh');
  const file = join(OUT, `${TOPIC}-${SENT_KEY}-ink-wash.png`);
  writeFileSync(file, Buffer.from(b64, 'base64'));
  console.log(`✓ ${giay}s → ${file}`);
}

async function genFlat() {
  process.stdout.write(`\n• Style B (flat, text2image) … `);
  const t0 = Date.now();
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: FLAT_PROMPT, size: SIZE, quality: 'medium', output_format: 'png', n: 1 }),
  });
  const giay = ((Date.now() - t0) / 1000).toFixed(1);
  if (!r.ok) {
    console.log(`✗ ${r.status}`);
    console.log((await r.text().catch(() => '')).slice(0, 400));
    return;
  }
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) return console.log('✗ không nhận được ảnh');
  const file = join(OUT, `${TOPIC}-${SENT_KEY}-flat.png`);
  writeFileSync(file, Buffer.from(b64, 'base64'));
  console.log(`✓ ${giay}s → ${file}`);
}

if (!STYLE || STYLE === 'ink-wash') await genInkWash();
if (!STYLE || STYLE === 'flat') await genFlat();

console.log('\nXong. Xem 2 file trong', OUT, '— gửi lại cho Henry duyệt style trước khi gen hàng loạt.');
