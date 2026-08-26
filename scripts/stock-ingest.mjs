#!/usr/bin/env node
/**
 * NHẬP KHO ẢNH NỀN cho clip 9:16 — chạy MỘT LẦN, không phải job hằng ngày.
 *
 *   node scripts/stock-ingest.mjs --list
 *   node scripts/stock-ingest.mjs --bucket tone --per 6
 *   node scripts/stock-ingest.mjs --bucket all --per 6
 *   node scripts/stock-ingest.mjs --report
 *
 * ============================================================
 * VÌ SAO PHẢI CÓ KHO, thay vì lấy ảnh đúng-lúc-cần
 * ============================================================
 * 1. 🔐 ĐIỀU KHOẢN PIXABAY BẮT BUỘC, không phải chuyện tối ưu. Nguyên văn đọc
 *    tại `pixabay.com/api/docs/` ngày 17/08/2026:
 *      "permanent hotlinking of images (using Pixabay URLs in your app) is not
 *       allowed. If you intend to use the images, please download them to your
 *       server first."
 *    ⇒ Dán URL `pixabay.com/get/...` vào `ScriptSpec.backdrop` là VI PHẠM.
 * 2. Và nó còn hỏng về kỹ thuật: `webformatURL` tài liệu ghi rõ **hết hạn sau
 *    24 giờ**. Kịch bản trỏ URL đó thì render lại tháng sau là ảnh chết.
 * 3. Vòng lặp cổng 2 cần **cần gạt ĐỔI ẢNH**: hội đồng chê "ảnh không hợp" thì
 *    phải thay được ảnh khác. Ảnh lấy đúng-lúc-cần thì không có gì để thay sang.
 *
 * ============================================================
 * ⚠️ ĐIỀU KHOẢN KHÁC PHẢI GIỮ (đọc trước khi nới bất kỳ con số nào)
 * ============================================================
 * · "requests must be cached for 24 hours" ⇒ mọi phản hồi API cache xuống đĩa,
 *   dùng lại trong 24h. KHÔNG phải để chạy nhanh — để khỏi vi phạm.
 * · "do not send lots of automated queries. Systematic mass downloads are not
 *   allowed." ⇒ script này CỐ Ý không có `schedule`, chạy tuần tự, có nghỉ
 *   giữa hai lượt, và có trần cứng `MAX_REQUESTS`. Đây là một lượt dựng kho
 *   có chọn lọc, không phải máy quét.
 * · Rate limit 100 request/60 giây (đo được qua header `X-RateLimit-*`).
 * · Ghi công: tài liệu chỉ "kindly request" nêu nguồn KHI HIỂN THỊ KẾT QUẢ TÌM
 *   KIẾM — clip không phải kết quả tìm kiếm nên KHÔNG bắt buộc in tên tác giả
 *   lên khung hình. Nhưng ta vẫn lưu đủ provenance (tác giả · URL · id ·
 *   license) trong manifest, theo đúng tiền lệ CSDL nghề nghiệp CC BY 4.0.
 *   ⛔ Đó cũng là lý do loại Unsplash: bên đó ghi công là BẮT BUỘC.
 *
 * ============================================================
 * 🖼️ VÌ SAO ĐO ĐỘ SÁNG — và vì sao đo được là chuyện lớn
 * ============================================================
 * Hội đồng người xem (cổng 2) không nhìn thấy ảnh, nên mọi phán quyết của nó
 * về HÌNH là định kiến chứ không phải quan sát. Nhưng có một tính chất của
 * hình mà MÁY đo được, 0đ, không cần hỏi ai: **ảnh có chỗ đặt chữ không**.
 * Đây chính là thứ 64 bức tranh quẻ không cho phép (mình không chọn được
 * chúng) còn ảnh stock thì cho — vì mình CHỌN.
 *
 * Cách đo: giải mã ảnh về xám 64px, lấy DẢI GIỮA KHUNG (nơi khối chữ ngồi),
 * tính độ sáng trung bình. Ảnh càng sáng thì chữ trắng càng khó đọc.
 * ⚠️ Ngưỡng `BRIGHT_MAX` KHÔNG phải hằng số thiêng: nó gắn với lớp phủ `0,20`
 * và `TextPlate` của `InsightClip.tsx` hiện nay. Đổi hai thứ đó thì phải ĐO
 * LẠI, đừng chỉnh ngưỡng theo cảm giác.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import {
  BUCKETS,
  captionFromTags,
  ensureProxyEnv,
  findFfmpeg,
  measureImage,
  passesTags,
  pixabayKey,
  sleep,
  tagSet,
  ASIA_TAGS,
  STYLE_TAGS,
} from './stock-lib.mjs';

ensureProxyEnv();

const ROOT = new URL('..', import.meta.url).pathname;
/** Ảnh tải về nằm NGOÀI git (như `img-cache/`); manifest mới là thứ commit. */
const STAGE = join(ROOT, 'remotion/public/stock');
const MANIFEST = join(ROOT, 'lib/video/stock-manifest.json');
const CACHE = join(ROOT, 'remotion/public/stock/.api-cache');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const BUCKET = val('--bucket', 'tone');
const PER = Number(val('--per', '6'));
const DRY = has('--dry-run');
const LIST = has('--list');
const REPORT = has('--report');
const ONLY = val('--only', '');

/** Trần cứng số lượt gọi API cho MỘT lượt chạy — chốt chặn chống quét ồ ạt. */
const MAX_REQUESTS = 60;
/** Nghỉ giữa hai lượt gọi API (ms). Rate limit là 100/60s, đây là mức lịch sự. */
const API_GAP_MS = 700;
/** Nghỉ giữa hai lượt tải ảnh (ms). */
const DL_GAP_MS = 350;
/**
 * ══════════════════════════════════════════════════════════════════════
 * BA NGƯỠNG ẢNH — "cinematic moody", đo được, KHÔNG phải cảm giác
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 CẢ BA ĐỀU HIỆU CHỈNH TRÊN 84 ẢNH THẬT của lượt nhập trước, không đoán.
 * Phân bố đo được lúc chốt (min · p25 · trung vị · p75 · max):
 *     độ sáng   9 · 74 · 96 · 118 · 164
 *     bão hoà   0 · 14 · 25 ·  44 ·  97
 *     độ rối  2,3 · 10 · 14 ·  19 ·  33
 *
 * ⚠️ Bộ ngưỡng này chỉ cho **26%** kho CŨ đi qua, và làm 3/14 nhóm rỗng hẳn.
 * Đó KHÔNG phải lỗi ngưỡng — kho cũ tuyển theo tiêu chí "chữ đọc được", còn
 * đây là tiêu chí "moody". Hai việc khác nhau ⇒ phải NHẬP LẠI, không lọc lại.
 */
/** Đủ tối. Trần cũ 165 chỉ hỏi "chữ đọc được"; moody thì phải thấp hơn hẳn. */
const BRIGHT_MAX = 95;
/** Chặn "màu tươi". Bức ghế + lá đỏ bị chê ở lượt duyệt đo ra sat ~96. */
const SAT_MAX = 40;
/** Chặn "background rối" — nền phẳng mới có chỗ đặt chữ. */
const DETAIL_MAX = 18;
/**
 * Sàn tương phản: "có chiều sâu — shadow, contrast".
 *
 * Đặt THẤP (20) có chủ đích. Ảnh sương mù / tường trơn có `sd` nhỏ mà lại là
 * nền lý tưởng cho chữ; siết cao ở đây là vứt đúng nhóm ảnh tốt nhất để đổi
 * lấy một con số nghe kêu. Ngưỡng này chỉ loại bức PHẲNG LÌ như ảnh nền trống.
 */
const SD_MIN = 20;
/** Dải giữa khung nơi khối chữ ngồi — khớp bố cục `InsightClip`. */
/** Trần ứng viên SOI ẢNH mỗi nhóm — giữ lượt tải ở mức có chọn lọc. */
const SCREEN_CAP = 40;

/**
 * Chấm điểm để XẾP HẠNG ứng viên đã qua mọi cổng chặn.
 *
 * 🔑 Điểm này KHÔNG phải "ảnh đẹp bao nhiêu" — nó là *mức khớp với brief đã
 * chốt*. Máy không chấm được đẹp, và cũng không chấm được "trông có giống ảnh
 * stock rẻ tiền không". Đừng đọc con số này rộng hơn thế.
 */
function scoreCandidate(hit, m) {
  const tags = tagSet(hit.tags);
  const words = new Set([...tags].flatMap((t) => t.split(/[\s-]+/)));
  const hasAny = (list) => list.some((t) => (t.includes(' ') ? tags.has(t) : words.has(t)));
  const countAny = (list) =>
    list.filter((t) => (t.includes(' ') ? tags.has(t) : words.has(t))).length;

  let s = 0;
  const why = [];
  if (hasAny(ASIA_TAGS)) {
    s += 45;
    why.push('châu Á');
  }
  const nMoody = countAny(STYLE_TAGS.moody);
  if (nMoody) {
    s += Math.min(nMoody, 3) * 10;
    why.push(`moody×${nMoody}`);
  }
  if (hasAny(STYLE_TAGS.retro)) {
    s += 12;
    why.push('retro');
  }
  if (hasAny(STYLE_TAGS.mystic)) {
    s += 8;
    why.push('huyền bí');
  }
  // Càng tối / càng ít màu / càng phẳng thì càng đúng brief. Chuẩn hoá về
  // 0–20 mỗi chiều để không chiều nào một mình lấn hết điểm thẻ.
  s += (1 - m.mean / BRIGHT_MAX) * 20;
  s += (1 - m.sat / SAT_MAX) * 20;
  s += (1 - m.detail / DETAIL_MAX) * 15;
  return { score: Math.round(s), why };
}

// ============================================================
// TIỆN ÍCH
// ============================================================
const rel = (p) => p.replace(ROOT, '');

function loadManifest() {
  if (!existsSync(MANIFEST)) {
    return { version: 1, provider: 'pixabay', license: 'Pixabay Content License', images: [] };
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

// ============================================================
// GỌI API (có cache 24h theo đúng điều khoản)
// ============================================================
let apiCalls = 0;

async function pixabaySearch(params) {
  let key;
  try {
    // Làm sạch DÙNG CHUNG với kho video — env đã từng bị dán lẫn hai biến.
    key = pixabayKey();
  } catch {
    console.error('\n🔴 Thiếu PIXABAY_API_KEY.');
    console.error('   Đặt ở cấu hình environment (chỗ OPENAI_API_KEY đang nằm), giá trị THÔ.');
    console.error('   ⚠️ `.env` nằm trong .gitignore nên KHÔNG bao giờ tới container cloud.');
    process.exit(1);
  }
  const qs = new URLSearchParams({
    key,
    image_type: 'photo',
    orientation: 'vertical',
    safesearch: 'true',
    order: 'popular',
    lang: 'en',
    // largeImageURL trần 1280px cạnh dài; đòi bản gốc ≥1280 cao để không bị
    // trả về bức nhỏ hơn khung 1080×1920 nhiều hơn mức đã biết.
    min_height: '1280',
    min_width: '800',
    per_page: '50',
    ...params,
  });
  const cacheFile = join(CACHE, `${hash(qs.toString())}.json`);
  if (existsSync(cacheFile) && Date.now() - statSync(cacheFile).mtimeMs < 24 * 3600 * 1000) {
    return JSON.parse(readFileSync(cacheFile, 'utf8'));
  }
  if (apiCalls >= MAX_REQUESTS) {
    throw new Error(`chạm trần ${MAX_REQUESTS} lượt gọi API trong một lượt chạy`);
  }
  if (apiCalls > 0) await sleep(API_GAP_MS);
  apiCalls++;
  const res = await fetch(`https://pixabay.com/api/?${qs}`);
  if (res.status === 429) throw new Error('Pixabay 429 — vượt rate limit, dừng lại');
  if (!res.ok) throw new Error(`Pixabay ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(json));
  return json;
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/**
 * Lọc theo METADATA, trước khi tải một byte nào.
 *
 * `isAiGenerated` / `isLowQuality` / `noAiTraining` là trường THẬT trong phản
 * hồi (đã đo ngày 17/08/2026), không phải phỏng đoán — nhưng tài liệu nói rõ
 * "new keys may be added at any time", nên đọc thủ thế bằng `=== true/false`.
 */
function passesMetadata(hit, item) {
  if (hit.isAiGenerated === true) return 'ảnh do AI sinh';
  if (hit.isLowQuality === true) return 'nhà cung cấp đánh dấu chất lượng thấp';
  if (hit.isGRated === false) return 'không phải G-rated';
  if (!hit.largeImageURL) return 'thiếu largeImageURL';
  if (hit.imageHeight / hit.imageWidth < 1.2) return 'không đủ dọc cho khung 9:16';
  // Cổng đạo đức · cổng người-phải-châu-Á · cổng liên quan: dùng CHUNG với kho
  // video, xem `scripts/stock-lib.mjs`.
  return passesTags(hit.tags, item);
}

// ============================================================
// CHẠY
// ============================================================
if (LIST) {
  for (const [name, items] of Object.entries(BUCKETS)) {
    console.log(`\n── ${name.toUpperCase()} ──`);
    for (const t of items) console.log(`   ${t.id.padEnd(14)} ${t.vi}`);
  }
  process.exit(0);
}

if (REPORT) {
  const m = loadManifest();
  if (!m.images.length) {
    console.log('Kho rỗng — chưa chạy lượt nhập nào.');
    process.exit(0);
  }
  const byKey = {};
  for (const im of m.images) (byKey[`${im.bucket}/${im.key}`] ||= []).push(im);
  console.log(`\nKHO: ${m.images.length} ảnh\n`);
  for (const [k, arr] of Object.entries(byKey).sort()) {
    const safe = arr.filter((a) => a.textSafe).length;
    const lum = arr.map((a) => a.brightness?.mean).filter((x) => typeof x === 'number');
    const rng = lum.length ? `${Math.min(...lum)}–${Math.max(...lum)}` : 'chưa đo';
    console.log(
      `  ${k.padEnd(24)} ${String(arr.length).padStart(3)} ảnh · ${safe} đặt chữ được · độ sáng ${rng}`
    );
  }
  const all = m.images.map((a) => a.brightness?.mean).filter((x) => typeof x === 'number');
  if (all.length) {
    const sorted = [...all].sort((a, b) => a - b);
    console.log(
      `\n  Độ sáng dải giữa: min ${sorted[0]} · trung vị ${sorted[Math.floor(sorted.length / 2)]} · max ${sorted[sorted.length - 1]} (trần ${BRIGHT_MAX})`
    );
    const brightest = m.images
      .filter((a) => typeof a.brightness?.mean === 'number')
      .sort((a, b) => b.brightness.mean - a.brightness.mean)[0];
    console.log(
      `  Sáng nhất: ${brightest.file} (${brightest.brightness.mean}) — soi bức này khi chỉnh lớp phủ.`
    );
  }
  process.exit(0);
}

const groups = BUCKET === 'all' ? Object.entries(BUCKETS) : [[BUCKET, BUCKETS[BUCKET]]];
if (!groups[0]?.[1]) {
  console.error(`--bucket phải là: tone | subject | all (nhận "${BUCKET}")`);
  process.exit(1);
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.warn('\n⚠️ KHÔNG tìm thấy ffmpeg — sẽ KHÔNG đo được độ sáng.');
  console.warn('   Ảnh vẫn tải về nhưng `textSafe` để null, tức chưa ai gác chỗ đặt chữ.');
  console.warn('   Đặt biến FFMPEG=/đường/dẫn/ffmpeg rồi chạy lại để đo.\n');
}

const manifest = loadManifest();
const known = new Set(manifest.images.map((i) => `${i.provider}:${i.providerId}`));
const added = [];
const rejected = [];
let dryCount = 0;
/** Số ứng viên bị loại SAU khi đã soi bản xem trước (tức đã tốn ~6KB). */
let screened = 0;

for (const [bucketName, items] of groups) {
  for (const item of items) {
    if (ONLY && item.id !== ONLY) continue;
    const have = manifest.images.filter((i) => i.bucket === bucketName && i.key === item.id).length;
    const need = Math.max(0, PER - have);
    console.log(`\n── ${bucketName}/${item.id} ── ${item.vi}`);
    if (!need) {
      console.log(`   ✓ đã đủ ${have}/${PER} ảnh, bỏ qua`);
      continue;
    }
    console.log(`   cần thêm ${need} (đang có ${have})`);

    const dir = join(STAGE, bucketName, item.id);
    mkdirSync(dir, { recursive: true });
    /** Số ảnh lấy được cho RIÊNG nhóm này — phải đặt lại ở mỗi vòng. */
    let got = 0;

    // ── PHA 1: GOM ứng viên theo metadata (chưa tải ảnh nào) ──────────────
    //
    // 🔴 HẠN NGẠCH THEO TỪNG TRUY VẤN, không phải một rổ chung. Bản đầu dùng
    // rổ chung nên truy vấn ĐẦU lấp đầy `SCREEN_CAP` trước, và truy vấn thứ
    // ba — cái nhắm thẳng châu Á — KHÔNG BAO GIỜ được ngó tới. Đo ra kho chỉ
    // 25% châu Á rồi tôi suýt đi chỉnh trọng số điểm, trong khi lỗi nằm ở chỗ
    // ứng viên châu Á chưa từng vào rổ. Chia hạn ngạch là sửa đúng tầng.
    const seenHere = new Set();
    const cands = [];
    const perQuery = Math.ceil(SCREEN_CAP / item.queries.length);
    const plan = item.queries.flatMap((q) => [
      { q, page: 1 },
      { q, page: 2 },
    ]);
    const takenPerQuery = new Map();
    for (const { q, page } of plan) {
      if (cands.length >= SCREEN_CAP) break;
      if ((takenPerQuery.get(q) ?? 0) >= perQuery) continue;
      let hits;
      try {
        // CỐ Ý không truyền `category`: lượt đầu dùng nó thì `chia-xa` chỉ còn
        // 124 ứng viên rồi trôi sang ảnh lạc đề. Thà rộng ứng viên + siết bằng
        // `must` (đo trên tag thật) hơn là hẹp đầu vào rồi phải nhận đồ thừa.
        const json = await pixabaySearch({ q, page: String(page) });
        hits = json.hits || [];
        if (!hits.length) continue;
      } catch (e) {
        console.error(`   🔴 truy vấn hỏng: ${e.message}`);
        break;
      }
      for (const hit of hits) {
        if (cands.length >= SCREEN_CAP) break;
        if ((takenPerQuery.get(q) ?? 0) >= perQuery) break;
        if (known.has(`pixabay:${hit.id}`) || seenHere.has(hit.id)) continue;
        const why = passesMetadata(hit, item);
        if (why) {
          rejected.push({ id: hit.id, why });
          continue;
        }
        seenHere.add(hit.id);
        takenPerQuery.set(q, (takenPerQuery.get(q) ?? 0) + 1);
        cands.push(hit);
      }
    }
    console.log(`   gom ${cands.length} ứng viên qua cổng thẻ`);
    if (DRY) {
      for (const hit of cands.slice(0, need)) {
        console.log(`   [dry] ${hit.id}  ←  ${captionFromTags(hit.tags).slice(0, 56)}`);
        dryCount++;
      }
      continue;
    }

    // ── PHA 2: SOI ẢNH trên bản xem trước 6KB, loại theo NGƯỠNG ────────────
    const scored = [];
    for (const hit of cands) {
      if (!ffmpeg || !hit.previewURL) {
        // Không đo được thì KHÔNG âm thầm cho qua — nói ra rồi bỏ, vì cả bộ
        // tiêu chí "moody" nằm ở đây. Cho qua mù là tự tắt cái cổng này đi.
        rejected.push({ id: hit.id, why: 'không đo được ảnh (thiếu ffmpeg/preview)' });
        continue;
      }
      let m = null;
      try {
        await sleep(DL_GAP_MS);
        const pr = await fetch(hit.previewURL);
        if (!pr.ok) throw new Error(`preview HTTP ${pr.status}`);
        const ptmp = join(dir, `.probe-${hit.id}.jpg`);
        writeFileSync(ptmp, Buffer.from(await pr.arrayBuffer()));
        m = measureImage(ffmpeg, ptmp, join(dir, `.probe-${hit.id}.png`));
        rmSync(ptmp, { force: true });
        rmSync(join(dir, `.probe-${hit.id}.png`), { force: true });
      } catch (e) {
        rejected.push({ id: hit.id, why: `soi ảnh hỏng: ${e.message}` });
        continue;
      }
      const fail =
        (m.mean > BRIGHT_MAX && `quá sáng L=${m.mean}`) ||
        (m.sat > SAT_MAX && `màu quá tươi sat=${m.sat}`) ||
        (m.detail > DETAIL_MAX && `nền rối=${m.detail}`) ||
        (m.sd < SD_MIN && `phẳng lì sd=${m.sd}`);
      if (fail) {
        rejected.push({ id: hit.id, why: fail });
        screened++;
        continue;
      }
      scored.push({ hit, m, ...scoreCandidate(hit, m) });
    }

    // ── PHA 3: XẾP HẠNG rồi lấy phần đầu — đây mới là chỗ "CHỌN" ──────────
    // Sắp giảm dần theo điểm; hoà thì bức TỐI hơn thắng (đúng brief moody).
    scored.sort((a, b) => b.score - a.score || a.m.mean - b.m.mean);
    const winners = scored.slice(0, need);
    const nAsia = scored.filter((s) => s.why.includes('châu Á')).length;
    console.log(
      `   qua ngưỡng ${scored.length}/${cands.length} · châu Á ${nAsia} · lấy ${winners.length}`
    );

    for (const w of winners) {
      const hit = w.hit;
      const file = `${bucketName}/${item.id}/${hit.id}.jpg`;
      const abs = join(dir, `${hit.id}.jpg`);
      try {
        await sleep(DL_GAP_MS);
        const r = await fetch(hit.largeImageURL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        writeFileSync(abs, Buffer.from(await r.arrayBuffer()));
        // Đo lại trên chính bản lớn để manifest ghi SỐ THẬT của file trong kho,
        // không phải số suy từ bản xem trước.
        let m = w.m;
        try {
          m = measureImage(ffmpeg, abs, join(dir, `.${hit.id}.png`));
          rmSync(join(dir, `.${hit.id}.png`), { force: true });
        } catch {
          /* giữ số đo của bản xem trước — đã chứng minh lệch ~0,2 */
        }
        known.add(`pixabay:${hit.id}`);
        added.push({
          id: `${item.id}-${hit.id}`,
          bucket: bucketName,
          key: item.id,
          file,
          caption: captionFromTags(hit.tags),
          width: Math.round((hit.imageWidth / hit.imageHeight) * 1280),
          height: 1280,
          brightness: { mean: m.mean, sd: m.sd },
          sat: m.sat,
          detail: m.detail,
          score: w.score,
          matched: w.why,
          textSafe: m.mean <= BRIGHT_MAX,
          provider: 'pixabay',
          providerId: hit.id,
          pageURL: hit.pageURL,
          author: hit.user,
          authorURL: hit.userURL,
          license: 'Pixabay Content License',
          fetchedAt: new Date().toISOString().slice(0, 10),
        });
        got++;
        console.log(
          `   ✓ ${String(hit.id).padEnd(9)} điểm ${String(w.score).padStart(3)} ` +
            `L=${String(m.mean).padStart(5)} sat=${String(m.sat).padStart(5)} rối=${String(m.detail).padStart(4)}` +
            `  [${w.why.join(' ')}]  ${captionFromTags(hit.tags).slice(0, 38)}`
        );
      } catch (e) {
        console.error(`   🔴 tải hỏng ${hit.id}: ${e.message}`);
      }
    }
    if (got < need) console.log(`   ⚠️ chỉ lấy được ${got}/${need} — nới truy vấn hoặc hạ --per`);
  }
}

if (DRY) {
  console.log(`\n[dry-run] sẽ thêm ${dryCount} ảnh, ${apiCalls} lượt gọi API. Không ghi gì.`);
  process.exit(0);
}

manifest.images.push(...added);
manifest.generatedAt = new Date().toISOString().slice(0, 10);
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

const safe = added.filter((a) => a.textSafe === true).length;
const bright = added.filter((a) => a.textSafe === false).length;
console.log(`\n════ XONG ════`);
console.log(`  thêm       ${added.length} ảnh  (${safe} đặt chữ được · ${bright} quá sáng)`);
console.log(`  kho        ${manifest.images.length} ảnh`);
console.log(`  API        ${apiCalls} lượt (trần ${MAX_REQUESTS})`);
console.log(
  `  loại bỏ    ${rejected.length} ứng viên (${screened} trong số đó sau khi soi độ sáng)`
);
console.log(`  manifest   ${rel(MANIFEST)}`);
console.log(`  ảnh        ${rel(STAGE)}  (NGOÀI git)`);
console.log(`\n⏭ Bước sau: đẩy ${rel(STAGE)} lên Supabase Storage rồi điền \`url\` vào manifest.`);
console.log(`   Cần SUPABASE_SERVICE_KEY — xem scripts/stock-upload.mjs.`);
