#!/usr/bin/env node
/**
 * Chặn tái phát: usage của Gemini phải đẩy ra ĐÚNG MỘT LẦN cho MỘT lời gọi API.
 *
 * Vì sao có bộ dò này: `lib/agent/providers/gemini.ts` đọc SSE trong một vòng
 * lặp, và bản đầu gọi thẳng `onUsage(u)` NGAY TRONG thân vòng — dựa trên chú
 * thích ghi rằng "Gemini gửi `usageMetadata` trong CHUNK CUỐI". Giả định đó
 * SAI: Gemini gửi `usageMetadata` ở MỌI chunk, số CỘNG DỒN từ đầu stream. Bộ
 * đếm bên `lib/agent/run.ts` (`meterGemini`) lại `+=` mỗi lần được gọi ⇒ một
 * lượt rail bị ghi sổ gấp đúng SỐ CHUNK lần.
 *
 * Nó hỏng IM LẶNG và hỏng theo hướng nguy nhất — không ai thấy lỗi, chỉ thấy
 * một con số. Đo trên prod 30 ngày: gemini-3.8-flash ghi trung bình 238.102
 * input token/lượt trong khi nhánh Anthropic (gán `=`, không dính) ghi 4.418
 * cho CÙNG rail, CÙNG system prompt ⇒ thổi phồng ~54×. Dấu vân tay: tương quan
 * giữa input token và ĐỘ DÀI OUTPUT lên tới 0,892 — số token của prompt không
 * thể phụ thuộc vào độ dài câu trả lời. Hệ quả: `cost_vnd` sai, bảng biên lợi
 * nhuận sai, và kết luận "rail chat lỗ 1,7× doanh thu" là ẢO.
 *
 * ⚠️ Đừng "sửa" bằng cách đổi `+=` thành `=` ở run.ts — `+=` là ĐÚNG khi cộng
 * qua NHIỀU round tool-use (mỗi round một lời gọi API thật). Chỗ sai là TẦN
 * SUẤT gọi, không phải phép cộng.
 *
 * Cùng tinh thần `check-shell-share.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'lib', 'agent', 'providers', 'gemini.ts');
const raw = fs.readFileSync(FILE, 'utf-8');

/**
 * Xoá phần CHÚ THÍCH, giữ nguyên SỐ DÒNG (thay bằng khoảng trắng).
 * 🔑 Thiếu bước này là dò kêu oan ngay: chính đoạn chú thích giải thích lỗi
 * có chứa chuỗi `onUsage(u)`, và "bộ dò kêu oan là bộ dò bị tắt đi".
 */
function stripComments(s) {
  let out = '';
  let i = 0;
  let mode = 'code'; // code | line | block
  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') {
        mode = 'line';
        out += '  ';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        mode = 'block';
        out += '  ';
        i += 2;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') {
        mode = 'code';
        out += '\n';
        i++;
        continue;
      }
      out += ' ';
      i++;
      continue;
    }
    // block
    if (c === '*' && d === '/') {
      mode = 'code';
      out += '  ';
      i += 2;
      continue;
    }
    out += c === '\n' ? '\n' : ' ';
    i++;
  }
  return out;
}

const src = stripComments(raw);
const lines = src.split('\n');
const problems = [];

// 1. Cửa DUY NHẤT được phép gọi `onUsage(...)` là `emitUsageOnce`.
const gateStart = lines.findIndex((l) => /function emitUsageOnce\s*\(/.test(l));
if (gateStart < 0) {
  problems.push('không còn hàm `emitUsageOnce` — đây là cửa duy nhất được phép gọi `onUsage`');
}
// Thân hàm cửa: từ dòng khai tới dấu `}` ở cột 0 đầu tiên sau đó.
let gateEnd = gateStart;
while (gateEnd < lines.length && !/^\}/.test(lines[gateEnd])) gateEnd++;

lines.forEach((line, i) => {
  if (!/\bonUsage\s*\(/.test(line)) return;
  if (gateStart >= 0 && i >= gateStart && i <= gateEnd) return; // trong cửa — hợp lệ
  problems.push(
    `lib/agent/providers/gemini.ts:${i + 1} — gọi thẳng \`onUsage(...)\` ngoài \`emitUsageOnce\`. ` +
      'Trong vòng đọc SSE thì mỗi chunk bắn một lần ⇒ token bị nhân lên.'
  );
});

// 2. Mỗi hàm stream phải đẩy usage đúng một lần ⇒ `emitUsageOnce(` được GỌI
//    đúng bằng số hàm stream có tham số `onUsage`.
const streamFns = (src.match(/^\s*onUsage\?:\s*\(u: GeminiUsage\)/gm) || []).length;
const emitCalls = (src.match(/^\s*emitUsageOnce\(/gm) || []).length;
if (streamFns > 0 && emitCalls !== streamFns) {
  problems.push(
    `có ${streamFns} hàm stream nhận \`onUsage\` nhưng ${emitCalls} lời gọi \`emitUsageOnce(...)\` — ` +
      'phải khớp 1-1, nếu không có hàm ghi sổ thiếu (hoặc thừa).'
  );
}

// 3. Bản ghi nhận phải là "giữ bản mới nhất", không cộng dồn trong vòng lặp.
if (/lastUsage\s*\+=/.test(src)) {
  problems.push(
    'thấy `lastUsage +=` — trong MỘT lời gọi API, `usageMetadata` đã là số CỘNG DỒN, ' +
      'chỉ được GÁN bản mới nhất (`lastUsage = u`).'
  );
}

if (problems.length) {
  console.error('✗ Ghi sổ token Gemini có nguy cơ nhân lên theo số chunk:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nGemini gửi `usageMetadata` ở MỌI chunk với số CỘNG DỒN. Chỉ giữ bản MỚI NHẤT trong\n' +
      'vòng lặp (`lastUsage = u`) rồi gọi `emitUsageOnce(lastUsage, onUsage)` MỘT lần sau khi\n' +
      'hết stream. `+=` ở `run.ts` là để cộng qua các ROUND tool-use — đúng, đừng đụng vào.'
  );
  process.exit(1);
}
console.log('✓ Gemini đẩy usage đúng một lần mỗi lời gọi API — sổ token không bị nhân theo chunk');
