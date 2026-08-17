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
import { execFileSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { inflateSync } from 'zlib';
import { join, dirname } from 'path';

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
 * Trần độ sáng trung bình (0–255) của dải giữa khung để chữ còn đọc được.
 *
 * 🔴 SỐ NÀY ĐO RA, KHÔNG PHẢI ĐOÁN — xem `--report` để thấy phân bố thật của
 * kho. Đặt ở 165: trên mức đó thì nền sáng ngang chữ trắng, `TextPlate` phải
 * gánh toàn bộ tương phản và bức ảnh mất hết vai trò.
 */
const BRIGHT_MAX = 165;
/** Dải giữa khung nơi khối chữ ngồi — khớp bố cục `InsightClip`. */
const TEXT_BAND = [0.3, 0.7];

// ============================================================
// HAI CỔNG LỌC NỘI DUNG — cả hai đều rút từ ẢNH THẬT lượt chạy đầu
// ============================================================
/**
 * 🔴 CỔNG ĐẠO ĐỨC — tag nào dính là LOẠI, không bàn thêm.
 *
 * Không phải lo hão: lượt nhập ĐẦU TIÊN, truy vấn "lonely person walking
 * alone" trả về **4 bức chân dung NGƯỜI VÔ GIA CƯ** (`homeless, poverty,
 * poor`), và cả 4 đều lọt mọi phép lọc kỹ thuật (đủ tối, đủ dọc, không phải
 * AI). Ghép một bức như thế dưới câu "bạn thuộc kiểu tổn thương nào" thì ảnh
 * + chữ đọc thành **một khẳng định VỀ CHÍNH NGƯỜI TRONG ẢNH** — đúng ranh
 * giới đã chốt trong CLAUDE.md, và người đó không hề đồng ý cho việc ấy.
 *
 * ⚠️ Đây là cổng CHẶN, không phải cổng chấm điểm: không có ngưỡng, không có
 * "trường hợp ngoại lệ". Muốn thêm tag thì thêm, đừng bao giờ nới ra.
 */
const DENY_TAGS = [
  'homeless',
  'poverty',
  'poor',
  'beggar',
  'begging',
  'slum',
  'refugee',
  'addiction',
  'drug',
  'alcoholic',
  'prison',
  'jail',
  'war',
  'weapon',
  'gun',
  'blood',
  'corpse',
  'funeral',
  'grave',
  'cemetery',
  'hospital',
  'patient',
  'disease',
  'wound',
  'crying child',
  'protest',
  'riot',
  'police',
];

/**
 * 🎯 CỔNG LIÊN QUAN — ảnh phải mang ÍT NHẤT MỘT tag thuộc chủ đề của tông.
 *
 * Cũng rút từ lượt chạy đầu: `chia-xa` ("chia xa") nhận về `cinema, valencia,
 * movies`; `nang-am` nhận về một con MÈO; `suy-tu` nhận về hạt cà phê rang.
 * Pixabay xếp theo độ phổ biến chứ không theo độ khớp, nên hết ứng viên hợp
 * đề tài là nó trôi sang ảnh đẹp-nhưng-lạc-đề mà KHÔNG báo gì.
 *
 * 🔑 Cổng này thay cho việc tôi ngồi nhìn từng bức: nó dùng tag CỦA NHÀ CUNG
 * CẤP, nên vẫn giữ đúng luật "mô tả không do tôi viết".
 */
function tagSet(tags) {
  return new Set(
    String(tags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
}

// ============================================================
// TAXONOMY
// ============================================================
/**
 * 🔑 TÔNG = KHÍ QUYỂN, dùng chung TOÀN KÊNH.
 *
 * Ảnh sương mù hợp cả clip tình cảm lẫn clip công việc: nó tả TÂM TRẠNG chứ
 * không tả nội dung. Nhờ vậy một kho nhỏ phục vụ được mọi kịch bản, và trùng
 * vài bức cùng tông giữa các clip là TỐT (nhận diện kênh) chứ không phải lỗi.
 *
 * Tập tông là TẬP ĐÓNG do mình chốt — 6 kịch bản insight hiện có là quá mỏng
 * để rút ra một cây phân loại từ dữ liệu, nên đừng giả vờ nó là kết quả đo.
 * `q` là tiếng Anh vì kho Pixabay gắn thẻ bằng tiếng Anh.
 */
const TONES = [
  {
    id: 'tinh-lang',
    vi: 'Tĩnh lặng — mặt nước phẳng, phòng trống, sáng sớm',
    queries: ['calm lake morning mist', 'still water reflection dawn'],
    must: ['lake', 'water', 'mist', 'fog', 'morning', 'dawn', 'reflection', 'calm', 'sea', 'river'],
  },
  {
    id: 'co-don',
    vi: 'Cô đơn — một bóng người giữa khoảng rộng',
    // ⚠️ "lonely person" kéo về chân dung người vô gia cư (xem DENY_TAGS).
    // Đổi sang SILHOUETTE/bóng lưng: đúng tông hơn, và không nhận diện được ai.
    queries: ['silhouette walking alone landscape', 'lone tree empty field fog'],
    must: [
      'silhouette',
      'alone',
      'lonely',
      'solitude',
      'lone',
      'empty',
      'field',
      'landscape',
      'fog',
    ],
  },
  {
    id: 'mo-mit',
    vi: 'Mờ mịt — sương, mưa trên kính, không thấy đường',
    queries: ['fog forest path', 'rain drops window glass'],
    must: ['fog', 'mist', 'haze', 'rain', 'drops', 'forest', 'path', 'trail', 'foggy'],
  },
  {
    id: 'be-tac',
    vi: 'Bế tắc — tường, cửa đóng, ngõ hẹp',
    queries: ['narrow alley wall', 'closed old wooden door'],
    must: ['alley', 'wall', 'door', 'narrow', 'lane', 'street', 'gate', 'stone', 'brick'],
  },
  {
    id: 'chia-xa',
    vi: 'Chia xa — đường vắng, ghế trống, sân ga',
    // ⚠️ "empty road horizon" chỉ có 124 kết quả rồi trôi sang ảnh thành phố
    // lạc đề. Bám vào VẬT chứng của sự vắng: ghế trống, đường ray, lối đi.
    queries: ['empty bench park autumn', 'railway track vanishing distance'],
    must: [
      'bench',
      'empty',
      'railway',
      'rail',
      'track',
      'road',
      'path',
      'station',
      'autumn',
      'alone',
    ],
  },
  {
    id: 'nang-am',
    vi: 'Nắng ấm — nắng xuyên cửa sổ, bình minh',
    queries: ['sunlight through curtain window', 'golden sunrise field warm light'],
    must: [
      'sunlight',
      'sunrise',
      'sunset',
      'light',
      'window',
      'curtain',
      'golden',
      'sun',
      'morning',
      'warm',
    ],
  },
  {
    id: 'suy-tu',
    vi: 'Suy tư — bàn tay, tách trà, ngồi bên cửa sổ',
    // ⚠️ "hands holding tea cup" trả về hạt cà phê rang + ảnh đôi lứa.
    // `must` chặn phần lạc; truy vấn nhấn vào tư thế ngồi một mình.
    queries: ['person sitting alone by window', 'hands holding warm cup tea'],
    must: [
      'window',
      'sitting',
      'thinking',
      'alone',
      'tea',
      'cup',
      'hands',
      'book',
      'reading',
      'quiet',
    ],
  },
  {
    id: 'chuyen-mua',
    vi: 'Chuyển mùa — lá rụng, hoàng hôn, giao mùa',
    queries: ['autumn leaves falling', 'dusk sky clouds evening'],
    must: [
      'autumn',
      'leaves',
      'foliage',
      'fall',
      'dusk',
      'evening',
      'clouds',
      'sky',
      'twilight',
      'season',
    ],
  },
];

/**
 * 🔑 CHỦ THỂ = một hình CỤ THỂ cho đúng nhịp chốt của clip.
 *
 * Khác tông ở chỗ nó gắn với NỘI DUNG chứ không phải tâm trạng, nên dùng cho
 * `scene.visual.kind='image'` (một hai cảnh mỗi clip), KHÔNG dùng làm nền.
 * ⛔ Đừng để ảnh đổi mỗi cảnh: mắt sẽ chạy theo ảnh chứ không đọc chữ, mà chữ
 * mới là nội dung — chú thích của `backdrop` đã bác lối đó từ đầu.
 */
const SUBJECTS = [
  {
    id: 'ban-tay',
    vi: 'Bàn tay — nắm, buông, chìa ra',
    queries: ['two hands reaching each other', 'open empty hand palm'],
    must: ['hand', 'hands', 'palm', 'finger', 'fingers', 'holding', 'touch'],
  },
  {
    id: 'con-duong',
    vi: 'Con đường — ngã rẽ, lối đi',
    queries: ['fork in the road path', 'winding road through forest'],
    must: ['road', 'path', 'trail', 'way', 'street', 'lane', 'crossroads', 'forest'],
  },
  {
    id: 'cua-so',
    vi: 'Cửa sổ — nhìn ra ngoài',
    queries: ['looking out window rain', 'old window frame light'],
    must: ['window', 'glass', 'curtain', 'frame', 'rain', 'looking'],
  },
  {
    id: 'ngon-den',
    vi: 'Ngọn đèn — sáng nhỏ trong tối',
    queries: ['candle light in dark room', 'single lantern night'],
    must: ['candle', 'lantern', 'lamp', 'light', 'flame', 'dark', 'night', 'darkness'],
  },
  {
    id: 'mat-nuoc',
    vi: 'Mặt nước — phản chiếu, gợn sóng',
    queries: ['water reflection ripple surface', 'still lake surface texture'],
    must: ['water', 'reflection', 'ripple', 'lake', 'surface', 'wave', 'river', 'sea'],
  },
  {
    id: 'ghe-trong',
    vi: 'Ghế trống — chỗ của người đã đi',
    queries: ['empty chair in room', 'two empty chairs facing'],
    must: ['chair', 'chairs', 'seat', 'bench', 'empty', 'furniture'],
  },
];

const BUCKETS = { tone: TONES, subject: SUBJECTS };

// ============================================================
// TIỆN ÍCH
// ============================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (p) => p.replace(ROOT, '');

function loadManifest() {
  if (!existsSync(MANIFEST)) {
    return { version: 1, provider: 'pixabay', license: 'Pixabay Content License', images: [] };
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

/**
 * Tìm ffmpeg. Container phiên này chỉ có bản đi kèm Playwright (bản đó THIẾU
 * muxer `rawvideo` và protocol `pipe:` — xem `measureBrightness`).
 */
function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  try {
    return execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim() || null;
  } catch {
    /* không có trên PATH — thử bản Playwright bên dưới */
  }
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return null;
  for (const d of readdirSync(base)) {
    if (!d.startsWith('ffmpeg')) continue;
    for (const f of ['ffmpeg-linux', 'ffmpeg-mac', 'ffmpeg.exe', 'ffmpeg']) {
      const p = join(base, d, f);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Đọc PNG xám 8-bit không xen dòng về mảng pixel.
 *
 * Tự giải mã thay vì thêm một gói phụ thuộc: `zlib` có sẵn trong Node, và ảnh
 * ở đây do CHÍNH ffmpeg vừa sinh ra nên hình dạng biết trước (gray8, không
 * interlace). Gặp hình dạng khác thì NÉM chứ không đoán bừa.
 */
function decodeGrayPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('không phải PNG');
  let o = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o);
    const typ = buf.toString('ascii', o + 4, o + 8);
    if (typ === 'IHDR') {
      w = buf.readUInt32BE(o + 8);
      h = buf.readUInt32BE(o + 12);
      depth = buf[o + 16];
      colorType = buf[o + 17];
      interlace = buf[o + 20];
    } else if (typ === 'IDAT') {
      idat.push(buf.subarray(o + 8, o + 8 + len));
    } else if (typ === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8 || colorType !== 0 || interlace !== 0) {
    throw new Error(`PNG lạ (depth=${depth} colorType=${colorType} interlace=${interlace})`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < w; x++) {
      const cur = raw[pos + x];
      const a = x > 0 ? px[y * w + x - 1] : 0;
      const b = y > 0 ? px[(y - 1) * w + x] : 0;
      const c = x > 0 && y > 0 ? px[(y - 1) * w + x - 1] : 0;
      let v;
      switch (ft) {
        case 0:
          v = cur;
          break;
        case 1:
          v = cur + a;
          break;
        case 2:
          v = cur + b;
          break;
        case 3:
          v = cur + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`filter PNG lạ: ${ft}`);
      }
      px[y * w + x] = v & 255;
    }
    pos += w;
  }
  return { w, h, px };
}

/**
 * Độ sáng trung bình + độ lệch chuẩn của DẢI GIỮA KHUNG.
 *
 * Trả `null` khi không có ffmpeg — và chỗ gọi phải NÓI RA điều đó chứ không
 * lặng lẽ coi mọi ảnh là đạt. Một phép kiểm câm còn tệ hơn không có phép kiểm.
 */
function measureBrightness(ffmpeg, jpgPath, tmpPng) {
  execFileSync(
    ffmpeg,
    [
      '-hide_banner',
      '-v',
      'error',
      // Bản ffmpeg đi kèm Playwright KHÔNG có demuxer `image2` (chỉ `image2pipe`)
      // và KHÔNG có muxer `rawvideo` — nên phải đọc qua image2pipe rồi xuất PNG.
      '-f',
      'image2pipe',
      '-i',
      `file:${jpgPath}`,
      '-vf',
      'scale=64:114,format=gray',
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-c:v',
      'png',
      '-y',
      `file:${tmpPng}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  const { w, h, px } = decodeGrayPng(readFileSync(tmpPng));
  const y0 = Math.round(h * TEXT_BAND[0]);
  const y1 = Math.round(h * TEXT_BAND[1]);
  const vals = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) vals.push(px[y * w + x]);
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  return { mean: Number(mean.toFixed(1)), sd: Number(sd.toFixed(1)) };
}

/**
 * Mô tả ảnh = TAG CỦA NHÀ CUNG CẤP, cố ý KHÔNG phải chữ tôi viết.
 *
 * 🔑 Đây là điều kiện sống còn của cả thiết kế: nếu mô tả do tôi viết thì hội
 * đồng chấm VĂN CỦA TÔI chứ không chấm bức ảnh — mô tả hay thì điểm lên, mô tả
 * nhạt thì điểm xuống. Đó là gương, không phải thước.
 *
 * Tag Pixabay lặp rất nặng ("sunset, sunset, sunset, mountains, mountains…"),
 * nên phải khử trùng lặp. Tag thuần TẢ nên luật "cấm khen" tự thoả.
 */
function captionFromTags(tags) {
  const seen = new Set();
  const out = [];
  for (const raw of String(tags || '').split(',')) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out.join(', ');
}

// ============================================================
// GỌI API (có cache 24h theo đúng điều khoản)
// ============================================================
let apiCalls = 0;

async function pixabaySearch(params) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
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

  const tags = tagSet(hit.tags);
  // Khớp theo TỪ trong tag, không phải chuỗi con: `substring` sẽ cho "poor"
  // ăn vào "poori" và "war" ăn vào "warm" — đúng lớp lỗi `\bcon\b` khớp
  // "con vật" mà repo này đã trả giá.
  const words = new Set([...tags].flatMap((t) => t.split(/[\s-]+/)));
  const hitDeny = DENY_TAGS.find((d) => (d.includes(' ') ? tags.has(d) : words.has(d)));
  if (hitDeny) return `cổng đạo đức: tag "${hitDeny}"`;

  if (item.must?.length) {
    const ok = item.must.some((m) => words.has(m) || tags.has(m));
    if (!ok) return `lạc đề (không tag nào thuộc "${item.id}")`;
  }
  return null;
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
    let got = 0;
    // Duyệt tối đa 2 trang mỗi truy vấn: siết độ sáng làm tỉ lệ đạt tụt hẳn ở
    // vài chủ đề (ảnh "ghế trống" trên kho stock phần lớn là ảnh nội thất nền
    // sáng), một trang 50 ứng viên không đủ để lấp.
    const plan = item.queries.flatMap((q) => [
      { q, page: 1 },
      { q, page: 2 },
    ]);
    for (const { q, page } of plan) {
      if (got >= need) break;
      let hits;
      try {
        // CỐ Ý không truyền `category`: lượt đầu dùng nó thì `chia-xa` chỉ còn
        // 124 ứng viên rồi trôi sang ảnh lạc đề. Thà rộng ứng viên + siết bằng
        // `must` (đo trên tag thật) hơn là hẹp đầu vào rồi phải nhận đồ thừa.
        const json = await pixabaySearch({ q, page: String(page) });
        hits = json.hits || [];
        if (!hits.length) continue;
        console.log(
          `   "${q}" tr.${page} → ${json.totalHits} kết quả duyệt được, lấy ${hits.length} ứng viên`
        );
      } catch (e) {
        console.error(`   🔴 truy vấn hỏng: ${e.message}`);
        break;
      }
      for (const hit of hits) {
        if (got >= need) break;
        const uid = `pixabay:${hit.id}`;
        if (known.has(uid)) continue;
        const why = passesMetadata(hit, item);
        if (why) {
          rejected.push({ id: hit.id, why });
          continue;
        }
        known.add(uid);

        const file = `${bucketName}/${item.id}/${hit.id}.jpg`;
        const abs = join(STAGE, bucketName, item.id, `${hit.id}.jpg`);
        if (DRY) {
          console.log(`   [dry] ${file}  ←  ${captionFromTags(hit.tags).slice(0, 60)}`);
          dryCount++;
          got++;
          continue;
        }
        mkdirSync(dir, { recursive: true });
        try {
          // ── SOI TRÊN BẢN XEM TRƯỚC, TẢI BẢN LỚN SAU ──────────────────
          // `previewURL` chỉ 5–8KB mà đo ra ĐÚNG độ sáng của bản lớn: so 8
          // cặp preview↔large, sai lệch tuyệt đối trung bình **0,19** trên
          // thang 0–255. Nhờ vậy loại được bức quá sáng khi mới tốn ~6KB
          // thay vì ~180KB — vừa lọc được kỹ hơn, vừa đúng tinh thần điều
          // khoản "không tải ồ ạt".
          let brightness = null;
          if (ffmpeg && hit.previewURL) {
            await sleep(DL_GAP_MS);
            const pr = await fetch(hit.previewURL);
            if (pr.ok) {
              const ptmp = join(dir, `.probe-${hit.id}.jpg`);
              writeFileSync(ptmp, Buffer.from(await pr.arrayBuffer()));
              try {
                brightness = measureBrightness(ffmpeg, ptmp, join(dir, `.probe-${hit.id}.png`));
              } catch (e) {
                console.warn(`   ⚠️ không đo được độ sáng ${hit.id}: ${e.message}`);
              }
              rmSync(ptmp, { force: true });
              rmSync(join(dir, `.probe-${hit.id}.png`), { force: true });
            }
          }
          if (brightness && brightness.mean > BRIGHT_MAX) {
            rejected.push({ id: hit.id, why: `quá sáng (L=${brightness.mean} > ${BRIGHT_MAX})` });
            screened++;
            continue;
          }

          await sleep(DL_GAP_MS);
          const r = await fetch(hit.largeImageURL);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buf = Buffer.from(await r.arrayBuffer());
          writeFileSync(abs, buf);

          // Đo lại trên chính bản lớn để manifest ghi SỐ THẬT của file đang
          // nằm trong kho, không phải số suy từ bản xem trước.
          if (ffmpeg) {
            try {
              brightness = measureBrightness(ffmpeg, abs, join(dir, `.${hit.id}.png`));
              rmSync(join(dir, `.${hit.id}.png`), { force: true });
            } catch (e) {
              console.warn(`   ⚠️ không đo được độ sáng ${hit.id}: ${e.message}`);
            }
          }
          const textSafe = brightness ? brightness.mean <= BRIGHT_MAX : null;

          added.push({
            id: `${item.id}-${hit.id}`,
            bucket: bucketName,
            key: item.id,
            file,
            caption: captionFromTags(hit.tags),
            width: hit.webformatWidth
              ? Math.round((hit.imageWidth / hit.imageHeight) * 1280)
              : null,
            height: 1280,
            brightness,
            textSafe,
            provider: 'pixabay',
            providerId: hit.id,
            pageURL: hit.pageURL,
            author: hit.user,
            authorURL: hit.userURL,
            license: 'Pixabay Content License',
            fetchedAt: new Date().toISOString().slice(0, 10),
          });
          got++;
          const flag = textSafe === false ? ' ⚠️ SÁNG' : '';
          console.log(
            `   ✓ ${hit.id}  ${brightness ? `L=${brightness.mean}` : 'chưa đo'}${flag}  ${captionFromTags(hit.tags).slice(0, 52)}`
          );
        } catch (e) {
          console.error(`   🔴 tải hỏng ${hit.id}: ${e.message}`);
        }
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
