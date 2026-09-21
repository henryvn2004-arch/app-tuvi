#!/usr/bin/env node
/**
 * Sinh 5 ẢNH BANNER cho slider "Công cụ nổi bật" trên trang chủ
 * (index-sample-v3.html) — mỗi ảnh một tool, nhân vật CHÍNH là khách hàng
 * (Trí/Thư — nhân vật đã dùng cho thư viện minh hoạ luận giải, KHÔNG phải
 * Minh Bảo), đang đọc bản luận giải Tử Vi Minh Bảo (bìa xanh navy + seal đỏ
 * nhận diện, nội dung trang mở tuỳ tool).
 *
 * Dùng CHUNG STYLE_LOCK/TEXT_SAFE_AREA/nhanVat() của `illus-prompt.ts` (thư
 * viện minh hoạ luận giải) — cùng phong cách "khách hàng" đã duyệt, không bịa
 * phong cách mới. KHÔNG dùng webtoon-style.ts (đó là phong cách chibi của
 * riêng Minh Bảo).
 *
 * Ảnh là ASSET TĨNH cho trang chủ, vẽ MỘT LẦN rồi commit vào `public/mascot/`
 * (giống hero-scene-v2/library-v2/articles-v2/community-v2), KHÔNG qua
 * Supabase Storage — đây là ảnh marketing cố định, không phải theo-lá-số.
 *
 * Chạy ở NƠI CÓ `OPENAI_API_KEY` và ra được Internet:
 *   node scripts/gen-featured-banners.mjs --dry-run   # chỉ in prompt
 *   node scripts/gen-featured-banners.mjs             # vẽ thật, ra .featured-banners/
 *   node scripts/gen-featured-banners.mjs --id laso   # chỉ 1 banner
 *
 * Cờ: --out (mặc định `.featured-banners/`) · --size (mặc định 1536x1024) ·
 * --quality low|medium|high (mặc định medium).
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

const TSC_LOCAL = join(ROOT, 'node_modules/.bin/tsc');
const TSC_ARGS = [
  '--ignoreConfig',
  '--module',
  'commonjs',
  '--target',
  'es2022',
  '--skipLibCheck',
  '--outDir',
  null,
  join(ROOT, 'lib/media/illus-prompt.ts'),
];
const outDir = mkdtempSync(join(tmpdir(), 'featured-banner-prompt-'));
TSC_ARGS[TSC_ARGS.indexOf(null)] = outDir;
if (existsSync(TSC_LOCAL)) {
  execFileSync(TSC_LOCAL, TSC_ARGS, { stdio: 'inherit' });
} else {
  const ver = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')).packages[
    'node_modules/typescript'
  ].version;
  execFileSync('npx', ['--yes', '-p', `typescript@${ver}`, 'tsc', ...TSC_ARGS], {
    stdio: 'inherit',
  });
}
const { STYLE_LOCK, TEXT_SAFE_AREA, nhanVat } = require(join(outDir, 'illus-prompt.js'));
if (!STYLE_LOCK || !TEXT_SAFE_AREA || typeof nhanVat !== 'function') {
  console.error(
    '❌ không nạp được STYLE_LOCK/TEXT_SAFE_AREA/nhanVat — dừng trước khi đốt tiền vẽ.'
  );
  process.exit(1);
}

// Mô tả QUYỂN LUẬN GIẢI — nhận diện THƯƠNG HIỆU dùng chung mọi banner (bìa
// xanh navy + seal đỏ, xem lib/pdf/luan-giai.tsx cho bản PDF thật). KHÔNG tả
// chữ đọc được — seal thật có chữ Hán, ở đây làm mờ theo đúng luật
// TEXT_SAFE_AREA. Mỗi banner tự khai `bia` RIÊNG (đóng hay mở, ai cầm, trang
// mở hiện gì) thay vì một hằng số `BIA_LUAN_GIAI` đóng dùng chung — bản duyệt
// 2026-09-17 (Henry) có banner bìa đóng (cầm lên khoe/để trên bàn) VÀ banner
// bìa mở (chỉ vào biểu đồ), gộp chung một mô tả "đóng" cho cả hai là sai với
// ảnh thật đã vẽ.

const BANNERS = [
  {
    id: 'laso',
    ten: 'Luận Giải Tử Vi',
    nhanVat: nhanVat('nu', 'truong-thanh'),
    canh: 'Thư sits at a lively outdoor sidewalk café table in Saigon with three close friends around her, holding up the closed booklet so everyone can see its cover, caught mid-laugh and mid-sentence as she points at it, animated and delighted. Her friends lean in eagerly — one reaching out toward the booklet, another laughing with their head tipped back, the third grinning and chiming in — the whole table buzzing with cheerful chatter.',
    boiCanh:
      'A bustling Saigon sidewalk café: small round marble-top tables and rattan chairs spilling onto the pavement, glasses of cà phê sữa đá sweating on the table with a phin filter still perched on one, a row of potted areca palms along a low wall, a striped fabric awning overhead, motorbikes and a softly blurred street scene beyond the railing, warm late-morning sunlight, the whole place lively and busy with other cheerful patrons lightly sketched in the background.',
    bia: 'In her hands, held up so her friends can see, the closed cover of the printed reading booklet: a deep navy-blue card cover, a small red square stamp near the lower corner with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge, otherwise plain.',
  },
  {
    id: 'chu-trinh-cuoc-doi',
    ten: 'Chu Trình Cuộc Đời',
    nhanVat: nhanVat('nam', 'truong-thanh'),
    canh: 'Trí sits at his desk in a bright open-plan office, holding up the closed booklet so his colleagues gathered around can see its cover, caught mid-laugh and mid-sentence as he points at it, delighted and easy. Several colleagues — both men and women — have gathered around his desk, leaning in eagerly: one leaning over his shoulder pointing at the cover, a woman beside him laughing with a hand near her mouth, another colleague perched on the edge of a neighbouring desk grinning, the whole corner of the office buzzing with cheerful chatter.',
    boiCanh:
      'A bright open-plan office in central Saigon: tall floor-to-ceiling windows with a hazy high-rise skyline beyond, rows of desks with monitors and lightly sketched colleagues further back, a potted pothos trailing off a filing cabinet, a couple of plastic cups of iced coffee sweating on the desks, scattered papers and a closed laptop, warm late-morning sunlight pouring in, everything fresh and lively.',
    bia: 'In his hands, held up so his colleagues can see, the closed cover of the printed reading booklet: a deep navy-blue card cover, a small red square stamp near the lower corner with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge, otherwise plain.',
  },
  {
    id: 'tu-binh',
    ten: 'Tử Bình Bát Tự',
    nhanVat: nhanVat('nu', 'truong-thanh'),
    canh: 'Thư sits across a small restaurant table from a close friend at dinner, the booklet resting closed on the table between their half-finished plates. The conversation is quiet and unhurried — Thư leaning in slightly with a soft, thoughtful half-smile, speaking gently with one hand resting near the booklet, her friend listening closely with a warm, attentive expression, chin resting lightly on one hand. No one else is in the frame — just the two of them, fully absorbed in the moment, the mood calm and intimate rather than loud.',
    boiCanh:
      'A cosy small Vietnamese restaurant at dinner time: a candle glowing low between them, two plates of a shared home-style dish, chopsticks resting on ceramic rests, a carafe of water sweating lightly, a vase with a single stem of flowers, other diners softly blurred and quiet in the background, warm dim evening lighting.',
    bia: 'On the table between their plates, resting closed, the printed reading booklet: a deep navy-blue card cover, a small red square stamp near the lower corner with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge, otherwise plain.',
  },
  {
    id: 'chan-dung-vo-chong',
    ten: 'Chân Dung Vợ Chồng',
    nhanVat: `${nhanVat('nu', 'truong-thanh')}. Beside her, ${nhanVat('nam', 'truong-thanh')}`,
    canh: 'Thư and Trí sit close together at a small round table outside a little ice cream shop by Hoàn Kiếm Lake, each with a small cup of ice cream in front of them. Thư holds the booklet open between them, one finger tracing the page as she explains, leaning in with a warm, animated expression. Trí leans in beside her, nodding slowly with a small satisfied smile, clearly recognising something true in what she is pointing out, one arm resting lightly along the back of her chair. No one else is in the frame — just the two of them, close and unhurried.',
    boiCanh:
      "A small outdoor ice cream stall table by Hoàn Kiếm Lake in Hanoi on a crisp cool evening: the lake's still water and the silhouette of Turtle Tower softly visible behind them, a string of warm fairy lights strung along the stall awning, both of them in light jackets and Thư with a thin scarf, a faint chill in the air suggested by warm hands wrapped around the ice cream cups and a light steam of breath, old trees along the lake shore, a few strollers softly sketched in the distance, the whole scene glowing warm against the cool blue evening.",
    bia: 'The booklet Thư holds open between them: a deep navy-blue card cover folded back, a small red square stamp near the lower corner of the back cover with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge. The open page shows two small circular natal charts side by side, each divided into faint wedge-shaped segments with a few soft glowing dots, joined by a single thin curved line between them — no readable text or numbers anywhere.',
  },
  {
    id: 'day-con',
    ten: 'Dạy Con Theo Lá Số',
    nhanVat: `${nhanVat('nu', 'truong-thanh')}. Beside her, ${nhanVat('nam', 'truong-thanh')}`,
    canh: 'Trí and Thư sit close together on a cosy sofa at home, Trí holding the booklet open and angled toward Thư, one finger tracing the page as he explains something. Thư leans in, listening closely with a warm, attentive expression, nodding slowly as if recognising something true. On the floor in front of the sofa, their five-year-old son sits playing with a set of wooden toy blocks and a small toy car, absorbed and happy, while his three-year-old little sister sits close beside him, reaching for one of the blocks, both children lit warm and soft, a little rug and a scatter of toys around them.',
    boiCanh:
      'A cosy wooden mountain home in Đà Lạt: a small wood-burning stove glowing in the corner, a knitted blanket draped over the sofa arm, tall windows showing misty pine trees and soft evening light outside, a low wooden coffee table with two mugs of hot tea steaming, potted ferns by the window, warm lamplight mixing with the last cool blue of dusk outside, the whole room quiet and warm.',
    bia: 'The booklet Trí holds open toward Thư: a deep navy-blue card cover folded back, a small red square stamp near the lower corner of the back cover with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge. The open page shows a gently rising path of small rounded stepping-stones, each marked with a soft glowing dot, climbing from one corner of the page to the other — no readable text or numbers anywhere.',
  },
];

function buildPrompt(b) {
  return [
    STYLE_LOCK,
    '',
    `${b.nhanVat}.`,
    '',
    `Scene: ${b.canh}`,
    `Environment: ${b.boiCanh}`,
    b.bia,
    '',
    'Composition: wide horizontal frame, the character(s) placed off-centre towards the right, seen from a natural eye-level three-quarter angle, room to breathe around them.',
    '',
    TEXT_SAFE_AREA,
  ].join('\n');
}

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);

const OUT = flag('--out', join(ROOT, '.featured-banners'));
const SIZE = flag('--size', '1536x1024');
const QUALITY = flag('--quality', 'medium');
const DRY = has('--dry-run');
const onlyIds = has('--id')
  ? flag('--id')
      .split(',')
      .map((s) => s.trim())
  : null;
const picks = onlyIds ? BANNERS.filter((b) => onlyIds.includes(b.id)) : BANNERS;
if (onlyIds && picks.length !== onlyIds.length) {
  console.error(
    `Không tìm thấy id: ${onlyIds.filter((i) => !BANNERS.some((b) => b.id === i)).join(', ')}`
  );
  process.exit(1);
}

const KEY = process.env.OPENAI_API_KEY || '';
if (!KEY && !DRY) {
  console.error('Thiếu OPENAI_API_KEY. Đặt biến môi trường rồi chạy lại, hoặc dùng --dry-run.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
console.log(`${picks.length} banner · ${SIZE} · quality=${QUALITY}${DRY ? ' · DRY-RUN' : ''}\n`);

let daVe = 0,
  loi = 0;
for (const b of picks) {
  const prompt = buildPrompt(b);
  if (DRY) {
    console.log(`── ${b.id} — ${b.ten}\n${prompt}\n`);
    continue;
  }
  const dich = join(OUT, `${b.id}.png`);
  if (existsSync(dich)) {
    console.log(`⏭  ${b.id} — đã có, bỏ qua`);
    continue;
  }
  try {
    const t0 = Date.now();
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        size: SIZE,
        quality: QUALITY,
        output_format: 'png',
        n: 1,
      }),
    });
    if (!r.ok) {
      const body = (await r.text().catch(() => '')).slice(0, 300);
      if ([401, 403, 429].includes(r.status)) {
        console.error(`⛔ ${r.status} — lỗi chặn, DỪNG cả lượt: ${body}`);
        process.exit(1);
      }
      throw new Error(`${r.status}: ${body}`);
    }
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new Error('API không trả ảnh');
    const pngBuf = await sharp(Buffer.from(b64, 'base64'))
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    writeFileSync(dich, pngBuf);
    const u = j?.usage || {};
    const outTok = u.output_tokens || 0;
    const textTok = u.input_tokens_details?.text_tokens || 0;
    const vnd = Math.round(((textTok * 5 + outTok * 30) / 1e6) * 25000);
    daVe++;
    console.log(
      `✅ ${b.id}  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s  ·  ${(pngBuf.length / 1024).toFixed(0)}KB  ·  ~${vnd.toLocaleString('vi-VN')}đ`
    );
  } catch (e) {
    loi++;
    console.error(`❌ ${b.id}: ${e.message}`);
  }
}

if (!DRY) {
  console.log(`\nVẽ mới ${daVe} · lỗi ${loi}`);
  if (loi) process.exitCode = 1;
}
