#!/usr/bin/env node
/**
 * Canh luật "slug thanh toán PHẢI bắt đầu bằng đúng tool_id" (CLAUDE.md, mục
 * "Đường tiền") cho các tool đi qua `toolPaymentDenied` (lib/billing/credits.ts).
 *
 * 🔴 VÌ SAO. `toolPaymentDenied` có đường lùi `hasRecentToolPayment` — khớp
 * slug đã trả tiền THEO TIỀN TỐ tool_id (`slug=like.<tool_id>*`), dùng khi
 * client không gửi slug hoặc slug không khớp CHÍNH XÁC. Đường lùi đó chỉ đúng
 * nếu MỌI slug của tool này đều bắt đầu bằng tool_id:
 *   - Slug SAI tiền tố (không bắt đầu bằng tool_id) → đường lùi KHÔNG BAO GIỜ
 *     khớp được → "trừ tiền xong vẫn 402 ⇒ bấm lại ⇒ trừ lần hai"
 *     (xem docs/nhat-ky/2026-08.md, mục "Duyên Nợ trừ tiền HAI LẦN").
 *   - Slug đúng tiền tố NHƯNG tool có NHIỀU sản phẩm con cùng tool_id (chia
 *     phần/nhiều lá số) → đường lùi khớp NHẦM, cho qua sản phẩm con KHÁC
 *     trong 20 phút sau MỘT lượt mua bất kỳ.
 * Bộ dò này chỉ canh vế ĐẦU (sai tiền tố) cho các tool ĐANG dùng
 * `toolPaymentDenied` — vế SAU (nhiều sản phẩm con) là lý do `laso` KHÔNG
 * dùng `toolPaymentDenied` nữa, xem ngoại lệ ghi bên dưới.
 *
 * Mọi tool trong danh sách đều đi qua `TuviPaywall.generateToolSlug(product)`
 * (public/tuvi-paywall.js) — hàm đó AN TOÀN (chỉ nối thêm uid+timestamp vào
 * SAU `product`), rủi ro nằm ở CHỖ GỌI: `product` truyền vào có thật sự bắt
 * đầu bằng tool_id không.
 *
 * ⚠️ CỐ Ý chỉ liệt kê 7 tool ĐANG dùng `toolPaymentDenied` — thêm tool mới
 * dùng cơ chế này thì thêm vào CHECKS, đừng để bộ dò tự đoán (đoán sai âm
 * thầm còn tệ hơn không dò). Bộ dò đòi thứ chưa xảy ra là bộ dò kêu oan, mà
 * kêu oan thì sớm muộn bị tắt.
 *
 * Chạy: node scripts/check-slug.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

// tool_id (khớp `const TOOL_ID` trong route.ts) → file client dựng slug.
const CHECKS = [
  { toolId: 'day-con', file: 'public/app-day-con.html' },
  { toolId: 'nhan-mach', file: 'public/app-nhan-mach.html' },
  { toolId: 'nguoi-khac', file: 'public/app-nguoi-khac.html' },
  { toolId: 'huong-nghiep-tre', file: 'public/app-huong-nghiep-tre.html' },
  { toolId: 'gio-sinh', file: 'public/app-gio-sinh.html' },
  { toolId: 'chan-dung-tien-kiep', file: 'public/app-chan-dung-tien-kiep.html' },
  { toolId: 'chan-dung-vo-chong', file: 'public/app-chan-dung-vo-chong.html' },
];

// Chỉ bắt PHẦN ĐẦU của đối số — KHÔNG cố khớp cả cặp ngoặc cân bằng (một lời
// gọi thật có ngoặc lồng bên trong, vd `...+(b.isLunar?'a':'d')`, làm phép so
// "ngoặc gần nhất" cắt cụt sai chỗ). Chỉ cần biết token ĐẦU TIÊN là gì.
const CALL_START = /generateToolSlug\(\s*(TOOL_ID|['"`][^'"`]*)/g;

function firstToken(src, toolId) {
  const hits = [...src.matchAll(CALL_START)];
  if (!hits.length) return { calls: 0, results: [] };
  const results = hits.map((m) => {
    const head = m[1];
    if (head === 'TOOL_ID') {
      const idMatch = src.match(/const\s+TOOL_ID\s*=\s*['"]([^'"]+)['"]/);
      return { head, resolved: idMatch ? idMatch[1] : null };
    }
    const str = head.match(/^['"`]([^'"`]*)/);
    return { head, resolved: str ? str[1] : null };
  });
  return { calls: hits.length, results };
}

for (const { toolId, file } of CHECKS) {
  let src;
  try {
    src = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    fail(`${toolId}: không đọc được ${file}`);
    continue;
  }
  const { calls, results } = firstToken(src, toolId);
  if (!calls) {
    fail(
      `${toolId} (${file}): không thấy lời gọi generateToolSlug(...) nào — kiểm lại tool còn đúng cơ chế thanh toán không (đổi cơ chế thì gỡ khỏi CHECKS, đừng để bộ dò im lặng bỏ qua).`
    );
    continue;
  }
  for (const r of results) {
    if (!r.resolved || !r.resolved.startsWith(toolId)) {
      fail(
        `${toolId} (${file}): generateToolSlug(${r.head}…) không bắt đầu bằng "${toolId}" (đọc được: ${JSON.stringify(r.resolved)}) — đường lùi hasRecentToolPayment sẽ chết oan.`
      );
    }
  }
}

// Ngoại lệ CỐ Ý, ghi thành văn để không ai tưởng bỏ sót: slug BÓ của laso
// (public/app-luan-giai.html, biến `_pendingSlug`) KHÔNG có tiền tố "laso-".
// Đổi nó sẽ mồ côi cache `laso_public` VÀ quyền sở hữu của người đã mua
// TRƯỚC bản vá per-part-billing (xem `lasoKey`/CLAUDE.md, cùng họ bẫy) — giữ
// AN TOÀN vì `/api/lasotuvi` không còn dùng `toolPaymentDenied` nữa: nó tự
// kiểm `hasAnySlugAccess` (khớp CHÍNH XÁC cả hai slug), KHÔNG BAO GIỜ đi qua
// đường lùi tiền tố. Slug PHẦN LẺ mới (`_partSlug`, dạng `laso-p<NN>-…`) THÌ
// có tiền tố — đó là dữ liệu MỚI, không có gì cũ phải giữ tương thích.
{
  const file = 'public/app-luan-giai.html';
  let src;
  try {
    src = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    fail(`laso: không đọc được ${file}`);
    src = '';
  }
  if (src && !/function _partSlug\(phan\)\{[\s\S]{0,120}'laso-p'/.test(src)) {
    fail(
      `${file}: không thấy _partSlug(...) tạo slug tiền tố "laso-p" — laso mất tiền tố cho CẢ slug phần lẫn slug bó thì không còn ngoại lệ nào hợp lệ.`
    );
  }
}

// RED-TEAM: đột biến một lời gọi sai tiền tố, xác nhận `firstToken` BẮT được
// trước khi tin kết quả phía trên (CLAUDE.md: "assert đột biến ĐÃ ăn rồi mới
// đọc kết quả").
{
  const fakeGood =
    "const TOOL_ID = 'day-con';\nx = TuviPaywall.generateToolSlug('day-con-' + a + b);";
  const fakeBad =
    "const TOOL_ID = 'day-con';\nx = TuviPaywall.generateToolSlug('sai-tien-to-' + a + b);";
  const fakeParen =
    "const TOOL_ID = 'gio-sinh';\nx = TuviPaywall.generateToolSlug(TOOL_ID+'-'+a+b+(c?'a':'d'));";
  const good = firstToken(fakeGood, 'day-con').results[0];
  const bad_ = firstToken(fakeBad, 'day-con').results[0];
  const paren = firstToken(fakeParen, 'gio-sinh').results[0];
  const ok =
    good.resolved &&
    good.resolved.startsWith('day-con') &&
    bad_.resolved &&
    !bad_.resolved.startsWith('day-con') &&
    paren.resolved === 'gio-sinh';
  if (!ok)
    fail('RED-TEAM THẤT BẠI: bộ so tiền tố không phân biệt được mẫu đúng/sai/có-ngoặc-lồng.');
  else console.log('   ↳ red-team: slug sai tiền tố + ngoặc lồng bên trong đều xử đúng ✓');
}

if (bad === 0) {
  console.log(
    `✅ ${CHECKS.length} tool qua toolPaymentDenied đều có slug đúng tiền tố tool_id; laso giữ ngoại lệ có ghi lý do (không dùng toolPaymentDenied).`
  );
} else {
  console.error(
    `\n${bad} lỗi — slug sai tiền tố làm đường lùi hasRecentToolPayment chết oan (double-charge) hoặc sống sai (lộ chéo sản phẩm con).`
  );
  process.exitCode = 1;
}
