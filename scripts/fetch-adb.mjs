#!/usr/bin/env node
/**
 * Kéo GIỜ SINH từ Astro-Databank (wiki MediaWiki của Astrodienst) → CSV cho
 * `scripts/measure-celeb-density.mjs --adb`.
 *
 * CHỈ lấy DỮ KIỆN: tên · ngày sinh · giờ sinh · múi giờ · Rodden rating.
 * KHÔNG lấy tiểu sử, KHÔNG lấy ảnh, KHÔNG chép cấu trúc trang.
 *
 * ⚠️ TAO KHÔNG KIỂM ĐƯỢC ĐỊNH DẠNG TRANG — astro.com bị egress proxy chặn
 * trong container. Nên script chạy HAI CHẾ ĐỘ, mặc định là chế độ soi:
 *
 *   node scripts/fetch-adb.mjs --probe          ← CHẠY CÁI NÀY TRƯỚC
 *       Kéo đúng 3 trang, in ra thứ nó bóc được + đoạn wikitext thô quanh chỗ
 *       đó. Bóc sai thì sửa PATTERNS bên dưới (đã tách riêng cho dễ sửa).
 *
 *   node scripts/fetch-adb.mjs --run --out adb.csv --limit 5000
 *       Chỉ chạy khi --probe đã ra đúng. Từ chối chạy nếu tỉ lệ bóc được < 60%.
 *
 * Lịch sự với máy chủ người ta: 1 request/giây, User-Agent có email liên hệ.
 * Đừng hạ `SLEEP_MS` — bị chặn IP giữa chừng thì mất cả mẻ.
 */
import { writeFileSync } from 'fs';

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

const argv = process.argv.slice(2);
const has = (f) => argv.includes('--' + f);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

// ⚠️ PHẢI là đường /wiki/ — `/astro-databank/api.php` bị `cgi/prep.cgi` chặn
// bằng trang "One moment..." (HTML, không phải JSON). Đã đo.
const API = 'https://www.astro.com/wiki/astro-databank/api.php';
const UA = 'tuviminhbao.com research (henryvn2004@gmail.com)';
const SLEEP_MS = 1000;
const LIMIT = Number(opt('limit', 5000));
const OUT = opt('out', 'adb.csv');
// Wiki KHÔNG có category theo Rodden rating (đã tra `list=allcategories`: nó
// gom theo NĂM SINH — "1990 births"; rating nằm trong template của từng trang).
// 🪤 MediaWiki trả MẢNG RỖNG cho category không tồn tại, KHÔNG báo lỗi — nên
// hỏi sai tên là im lặng ra 0 dòng. Đã cắn đúng lỗi đó với "Rodden Rating AA".
const Y_FROM = Number(opt('from', 1900));
const Y_TO = Number(opt('to', 2010));
const CATS = opt('cats', '')
  ? opt('cats', '').split(',')
  : Array.from({ length: Y_TO - Y_FROM + 1 }, (_, i) => `${Y_FROM + i} births`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── PATTERNS — SỬA Ở ĐÂY nếu --probe bóc sai ─────────────────
// Wikitext của ADB thường có dạng "Birthname ... born on 4 March 1952 at 07:20
// (= 07:20 AM) ... Time Zone: CET h1e ... Rodden Rating AA". Ba mẫu dưới cố ý
// RỘNG và độc lập nhau: hỏng một mẫu thì hai mẫu kia vẫn ra, và --probe sẽ
// chỉ đúng mẫu nào chết.
const PATTERNS = {
  // Template {{ASTRODATABANK_dma}} có trường tên sẵn — không phải đoán từ văn xuôi.
  date: [/\|\s*sbdate\s*=\s*(\d{4})\/(\d{2})\/(\d{2})/i],
  time: [/\|\s*sbtime\s*=\s*(\d{1,2}):(\d{2})/i],
  // `stmerid=h8w` = kinh tuyến giờ 8 tiếng TÂY = UTC−8; `h1e` = UTC+1.
  // Đây là offset ADB THỰC SỰ dùng (đã tính cả giờ mùa hè qua `stimetype`),
  // nên lấy thẳng, KHÔNG tự suy lại từ toạ độ.
  zone: [/\|\s*stmerid\s*=\s*h(\d{1,2})(?::(\d{2}))?\s*([ew])/i],
  rating: [/\|\s*sroddenrating\s*=\s*(AA|A|B|C|DD|X|XX)\s*$/im],
  gender: [/\|\s*Gender\s*=\s*([MF])\s*$/im],
  // Không rỗng = ADB tự khai KHÔNG biết giờ sinh → bỏ, dù rating có đẹp.
  // 🪤 `|t_unknown=` RỖNG nghĩa là giờ sinh CÓ biết. Phải neo `[ \\t]*$` vào cuối
  // DÒNG: dùng `\\s*` thì nó nhảy qua newline và ăn luôn `|Copyright=All…` của
  // dòng kế ⇒ mọi hồ sơ đều bị coi là "không rõ giờ". Đã cắn đúng lỗi này.
  timeUnknown: [/\\|\\s*t_unknown\\s*=[ \\t]*(\\S+)[ \\t]*$/im],
};
const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const first = (text, pats) => {
  for (const p of pats) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
};

function parsePage(title, wikitext) {
  if (first(wikitext, PATTERNS.timeUnknown))
    return { title, ok: false, missing: ['giờ sinh ADB tự khai KHÔNG rõ'] };
  const d = first(wikitext, PATTERNS.date);
  const t = first(wikitext, PATTERNS.time);
  const z = first(wikitext, PATTERNS.zone);
  const r = first(wikitext, PATTERNS.rating);
  const g = first(wikitext, PATTERNS.gender);
  const missing = [!d && 'sbdate', !t && 'sbtime', !r && 'sroddenrating', !z && 'stmerid'].filter(
    Boolean
  );
  // `stmerid` nằm trong danh sách BẮT BUỘC: không có múi giờ thì không quy được
  // về giờ VN, mà đoán múi giờ là đoán luôn canh giờ ⇒ T2 cho "trùng lá số" GIẢ.
  if (missing.length) return { title, ok: false, missing };
  const off = (Number(z[1]) * 60 + Number(z[2] || 0)) * (z[3].toLowerCase() === 'w' ? -1 : 1);
  return {
    title,
    ok: true,
    iso: `${d[1]}-${d[2]}-${d[3]}`,
    hhmm: `${String(Number(t[1])).padStart(2, '0')}:${t[2]}`,
    rating: r[1].toUpperCase(),
    gender: g ? (g[1].toUpperCase() === 'F' ? 'nu' : 'nam') : '',
    off,
  };
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function pageTitles(cat, cap) {
  const out = [];
  let cont;
  do {
    const j = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${cat}`,
      cmlimit: '500',
      ...(cont ? { cmcontinue: cont } : {}),
    });
    out.push(...(j.query?.categorymembers || []).map((m) => m.title));
    cont = j.continue?.cmcontinue;
    await sleep(SLEEP_MS);
  } while (cont && out.length < cap);
  return out.slice(0, cap);
}

/**
 * Kéo wikitext của CẢ MỘT category bằng `generator=categorymembers` — 50 trang
 * mỗi request thay vì 1. 70k trang: ~1.400 request (~25 phút) thay vì 70.000
 * (~20 tiếng). Vẫn 1 request/giây, vẫn lịch sự.
 */
async function* categoryPages(cat, cap) {
  let cont = {};
  let n = 0;
  do {
    const j = await api({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: `Category:${cat}`,
      gcmlimit: '50',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      ...cont,
    });
    for (const pg of Object.values(j.query?.pages || {})) {
      yield { title: pg.title, wt: pg.revisions?.[0]?.slots?.main?.['*'] || '' };
      if (++n >= cap) return;
    }
    cont = j.continue || {};
    await sleep(SLEEP_MS);
  } while (Object.keys(cont).length);
}

async function main() {
  if (!has('probe') && !has('run')) {
    console.log('Chạy `--probe` trước (kéo 3 trang, in ra bóc được gì), rồi mới `--run`.');
    return;
  }
  const cap = has('probe') ? 3 : LIMIT;
  const rows = [];
  for (const cat of CATS) {
    if (rows.length >= cap) break;
    try {
      for await (const { title, wt } of categoryPages(cat.trim(), cap - rows.length)) {
        const r = parsePage(title, wt);
        rows.push(r);
        if (has('probe')) {
          console.log(`\n──── ${title} ────`);
          console.log(
            r.ok
              ? `  ✅ ${r.iso} ${r.hhmm} rating=${r.rating} offset=${r.off}p giới=${r.gender || '?'}`
              : `  ❌ thiếu: ${r.missing.join(', ')}`
          );
          const i = wt.search(/sbdate|sroddenrating/i);
          console.log(
            '  wikitext quanh chỗ đó:\n' +
              (i >= 0 ? wt.slice(Math.max(0, i - 200), i + 400) : wt.slice(0, 400)).replace(
                /^/gm,
                '    '
              )
          );
        }
        if (rows.length >= cap) break;
      }
    } catch (e) {
      console.error(`\nDanh mục "${cat}": ${e.message}`);
    }
    if (!has('probe'))
      process.stdout.write(
        `\r  ${cat} — ${rows.length} trang, ${rows.filter((r) => r.ok).length} bóc được`
      );
  }
  if (!rows.length) {
    console.error('❌ Không lấy được trang nào.');
    console.error(`   Đã hỏi ${CATS.length} category (${CATS[0]} …). MediaWiki trả MẢNG RỖNG cho`);
    console.error('   category không tồn tại chứ KHÔNG báo lỗi — nên rỗng ở đây nhiều khả năng là');
    console.error(
      '   sai tên category, không phải sai mạng. Tra tên thật bằng list=allcategories.'
    );
    process.exitCode = 1;
    return;
  }

  const good = rows.filter((r) => r.ok);
  const pct = (100 * good.length) / rows.length;
  console.log(`\n\nBóc được ${good.length}/${rows.length} (${pct.toFixed(0)}%)`);
  if (has('probe')) {
    console.log('\nĐúng thì chạy: node scripts/fetch-adb.mjs --run --out adb.csv');
    return;
  }

  // Bóc được quá ít nghĩa là PATTERNS sai — ghi ra file lúc này là ghi rác rồi
  // đo trên rác. Thà dừng.
  if (pct < 60) {
    console.error(
      `❌ Dưới 60% — PATTERNS nhiều khả năng đã lệch định dạng trang. Chạy --probe rồi sửa, đừng đo trên mẻ này.`
    );
    process.exitCode = 1;
    return;
  }
  const csv = [
    'ten,ngay_sinh,gio_sinh,rating,utc_offset_phut,gioi_tinh',
    ...good.map(
      (r) => `${JSON.stringify(r.title)},${r.iso},${r.hhmm},${r.rating},${r.off},${r.gender}`
    ),
  ].join('\n');
  writeFileSync(OUT, csv + '\n');
  console.log(
    `Đã ghi ${OUT} (${good.length} dòng)\n→ node scripts/measure-celeb-density.mjs --adb ${OUT}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
