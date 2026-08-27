#!/usr/bin/env node
/**
 * BƯỚC 0 của "Ai Sinh Cùng Ngày Với Bạn" — ĐO TRƯỚC KHI XÂY.
 *
 * Trả lời đúng hai câu quyết định kiến trúc, KHÔNG đoán:
 *   T1: mỗi khoá an sao có bao nhiêu người nổi tiếng (có ảnh)? cần ≥5.
 *   T2: bao nhiêu % lá số tìm được người TRÙNG CẢ GIỜ SINH?
 *
 * 🔑 Khoá KHÔNG phải ngày dương. Đã đo trên chính engine của repo: an sao chỉ
 * phụ thuộc (can chi năm · tháng ÂL · ngày ÂL · giờ · giới) — đổi số năm âm đi
 * 60/120 năm mà giữ nguyên bộ đó thì lá số GIỐNG HỆT (0/48 khác biệt). Nên
 * người sinh 1930 khớp thẳng với người sinh 1990 nếu cùng Canh Ngọ + cùng ngày
 * tháng âm + cùng giờ. Không gian khoá vì thế BỊ CHẶN ở ~21.435 thay vì 40.542
 * ngày dương — càng gom nhiều celeb thì càng ĐẶC, không loãng ra.
 *
 * ⚠️ Chạy ở máy CÓ MẠNG NGOÀI. Container phiên Claude Code bị egress proxy chặn
 * query.wikidata.org / qlever / *.wikipedia.org (403 CONNECT) — đã đo, không
 * phải phỏng đoán.
 *
 * Dùng:
 *   node scripts/measure-celeb-density.mjs                    # chỉ T1 (Wikidata)
 *   node scripts/measure-celeb-density.mjs --adb hoso.csv     # thêm T2
 *   node scripts/measure-celeb-density.mjs --sitelinks 10 --endpoint wdqs
 *   node scripts/measure-celeb-density.mjs --years 1990:1990        # thử nhanh 1 năm
 *
 * CSV ADB cần 4 cột (có header, tên cột tuỳ ý miễn đúng thứ tự):
 *   ten,ngay_sinh_ISO,gio_sinh_HH:MM,rating       vd: "X,1952-03-04,07:20,AA"
 * Giờ sinh phải là giờ ĐỊA PHƯƠNG nơi sinh đã quy về UTC+7 sẵn, hoặc thêm cột
 * thứ 5 `utc_offset_phut` để script tự quy đổi.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Node fetch KHÔNG tự đi qua proxy (curl thì có) ───────────
// Đã cắn thật: `curl` trả JSON đúng trong khi `fetch` trần nhận
// "Host not in allowlist" cho CÙNG một host — hai đường egress khác nhau.
// Hai biến này đọc lúc KHỞI ĐỘNG nên không set được từ trong tiến trình đang
// chạy ⇒ tự khởi động lại chính mình một lần với chúng đã bật.
if (process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== '1') {
  const { spawnSync } = await import('child_process');
  const r = spawnSync(process.execPath, [import.meta.filename, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: '1',
      NODE_EXTRA_CA_CERTS: '/root/.ccr/ca-bundle.crt',
      NODE_NO_WARNINGS: '1',
    },
  });
  process.exit(r.status ?? 1);
}

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const MIN_SITELINKS = Number(opt('sitelinks', 15));
const ADB_CSV = opt('adb', null);
const [Y_FROM, Y_TO] = String(opt('years', '1900:2010')).split(':').map(Number);
// Mặc định WDQS: `qlever.cs.uni-freiburg.de` nay 308 sang `qlever.dev` (host
// KHÁC, phải allowlist riêng) — đã đo, không phải phỏng đoán.
const ENDPOINT =
  opt('endpoint', 'wdqs') === 'qlever'
    ? 'https://qlever.dev/api/wikidata'
    : 'https://query.wikidata.org/sparql';
const UA = 'tuviminhbao.com celeb-density research (henryvn2004@gmail.com)';

// ── Engine của repo: nguồn DUY NHẤT cho khoá an sao ──────────
const g = globalThis;
g.window = g;
if (!g.location)
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
const E = new Function(
  'window',
  'globalThis',
  readFileSync(join(ROOT, 'public/tuvi-ansao-engine.js'), 'utf-8') +
    '\nreturn{convertDuongToAm,isLunarSupported,LUNAR_MIN_YMD,LUNAR_MAX_YMD};'
)(g, g);

/**
 * Khoá an sao. `null` khi ngoài tầm bảng âm lịch — KHÔNG được đoán bừa.
 * 🔴 Trước bản vá 2026-08, `convertDuongToAm` BỊA {day:1,month:1,year} cho mọi
 * ngày trước 1900 ⇒ hàng nghìn nhân vật lịch sử sẽ dồn vào ~20 khoá SAI rồi
 * hiện lên dưới badge "CÙNG MỘT LÁ SỐ". Trúng số giả còn tệ hơn không tìm thấy.
 */
function anSaoKey(d, m, y, gioIdx = null, gioitinh = null) {
  if (!E.isLunarSupported(d, m, y)) return null;
  const conv = E.convertDuongToAm(d, m, y, 9);
  if (!conv || !conv.amLich) return null;
  const base = `${conv.canNam}${conv.chiNam}|${conv.amLich.month}|${conv.amLich.day}`;
  if (gioIdx == null) return base;
  return gioitinh == null ? `${base}|h${gioIdx}` : `${base}|h${gioIdx}|${gioitinh}`;
}

/**
 * Tổng số khoá an sao phân biệt trong TRỌN tầm bảng âm lịch — mẫu số thật của
 * mọi phép xác suất ở đây. Đo bằng chính engine, không gõ hằng số.
 * (Đo được: 21.435 khoá cho tầm 1900–2100.)
 */
let _space = null;
function fullKeySpace() {
  if (_space !== null) return _space;
  const seen = new Set();
  const dt = new Date(Date.UTC(1900, 0, 31));
  const end = Date.UTC(2100, 11, 31);
  while (dt.getTime() <= end) {
    const k = anSaoKey(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear());
    if (k) seen.add(k);
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  _space = seen.size;
  return _space;
}

const ASIA = new Set([
  'Q881',
  'Q884',
  'Q148',
  'Q17',
  'Q865',
  'Q869',
  'Q928',
  'Q252',
  'Q833',
  'Q836',
  'Q424',
  'Q819',
  'Q574',
  'Q668',
  'Q843',
]);
const AMERICAS = new Set(['Q30', 'Q16', 'Q96', 'Q155', 'Q414', 'Q298', 'Q739']);

async function sparql(query) {
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
  });
  if (!res.ok)
    throw new Error(`${ENDPOINT} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results.bindings;
}

// Chẻ theo năm: WDQS timeout 60s, một phát cả 111 năm là chết chắc.
const Q = (y) => `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
SELECT ?p ?dob ?country WHERE {
  ?p wdt:P31 wd:Q5 ; wdt:P18 ?img ; wikibase:sitelinks ?sl ;
     p:P569/psv:P569 ?node .
  ?node wikibase:timeValue ?dob ; wikibase:timePrecision ?prec .
  OPTIONAL { ?p wdt:P27 ?country }
  FILTER(?prec >= 11)
  FILTER(?sl >= ${MIN_SITELINKS})
  FILTER(YEAR(?dob) = ${y})
}`;

async function main() {
  console.log(
    `Endpoint: ${ENDPOINT}\nNgưỡng sitelinks: ${MIN_SITELINKS}  ·  BẮT BUỘC có ảnh (P18)`
  );
  console.log(`Tầm bảng âm lịch của engine: ${E.LUNAR_MIN_YMD}–${E.LUNAR_MAX_YMD}\n`);

  const keyCount = new Map();
  const region = { asia: 0, americas: 0, other: 0 };
  let total = 0,
    skippedRange = 0;

  for (let y = Y_FROM; y <= Y_TO; y++) {
    let rows;
    try {
      rows = await sparql(Q(y));
    } catch (e) {
      console.error(`  ${y}: LỖI ${e.message}`);
      continue;
    }
    for (const r of rows) {
      const iso = r.dob.value.slice(0, 10); // "1952-03-04T00:00:00Z"
      const [Y, M, D] = iso.split('-').map(Number);
      const k = anSaoKey(D, M, Y);
      if (!k) {
        skippedRange++;
        continue;
      }
      keyCount.set(k, (keyCount.get(k) || 0) + 1);
      const c = r.country?.value?.split('/').pop();
      region[ASIA.has(c) ? 'asia' : AMERICAS.has(c) ? 'americas' : 'other']++;
      total++;
    }
    process.stdout.write(`\r  đã quét ${y} — ${total} người, ${keyCount.size} khoá`);
  }
  console.log('\n');

  // Không có dòng nào thì DỪNG. In "NaN%" là đúng thứ bệnh cả bản vá này đi
  // chữa: báo cáo trông như đã đo trong khi chưa đo được gì.
  if (total === 0) {
    console.error('❌ KHÔNG lấy được dòng nào — chưa đo được gì, đừng đọc số bên dưới.');
    console.error(
      '   Nếu lỗi là "Host not in allowlist": thêm vào egress allowlist của môi trường:'
    );
    console.error('     qlever.cs.uni-freiburg.de · query.wikidata.org · www.wikidata.org');
    process.exitCode = 1;
    // T2 không cần mạng → vẫn đo được nếu có CSV.
    if (ADB_CSV) measureT2();
    return;
  }

  const sizes = [...keyCount.values()].sort((a, b) => a - b);
  const pct = (n) => ((100 * n) / keyCount.size).toFixed(1) + '%';
  const med = sizes[Math.floor(sizes.length / 2)];
  console.log('══ T1 — người/khoá an sao ══');
  console.log(
    `  Tổng: ${total} người  ·  ${keyCount.size} khoá  ·  TB ${(total / keyCount.size).toFixed(2)}  ·  trung vị ${med}`
  );
  console.log(
    `  Khoá có ≥5 người: ${pct(sizes.filter((s) => s >= 5).length)}   ← cần CAO, đây là tỉ lệ đầy 5 slot`
  );
  console.log(`  Khoá có ≥1 người: ${pct(sizes.filter((s) => s >= 1).length)}`);
  console.log(`  Ngoài tầm âm lịch, đã BỎ: ${skippedRange}`);
  console.log(`  Châu Á ${region.asia} · Mỹ ${region.americas} · khác ${region.other}`);
  if (Number(pct(sizes.filter((s) => s >= 5).length).replace('%', '')) < 60) {
    console.log('  ⚠️  Dưới 60% → hạ ngưỡng --sitelinks rồi đo lại TRƯỚC khi build.');
  }

  if (!ADB_CSV) {
    console.log('\n(bỏ qua T2 — chạy lại với --adb <file.csv>)');
    return;
  }
  measureT2();
}

// ── T2 — offline: chỉ cần CSV + engine, KHÔNG cần mạng ───────
function measureT2() {
  /**
   * Tách một dòng CSV, TÔN TRỌNG dấu nháy kép.
   * 🪤 `split(',')` trần đã cắn thật: tên ADB là "Họ, Tên" — dấu phẩy NẰM TRONG
   * ô có nháy — nên mọi trường bị lệch một nấc và 50.803/51.827 dòng bị loại im
   * lặng, trong khi script vẫn in ra một con số T2 trông rất hợp lý (0,40%).
   * Đúng loại "xanh oan" mà cả đợt này đi chữa.
   */
  function csvFields(line) {
    const out = [];
    let cur = '',
      q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((f) => f.trim());
  }

  // ── T2: trùng cả giờ sinh ──────────────────────────────────
  const lines = readFileSync(ADB_CSV, 'utf-8').trim().split('\n').slice(1);
  const t2 = new Map();
  // T2b (bỏ giới) phải đếm khoá PHÂN BIỆT của riêng nó — lấy `t2.size × 2` là
  // ngầm giả định không hai người khác giới nào trùng ngày+giờ, tức CHẶN TRÊN
  // chứ không phải số thật.
  const t2b = new Set();
  let usable = 0,
    dropped = 0;
  for (const line of lines) {
    const [, iso, hhmm, rating, off, gt] = csvFields(line);
    if (!/^(AA|A)$/i.test(rating || '')) {
      dropped++;
      continue;
    }
    const [Y, M, D] = (iso || '').split('-').map(Number);
    const [hh, mi] = (hhmm || '').split(':').map(Number);
    // Múi giờ TRỐNG là không quy được về giờ VN — bỏ, KHÔNG mặc định +7:
    // đoán múi giờ là đoán luôn canh giờ ⇒ T2 cho ra "trùng lá số" GIẢ.
    if (!Y || !Number.isFinite(hh) || off === '' || !Number.isFinite(Number(off))) {
      dropped++;
      continue;
    }
    // Quy về giờ VN đúng như form người dùng làm (public/tuvi-form.js `toVnHour`)
    let mins = hh * 60 + (mi || 0) + (420 - Number(off));
    mins = ((mins % 1440) + 1440) % 1440;
    const gioIdx = Math.floor(((mins + 60) % 1440) / 120) % 12;
    if (!anSaoKey(D, M, Y)) {
      dropped++;
      continue;
    }
    // Dùng GIỚI TÍNH THẬT của hồ sơ. Đếm cả 'nam' lẫn 'nu' cho mỗi người là
    // thổi phồng độ phủ gấp đôi — giới tính vào khoá thì mỗi người chỉ chiếm
    // ĐÚNG một ô.
    const genders = gt === 'nam' || gt === 'nu' ? [gt] : ['nam', 'nu'];
    for (const g of genders) {
      const k = anSaoKey(D, M, Y, gioIdx, g);
      if (k) t2.set(k, (t2.get(k) || 0) + 1);
    }
    t2b.add(anSaoKey(D, M, Y, gioIdx));
    usable++;
  }
  // 🔴 Mẫu số phải là KHÔNG GIAN KHOÁ ĐẦY ĐỦ (suy từ engine), KHÔNG phải số khoá
  // tình cờ có celeb — lấy cái sau là chia cho mẫu số nhỏ hơn thật ⇒ THỔI PHỒNG
  // xác suất T2. Đúng loại "xanh oan" mà cả bản vá này đi chữa.
  const SPACE = fullKeySpace() * 12 * 2;
  console.log('\n══ T2 — trùng cả giờ sinh ══');
  console.log(`  Hồ sơ AA/A dùng được: ${usable}  (bỏ ${dropped})`);
  console.log(`  Không gian khoá đầy đủ: ${SPACE} ô  ·  đã phủ ${t2.size}`);
  console.log(`  ⇒ P(một lá số bất kỳ trúng T2) ≈ ${((100 * t2.size) / SPACE).toFixed(2)}%`);
  console.log(
    `  ⇒ P(trúng T2b, bỏ giới)      ≈ ${((100 * t2b.size) / (fullKeySpace() * 12)).toFixed(2)}%`
  );

  writeFileSync(
    join(ROOT, 'celeb-density.json'),
    JSON.stringify(
      {
        minSitelinks: MIN_SITELINKS,
        keySpace: fullKeySpace(),
        t2Keys: t2.size,
        t2bKeys: t2b.size,
        t2Space: SPACE,
        adbUsable: usable,
        adbDropped: dropped,
      },
      null,
      2
    )
  );
  console.log('\nĐã ghi celeb-density.json');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
