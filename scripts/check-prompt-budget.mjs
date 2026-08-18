#!/usr/bin/env node
// check-prompt-budget.mjs — canh NGÂN SÁCH prompt của 3 shape LÁ SỐ.
//
// 🔴 Vì sao có bộ dò này: đo ngày 2026-08-17 cho thấy 75% toàn bộ luật của 25
// prompt rail là GIỌNG + HÌNH DẠNG, nghiệp vụ tử vi chỉ còn 25%; riêng 3 shape
// lá số gánh 8.304 ký tự luật giọng/hình dạng trên ~11.300. Nguyên nhân không
// phải một lần viết ẩu mà là CỘNG DỒN: mỗi lần thấy model viết chưa ưng lại
// thêm một khối luật nữa, khối mới tự nhận "ĐỨNG TRÊN mọi luật khác", và khối
// cũ vẫn nằm đó. Kết quả: ba bản mô tả bố cục chồng nhau, model chọn bừa một
// bản — tức càng thêm luật thì luật càng mất tác dụng.
//
// Bộ dò chặn đúng chuỗi đó, bằng hai luật kiểm được bằng máy:
//   (1) TRẦN ký tự cho phần LUẬT của từng shape — thêm khối mới thì phải cắt
//       chỗ khác, không được cộng dồn vô hạn.
//   (2) MỘT NGUỒN HÌNH DẠNG — cấm một shape vừa dùng `LUAN_ARC` vừa dùng lại
//       các khối bố cục cũ.
//
// Chạy trên MÃ NGUỒN (bóc template literal), không cần tsc/node_modules.
// Ngưỡng cố ý đặt sát mức hiện tại + biên ~10%: nới ngưỡng là một QUYẾT ĐỊNH
// phải ghi lý do, không phải thao tác dọn đường cho một khối mới.

import { readFileSync } from 'fs';

const FILE = 'lib/agent/prompts.ts';

// Trần phần LUẬT (toàn bộ prompt trừ ctx/docs/persona được nội suy rỗng).
const BUDGET = {
  CHAT_SYSTEM_LASO: 7000,
  CHAT_SYSTEM_GENERAL: 7300,
  CHAT_RICH_RULES: 9700,
};

// Khối mô tả BỐ CỤC. Một shape chỉ được dùng ĐÚNG MỘT bản trong nhóm này.
const SHAPE_BLOCKS = ['LUAN_ARC', 'RAIL_CHAT_RULES', 'RAIL_LASO_SHAPE', 'RAIL_SHAPE_AND_VOICE'];

// ── Bóc `const NAME = \`...\`` với backtick CÂN BẰNG (bỏ qua ${...} lồng) ──
function grabBlocks(src) {
  const out = {};
  const re = /(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*(?:=\s*(?:\([^)]*\)\s*=>\s*)?)`/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    let i = re.lastIndex;
    let depth = 0;
    let buf = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        buf += src[i] + src[i + 1];
        i += 2;
        continue;
      }
      if (c === '$' && src[i + 1] === '{') {
        depth++;
        buf += '${';
        i += 2;
        continue;
      }
      if (c === '}' && depth > 0) {
        depth--;
        buf += '}';
        i++;
        continue;
      }
      if (c === '`' && depth === 0) break;
      buf += c;
      i++;
    }
    out[name] = buf;
  }
  return out;
}

function resolve(raw, s, seen = new Set()) {
  return s.replace(/\$\{([^{}]*)\}/g, (_full, expr) => {
    const e = expr.trim();
    if (/^[A-Z_][A-Z0-9_]*$/.test(e)) {
      // FORMAT_RULE là chuỗi thường (không template) → tính bằng độ dài thật.
      if (e === 'FORMAT_RULE') return 'X'.repeat(700);
      return raw[e] && !seen.has(e) ? resolve(raw, raw[e], new Set([...seen, e])) : '';
    }
    if (/^_TIME\(\)$/.test(e)) return 'X'.repeat(60);
    if (/todayVN/.test(e)) return 'XXXXXXXXXX';
    return ''; // ctx / docs / persona — dữ liệu, không phải luật
  });
}

// Khối nào được nội suy TRỰC TIẾP trong thân một prompt (không đệ quy).
function directRefs(body) {
  return [...body.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g)].map((m) => m[1]);
}

const src = readFileSync(FILE, 'utf8');
const raw = grabBlocks(src);
const errors = [];

// Bộ dò đọc hụt thì phải DỪNG HẲN, đừng báo xanh trên danh sách rỗng.
for (const name of Object.keys(BUDGET)) {
  if (!raw[name]) {
    console.error(
      `✗ Không bóc được \`${name}\` trong ${FILE}.\n` +
        `  Prompt đổi tên hay đổi cách khai? Sửa bộ dò cho khớp — đừng bỏ qua.`
    );
    process.exit(1);
  }
}

// ── Luật 1: trần ký tự phần LUẬT ─────────────────────────────────
console.log('── Ngân sách phần LUẬT (chưa tính dữ liệu lá số / RAG) ──');
for (const [name, cap] of Object.entries(BUDGET)) {
  const len = resolve(raw, raw[name]).length;
  const pct = Math.round((len / cap) * 100);
  console.log(`  ${name.padEnd(22)} ${String(len).padStart(6)} / ${cap} ký tự  (${pct}%)`);
  if (len > cap) {
    errors.push(
      `${name}: phần luật ${len} ký tự, vượt trần ${cap}.\n` +
        `  → CẮT chỗ khác trước khi thêm khối mới. Prompt phình lên là mọi luật trong đó\n` +
        `    loãng đi — đó là lý do bộ dò này tồn tại, không phải một con số cho đẹp.`
    );
  }
}

// ── Luật 2: một shape = một nguồn hình dạng ──────────────────────
console.log('\n── Một nguồn hình dạng cho mỗi shape ──');
for (const name of Object.keys(BUDGET)) {
  const used = directRefs(raw[name]).filter((r) => SHAPE_BLOCKS.includes(r));
  const uniq = [...new Set(used)];
  console.log(`  ${name.padEnd(22)} ${uniq.length ? uniq.join(' + ') : '(không có)'}`);
  if (uniq.length > 1) {
    errors.push(
      `${name} nội suy ${uniq.length} khối bố cục cùng lúc: ${uniq.join(' + ')}.\n` +
        `  → Hai bản mô tả bố cục chồng nhau thì model chọn bừa một bản. Giữ ĐÚNG MỘT.`
    );
  }
  if (uniq.length === 0) {
    errors.push(
      `${name} không nội suy khối bố cục nào (${SHAPE_BLOCKS.join(' / ')}).\n` +
        `  → Thiếu luật hình dạng thì câu trả lời chạy thẳng tới trần token.`
    );
  }
}

if (errors.length) {
  console.error('\n✗ check:prompt — ' + errors.length + ' lỗi:\n');
  for (const e of errors) console.error('  • ' + e + '\n');
  process.exit(1);
}
console.log('\n✓ check:prompt — ngân sách prompt lá số đạt.');
