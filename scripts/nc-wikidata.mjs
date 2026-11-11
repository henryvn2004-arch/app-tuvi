// scripts/nc-wikidata.mjs — nạp nhãn tên + sitelinks Wikidata cho hồ sơ Nghiệm Chứng (0 token LLM).
//
//   node scripts/nc-wikidata.mjs [--source db|files|all] [--limit N] [--out file.json] [--refresh]
//
// Đọc `qid` từ nc_ho_so (db) và/hoặc data/nghiem-chung/ho-so/*.json.gz (files), hỏi Wikidata
// (wbgetentities, 50 QID/lượt, ≥1 giây giữa hai lượt) rồi ghi:
//   · bảng `nc_wikidata` (cần SUPABASE_URL + SUPABASE_SERVICE_KEY và đã chạy migration), HOẶC
//   · file JSON `--out` (không có DB, vd. phiên container). `scripts/nc-i18n.mjs next --wikidata <file>` đọc file này.
// ⚠ Container có proxy: chạy với `NODE_USE_ENV_PROXY=1` (fetch của Node không tự đi qua proxy, curl thì có).
// Idempotent: QID đã có thì bỏ qua (nạp bù chỗ thiếu); `--refresh` ép nạp lại.
//
// Điểm ưu tiên theo ngôn ngữ (cao = dịch trước): có bài ở wiki của ngôn ngữ đó (+1.000.000 — người đó ĐƯỢC BIẾT
// ở nước đó) + tổng số sitelink toàn Wikidata (độ nổi tiếng chung). en→enwiki, ja→jawiki, ko→kowiki,
// zh-tw/zh-cn→zhwiki. Nhãn tên: `labels[locale]` — đây là tên bản địa dùng làm gợi ý cho người dịch.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const SOURCE = opt('--source', 'files');
const LIMIT = Number(opt('--limit', '0')) || Infinity;
const OUT = opt('--out', '');
const REFRESH = args.includes('--refresh');
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const coDb = !!SB && !!KEY && /^https?:\/\/\S+$/.test(SB);
const ROOT = new URL('..', import.meta.url).pathname;
const UA = 'tuviminhbao-nc-i18n/1.0 (wikidata label cache; contact via site)';

const WIKI = { en: 'enwiki', ja: 'jawiki', ko: 'kowiki', 'zh-tw': 'zhwiki', 'zh-cn': 'zhwiki' };
// Thứ tự nhãn Wikidata chấp nhận cho từng ngôn ngữ trang (nhãn đầu tiên có thật thắng).
const LABEL_ORDER = {
  en: ['en'],
  ja: ['ja'],
  ko: ['ko'],
  'zh-tw': ['zh-tw', 'zh-hant', 'zh-hk', 'zh'],
  'zh-cn': ['zh-cn', 'zh-hans', 'zh-sg', 'zh'],
};
const LANGS = [...new Set(Object.values(LABEL_ORDER).flat())].join('|');
// Nhãn `zh` trên Wikidata thường là GIẢN thể: khi zh-tw phải lùi về nó thì đổi sang phồn thể bằng OpenCC (gợi ý, người dịch vẫn soát).
let cn2tw = null;
try {
  cn2tw = (await import('opencc-js')).Converter({ from: 'cn', to: 'tw' });
} catch {
  console.error(
    '(không có opencc-js — nhãn zh-tw lùi về `zh` sẽ giữ nguyên chữ giản thể; chạy npm ci)'
  );
}

async function sb(path, init = {}) {
  const r = await fetch(`${SB}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split('?')[0]}: ${r.status} ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
}

function qidsFromFiles() {
  const dir = join(ROOT, 'data/nghiem-chung/ho-so');
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json.gz')) continue;
    const h = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString('utf8'));
    if (h.qid) out.push(h.qid);
  }
  return out;
}

async function qidsFromDb() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await sb(`/nc_ho_so?select=qid&order=slug.asc&limit=1000&offset=${from}`);
    out.push(...rows.map((r) => r.qid));
    if (rows.length < 1000) break;
  }
  return out;
}

async function hoi(qids) {
  const u = new URL('https://www.wikidata.org/w/api.php');
  u.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: qids.join('|'),
    props: 'labels|sitelinks',
    languages: LANGS,
    format: 'json',
    maxlag: '5',
  }).toString();
  for (let t = 0; t < 4; t++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((s) => setTimeout(s, 3000 * (t + 1)));
      continue;
    }
    const j = await r.json();
    if (j.error?.code === 'maxlag') {
      await new Promise((s) => setTimeout(s, 5000));
      continue;
    }
    if (j.error) throw new Error(`wikidata: ${j.error.code} ${j.error.info}`);
    return j.entities || {};
  }
  throw new Error('wikidata: hết lượt thử');
}

function dung(e) {
  const links = e.sitelinks || {};
  const total = Object.keys(links).filter(
    (k) =>
      /wiki$/.test(k) &&
      !['commonswiki', 'specieswiki', 'metawiki', 'wikidatawiki', 'mediawikiwiki'].includes(k)
  ).length;
  const labels = {};
  const sitelinks = {};
  const score = {};
  for (const loc of Object.keys(LABEL_ORDER)) {
    for (const l of LABEL_ORDER[loc]) {
      if (!e.labels?.[l]) continue;
      const v = e.labels[l].value;
      labels[loc] =
        loc === 'zh-tw' && !['zh-tw', 'zh-hant', 'zh-hk'].includes(l) && cn2tw ? cn2tw(v) : v;
      break;
    }
    if (links[WIKI[loc]]) sitelinks[loc] = links[WIKI[loc]].title;
    score[loc] = total + (sitelinks[loc] ? 1_000_000 : 0);
  }
  return { labels, sitelinks, total_links: total, score };
}

// ── chạy ──
let qids = [
  ...new Set(
    SOURCE === 'db'
      ? await qidsFromDb()
      : SOURCE === 'all'
        ? [...(await qidsFromDb()), ...qidsFromFiles()]
        : qidsFromFiles()
  ),
];
const co = new Map();
if (OUT && existsSync(OUT))
  for (const [k, v] of Object.entries(JSON.parse(readFileSync(OUT, 'utf8')))) co.set(k, v);
if (!OUT) {
  if (!coDb)
    throw new Error(
      'Không có DB hợp lệ (SUPABASE_URL/SUPABASE_SERVICE_KEY) — dùng --out file.json'
    );
  for (let from = 0; ; from += 1000) {
    const rows = await sb(`/nc_wikidata?select=qid&order=qid.asc&limit=1000&offset=${from}`);
    rows.forEach((r) => co.set(r.qid, 1));
    if (rows.length < 1000) break;
  }
}
const can = qids.filter((q) => REFRESH || !co.has(q)).slice(0, LIMIT);
console.error(`QID: ${qids.length} · đã có: ${qids.length - can.length} · cần nạp: ${can.length}`);
const ket = OUT ? Object.fromEntries(co) : {};
for (let i = 0; i < can.length; i += 50) {
  const ents = await hoi(can.slice(i, i + 50));
  const rows = [];
  for (const q of can.slice(i, i + 50)) {
    const e = ents[q];
    if (!e || e.missing !== undefined) {
      console.error(`  ${q}: không có trên Wikidata (bỏ qua)`);
      continue;
    }
    rows.push({ qid: q, ...dung(e) });
  }
  if (OUT) {
    for (const r of rows)
      ket[r.qid] = {
        labels: r.labels,
        sitelinks: r.sitelinks,
        total_links: r.total_links,
        score: r.score,
      };
    writeFileSync(OUT, JSON.stringify(ket));
  } else if (rows.length)
    await sb('/nc_wikidata?on_conflict=qid', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.map((r) => ({ ...r, fetched_at: new Date().toISOString() }))),
    });
  console.error(`  ${Math.min(i + 50, can.length)}/${can.length}`);
  await new Promise((s) => setTimeout(s, 1100));
}
console.error('Xong.');
