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
  // Nhận CẢ hằng viết THƯỜNG (arcCore/mauArc) — chúng là hàm dựng prompt.
  // 🪤 Nhóm tham số CẤM chứa `=` và backtick. Không siết thì `const authorName =
  // (body.authorName as string…)` khớp lười xuyên qua vài nghìn ký tự tới `) => \``
  // của một khai báo TẬN SAU, nuốt gọn `arcCore` ở giữa → bóc ra rỗng, báo xanh.
  const re = /(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:\([^`=]*?\)\s*=>\s*)?`/g;
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
    // 🪤 Nhảy qua HẲN thân template. Không có dòng này thì regex quét tiếp NGAY
    // BÊN TRONG thân vừa đọc, và một `) => \`` nằm trong chú thích/ví dụ sẽ ăn
    // lẹm sang khai báo kế tiếp — đo được: `arcCore` bị nuốt, bộ dò đọc ra rỗng.
    re.lastIndex = i + 1;
  }
  return out;
}

// ── Bóc hằng chuỗi THƯỜNG `const NAME = '...'` ────────────────────────────
// 🔴 Vì sao phải có: `grabBlocks` chỉ bóc template literal (backtick). Khi arc
// nhận thêm slot lấy giá trị từ hằng ngoài (`boiCanh: CHAT_BOICANH`), bộ dò
// resolve slot đó ra RỖNG và báo hụt 550 ký tự trên cả ba shape — trong khi
// A/B trên module thật cho thấy prompt KHÔNG đổi một byte. Đo hụt thì trần
// ngân sách mất tác dụng đúng lúc cần nhất: nó sẽ báo còn dư chỗ trong khi
// prompt đã sát trần.
function grabStringConsts(src, raw) {
  const re = /(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*=\s*\n?\s*(['"])((?:[^\\]|\\.)*?)\2\s*;/g;
  let m;
  while ((m = re.exec(src))) {
    if (raw[m[1]] === undefined) raw[m[1]] = m[3];
  }
}

// ── Mở rộng hằng dựng bằng LỜI GỌI HÀM: `const NAME = fn({...})` / `fn(a, b)` ──
// 🔴 Vì sao phải có: khi arc chuyển từ template literal sang HÀM `arcCore(...)`
// (để 2 họ prompt dùng chung một lõi), bộ dò cũ không bóc được → `LUAN_ARC`
// resolve ra RỖNG → nó báo 2.675/7.000 ký tự và VẪN XANH, trong khi prompt thật
// không đổi bao nhiêu. Bộ dò đo hụt mà báo xanh còn tệ hơn không có bộ dò.
function expandFactories(src, raw) {
  const re =
    // 🪤 Kết thúc lời gọi là `\n);` HOẶC `\n});` (đối số object literal). Thiếu
    // nhánh `}` thì lời gọi đầu khớp lười xuyên qua lời gọi sau — đo được:
    // `LUAN_ARC` nuốt luôn args của `LUAN_ARC_CHUNG` và `MAU_ARC`.
    /(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*=\s*([a-z][A-Za-z0-9_]*)\(([\s\S]*?)\n\}?\);/g;
  let m;
  while ((m = re.exec(src))) {
    const [, name, fn, argsRaw] = m;
    const body = raw[fn];
    if (body === undefined) {
      console.error(
        `✗ \`${name}\` dựng bằng \`${fn}(...)\` nhưng không bóc được thân \`${fn}\`.\n` +
          `  Sửa bộ dò cho khớp — đừng để nó đo ra chuỗi rỗng rồi báo xanh.`
      );
      process.exit(1);
    }
    // Object literal → map theo khoá (o.xxx); còn lại → tham số theo vị trí.
    const vals = {};
    const strs = [...argsRaw.matchAll(/(?:^|[\s,{])([a-zA-Z]+):\s*\n?\s*(['"`])([\s\S]*?)\2\s*,/g)];
    if (strs.length) for (const g of strs) vals['o.' + g[1]] = g[3];
    // Đối số dạng `khoa: TEN_HANG,` — tra sang bảng hằng. Không tra được thì
    // DỪNG HẲN: đọc ra rỗng rồi báo xanh còn tệ hơn báo đỏ (bài học check:motifs).
    for (const g of argsRaw.matchAll(/(?:^|[\s,{])([a-zA-Z]+):\s*([A-Z_][A-Z0-9_]*)\s*,/g)) {
      if (raw[g[2]] === undefined) {
        console.error(
          `✗ \`${name}\` truyền \`${g[1]}: ${g[2]}\` nhưng không bóc được hằng \`${g[2]}\`.\n` +
            `  Sửa bộ dò cho khớp — đừng để nó đo ra chuỗi rỗng rồi báo xanh.`
        );
        process.exit(1);
      }
      vals['o.' + g[1]] = raw[g[2]];
    }
    const pos = [...argsRaw.matchAll(/(?:^|,)\s*(['"`])([\s\S]*?)\1\s*(?=,|$)/g)].map((g) => g[2]);
    raw[name] = body.replace(/\$\{([^{}]+)\}/g, (full, expr) => {
      const e = expr.trim();
      if (vals[e] !== undefined) return vals[e];
      const idx = (raw['__params__' + fn] || []).indexOf(e);
      if (idx >= 0 && pos[idx] !== undefined) return pos[idx];
      return full; // để `resolve` lo tiếp (vd ${MAU_ARC} lồng trong khối khác)
    });
  }
}

// Tên tham số VỊ TRÍ của mỗi hàm dựng, để map `${tenGoi}` → đối số thứ n.
function grabParams(src, raw) {
  const re = /const\s+([a-z][A-Za-z0-9_]*)\s*=\s*\(([^)]*)\)\s*=>\s*`/g;
  let m;
  while ((m = re.exec(src))) {
    raw['__params__' + m[1]] = m[2]
      .split(',')
      .map((x) => x.split(':')[0].trim())
      .filter(Boolean);
  }
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
grabParams(src, raw);
grabStringConsts(src, raw);
expandFactories(src, raw);
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
  // 🔴 SÀN: bộ dò này ĐÃ mù một lần — khi arc chuyển sang hàm dựng, nó đọc ra
  // 2.675/7.000 rồi báo XANH. Ngưỡng dưới bắt đúng ca đó: prompt thật không bao
  // giờ tụt xuống 60% trần mà vẫn còn đủ luật; tụt là bộ dò đọc hụt, không phải
  // prompt gọn đi. Đo hụt mà báo xanh còn tệ hơn không có bộ dò.
  const floor = Math.round(cap * 0.6);
  if (len < floor) {
    errors.push(
      `${name}: phần luật chỉ ${len} ký tự, DƯỚI sàn ${floor}.\n` +
        `  → Gần như chắc chắn bộ dò đọc hụt (khối mới dựng bằng hàm? đổi cách khai?),\n` +
        `    chứ không phải prompt vừa gọn đi. Sửa bộ dò trước khi tin con số này.`
    );
  }
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

// ── Luật 3: prompt KỊCH BẢN cũng chỉ được MỘT nguồn hình dạng ────
// Trước đợt nhân arc ra (2026-08-18), luật 2 chỉ canh 3 shape lá số nên 22
// prompt kịch bản muốn dán chồng bao nhiêu khối bố cục cũng được. Nay chúng
// dùng chung `RAIL_SHAPE_AND_VOICE`; luật này chặn ca "thêm tool mới rồi dán
// thêm một khối luật nữa cho chắc" — chính cơ chế cộng dồn đã đẻ ra vấn đề.
console.log('\n── Prompt kịch bản: mỗi cái đúng MỘT nguồn hình dạng ──');
const scenarioNames = Object.keys(raw).filter((n) => n.startsWith('CHAT_SYSTEM_') && !BUDGET[n]);
if (scenarioNames.length < 15) {
  console.error(
    `✗ Chỉ thấy ${scenarioNames.length} prompt kịch bản (chờ ≥15).\n` +
      `  Prompt đổi cách khai? Sửa bộ dò — đừng kiểm một danh sách cụt rồi báo xanh.`
  );
  process.exit(1);
}
const badScenario = [];
for (const n of scenarioNames) {
  const used = [...new Set(directRefs(raw[n]).filter((r) => SHAPE_BLOCKS.includes(r)))];
  if (used.length !== 1) badScenario.push(`${n}: ${used.length ? used.join(' + ') : '(không có)'}`);
}
console.log(`  ${scenarioNames.length} prompt · ${scenarioNames.length - badScenario.length} đạt`);
if (badScenario.length) {
  errors.push(
    `Prompt kịch bản có số nguồn bố cục KHÁC 1:\n    ` +
      badScenario.join('\n    ') +
      `\n  → Mỗi prompt phải nội suy ĐÚNG MỘT \`\${RAIL_SHAPE_AND_VOICE}\`.`
  );
}

// ── Luật 4: 4 prompt LUẬN GIẢI ở route — trần + đúng MỘT nguồn bố cục ────
// Ba luật trên chỉ quét `lib/agent/prompts.ts`, nên 4 bản LUẬN GIẢI (thứ người
// ta TRẢ TIỀN để đọc) nằm ngoài mọi trần: chúng khai prompt INLINE trong route.
// Đó đúng là chỗ cơ chế cộng dồn dễ tái diễn nhất — prompt 24 phần đã 10.499 ký
// tự và không có gì canh.
//
// ⚠️ Trần đặt SÁT mức hiện tại + biên ~12%. Nới trần là một QUYẾT ĐỊNH phải ghi
// lý do, không phải thao tác dọn đường cho một khối mới.
const DOC_FILES = {
  // Prompt 24 phần DỜI khỏi route sang lib (tool "Vận Hạn 12 Tháng Tới" dùng
  // lại 4 phần đầu; Next chặn export lạ trong route file). Nội dung KHÔNG đổi
  // — A/B đã chứng minh 24 prompt trùng khít từng byte.
  // Nới 11800 → 13700, 9400 → 10900, 7000 → 8200, 3100 → 4000, 6900 → 7900
  // (2026-09-04, CẢ 5 bản cùng lượt): `arcDoc` thêm khối "NHÃN TÍNH CHẤT MỖI
  // CÂU HOOK" ([TỐT]/[CẢNH BÁO]/[TRUNG TÍNH] trước câu hook, cho thẻ trích dẫn
  // màu kiểu Facebook caption) — +609 ký tự đo THẬT cho MỖI bản, vì cả 5 đều
  // nội suy chung `arcDoc()`. Cả 5 bản đều đã sát trần (95-100%) từ đợt DỰ BÁO
  // trước, không còn chỗ trống nào để hấp thụ khối mới ⇒ bắt buộc nới cả 5,
  // không phải nới tuỳ tiện. Biên vẫn giữ ~10% như các lần nới trước.
  'lib/agent/luan-giai-doc.ts': { name: 'SYSTEM_PROMPT', cap: 13700, arc: 'DOC_ARC_LASO' },
  'app/api/tubinh/route.ts': { name: 'SYSTEM_PROMPT_TUBINH', cap: 10900, arc: 'DOC_ARC_TUBINH' },
  'lib/agent/phu-the-luan-giai.ts': {
    name: 'PHU_THE_LUAN_GIAI_SYSTEM_PROMPT',
    cap: 8200,
    arc: 'DOC_ARC_PHU_THE',
  },
  'app/api/xem-tuoi/route.ts': {
    name: 'LUAN_GIAI_TUONG_HOP_SYSTEM',
    cap: 4000,
    arc: 'DOC_ARC_TUONG_HOP',
  },
  'app/api/but-tuong/route.js': {
    name: 'SP_BUT_TUONG',
    cap: 7900,
    arc: 'DOC_ARC_BUT_TUONG',
  },
};
// Khối bố cục của VĂN LUẬN DÀI. Một bản luận giải chỉ được dùng ĐÚNG MỘT —
// và tuyệt đối không được kéo thêm arc CHAT vào (nó mang bối cảnh "vừa đọc xong
// bản luận đầy đủ" + ngân sách 120–180 từ, tức tự mâu thuẫn với chính nó).
const DOC_BLOCKS = [
  'DOC_ARC_LASO',
  'DOC_ARC_TUBINH',
  'DOC_ARC_PHU_THE',
  'DOC_ARC_TUONG_HOP',
  'DOC_ARC_BUT_TUONG',
];
const CHAT_BLOCKS = [
  'LUAN_ARC',
  'LUAN_ARC_CHUNG',
  'MAU_ARC',
  'MAU_ARC_CHUNG',
  'RAIL_SHAPE_AND_VOICE',
];

console.log('\n── Bản LUẬN GIẢI ở route: trần + một nguồn bố cục ──');
for (const [file, spec] of Object.entries(DOC_FILES)) {
  let fsrc;
  try {
    fsrc = readFileSync(file, 'utf8');
  } catch {
    console.error(`✗ Không đọc được ${file}. Route dời chỗ? Sửa bộ dò — đừng bỏ qua.`);
    process.exit(1);
  }
  const m = fsrc.match(new RegExp('const ' + spec.name + ' = (`[\\s\\S]*?`);\\n'));
  if (!m) {
    console.error(
      `✗ Không bóc được \`${spec.name}\` trong ${file}.\n` +
        `  Prompt đổi tên hay đổi cách khai? Sửa bộ dò cho khớp — đừng bỏ qua.`
    );
    process.exit(1);
  }
  const body = m[1];
  // resolve các khối nội suy từ prompts.ts (arc + luật xưng hô), phần còn lại bỏ rỗng
  const len = resolve(raw, body).length;
  const pct = Math.round((len / spec.cap) * 100);
  console.log(
    `  ${spec.name.padEnd(32)} ${String(len).padStart(6)} / ${spec.cap} ký tự  (${pct}%)`
  );
  const floor = Math.round(spec.cap * 0.6);
  if (len < floor)
    errors.push(
      `${spec.name}: phần luật chỉ ${len} ký tự, DƯỚI sàn ${floor}.\n` +
        `  → Gần như chắc chắn bộ dò đọc hụt (arc dựng bằng hàm? đổi cách khai?),\n` +
        `    chứ không phải prompt vừa gọn đi. Sửa bộ dò trước khi tin con số này.`
    );
  if (len > spec.cap)
    errors.push(
      `${spec.name}: phần luật ${len} ký tự, vượt trần ${spec.cap}.\n` +
        `  → CẮT chỗ khác trước khi thêm khối mới. Đây là bản người dùng TRẢ TIỀN để đọc;\n` +
        `    prompt phình lên thì mọi luật trong đó loãng đi.`
    );
  const refs = directRefs(body);
  const doc = [...new Set(refs.filter((r) => DOC_BLOCKS.includes(r)))];
  const chat = [...new Set(refs.filter((r) => CHAT_BLOCKS.includes(r)))];
  if (doc.length !== 1 || doc[0] !== spec.arc)
    errors.push(
      `${spec.name} nội suy ${doc.length ? doc.join(' + ') : '(không có)'} — chờ đúng \`${spec.arc}\`.\n` +
        `  → Mỗi bản luận giải đúng MỘT nguồn bố cục cho văn luận dài.`
    );
  if (chat.length)
    errors.push(
      `${spec.name} kéo cả arc CHAT vào: ${chat.join(' + ')}.\n` +
        `  → Arc chat mang bối cảnh "người hỏi VỪA đọc xong bản luận đầy đủ" + ngân sách\n` +
        `    120–180 từ. Bản luận giải CHÍNH LÀ cái bản đó ⇒ prompt tự mâu thuẫn.`
    );
}

if (errors.length) {
  console.error('\n✗ check:prompt — ' + errors.length + ' lỗi:\n');
  for (const e of errors) console.error('  • ' + e + '\n');
  process.exit(1);
}
console.log('\n✓ check:prompt — ngân sách prompt lá số đạt.');
