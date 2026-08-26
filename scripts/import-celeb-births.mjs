#!/usr/bin/env node
/**
 * Nhập kho "Ai Sinh Cùng Ngày Với Bạn" → bảng `celeb_births`.
 *
 *   Wikidata (CC0)        → danh tính · ngày sinh · ảnh Commons · nghề · quốc tịch
 *   Astro-Databank (CSV)  → GIỜ sinh + múi giờ + Rodden rating  (nhiên liệu T2)
 *   engine của repo       → khoá an sao (ÂM LỊCH, không phải ngày dương)
 *
 * Dùng:
 *   node scripts/import-celeb-births.mjs --dry --from 1990 --to 1990   # in ra, KHÔNG ghi
 *   node scripts/import-celeb-births.mjs --adb adb.csv --from 1900 --to 2010
 *
 * ── VÌ SAO KHÔNG DÙNG PAGEVIEWS ─────────────────────────────
 * Bản phác ban đầu xếp hạng bằng pageviews vi/en/cjk. Đo lại thì đó là ~1 triệu
 * request (350k người × 3 wiki) — không khả thi. Thứ THỰC SỰ cần biết là
 * "người Việt có biết ông này không", và câu đó trả lời được MIỄN PHÍ ngay
 * trong SPARQL: có bài trên vi.wikipedia hay không. Sitelink là proxy tốt và
 * lấy được trong cùng một truy vấn.
 *
 * ── QUY GIỜ QUA NỬA ĐÊM KHÔNG ĐỔI NGÀY — CỐ Ý ───────────────
 * Sinh 13:54 ở UTC−5 ⇒ giờ VN (UTC+8 thời 1952) là 02:54 NGÀY HÔM SAU. Script
 * này lấy canh giờ theo giờ VN nhưng giữ NGUYÊN ngày dương đã nhập — vì
 * `TuviForm.getData()` làm đúng như vậy cho người dùng (`ngay/thang/nam` giữ
 * nguyên, chỉ `gioIdx` quy đổi). Không phải vì nó đúng cổ pháp hơn, mà vì
 * NGƯỜI DÙNG và NGƯỜI NỔI TIẾNG bắt buộc phải cùng một quy ước thì phép so
 * "trùng lá số" mới có nghĩa. Đổi quy ước này là đổi lá số của mọi người dùng
 * đã sinh ở nước ngoài — việc riêng, không nhét vào đây.
 *
 * ── ẢNH & GHI CÔNG ──────────────────────────────────────────
 * `P18` của Wikidata LUÔN trỏ tới Commons, mà Commons chỉ nhận ảnh license tự
 * do ⇒ khỏi xét license từng cái. KHÔNG kéo tên tác giả về (350k ảnh = 7.000
 * request): UI link thẳng tới trang mô tả file trên Commons, nơi có sẵn tác giả
 * + license — đó là cách ghi công chuẩn và đủ cho CC BY-SA.
 */
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

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const ROOT = new URL('..', import.meta.url).pathname;
const require_ = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const has = (f) => argv.includes('--' + f);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const Y_FROM = Number(opt('from', 1900));
const Y_TO = Number(opt('to', 2010));
const MIN_SITELINKS = Number(opt('sitelinks', 5));
const ADB_CSV = opt('adb', null);
const DRY = has('dry');
// Container phiên Claude Code KHÔNG có SUPABASE_SERVICE_KEY (env nằm ở Vercel),
// nên có đường ghi ra SQL để nạp bằng kênh khác. Mẻ lớn vẫn nên chạy bằng REST
// ở máy có key — 350k dòng qua SQL text là phí.
const SQL_OUT = opt('sql-out', null);
const UA = 'tuviminhbao.com celeb-births import (henryvn2004@gmail.com)';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Múi giờ: CÙNG module mà form người dùng chạy ─────────────
// Chép sang đây là hai bản trôi khỏi nhau im lặng — `npm run check:vntz` canh.
const VnTz = require_(join(ROOT, 'public/tools-shared/vn-timezone.js'));

// ── Engine an sao của repo — nguồn số DUY NHẤT ───────────────
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
    '\nreturn{convertDuongToAm,isLunarSupported};'
)(g, g);

/**
 * Khoá an sao. `null` khi ngoài tầm bảng âm lịch — KHÔNG đoán.
 * 🔴 Trước bản vá #622, engine BỊA {day:1,month:1,year} cho mọi ngày trước
 * 1900 ⇒ hàng nghìn nhân vật lịch sử dồn vào ~20 khoá SAI rồi hiện lên dưới
 * badge "CÙNG MỘT LÁ SỐ". Trúng số GIẢ còn tệ hơn không tìm thấy ai.
 */
function keys(d, m, y, gioIdx, gender) {
  if (!E.isLunarSupported(d, m, y)) return null;
  const c = E.convertDuongToAm(d, m, y, 9);
  if (!c?.amLich) return null;
  const t1 = `${c.canNam}${c.chiNam}|${c.amLich.month}|${c.amLich.day}`;
  const t2b = gioIdx == null ? null : `${t1}|h${gioIdx}`;
  return {
    key_t1: t1,
    key_t2b: t2b,
    key_t2: t2b && gender ? `${t2b}|${gender}` : null,
    key_t0: `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}

// ── Vùng, để xếp ưu tiên Á > Mỹ > Âu > khác ──────────────────
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
  'Q334',
  'Q672',
  'Q902',
  'Q846',
  'Q858',
  'Q265',
  'Q232',
  'Q863',
  'Q813',
  'Q1049',
  'Q805',
  'Q796',
  'Q794',
  'Q878',
  'Q851',
  'Q810',
  'Q817',
  'Q822',
  'Q801',
  'Q79',
]);
const AMERICAS = new Set([
  'Q30',
  'Q16',
  'Q96',
  'Q155',
  'Q414',
  'Q298',
  'Q739',
  'Q750',
  'Q717',
  'Q736',
  'Q733',
  'Q77',
  'Q800',
  'Q774',
  'Q786',
  'Q790',
  'Q241',
  'Q811',
  'Q804',
  'Q783',
]);
const EUROPE = new Set([
  'Q142',
  'Q183',
  'Q145',
  'Q38',
  'Q29',
  'Q34',
  'Q35',
  'Q20',
  'Q33',
  'Q39',
  'Q31',
  'Q55',
  'Q36',
  'Q213',
  'Q214',
  'Q28',
  'Q218',
  'Q45',
  'Q41',
  'Q219',
  'Q211',
  'Q37',
  'Q191',
  'Q27',
  'Q40',
  'Q347',
  'Q32',
  'Q233',
  'Q159',
  'Q212',
  'Q184',
  'Q403',
  'Q225',
  'Q215',
  'Q224',
  'Q222',
  'Q221',
  'Q236',
]);
const regionOf = (qids) => {
  for (const q of qids) if (ASIA.has(q)) return 'asia';
  for (const q of qids) if (AMERICAS.has(q)) return 'americas';
  for (const q of qids) if (EUROPE.has(q)) return 'europe';
  return 'other';
};

// ── Nghề CHẶN — "bạn cùng lá số với Pol Pot" là thảm hoạ ─────
// Lọc thô ở tầng nhập; cột `blocked` trong bảng để rà tay phần còn sót.
const BLOCK_OCC = new Set([
  'Q1035455', // kẻ giết người hàng loạt
  'Q484188', // tội phạm
  'Q1799072', // kẻ sát nhân
  'Q2159907', // khủng bố
  'Q13381863', // độc tài
  'Q10598904', // tội phạm chiến tranh
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERY = (y) => `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
SELECT ?p ?dob ?sl ?gender ?viTitle ?enTitle (SAMPLE(?img) AS ?img)
       (GROUP_CONCAT(DISTINCT ?occ;   separator="|") AS ?occs)
       (GROUP_CONCAT(DISTINCT ?ctry;  separator="|") AS ?ctries)
       (GROUP_CONCAT(DISTINCT ?cjk;   separator="|") AS ?cjks) WHERE {
  ?p wdt:P31 wd:Q5 ; wdt:P18 ?img ; wikibase:sitelinks ?sl ;
     p:P569/psv:P569 ?node .
  ?node wikibase:timeValue ?dob ; wikibase:timePrecision ?prec .
  FILTER(?prec >= 11) FILTER(?sl >= ${MIN_SITELINKS}) FILTER(YEAR(?dob) = ${y})
  OPTIONAL { ?p wdt:P21 ?gender }
  OPTIONAL { ?p wdt:P27 ?ctry }
  OPTIONAL { ?p wdt:P106 ?occ }
  OPTIONAL { ?vi schema:about ?p ; schema:isPartOf <https://vi.wikipedia.org/> ; schema:name ?viTitle }
  OPTIONAL { ?en schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle }
  OPTIONAL { ?c schema:about ?p ; schema:isPartOf ?cjk .
             FILTER(?cjk IN (<https://zh.wikipedia.org/>, <https://ko.wikipedia.org/>, <https://ja.wikipedia.org/>)) }
}
GROUP BY ?p ?dob ?sl ?gender ?viTitle ?enTitle`;

async function sparql(q) {
  const res = await fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`,
    { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results.bindings;
}

/**
 * Chuẩn hoá tên để ghép Wikidata ↔ Astro-Databank.
 * ADB ghi "Họ, Tên"; Wikidata ghi "Tên Họ". Bỏ dấu, bỏ chấm phẩy, sắp từ theo
 * thứ tự chữ cái ⇒ "Blasetti, Alessandro" và "Alessandro Blasetti" ra CÙNG khoá.
 * ⚠️ Chỉ dùng KÈM ngày sinh trùng khít — tên không thôi thì trùng nhau đầy.
 */
function nameKey(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

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

/** Chỉ mục ADB: `nameKey|YYYY-MM-DD` → { hhmm, off, rodden }. */
function loadAdb(path) {
  const idx = new Map();
  if (!path) return idx;
  for (const line of readFileSync(path, 'utf-8').trim().split('\n').slice(1)) {
    const [ten, iso, hhmm, rodden, off] = csvFields(line);
    if (!/^(AA|A)$/i.test(rodden || '')) continue; // chỉ giờ ĐÁNG TIN
    if (!iso || !hhmm || off === '' || !Number.isFinite(Number(off))) continue;
    idx.set(`${nameKey(ten)}|${iso}`, { hhmm, off: Number(off), rodden: rodden.toUpperCase() });
  }
  return idx;
}

async function upsert(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SB_URL}/rest/v1/celeb_births?on_conflict=qid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/**
 * Q-id → nhãn tiếng Việt (rơi về tiếng Anh). Wikidata trả nghề/quốc tịch dưới
 * dạng Q-id; UI cần chữ người đọc được. Hỏi MỘT lần cho toàn bộ Q-id phân biệt
 * của cả mẻ (~vài nghìn) thay vì kèm `SERVICE wikibase:label` vào truy vấn
 * chính — kèm vào đó thì mỗi năm phải gánh lại toàn bộ nhãn.
 */
async function resolveLabels(qids) {
  const out = new Map();
  const list = [...qids].filter(Boolean);
  for (let i = 0; i < list.length; i += 400) {
    const chunk = list.slice(i, i + 400);
    const q = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?x ?xLabel WHERE {
  VALUES ?x { ${chunk.map((q2) => 'wd:' + q2).join(' ')} }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
}`;
    try {
      for (const r of await sparql(q)) {
        const id = r.x.value.split('/').pop();
        const lab = r.xLabel?.value;
        // Nhãn rỗng thì service trả lại chính Q-id — đừng lưu "Q10800557" làm nghề.
        if (lab && !/^Q\d+$/.test(lab)) out.set(id, lab);
      }
    } catch (e) {
      console.error(`  nhãn: ${e.message}`);
    }
    await sleep(200);
  }
  return out;
}

async function main() {
  if (!DRY && !SQL_OUT && (!SB_URL || !SB_KEY)) {
    console.error(
      '❌ Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY. Chạy --dry để xem trước, hoặc --sql-out <file> để ghi ra SQL.'
    );
    process.exitCode = 1;
    return;
  }
  const adb = loadAdb(ADB_CSV);
  console.log(`Astro-Databank: ${adb.size} hồ sơ AA/A có giờ + múi giờ`);
  console.log(`Wikidata: ${Y_FROM}–${Y_TO}, sitelinks ≥ ${MIN_SITELINKS}, bắt buộc có ảnh (P18)`);
  console.log(DRY ? '⚠️  --dry: KHÔNG ghi vào DB\n' : '');

  const sqlRows = [];
  const needLabel = new Set();
  const allRows = [];
  const stat = { rows: 0, withTime: 0, outOfRange: 0, blocked: 0, vi: 0, asia: 0 };
  const preview = [];

  for (let y = Y_FROM; y <= Y_TO; y++) {
    let bind;
    try {
      bind = await sparql(QUERY(y));
    } catch (e) {
      console.error(`\n  ${y}: LỖI ${e.message}`);
      continue;
    }

    // Chốt chặn trùng: `P18` (và vài thuộc tính khác) ĐA TRỊ nên một người có
    // thể ra nhiều dòng. Upsert theo `qid` vẫn đúng, nhưng SỐ ĐẾM thì sai —
    // và một con số sai mà trông hợp lý là thứ đắt nhất ở đây.
    const batch = [];
    const seenQid = new Set();
    for (const r of bind) {
      const qid = r.p.value.split('/').pop();
      if (seenQid.has(qid)) continue;
      seenQid.add(qid);
      const iso = r.dob.value.slice(0, 10);
      const [Y, M, D] = iso.split('-').map(Number);

      const occs = (r.occs?.value || '')
        .split('|')
        .filter(Boolean)
        .map((u) => u.split('/').pop());
      if (occs.some((o) => BLOCK_OCC.has(o))) {
        stat.blocked++;
        continue;
      }

      const ctries = (r.ctries?.value || '')
        .split('|')
        .filter(Boolean)
        .map((u) => u.split('/').pop());
      const gq = r.gender?.value?.split('/').pop();
      const gender = gq === 'Q6581097' ? 'nam' : gq === 'Q6581072' ? 'nu' : null;

      // Giờ sinh từ ADB — ghép bằng (tên chuẩn hoá + ngày sinh trùng khít)
      const name = r.viTitle?.value || r.enTitle?.value || qid;
      const hit = adb.get(`${nameKey(name)}|${iso}`);
      let gioIdx = null,
        birth_time = null,
        tzOff = null,
        rodden = null;
      if (hit) {
        const [hh, mi] = hit.hhmm.split(':').map(Number);
        // Quy về giờ VN bằng ĐÚNG hàm form người dùng chạy
        const vn = VnTz.toVnHour(hh, mi || 0, hit.off, D, M, Y);
        gioIdx = VnTz.hourMinToGioIdx(vn.h, vn.m);
        birth_time = hit.hhmm;
        tzOff = hit.off;
        rodden = hit.rodden;
        stat.withTime++;
      }

      const k = keys(D, M, Y, gioIdx, gender);
      if (!k) {
        stat.outOfRange++;
        continue;
      }

      const region = regionOf(ctries);
      const hasVi = !!r.viTitle?.value;
      const cjk = (r.cjks?.value || '').split('|').filter(Boolean).length;
      if (hasVi) stat.vi++;
      if (region === 'asia') stat.asia++;

      // Điểm nổi tiếng THEO THỊ TRƯỜNG VIỆT. Có bài viwiki là tín hiệu mạnh
      // nhất và đắt hơn hẳn tổng số sitelink — người Việt biết mới là điều
      // feature này cần, không phải nổi tiếng toàn cầu.
      const sl = Number(r.sl.value);
      const fame =
        (hasVi ? 40 : 0) + cjk * 6 + Math.min(sl, 120) * 0.5 + (region === 'asia' ? 8 : 0);

      const row = {
        qid,
        name,
        occupation: occs[0] || null,
        country: ctries[0] || null,
        region,
        wiki_url: r.viTitle?.value
          ? `https://vi.wikipedia.org/wiki/${encodeURIComponent(r.viTitle.value.replace(/ /g, '_'))}`
          : r.enTitle?.value
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.enTitle.value.replace(/ /g, '_'))}`
            : null,
        image_file: decodeURIComponent(r.img.value.split('Special:FilePath/').pop()),
        birth_date: iso,
        birth_time,
        birth_tz_off: tzOff,
        rodden,
        gio_idx: gioIdx,
        gender,
        ...k,
        fame_score: Number(fame.toFixed(2)),
        sitelinks: sl,
        updated_at: new Date().toISOString(),
      };
      batch.push(row);
      needLabel.add(row.occupation);
      needLabel.add(row.country);
      if (preview.length < 6 && hit) preview.push(row);
      stat.rows++;
    }

    allRows.push(...batch);
    if (SQL_OUT) sqlRows.push(...batch);
    // 🔴 KHÔNG upsert ở đây. `row.occupation`/`row.country` lúc này vẫn là
    // Q-id thô — `resolveLabels()` chỉ chạy MỘT lần, SAU vòng lặp năm, để
    // khỏi gánh lại nhãn mỗi năm. Ghi sớm ở đây từng đưa Q-id thẳng vào DB mà
    // KHÔNG BAO GIỜ được sửa lại — không có upsert nào chạy lại sau khi nhãn
    // đã dịch. Nhánh SQL_OUT không dính lỗi này vì nó chỉ ghép chuỗi SQL ở
    // cuối hàm, sau khi `allRows` (cùng tham chiếu object với `sqlRows`) đã
    // được `resolveLabels()` sửa tại chỗ.
    process.stdout.write(
      `\r  ${y} — ${stat.rows} dòng · ${stat.withTime} có giờ · ${stat.vi} có bài viwiki`
    );
    await sleep(200);
  }

  const labels = await resolveLabels(needLabel);
  for (const r of allRows) {
    r.occupation = labels.get(r.occupation) || null;
    r.country = labels.get(r.country) || null;
  }
  console.log(`\n\nDịch nhãn: ${labels.size}/${needLabel.size} Q-id ra chữ đọc được`);

  if (!DRY && !SQL_OUT) {
    console.log(`Ghi ${allRows.length} dòng vào DB (mẻ 500, SAU khi đã dịch nhãn)...`);
    let ghi = 0,
      loiMe = 0;
    for (let i = 0; i < allRows.length; i += 500) {
      const mieng = allRows.slice(i, i + 500);
      try {
        await upsert(mieng);
        ghi += mieng.length;
      } catch (e) {
        loiMe++;
        console.error(`\n  mẻ ${i}-${i + mieng.length}: ghi lỗi — ${e.message}`);
      }
      process.stdout.write(`\r  đã ghi ${Math.min(i + 500, allRows.length)}/${allRows.length}`);
    }
    console.log(`\n✅ Ghi DB xong: ${ghi}/${allRows.length} dòng (${loiMe} mẻ lỗi).`);
  }
  console.log(`Tổng           : ${stat.rows}`);
  console.log(
    `  có giờ sinh  : ${stat.withTime}  (${((100 * stat.withTime) / (stat.rows || 1)).toFixed(1)}%) ← nhiên liệu T2`
  );
  console.log(`  có bài viwiki: ${stat.vi}  (${((100 * stat.vi) / (stat.rows || 1)).toFixed(1)}%)`);
  console.log(
    `  châu Á       : ${stat.asia}  (${((100 * stat.asia) / (stat.rows || 1)).toFixed(1)}%)`
  );
  console.log(`  bỏ (nghề chặn / ngoài tầm âm lịch): ${stat.blocked} / ${stat.outOfRange}`);
  if (preview.length) {
    console.log('\nMẫu có giờ sinh (kiểm mắt trước khi tin cả mẻ):');
    for (const r of preview) {
      console.log(
        `  ${r.name} · ${r.birth_date} ${r.birth_time} (UTC${r.birth_tz_off >= 0 ? '+' : ''}${r.birth_tz_off / 60}) → chi#${r.gio_idx} · ${r.gender} · ${r.region} · ${r.rodden}`
      );
      console.log(`     T2=${r.key_t2}  T1=${r.key_t1}`);
    }
  }
  if (SQL_OUT) {
    const q = (v) =>
      v === null || v === undefined
        ? 'null'
        : typeof v === 'number'
          ? String(v)
          : `'${String(v).replace(/'/g, "''")}'`;
    const COLS = [
      'qid',
      'name',
      'occupation',
      'country',
      'region',
      'wiki_url',
      'image_file',
      'birth_date',
      'birth_time',
      'birth_tz_off',
      'rodden',
      'gio_idx',
      'gender',
      'key_t1',
      'key_t2b',
      'key_t2',
      'key_t0',
      'fame_score',
      'sitelinks',
    ];
    const body = sqlRows
      .map((r) => '(' + COLS.map((c) => q(r[c] ?? null)).join(',') + ')')
      .join(',\n');
    writeFileSync(
      SQL_OUT,
      `insert into public.celeb_births (${COLS.join(',')}) values\n${body}\non conflict (qid) do update set\n` +
        COLS.filter((c) => c !== 'qid')
          .map((c) => `  ${c} = excluded.${c}`)
          .join(',\n') +
        ';\n'
    );
    console.log(`\nĐã ghi ${SQL_OUT} — ${sqlRows.length} dòng`);
  }

  if (stat.rows === 0) {
    console.error('\n❌ 0 dòng — chưa đo được gì, đừng tin số bên trên.');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
