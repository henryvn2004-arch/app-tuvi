#!/usr/bin/env node
/**
 * Canh thư viện hình minh hoạ (`lib/media/illus-prompt.ts` +
 * `public/tools-shared/illus-match.js` + `illus-nguong.js`).
 *
 * Vì sao cần: BỐN nguồn phải khớp nhau tuyệt đối mà không có gì BẮT LỖI được
 * bằng typecheck (đều là chuỗi/khoá đối tượng) — lệch một khoá là một phần
 * luận giải im lặng KHÔNG hiện ảnh (illusUrlForPhan trả null, đúng thiết kế
 * "thiếu tag thì đừng đoán", nhưng nếu do LỖI GÕ thì không ai biết mà sửa):
 *   1. `KHIA_CANH` (illus-prompt.ts)      — 13 khía cạnh, đúng 3 sắc + 3 bối cảnh
 *   2. `CUNG_BY_PHAN` (luan-giai-doc.ts)  — PHẦN 2-13 → tên cung (prompt LLM đọc)
 *   3. `PHAN_TO_KHIA`/`KHIA_TO_CUNG` (illus-match.js) — PHẦN → khía → cung
 *   4. `ILLUS_NGUONG` (illus-nguong.js)   — ngưỡng SINH cho đúng bộ cung đó
 *
 * Fail khi: thiếu khía/sắc/bối cảnh, mô-típ quá ngắn, hoặc BỐN bảng trên
 * không cùng phủ một bộ 12 cung + 1 tổng quan như nhau.
 *
 * Chạy: node scripts/check-illus.mjs
 */
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

/** Trích MỘT khai báo `export const NAME ... = <literal>;` bằng Function —
 * cùng kỹ thuật `check-que-motifs.mjs` đã dùng: các bảng này là DỮ LIỆU thuần,
 * không có logic, nên không cần `tsc`. Khai báo lệch bố cục → DỪNG HẲN, không
 * đọc ra bảng rỗng rồi báo xanh (bộ dò câm nguy hiểm hơn bộ dò đỏ). */
function extractConst(file, name) {
  const src = readFileSync(file, 'utf8');
  const re = new RegExp(`export const ${name}\\b[^=]*=`);
  const m = src.match(re);
  if (!m) {
    console.error(`❌ check-illus: không tìm thấy \`export const ${name} … =\` trong\n   ${file}`);
    process.exit(1);
  }
  const rest = src.slice(m.index + m[0].length);
  // Cắt tới dấu `;` đứng một mình ở cột đầu tiên SAU literal — literal ở các
  // file này luôn kết bằng `};` hoặc kết thúc chuỗi template, nên cắt tới hết
  // câu lệnh bằng cách đếm ngoặc là chắc ăn nhất.
  let depth = 0,
    end = -1,
    inStr = null;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ';' && depth <= 0) {
      end = i;
      break;
    }
  }
  if (end < 0) {
    console.error(`❌ check-illus: không đóng được literal của \`${name}\` trong ${file}`);
    process.exit(1);
  }
  return new Function('return (' + rest.slice(0, end) + ')')();
}

// ── 1. lib/agent/luan-giai-doc.ts: CUNG_BY_PHAN (PHẦN 2-13 → cung) ──────────
const CUNG_BY_PHAN = extractConst(ROOT + 'lib/agent/luan-giai-doc.ts', 'CUNG_BY_PHAN');
const CUNG_SET = new Set(Object.values(CUNG_BY_PHAN));
if (CUNG_SET.size !== 12) fail(`CUNG_BY_PHAN có ${CUNG_SET.size} cung, phải đúng 12`);

// ── 2. lib/media/illus-prompt.ts: KHIA_CANH ─────────────────────────────────
const KHIA_CANH = extractConst(ROOT + 'lib/media/illus-prompt.ts', 'KHIA_CANH');
const KHIA_KEYS = Object.keys(KHIA_CANH);
if (KHIA_KEYS.length !== 13)
  fail(`KHIA_CANH có ${KHIA_KEYS.length} khoá, phải đúng 13 (12 cung + tổng quan)`);
const SAC3 = ['tot', 'trung', 'xau'];
for (const [k, v] of Object.entries(KHIA_CANH)) {
  if (!v || typeof v !== 'object') {
    fail(`${k}: không phải object`);
    continue;
  }
  if (!v.vi) fail(`${k}: thiếu nhãn tiếng Việt (vi)`);
  if (!v.canh || typeof v.canh !== 'object') {
    fail(`${k}: thiếu \`canh\` (phải có object 3 khoá tot/trung/xau)`);
  } else {
    for (const s of SAC3) {
      const c = v.canh[s];
      if (typeof c !== 'string' || c.trim().length < 20)
        fail(`${k}.canh.${s}: quá ngắn hoặc thiếu — "${c}"`);
    }
    const extra = Object.keys(v.canh).filter((s) => !SAC3.includes(s));
    if (extra.length) fail(`${k}.canh: có khoá lạ ngoài tot/trung/xau: ${extra.join(', ')}`);
  }
  if (!Array.isArray(v.boiCanh) || v.boiCanh.length !== 3) {
    fail(
      `${k}.boiCanh: phải đúng mảng 3 phần tử, đang có ${Array.isArray(v.boiCanh) ? v.boiCanh.length : 'không phải mảng'}`
    );
  } else {
    v.boiCanh.forEach((b, i) => {
      if (typeof b !== 'string' || b.trim().length < 20)
        fail(`${k}.boiCanh[${i}]: quá ngắn hoặc thiếu — "${b}"`);
    });
  }
}

// ── 3. public/tools-shared/illus-match.js: PHAN_TO_KHIA / KHIA_TO_CUNG / VARIANT_COUNT ──
const matchSrc = readFileSync(ROOT + 'public/tools-shared/illus-match.js', 'utf8');
function extractVar(src, name) {
  const re = new RegExp(`var ${name}\\s*=\\s*`);
  const m = src.match(re);
  if (!m) return null;
  const rest = src.slice(m.index + m[0].length);
  const end = rest.indexOf('};');
  if (end < 0) return null;
  return new Function('return (' + rest.slice(0, end + 1) + ')')();
}
const PHAN_TO_KHIA = extractVar(matchSrc, 'PHAN_TO_KHIA');
const KHIA_TO_CUNG = extractVar(matchSrc, 'KHIA_TO_CUNG');
const VARIANT_COUNT = extractVar(matchSrc, 'VARIANT_COUNT');
if (!PHAN_TO_KHIA || !KHIA_TO_CUNG || !VARIANT_COUNT) {
  console.error(
    '❌ check-illus: không đọc được PHAN_TO_KHIA/KHIA_TO_CUNG/VARIANT_COUNT từ illus-match.js — bố cục đổi?'
  );
  process.exit(1);
}

// PHAN_TO_KHIA (2..13) → KHIA_TO_CUNG phải khớp CHÍNH XÁC CUNG_BY_PHAN (2..13)
// của prompt LLM — đây là chỗ lệch nguy hiểm nhất: ảnh và chữ nói về hai cung
// khác nhau mà không ai biết cho tới khi có người soát bằng mắt.
for (let phan = 2; phan <= 13; phan++) {
  const cungThat = CUNG_BY_PHAN[phan];
  const khia = PHAN_TO_KHIA[phan];
  const cungAnh = khia && KHIA_TO_CUNG[khia];
  if (!cungThat) {
    fail(`CUNG_BY_PHAN thiếu phần ${phan}`);
    continue;
  }
  if (!khia) fail(`PHAN_TO_KHIA thiếu phần ${phan} (LLM viết về "${cungThat}" nhưng ảnh không có)`);
  else if (!KHIA_CANH[khia]) fail(`PHAN_TO_KHIA[${phan}]="${khia}" không tồn tại trong KHIA_CANH`);
  else if (cungAnh !== cungThat)
    fail(
      `phần ${phan}: LLM luận về "${cungThat}" nhưng ảnh khớp theo "${cungAnh}" (KHIA_TO_CUNG[${khia}]) — lệch cung`
    );
}
if (PHAN_TO_KHIA[1] !== 'tong-quan')
  fail(`PHAN_TO_KHIA[1] phải là "tong-quan", đang là "${PHAN_TO_KHIA[1]}"`);

// KHIA_KEYS (illus-prompt.ts) và VARIANT_COUNT (illus-match.js) phải là ĐÚNG
// MỘT bộ khoá — thiếu một bên là gen xong 78 ảnh mà chọn ảnh không thấy, hoặc
// khai biến thể cho khía không tồn tại.
const vcKeys = Object.keys(VARIANT_COUNT).sort();
const khiaKeysSorted = [...KHIA_KEYS].sort();
if (JSON.stringify(vcKeys) !== JSON.stringify(khiaKeysSorted)) {
  fail(
    `VARIANT_COUNT (illus-match.js) và KHIA_CANH (illus-prompt.ts) lệch bộ khoá:\n   chỉ ở VARIANT_COUNT: ${vcKeys.filter((k) => !KHIA_CANH[k]).join(', ') || '(không)'}\n   chỉ ở KHIA_CANH: ${khiaKeysSorted.filter((k) => !VARIANT_COUNT[k]).join(', ') || '(không)'}`
  );
}

// ── 4. public/tools-shared/illus-nguong.js: ILLUS_NGUONG phải phủ ĐÚNG 12 cung ──
const nguongSrc = readFileSync(ROOT + 'public/tools-shared/illus-nguong.js', 'utf8');
const nguongMatch = nguongSrc.match(/var ILLUS_NGUONG\s*=\s*/);
if (!nguongMatch) {
  console.error(
    '❌ check-illus: không đọc được ILLUS_NGUONG từ illus-nguong.js — chạy lại `gen-illus-nguong.mjs --write`?'
  );
  process.exit(1);
}
{
  const rest = nguongSrc.slice(nguongMatch.index + nguongMatch[0].length);
  const end = rest.indexOf('};');
  const ILLUS_NGUONG = new Function('return (' + rest.slice(0, end + 1) + ')')();
  const nguongCungs = new Set(Object.keys(ILLUS_NGUONG));
  const cungTuKhia = new Set(Object.values(KHIA_TO_CUNG));
  for (const c of cungTuKhia)
    if (!nguongCungs.has(c))
      fail(`ILLUS_NGUONG thiếu ngưỡng cho cung "${c}" (KHIA_TO_CUNG có tham chiếu tới)`);
  for (const c of nguongCungs)
    if (!cungTuKhia.has(c))
      fail(`ILLUS_NGUONG có ngưỡng thừa cho cung "${c}" — không khía nào trỏ tới, có drift?`);
  for (const [c, th] of Object.entries(ILLUS_NGUONG)) {
    if (typeof th.t33 !== 'number' || typeof th.t67 !== 'number' || th.t33 >= th.t67)
      fail(`ILLUS_NGUONG["${c}"]: ngưỡng hỏng (t33=${th.t33}, t67=${th.t67}) — phải t33 < t67`);
  }
}

if (bad === 0) {
  console.log(
    `✅ ${KHIA_KEYS.length} khía cạnh · ${KHIA_KEYS.length * 3} sắc thái · PHẦN↔khía↔cung↔ngưỡng khớp nhau tuyệt đối.`
  );
} else {
  console.error(`\n${bad} lỗi trong thư viện hình minh hoạ — sửa trước khi gen/deploy.`);
  process.exitCode = 1;
}
