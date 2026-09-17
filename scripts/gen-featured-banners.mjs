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

// Bìa bản luận giải — nhận diện THƯƠNG HIỆU dùng chung mọi banner (bìa xanh
// navy + seal đỏ, xem lib/pdf/luan-giai.tsx cho bản PDF thật). KHÔNG tả chữ
// đọc được — seal thật có chữ Hán, ở đây làm mờ theo đúng luật TEXT_SAFE_AREA.
const BIA_LUAN_GIAI =
  'Beside them rests the closed cover of the printed reading booklet: a deep navy-blue card cover, a small red square stamp near the lower corner with soft illegible pale marks suggestive of a traditional seal, a thin muted gold rule near the top edge, otherwise plain.';

const BANNERS = [
  {
    id: 'laso',
    ten: 'Luận Giải Tử Vi',
    nhanVat: nhanVat('nam', 'truong-thanh'),
    canh: 'Trí sits alone at a small wooden desk in his own quiet room in the evening, one hand resting on an open booklet propped against a stack of books, intently studying the page. A single warm desk lamp is the main light source.',
    boiCanh:
      'A modest bedroom-study corner: a wooden desk, a stack of paperback books, a small potted plant, a half-drunk mug of tea, curtains drawn against the dark window, a plain wall calendar.',
    trang:
      'The open page shows a large circular natal chart divided into twelve wedge-shaped segments around a small empty centre, drawn with a faint ruler-straight grid, no readable text or numbers in any segment.',
  },
  {
    id: 'chu-trinh-cuoc-doi',
    ten: 'Chu Trình Cuộc Đời',
    nhanVat: nhanVat('nu', 'truong-thanh'),
    canh: 'Thư sits alone at a long reading table in a quiet library, both hands holding an open booklet in front of her, absorbed and thoughtful.',
    boiCanh:
      "A small municipal library reading room: tall wooden bookshelves softly out of focus behind, a single hanging pendant lamp over the table, a short stack of returned books at the table's edge, soft afternoon window light.",
    trang:
      'The open page shows a tall spindle-shaped diagram: a narrow vertical spine widening and narrowing through nine uneven stacked segments from top to bottom, each segment a different soft muted shade, no readable text or numbers.',
  },
  {
    id: 'tu-binh',
    ten: 'Tử Bình Bát Tự',
    nhanVat: nhanVat('nam', 'truong-thanh'),
    canh: 'Trí sits at his own desk in an open-plan office after most colleagues have left, leaning over an open booklet placed beside his closed laptop, one finger tracing down the page.',
    boiCanh:
      'A small office corner in the evening: a laptop with a dimmed screen, a desk lamp switched on, a potted pothos trailing off a filing cabinet, a window showing a few lit windows in a distant skyline, an empty mug.',
    trang:
      'The open page shows four narrow vertical columns side by side like carved pillars, each topped with a small abstract stacked-shape motif, no readable text or characters.',
  },
  {
    id: 'chan-dung-vo-chong',
    ten: 'Chân Dung Vợ Chồng',
    nhanVat: `${nhanVat('nam', 'truong-thanh')}. Beside them, ${nhanVat('nu', 'truong-thanh')}`,
    canh: 'Trí and Thư sit close together at a small café table, both leaning in over one open booklet held between them, Thư pointing at the page while Trí smiles. No one else is in the frame — just the two of them.',
    boiCanh:
      'A corner table in a quiet Vietnamese coffee shop: two glasses of cà phê sữa đá sweating rings onto the wood table, a small potted succulent, soft rain streaking the window beside them, warm hanging pendant lights.',
    trang:
      "The open page shows a softly rendered portrait sketch: a gentle line-art silhouette bust of a person's head and shoulders, unfinished and impressionistic, no facial detail sharp enough to read as a specific face, no readable text.",
  },
  {
    id: 'day-con',
    ten: 'Dạy Con Theo Lá Số',
    nhanVat: nhanVat('nu', 'truong-thanh'),
    canh: 'Thư sits on the floor of her living room in the evening, back resting against the sofa, an open booklet resting on her knees, reading with a soft thoughtful smile.',
    boiCanh:
      "A lived-in living room: a low coffee table with a child's crayon drawing taped to its edge, a small toy car left on the rug, a standing lamp glowing warm, a folded child's blanket on the sofa behind her.",
    trang:
      'The open page shows a simple stepped diagram: a gently rising staircase-like path of five uneven steps with a small abstract marker on one step, no readable text or labels.',
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
    `The booklet's open page: ${b.trang}`,
    BIA_LUAN_GIAI,
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
