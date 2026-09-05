#!/usr/bin/env node
/**
 * Canh box giới thiệu (`.intro-card`) đã dựng TĨNH trên các trang shell.
 *
 * 🔴 VÌ SAO. Box này từng do `Shell.introOnce()` chèn bằng JS vào `#introHost`
 * — con ĐẦU TIÊN của `.ws-body` — nên nó vừa đẩy cả thân trang xuống (đo trên
 * prod: CLS 0,198) vừa TỰ LÀM phần tử LCP với Render Delay 5,3s/5,96s. Nay
 * chữ nằm thẳng trong HTML, và `introOnce()` thấy `.intro-card` đã có thì chỉ
 * điền `#introSrc`.
 *
 * Cái giá của cách đó: nếu ai đó khai LẠI `title`/`desc` trong `SHELL_INTRO`
 * thì trang có HAI bản chữ — một bản người dùng đọc (HTML), một bản nằm im
 * trong JS. `introOnce` KHÔNG dựng lại nên bản JS không bao giờ hiện ra: sửa
 * nó không có tác dụng gì, và không có gì báo. Đó chính là kiểu hỏng im lặng
 * mà bộ dò này tồn tại để chặn.
 *
 * Kiểm trên MỌI trang `public/app-*.html` có `.intro-card` tĩnh:
 *   1. đúng MỘT `#introHost`, MỘT `.intro-card`, MỘT `#introSrc`
 *   2. `window.SHELL_INTRO` CHỈ khai `key` — không title, không desc
 *   3. `key` khớp ảnh đại diện đang trỏ trong `<img class="intro-avatar">`
 *      (qua bảng alias chép từ `Shell._AVATAR_ALIAS`)
 *
 * ⚠️ CỐ Ý không đòi mọi trang shell phải dựng tĩnh: `app-xem-tuoi.html` chọn
 * SHELL_INTRO từ một BẢNG 3 tool lúc chạy, chưa chuyển. Bộ dò đòi thứ chưa
 * quyết là bộ dò kêu oan, mà bộ dò kêu oan thì sớm muộn bị tắt.
 *
 * Chạy: node scripts/check-intro-card.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = join(ROOT, 'public');
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

// Chép tay từ `Shell._AVATAR_ALIAS` (shell.js) — shell.js là script thường,
// không import được từ đây. Lệch bảng thì phép 3 đỏ, không im.
const ALIAS = {
  'bat-tu': 'tu-binh',
  'chon-ngay': 'chon-ngay-tot',
  'dat-ten': 'dat-ten-con',
  'luan-giai': 'laso',
  'sinh-con': 'xem-tuoi-sinh-con',
  'thanh-tuong-pro': 'thanh-tuong',
};

const files = readdirSync(DIR).filter((f) => /^app-.*\.html$/.test(f));
let checked = 0;

for (const f of files) {
  const s = readFileSync(join(DIR, f), 'utf8');
  if (!s.includes('class="intro-card"')) continue;
  checked++;

  const count = (re) => (s.match(re) || []).length;
  const host = count(/id="introHost"/g);
  const card = count(/class="intro-card"/g);
  const src = count(/id="introSrc"/g);
  if (host !== 1 || card !== 1 || src !== 1)
    fail(
      `${f}: phải có đúng 1 #introHost / 1 .intro-card / 1 #introSrc — đang là ${host}/${card}/${src}`
    );

  const m = s.match(/window\.SHELL_INTRO\s*=\s*\{([^}]*)\}/);
  if (!m) {
    fail(
      `${f}: có .intro-card tĩnh nhưng KHÔNG khai window.SHELL_INTRO — shell không biết key nào để lấy dòng nguồn`
    );
    continue;
  }
  const body = m[1];
  const props = body
    .split(',')
    .map((p) => p.split(':')[0].trim().replace(/['"]/g, ''))
    .filter(Boolean);
  const extra = props.filter((p) => p !== 'key');
  if (extra.length)
    fail(
      `${f}: SHELL_INTRO còn khai ${extra.join('/')} — chữ đã nằm trong HTML rồi, ` +
        `giữ thêm bản trong JS là bản chép CHẾT (introOnce không dựng lại nên nó không bao giờ hiện).`
    );

  const km = body.match(/key\s*:\s*['"]([^'"]+)['"]/);
  if (!km) {
    fail(`${f}: SHELL_INTRO thiếu key`);
    continue;
  }
  const key = km[1];
  const want = `/tool-avatars/${ALIAS[key] || key}.webp`;
  const im = s.match(/<img class="intro-avatar" src="([^"]+)"/);
  if (!im) fail(`${f}: box tĩnh thiếu <img class="intro-avatar">`);
  else if (im[1] !== want)
    fail(`${f}: ảnh đại diện là ${im[1]} nhưng key '${key}' phải trỏ ${want}`);
}

if (!checked)
  fail('Không thấy trang nào có .intro-card tĩnh — bộ dò này đang canh một thứ không còn tồn tại.');
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} trang có box tĩnh.`);
  process.exit(1);
}
console.log(
  `✅ Box giới thiệu tĩnh: ${checked} trang · mỗi trang 1 box, SHELL_INTRO chỉ còn key, ảnh khớp key.`
);
