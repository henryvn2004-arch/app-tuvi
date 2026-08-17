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
const TEXT_BAND = [0.3, 0.7];
/** Trần ứng viên SOI ẢNH mỗi nhóm — giữ lượt tải ở mức có chọn lọc. */
const SCREEN_CAP = 40;

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
  // ── LẠC VĂN HOÁ, không phải vấn đề đạo đức nhưng cùng cách xử: CHẶN ──
  // Kênh nói tử vi cho người Việt. Lượt chạy vừa rồi lọt một bức **Halloween
  // jack o'lantern** vào tông "bí ẩn" (nó thật sự tối, thật sự có đèn lồng,
  // qua sạch mọi ngưỡng), và lượt trước lọt "christmas hats". Ảnh lễ hội
  // phương Tây đặt dưới một câu về vận mệnh thì đọc thành lạc kênh.
  'halloween',
  'pumpkin',
  'jack o lantern',
  'christmas',
  'santa',
  'easter',
  'thanksgiving',
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

/**
 * 🌏 CHÂU Á — dấu hiệu MẠNH: quốc gia, dân tộc, văn hoá đặc thù.
 *
 * Tách riêng khỏi `ASIA_TAGS` (bên dưới) vì hai danh sách phục vụ hai việc
 * KHÁC HẲN nhau, trộn vào là hỏng cả hai:
 *   · danh sách này là **cổng CHẶN** cho ảnh có người (xem `PERSON_TAGS`)
 *   · `ASIA_TAGS` là **điểm cộng** khi xếp hạng
 * `bamboo` / `lantern` / `rice field` cố ý KHÔNG nằm ở đây: chúng nói về BỐI
 * CẢNH chứ không nói ai đang đứng trong khung. Một người mẫu Bắc Âu chụp cạnh
 * bụi tre vẫn ra `bamboo` — lấy nó làm bằng chứng "người này châu Á" là tự
 * lừa mình.
 */
const ASIA_STRONG = [
  'asia',
  'asian',
  'vietnam',
  'vietnamese',
  'hanoi',
  'saigon',
  'japan',
  'japanese',
  'tokyo',
  'kyoto',
  'okinawa',
  'korea',
  'korean',
  'seoul',
  'china',
  'chinese',
  'beijing',
  'shanghai',
  'hongkong',
  'thailand',
  'thai',
  'bangkok',
  'taiwan',
  'indonesia',
  'bali',
  'india',
  'indian',
  'nepal',
  'myanmar',
  'cambodia',
  'laos',
  'temple',
  'pagoda',
  'shrine',
  'kimono',
  'monk',
  'buddha',
  'buddhist',
  'hanbok',
  'ao dai',
];

/**
 * 🌏 CHÂU Á — danh sách RỘNG dùng để CỘNG ĐIỂM khi xếp hạng.
 *
 * Lý do sản phẩm: app viết cho người Việt, ảnh châu Á gần với người xem hơn
 * hẳn — một hành lang gỗ Nhật hay con hẻm Hà Nội "đúng chỗ mình sống" theo
 * cách một quán cà phê Bắc Âu không bao giờ đạt được.
 *
 * ⚠️ Với ảnh KHÔNG có người thì đây vẫn chỉ là điểm cộng, không chặn: rất
 * nhiều ảnh moody tốt **không được gắn thẻ quốc gia nào cả** (một dải sương
 * trên núi thì tác giả gắn `fog, mountain` chứ không gắn `asia`). Chặn cứng cả
 * kho theo thẻ là vứt phần lớn ứng viên để đổi lấy con số "100% châu Á" mà
 * thực chất chỉ đo THÓI QUEN GẮN THẺ, không đo nội dung bức ảnh.
 */
const ASIA_TAGS = [...ASIA_STRONG, 'lantern', 'bamboo', 'rice field', 'paddy', 'incense'];

/**
 * 👤 CỔNG NGƯỜI — ảnh có NGƯỜI NHÌN RÕ MẶT thì bắt buộc phải mang dấu hiệu
 * châu Á, không thì loại.
 *
 * 🔑 Vì sao chỗ này CHẶN CỨNG trong khi ảnh phong cảnh chỉ cộng điểm: hai kiểu
 * hỏng không đối xứng. Một khung núi sương "không rõ ở đâu" thì người xem
 * không đọc ra điều gì lạc; một GƯƠNG MẶT rõ ràng không phải người Việt đặt
 * dưới câu nói về vận mệnh thì lộ ngay là ảnh mua sẵn, và đó đúng thứ brief
 * gọi là "generic stock look".
 *
 * ⚠️ NHƯNG PHẢI BIẾT NÓ ĐO GÌ: cổng này đọc THẺ, không nhìn ảnh. Nó sẽ loại
 * oan những bức người châu Á thật mà tác giả không gắn thẻ quốc gia. Chấp nhận
 * đánh đổi đó vì loại oan chỉ làm rổ ứng viên nhỏ đi, còn lọt một gương mặt
 * lạc thì hỏng đúng bức người xem nhìn suốt 40 giây.
 */
const PERSON_TAGS = [
  'woman',
  'women',
  'man',
  'men',
  'girl',
  'boy',
  'people',
  'person',
  'portrait',
  'face',
  'model',
  'child',
  'children',
  'kid',
  'lady',
  'female',
  'male',
  'human',
  'adult',
  'teenager',
  'couple',
  'smile',
  'eyes',
];

/**
 * 👤 …TRỪ KHI không thấy mặt.
 *
 * Mục đích của cổng trên là "đừng để người xem thấy một gương mặt lạc kênh".
 * Một BÓNG ĐEN ngược sáng thì không có gương mặt nào để lạc — mà bóng ngược
 * sáng lại chính là hình moody đắt nhất của brief. Chặn nó là tự tay vứt đúng
 * thứ mình đang đi tìm.
 */
const FACELESS_TAGS = [
  'silhouette',
  'silhouettes',
  'shadow',
  'shadows',
  'backlit',
  'back',
  'anonymous',
  'faceless',
  'hand',
  'hands',
];

/**
 * 🎬 THẺ PHONG CÁCH — điểm cộng theo đúng thứ tự ưu tiên đã chốt:
 * cinematic moody (chính) · retro vintage (phụ) · huyền bí (điểm nhấn).
 */
const STYLE_TAGS = {
  moody: [
    'moody',
    'cinematic',
    'dark',
    'darkness',
    'night',
    'shadow',
    'shadows',
    'silhouette',
    'fog',
    'mist',
    'rain',
    'lonely',
    'alone',
    'solitude',
    'melancholy',
    'dramatic',
    'noir',
    'dusk',
    'twilight',
    'low light',
  ],
  retro: ['vintage', 'retro', 'film', 'analog', 'grain', 'old photo', 'nostalgia', 'antique'],
  mystic: [
    'mystical',
    'mystery',
    'mysterious',
    'spiritual',
    'ritual',
    'incense',
    'smoke',
    'candle',
  ],
};

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
  // ⚠️ LUẬT `must`: CHỈ từ CHỦ ĐỀ, TUYỆT ĐỐI không nhét từ phong cách
  // (`dark` · `night` · `shadow` · `moody`). Lượt trước trộn vào thì ảnh chỉ
  // cần TỐI là qua cổng liên quan — `chia-xa` nhận về một cái LY RƯỢU RỖNG,
  // `ghe-trong` nhận về ảnh sa mạc. Phong cách đã có `scoreCandidate` lo;
  // `must` mà gánh cả hai vai thì hỏng đúng vai chính của nó.
  //
  // 🌏 Truy vấn thứ BA của mỗi nhóm luôn nhắm thẳng châu Á. Lượt trước chỉ
  // dựa vào điểm cộng nên kho ra 25% châu Á — điểm không cứu được khi CHÍNH
  // rổ ứng viên đã thiếu; phải sửa ở truy vấn, không sửa ở trọng số.
  {
    id: 'co-don',
    vi: 'Cô đơn — một bóng người trong khoảng tối',
    queries: [
      'lone silhouette rain street night',
      'asian woman silhouette window night',
      'vietnam street alone night person',
    ],
    must: ['silhouette', 'alone', 'lonely', 'solitude', 'lone', 'person', 'woman', 'man', 'figure'],
  },
  {
    id: 'suy-tu',
    vi: 'Suy tư — ngồi một mình, nhìn ra ngoài',
    queries: [
      'person by window night thinking',
      'asian man sitting alone dark room',
      'vietnamese woman portrait pensive',
    ],
    must: [
      'window',
      'sitting',
      'thinking',
      'alone',
      'portrait',
      'pensive',
      'woman',
      'man',
      'person',
    ],
  },
  {
    id: 'mo-mit',
    // Ở nhóm này sương/mưa CHÍNH LÀ chủ đề, nên chúng được ở trong `must`.
    vi: 'Mờ mịt — sương, mưa trên kính, không thấy đường',
    queries: [
      'foggy forest dark',
      'rain drops window night city',
      'asia mountain fog mist morning',
      'vietnam sapa fog mountain',
    ],
    must: ['fog', 'mist', 'haze', 'rain', 'drops', 'foggy', 'cloud', 'smoke'],
  },
  {
    id: 'be-tac',
    vi: 'Bế tắc — hẻm hẹp, cửa đóng, tường',
    queries: ['narrow alley night', 'old wooden door temple', 'hanoi old quarter narrow alley'],
    must: ['alley', 'wall', 'door', 'narrow', 'lane', 'gate', 'corridor', 'stairs', 'staircase'],
  },
  {
    id: 'chia-xa',
    // 🔴 ĐÃ TUYỂN LẠI MỘT LẦN, và lý do đáng nhớ: bản đầu để `must` toàn PHẦN
    // CỨNG đường sắt (`station · railway · rail · train · platform · track`)
    // nên nó gom về đúng thứ nó hỏi — **toa hàng và đường ray**. Điểm cao nhất
    // cả nhóm chỉ 36 (so với 100+ ở `bi-an`), 0 bức châu Á, và bức đứng đầu là
    // một toa container. Đúng tag, sai nghĩa: "chia xa" là một CẢM GIÁC, không
    // phải một phương tiện. ⇒ đưa NGƯỜI vào cả truy vấn lẫn `must`; sân ga chỉ
    // còn là bối cảnh, không còn là chủ thể.
    vi: 'Chia xa — bóng người rời đi, sân ga đêm',
    queries: [
      'silhouette walking away alone night',
      'asian woman waiting train station night',
      'person leaving station rain night',
    ],
    must: [
      'silhouette',
      'walking',
      'walk',
      'waiting',
      'wait',
      'departure',
      'goodbye',
      'farewell',
      'leaving',
      'alone',
      'person',
      'woman',
      'man',
      'station',
      'platform',
      'railway',
    ],
  },
  {
    id: 'bi-an',
    // Điểm nhấn "mystical" — CỐ Ý tả bằng khói/đèn/đền chứ không bằng đạo cụ
    // bói toán: bài tarot hay quả cầu pha lê là hình sáo, và sai bộ môn.
    vi: 'Bí ẩn — khói hương, đèn lồng, đền trong tối',
    queries: [
      'incense smoke temple',
      'asian lantern night mysterious',
      'vietnam pagoda incense ritual',
    ],
    must: [
      'incense',
      'smoke',
      'temple',
      'lantern',
      'shrine',
      'pagoda',
      'ritual',
      'candle',
      'buddha',
    ],
  },
  {
    id: 'hoai-niem',
    vi: 'Hoài niệm — ảnh phim cũ, ám vàng, hạt nhiễu',
    queries: [
      'vintage film grain portrait',
      'retro asian street 90s film',
      'old vietnam photo vintage',
    ],
    must: ['vintage', 'retro', 'film', 'analog', 'grain', 'nostalgia', 'antique', 'old photo'],
  },
  {
    id: 'tinh-lang',
    vi: 'Tĩnh lặng — mặt nước, đền vắng, sương sớm',
    queries: [
      'still dark water reflection night',
      'asian temple morning mist quiet',
      'japan garden zen quiet water',
    ],
    must: ['temple', 'water', 'lake', 'reflection', 'pond', 'garden', 'zen', 'shrine', 'river'],
  },
  {
    id: 'toi-gian',
    // 🔑 Nhóm này giải đúng bài toán KHÓ NHẤT của khung 9:16: chỗ đặt chữ.
    // Hình tối giản có sẵn mảng trống lớn, `detail` thấp tự nhiên — tức nó
    // qua cổng "ảnh có chỗ đặt chữ không" mà không cần may mắn. Cũng là nhóm
    // DUY NHẤT không phụ thuộc người/địa danh nên không bao giờ lạc kênh.
    vi: 'Tối giản · ẩn dụ — hình khối, khoảng trống, siêu thực',
    queries: [
      'minimal dark abstract shape',
      'surreal conceptual dark minimal',
      'minimalist japanese dark wall',
    ],
    must: [
      'minimal',
      'minimalism',
      'minimalist',
      'abstract',
      'surreal',
      'concept',
      'conceptual',
      'symbol',
      'symbolic',
      'geometry',
      'geometric',
      'shape',
      'simple',
      'texture',
      'wall',
    ],
  },
  {
    id: 'thien-nhien-toi',
    // ⚠️ Tách khỏi `mo-mit` dù cả hai đều có sương: `mo-mit` là MẶT SƯƠNG che
    // tầm nhìn (mưa trên kính, sương mù dày), còn nhóm này là CẢNH LỚN dữ dội
    // — bão, rừng đêm, núi trong mây. Gộp thì `must` phải nới rộng tới mức
    // mọi ảnh thiên nhiên đều lọt, đúng cái bẫy cổng liên quan sinh ra để chặn.
    vi: 'Thiên nhiên u tối — bão, rừng đêm, núi trong mây',
    queries: [
      'dark stormy sky landscape',
      'dark forest night moody',
      'asia mountain night dark clouds',
    ],
    must: [
      'storm',
      'stormy',
      'thunder',
      'lightning',
      'cloud',
      'clouds',
      'forest',
      'woods',
      'tree',
      'trees',
      'mountain',
      'mountains',
      'landscape',
      'nature',
      'sky',
      'sea',
      'ocean',
      'wave',
      'waves',
      'desert',
      'field',
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
    queries: [
      'hands reaching dark low light',
      'asian hands holding shadow',
      'vietnam hands elderly',
    ],
    must: ['hand', 'hands', 'palm', 'finger', 'fingers', 'holding', 'touch'],
  },
  {
    id: 'con-duong',
    vi: 'Con đường — ngã rẽ, lối đi trong tối',
    queries: ['dark road night fog', 'empty path night moody', 'vietnam street night motorbike'],
    must: ['road', 'path', 'trail', 'way', 'street', 'lane', 'highway', 'footpath'],
  },
  {
    id: 'cua-so',
    vi: 'Cửa sổ — nhìn ra ngoài, mưa đêm',
    // ⚠️ `must` bỏ hẳn từ phong cách nên ảnh CỬA SỔ MÁY BAY hết lọt (lượt
    // trước vào 2 bức chỉ vì khớp `window` + đủ tối).
    queries: [
      'looking out window rain night',
      'asian window shadow dark room',
      'wooden window old asia',
    ],
    must: ['window', 'curtain', 'windowsill', 'blinds', 'shutter'],
  },
  {
    id: 'ngon-den',
    vi: 'Ngọn đèn — sáng nhỏ trong tối',
    queries: ['candle flame dark background', 'asian lantern night dark', 'vietnam lantern hoi an'],
    must: ['candle', 'lantern', 'lamp', 'flame', 'candlelight', 'wick', 'light bulb'],
  },
  {
    id: 'mat-nuoc',
    vi: 'Mặt nước — phản chiếu đêm',
    queries: [
      'dark water reflection night',
      'lake at night moonlight reflection',
      'asia river night reflection',
    ],
    must: ['water', 'reflection', 'lake', 'river', 'sea', 'ocean', 'pond', 'wave', 'ripple'],
  },
  {
    id: 'ghe-trong',
    vi: 'Ghế trống — chỗ của người đã đi',
    queries: [
      'empty chair dark room shadow',
      'lonely bench night low light',
      'empty wooden bench asia',
    ],
    must: ['chair', 'chairs', 'seat', 'bench', 'stool', 'armchair', 'furniture'],
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
 * Đọc PNG 8-bit không xen dòng (xám hoặc RGB) về mảng pixel.
 *
 * Tự giải mã thay vì thêm một gói phụ thuộc: `zlib` có sẵn trong Node, và ảnh
 * ở đây do CHÍNH ffmpeg vừa sinh ra nên hình dạng biết trước. Gặp hình dạng
 * khác thì NÉM chứ không đoán bừa.
 */
function decodePng(buf) {
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
  if (depth !== 8 || (colorType !== 0 && colorType !== 2) || interlace !== 0) {
    throw new Error(`PNG lạ (depth=${depth} colorType=${colorType} interlace=${interlace})`);
  }
  // Số byte một điểm ảnh — cũng CHÍNH LÀ khoảng lùi của tham chiếu `a` trong
  // bộ lọc PNG. Nhầm chỗ này thì ảnh RGB giải ra vẫn "có hình" nhưng lệch màu
  // dần theo hàng, tức hỏng IM LẶNG.
  const bpp = colorType === 2 ? 3 : 1;
  const stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * h);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
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
      px[y * stride + x] = v & 255;
    }
    pos += stride;
  }
  return { w, h, px, bpp };
}

/**
 * Bốn số đo của một bức ảnh. Trả `null` khi không có ffmpeg — và chỗ gọi phải
 * NÓI RA điều đó chứ không lặng lẽ coi mọi ảnh là đạt: một phép kiểm câm còn
 * tệ hơn không có phép kiểm.
 *
 * ┌──────────┬────────────────────────────┬──────────────────────────────────┐
 * │ `mean`   │ độ sáng DẢI GIỮA (0–255)   │ "low light / dark tone"          │
 * │ `sd`     │ độ lệch chuẩn dải giữa     │ "có chiều sâu — shadow, contrast"│
 * │ `sat`    │ bão hoà màu CẢ KHUNG       │ "loại ảnh màu tươi"              │
 * │ `detail` │ độ rối dải giữa            │ "ít chi tiết để overlay text"    │
 * └──────────┴────────────────────────────┴──────────────────────────────────┘
 *
 * 🔑 `sat` đo CẢ KHUNG còn `detail` đo DẢI GIỮA — cố ý khác nhau: màu tươi ở
 * bất kỳ đâu cũng phá tông clip, còn chi tiết rối thì chỉ hại đúng chỗ chữ ngồi.
 *
 * ⚠️ Bốn số này đo THUỘC TÍNH VẬT LÝ của ảnh. Chúng KHÔNG đo được "cảm xúc",
 * "cinematic", hay "trông có giống ảnh stock rẻ tiền không" — xem `--report`.
 */
function measureImage(ffmpeg, jpgPath, tmpPng) {
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
      'scale=64:114,format=rgb24',
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
  const { w, h, px, bpp } = decodePng(readFileSync(tmpPng));
  const lum = (x, y) => {
    const i = y * w * bpp + x * bpp;
    if (bpp === 1) return px[i];
    // Rec.601 — cùng công thức ffmpeg dùng cho `format=gray`, nên số đo giữ
    // nguyên nghĩa so với các lượt nhập trước đã chạy trên bản xám.
    return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  };

  const y0 = Math.round(h * TEXT_BAND[0]);
  const y1 = Math.round(h * TEXT_BAND[1]);

  const vals = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) vals.push(lum(x, y));
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);

  // Bão hoà = (max − min) của ba kênh, trung bình CẢ KHUNG. Ảnh đơn sắc/tông
  // trầm ra số thấp; ảnh lá đỏ trên cỏ xanh ra số cao.
  let sat = 0;
  if (bpp === 3) {
    let s = 0;
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 3];
      const g = px[i * 3 + 1];
      const b = px[i * 3 + 2];
      s += Math.max(r, g, b) - Math.min(r, g, b);
    }
    sat = s / (w * h);
  }

  // Độ rối = chênh lệch độ sáng trung bình giữa hai điểm KỀ NHAU trong dải
  // giữa. Nền phẳng (sương, tường, mặt nước) ra số thấp; tán lá, đám đông,
  // hoa văn ra số cao. Đây chính là "background rối" đo được.
  let d = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 1; x < w; x++) {
      d += Math.abs(lum(x, y) - lum(x - 1, y));
      n++;
    }
  }
  const detail = n ? d / n : 0;

  return {
    mean: Number(mean.toFixed(1)),
    sd: Number(sd.toFixed(1)),
    sat: Number(sat.toFixed(1)),
    detail: Number(detail.toFixed(1)),
  };
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
/**
 * Số thẻ tối đa giữ lại làm mô tả.
 *
 * 🔴 Từng để 12 và nó CẮT MẤT PHẦN CÓ NGHĨA NHẤT. Ca bắt được thật: bức
 * `4851939` có thẻ thô `… person, light, winter, people, forest, thinking,
 * **silhouette, alone, sad**, nature, gray thinking, …` — ba từ 13·14·15 là ba
 * từ nói đúng cảm xúc của bức ảnh, và mức 12 chặt ngay trước chúng. Hội đồng
 * vì thế đọc được "man, trees, dark" rồi phải tự đoán phần còn lại.
 *
 * ⚠️ 16 là MỘT LỰA CHỌN, không phải một phép đo: nới nữa thì bắt đầu nuốt thẻ
 * máy sinh của Pixabay (`gray thinking` · `gray alone`) — nhiễu vô hại nhưng
 * vô nghĩa. Thà thừa vài thẻ nhiễu còn hơn thiếu thẻ mang nghĩa, vì việc của
 * caption là để SO với lời đọc chứ không phải để đọc cho xuôi.
 */
const CAPTION_MAX_TAGS = 16;

function captionFromTags(tags) {
  const seen = new Set();
  const out = [];
  for (const raw of String(tags || '').split(',')) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= CAPTION_MAX_TAGS) break;
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

  // 👤 Có người nhìn rõ mặt ⇒ phải mang dấu hiệu châu Á. Bóng ngược sáng /
  // bàn tay thì miễn (không có gương mặt nào để lạc). Xem khối chú thích ở
  // `PERSON_TAGS` để biết cổng này ĐO GÌ và loại oan cái gì.
  const has = (list) => list.some((t) => (t.includes(' ') ? tags.has(t) : words.has(t)));
  if (has(PERSON_TAGS) && !has(FACELESS_TAGS) && !has(ASIA_STRONG)) {
    return 'có người nhưng không có dấu hiệu châu Á';
  }

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
