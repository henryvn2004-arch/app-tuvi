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

const argv = process.argv.slice(2);
const has = (f) => argv.includes('--' + f);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const API = 'https://www.astro.com/astro-databank/api.php';
const UA = 'tuviminhbao.com research (henryvn2004@gmail.com)';
const SLEEP_MS = 1000;
const LIMIT = Number(opt('limit', 5000));
const OUT = opt('out', 'adb.csv');
const CATS = opt('cats', 'Rodden Rating AA,Rodden Rating A').split(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── PATTERNS — SỬA Ở ĐÂY nếu --probe bóc sai ─────────────────
// Wikitext của ADB thường có dạng "Birthname ... born on 4 March 1952 at 07:20
// (= 07:20 AM) ... Time Zone: CET h1e ... Rodden Rating AA". Ba mẫu dưới cố ý
// RỘNG và độc lập nhau: hỏng một mẫu thì hai mẫu kia vẫn ra, và --probe sẽ
// chỉ đúng mẫu nào chết.
const PATTERNS = {
  date: [
    /born on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
    /\|\s*birth_date\s*=\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
  ],
  time: [/\bat\s+(\d{1,2}):(\d{2})\b/i, /\|\s*birth_time\s*=\s*(\d{1,2}):(\d{2})/i],
  // Offset ghi kiểu "h1e" (UTC+1), "h5w" (UTC−5), "h5:30e"; hoặc "CET"/"EST"…
  zone: [/\bh(\d{1,2})(?::(\d{2}))?\s*([ew])\b/i],
  rating: [/Rodden Rating\s*[:|]?\s*(AA|A|B|C|DD|X|XX)\b/i, /\brating\s*=\s*(AA|A|B|C|DD|X|XX)\b/i],
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
  const d = first(wikitext, PATTERNS.date);
  const t = first(wikitext, PATTERNS.time);
  const z = first(wikitext, PATTERNS.zone);
  const r = first(wikitext, PATTERNS.rating);
  if (!d || !t || !r)
    return {
      title,
      ok: false,
      missing: [!d && 'date', !t && 'time', !r && 'rating'].filter(Boolean),
    };
  const mon = MONTHS[d[2].toLowerCase()];
  if (!mon) return { title, ok: false, missing: ['month:' + d[2]] };
  // Múi giờ → phút. Không đọc được thì để trống, phía đo sẽ bỏ dòng đó chứ
  // KHÔNG mặc định +7 — đoán múi giờ là đoán luôn canh giờ.
  const off = z
    ? (Number(z[1]) * 60 + Number(z[2] || 0)) * (z[3].toLowerCase() === 'w' ? -1 : 1)
    : '';
  return {
    title,
    ok: true,
    iso: `${d[3]}-${String(mon).padStart(2, '0')}-${String(Number(d[1])).padStart(2, '0')}`,
    hhmm: `${String(Number(t[1])).padStart(2, '0')}:${t[2]}`,
    rating: r[1].toUpperCase(),
    off,
  };
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
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

async function wikitext(title) {
  const j = await api({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: title,
  });
  const pages = j.query?.pages || {};
  const p = Object.values(pages)[0];
  return p?.revisions?.[0]?.slots?.main?.['*'] || '';
}

async function main() {
  if (!has('probe') && !has('run')) {
    console.log('Chạy `--probe` trước (kéo 3 trang, in ra bóc được gì), rồi mới `--run`.');
    return;
  }
  const cap = has('probe') ? 3 : LIMIT;
  const titles = [];
  for (const c of CATS) {
    try {
      titles.push(...(await pageTitles(c.trim(), cap)));
    } catch (e) {
      console.error(`Danh mục "${c}": ${e.message}`);
    }
    if (titles.length >= cap) break;
  }
  if (!titles.length) {
    console.error('❌ Không lấy được tên trang nào. Nếu lỗi là "Host not in allowlist" thì đây là');
    console.error('   egress proxy của môi trường chặn, không phải astro.com từ chối.');
    console.error('   Nếu lỗi 404: tên Category sai — mở wiki xem tên thật rồi truyền --cats.');
    process.exitCode = 1;
    return;
  }

  const rows = [];
  for (const t of titles.slice(0, cap)) {
    let wt = '';
    try {
      wt = await wikitext(t);
    } catch (e) {
      console.error(`  ${t}: ${e.message}`);
    }
    const r = parsePage(t, wt);
    rows.push(r);
    if (has('probe')) {
      console.log(`\n──── ${t} ────`);
      console.log(
        r.ok
          ? `  ✅ ${r.iso} ${r.hhmm} rating=${r.rating} offset=${r.off === '' ? '(không đọc được)' : r.off + 'p'}`
          : `  ❌ thiếu: ${r.missing.join(', ')}`
      );
      const i = wt.search(/born on|birth_date|Rodden/i);
      console.log(
        '  wikitext quanh chỗ đó:\n' +
          (i >= 0 ? wt.slice(Math.max(0, i - 200), i + 400) : wt.slice(0, 400)).replace(
            /^/gm,
            '    '
          )
      );
    }
    await sleep(SLEEP_MS);
    if (!has('probe') && rows.length % 100 === 0)
      process.stdout.write(`\r  ${rows.length}/${titles.length}`);
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
    'ten,ngay_sinh,gio_sinh,rating,utc_offset_phut',
    ...good.map((r) => `${JSON.stringify(r.title)},${r.iso},${r.hhmm},${r.rating},${r.off}`),
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
