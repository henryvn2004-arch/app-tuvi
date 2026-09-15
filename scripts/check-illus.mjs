#!/usr/bin/env node
/**
 * Canh thư viện hình minh hoạ (`lib/media/illus-prompt.ts` +
 * `public/tools-shared/illus-match.js` + `illus-nguong.js`).
 *
 * Vì sao cần: NĂM nguồn phải khớp nhau tuyệt đối mà không có gì BẮT LỖI được
 * bằng typecheck (đều là chuỗi/khoá đối tượng) — lệch một khoá là một phần
 * luận giải im lặng KHÔNG hiện ảnh (illusUrlForPhan trả null, đúng thiết kế
 * "thiếu tag thì đừng đoán", nhưng nếu do LỖI GÕ thì không ai biết mà sửa):
 *   1. `KHIA_CANH` (illus-prompt.ts)      — 13 khía cạnh, đúng 3 sắc + 3 bối cảnh
 *   2. `CUNG_BY_PHAN` (luan-giai-doc.ts)  — PHẦN 2-13 → tên cung (prompt LLM đọc)
 *   3. `PHAN_TO_KHIA`/`KHIA_TO_CUNG` (illus-match.js) — PHẦN → khía → cung
 *   4. `ILLUS_NGUONG` (illus-nguong.js)   — ngưỡng SINH cho đúng bộ cung đó
 *   5. `DAIVAN_FLAG_SAC`/`TUOI_MOC` (illus-match.js) — đại vận (Chu Trình
 *      Cuộc Đời): flag 🟢/🟡/🔴 → sắc thái phải toàn ánh, mốc tuổi phải phủ
 *      đúng 5 bậc `Tuoi` mà illus-prompt.ts khai — không có "ngưỡng" ở đây
 *      (sắc thái đọc thẳng flag đã hiển thị sẵn cho người dùng), nên chỉ
 *      canh nội tại, không canh chéo nguồn khác như mục 1-4.
 *
 * Fail khi: thiếu khía/sắc/bối cảnh, mô-típ quá ngắn, hoặc các bảng trên
 * không cùng phủ một bộ 12 cung + 1 tổng quan + 5 bậc tuổi như nhau.
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
  // canhTot2/boiCanhTot2 (bối cảnh phú quý riêng cho tốt+v2) — nếu khai một
  // trong hai thì PHẢI khai đủ cả hai (buildIllusPrompt đọc cả cặp cùng lúc,
  // thiếu một bên là rơi im lặng về boiCanh[1] cũ mà không ai biết).
  const coTot2 = 'canhTot2' in v || 'boiCanhTot2' in v;
  if (coTot2) {
    if (typeof v.canhTot2 !== 'string' || v.canhTot2.trim().length < 20)
      fail(`${k}.canhTot2: quá ngắn hoặc thiếu — "${v.canhTot2}"`);
    if (typeof v.boiCanhTot2 !== 'string' || v.boiCanhTot2.trim().length < 20)
      fail(`${k}.boiCanhTot2: quá ngắn hoặc thiếu — "${v.boiCanhTot2}"`);
  } else {
    fail(`${k}: thiếu canhTot2/boiCanhTot2 (mọi khía phải có bộ v2 phú quý cho sắc "tốt")`);
  }
  // trungNien (2026-09-15) — 12 khía ngoài tổng-quan PHẢI có (bối cảnh riêng
  // cho tuổi 40-60, xem KhiaCanh.trungNien); tổng-quan CỐ Ý KHÔNG có, đã phủ
  // đủ 5 bậc tuổi từ trước bằng cảnh chung (PR #826) — khai thêm ở đây là hai
  // nguồn giẫm nhau, illusUrlForPhan (illus-match.js) chỉ đọc một trong hai.
  if (k === 'tong-quan') {
    if (v.trungNien) fail(`tong-quan: KHÔNG được khai trungNien (đã phủ đủ 5 bậc bằng cảnh chung)`);
  } else if (!v.trungNien || typeof v.trungNien !== 'object') {
    fail(`${k}: thiếu trungNien (12 khía ngoài tổng-quan phải có bối cảnh riêng cho trung-niên)`);
  } else {
    const tn = v.trungNien;
    if (!tn.canh || typeof tn.canh !== 'object') {
      fail(`${k}.trungNien: thiếu \`canh\` (phải có object 3 khoá tot/trung/xau)`);
    } else {
      for (const s of SAC3) {
        const c = tn.canh[s];
        if (typeof c !== 'string' || c.trim().length < 20)
          fail(`${k}.trungNien.canh.${s}: quá ngắn hoặc thiếu — "${c}"`);
      }
    }
    if (!tn.boiCanh || typeof tn.boiCanh !== 'object') {
      fail(
        `${k}.trungNien: thiếu \`boiCanh\` (phải có object 3 khoá tot/trung/xau, KHÔNG phải mảng)`
      );
    } else {
      for (const s of SAC3) {
        const b = tn.boiCanh[s];
        if (typeof b !== 'string' || b.trim().length < 20)
          fail(`${k}.trungNien.boiCanh.${s}: quá ngắn hoặc thiếu — "${b}"`);
      }
    }
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
const TRUNG_NIEN_VARIANT_COUNT = extractVar(matchSrc, 'TRUNG_NIEN_VARIANT_COUNT');
if (!PHAN_TO_KHIA || !KHIA_TO_CUNG || !VARIANT_COUNT || !TRUNG_NIEN_VARIANT_COUNT) {
  console.error(
    '❌ check-illus: không đọc được PHAN_TO_KHIA/KHIA_TO_CUNG/VARIANT_COUNT/TRUNG_NIEN_VARIANT_COUNT từ illus-match.js — bố cục đổi?'
  );
  process.exit(1);
}

// TRUNG_NIEN_VARIANT_COUNT (illus-match.js) phải đúng bộ khoá với "khía có
// khai trungNien" (illus-prompt.ts) — trừ tong-quan (xem lý do ở mục 2).
// Lệch là chọn nhầm số biến thể: đọc `VARIANT_COUNT` mặc định (2) cho khía
// chỉ mới vẽ 1 tấm trung-niên ⇒ 50% lượt trỏ vào ảnh chưa tồn tại.
{
  const tnKeysExpected = KHIA_KEYS.filter((k) => k !== 'tong-quan').sort();
  const tnKeysActual = Object.keys(TRUNG_NIEN_VARIANT_COUNT).sort();
  if (JSON.stringify(tnKeysExpected) !== JSON.stringify(tnKeysActual)) {
    fail(
      `TRUNG_NIEN_VARIANT_COUNT (illus-match.js) và KHIA_CANH.trungNien (illus-prompt.ts) lệch bộ khoá:\n   chỉ ở TRUNG_NIEN_VARIANT_COUNT: ${tnKeysActual.filter((k) => !tnKeysExpected.includes(k)).join(', ') || '(không)'}\n   chỉ ở KHIA_CANH.trungNien: ${tnKeysExpected.filter((k) => !tnKeysActual.includes(k)).join(', ') || '(không)'}`
    );
  }
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

// ── 5. Đại Vận (Chu Trình Cuộc Đời): DAIVAN_FLAG_SAC + TUOI_MOC trong illus-match.js ──
// Khác cung (ngưỡng SINH từ dữ liệu), đại vận đọc THẲNG flag 🟢/🟡/🔴 đã hiển
// thị sẵn cho người dùng (luan-giai-core.js) — không có "ngưỡng" để canh chéo
// nguồn, nên bộ dò ở đây chỉ canh NỘI TẠI: ánh xạ phải toàn ánh (mọi flag có
// sắc, không sắc nào bỏ trống/trùng) và mốc tuổi phải tăng dần + phủ đủ 5 bậc
// Tuoi mà illus-prompt.ts khai (đọc thẳng type union, không gõ tay lại danh
// sách — gõ tay là drift ngay khi illus-prompt.ts thêm/bớt một bậc tuổi).
const flagMap = extractVar(matchSrc, 'DAIVAN_FLAG_SAC');
const tuoiMocRaw = matchSrc.match(/var TUOI_MOC\s*=\s*(\[[\s\S]*?\]);/);
if (!flagMap || !tuoiMocRaw) {
  console.error(
    '❌ check-illus: không đọc được DAIVAN_FLAG_SAC/TUOI_MOC từ illus-match.js — bố cục đổi?'
  );
  process.exit(1);
}
const TUOI_MOC = new Function('return ' + tuoiMocRaw[1])();
const promptSrc = readFileSync(ROOT + 'lib/media/illus-prompt.ts', 'utf8');
const tuoiTypeMatch = promptSrc.match(/export type Tuoi\s*=\s*([^;]+);/);
if (!tuoiTypeMatch) {
  console.error(
    '❌ check-illus: không đọc được `export type Tuoi = …` từ illus-prompt.ts — bố cục đổi?'
  );
  process.exit(1);
}
const TUOI_5_BAC = tuoiTypeMatch[1]
  .split('|')
  .map((s) => s.trim().replace(/^'|'$/g, ''))
  .filter(Boolean);

const FLAGS_3 = ['🟢', '🟡', '🔴'];
for (const f of FLAGS_3)
  if (!SAC3.includes(flagMap[f]))
    fail(`DAIVAN_FLAG_SAC["${f}"]="${flagMap[f]}" không phải tot/trung/xau hợp lệ`);
const flagKeys = Object.keys(flagMap);
if (flagKeys.length !== 3 || FLAGS_3.some((f) => !flagKeys.includes(f)))
  fail(`DAIVAN_FLAG_SAC phải đúng 3 khoá 🟢/🟡/🔴, đang có: ${flagKeys.join(', ')}`);
const sacTuFlag = new Set(Object.values(flagMap));
if (sacTuFlag.size !== 3)
  fail(
    `DAIVAN_FLAG_SAC ánh xạ TRÙNG sắc thái — mất khả năng phân biệt (3 flag phải ra 3 sắc khác nhau)`
  );

if (!Array.isArray(TUOI_MOC) || TUOI_MOC.length !== TUOI_5_BAC.length) {
  fail(
    `TUOI_MOC có ${Array.isArray(TUOI_MOC) ? TUOI_MOC.length : '?'} mốc, illus-prompt.ts khai ${TUOI_5_BAC.length} bậc Tuoi (${TUOI_5_BAC.join(', ')})`
  );
} else {
  let prevMoc = -Infinity;
  const tuoiTrongMoc = new Set();
  for (const [moc, tuoi] of TUOI_MOC) {
    if (typeof moc !== 'number') fail(`TUOI_MOC: mốc "${moc}" không phải số`);
    else if (moc <= prevMoc) fail(`TUOI_MOC không tăng dần nghiêm ngặt tại mốc ${moc}`);
    prevMoc = moc;
    if (!TUOI_5_BAC.includes(tuoi))
      fail(`TUOI_MOC nhắc tới bậc tuổi "${tuoi}" không có trong illus-prompt.ts Tuoi`);
    tuoiTrongMoc.add(tuoi);
  }
  for (const t of TUOI_5_BAC)
    if (!tuoiTrongMoc.has(t)) fail(`TUOI_MOC thiếu bậc tuổi "${t}" (illus-prompt.ts có khai)`);
  if (TUOI_MOC[TUOI_MOC.length - 1][0] !== Infinity)
    fail(`TUOI_MOC phải kết thúc bằng mốc Infinity (bậc tuổi già nhất phải hứng MỌI tuổi còn lại)`);
}

// ── 6. Vận Hạn 12 Tháng: THANG_CANH trong illus-prompt.ts ───────────────────
// Khác cung/đại vận, tháng KHÔNG có trục sắc thái (van-han-12.ts từ chối chấm
// điểm cho một tháng) — `illusUrlForThang` (illus-match.js) DỰNG khoá bằng
// công thức 'thang-'+pad(thangAL,2) chứ không tra bảng, nên chỉ cần canh đủ
// ĐÚNG 12 khoá 'thang-01'..'thang-12' là mọi thangAL 1-12 chắc chắn khớp.
const THANG_CANH = extractConst(ROOT + 'lib/media/illus-prompt.ts', 'THANG_CANH');
const THANG_KEYS = Object.keys(THANG_CANH).sort();
const THANG_EXPECTED = Array.from(
  { length: 12 },
  (_, i) => `thang-${String(i + 1).padStart(2, '0')}`
);
if (JSON.stringify(THANG_KEYS) !== JSON.stringify(THANG_EXPECTED)) {
  fail(`THANG_CANH phải đúng 12 khoá thang-01..thang-12, đang có: ${THANG_KEYS.join(', ')}`);
}
for (const [k, v] of Object.entries(THANG_CANH)) {
  if (!v || typeof v !== 'object') {
    fail(`${k}: không phải object`);
    continue;
  }
  if (!v.vi) fail(`${k}: thiếu nhãn tiếng Việt (vi)`);
  if (typeof v.canh !== 'string' || v.canh.trim().length < 20)
    fail(`${k}.canh: quá ngắn hoặc thiếu`);
  if (!Array.isArray(v.boiCanh) || v.boiCanh.length !== 3) {
    fail(
      `${k}.boiCanh: phải đúng mảng 3 phần tử, đang có ${Array.isArray(v.boiCanh) ? v.boiCanh.length : 'không phải mảng'}`
    );
  } else {
    v.boiCanh.forEach((b, i) => {
      if (typeof b !== 'string' || b.trim().length < 20)
        fail(`${k}.boiCanh[${i}]: quá ngắn hoặc thiếu`);
    });
  }
}

// ── 7. Xem Tuổi (vợ chồng/làm ăn): XEM_TUOI_CANH trong illus-prompt.ts ──────
// Bảng RIÊNG, tách khỏi KHIA_CANH (tool luận về HAI người, không phải một
// cung của một lá số — xem chú thích tại định nghĩa). Không đối chiếu chéo
// với CUNG_BY_PHAN/VARIANT_COUNT/ILLUS_NGUONG (không áp dụng), và không bắt
// buộc canhTot2/boiCanhTot2 (chưa có bối cảnh phú quý riêng cho khía này) —
// chỉ soát nội tại: đủ nhãn, đủ 3 sắc, đủ 3 bối cảnh, đủ dài.
const XEM_TUOI_CANH = extractConst(ROOT + 'lib/media/illus-prompt.ts', 'XEM_TUOI_CANH');
const XT_KEYS = Object.keys(XEM_TUOI_CANH);
for (const [k, v] of Object.entries(XEM_TUOI_CANH)) {
  if (!v || typeof v !== 'object') {
    fail(`XEM_TUOI_CANH.${k}: không phải object`);
    continue;
  }
  if (!v.vi) fail(`XEM_TUOI_CANH.${k}: thiếu nhãn tiếng Việt (vi)`);
  if (!v.canh || typeof v.canh !== 'object') {
    fail(`XEM_TUOI_CANH.${k}: thiếu \`canh\` (phải có object 3 khoá tot/trung/xau)`);
  } else {
    for (const s of SAC3) {
      const c = v.canh[s];
      if (typeof c !== 'string' || c.trim().length < 20)
        fail(`XEM_TUOI_CANH.${k}.canh.${s}: quá ngắn hoặc thiếu — "${c}"`);
    }
    const extra = Object.keys(v.canh).filter((s) => !SAC3.includes(s));
    if (extra.length)
      fail(`XEM_TUOI_CANH.${k}.canh: có khoá lạ ngoài tot/trung/xau: ${extra.join(', ')}`);
  }
  if (!Array.isArray(v.boiCanh) || v.boiCanh.length !== 3) {
    fail(
      `XEM_TUOI_CANH.${k}.boiCanh: phải đúng mảng 3 phần tử, đang có ${Array.isArray(v.boiCanh) ? v.boiCanh.length : 'không phải mảng'}`
    );
  } else {
    v.boiCanh.forEach((b, i) => {
      if (typeof b !== 'string' || b.trim().length < 20)
        fail(`XEM_TUOI_CANH.${k}.boiCanh[${i}]: quá ngắn hoặc thiếu — "${b}"`);
    });
  }
}

if (bad === 0) {
  console.log(
    `✅ ${KHIA_KEYS.length} khía cạnh · ${KHIA_KEYS.length * 3} sắc thái · PHẦN↔khía↔cung↔ngưỡng khớp nhau tuyệt đối · đại vận: 3 flag → 3 sắc, ${TUOI_5_BAC.length} bậc tuổi phủ đủ · 12 tháng âm lịch đủ khoá · ${KHIA_KEYS.length} khía đủ bộ v2 phú quý (tốt) · Xem Tuổi: ${XT_KEYS.length} khía riêng đủ 3 sắc.`
  );
} else {
  console.error(`\n${bad} lỗi trong thư viện hình minh hoạ — sửa trước khi gen/deploy.`);
  process.exitCode = 1;
}
