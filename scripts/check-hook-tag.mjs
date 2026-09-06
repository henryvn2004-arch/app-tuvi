#!/usr/bin/env node
/**
 * scripts/check-hook-tag.mjs — canh đúng MỘT lớp lỗi, và nó ĐÃ cắn một lần.
 *
 * `NHAN_TINH_CHAT_RULE` (lib/agent/prompts.ts) bắt model gắn nhãn tính chất
 * trước câu hook in đậm. 16 trang bóc nhãn đó bằng regex CHÉP TAY riêng từng
 * trang rồi tô thẻ `.fb-card`. Hai thứ này KHÔNG có gì buộc phải khớp nhau.
 *
 * 🔴 ĐÃ CẮN (2026-09-05, PR #702): prompt đổi `[TỐT]` → `[TỐT|TỪ KHOÁ]` để
 * lấy dữ liệu dựng visual. 16 regex vẫn là `\[(TỐT|CẢNH BÁO|TRUNG TÍNH)\]` —
 * dấu `\]` dính ngay sau nhóm nên KHÔNG khớp dạng mới. Hậu quả: thẻ caption
 * mất màu VÀ chuỗi `[TỐT|MỞ LỐI]` hiện thô ra cho người đã trả tiền, trên cả
 * 16 tool. Không một lỗi nào bắn ra — chỉ là chữ xấu đi, nên rất dễ sống lâu.
 *
 * CÁCH CANH: lấy CHÍNH regex trong từng trang, chạy nó trên bộ mẫu dưới đây.
 * Mẫu gồm dạng CŨ (kết quả đã cache trong `laso_public.luan_giai` — vẫn phải
 * đọc được) và dạng MỚI. Trang nào bỏ sót một dạng là đỏ.
 *
 * ⚠️ Regex trong trang phải giữ nhóm bắt ĐÚNG thứ tự (1=nhãn, 2=câu hook):
 * nhóm từ khoá là NON-capturing `(?:…)` có chủ ý — thêm nhóm bắt vào giữa sẽ
 * dời chỉ số của `m[2]`/`m[3]` và của `function(_,tag,hook,rest)`, làm hỏng
 * đúng 16 chỗ mà bộ dò này đang canh.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public');

/** Mẫu PHẢI khớp — [nhãn mong đợi, câu hook mong đợi, mô tả]. */
const PHAI_KHOP = [
  [
    'TRUNG TÍNH',
    'Bề ngoài đàng hoàng',
    '[TRUNG TÍNH] **Bề ngoài đàng hoàng** (Thái Dương vượng).',
    'dạng CŨ — bản đã cache trong laso_public',
  ],
  [
    'CẢNH BÁO',
    'Quãng này có tiền vào túi',
    '[CẢNH BÁO|PHÒNG HỌA] **Quãng này có tiền vào túi** rồi thêm chữ.',
    'dạng MỚI',
  ],
  [
    'TỐT',
    'Danh tiếng kéo về',
    '[TỐT|VẬN NGOẠI GIAO] **Danh tiếng kéo về** đuôi.',
    'dạng MỚI, từ khoá 3 chữ',
  ],
  [
    'TỐT',
    'từ khoá rỗng',
    '[TỐT|] **từ khoá rỗng** đuôi.',
    'model lỡ bỏ trống từ khoá — vẫn phải nuốt, đừng phun nhãn ra màn hình',
  ],
];

/** Mẫu KHÔNG được khớp — nhãn lạ thì để nguyên đoạn, đừng tô bừa. */
const KHONG_KHOP = ['[XẤU|X] **nhãn không có thật** đuôi.'];

/**
 * Bóc các literal regex BÓC THẺ HOOK ra khỏi một file.
 *
 * ⚠️ Chỉ nhận literal có CẢ phần `\*\*` — tức regex thật sự bóc "nhãn + câu
 * hook in đậm" để dựng thẻ `.fb-card`. Trang còn có regex KHÁC cùng chứa ba
 * nhãn nhưng khác vai: `_RX_HOOK` ở app-van-han-nam / app-chu-trinh-cuoc-doi
 * chỉ lấy nhãn + TỪ KHOÁ để dựng ô/cột visual, không đụng tới câu hook. Bản
 * đầu của bộ dò này quét mọi literal nên báo đỏ 8 lần vào đúng hai regex đó —
 * kêu oan. Thu hẹp phạm vi còn hơn để nó báo bừa: bộ dò kêu oan là bộ dò bị
 * tắt đi.
 */
function regexTrongFile(src) {
  const out = [];
  // Literal regex nằm trên MỘT dòng ở cả 16 trang; bắt từ `/^\[(TỐT` tới
  // dấu `/` đóng kèm cờ. Không dùng parser JS: 16 file này là HTML lẫn script.
  const re = /\/\^?\\\[\(TỐT\|CẢNH BÁO\|TRUNG TÍNH\)[^\n]*?\/[gimsuy]*/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].includes('\\*\\*')) out.push(m[0]);
  }
  return out;
}

/** '/abc/gm' → new RegExp('abc','gm'). */
function dungRegex(lit) {
  const i = lit.lastIndexOf('/');
  return new RegExp(lit.slice(1, i), lit.slice(i + 1).replace(/g/g, ''));
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.html') || f.endsWith('.js'))
  .map((f) => join(DIR, f))
  .filter((p) => readFileSync(p, 'utf8').includes('TỐT|CẢNH BÁO|TRUNG TÍNH'));

if (!files.length) {
  console.error('✗ check:hooktag — KHÔNG thấy trang nào bóc nhãn tính chất.');
  console.error('  Bộ dò tìm theo chuỗi "TỐT|CẢNH BÁO|TRUNG TÍNH" trong public/*.{html,js}.');
  console.error('  Đổi cách viết nhãn thì phải sửa bộ dò CÙNG LÚC — đừng để nó xanh oan.');
  process.exit(1);
}

let loi = 0;
for (const p of files) {
  const ten = p.replace(process.cwd() + '/', '');
  const lits = regexTrongFile(readFileSync(p, 'utf8'));
  if (!lits.length) {
    console.error(`✗ ${ten}: có nhắc 3 nhãn nhưng không bóc được literal regex nào.`);
    loi++;
    continue;
  }
  for (const lit of lits) {
    let rx;
    try {
      rx = dungRegex(lit);
    } catch (e) {
      console.error(`✗ ${ten}: regex không dựng được — ${e.message}\n    ${lit}`);
      loi++;
      continue;
    }
    for (const [nhan, hook, mau, moTa] of PHAI_KHOP) {
      const m = rx.exec(mau);
      if (!m) {
        console.error(`✗ ${ten}: KHÔNG khớp ${moTa}\n    mẫu:   ${mau}\n    regex: ${lit}`);
        loi++;
      } else if (m[1] !== nhan || m[2] !== hook) {
        console.error(
          `✗ ${ten}: khớp nhưng SAI THỨ TỰ NHÓM BẮT (m[1] phải là nhãn, m[2] phải là câu hook)\n` +
            `    m[1]="${m[1]}" (đợi "${nhan}") · m[2]="${m[2]}" (đợi "${hook}")\n` +
            `    Nhóm từ khoá phải là non-capturing (?:…) — xem đầu file này.\n    regex: ${lit}`
        );
        loi++;
      }
    }
    for (const mau of KHONG_KHOP) {
      if (rx.exec(mau)) {
        console.error(
          `✗ ${ten}: khớp NHẦM nhãn không có thật\n    mẫu:   ${mau}\n    regex: ${lit}`
        );
        loi++;
      }
    }
  }
}

// ── Luật 2: mọi trang nạp `hook-charts.js` phải CÙNG một `?v=` ───────────────
// 🔴 ĐÃ CẮN (2026-09-06): bump `?v=1` → `?v=2` cho cả 5 trang, nhưng lượt
// red-team bộ dò ngay sau đó chạy `git checkout -- public/app-luan-giai.html`
// để gỡ đột biến — mà lúc ấy bản bump CHƯA commit, nên lệnh đó kéo file về HEAD
// và xoá trắng luôn bump của đúng trang này. 4 trang ở v=2, một trang ở v=1:
// trang lẻ loi kia giữ file trong cache trình duyệt, tức bản vá màu cờ ở dark
// mode KHÔNG tới nó. Không lỗi nào bắn ra, và `check:hooktag` bản đầu cũng
// không thấy vì nó chỉ soi regex.
// (Đây đúng cái bẫy CLAUDE.md đã ghi: "commit TRƯỚC, red-team SAU".)
const VER_RX = /hook-charts\.js\?v=(\d+)/g;
const vers = new Map();
for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.html') && !f.endsWith('.js')) continue;
  const src = readFileSync(join(DIR, f), 'utf8');
  let m;
  while ((m = VER_RX.exec(src))) {
    if (!vers.has(m[1])) vers.set(m[1], []);
    vers.get(m[1]).push('public/' + f);
  }
}
if (vers.size > 1) {
  console.error('✗ hook-charts.js?v= KHÔNG đồng bộ giữa các trang:');
  for (const [v, files] of [...vers.entries()].sort()) {
    console.error(`    v=${v} → ${files.join(', ')}`);
  }
  console.error(
    '  Trang ở phiên bản CŨ giữ file trong cache trình duyệt ⇒ mọi bản vá nằm\n' +
      '  trong hook-charts.js không tới nó. Bump ĐỦ CẢ CÂY public/, không chỉ\n' +
      '  trang mình đang sửa.'
  );
  loi++;
}

if (loi) {
  console.error(`\n✗ check:hooktag — ${loi} lỗi trên ${files.length} trang.`);
  process.exit(1);
}
console.log(`✓ check:hooktag — ${files.length} trang bóc được cả dạng cũ lẫn dạng có từ khoá.`);
