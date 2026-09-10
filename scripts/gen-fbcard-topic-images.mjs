#!/usr/bin/env node
// scripts/gen-fbcard-topic-images.mjs
// ============================================================
// Sinh 30 ảnh minh hoạ CUỐI (10 nhóm chủ đề x 3 sắc thái Tốt/Cảnh Báo/Trung
// Tính) cho bộ `.fb-card` phần luận giải. Style đã CHỐT là "ink-wash"
// (image-to-image, cùng phong cách PR #774) sau khi Henry duyệt 2 style mẫu
// từ scripts/gen-fbcard-topic-preview.mjs (PR #806) — script này KHÔNG còn
// sinh style B (flat), chỉ có ink-wash.
//
// Gen 1 LẦN, lưu tĩnh vào public/img/fbcard-topics/ — KHÔNG gọi lại lúc
// runtime (0đ/lượt xem), giống hệt cách public/img/van-rieng/*.webp (#774)
// đã làm.
//
// ⚠️ CHẠY Ở NƠI CÓ `OPENAI_API_KEY` VÀ RA ĐƯỢC INTERNET THẬT tới
// api.openai.com, và cần gói `sharp` (đã khai trong package.json, `npm i`
// trước khi chạy nếu node_modules trống) để resize 1024x1024 → 160x160 webp,
// cùng cỡ nguồn với public/img/van-rieng/*.webp.
//
// DÙNG:
//   OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-images.mjs
//   OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-images.mjs --topic hon-nhan   # chỉ 1 nhóm (3 ảnh)
//   node scripts/gen-fbcard-topic-images.mjs --chi-prompt   # in cả 30 prompt, không gọi API/cần key
//
// Cờ: --topic <slug>   giới hạn 1 nhóm (xem danh sách TOPICS bên dưới)
//     --model <tên>    mặc định gpt-image-2
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const REF = join(ROOT, 'public/img/van-rieng/thien-di-xau.webp');
const OUT_DIR = join(ROOT, 'public/img/fbcard-topics');
const SIZE = '1024x1024';

const argv = process.argv.slice(2);
const flag = (ten, mac) => {
  const i = argv.indexOf('--' + ten);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : mac;
};
const co = (ten) => argv.includes('--' + ten);

const MODEL = flag('model', 'gpt-image-2');
const ONLY_TOPIC = flag('topic', null);
const CHI_PROMPT = co('chi-prompt');

// 10 nhóm chủ đề gom từ 23 tool dùng chung hệ `.fb-card` (Henry đã duyệt bảng
// gom nhóm trước PR #806) x 3 sắc thái. Slug sắc thái khớp hậu tố class CSS
// fb-tot/fb-canhbao/fb-trungtinh (public/shell.css).
const TOPICS = {
  'ban-than': {
    ten: 'Bản thân / Tính cách',
    tot: 'A single young East Asian person standing calm and confident on a hilltop at sunrise, arms slightly open, looking toward the horizon, peaceful expression',
    'canh-bao':
      'A young East Asian person sitting alone hunched over on a rock, head down, tangled bare branches around them, gray stormy sky',
    'trung-tinh':
      'A young East Asian person sitting cross-legged by a quiet lake, calm neutral expression, reading a book, still water reflecting soft light',
  },
  'hon-nhan': {
    ten: 'Hôn nhân / Vợ chồng',
    tot: "A young East Asian couple in simple modern clothes, standing close together by a calm lake at sunrise, smiling warmly at each other, one gently holding the other's hand",
    'canh-bao':
      'A young East Asian couple in simple modern clothes, standing a little apart with their backs half-turned to each other near a quiet lake, both looking down in quiet tension, storm clouds gathering over distant mountains',
    'trung-tinh':
      'A young East Asian couple in simple modern clothes, walking side by side along a quiet lakeside path, calm and thoughtful expressions, neither smiling nor troubled',
  },
  'su-nghiep': {
    ten: 'Sự nghiệp / Hợp tác / Mạng lưới',
    tot: 'A young East Asian person standing on a tall rock outcrop with arms raised triumphantly toward a rising sun, small mountain peak below, sense of achievement',
    'canh-bao':
      'A young East Asian person standing at a fork in a misty mountain path, looking uncertain at two diverging trails, bare tangled branches, gray clouds',
    'trung-tinh':
      'Two young East Asian people calmly shaking hands on a quiet stone bridge over a still river, neutral composed mood',
  },
  'tai-chinh': {
    ten: 'Tài chính',
    tot: 'A young East Asian person sitting peacefully under a large old tree full of round golden leaves gently drifting down into a basket, calm satisfied expression',
    'canh-bao':
      'A young East Asian person standing beside a nearly bare tree, its last few leaves blowing away in a strong wind, worried expression, overcast sky',
    'trung-tinh':
      'A young East Asian person walking calmly along a path lined by a young evenly-leaved tree, balanced daylight, neutral expression',
  },
  'con-cai': {
    ten: 'Con cái / Nuôi dạy',
    tot: 'A parent and a small child flying a kite together in an open field under a bright morning sky, both smiling happily',
    'canh-bao':
      'A parent and a small child standing a little apart in a garden of wilting flowers, both looking down quietly, overcast clouds above',
    'trung-tinh':
      'A parent and a small child walking hand in hand along a quiet garden path, calm neutral expressions',
  },
  'gia-dinh': {
    ten: 'Gia đình / Họ hàng',
    tot: 'A small East Asian family of three generations sitting together around a low table in front of a traditional wooden house, warm content expressions',
    'canh-bao':
      'Family members standing apart at the edges of a quiet courtyard with empty chairs between them, gray clouds overhead',
    'trung-tinh':
      'Family members walking together toward a traditional wooden house at dusk, calm neutral expressions',
  },
  'nha-cua': {
    ten: 'Nhà cửa / Tài sản',
    tot: 'A peaceful traditional East Asian wooden house nestled among green hills, warm light glowing softly from its windows at dusk',
    'canh-bao':
      'A traditional East Asian wooden house with a cracked wall and overgrown weeds in the yard, dark storm clouds gathering above',
    'trung-tinh':
      'A traditional East Asian wooden house on a quiet hillside under calm even daylight, no strong mood',
  },
  'suc-khoe': {
    // ⚠️ tránh hình ảnh gợi bệnh (không giường bệnh/thuốc men/mặt nạ y tế) —
    // chỉ gợi trạng thái năng lượng bằng bối cảnh (gió, tư thế), không tả bệnh.
    ten: 'Sức khoẻ / Vận khí',
    tot: 'A young East Asian person stretching both arms wide on a hilltop at sunrise, full of energy, a few birds flying past in the distance',
    'canh-bao':
      'A young East Asian person sitting slumped on a simple bench under a bare wind-blown tree, tired quiet posture, gray sky',
    'trung-tinh':
      'A young East Asian person walking calmly along a quiet forest path in soft even daylight, composed neutral posture',
  },
  'van-han': {
    ten: 'Vận hạn / Thời điểm / Di chuyển',
    tot: 'A young East Asian traveler standing at a mountain pass overlook with a small travel bag, sunrise light breaking through clouds ahead, hopeful posture',
    'canh-bao':
      'A lone figure standing at a crossroads in thick fog surrounded by bare trees, looking down uncertainly at a split path',
    'trung-tinh':
      'A lone traveler walking calmly across a stone bridge on a mountain road under evenly lit overcast sky',
  },
  'ten-goi': {
    ten: 'Tên gọi',
    tot: 'A blank paper scroll unrolled gently in warm morning light on a plain wooden table, a writing brush resting beside it, no text visible',
    'canh-bao':
      'A blank paper scroll crumpled slightly at one corner on a table under dim cool light, an ink brush overturned beside it, no text visible',
    'trung-tinh':
      'A blank paper scroll neatly rolled resting on a plain wooden table under even daylight, a brush placed beside it, no text visible',
  },
};

const SENTIMENTS = ['tot', 'canh-bao', 'trung-tinh'];

function inkWashPrompt(scene) {
  return [
    `Repaint this exact artistic style — the same soft East Asian ink-wash watercolor technique, muted earthy palette, gentle atmospheric perspective, layered mountain silhouettes fading into mist, circular soft-edged composition, birds as tiny dark brush marks — but with a NEW subject:`,
    scene + '.',
    `Keep the same warm, quiet, painterly mood and the same circular vignette framing as the reference image. No text, no caption, no logo anywhere in the image.`,
  ].join('\n\n');
}

const jobs = [];
for (const [slug, def] of Object.entries(TOPICS)) {
  if (ONLY_TOPIC && ONLY_TOPIC !== slug) continue;
  for (const sac of SENTIMENTS) {
    jobs.push({ slug, ten: def.ten, sac, prompt: inkWashPrompt(def[sac]) });
  }
}

if (!jobs.length) {
  console.error(
    `✗ Không khớp --topic ${ONLY_TOPIC}. Danh sách hợp lệ: ${Object.keys(TOPICS).join(', ')}`
  );
  process.exit(1);
}

console.log(`${jobs.length} ảnh sẽ sinh (style ink-wash, đã chốt qua PR #806).`);

if (CHI_PROMPT) {
  for (const j of jobs) {
    console.log('\n' + '═'.repeat(72));
    console.log(`${j.slug}-${j.sac}  (${j.ten})`);
    console.log(j.prompt);
  }
  console.log('\n(--chi-prompt: dừng ở đây, không gọi API)');
  process.exit(0);
}

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error(
    '\n✗ Thiếu OPENAI_API_KEY. Chạy lại ở máy có mạng ra ngoài thật:\n' +
      '  OPENAI_API_KEY=sk-... node scripts/gen-fbcard-topic-images.mjs'
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const refBytes = readFileSync(REF);

async function genOne(job) {
  const t0 = Date.now();
  const form = new FormData();
  form.append('model', MODEL);
  form.append('prompt', job.prompt);
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
    console.log(`✗ ${r.status} (${giay}s)`);
    console.log((await r.text().catch(() => '')).slice(0, 400));
    return false;
  }
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) {
    console.log(`✗ không nhận được ảnh (${giay}s)`);
    return false;
  }
  const png = Buffer.from(b64, 'base64');
  const webp = await sharp(png).resize(160, 160, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  const file = join(OUT_DIR, `${job.slug}-${job.sac}.webp`);
  writeFileSync(file, webp);
  console.log(`✓ ${giay}s → ${file} (${(webp.length / 1024).toFixed(1)}KB)`);
  return true;
}

let ok = 0;
for (const job of jobs) {
  process.stdout.write(`• ${job.slug}-${job.sac} … `);
  if (await genOne(job)) ok++;
}

console.log(`\nXong: ${ok}/${jobs.length} ảnh trong ${OUT_DIR}`);
if (ok < jobs.length) process.exitCode = 1;
