// scripts/stock-video.mjs
// ============================================================
// NHẬP KHO VIDEO NỀN từ Pixabay cho clip insight.
//
// 🔑 VÌ SAO CÓ FILE NÀY (đọc trước khi sửa):
// Lượt trước tôi vẽ một nhân vật SVG rồi cho nó cử động. Henry xem và bác:
// *"vừa xấu vừa chả liên quan gì đến nội dung script. Cho vào càng thêm
// confused."* Cả hai vế đều đúng, và vế thứ hai là vế cấu trúc:
//
//   · Tư thế nhân vật do TÔI gõ tay trong `insight.ts` — không có cơ chế nào
//     nối nó với lời đọc, nên nó lệch là chuyện đương nhiên.
//   · Nặng hơn: clip này có CHỮ CHẠY + GIỌNG ĐỌC. Một nhân vật cử động là một
//     CHỦ THỂ, mà chủ thể thì tranh mắt với chữ. Chính CLAUDE.md đã đo đúng
//     điều đó ở lượt chọn ảnh: *"ảnh đổi mỗi 3 giây thì mắt chạy theo ảnh chứ
//     không đọc chữ"*. Nhân vật cử động còn mạnh hơn một bức ảnh đổi.
//
// Khảo sát GitHub cả topic `youtube-shorts-generator`: KHÔNG repo nào vẽ nhân
// vật, tất cả đều đi stock footage. Đó không phải vì họ lười — đó là hình dạng
// đúng cho loại clip có chữ dẫn dắt. Nền phải là NỀN.
//
// ⚖️ ĐIỀU KHOẢN — đọc tận nơi `pixabay.com/api/docs/` ngày 18/08/2026, và
// video KHÁC ảnh đúng một điểm, nguyên văn:
//     "Videos may be embedded directly in your applications. Yet, we recommend
//      storing them on your server."
// Tức video ĐƯỢC PHÉP hotlink (ảnh thì "permanent hotlinking … is not
// allowed"). Vẫn tải về, vì hai lý do KHÁC luật: render lại sau 6 tháng phải
// ra đúng clip đó, và lượt dựng trên GitHub Actions không nên phụ thuộc CDN
// bên thứ ba. Các luật còn lại áp y như kho ảnh: cache 24h, không tải ồ ạt.
//
// ⚠️ CỐ Ý KHÔNG có `schedule`. Đây là lượt dựng kho, chạy tay khi thiếu.
// ============================================================

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  renameSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { execFileSync } from 'child_process';
import {
  BUCKETS,
  TEXT_BAND,
  captionFromTags,
  ensureProxyEnv,
  findFfmpeg,
  measureImage,
  measureMotion,
  passesTags,
  pixabayKey,
  sleep,
  tagSet,
  ASIA_TAGS,
  STYLE_TAGS,
} from './stock-lib.mjs';

ensureProxyEnv();

const ROOT = new URL('..', import.meta.url).pathname;
const STAGE = join(ROOT, 'remotion/public/stock-video');
const MANIFEST = join(ROOT, 'lib/video/stock-video-manifest.json');
const CACHE = join(STAGE, '.api-cache');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const BUCKET = val('--bucket', 'tone');
const PER = Number(val('--per', '2'));
const DRY = has('--dry-run');
const LIST = has('--list');
const ONLY = val('--only', '');

/** Trần cứng lượt gọi API mỗi lượt chạy — "systematic mass downloads are not allowed". */
const MAX_REQUESTS = 40;
const API_GAP_MS = 700;
const DL_GAP_MS = 500;

/**
 * ══════════════════════════════════════════════════════════════════════
 * NGƯỠNG VIDEO — vì sao KHÔNG chép nguyên bộ ngưỡng của kho ảnh
 * ══════════════════════════════════════════════════════════════════════
 * Kho ảnh chốt `BRIGHT_MAX = 95` cho tiêu chí "cinematic moody" trên ảnh
 * TĨNH nằm dưới lớp phủ 0,20. Video nền còn đi qua thêm hai lớp nữa —
 * `playbackRate` chậm và `blur(6px)` — nhưng lớp phủ thì y hệt, nên trần độ
 * sáng giữ nguyên mức của ảnh. Đổi lớp phủ trong `InsightClip` là phải đo lại,
 * đừng chỉnh theo cảm giác.
 */
const BRIGHT_MAX = 95;
const SAT_MAX = 40;
const DETAIL_MAX = 18;
/** Sàn tương phản — chỉ loại đoạn PHẲNG LÌ, không phải để đòi ảnh gắt. */
const SD_MIN = 20;

/**
 * Độ dài tối thiểu. Clip insight dài ~40 giây; ở `playbackRate` 0,5 thì một
 * đoạn 20 giây phủ trọn mà không phải lặp. Dưới 12 giây thì dù có chậm lại
 * vẫn phải lặp nhiều vòng, và mắt ĐỌC RA vòng lặp — lúc đó nền lại thành thứ
 * gây chú ý, tức hỏng đúng việc nó sinh ra để làm.
 */
const MIN_DURATION = 12;

/** Đủ điểm ảnh để cắt dọc 9:16 mà không nát. */
const MIN_HEIGHT = 1000;

/** Trần dung lượng một tệp — kho nằm ngoài git nhưng vẫn phải tải về được. */
const MAX_MB = 60;

/** Trần ứng viên SOI mỗi nhóm. */
const SCREEN_CAP = 24;

/**
 * ══════════════════════════════════════════════════════════════════════
 * ĐỘ ĐỘNG — cổng QUAN TRỌNG NHẤT của kho video, và là cổng tôi đã BỎ SÓT
 * ══════════════════════════════════════════════════════════════════════
 * Lượt nhập đầu chỉ gác TỐI + THẺ. Kết quả: lọt một đoạn giọt nước BÁM KÍNH
 * (`1,99`/giây — gần như đứng im), render ra clip mà Henry xem xong nói *"trong
 * clip tao ko thấy video chi thấy hình tĩnh"*. Nếu nền không nhúc nhích thì cả
 * lý do đổi từ ảnh sang video biến mất.
 *
 * 🔑 Và nó KHÔNG phải xui: cổng độ sáng ĐẨY thẳng về phía đó — đoạn càng tối,
 * càng phẳng thì càng dễ là đoạn chẳng có gì chuyển động. Hai cổng kéo ngược
 * nhau, nên thiếu cổng này là cổng kia tự chọn ra đoạn tĩnh.
 *
 * Mốc đo được (thang 0–255 mỗi giây, ở tốc độ GỐC):
 *     giọt nước bám kính  1,99   ← phải LOẠI
 *     mây trôi           14,6    ← đúng mức
 *     phố có người        20,4   ← nhiều, nhưng còn dùng được
 *
 * ⚠️ `MOTION_MIN` hiệu chỉnh trên ba mẫu đó — ít, nên đây là NGƯỠNG KHỞI ĐIỂM
 * chứ không phải một phép đo chắc. `MOTION_MAX` thì lỏng hẳn, chỉ để chặn đoạn
 * rung giật / cắt cảnh liên tục; phần "nền rối" đã có `DETAIL_MAX` lo.
 *
 * 🔴 VÒNG SAU — MỘT NGƯỠNG TRUNG BÌNH LÀ CHƯA ĐỦ, VÀ ĐÂY LÀ BẰNG CHỨNG.
 * Cổng trên đo TRUNG BÌNH |Δ| toàn khung. Trung bình thì **một dải nhỏ động
 * mạnh gánh được cả khung đứng im** — đúng thứ vừa để lọt. Đo lại 12 đoạn
 * đang có, đặt trung bình cạnh TRUNG VỊ:
 *
 *     đoạn                       TB (cổng cũ)   trung vị
 *     cầu đêm + mặt nước             11,77          0,9   ← lọt, mà là ảnh tĩnh
 *     đồng lúa mì                     9,49          0,0   ← LỌT, KHÔNG MỘT ĐIỂM ẢNH NÀO ĐỔI
 *     hồ Pleiku                       7,06          1,2
 *     sân ga                          6,14          2,3
 *     cổng vòm                       12,15          3,8
 *     rừng đêm sao                   11,30          5,6
 *     rừng tối                       22,61          7,7
 *     siêu thực                      14,23          9,4
 *     mây vần                        14,61         11,0
 *     phố Ấn Độ                      20,42         12,6
 *     đèn lắc trong gió              38,54         32,8
 *     đôi bàn tay trên phố           42,55         30,4
 *
 * ⇒ Trung bình 9,49 mà trung vị **0,0**: quá nửa khung hình KHÔNG đổi một đơn
 * vị nào trong trọn một giây. Cổng cũ chấm nó là "đủ động".
 *
 * 🔑 Hai con số trả lời hai câu khác nhau, phải hỏi CẢ HAI:
 *     TRUNG BÌNH → "có chuyển động không?"
 *     TRUNG VỊ   → "chuyển động có TRẢI RA KHÔNG, hay dồn vào một dải?"
 * Mắt người đọc ra "video" theo câu thứ hai. `MOTION_SPREAD_MIN = 5` cắt đúng
 * chỗ dữ liệu tự tách (3,8 ↔ 5,6), không phải số chọn cho vừa.
 */
const MOTION_MIN = 6;
const MOTION_MAX = 45;
const MOTION_SPREAD_MIN = 5;

/**
 * Phải khớp ÍT NHẤT MỘT tiêu chí brief (châu Á · moody · retro · huyền bí · dọc
 * · đủ dài) mới được lấy.
 *
 * 🔴 Vì sao cần: lượt nhập đầu đủ 10 tông có ba đoạn `matched: []` — tức khớp
 * **không tiêu chí nào**, chỉ được điểm nhờ hơi tối — và đúng ba đoạn đó là ba
 * đoạn nhìn vào thấy sai ngay: một con **THẰN LẰN đang săn mồi** (lọt tông "tối
 * giản" vì thẻ `wall lizard` tách ra có chữ `wall`), một cảnh rừng chung chung,
 * và **trẻ con chạy trong hẻm** dưới tông "bế tắc".
 *
 * 🔑 Đây là cổng ĐÚNG TẦNG hơn việc thêm mãi tên con vật vào `DENY_TAGS`: nó
 * chặn *mọi* thứ lạc brief, kể cả loại tôi chưa nghĩ ra. Chấp nhận tông nào
 * không đủ hàng thì để thiếu — thà ít mà đúng.
 *
 * ⚠️ Cũng lộ một cơ chế: khớp theo TỪ làm thẻ GHÉP khớp nhầm nửa còn lại
 * (`wall lizard` → `wall`). Ngược chiều với bẫy `war`/`warm` đã ghi, cùng gốc.
 */
const MIN_MATCHED = 1;

// ============================================================
// TIỆN ÍCH
// ============================================================
const rel = (p) => p.replace(ROOT, '');

function loadManifest() {
  if (!existsSync(MANIFEST)) {
    return { version: 1, provider: 'pixabay', license: 'Pixabay Content License', videos: [] };
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

let apiCalls = 0;

async function pixabayVideoSearch(params) {
  const qs = new URLSearchParams({
    key: pixabayKey(),
    safesearch: 'true',
    per_page: '50',
    ...params,
  });
  const cacheFile = join(CACHE, `${hash(qs.toString())}.json`);
  // "requests must be cached for 24 hours" — điều khoản, không phải tối ưu.
  if (existsSync(cacheFile)) {
    const age = Date.now() - Number(readFileSync(cacheFile + '.ts', 'utf8'));
    if (age < 24 * 3600e3) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  }
  if (apiCalls >= MAX_REQUESTS) {
    throw new Error(`chạm trần ${MAX_REQUESTS} lượt gọi API trong một lượt chạy`);
  }
  await sleep(API_GAP_MS);
  apiCalls++;
  const res = await fetch(`https://pixabay.com/api/videos/?${qs}`);
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const json = await res.json();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(json));
  writeFileSync(cacheFile + '.ts', String(Date.now()));
  return json;
}

/** Chọn bản tải: to nhất mà còn dưới trần dung lượng. */
function pickRendition(hit) {
  const order = ['large', 'medium', 'small'];
  const ok = order
    .map((k) => ({ k, ...(hit.videos?.[k] || {}) }))
    .filter((v) => v.url && v.height >= MIN_HEIGHT && v.size / 1048576 <= MAX_MB);
  return ok[0] || null;
}

function passesVideoMeta(hit, item) {
  if (hit.isAiGenerated === true) return 'video do AI sinh';
  if (hit.isLowQuality === true) return 'nhà cung cấp đánh dấu chất lượng thấp';
  if (hit.isGRated === false) return 'không phải G-rated';
  if ((hit.duration || 0) < MIN_DURATION) return `chỉ dài ${hit.duration}s (cần ≥${MIN_DURATION}s)`;
  if (!pickRendition(hit)) return `không bản nào đủ cao ≥${MIN_HEIGHT}px dưới ${MAX_MB}MB`;
  // Cổng đạo đức · cổng người-phải-châu-Á · cổng liên quan: CHUNG với kho ảnh.
  return passesTags(hit.tags, item);
}

/**
 * Chấm điểm XẾP HẠNG. Giống kho ảnh: đây là *mức khớp brief*, KHÔNG phải "đẹp".
 *
 * Khác kho ảnh đúng một điểm: cộng điểm cho video DỌC. Ảnh thì tỉ lệ dọc là
 * cổng CHẶN (`< 1.2` là loại), còn video dọc trên kho stock hiếm hơn hẳn —
 * chặn cứng là rổ ứng viên rỗng. Nền lại nằm dưới lớp phủ + blur nên cắt giữa
 * từ bản ngang vẫn dùng được. ⇒ đưa xuống thành ĐIỂM CỘNG.
 */
function scoreVideo(hit, m, r) {
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
  if (r.height / r.width >= 1.2) {
    s += 25;
    why.push('dọc');
  }
  // Đủ dài để KHÔNG phải lặp ở tốc độ 0,5× — thứ đắt nhất sau độ tối.
  if (hit.duration >= 20) {
    s += 15;
    why.push(`${hit.duration}s`);
  }
  s += (1 - m.mean / BRIGHT_MAX) * 20;
  s += (1 - m.sat / SAT_MAX) * 20;
  s += (1 - m.detail / DETAIL_MAX) * 15;
  return { score: Math.round(s), why };
}

// ============================================================
// CHẠY
// ============================================================
if (LIST) {
  for (const [name, items] of Object.entries(BUCKETS)) {
    console.log(`\n[${name}]`);
    for (const it of items) console.log(`  ${it.id.padEnd(14)} ${it.vi}`);
  }
  process.exit(0);
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.error('🔴 Không tìm thấy ffmpeg — cần nó để đo độ sáng trên ảnh đại diện.');
  process.exit(1);
}

/**
 * 🪤 BẪY ĐÃ VẤP, ghi để khỏi dò lại: bản ffmpeg đi kèm Playwright chỉ có **3
 * demuxer** (`image2pipe`, `matroska/webm`) và **không có demuxer mp4, không
 * có decoder h264**. Nên KHÔNG đo được khung hình của chính tệp mp4 tại máy
 * này — mọi lượt thử đều trả `Invalid data found when processing input`.
 *
 * ⇒ Đo độ sáng trên ẢNH ĐẠI DIỆN (`thumbnail`, JPEG) mà API trả kèm. Đây đúng
 * là mẹo đã chứng minh ở kho ảnh: soi bản xem trước rồi mới tải bản lớn, sai
 * lệch tuyệt đối trung bình 0,19 trên thang 0–255.
 *
 * ⚠️ HỆ QUẢ PHẢI NÓI THẲNG: thumbnail là MỘT khung hình, nên máy gác được độ
 * SÁNG nhưng **không gác được ĐỘ ĐỘNG** của đoạn phim. Một đoạn quay giật hay
 * cắt cảnh liên tục vẫn lọt. Cách xử hiện tại không phải đo mà là ÉP: nền phát
 * ở `playbackRate` chậm trong `InsightClip`. Đừng đọc "84/84 đạt" thành "84
 * đoạn phim đủ tĩnh".
 */
const manifest = loadManifest();
const known = new Set(manifest.videos.map((v) => `${v.provider}:${v.providerId}`));
const added = [];
const rejected = [];

const groups = BUCKET === 'all' ? Object.entries(BUCKETS) : [[BUCKET, BUCKETS[BUCKET]]];
if (!groups[0]?.[1]) {
  console.error(`🔴 Không có nhóm "${BUCKET}". Dùng --bucket tone|subject|all`);
  process.exit(1);
}

let dryCount = 0;

for (const [bucketName, items] of groups) {
  for (const item of items) {
    if (ONLY && item.id !== ONLY) continue;
    const have = manifest.videos.filter((v) => v.key === item.id).length;
    const need = Math.max(0, PER - have);
    console.log(`\n■ ${bucketName}/${item.id} — ${item.vi}  (đã có ${have}, cần thêm ${need})`);
    if (!need) {
      console.log('   ↷ đủ rồi, bỏ qua');
      continue;
    }

    // Hạn ngạch THEO TỪNG TRUY VẤN. Lượt tuyển ảnh trước đã trả giá đúng chỗ
    // này: trần chung bị truy vấn ĐẦU TIÊN lấp đầy, mà truy vấn nhắm châu Á
    // đứng thứ BA nên không bao giờ được hỏi tới ⇒ kho ra 25% châu Á.
    const perQuery = Math.ceil(SCREEN_CAP / item.queries.length);
    const cands = [];
    for (const q of item.queries) {
      let hits = [];
      try {
        const r = await pixabayVideoSearch({ q, video_type: 'film' });
        hits = r.hits || [];
      } catch (e) {
        console.error(`   🔴 truy vấn "${q}": ${e.message}`);
        continue;
      }
      let taken = 0;
      for (const hit of hits) {
        if (taken >= perQuery) break;
        if (known.has(`pixabay:${hit.id}`)) continue;
        if (cands.some((c) => c.hit.id === hit.id)) continue;
        const why = passesVideoMeta(hit, item);
        if (why) {
          rejected.push({ id: hit.id, why });
          continue;
        }
        cands.push({ hit, q });
        taken++;
      }
    }
    console.log(`   ${cands.length} ứng viên qua cổng thẻ`);

    // Soi độ sáng trên ảnh đại diện TRƯỚC khi tải bản phim (vài KB thay vì
    // vài chục MB) — cùng lối "soi bản nhỏ trước" của kho ảnh.
    const dir = join(STAGE, bucketName, item.id);
    mkdirSync(dir, { recursive: true });
    let scored = [];
    for (const c of cands) {
      const r = pickRendition(c.hit);
      const thumb = r.thumbnail || c.hit.videos?.medium?.thumbnail;
      if (!thumb) {
        rejected.push({ id: c.hit.id, why: 'không có ảnh đại diện để soi' });
        continue;
      }
      const tmpJpg = join(dir, `.${c.hit.id}.jpg`);
      const tmpPng = join(dir, `.${c.hit.id}.png`);
      try {
        await sleep(DL_GAP_MS);
        const res = await fetch(thumb);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        writeFileSync(tmpJpg, Buffer.from(await res.arrayBuffer()));
        // `crop916` — đo ĐÚNG phần sẽ lên hình, xem chú thích ở `measureImage`.
        const m = measureImage(ffmpeg, tmpJpg, tmpPng, 'crop916');
        // Bốn ngưỡng ĐỀU chặn cứng, khớp nguyên bộ với kho ảnh. Lượt đầu tôi
        // chỉ port mỗi độ sáng và lọt ngay một đoạn hoàng hôn `sat=64,6`
        // (`sunset, karate`) — đúng thứ brief gọi là "sáng-vui-nhiều-màu".
        const why =
          (m.mean > BRIGHT_MAX && `quá sáng L=${m.mean}`) ||
          (m.sat > SAT_MAX && `màu quá tươi sat=${m.sat}`) ||
          (m.detail > DETAIL_MAX && `nền rối=${m.detail}`) ||
          (m.sd < SD_MIN && `phẳng lì sd=${m.sd}`);
        if (why) {
          rejected.push({ id: c.hit.id, why });
          continue;
        }
        scored.push({ ...c, r, m, ...scoreVideo(c.hit, m, r) });
      } catch (e) {
        rejected.push({ id: c.hit.id, why: `soi ảnh đại diện hỏng: ${e.message}` });
      } finally {
        rmSync(tmpJpg, { force: true });
        rmSync(tmpPng, { force: true });
      }
    }
    const junk = scored.filter((w) => w.why.length < MIN_MATCHED);
    for (const w of junk) rejected.push({ id: w.hit.id, why: 'không khớp tiêu chí brief nào' });
    scored = scored.filter((w) => w.why.length >= MIN_MATCHED);
    scored.sort((a, b) => b.score - a.score);
    const winners = scored.slice(0, need);
    console.log(`   ${scored.length} qua cổng độ sáng · lấy ${winners.length}`);

    if (DRY) {
      for (const w of winners) {
        console.log(
          `   [dry] ${String(w.hit.id).padEnd(9)} điểm ${String(w.score).padStart(3)} ` +
            `${w.r.width}x${w.r.height} ${w.hit.duration}s ` +
            `${(w.r.size / 1048576).toFixed(1)}MB L=${w.m.mean} [${w.why.join(' ')}]`
        );
      }
      dryCount += winners.length;
      continue;
    }

    // Độ động chỉ đo được trên TỆP PHIM, nên phải tải rồi mới biết — khác mọi
    // cổng khác vốn chặn trước khi tốn byte nào. Đoạn nào trượt thì XOÁ và lấy
    // ứng viên kế tiếp, thay vì bỏ trống chỗ.
    const queue = scored.slice();
    let taken = 0;
    while (taken < need && queue.length) {
      const w = queue.shift();
      const file = `${bucketName}/${item.id}/${w.hit.id}.mp4`;
      const abs = join(dir, `${w.hit.id}.mp4`);
      try {
        await sleep(DL_GAP_MS);
        const res = await fetch(w.r.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 10240) throw new Error(`tệp chỉ ${buf.length} byte`);
        writeFileSync(abs, buf);

        // Thu nhỏ về 1920 NGAY LÚC NHẬP — đo được: nền 4K làm render chậm gấp
        // 3 (12 phút thay vì 4 cho cùng một clip 32 giây) vì `OffthreadVideo`
        // giải mã lại từng khung ở độ phân giải gốc rồi mới thu về 1080×1920.
        // Nền còn bị `blur` + lớp phủ nên độ phân giải dư đó KHÔNG lên hình.
        // ⚠️ Đối chứng khi làm: đo lại độ động trước/sau trên 3 đoạn 4K —
        // 14,61→14,56 · 22,61→22,58 · 9,42→9,31, tức phép đo không đổi nghĩa.
        let w2 = w.r.width;
        let h2 = w.r.height;
        if (w2 > 1920) {
          const small = join(dir, `${w.hit.id}.small.mp4`);
          execFileSync(
            ffmpeg,
            [
              '-hide_banner',
              '-v',
              'error',
              '-i',
              abs,
              '-vf',
              'scale=1920:-2',
              '-c:v',
              'libx264',
              '-crf',
              '20',
              '-preset',
              'medium',
              '-an',
              '-movflags',
              '+faststart',
              '-y',
              small,
            ],
            { stdio: ['ignore', 'ignore', 'pipe'] }
          );
          renameSync(small, abs);
          h2 = Math.round((h2 * 1920) / w2);
          w2 = 1920;
        }

        const mo = measureMotion(ffmpeg, abs, w.hit.duration, dir);
        const motion = mo.mean;
        const spread = mo.spread;
        // Ba nhánh TỪ CHỐI, và nhánh thứ ba là nhánh mới: động đủ mạnh nhưng
        // dồn vào một dải ⇒ phần lớn khung hình vẫn đứng im ⇒ mắt đọc ra ảnh
        // tĩnh. Xem bảng số đo ở khối chú thích `MOTION_SPREAD_MIN`.
        const badMotion =
          motion < MOTION_MIN
            ? `gần như đứng im (TB ${motion}/giây)`
            : motion > MOTION_MAX
              ? `động quá (TB ${motion}/giây)`
              : spread < MOTION_SPREAD_MIN
                ? `động dồn một dải — quá nửa khung đứng im (trung vị ${spread}, TB ${motion})`
                : null;
        if (badMotion) {
          rmSync(abs, { force: true });
          rejected.push({ id: w.hit.id, why: badMotion });
          console.log(`   ↷ bỏ ${String(w.hit.id).padEnd(9)} ${badMotion}`);
          continue;
        }

        known.add(`pixabay:${w.hit.id}`);
        taken++;
        added.push({
          id: `${item.id}-${w.hit.id}`,
          bucket: bucketName,
          key: item.id,
          file,
          caption: captionFromTags(w.hit.tags),
          width: w2,
          height: h2,
          duration: w.hit.duration,
          bytes: statSync(abs).size,
          brightness: { mean: w.m.mean, sd: w.m.sd },
          motion,
          motionSpread: spread,
          sat: w.m.sat,
          detail: w.m.detail,
          score: w.score,
          matched: w.why,
          textSafe: w.m.mean <= BRIGHT_MAX,
          provider: 'pixabay',
          providerId: w.hit.id,
          pageURL: w.hit.pageURL,
          author: w.hit.user,
          authorURL: w.hit.userURL,
          license: 'Pixabay Content License',
          fetchedAt: new Date().toISOString().slice(0, 10),
        });
        console.log(
          `   ✓ ${String(w.hit.id).padEnd(9)} điểm ${String(w.score).padStart(3)} ` +
            `${w2}x${h2} ${w.hit.duration}s ` +
            `${(buf.length / 1048576).toFixed(1)}MB L=${w.m.mean} động=${motion}/${spread} [${w.why.join(' ')}]  ` +
            captionFromTags(w.hit.tags).slice(0, 34)
        );
      } catch (e) {
        console.error(`   🔴 tải hỏng ${w.hit.id}: ${e.message}`);
      }
    }
  }
}

if (DRY) {
  console.log(`\n[dry-run] sẽ thêm ${dryCount} video, ${apiCalls} lượt gọi API. Không ghi gì.`);
  process.exit(0);
}

manifest.videos.push(...added);
manifest.generatedAt = new Date().toISOString().slice(0, 10);
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n════ XONG ════`);
console.log(`  thêm       ${added.length} video`);
console.log(`  kho        ${manifest.videos.length} video`);
console.log(`  API        ${apiCalls} lượt (trần ${MAX_REQUESTS})`);
console.log(`  loại bỏ    ${rejected.length} ứng viên`);
console.log(`  manifest   ${rel(MANIFEST)}`);
console.log(`  video      ${rel(STAGE)}  (NGOÀI git)`);
console.log(
  `\n⚠️ Máy gác được: đạo đức · lạc kênh · liên quan · độ sáng · người-phải-châu-Á · ĐỘ ĐỘNG.`
);
console.log(`   Máy KHÔNG gác được: ĐẸP, và "đoạn phim này có ăn nhập với lời đọc không".`);
console.log(`   Dải giữa khung đo cho khối chữ: ${TEXT_BAND[0]}–${TEXT_BAND[1]} chiều cao.`);
