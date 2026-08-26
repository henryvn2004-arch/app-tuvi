#!/usr/bin/env node
/**
 * Canh NGUỒN DUY NHẤT của chuỗi rơi ảnh người nổi tiếng, và canh việc GHI CÔNG.
 *
 * 🔴 VÌ SAO. Ảnh đi qua ba chặng — Supabase Storage → Commons → avatar chữ cái
 * — và cả ba đều "trông vẫn chạy" khi hỏng. Nếu route API và
 * `scripts/sync-celeb-photos.mjs` ghép URL riêng rồi trôi khỏi nhau, triệu
 * chứng GIỐNG HỆT triệu chứng của "ảnh chưa kịp đồng bộ": thẻ vẫn hiện, chỉ là
 * hiện avatar chữ. Không lỗi, không log, không đổi màu CI. Chỉ bộ dò thấy.
 *
 * Và một luật KHÔNG phải luật kỹ thuật: từ khi kéo ảnh về kho của mình, mình
 * là bên PHÂN PHỐI tác phẩm chứ không còn chỉ dẫn tới nó, nên CC BY-SA đòi ghi
 * tác giả + license trên trang. Bỏ dòng ghi công đi thì trang vẫn chạy hoàn
 * hảo — đó chính là lý do phải có bộ dò, chứ không phải trí nhớ.
 *
 * Kiểm 4 thứ:
 *   1. Chỉ `tools-shared/celeb-photo.js` được viết URL Commons/Storage thô
 *   2. Route API nạp module đó, KHÔNG tự ghép
 *   3. Script đồng bộ xếp cùng thứ tự với API (fame_score giảm dần)
 *   4. UI có hiện ảnh thì phải có hiện ghi công
 *
 * Tự red-team: dựng lại đúng bản chép tay rồi xác nhận từng phép bắt được.
 *
 * Chạy: node scripts/check-celeb-anh.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const MODULE = 'public/tools-shared/celeb-photo.js';
const ROUTE = 'app/api/v1/cung-ngay-sinh/route.ts';
const SYNC = 'scripts/sync-celeb-photos.mjs';
const UI = 'public/tools-shared/cung-ngay-sinh.js';
const read = (rel) => readFileSync(join(ROOT, rel), 'utf-8');

// Hai dạng URL không được xuất hiện ngoài module dùng chung.
const URL_THO = [
  ['Special:FilePath', /commons\.wikimedia\.org\/wiki\/Special:FilePath/],
  ['File: trên Commons', /commons\.wikimedia\.org\/wiki\/File:/],
  ['object/public/celeb-photos', /storage\/v1\/object\/public\/celeb-photos/],
];

// ── 1. Không file nào khác ghép URL thô ──────────────────────
function files(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '.git') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e)) out.push(p);
  }
  return out;
}
const MIEN_TRU = new Set([MODULE, 'scripts/check-celeb-anh.mjs']);
let quet = 0;
for (const abs of files(join(ROOT, 'app')).concat(
  files(join(ROOT, 'lib')),
  files(join(ROOT, 'scripts')),
  files(join(ROOT, 'public', 'tools-shared'))
)) {
  const rel = abs.slice(ROOT.length);
  if (MIEN_TRU.has(rel)) continue;
  quet++;
  const src = readFileSync(abs, 'utf-8');
  for (const [ten, re] of URL_THO) {
    // Chỉ soi MÃ, bỏ qua chú thích: chú thích nêu URL để giải thích là hợp lệ,
    // bắt luôn cả chú thích thì bộ dò kêu oan rồi bị tắt.
    const ma = src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    if (re.test(ma)) {
      fail(`${rel}: tự ghép URL "${ten}" — phải đi qua ${MODULE} (chuỗi rơi một nguồn).`);
    }
  }
}

// ── 2. Route nạp module dùng chung ──────────────────────────
const route = read(ROUTE);
if (!/celebPhoto\(\)/.test(route))
  fail(`${ROUTE}: không gọi celebPhoto() — không dùng chuỗi rơi dùng chung.`);
for (const truong of ['anhNguon', 'anhTacGia', 'anhLicense', 'anhTrang']) {
  if (!new RegExp(`\\b${truong}\\s*:`).test(route)) {
    fail(`${ROUTE}: không còn trả trường \`${truong}\` — UI mất đường ghi công / mất đường đo.`);
  }
}

// ── 3. Script đồng bộ xếp cùng thứ tự với API ───────────────
// Lệch thứ tự ⇒ kéo về NHẦM ảnh, mà triệu chứng vẫn là "hiện avatar chữ".
const sync = read(SYNC);
if (!/fame_score\.desc/.test(sync)) {
  fail(`${SYNC}: sổ việc không xếp theo \`fame_score.desc\` — lệch thứ tự API dùng cho tầng T1.`);
}
if (!/fame_score\.desc/.test(route)) {
  fail(
    `${ROUTE}: tầng T1 không còn xếp theo \`fame_score.desc\` — script đồng bộ đang neo vào thứ tự này.`
  );
}
if (!/WARM_PER_KEY/.test(sync) || !/WARM_PER_KEY/.test(read(MODULE))) {
  fail('Trần `WARM_PER_KEY` không còn đến từ module dùng chung.');
}
// Trần phải được NÓI TO — trần im lặng đọc thành "đã phủ hết".
if (!/BỎ LẠI|bỏ lại/.test(sync)) {
  fail(
    `${SYNC}: không in ra số dòng bị trần \`WARM_PER_KEY\` bỏ lại — trần im lặng là trần nói dối.`
  );
}

// ── 4. Hiện ảnh thì phải hiện ghi công ──────────────────────
const ui = read(UI);
if (/it\.anh\b/.test(ui)) {
  for (const truong of ['anhTacGia', 'anhLicense', 'anhTrang']) {
    // 🪤 `includes(truong)` là RĂNG CÙN: đổi tên thành `anhTacGiaZZ` vẫn chứa
    // `anhTacGia` nên vẫn "pass". Đã vấp đúng thế lúc red-team. Phải soi ĐÚNG
    // dạng truy cập `it.<tên>` kèm biên từ.
    if (!new RegExp(`it\\.${truong}\\b`).test(ui)) {
      fail(
        `${UI}: có hiện ảnh nhưng KHÔNG đọc \`it.${truong}\` — thiếu ghi công cho ảnh CC BY-SA.`
      );
    }
  }
  if (!/cns-anh-nguon/.test(ui)) {
    fail(`${UI}: không còn dựng khối \`.cns-anh-nguon\` — ghi công không lên được màn hình.`);
  }
}

// ── RED-TEAM ────────────────────────────────────────────────
const mutants = [
  [
    'route tự ghép URL Commons',
    'const u = "https://commons.wikimedia.org/wiki/Special:FilePath/" + f;',
    URL_THO[0][1],
  ],
  [
    'script tự ghép URL Storage',
    'const u = base + "/storage/v1/object/public/celeb-photos/" + k;',
    URL_THO[2][1],
  ],
];
for (const [ten, doan, re] of mutants) {
  if (!re.test(doan)) fail(`RED-TEAM THẤT BẠI: mẫu KHÔNG bắt được "${ten}".`);
  else console.log(`   ↳ red-team: "${ten}" bị bắt ✓`);
}
// Chú thích nêu URL phải KHÔNG bị bắt — nếu bị thì bộ dò kêu oan.
const chuThich = '// dùng https://commons.wikimedia.org/wiki/Special:FilePath/ ...';
const maSach = chuThich
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');
if (URL_THO[0][1].test(maSach)) {
  fail('RED-TEAM THẤT BẠI: bộ dò bắt cả URL nằm trong CHÚ THÍCH — sẽ kêu oan rồi bị tắt.');
} else {
  console.log('   ↳ red-team: URL trong chú thích KHÔNG bị bắt ✓ (không kêu oan)');
}

if (bad === 0) {
  console.log(
    `✅ Chuỗi rơi ảnh một nguồn (${MODULE}); ${quet} file không tự ghép URL; script đồng bộ cùng thứ tự với API; UI có ghi công.`
  );
} else {
  console.error(
    `\n${bad} lỗi — cả ba chặng ảnh đều "trông vẫn chạy" khi hỏng, không có gì khác báo cho bạn.`
  );
  process.exitCode = 1;
}
