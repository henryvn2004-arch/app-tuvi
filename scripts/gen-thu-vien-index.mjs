#!/usr/bin/env node
// scripts/gen-thu-vien-index.mjs
// ============================================================
// TRÍCH XƯƠNG cho Thư Viện (`thu_vien_muc` + phần mở rộng `tu_dien`).
//
// TẤT ĐỊNH, KHÔNG LLM. Đọc CHÍNH các bảng nguồn — không gõ tay, không chép
// lại công thức (luật CLAUDE.md "engine-cophap"):
//   - `public/tuvi-ansao-engine.js`  → STAR_DATA (sao) · CACH_CUC_DATA (cách
//     cục) · TEN_CUNG (12 cung) — nạp qua `new Function`, ĐÚNG kỹ thuật
//     `loadEngine()` của `lib/engine/laso.ts` đang chạy production, chỉ khác
//     là trả về thẳng 3 hằng số thay vì các hàm an sao.
//   - `lib/engine/diachi.ts` → NA_TEN · NA (nạp âm) — bảng TĨNH, trích bằng
//     regex trên chính văn bản nguồn (không cần biên dịch TypeScript, và
//     không chép lại số liệu bằng tay).
//
// KHÔNG GHI DB. In báo cáo đối chiếu ra stdout + ghi JSON ra --out (đường dẫn
// bắt buộc truyền, KHÔNG mặc định trong repo — đây là dữ liệu trung gian một
// lần, không phải tài sản để commit).
//
// Chạy: node scripts/gen-thu-vien-index.mjs --out /path/to/out.json
//       [--tu-dien-snapshot /path/to/tu_dien.json]   (xem cờ bên dưới)
//
// `--tu-dien-snapshot`: đối chiếu với bảng `tu_dien` hiện có cần dữ liệu từ
// Supabase. Container phiên Claude Code CHẶN mọi kết nối ra ngoài (đã xác
// nhận: suggestqueries.google.com, dciwkfdqhhddeymlisey.supabase.co → 403 qua
// proxy) nên script KHÔNG tự fetch Supabase — nhận snapshot qua file JSON
// (mảng {slug,ten,loai}) do người gọi chuẩn bị trước (Admin/Supabase MCP export
// hoặc, khi chạy thật trên Vercel/CI có mạng, một bước fetch riêng trước khi
// gọi script này). Thiếu cờ này thì bỏ qua phần đối chiếu, chỉ in phần trích
// xương.
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = process.cwd();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

// ── Nạp engine vanilla, ĐÚNG kỹ thuật lib/engine/laso.ts::loadEngine() ─────
function loadEngineExports() {
  const code = readFileSync(`${ROOT}/public/tuvi-ansao-engine.js`, 'utf8');
  const g = {
    location: {
      protocol: 'https:',
      hostname: 'tuviminhbao.com',
      host: 'tuviminhbao.com',
      port: '',
      href: 'https://tuviminhbao.com/',
      pathname: '/',
      search: '',
      hash: '',
    },
  };
  const fn = new Function(
    'window',
    'globalThis',
    `${code}\nreturn { STAR_DATA, CACH_CUC_DATA, TEN_CUNG };`
  );
  return fn(g, g);
}

/**
 * Phát hiện KHOÁ TRÙNG trong STAR_DATA nguồn. JS object literal chỉ giữ giá
 * trị CUỐI CÙNG — bản đầu bị đè ÂM THẦM khi eval. Regex đọc lại chính VĂN BẢN
 * nguồn (không phải object đã eval, vì object đã mất bản đầu) để báo đủ cả
 * hai bản cho người đọc tự quyết, không đoán bản nào đúng.
 */
function findDupeStars(code) {
  const re = /^\s*'([^']+)':\s*\{[^}]*?type:\s*'([^']+)'/gm;
  const seen = new Map();
  const dupes = [];
  let m;
  while ((m = re.exec(code))) {
    const [, name, type] = m;
    if (seen.has(name)) {
      dupes.push({
        name,
        typeCu: seen.get(name),
        typeMoi: type,
        conflict: seen.get(name) !== type,
      });
    }
    seen.set(name, type);
  }
  return dupes;
}

/** Trích một mảng literal `const NAME = [...]` từ văn bản nguồn bằng regex. */
function extractArrayLiteral(code, constName) {
  const re = new RegExp(`const ${constName} = (\\[[\\s\\S]*?\\]);`);
  const m = code.match(re);
  if (!m) throw new Error(`Không tìm thấy \`const ${constName}\` trong nguồn`);
  return new Function(`return ${m[1]};`)();
}

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── 1. Sao (STAR_DATA) ──────────────────────────────────────────────────────
function buildSao(STAR_DATA) {
  return Object.entries(STAR_DATA).map(([ten, d]) => ({
    ten,
    slug: `sao-${slugify(ten)}`,
    type: d.type,
    element: d.element ?? null,
    yin_yang: d.yin_yang ?? null,
    weight: d.weight ?? null,
    traits: d.traits ?? [],
    positions: d.positions ?? null,
  }));
}

// ── 2. Cung (TEN_CUNG) ───────────────────────────────────────────────────────
function buildCung(TEN_CUNG) {
  return TEN_CUNG.map((ten, i) => ({
    ten: `Cung ${ten}`,
    tenNgan: ten,
    slug: `cung-${slugify(ten)}`,
    thuTu: i,
  }));
}

// ── 3. Sao × Cung (14 chính tinh × 12 cung, gắn cách cục khớp) ──────────────
function buildSaoCung(STAR_DATA, TEN_CUNG, CACH_CUC_DATA) {
  const chinhTinh = Object.entries(STAR_DATA)
    .filter(([, d]) => d.type === 'chính tinh')
    .map(([ten]) => ten);

  const out = [];
  for (const sao of chinhTinh) {
    for (const cung of TEN_CUNG) {
      const cachCuc = CACH_CUC_DATA.filter(
        (r) => r.c === cung && Array.isArray(r.s) && r.s.includes(sao)
      );
      out.push({
        sao,
        cung,
        slug: `${slugify(sao)}-cung-${slugify(cung)}`,
        soCachCuc: cachCuc.length,
        cachCuc,
      });
    }
  }
  return out;
}

// ── 4. Nạp âm (bảng tĩnh trong lib/engine/diachi.ts) ────────────────────────
function buildNapAm() {
  const code = readFileSync(`${ROOT}/lib/engine/diachi.ts`, 'utf8');
  const CAN = extractArrayLiteral(code, 'CAN');
  const CHI = extractArrayLiteral(code, 'CHI');
  const NA = extractArrayLiteral(code, 'NA');
  const NA_TEN = extractArrayLiteral(code, 'NA_TEN');
  if (NA_TEN.length !== 30 || NA.length !== 30) {
    throw new Error(
      `NA_TEN/NA lệch khỏi 30 mục (đo: NA_TEN=${NA_TEN.length}, NA=${NA.length}) — ` +
        `nguồn lib/engine/diachi.ts đã đổi shape, dừng lại thay vì đoán.`
    );
  }
  // Mỗi tên nạp âm phủ ĐÚNG 2 vị trí liên tiếp trong chu kỳ 60 (Math.floor(pos/2),
  // khớp `ccInfo()` cùng file). 30 tên × 2 = 60 — không phải 60 trang riêng.
  return NA_TEN.map((ten, i) => {
    const positions = [i * 2, i * 2 + 1];
    const canChi = positions.map((pos) => `${CAN[pos % 10]} ${CHI[pos % 12]}`);
    return { ten, hanh: NA[i], slug: `nap-am-${slugify(ten)}`, canChi };
  });
}

/**
 * Chuẩn hoá LỎNG để bắt biến thể chính tả tiếng Việt phổ biến (KHÔNG dùng để
 * quyết định tự động — chỉ để KHOANH VÙNG nghi vấn cho người đọc báo cáo tự
 * xác nhận). `sĩ/sỹ`, `hỉ/hỷ` gần như chắc chắn là cùng một sao; các cặp khác
 * do slugify() gộp trùng thì vẫn phải đọc TÊN GỐC để phân biệt Phù≠Phụ,
 * Diêu≠Riêu — hai từ khác nghĩa, không phải lỗi gõ dấu.
 */
function chuanHoaLong(s) {
  return s
    .replace(/^Sao\s+/i, '')
    .replace(/sĩ/gi, 'sy')
    .replace(/sỹ/gi, 'sy')
    .replace(/hỉ/gi, 'hy')
    .replace(/hỷ/gi, 'hy')
    .trim();
}

// ── Đối chiếu với tu_dien hiện có (nếu có snapshot) ─────────────────────────
function reconcile(items, snapshotRows, loaiExpected) {
  if (!snapshotRows) return null;
  const rows = snapshotRows.filter((r) => r.loai === loaiExpected);
  const byTen = new Map(rows.map((r) => [r.ten, r]));
  const byTenLong = new Map(rows.map((r) => [chuanHoaLong(r.ten), r]));

  const daCo = [];
  const thieu = [];
  const nghiTrungKhacTen = []; // TÊN khác hẳn engine nhưng CÓ THỂ là cùng một sao — cần người xác nhận
  for (const it of items) {
    const exact = byTen.get(it.ten) || byTen.get(`Sao ${it.ten}`);
    if (exact) {
      daCo.push({ ten: it.ten, tenTuDien: exact.ten, slugMoi: it.slug, slugCu: exact.slug });
      continue;
    }
    const long = byTenLong.get(chuanHoaLong(it.ten));
    if (long) {
      nghiTrungKhacTen.push({ tenEngine: it.ten, tenTuDien: long.ten, slugTuDien: long.slug });
      continue;
    }
    thieu.push(it);
  }
  const tenDaKhop = new Set([
    ...daCo.map((r) => r.tenTuDien),
    ...nghiTrungKhacTen.map((r) => r.tenTuDien),
  ]);
  const khongKhopEngine = rows.filter((r) => !tenDaKhop.has(r.ten));
  return { daCo, thieu, nghiTrungKhacTen, khongKhopEngine };
}

// ── Main ─────────────────────────────────────────────────────────────────
function main() {
  const outPath = arg('out');
  if (!outPath) {
    console.error(
      'Thiếu --out <đường dẫn>. Đây là dữ liệu trung gian, không ghi mặc định vào repo.'
    );
    process.exit(1);
  }
  const snapshotPath = arg('tu-dien-snapshot');
  const snapshot =
    snapshotPath && existsSync(snapshotPath)
      ? JSON.parse(readFileSync(snapshotPath, 'utf8'))
      : null;

  const engineCode = readFileSync(`${ROOT}/public/tuvi-ansao-engine.js`, 'utf8');
  const { STAR_DATA, CACH_CUC_DATA, TEN_CUNG } = loadEngineExports();

  const dupes = findDupeStars(engineCode);
  const sao = buildSao(STAR_DATA);
  const cung = buildCung(TEN_CUNG);
  const saoCung = buildSaoCung(STAR_DATA, TEN_CUNG, CACH_CUC_DATA);
  const napAm = buildNapAm();

  const saoRec = reconcile(sao, snapshot, 'sao-tu-vi');
  const cungRec = reconcile(cung, snapshot, 'cung-tu-vi');

  const soCachCucGan = saoCung.reduce((s, x) => s + x.soCachCuc, 0);
  const soCachCucKhongGan = CACH_CUC_DATA.length - soCachCucGan; // cách cục KHÔNG thuộc một chính tinh×cung nào (ví dụ cách cục theo phụ tinh/sát tinh)

  const report = {
    sinhLuc: new Date().toISOString(),
    sao: { tong: sao.length, dupesTrongNguon: dupes, doiChieu: saoRec },
    cung: { tong: cung.length, doiChieu: cungRec },
    saoCung: {
      tong: saoCung.length,
      coCachCuc: saoCung.filter((x) => x.soCachCuc > 0).length,
      khongCoCachCuc: saoCung.filter((x) => x.soCachCuc === 0).length,
    },
    cachCuc: {
      tong: CACH_CUC_DATA.length,
      ganDuocVaoSaoCung: soCachCucGan,
      conLai: soCachCucKhongGan,
    },
    napAm: { tong: napAm.length },
  };

  const data = { sao, cung, saoCung, napAm };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ report, data }, null, 2));

  console.log('=== BÁO CÁO TRÍCH XƯƠNG THƯ VIỆN ===\n');
  console.log(`Sao (STAR_DATA):        ${sao.length} mục duy nhất`);
  if (dupes.length) {
    console.log(`  🔴 ${dupes.length} khoá TRÙNG trong nguồn (bản sau đè bản trước, ÂM THẦM):`);
    for (const d of dupes) {
      console.log(
        `     - "${d.name}": ${d.typeCu} → ${d.typeMoi}${d.conflict ? '  ⚠️ KHÁC TYPE, cần Henry xác nhận bản đúng' : '  (giống nhau, vô hại)'}`
      );
    }
  }
  if (saoRec) {
    console.log(
      `  Đối chiếu tu_dien(loai=sao-tu-vi, ${snapshot.filter((r) => r.loai === 'sao-tu-vi').length} dòng):`
    );
    console.log(`     - Đã có, tên KHỚP HẲN: ${saoRec.daCo.length}`);
    console.log(
      `     - 🟡 NGHI TRÙNG, tên KHÁC (cần người xác nhận trước khi đụng gì — có thể là 1 sao ghi 2 kiểu, hoặc 2 sao thật khác nhau): ${saoRec.nghiTrungKhacTen.length}`
    );
    for (const r of saoRec.nghiTrungKhacTen) {
      console.log(`       engine "${r.tenEngine}"  ↔  tu_dien "${r.tenTuDien}" (${r.slugTuDien})`);
    }
    console.log(
      `     - MỚI THẬT, không có gì tương tự trong tu_dien (an toàn để insert): ${saoRec.thieu.length}`
    );
    console.log(
      `     - Có trong tu_dien nhưng KHÔNG khớp tên sao nào trong engine (nhóm/khái niệm, không phải sao đơn — GIỮ NGUYÊN, không đụng): ${saoRec.khongKhopEngine.length}`
    );
    if (saoRec.khongKhopEngine.length) {
      console.log(`       ${saoRec.khongKhopEngine.map((r) => r.ten).join(' · ')}`);
    }
  }
  console.log(`\nCung (TEN_CUNG):        ${cung.length} mục`);
  if (cungRec) {
    console.log(
      `  Đối chiếu tu_dien(loai=cung-tu-vi): đã có ${cungRec.daCo.length}/${cung.length}, thiếu ${cungRec.thieu.length}`
    );
  }
  console.log(`\nSao × Cung:             ${saoCung.length} tổ hợp (14 chính tinh × 12 cung)`);
  console.log(`  - Có ít nhất 1 cách cục gắn được: ${report.saoCung.coCachCuc}`);
  console.log(
    `  - KHÔNG có cách cục nào (sẽ ở lại draft, không publish): ${report.saoCung.khongCoCachCuc}`
  );
  console.log(`\nCách cục (CACH_CUC_DATA): ${CACH_CUC_DATA.length} dòng`);
  console.log(`  - Gắn được vào một tổ hợp sao×cung: ${soCachCucGan}`);
  console.log(
    `  - Còn lại (thuộc phụ/sát tinh, tam hợp, xung chiếu — không gắn vào ô chính tinh×cung): ${soCachCucKhongGan}`
  );
  console.log(
    `\nNạp âm:                 ${napAm.length} tên (KHÔNG phải 60 — mỗi tên phủ 2 vị trí trong chu kỳ 60)`
  );
  console.log(`\nĐã ghi: ${outPath}`);
}

main();
