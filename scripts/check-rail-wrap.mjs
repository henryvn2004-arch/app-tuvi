#!/usr/bin/env node
// scripts/check-rail-wrap.mjs
// ============================================================
// Canh nhóm `wrap` — anh em của `check-rail-fields.mjs` (nhóm Bát Tự/scenario).
//
// Vì sao phải có RIÊNG: hai nhóm đi hai đường khác hẳn.
//   • nhóm `scenario` → `SCENARIO_FIELD` → `extract*Context` (prompts.ts)
//   • nhóm `wrap`     → lá số ĐẦY ĐỦ + một hàm `*RailWrapper` bọc giọng
// Bộ dò cũ chỉ với tới đường thứ nhất, nên lượt rà đầu tiên **sót đúng nhóm
// này** — rồi chính nó lòi ra 3 lỗi (5 trục/8 chất của `day-con` không tới
// rail · `railDataDayDu` của `huong-nghiep-tre` là code chết · bảng KIỂU mà
// bản trả tiền dùng thì rail không có). Bộ dò này để lần sau máy nói trước.
//
// LUẬT: engine khai trường nào ở hồ sơ (profile) thì hàm wrapper phải ĐỌC
// trường đó, hoặc khai vào SKIP **kèm lý do**. Lý do phải thuộc đúng một
// trong hai loại, và cả hai đều kiểm được bằng mắt khi đọc lại:
//   (a) "đã có trong khối lá số đầy đủ" — model tự suy lại được từ chính lá
//       số vốn đã nạp trong system (đường `wrap` LUÔN kèm `extractLasoContext`
//       bản full), nên gửi nữa là lặp;
//   (b) "không phải nội dung luận" — cờ nội bộ / tham số đầu vào.
// 🔑 Tiêu chí quyết "phải gửi" KHÔNG phải "trang có vẽ nó thành ô không", mà
// là **người dùng có ĐỌC được nó không** (trên trang HOẶC trong bản trả tiền)
// **và** model có tự suy lại được từ lá số không. Bảng tự đặt (KIỂU, cách
// dạy, hoạt động, dấu hiệu duyên nợ) thì không suy lại được ⇒ phải gửi.
//
// ⚠️ PHẠM VI THẬT — đọc trước khi tin bộ dò này:
// Nó soi **cấp 1** của hồ sơ, cộng thêm các kiểu lồng được khai TAY trong
// `DEEP`. Trường mới nằm trong một kiểu lồng CHƯA khai ở `DEEP` thì nó KHÔNG
// bắt được. Đây đúng là chỗ `nhan-mach` từng lọt (`cap[].vi` — rail nhận
// "A ↔ B" trơ trong khi trang hiện cả câu giải thích). Cố ý không tự động
// duyệt sâu mọi kiểu lồng: phần lớn kiểu lồng là cấu trúc nội bộ, quét hết là
// bộ dò kêu oan hàng loạt — mà bộ dò kêu oan là bộ dò bị tắt đi.
//
// Chạy trên MÃ NGUỒN (không cần tsc, không cần dựng engine) nên vào được job
// lint như 12 bộ dò kia.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
let failed = 0;
const fail = (m) => {
  console.error('  ✗ ' + m);
  failed++;
};

// ── Cắt chú thích trước khi quét ────────────────────────────
// Bài học từ bộ dò Bát Tự: chú thích của CHÍNH hàm đó hay nhắc tên trường
// (vd "`thapThan` là bảng…") → phép dò thoả mãn nhờ một dòng văn xuôi trong
// khi mã không hề đọc trường. Xanh oan nguy hiểm hơn đỏ oan: đỏ oan thì người
// ta đi tìm, xanh oan thì không ai biết.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/** Cắt khối `{...}` cân ngoặc bắt đầu từ dấu `{` đầu tiên sau `from`. */
function balanced(src, from) {
  let depth = 0;
  const open = src.indexOf('{', from);
  if (open < 0) return '';
  for (let k = open; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(from, k + 1);
  }
  return '';
}

const fileCache = new Map();
const read = (f) => {
  if (!fileCache.has(f)) fileCache.set(f, readFileSync(join(ROOT, f), 'utf-8'));
  return fileCache.get(f);
};

/** Tên thuộc tính ở CẤP 1 của một `export interface`. */
function ifaceKeys(file, name) {
  const src = read(file);
  const i = src.search(new RegExp(`export interface ${name}\\b`));
  if (i < 0) return null;
  const body = stripComments(balanced(src, i));
  const keys = [];
  let depth = 0;
  for (const ln of body.split('\n')) {
    const atTop = depth === 1; // dòng nằm NGAY trong thân interface
    for (const ch of ln) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (!atTop) continue;
    const m = ln.match(/^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\??\s*:/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/**
 * Thân hàm wrapper + thân MỌI hàm cùng file mà nó gọi tới (đệ quy).
 *
 * Bắt buộc phải gom helper: `huongNghiepTreRailWrapper` đẩy phần thiên hướng
 * sang `huongBlock(p)`, `dayConRailWrapper` đẩy sang `kieuChiTiet`/`doDuoc`.
 * Chỉ soi thân hàm export sẽ báo THIẾU oan đúng mấy trường vừa vá xong.
 *
 * Ngược lại KHÔNG quét cả file: `past-life-story.ts` còn chứa
 * `formatCharacterForLLM` (dựng prompt TRUYỆN, không phải rail) — trường chỉ
 * hàm đó đọc mà tính là "rail đã biết" thì lại xanh oan.
 */
function wrapperBody(file, name) {
  const src = read(file);
  const seen = new Set();
  const parts = [];
  const decl = (fn) => {
    const re = new RegExp(
      `(?:export\\s+)?(?:async\\s+)?function\\s+${fn}\\b|(?:export\\s+)?const\\s+${fn}\\s*=`
    );
    const i = src.search(re);
    return i < 0 ? '' : balanced(src, i);
  };
  const walk = (fn) => {
    if (seen.has(fn)) return;
    seen.add(fn);
    const body = decl(fn);
    if (!body) return;
    const clean = stripComments(body);
    parts.push(clean);
    for (const m of clean.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) walk(m[1]);
  };
  walk(name);
  return parts.length ? parts.join('\n') : null;
}

// ── Danh sách canh ──────────────────────────────────────────
// `skip` = trường CỐ Ý không gửi, mỗi cái một lý do đọc ra được.
// `deep`  = kiểu lồng khai TAY để khoá lại phần nội dung thật (xem PHẠM VI).
const ENG = {
  pl: 'lib/engine/past-life.ts',
  bond: 'lib/engine/past-life-bond.ts',
  nk: 'lib/engine/nguoi-khac.ts',
  dc: 'lib/engine/day-con.ts',
  hn: 'lib/engine/huong-nghiep-tre.ts',
};
const LASO = 'đã có trong khối lá số đầy đủ (đường wrap luôn kèm extractLasoContext full)';

const TOOLS = [
  {
    id: 'past-life',
    engine: ENG.pl,
    iface: 'PastLifeProfile',
    wrapFile: 'lib/agent/past-life-story.ts',
    wrapFn: 'pastLifeRailWrapper',
    skip: {
      thanCungName: LASO,
      threads: `${LASO} — tuyến đời quét từ cách cục 12 cung, model suy lại được`,
      readouts: 'readout nội bộ dùng dựng nhân vật/ảnh, không phải nội dung người đọc thấy',
      napAm: LASO,
      cuc: LASO,
      canChiNam: LASO,
    },
    deep: [],
  },
  {
    id: 'past-life-bond',
    engine: ENG.bond,
    iface: 'PastLifeBond',
    wrapFile: 'lib/agent/past-life-bond-story.ts',
    wrapFn: 'bondRailWrapper',
    skip: {},
    // `signals` là quy chiếu TỰ ĐẶT bắc qua HAI lá số, mà rail chỉ nạp được
    // MỘT — model không có đường suy lại. Trang thì hiện thẳng "cơ sở trong
    // hai lá số", nên người ta đọc xong hỏi lại là chuyện đương nhiên.
    deep: [[ENG.bond, 'BondSignal']],
  },
  {
    id: 'nguoi-khac',
    engine: ENG.nk,
    iface: 'NguoiKhacProfile',
    wrapFile: 'lib/agent/nguoi-khac-prompt.ts',
    wrapFn: 'nguoiKhacRailWrapper',
    skip: {
      namXem: 'năm xem — đã nêu trong lá số',
      gioiTinh: LASO,
      than: LASO,
      vanNam: LASO,
      daiVan: LASO,
    },
    deep: [[ENG.nk, 'VoiBan']],
  },
  {
    id: 'day-con',
    engine: ENG.dc,
    iface: 'DayConProfile',
    wrapFile: 'lib/agent/day-con-prompt.ts',
    wrapFn: 'dayConRailWrapper',
    skip: {
      namXem: 'năm xem — đã nêu trong lá số',
      namSinh: LASO,
      gioiTinh: LASO,
      than: LASO,
      vanNam: LASO,
      tuoi: `${LASO} — và khối "chặng đi học" đã in kèm mốc tuổi/năm`,
    },
    deep: [
      [ENG.dc, 'KieuHoc'],
      [ENG.dc, 'VoiChaMe'],
    ],
  },
  {
    id: 'huong-nghiep-tre',
    engine: ENG.hn,
    iface: 'HuongNghiepTreProfile',
    wrapFile: 'lib/agent/huong-nghiep-tre-prompt.ts',
    wrapFn: 'huongNghiepTreRailWrapper',
    skip: {
      namXem: 'năm xem — đã nêu trong lá số',
      namSinh: LASO,
      gioiTinh: LASO,
      changDangO: `${LASO} — chặng đại vận đang chạy, không kèm nhãn riêng nào của tool`,
    },
    deep: [],
  },
  {
    id: 'group-bond',
    engine: ENG.bond,
    iface: 'GroupBond',
    wrapFile: 'lib/agent/past-life-bond-story.ts',
    wrapFn: 'groupRailWrapper',
    skip: {},
    // `GroupPair` mang `signals`/`giver` — đúng hai thứ bản 2 người từng thiếu.
    // Cấp 1 của `GroupBond` sạch nên nếu không khai `deep` thì bộ dò báo XANH
    // cho một lỗ y hệt lỗ nó vừa bắt ở `bondRailWrapper`.
    deep: [[ENG.bond, 'GroupPair']],
  },
];

// Dò theo BIÊN TỪ: `.kieu` là tiền tố của `.kieuPhu`/`.kieuTen`, dùng
// `includes` thô sẽ báo "có đọc" cho một trường KHÔNG hề được đọc.
const readsIn = (body, k) =>
  new RegExp(`[.'"\`]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`).test(body);

for (const t of TOOLS) {
  const keys = ifaceKeys(t.engine, t.iface);
  const body = wrapperBody(t.wrapFile, t.wrapFn);
  if (!keys || !keys.length) {
    fail(`${t.id}: không đọc được interface ${t.iface} trong ${t.engine} — sửa bộ dò`);
    continue;
  }
  if (!body) {
    fail(`${t.id}: không tìm thấy hàm ${t.wrapFn} trong ${t.wrapFile} — sửa bộ dò`);
    continue;
  }

  const missing = keys.filter((k) => !t.skip[k] && !readsIn(body, k));
  const stale = Object.keys(t.skip).filter((k) => !keys.includes(k));

  const deepMiss = [];
  for (const [f, name] of t.deep) {
    const dk = ifaceKeys(f, name);
    if (!dk || !dk.length) {
      fail(`${t.id}: không đọc được interface lồng ${name} — sửa bộ dò`);
      continue;
    }
    for (const k of dk) if (!readsIn(body, k)) deepMiss.push(`${name}.${k}`);
  }

  const label = `${t.id} — ${keys.length} trường cấp 1, bỏ có khai ${Object.keys(t.skip).length}`;
  if (missing.length) {
    fail(
      `${label}\n    ${t.wrapFn} KHÔNG đụng tới ${missing.length} trường engine khai: ${missing.join(', ')}\n` +
        '    → gửi vào rail, hoặc khai vào skip trong chính bộ dò này kèm LÝ DO.'
    );
  } else if (deepMiss.length) {
    fail(`${label}\n    ${t.wrapFn} bỏ sót trường của kiểu lồng đang canh: ${deepMiss.join(', ')}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
  if (stale.length) {
    fail(`${t.id}: skip khai thừa (interface không còn trường): ${stale.join(', ')} — gỡ đi`);
  }
}

if (failed) {
  console.error(`\n✗ check:railwrap — ${failed} lỗi.`);
  process.exit(1);
}
console.log('\n✓ check:railwrap — engine và vỏ rail còn khớp trường.');
