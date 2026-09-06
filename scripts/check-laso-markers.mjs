#!/usr/bin/env node
// scripts/check-laso-markers.mjs
// ============================================================
// Canh HỢP ĐỒNG giữa `formatLaSoV2()` (public/tuvi-laso-format.js — thứ dựng
// laSoText) và mọi chỗ ĐỌC nó: bộ cắt theo phần + prompt luận giải.
//
// Vì sao cần: `findIndex()` trả -1 là giá trị HỢP LỆ. Đổi một mốc section (hay
// chỉ nối thêm ghi chú vào sau nó) làm bộ cắt câm → cả lá số 22K ký tự đi thẳng
// vào prompt, model tự mò, bản luận bỏ qua data engine đã chấm. KHÔNG ném lỗi,
// KHÔNG log, trang vẫn ra bài đọc trôi chảy → lỗi sống 2 tháng mới lộ.
// Cùng họ với "prompt neo vào khối === ĐIỂM ĐÁNH GIÁ === đã bị xoá".
//
// 6 luật:
//   1. Mỗi mốc trong MARKERS phải xuất hiện thành MỘT DÒNG NGUYÊN VẸN.
//   2. Mốc phải đứng MỘT MÌNH (không nối ghi chú vào cuối dòng).
//   3. Mọi chuỗi mốc mà code phía server đi dò phải khớp được với output.
//   4. Mọi "=== X ===" prompt nhắc tới phải TỒN TẠI trong output (hoặc do chính
//      route chèn vào) — chống lặp lại lỗi trỏ vào khối đã chết.
//   5. Khối đại vận phải còn đủ các trường mà prompt hứa sẽ có.
//   6. Chỉ ĐƯỢC CÓ MỘT bản `formatLaSoV2` trong public/ (chống drift hai bản).
// ============================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
let failed = 0;
const fail = (msg) => {
  console.error('  ✗ ' + msg);
  failed++;
};
const ok = (msg) => console.log('  ✓ ' + msg);

// ── Nạp engine + formatter, dựng một lá số thật ──────────────
const g = globalThis;
g.window = g;
if (!g.location) {
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    host: 'tuviminhbao.com',
    port: '',
    href: 'https://tuviminhbao.com/',
    pathname: '/',
    search: '',
    hash: '',
  };
}
const FMT_PATH = join(ROOT, 'public', 'tuvi-laso-format.js');
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const fmtSrc = readFileSync(FMT_PATH, 'utf-8');
const E = new Function(
  'window',
  'globalThis',
  engineSrc +
    '\n' +
    fmtSrc +
    '\nreturn{convertDuongToAm,anSaoLaSo,formatLaSoV2:window.formatLaSoV2,buildDaiVanLines:window.buildDaiVanLines,MARKERS:window.LASO_MARKERS};'
)(g, g);

// Vài lá số trải giới tính + giờ + năm, để không kết luận từ đúng một ca.
const CASES = [
  [3, 6, 1998, 1, 'nam'],
  [9, 5, 1984, 7, 'nam'],
  [21, 11, 1991, 0, 'nu'],
  [15, 2, 2003, 11, 'nu'],
];
function build(c) {
  const [d, m, y, gioIdx, gender] = c;
  const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  const conv = E.convertDuongToAm(d, m, y, GIO_HOURS[gioIdx]);
  const al = conv.amLich;
  const ls = E.anSaoLaSo({
    ngayAL: al.day,
    thangAL: al.month,
    namAL: al.year,
    canNam: conv.canNam,
    chiNam: conv.chiNam,
    gioIdx,
    gioitinh: gender,
    namXem: 2026,
  });
  return { ls, text: E.formatLaSoV2(ls, conv) };
}
const samples = CASES.map(build);

// ── Luật 1+2: mốc nguyên vẹn, đứng một mình ──────────────────
const MARKERS = E.MARKERS;
if (!MARKERS || typeof MARKERS !== 'object') {
  fail('public/tuvi-laso-format.js không export window.LASO_MARKERS');
} else {
  for (const [key, mark] of Object.entries(MARKERS)) {
    let missing = 0,
      polluted = 0;
    for (const { text } of samples) {
      const lines = text.split('\n');
      if (!lines.includes(mark)) missing++;
      // Mốc bị nối thêm chữ ở cuối dòng → bộ cắt dò `includes(mark)` sẽ trượt.
      const head = mark.replace(/\s*===\s*$/, '');
      if (lines.some((l) => l.startsWith(head) && l !== mark)) polluted++;
    }
    if (missing) fail(`mốc "${key}" (${mark}) vắng ở ${missing}/${samples.length} lá số`);
    else if (polluted)
      fail(
        `mốc "${key}" bị nối thêm chữ vào cuối dòng ở ${polluted}/${samples.length} lá số — ghi chú phải xuống DÒNG RIÊNG`
      );
    else ok(`mốc ${key} nguyên vẹn & đứng một mình`);
  }
}

// ── Luật 3: chuỗi mốc mà server đi dò phải khớp output ───────
// 🔴 VÁ 2026-08-23: trước đây liệt `app/api/lasotuvi/route.ts`, nhưng logic
// `findMark`/`trimLaSo` đã DỜI sang `lib/agent/luan-giai-doc.ts` từ trước (xem
// chú thích đầu file đó) — route.ts giờ 0 mốc literal nào, nên entry cũ trở
// thành một cái tick xanh KHÔNG kiểm gì (đúng lớp lỗi luật này sinh ra để
// chặn: một mốc trôi đi mà không ai biết). Đổi sang đúng file đang sống logic.
const CONSUMERS = ['lib/agent/luan-giai-doc.ts', 'lib/agent/phu-the-luan-giai.ts'];
// Mốc do CHÍNH route chèn vào prompt (không phải formatter dựng) → miễn trừ,
// kèm lý do ngay tại chỗ để lần sau khỏi phải đi tra.
const ROUTE_OWNED = new Set([
  // `buildPrompt()`/`laSoContextFor()` (nguồn cũ của mốc trần này) nay 0 caller
  // — giữ cố ý làm đường lùi, xem chú thích tại chỗ. Miễn trừ VẪN cần: đây là
  // vỏ prompt, không phải thứ formatter dựng, nên đối chiếu với output là sai lớp.
  '=== LÁ SỐ ===',
  // Sống thật: `buildPromptCached()` + van-han-nam · lasotuvi · tubinh · xem-tuoi.
  '=== TÀI LIỆU THAM KHẢO ===',
]);
const sample0 = samples[0].text;
const sampleLines0 = sample0.split('\n');
const matchesOutput = (needle) => sampleLines0.some((l) => l.trimStart().startsWith(needle));

for (const rel of CONSUMERS) {
  const src = readFileSync(join(ROOT, rel), 'utf-8');
  const needles = new Set();
  // (a) dò tường minh: findMark('=== X'), .includes('=== X'), .startsWith('=== X')
  for (const m of src.matchAll(/(?:findMark|includes|startsWith)\(\s*'(===[^']*)'/g))
    needles.add(m[1].trim());
  // (b) mốc nhắc trong prompt. CHỈ quét bên trong CHUỖI — quét thẳng mã nguồn
  // thì toán tử `===` của JS lọt vào ('phan === 14 || phan ===' ra một "mốc"),
  // và dải `// =====` trong chú thích cũng vậy → bộ dò kêu oan rồi bị tắt đi.
  const literals = [];
  for (const m of src.matchAll(/`([\s\S]*?)`/g)) literals.push(m[1]); // template
  for (const m of src.matchAll(/'([^'\\\n]*)'/g)) literals.push(m[1]);
  for (const m of src.matchAll(/"([^"\\\n]*)"/g)) literals.push(m[1]);
  for (const lit of literals) {
    for (const m of lit.matchAll(/===[^=\n]{1,60}?===/g)) needles.add(m[0].trim());
  }

  for (const n of needles) {
    if (ROUTE_OWNED.has(n)) continue;
    if (!matchesOutput(n))
      fail(`${rel} đi dò/nhắc "${n}" nhưng laSoText KHÔNG có dòng nào bắt đầu bằng chuỗi đó`);
  }
  ok(`${rel}: ${needles.size} mốc đều khớp output`);
}

// ── Luật 5: khối đại vận còn đủ trường prompt hứa ────────────
// Mỗi trường kèm lý do — đây đúng là phần từng bị bỏ rơi khiến bản luận chỉ
// nói theo tên chính tinh.
const DV_REQUIRED = [
  ['Scoring:', 'điểm vận TT/ĐL/NH — phán quyết mở đầu neo vào đây'],
  ['[LUẬN ĐOÁN', 'luật vận hạn engine chấm — panel in ra, model hay bỏ qua'],
  ['[TAM PHƯƠNG TỨ CHÍNH', 'panel có mục này; thiếu thì model tự suy lại tam hợp'],
];
for (const [needle, why] of DV_REQUIRED) {
  const miss = samples.filter(({ text }) => {
    const L = text.split('\n');
    const s = L.findIndex((l) => l.startsWith('ĐV1:'));
    const e = L.findIndex((l, i) => i > s && /^ĐV\d+:/.test(l));
    return !L.slice(s, e > 0 ? e : L.length).some((l) => l.includes(needle));
  }).length;
  // Không lá số nào cũng có đủ luật/tam phương ở ĐV1 → chỉ báo khi VẮNG SẠCH.
  if (miss === samples.length) fail(`khối đại vận KHÔNG lá số nào có "${needle}" (${why})`);
  else ok(`khối đại vận có "${needle}" (${samples.length - miss}/${samples.length} lá số)`);
}

// ── Luật 6: chỉ một bản formatLaSoV2 trong public/ ───────────
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(e)) out.push(p);
  }
  return out;
}
const defs = walk(join(ROOT, 'public')).filter((p) => {
  const s = readFileSync(p, 'utf-8');
  return /function\s+formatLaSoV2\s*\(/.test(s);
});
if (defs.length !== 1) {
  fail(
    `có ${defs.length} bản định nghĩa formatLaSoV2 (phải đúng 1): ` +
      defs.map((p) => p.replace(ROOT + '/', '')).join(', ')
  );
} else {
  ok('chỉ một bản formatLaSoV2: ' + defs[0].replace(ROOT + '/', ''));
}

if (failed) {
  console.error(`\n✗ check:laso — ${failed} lỗi.`);
  process.exit(1);
}
console.log('\n✓ check:laso — hợp đồng laSoText còn nguyên.');
