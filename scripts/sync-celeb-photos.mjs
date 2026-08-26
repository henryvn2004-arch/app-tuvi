#!/usr/bin/env node
/**
 * Kéo ảnh người nổi tiếng từ Wikimedia Commons về Supabase Storage.
 *
 *   Commons Special:FilePath?width=240  → byte ảnh (Wikimedia tự resize)
 *   Commons API extmetadata             → tác giả + license (ghi công CC BY-SA)
 *   Supabase Storage bucket celeb-photos → nơi ở mới
 *   celeb_births.image_url               → URL công khai, API ưu tiên dùng
 *
 * Dùng:
 *   node scripts/sync-celeb-photos.mjs --dry                 # đếm việc, KHÔNG tải
 *   node scripts/sync-celeb-photos.mjs --limit 2000          # một mẻ
 *   node scripts/sync-celeb-photos.mjs                       # tới khi hết
 *
 * ── VÌ SAO KHÔNG TỰ RESIZE ──────────────────────────────────
 * `Special:FilePath?width=240` đã trả về đúng bản thumb 240px do Wikimedia
 * render. Tự tải bản gốc rồi resize là kéo về gấp 20–50 lần byte, thêm một
 * dependency ảnh nặng, để ra một kết quả không tốt hơn.
 *
 * ── VÌ SAO CÓ TRẦN `WARM_PER_KEY` ───────────────────────────
 * API lấy 15 dòng đầu theo `fame_score` cho tầng T1 rồi mới xếp lại theo châu
 * lục — tập ỨNG VIÊN của mỗi khoá đúng bằng 15 dòng đó. Kéo cả 15 là tốn ~2×
 * cho phần gần như không bao giờ lên hình. Script kéo `WARM_PER_KEY` (8) dòng
 * đầu mỗi khoá và **IN RA đúng số dòng nó bỏ lại** — trần im lặng thì đọc
 * thành "đã phủ hết", mà không phải. Phần bỏ lại vẫn chạy được: rơi về Commons.
 *
 * ── LỊCH SỰ VỚI WIKIMEDIA ───────────────────────────────────
 * Một luồng, có nghỉ giữa các request, User-Agent nêu rõ liên hệ — đúng điều
 * Wikimedia yêu cầu. Đây là lý do script chạy được nhiều mẻ thay vì một phát:
 * chạy nhanh hơn không phải là mục tiêu.
 *
 * ── THẤT BẠI PHẢI ĐƯỢC GHI LẠI ──────────────────────────────
 * File Commons bị gỡ/đổi tên là chuyện thường. Ghi vào `image_sync_err` để lượt
 * sau bỏ qua — không ghi thì mỗi lượt chạy lại húc vào đúng những file đã hỏng
 * và không bao giờ tiến được.
 */
if (process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== '1') {
  // ⚠️ `fetch` của Node KHÔNG tự đi qua proxy (curl thì có), mà hai biến dưới
  // đọc lúc KHỞI ĐỘNG ⇒ phải spawn lại chính mình, không set được tại chỗ.
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

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const has = (f) => argv.includes('--' + f);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const DRY = has('dry');
const LIMIT = Number(opt('limit', 0)) || Infinity;
const SLEEP_MS = Number(opt('sleep', 120));
const RETRY_ERR = has('retry-err'); // thử lại cả những dòng đã hỏng lần trước
const UA = 'tuviminhbao.com celeb-photos sync (henryvn2004@gmail.com)';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Chuỗi rơi + URL Commons: CÙNG module mà API đang chạy ────
// Chép sang đây là hai bản trôi khỏi nhau, mà triệu chứng của "trôi" giống hệt
// triệu chứng của "chưa đồng bộ": thẻ vẫn hiện, chỉ là hiện avatar chữ.
const _m = { exports: {} };
new Function(
  'module',
  'exports',
  readFileSync(join(ROOT, 'public/tools-shared/celeb-photo.js'), 'utf-8')
)(_m, _m.exports);
const CP = _m.exports;
const PER_KEY = Number(opt('per-key', CP.WARM_PER_KEY));

if (!SB_URL || !SB_KEY) {
  console.error('❌ Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY.');
  console.error('   Container phiên Claude Code không có key này (env nằm ở Vercel).');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET Supabase REST. `no-store` là luật repo — Next bọc fetch toàn cục. */
async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`supabase GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(qid, patch) {
  const res = await fetch(`${SB_URL}/rest/v1/celeb_births?qid=eq.${encodeURIComponent(qid)}`, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`supabase PATCH ${res.status}: ${await res.text()}`);
}

async function sbUpload(key, buf, mime) {
  const res = await fetch(`${SB_URL}/storage/v1/object/${CP.BUCKET}/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': mime,
      // Ghi đè bản cũ thay vì 409 — script phải chạy lại được nhiều lần.
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`storage ${res.status}: ${await res.text()}`);
}

/** Tác giả + license từ Commons. Bắt buộc khi mình TỰ PHÂN PHỐI ảnh CC BY-SA. */
async function layGhiCong(file) {
  const u =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName|Credit' +
    '&titles=' +
    encodeURIComponent('File:' + String(file).replace(/ /g, '_'));
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) return { credit: null, license: null };
  const j = await res.json();
  const pages = j?.query?.pages || {};
  const meta = Object.values(pages)[0]?.imageinfo?.[0]?.extmetadata || {};
  // extmetadata trả HTML (thẻ <a>, <span>) — lột thẻ, giữ chữ.
  const chu = (v) =>
    v?.value
      ? String(v.value)
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300) || null
      : null;
  return { credit: chu(meta.Artist) || chu(meta.Credit), license: chu(meta.LicenseShortName) };
}

const EXT_THEO_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function main() {
  console.log(
    `Bucket ${CP.BUCKET} · thumb ${CP.THUMB_W}px · ${PER_KEY} ảnh/khoá T1` + (DRY ? ' · DRY' : '')
  );

  // ── Sổ việc ───────────────────────────────────────────────
  // Lấy theo ĐÚNG thứ tự API dùng cho tầng T1 (`fame_score` giảm dần) rồi tự
  // cắt `PER_KEY` mỗi khoá — nếu xếp kiểu khác thì kéo về nhầm ảnh, mà triệu
  // chứng vẫn là "thẻ hiện avatar chữ", không phân biệt được với chưa đồng bộ.
  const cot = 'qid,name,key_t1,fame_score,image_file,image_sync_err';
  const loc =
    'celeb_births?blocked=is.false&image_file=not.is.null&image_url=is.null' +
    (RETRY_ERR ? '' : '&image_sync_err=is.null') +
    `&select=${cot}&order=key_t1.asc,fame_score.desc&limit=100000`;
  const tatCa = await sbGet(loc);

  const demKhoa = new Map();
  const viec = [];
  let boLai = 0;
  for (const r of tatCa) {
    const n = demKhoa.get(r.key_t1) || 0;
    if (n >= PER_KEY) {
      boLai++;
      continue;
    }
    demKhoa.set(r.key_t1, n + 1);
    viec.push(r);
  }

  console.log(
    `Chưa đồng bộ: ${tatCa.length} dòng / ${demKhoa.size} khoá T1` +
      ` → làm ${viec.length}, BỎ LẠI ${boLai} (hạng > ${PER_KEY} trong khoá, vẫn hotlink Commons)`
  );
  const lam = viec.slice(0, LIMIT === Infinity ? undefined : LIMIT);
  if (LIMIT !== Infinity && viec.length > lam.length) {
    console.log(
      `--limit ${LIMIT} ⇒ mẻ này ${lam.length}, còn ${viec.length - lam.length} cho mẻ sau.`
    );
  }
  if (DRY) {
    console.log('\nDRY — 5 dòng đầu:');
    for (const r of lam.slice(0, 5)) {
      console.log(
        `  ${r.qid.padEnd(10)} ${String(r.name).slice(0, 28).padEnd(30)} ${CP.commonsThumb(r.image_file)}`
      );
    }
    // ~20KB/ảnh đo trên thumb 240px của Commons.
    console.log(`\nƯớc dung lượng nếu chạy hết: ${((viec.length * 20) / 1024).toFixed(1)} MB`);
    return;
  }

  let ok = 0,
    hong = 0;
  for (const [i, r] of lam.entries()) {
    try {
      const res = await fetch(CP.commonsThumb(r.image_file, CP.THUMB_W), {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`commons ${res.status}`);
      const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
      const ext = EXT_THEO_MIME[mime];
      // Không đoán đuôi file: mime lạ nghĩa là Commons trả về thứ không phải
      // ảnh (trang lỗi, HTML). Đoán bừa là nhét rác vào bucket.
      if (!ext) throw new Error(`mime lạ: ${mime || '(rỗng)'}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error(`ảnh rỗng (${buf.length}B)`);

      const key = CP.storageKey(r.qid, ext);
      await sbUpload(key, buf, mime);
      const { credit, license } = await layGhiCong(r.image_file);
      await sbPatch(r.qid, {
        image_url: CP.storageUrl(SB_URL, key),
        image_credit: credit,
        image_license: license,
        image_synced_at: new Date().toISOString(),
        image_sync_err: null,
      });
      ok++;
    } catch (e) {
      hong++;
      // Nuốt lỗi thì lượt sau húc lại đúng file đó — ghi lại để tiến được.
      try {
        await sbPatch(r.qid, { image_sync_err: String(e.message).slice(0, 300) });
      } catch (e2) {
        console.error(`  ⚠️ không ghi nổi lỗi cho ${r.qid}:`, e2.message);
      }
    }
    if ((i + 1) % 100 === 0 || i === lam.length - 1) {
      console.log(`  ${i + 1}/${lam.length} — ok ${ok}, hỏng ${hong}`);
    }
    await sleep(SLEEP_MS);
  }

  console.log(`\n✅ Xong mẻ: ${ok} ảnh về kho, ${hong} hỏng (ghi trong image_sync_err).`);
  if (boLai)
    console.log(
      `ℹ️  ${boLai} dòng CỐ Ý bỏ lại — hạng > ${PER_KEY} trong khoá, vẫn rơi về Commons.`
    );
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
