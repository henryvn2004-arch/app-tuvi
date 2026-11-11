// scripts/nc-i18n.mjs — công cụ HÀNG ĐỢI DỊCH hồ sơ Nghiệm Chứng / Xác Định Giờ Sinh (W6).
// Thiết kế để phiên dịch (Sonnet, trong gói subscription) tốn ÍT TOKEN nhất: `next` in đúng phần cần dịch +
// chỉ phần thuật ngữ xuất hiện trong lô; `save` tự kiểm rồi mới ghi. Hướng dẫn người dịch: docs/i18n/NC-TRANSLATOR.md.
//
//   node scripts/nc-i18n.mjs next   --locale ja --n 5 [--source db|files] [--wikidata f.json] [--out-dir d]
//   node scripts/nc-i18n.mjs save   --file lo.json [--locale ja] [--out-dir d] [--by tên] [--status ok|review]
//   node scripts/nc-i18n.mjs status --locale ja [--source db|files] [--wikidata f.json] [--out-dir d]
//
// Nguồn hồ sơ: `db` = bảng nc_ho_so (cần SUPABASE_URL + SUPABASE_SERVICE_KEY) · `files` = data/nghiem-chung/ho-so/*.json.gz
// (hồ sơ sinh hàng loạt cũ, cũng đang được phục vụ). Mặc định `db` nếu có biến môi trường, không thì `files`.
// Nơi lưu bản dịch: bảng nc_ho_so_i18n (DB) hoặc `--out-dir` (thư mục JSON, dùng khi chưa có DB / để thử).
// Điểm ưu tiên: `--wikidata file.json` (xuất bởi scripts/nc-wikidata.mjs) hoặc bảng nc_wikidata.
// `zh-cn` KHÔNG dịch riêng: `save` bản `zh-tw` sinh luôn `zh-cn` bằng OpenCC (0 token).
// ⚠ Container có proxy: chạy với NODE_USE_ENV_PROXY=1 khi đụng mạng. Cần Node ≥ 22.18.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { Converter } from 'opencc-js';
import { extractProse, hashProse, thieuKhoa } from '../lib/nghiem-chung/i18n/prose.ts';
import { termsInText, missingTerms, wrongVariant } from '../lib/i18n/glossary/index.ts';

const [cmd, ...rest] = process.argv.slice(2);
const opt = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const LOCALE = opt('--locale', '');
const OUT_DIR = opt('--out-dir', '');
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const coDb = !!SB && !!KEY && /^https?:\/\/\S+$/.test(SB);
const SOURCE = opt('--source', coDb ? 'db' : 'files');
const ROOT = new URL('..', import.meta.url).pathname;
const DICH = ['en', 'ja', 'ko', 'zh-tw'];
const die = (m) => {
  console.error(`LỖI: ${m}`);
  process.exit(1);
};

// ── DB / thư mục ─────────────────────────────────────────────────────────────
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
  if (!r.ok) throw new Error(`${path.split('?')[0]}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
async function sbAll(path) {
  const out = [];
  for (let from = 0; ; from += 200) {
    const rows = await sb(`${path}&limit=200&offset=${from}`);
    out.push(...rows);
    if (rows.length < 200) return out;
  }
}

/** Mọi hồ sơ nguồn: [{slug, qid, indexed, h}] — `h` là hồ sơ đầy đủ. */
async function loadSources() {
  const out = [];
  if (SOURCE === 'files') {
    const dir = join(ROOT, 'data/nghiem-chung/ho-so');
    const man = new Map(
      JSON.parse(readFileSync(join(ROOT, 'data/nghiem-chung/manifest.json'), 'utf8')).map((x) => [
        x.slug,
        x,
      ])
    );
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json.gz')) continue;
      const h = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString('utf8'));
      out.push({ slug: h.slug, qid: h.qid, indexed: !!man.get(h.slug)?.indexed, h });
    }
  } else {
    if (!coDb)
      die('Nguồn db cần SUPABASE_URL + SUPABASE_SERVICE_KEY hợp lệ (hoặc dùng --source files).');
    for (const r of await sbAll('/nc_ho_so?select=slug,qid,indexed,data&order=slug.asc'))
      out.push({ slug: r.slug, qid: r.qid, indexed: r.indexed, h: r.data });
  }
  return out;
}

async function loadDone(locale) {
  const m = new Map();
  if (OUT_DIR) {
    const d = join(OUT_DIR, locale);
    if (existsSync(d))
      for (const f of readdirSync(d)) {
        const j = JSON.parse(readFileSync(join(d, f), 'utf8'));
        m.set(j.slug, j.source_hash);
      }
  } else if (coDb) {
    for (const r of await sbAll(
      `/nc_ho_so_i18n?locale=eq.${locale}&select=slug,source_hash&order=slug.asc`
    ))
      m.set(r.slug, r.source_hash);
  } else die('Không có DB — thêm --out-dir <thư mục> để lưu/đọc bản dịch dạng file.');
  return m;
}

async function loadWikidata(qids) {
  const f = opt('--wikidata', '');
  if (f) return JSON.parse(readFileSync(f, 'utf8'));
  if (!coDb) return {};
  try {
    const m = {};
    for (const r of await sbAll('/nc_wikidata?select=qid,labels,score&order=qid.asc')) m[r.qid] = r;
    return m;
  } catch (e) {
    console.error(`(bỏ qua nc_wikidata: ${e.message})`);
    return {};
  }
}

// ── luật dịch ngắn (đi kèm MỖI lô để người dịch không phải nhớ) ───────────────
const QUY_TAC = {
  chung:
    'Trả JSON {"locale","items":[{"slug","ten","ngheNghiep","f":{...}}]}: MỌI khoá của f, giữ nguyên MỌI con số (năm, điểm, %), tên cung/sao theo glossary, tên người theo goi_y_ten nếu có, không còn chữ Việt (trừ tên riêng Việt). Không thêm/bớt ý.',
  en: 'Plain, neutral English; Zi Wei Dou Shu terms per glossary (pinyin); keep "chart/palace" wording consistent.',
  ja: 'です・ます調。紫微斗数。用語は glossary の新字体表記（禄・権）。人名は goi_y_ten。',
  ko: '합니다체. 자미두수. 용어는 glossary의 한글 표기. 인명은 goi_y_ten.',
  'zh-tw':
    '繁體中文（台灣用語）。紫微斗數。術語照 glossary。人名用 goi_y_ten。簡體由系統自動生成，不必寫。',
};

// ── next ─────────────────────────────────────────────────────────────────────
async function next() {
  if (!DICH.includes(LOCALE))
    die(`--locale phải là một trong ${DICH.join(' | ')} (zh-cn sinh tự động từ zh-tw).`);
  const n = Number(opt('--n', '5')) || 5;
  const src = await loadSources();
  const done = await loadDone(LOCALE);
  const wd = await loadWikidata();
  const cand = [];
  for (const s of src) {
    const p = extractProse(s.h);
    const hash = hashProse(p);
    const was = done.get(s.slug);
    if (was === hash) continue;
    const w = wd[s.qid];
    cand.push({
      s,
      p,
      hash,
      stale: was !== undefined,
      score: w?.score?.[LOCALE] ?? 0,
      hint: w?.labels?.[LOCALE],
    });
  }
  // indexed trước → người được biết ở ngôn ngữ đó (điểm Wikidata) → slug cho ổn định.
  cand.sort(
    (a, b) =>
      Number(b.s.indexed) - Number(a.s.indexed) ||
      b.score - a.score ||
      a.s.slug.localeCompare(b.s.slug)
  );
  const lo = cand.slice(0, n);
  const texts = lo.flatMap((c) => [c.p.ngheNghiep, ...Object.values(c.p.f)]);
  // Khoá = đúng cụm xuất hiện trong văn: cung đơn âm ("Mệnh", "Phúc Đức"…) chỉ khớp khi có "cung " nên ghi "cung Mệnh" —
  // đồng thời tránh đụng khoá với sao trùng tên (Phúc Đức cung ≠ Phúc Đức sao).
  const glossary = Object.fromEntries(
    termsInText(texts).map((t) => [
      t.k === 'cung' && t.f?.includes('c') ? `cung ${t.vi}` : t.vi,
      t[LOCALE],
    ])
  );
  // Thuật ngữ RIÊNG của trường phái Việt (cờ 'o'): không có tương đương chuẩn — dặn người dịch giải thích thay vì tìm từ.
  const ghiChu = Object.fromEntries(
    termsInText(texts)
      .filter((t) => t.f?.includes('o'))
      .map((t) => [
        t.vi,
        'riêng trường phái Việt, không có tương đương chuẩn: giữ chữ glossary và giải thích ngắn lần đầu',
      ])
  );
  const items = lo.map((c) => ({
    slug: c.s.slug,
    ten: c.p.ten,
    ...(c.hint ? { goi_y_ten: c.hint } : {}),
    ...(c.stale ? { da_sua: true } : {}),
    ngheNghiep: c.p.ngheNghiep,
    f: c.p.f,
  }));
  console.error(
    `[nc-i18n] ${LOCALE}: còn ${cand.length}/${src.length} hồ sơ chưa dịch/đã sửa · lô này ${items.length}`
  );
  // JSON gọn (không thụt dòng) — mỗi ký tự thừa là token người dịch phải đọc.
  console.log(
    JSON.stringify({
      locale: LOCALE,
      quy_tac: `${QUY_TAC.chung} ${QUY_TAC[LOCALE]}`,
      glossary,
      ...(Object.keys(ghiChu).length ? { ghi_chu_thuat_ngu: ghiChu } : {}),
      items,
    })
  );
}

// ── save ─────────────────────────────────────────────────────────────────────
// Tỉ lệ độ dài (ký tự bản dịch / ký tự gốc tiếng Việt) chấp nhận được. Tiếng Việt dài hơn CJK nhiều.
const TI_LE = { en: [0.55, 1.6], ja: [0.2, 1.0], ko: [0.25, 1.1], 'zh-tw': [0.2, 0.9] };
// Chữ Việt còn sót. Chữ có dấu CHUNG với Pháp/Tây Ban Nha/Bồ (é è ê ô à…) KHÔNG đủ để kết tội — "L'Homme révolté" là tên Pháp hợp lệ.
// Hai tín hiệu: (1) chữ chỉ tiếng Việt có (ă ơ ư đ + mọi dấu hỏi/nặng/ngã/mũ-thanh) trong từ VIẾT THƯỜNG;
// (2) từ chức năng tiếng Việt phổ biến mà chữ của chúng toàn dấu chung (không, là, và, những…). Tên riêng Viết Hoa cho qua.
const VN_RIENG = 'ăơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệỉĩịọỏốồổỗộớờởỡợụủũứừửữựỳỵỷỹ';
const RE_VN = new RegExp(`(?<![\\p{L}])\\p{Ll}*[${VN_RIENG}]\\p{L}*`, 'u');
const TU_VIET = new Set(
  'không là và mà có một những được trong các này nhưng nên cũng rất như thì bị đã sẽ vì nếu ông bà cha mẹ'.split(
    ' '
  )
);
const conViet = (t) =>
  t.match(RE_VN)?.[0] ||
  (t.toLowerCase().match(/\p{L}+/gu) || []).find((w) => TU_VIET.has(w)) ||
  null;
// Số: bỏ dấu phân nghìn (450.000 / 450,000 → 450000), dấu thập phân phẩy → chấm, và bản dịch được viết 万/억 thì cũng tính số khai triển (45万 = 450000).
const chuan = (x) => x.replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1').replace(/(\d),(\d)/g, '$1.$2');
const nums = (s) => chuan(s).match(/\d+(?:\.\d+)?/g) || [];
const numsDich = (t) => {
  const out = nums(t);
  for (const m of chuan(t).matchAll(/(\d+(?:\.\d+)?)\s*(万|萬|만|億|亿|억)/gu))
    out.push(String(Number(m[1]) * (/[万萬만]/u.test(m[2]) ? 1e4 : 1e8)));
  return out;
};

function kiem(locale, srcItem, it) {
  const err = [];
  const warn = [];
  const p = extractProse(srcItem.h);
  const f = it.f || {};
  for (const k of thieuKhoa(p, { f })) err.push(`thiếu khoá ${k}`);
  for (const k of Object.keys(f)) if (!(k in p.f)) err.push(`khoá lạ ${k} (không có ở bản gốc)`);
  if (!it.ten || !String(it.ten).trim()) err.push('thiếu ten');
  if (typeof it.ngheNghiep !== 'string') err.push('thiếu ngheNghiep');
  const [lo, hi] = TI_LE[locale];
  let tongS = 0;
  let tongT = 0;
  const pairs = [
    ['ngheNghiep', p.ngheNghiep, it.ngheNghiep || ''],
    ...Object.keys(p.f).map((k) => [k, p.f[k], f[k] || '']),
  ];
  for (const [k, s, t] of pairs) {
    if (!t) continue;
    const cv = conViet(t);
    if (cv) err.push(`${k}: còn chữ Việt "${cv}"`);
    const soDich = numsDich(t);
    for (const m of new Set(nums(s))) if (!soDich.includes(m)) err.push(`${k}: mất số ${m}`);
    for (const t0 of missingTerms(locale, s, t))
      err.push(`${k}: thuật ngữ "${t0.vi}" phải là "${t0[locale]}"`);
    for (const t0 of wrongVariant(locale, t))
      err.push(`${k}: "${t0['zh-tw']}" phải viết 新字体 "${t0.ja}"`);
    if (s.length >= 60) {
      const r = t.length / s.length;
      if (r < lo * 0.7 || r > hi * 1.3)
        err.push(`${k}: tỉ lệ độ dài ${r.toFixed(2)} (gốc ${s.length} → ${t.length}) lệch quá`);
      else if (r < lo || r > hi) warn.push(`${k}: tỉ lệ độ dài ${r.toFixed(2)} hơi lệch`);
    }
    tongS += s.length;
    tongT += t.length;
  }
  if (tongS && (tongT / tongS < lo || tongT / tongS > hi))
    err.push(
      `tổng tỉ lệ độ dài ${(tongT / tongS).toFixed(2)} ngoài [${lo}, ${hi}] — dịch thiếu/thừa ý?`
    );
  return { err, warn };
}

async function save() {
  const file = opt('--file', '');
  if (!file) die('Thiếu --file <lo.json>');
  const lo = JSON.parse(file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8'));
  const locale = opt('--locale', lo.locale);
  if (!['en', 'ja', 'ko', 'zh-tw', 'zh-cn'].includes(locale)) die(`locale không hợp lệ: ${locale}`);
  const status = opt('--status', 'ok');
  const by = opt('--by', 'claude-sonnet');
  const src = new Map((await loadSources()).map((s) => [s.slug, s]));
  const toCn = Converter({ from: 'twp', to: 'cn' });
  let bad = 0;
  const rows = [];
  for (const it of lo.items || []) {
    const s = src.get(it.slug);
    if (!s) {
      console.error(`✗ ${it.slug}: không có hồ sơ nguồn`);
      bad++;
      continue;
    }
    // zh-cn tự sinh KHÔNG qua kiểm thuật ngữ (đã kiểm ở zh-tw); zh-cn dịch tay thì dùng bảng zh-tw làm chuẩn kiểm.
    const kiemLocale = locale === 'zh-cn' ? 'zh-tw' : locale;
    const { err, warn } = kiem(kiemLocale, s, it);
    warn.forEach((w) => console.error(`⚠ ${it.slug}: ${w}`));
    if (err.length) {
      err.forEach((e) => console.error(`✗ ${it.slug}: ${e}`));
      bad++;
      continue;
    }
    const hash = hashProse(extractProse(s.h));
    const mk = (loc, conv) => ({
      slug: it.slug,
      locale: loc,
      ten: conv(it.ten),
      nghe_nghiep: conv(it.ngheNghiep || ''),
      data: { f: Object.fromEntries(Object.entries(it.f).map(([k, v]) => [k, conv(v)])) },
      source_hash: hash,
      status,
      translated_by: by,
      updated_at: new Date().toISOString(),
    });
    rows.push(mk(locale, (x) => x));
    if (locale === 'zh-tw') rows.push(mk('zh-cn', toCn));
    console.error(`✓ ${it.slug} (${locale}${locale === 'zh-tw' ? ' + zh-cn' : ''})`);
  }
  if (bad)
    console.error(`\n${bad} hồ sơ KHÔNG qua kiểm — sửa rồi save lại (các hồ sơ đạt vẫn được ghi).`);
  if (rows.length) {
    if (OUT_DIR) {
      for (const r of rows) {
        mkdirSync(join(OUT_DIR, r.locale), { recursive: true });
        writeFileSync(join(OUT_DIR, r.locale, `${r.slug}.json`), JSON.stringify(r));
      }
    } else {
      if (!coDb) die('Không có DB — thêm --out-dir <thư mục>.');
      for (let i = 0; i < rows.length; i += 20)
        await sb('/nc_ho_so_i18n?on_conflict=slug,locale', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.slice(i, i + 20)),
        });
    }
    console.error(
      `Đã ghi ${rows.length} dòng (${OUT_DIR ? `thư mục ${OUT_DIR}` : 'nc_ho_so_i18n'}).`
    );
  }
  process.exit(bad ? 2 : 0);
}

// ── status ───────────────────────────────────────────────────────────────────
async function status() {
  if (!DICH.includes(LOCALE)) die(`--locale phải là một trong ${DICH.join(' | ')}`);
  const src = await loadSources();
  const done = await loadDone(LOCALE);
  let ok = 0,
    stale = 0,
    todo = 0,
    todoIdx = 0,
    chars = 0;
  for (const s of src) {
    const p = extractProse(s.h);
    const was = done.get(s.slug);
    if (was === hashProse(p)) ok++;
    else {
      if (was !== undefined) stale++;
      else todo++;
      if (s.indexed) todoIdx++;
      chars += JSON.stringify(p).length;
    }
  }
  console.log(
    JSON.stringify({
      locale: LOCALE,
      nguon: SOURCE,
      tong: src.length,
      da_dich: ok,
      da_sua_can_dich_lai: stale,
      chua_dich: todo,
      chua_dich_indexed: todoIdx,
      ky_tu_viet_con_lai: chars,
    })
  );
}

if (cmd === 'next') await next();
else if (cmd === 'save') await save();
else if (cmd === 'status') await status();
else die('Dùng: next | save | status (xem đầu file).');
