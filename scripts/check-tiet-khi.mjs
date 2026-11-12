#!/usr/bin/env node
// scripts/check-tiet-khi.mjs — `npm run check:tietkhi`
// ============================================================
// Bát Tự lịch cn/kr/jp quyết trụ THÁNG (và trụ NĂM qua Lập Xuân) bằng THỜI ĐIỂM
// vào tiết (bảng `<TIET_KHI_TABLE>` trong public/tubinh-ansao-engine.js, sinh bởi
// scripts/gen-tiet-khi-table.mjs). Lịch vn giữ NGUYÊN đường theo ngày. Bộ dò:
//
//  1. Bảng khớp astronomy-engine tính lại từng phút (bảng không bị sửa tay/cũ).
//  2. Đối chứng NGOÀI: NAOJ (giờ:phút JST, 2005→) lệch ≤ 1 phút; HKO (NGÀY UTC+8
//     1901–2100) khớp trừ đúng danh sách ghim — mỗi mục ghim phải nằm sát nửa
//     đêm UTC+8 và còn lệch thật (hết lệch mà còn ghim cũng ĐỎ).
//  3. Engine (qua đúng lối nạp của lib/engine/tubinh.ts): mọi mốc 1900–2100 × 3
//     lịch, sinh trước/sau mốc 1 phút ⇒ trụ tháng đổi đúng, Lập Xuân đổi trụ năm.
//  4. Ca vàng: sinh ở Seoul/Đài Bắc/Tokyo ±1′/±1h quanh giờ giao tiết NAOJ công
//     bố, đi từ giờ ĐỒNG HỒ nơi sinh qua NoiSinh.quyDoi như form — kèm ca giờ mùa hè.
//  5. Lịch vn KHÔNG đổi: băm TOÀN BỘ kết quả tinhBatTu của mẫu quét 1900–2100 phải
//     ra đúng hash chụp từ engine TRƯỚC W3b; truyền lich:'vn'/không truyền như nhau.
// ============================================================
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire, register } from 'node:module';

const ROOT = process.cwd();
const req = createRequire(import.meta.url);
const { tinhMoc, maHoa, EPOCH_MS } = await import('./gen-tiet-khi-table.mjs');
const fails = [];
const fail = (s) => fails.push(s);

// ── Nạp engine ĐÚNG như lib/engine/tubinh.ts (NoiSinh truyền làm tham số) ──
const tubinhTs = readFileSync(join(ROOT, 'lib/engine/tubinh.ts'), 'utf-8');
if (!tubinhTs.includes("'globalThis', 'NoiSinh', code))(mod, mod.exports, g, g, ns.exports)"))
  fail(
    'lib/engine/tubinh.ts không còn truyền NoiSinh vào engine — lịch cn/kr/jp sẽ lặng lẽ lùi về tiết theo ngày'
  );
const NS = req(join(ROOT, 'public/tools-shared/noi-sinh.js'));
const SRC = readFileSync(join(ROOT, 'public/tubinh-ansao-engine.js'), 'utf-8');
function napEngine(src, noiSinh) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'window', 'globalThis', 'NoiSinh', src)(
    mod,
    mod.exports,
    globalThis,
    globalThis,
    noiSinh
  );
  return mod.exports;
}
const E = napEngine(SRC, NS);

// ── 1. Bảng == astronomy-engine tính lại ──
const goc = SRC.match(/const _TIET_KHI_GOC = '([^']*)'/);
const deltaM = SRC.match(/const _TIET_KHI_DELTA =([\s\S]*?);\n/);
if (!goc || !deltaM) throw new Error('không thấy khối <TIET_KHI_TABLE> trong engine');
const delta = [...deltaM[1].matchAll(/'([0-9a-z]*)'/g)].map((x) => x[1]).join('');
const moc = goc[1].split(',').map((s) => parseInt(s, 36));
for (let i = 0; i < delta.length; i++) moc.push(moc[i] + 525930 + parseInt(delta[i], 36));
const tinhLai = tinhMoc();
const ma = maHoa(tinhLai);
if (ma.goc !== goc[1] || ma.delta !== delta) {
  const i = tinhLai.findIndex((v, k) => v !== moc[k]);
  fail(
    `bảng tiết khí lệch astronomy-engine từ mốc ${i} (${moc[i]} ≠ ${tinhLai[i]}) — chạy lại scripts/gen-tiet-khi-table.mjs --write`
  );
}
const degOf = (i) => (255 + 30 * i) % 360;
const isoAt = (phut, offMin) =>
  new Date(EPOCH_MS + (phut + offMin) * 60000).toISOString().slice(0, 16);

// ── 2a. NAOJ: lệch ≤ 1 phút ──
const naoj = JSON.parse(
  readFileSync(join(ROOT, 'scripts/fixtures/tietkhi-ref-naoj.json'), 'utf-8')
).rows;
let naojSo = 0,
  naojMax = 0;
for (const [deg, jst] of naoj) {
  if (deg % 30 !== 15) continue; // chỉ 12 TIẾT (bội lẻ của 15°) — trung khí không có trong bảng
  const t = (Date.parse(jst + ':00Z') - 540 * 60000 - EPOCH_MS) / 60000;
  const i = moc.findIndex((v, k) => degOf(k) === deg && Math.abs(v - t) < 3 * 1440);
  if (i < 0) {
    fail(`NAOJ ${jst} ${deg}°: không có mốc tương ứng`);
    continue;
  }
  const d = Math.abs(moc[i] - t);
  naojSo++;
  naojMax = Math.max(naojMax, d);
  if (d > 1) fail(`NAOJ ${deg}° ${jst} JST ↔ bảng ${isoAt(moc[i], 540)} JST: lệch ${d} phút`);
}
if (naojSo < 200) fail(`NAOJ: chỉ đối chiếu được ${naojSo} tiết — fixture hỏng?`);

// ── 2b. HKO: ngày UTC+8 ──
// Ghim: HKO lệch một ngày vì tiết rơi sát nửa đêm giờ 120°E (HKO dùng lịch thiên
// văn của họ; vài phút ΔT/làm tròn là đủ đổi ngày). Mỗi mục: [yyyymmdd HKO, độ].
const HKO_GHIM = new Set(
  JSON.parse(readFileSync(join(ROOT, 'scripts/fixtures/tietkhi-hko-ghim.json'), 'utf-8')).ghim.map(
    (x) => x.join('|')
  )
);
const hko = JSON.parse(
  readFileSync(join(ROOT, 'scripts/fixtures/tietkhi-ref-hko.json'), 'utf-8')
).rows;
const ymd8 = (phut) => {
  const s = isoAt(phut, 480);
  return +s.slice(0, 4) * 10000 + +s.slice(5, 7) * 100 + +s.slice(8, 10);
};
let hkoSo = 0;
const hkoLech = [];
for (const [ymd, deg] of hko) {
  if (deg % 30 !== 15) continue;
  const y = Math.floor(ymd / 10000);
  const i = moc.findIndex(
    (v, k) => degOf(k) === deg && Math.abs(ymd8(v) - ymd) < 100 && Math.floor(ymd8(v) / 10000) === y
  );
  if (i < 0) {
    fail(`HKO ${ymd} ${deg}°: không có mốc tương ứng`);
    continue;
  }
  hkoSo++;
  const lech = ymd8(moc[i]) !== ymd;
  const key = `${ymd}|${deg}`;
  if (lech) {
    const hhmm = isoAt(moc[i], 480).slice(11);
    const sat = Math.min(
      ...[0, 1440].map((m) => Math.abs(+hhmm.slice(0, 2) * 60 + +hhmm.slice(3) - m))
    );
    hkoLech.push(`${ymd} ${deg}° (bảng ${isoAt(moc[i], 480)} UTC+8, cách nửa đêm ${sat}′)`);
    if (!HKO_GHIM.has(key))
      fail(`HKO ${ymd} ${deg}° ↔ bảng ${isoAt(moc[i], 480)} UTC+8 — lệch NGÀY, chưa ghim`);
    else if (sat > 10)
      fail(`HKO ghim ${key} nhưng tiết cách nửa đêm ${sat}′ (> 10′) — không phải ca sát biên`);
  } else if (HKO_GHIM.has(key))
    fail(`HKO ghim ${key} nhưng nay KHỚP — gỡ khỏi tietkhi-hko-ghim.json`);
}
if (hkoSo !== 200 * 12) fail(`HKO: đối chiếu ${hkoSo} tiết, cần ${200 * 12}`);

// ── 3. Engine: trước/sau mỗi mốc 1 phút, mọi lịch ──
const THANG = ['Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'];
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const namTru = (y) => CAN[(((y - 4) % 10) + 10) % 10] + ' ' + CHI[(((y - 4) % 12) + 12) % 12];
function tuTruTai(phutUtc, lich) {
  // phút UTC → giờ dân sự của lịch (GIO_LICH — cùng nguồn engine đọc)
  const thu = new Date(EPOCH_MS + (phutUtc + 480) * 60000);
  const off = NS.GIO_LICH[lich](
    thu.getUTCFullYear() * 10000 + (thu.getUTCMonth() + 1) * 100 + thu.getUTCDate()
  );
  const c = new Date(EPOCH_MS + (phutUtc + off) * 60000);
  const [y, m, d, h, p] = [
    c.getUTCFullYear(),
    c.getUTCMonth() + 1,
    c.getUTCDate(),
    c.getUTCHours(),
    c.getUTCMinutes(),
  ];
  if (y < 1900 || y > 2100) return null;
  const r = E.convertDuongToBatTu(d, m, y, h, { lich, gioLich: h, phutLich: p });
  return { nam: r.tuTru[0].can + ' ' + r.tuTru[0].chi, thang: r.tuTru[1].chi };
}
let engSo = 0;
for (const lich of ['cn', 'kr', 'jp']) {
  for (let i = 1; i < moc.length - 1; i++) {
    const truoc = tuTruTai(moc[i] - 1, lich),
      sau = tuTruTai(moc[i], lich);
    if (!truoc || !sau) continue;
    engSo++;
    const kyVong = THANG[(((i - 2) % 12) + 12) % 12],
      kyVongTruoc = THANG[(((i - 3) % 12) + 12) % 12];
    const namSau = namTru(1900 + Math.floor((i - 2) / 12)),
      namTruoc = namTru(1900 + Math.floor((i - 3) / 12));
    if (
      sau.thang !== kyVong ||
      truoc.thang !== kyVongTruoc ||
      sau.nam !== namSau ||
      truoc.nam !== namTruoc
    )
      fail(
        `engine ${lich} mốc ${i} (${degOf(i)}° ${isoAt(moc[i], 0)}Z): trước ${truoc.nam}/${truoc.thang} sau ${sau.nam}/${sau.thang}, cần ${namTruoc}/${kyVongTruoc} → ${namSau}/${kyVong}`
      );
  }
}
if (engSo < 3 * 2400) fail(`engine: chỉ kiểm ${engSo} mốc`);

// ── 4. Ca vàng: giờ đồng hồ nơi sinh → quyDoi → tinhBatTu ──
function batTuNoiSinh(ma, tz, y, m, d, h, p) {
  const q = NS.quyDoi({ nam: y, thang: m, ngay: d, gio: h, phut: p }, ma, tz);
  const GIO_REP = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  const idx = Math.floor((q.gio + 1) / 2) % 12;
  const bt = E.tinhBatTu({
    ngayDL: q.ngay,
    thangDL: q.thang,
    namDL: q.nam,
    gio: GIO_REP[idx],
    gioitinh: 'nam',
    namXem: 2026,
    lich: q.lich,
    gioLich: q.gio,
    phutLich: q.phut,
  });
  return {
    nam: bt.tuTru[0].can + ' ' + bt.tuTru[0].chi,
    thang: bt.tuTru[1].can + ' ' + bt.tuTru[1].chi,
  };
}
const wall = (msUtc, tz) => {
  const off = NS.offsetPhut(tz, msUtc);
  const c = new Date(msUtc + off * 60000);
  return [
    c.getUTCFullYear(),
    c.getUTCMonth() + 1,
    c.getUTCDate(),
    c.getUTCHours(),
    c.getUTCMinutes(),
  ];
};
const NOI = [
  ['KR', 'Asia/Seoul'],
  ['TW', 'Asia/Taipei'],
  ['JP', 'Asia/Tokyo'],
];
// Ca giao tiết lấy THẲNG từ NAOJ (nguồn ngoài) — không từ bảng của mình.
const VANG = [
  [315, '2025-02-03T23:10', 'Giáp Thìn', 'Đinh Sửu', 'Ất Tỵ', 'Mậu Dần'], // Lập Xuân sát nửa đêm: đổi cả trụ năm
  [315, '2024-02-04T17:27', 'Quý Mão', 'Ất Sửu', 'Giáp Thìn', 'Bính Dần'],
  [285, '2025-01-05T11:33', 'Giáp Thìn', 'Bính Tý', 'Giáp Thìn', 'Đinh Sửu'],
  [195, '2025-10-08T09:41', 'Ất Tỵ', 'Ất Dậu', 'Ất Tỵ', 'Bính Tuất'],
  [255, '2010-12-07T14:38', 'Canh Dần', 'Đinh Hợi', 'Canh Dần', 'Mậu Tý'],
];
let vangSo = 0;
for (const [deg, jst, namA, thangA, namB, thangB] of VANG) {
  const ref = naoj.find((r) => r[0] === deg && r[1] === jst);
  if (!ref) {
    fail(`ca vàng ${deg}° ${jst}: không có trong fixture NAOJ`);
    continue;
  }
  const t = Date.parse(jst + ':00Z') - 540 * 60000;
  for (const [ma, tz] of NOI) {
    for (const [dm, namK, thangK] of [
      [-60, namA, thangA],
      [-1, namA, thangA],
      [1, namB, thangB],
      [60, namB, thangB],
    ]) {
      const w = wall(t + dm * 60000, tz);
      const r = batTuNoiSinh(ma, tz, ...w);
      vangSo++;
      if (r.nam !== namK || r.thang !== thangK)
        fail(
          `ca vàng ${ma} ${w.join('-')} (${dm > 0 ? '+' : ''}${dm}′ quanh ${deg}° ${jst} JST): ra ${r.nam}/${r.thang}, cần ${namK}/${thangK}`
        );
    }
  }
}
// Giờ mùa hè: Tokyo 1949 (JST+1 từ 2/4 tới 10/9), Seoul 1987 (KDT 10/5–11/10). Giờ
// đồng hồ lệch giờ chuẩn 1 tiếng — quyDoi trừ đi; mốc lấy từ bảng (đã đối chứng ở 1–3).
for (const [ma, tz, deg, nam] of [
  ['JP', 'Asia/Tokyo', 75, 1949],
  ['KR', 'Asia/Seoul', 135, 1987],
  ['TW', 'Asia/Taipei', 165, 1974],
]) {
  const i = moc.findIndex((v, k) => degOf(k) === deg && isoAt(v, 0).startsWith(String(nam)));
  const t = EPOCH_MS + moc[i] * 60000;
  const dst = NS.offsetPhut(tz, t) !== (ma === 'TW' ? 480 : 540);
  if (!dst) fail(`ca giờ mùa hè ${ma} ${nam}: tzdata không báo giờ mùa hè — chọn ca khác`);
  const a = batTuNoiSinh(ma, tz, ...wall(t - 30 * 60000, tz));
  const b = batTuNoiSinh(ma, tz, ...wall(t + 30 * 60000, tz));
  vangSo += 2;
  const th = (k) => THANG[(((k - 2) % 12) + 12) % 12];
  if (a.thang.split(' ')[1] !== th(i - 1) || b.thang.split(' ')[1] !== th(i))
    fail(
      `ca giờ mùa hè ${ma} ${nam} ${deg}°: ±30′ ra ${a.thang} → ${b.thang}, cần chi ${th(i - 1)} → ${th(i)}`
    );
}

// ── 5. Lịch vn không đổi ──
// Hash chụp từ engine TRƯỚC W3b (origin/main 5499fb6..c5e1619) bằng chính vòng
// quét dưới đây. Đổi đường vn ⇒ đổi tứ trụ người VN đang có ⇒ phải có quyết định.
const VN_HASH = '20ebbdf71431cf6e74f2901577880ebe1f412cfd5690200cff92f9cc6deb65f1';
function quetVn(eng, them) {
  const h = createHash('sha256');
  const jd0 = Date.UTC(1900, 0, 1);
  for (let k = 0; k * 86400000 * 3 + jd0 <= Date.UTC(2100, 11, 31); k++) {
    const c = new Date(jd0 + k * 86400000 * 3);
    const [y, m, d] = [c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate()];
    const gio = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21][k % 12];
    const bt = eng.tinhBatTu({
      ngayDL: d,
      thangDL: m,
      namDL: y,
      gio,
      gioitinh: k % 2 ? 'nu' : 'nam',
      namXem: 2026,
      ...them,
    });
    delete bt.input; // chỉ là tham số vào (có thêm lich/gioLich khi truyền)
    h.update(JSON.stringify(bt) + '|');
  }
  return h.digest('hex');
}
const hVn = quetVn(E, {});
if (process.argv.includes('--in-hash-vn')) console.log(hVn);
if (hVn !== VN_HASH) fail(`lịch vn ĐỔI: hash ${hVn} ≠ ${VN_HASH} — tứ trụ người VN đang có bị đổi`);
if (quetVn(E, { lich: 'vn', gioLich: 5, phutLich: 7 }) !== hVn)
  fail('lich:"vn" kèm giờ phút ra khác không truyền lich');
// Thiếu NoiSinh ⇒ cn lùi về đúng đường theo ngày (có console.error), không ném/không bịa.
{
  const E0 = napEngine(SRC, undefined);
  const err = console.error;
  let bao = 0;
  console.error = () => bao++;
  const a = E0.convertDuongToBatTu(3, 2, 2025, 23, { lich: 'cn', gioLich: 23, phutLich: 30 });
  console.error = err;
  const b = E0.convertDuongToBatTu(3, 2, 2025, 23);
  if (JSON.stringify(a) !== JSON.stringify(b) || !bao)
    fail('thiếu NoiSinh: lịch cn phải lùi về đường theo ngày VÀ console.error');
}

// ── 6. Khoá cache lá số (`lasoKey`, lib/portraits/cache.ts) ──
// Biên dịch cache.ts (+ closure: tubinh, laso, namxem…) bằng tsc rồi import thật,
// như check:payossig. Hai khách kr cùng canh, khác phút, hai bên mốc ⇒ HAI khoá;
// cùng phía ⇒ một khoá; ngoài ±1 ngày quanh mốc và mọi khách vn ⇒ khoá y như
// TRƯỚC W3b (công thức cũ chép lại ở đây làm mốc so).
let khoaSo = 0;
{
  const tmp = mkdtempSync(join(tmpdir(), 'check-tietkhi-'));
  try {
    writeFileSync(
      join(tmp, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          target: 'es2022',
          moduleResolution: 'bundler',
          outDir: join(tmp, 'out'),
          rootDir: ROOT,
          types: ['node'],
          typeRoots: [join(ROOT, 'node_modules/@types')],
          paths: { '@/*': [join(ROOT, '*')] },
          skipLibCheck: true,
          noCheck: true,
        },
        include: [join(ROOT, 'lib/portraits/cache.ts')],
      })
    );
    execFileSync(
      process.execPath,
      [join(ROOT, 'node_modules/typescript/bin/tsc'), '--project', join(tmp, 'tsconfig.json')],
      { stdio: 'inherit' }
    );
    writeFileSync(
      join(tmp, 'hook.mjs'),
      `import { existsSync } from 'node:fs';\nconst OUT = ${JSON.stringify(pathToFileURL(join(tmp, 'out')).href + '/')};\n` +
        `const SRC = ${JSON.stringify(pathToFileURL(ROOT).href.replace(/\/?$/, '/'))};\n` +
        // Thư mục có index.ts (vd '@/lib/i18n/glossary', kéo vào qua cache.ts → lib/llm/locale từ W18)
        // biên dịch thành <thư mục>/index.js — thử cả hai đuôi.
        `const pick = (base) => [base + '.js', base + '/index.js'].map((x) => new URL(x)).find((u) => existsSync(u));\n` +
        `export async function resolve(s, c, n) {\n` +
        `  if (s.startsWith('@/')) { const u = pick(OUT + s.slice(2)); return n(u ? u.href : OUT + s.slice(2) + '.js', c); }\n` +
        `  if (/^\\.\\.?\\//.test(s) && c.parentURL && c.parentURL.startsWith(OUT) && !/\\.[cm]?js$/.test(s)) {\n` +
        `    const u = pick(new URL(s, c.parentURL).href); if (u) return n(u.href, c);\n  }\n` +
        // File .mjs/.js thuần (vd glossary/terms.generated.mjs) tsc KHÔNG chép sang out/ ⇒ đọc thẳng bản nguồn.
        `  if (/^\\.\\.?\\//.test(s) && c.parentURL && c.parentURL.startsWith(OUT) && /\\.[cm]?js$/.test(s)) {\n` +
        `    const u = new URL(s, c.parentURL); if (!existsSync(u)) return n(SRC + u.href.slice(OUT.length), c);\n  }\n` +
        `  return n(s, c);\n}\n`
    );
    register(pathToFileURL(join(tmp, 'hook.mjs')).href);
    const { lasoKey } = await import(pathToFileURL(join(tmp, 'out/lib/portraits/cache.js')).href);
    // Công thức khoá TRƯỚC W3b (origin/main c5e1619) — mốc so cho mọi ca không đổi.
    const khoaCu = (b) =>
      createHash('sha256')
        .update(
          [
            b.isLunar ? 'AL' : 'DL',
            b.year,
            b.month,
            b.day,
            `h${b.hourBranch ?? -1}`,
            b.gender === 'nu' ? 'nu' : 'nam',
            '',
            ...(b.lich && b.lich !== 'vn' ? [`lich:${b.lich}`] : []),
          ].join('|')
        )
        .digest('hex')
        .slice(0, 32);
    const chi = (h) => Math.floor(((h + 1) % 24) / 2);
    const kr = (d, m, y, h, mi) => ({
      day: d,
      month: m,
      year: y,
      hourBranch: chi(h),
      hour: h,
      minute: mi,
      gender: 'nam',
      lich: 'kr',
    });
    const ky = (label, ok) => {
      khoaSo++;
      if (!ok) fail(`lasoKey: ${label}`);
    };
    // Lập Xuân 2025 = 23:10 KST 3/2 (NAOJ): 23:09 và 23:11 cùng canh Tý.
    const a = kr(3, 2, 2025, 23, 9),
      b = kr(3, 2, 2025, 23, 11),
      c = kr(3, 2, 2025, 23, 50);
    ky('kr cùng canh, hai bên Lập Xuân 2025 phải KHÁC khoá', lasoKey(a) !== lasoKey(b));
    ky('kr cùng canh, cùng phía sau mốc phải CÙNG khoá', lasoKey(b) === lasoKey(c));
    ky('kr sát mốc phải khác khoá cũ (có đoạn tk:)', lasoKey(a) !== khoaCu(a));
    // Xa mốc (> 1 ngày): khoá y như trước W3b — không mồ côi cache/quyền sở hữu.
    const xa = kr(20, 2, 2025, 23, 9);
    ky('kr xa mốc phải GIỮ khoá cũ', lasoKey(xa) === khoaCu(xa));
    const thieuPhut = { ...a, hour: undefined, minute: undefined };
    ky('kr không có giờ:phút phải GIỮ khoá cũ', lasoKey(thieuPhut) === khoaCu(thieuPhut));
    // Cùng mốc theo giờ của lịch: cn 22:10 (UTC+8), jp 23:10 (UTC+9).
    for (const [lc, h] of [
      ['cn', 22],
      ['jp', 23],
    ]) {
      const x = { ...kr(3, 2, 2025, h, 9), lich: lc },
        y = { ...x, minute: 11 };
      ky(
        `${lc} hai bên Lập Xuân 2025 (${h}:10 giờ ${lc}) phải KHÁC khoá`,
        lasoKey(x) !== lasoKey(y)
      );
    }
    // vn: khoá giống hệt main cho mọi ngày quanh mốc, có/không giờ phút.
    for (const [d, h, mi] of [
      [3, 23, 9],
      [3, 23, 11],
      [4, 5, 0],
      [20, 13, 30],
    ]) {
      for (const vn of [
        { day: d, month: 2, year: 2025, hourBranch: chi(h), gender: 'nu' },
        { day: d, month: 2, year: 2025, hourBranch: chi(h), hour: h, minute: mi, gender: 'nam' },
        {
          day: d,
          month: 2,
          year: 2025,
          hourBranch: chi(h),
          hour: h,
          minute: mi,
          gender: 'nam',
          lich: 'vn',
        },
      ])
        ky(`vn ${JSON.stringify(vn)} phải giữ khoá main`, lasoKey(vn) === khoaCu(vn));
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(
  `tiết khí: ${moc.length} mốc · NAOJ ${naojSo} tiết (lệch tối đa ${naojMax}′) · HKO ${hkoSo} tiết, ${hkoLech.length} lệch ngày đã ghim · engine ${engSo} mốc × trước/sau · ${vangSo} ca vàng · lasoKey ${khoaSo} ca`
);
if (process.argv.includes('-v')) hkoLech.forEach((s) => console.log('  HKO≠', s));
if (fails.length) {
  console.error(
    `\n✗ ${fails.length} lỗi:\n` +
      fails
        .slice(0, 40)
        .map((s) => '  • ' + s)
        .join('\n')
  );
  process.exit(1);
}
console.log('✓ check:tietkhi xanh');
