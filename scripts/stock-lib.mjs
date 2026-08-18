// scripts/stock-lib.mjs
// ============================================================
// TỪ VỰNG + CỔNG LỌC + PHÉP ĐO dùng chung cho kho ảnh VÀ kho video.
//
// 🔑 VÌ SAO TÁCH RA: `stock-ingest.mjs` (ảnh) và `stock-video.mjs` (video)
// phải gác CÙNG một bộ luật — cổng đạo đức, cổng người-phải-châu-Á, cổng liên
// quan theo `must[]`, và cách đo độ sáng dải giữa khung. Chép hai bản là hẹn
// ngày chúng trôi khỏi nhau, mà lúc đó chỉ MỘT kho bị hở còn kho kia vẫn báo
// xanh — đúng lớp lỗi "hai danh sách chép tay" repo này đã trả giá nhiều lần.
//
// Thứ CỐ Ý không nằm ở đây: ngưỡng chấm điểm (`BRIGHT_MAX`, `SAT_MAX`,
// `DETAIL_MAX`) và hàm xếp hạng. Chúng hiệu chỉnh theo TỪNG loại phương tiện
// (ảnh tĩnh dưới lớp phủ khác video nền đang trôi), nên để mỗi script tự giữ.
// ============================================================

import { execFileSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'fs';
import { inflateSync } from 'zlib';
import { join } from 'path';

const ROOT_DIR = new URL('..', import.meta.url).pathname;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 🪤 BẪY ĐÃ VẤP — `fetch` của Node KHÔNG tự đi qua proxy, `curl` thì có.
 *
 * Container này chạy sau một egress proxy (`HTTPS_PROXY`). `curl` đọc biến đó
 * nên tới được Pixabay (trả 400 vì thiếu khoá — tức ĐÃ CHẠM SERVER), còn
 * `fetch` của Node đi thẳng ra ngoài và ăn **403 của proxy**. Hai mã trông
 * giống "hỏng mạng" nhưng chỉ có 403 là chính sách chặn — phân biệt được thì
 * mới khỏi đi sửa nhầm sang phía khoá API.
 *
 * Node 22 có cờ `NODE_USE_ENV_PROXY`, nhưng nó đọc LÚC KHỞI ĐỘNG nên gán
 * trong mã là quá muộn ⇒ tự chạy lại chính mình đúng MỘT lần kèm cờ đó.
 */
export function ensureProxyEnv() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY) return;
  // Tắt ĐÍCH DANH cảnh báo "EnvHttpProxyAgent is experimental" — nó bắn ở mọi
  // lượt chạy, kể cả `--list` vốn không gọi mạng, và làm bẩn mọi phép so đầu
  // ra. Tắt đích danh chứ KHÔNG `--no-warnings`: bịt hết là bịt luôn cảnh báo
  // thật của lượt sau.
  const r = spawnSync(
    process.execPath,
    ['--disable-warning=UNDICI-EHPA', ...process.argv.slice(1)],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
    }
  );
  process.exit(r.status ?? 1);
}

/**
 * Dải giữa khung nơi khối chữ ngồi — khớp bố cục `InsightClip`.
 *
 * Nằm ở đây (không nằm trong từng script) vì nó suy từ BỐ CỤC CLIP chứ không
 * suy từ loại phương tiện: ảnh nền hay video nền thì khối chữ vẫn ngồi đúng
 * chỗ đó. Đổi bố cục `InsightClip` là phải đổi con số này, và đổi một lần.
 */
export const TEXT_BAND = [0.3, 0.7];

/**
 * Khoá Pixabay đã làm sạch.
 *
 * 🔴 Environment của container này đang giữ một giá trị HỎNG: 89 ký tự, có dấu
 * cách — khoá Pixabay bị dán dính luôn `GEMINI_API_KEY=...` thành MỘT dòng.
 * Gửi nguyên chuỗi đó thì Pixabay trả *"Invalid API key"*, và người đọc log đi
 * tìm nhầm sang phía khoá thay vì phía cấu hình.
 *
 * Cắt ở khoảng trắng đầu tiên rồi NÓI RA là đã cắt — sửa im lặng thì cấu hình
 * hỏng nằm đó mãi. Chỗ sửa thật là environment: mỗi biến một dòng, dán giá trị
 * THÔ (đúng luật đã ghi trong CLAUDE.md).
 */
let warnedKey = false;
export function pixabayKey() {
  const raw = process.env.PIXABAY_API_KEY;
  if (!raw) throw new Error('thiếu PIXABAY_API_KEY');
  const key = raw.trim().split(/\s/)[0];
  if (key !== raw.trim() && !warnedKey) {
    warnedKey = true;
    console.warn(
      '   ⚠️ PIXABAY_API_KEY có khoảng trắng — nhiều khả năng bị dán lẫn hai biến\n' +
        '      vào một dòng. Đã cắt lấy phần đầu để chạy tiếp; nên đặt lại cho đúng.'
    );
  }
  return key;
}

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
export const DENY_TAGS = [
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
  // ── CON VẬT LÀM CHỦ THỂ: chặn, cùng lý do lạc kênh ──
  // Lượt nhập video lọt thẳng một đoạn **BẦY KHỈ** vào tông "suy tư" — cùng lớp
  // lỗi với con MÈO đã lọt tông `nang-am` ở kho ảnh.
  //
  // ⚠️ DANH SÁCH NÀY CỐ Ý HẸP. Bản đầu tôi chặn cả `animal`/`wildlife`/`bird`
  // và đo lại trên 94 bức đang có thì nó **loại oan 2 bức đúng chủ đề**: một
  // con QUẠ trong tông *thiên nhiên u tối* (quạ chính là thứ tông đó muốn) và
  // một hình **BÓNG BÀN TAY** trong tông *bàn tay* (thẻ có chữ `animal` vì là
  // bóng hình con vật). Chặn rộng ở đây là phá đúng hai tông cần nó nhất.
  //
  // 🔑 Cơ chế THẬT đã vá ở chỗ khác: `must[]` của `suy-tu` có từ TƯ THẾ
  // (`sitting`) mà con vật nào cũng mang. Danh sách này chỉ là lưới đỡ thứ hai
  // cho mấy loài đọc thành "con vật là nhân vật chính".
  'monkey',
  'ape',
  'apes',
  'baboon',
  'baboons',
  'primate',
  'primates',
  'cat',
  'kitten',
  'dog',
  'puppy',
  'horse',
  'cow',
  'sheep',
  'squirrel',
  'lizard',
  'reptile',
  'snake',
  'frog',
  'spider',
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
export function tagSet(tags) {
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
export const ASIA_STRONG = [
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
export const ASIA_TAGS = [...ASIA_STRONG, 'lantern', 'bamboo', 'rice field', 'paddy', 'incense'];

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
export const PERSON_TAGS = [
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
export const FACELESS_TAGS = [
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
export const STYLE_TAGS = {
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
export const TONES = [
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
    // ⚠️ CỐ Ý KHÔNG có `sitting`: từ TƯ THẾ thì con vật hay đồ vật nào cũng
    // mang được, nên nó không nói CHỦ THỂ là ai. Đúng chỗ đoạn phim bầy khỉ
    // lọt vào tông này. `must` chỉ được chứa từ nói về CHỦ THỂ / BỐI CẢNH.
    must: ['window', 'thinking', 'alone', 'portrait', 'pensive', 'woman', 'man', 'person'],
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
export const SUBJECTS = [
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

export const BUCKETS = { tone: TONES, subject: SUBJECTS };

/**
 * Tìm ffmpeg. Container phiên này chỉ có bản đi kèm Playwright (bản đó THIẾU
 * muxer `rawvideo` và protocol `pipe:` — xem `measureBrightness`).
 */
export function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  /*
   * 🔑 ƯU TIÊN bản ffmpeg Remotion đóng gói sẵn.
   *
   * Tôi đã ghi nhầm một lần rằng "máy này không đo được khung hình video" — dựa
   * trên bản đi kèm Playwright, vốn chỉ có **3 demuxer** và không có decoder
   * h264. Nhưng `@remotion/compositor-*` mang theo một bản ffmpeg ĐẦY ĐỦ (42
   * demuxer, h264/hevc/vp9) và nó nằm sẵn trong repo. Công cụ có sẵn mà tôi kết
   * luận là không có ⇒ đi thẳng tới chỗ "không gác được độ động", rồi chọn phải
   * một đoạn phim đứng im.
   *
   * Bài học: trước khi ghi "không làm được", kiểm hết công cụ ĐÃ CÓ TRONG REPO.
   */
  for (const d of [
    'compositor-linux-x64-gnu',
    'compositor-linux-arm64-gnu',
    'compositor-darwin-x64',
    'compositor-darwin-arm64',
  ]) {
    const p = join(ROOT_DIR, 'remotion/node_modules/@remotion', d, 'ffmpeg');
    if (existsSync(p)) return p;
  }
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
export function decodePng(buf) {
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
/**
 * @param {'squash'|'crop916'} fit
 *   · `squash` — ép cả khung về 64×114. Mặc định, GIỮ NGUYÊN hành vi cũ của kho
 *     ảnh: ở đó ảnh ngang vốn đã bị cổng `imageHeight/imageWidth < 1.2` loại
 *     nên ép hay cắt cũng gần như nhau, và đổi là mọi số đo lịch sử hết so được.
 *   · `crop916` — CẮT GIỮA về 9:16 rồi mới thu nhỏ.
 *
 * 🔴 VÌ SAO PHẢI CÓ `crop916`, và đây là lỗi ĐO đã bắt được trên khung hình
 * thật: kho video CHO PHÉP đoạn phim ngang (16:9), mà `InsightClip` thì
 * `objectFit: cover` — tức nó CẮT GIỮA về 9:16 và vứt hai mép. Đo bằng `squash`
 * là đo cả hai mép sẽ không bao giờ lên hình ⇒ một đoạn có mảng sáng nằm đúng
 * giữa vẫn ra L thấp. Bản render đầu lộ ngay: đo được L=36,3 mà khung hình thật
 * có một quầng đèn vàng lớn chiếm nửa khung.
 *
 * Cùng lớp bài học đã ghi: *"đo trên bản đã cắt gọn thì đang đo bản cắt, không
 * đo thứ cần đo"* — chỉ khác là lần này phép đo rộng hơn thứ được render.
 */
export function measureImage(ffmpeg, jpgPath, tmpPng, fit = 'squash') {
  const vf =
    fit === 'crop916'
      ? "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=64:114,format=rgb24"
      : 'scale=64:114,format=rgb24';
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
      vf,
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
export const CAPTION_MAX_TAGS = 16;

export function captionFromTags(tags) {
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

/**
 * CỔNG LỌC THEO THẺ — phần KHÔNG phụ thuộc loại phương tiện.
 *
 * Ảnh và video dùng chung nguyên bộ luật này; phần riêng của từng loại (ảnh
 * cần `largeImageURL` + tỉ lệ dọc, video cần độ dài + độ phân giải) thì mỗi
 * script tự kiểm rồi mới gọi vào đây.
 *
 * Trả về LÝ DO bị loại (chuỗi) hoặc `null` nếu qua.
 */
export function passesTags(tags, item) {
  const set = tagSet(tags);
  // Khớp theo TỪ trong tag, không phải chuỗi con: `substring` sẽ cho "poor"
  // ăn vào "poori" và "war" ăn vào "warm" — đúng lớp lỗi `\bcon\b` khớp
  // "con vật" mà repo này đã trả giá.
  const words = new Set([...set].flatMap((t) => t.split(/[\s-]+/)));
  const has = (list) => list.some((t) => (t.includes(' ') ? set.has(t) : words.has(t)));

  const hitDeny = DENY_TAGS.find((d) => (d.includes(' ') ? set.has(d) : words.has(d)));
  if (hitDeny) return `cổng đạo đức: tag "${hitDeny}"`;

  // 👤 Có người nhìn rõ mặt ⇒ phải mang dấu hiệu châu Á. Bóng ngược sáng /
  // bàn tay thì miễn (không có gương mặt nào để lạc).
  if (has(PERSON_TAGS) && !has(FACELESS_TAGS) && !has(ASIA_STRONG)) {
    return 'có người nhưng không có dấu hiệu châu Á';
  }

  if (item?.must?.length) {
    const ok = item.must.some((m) => words.has(m) || set.has(m));
    if (!ok) return `lạc đề (không tag nào thuộc "${item.id}")`;
  }
  return null;
}

/**
 * ĐỘ ĐỘNG của một đoạn phim — trung bình |Δ| mỗi pixel giữa hai khung cách nhau
 * MỘT GIÂY, lấy trung vị của ba cặp rải đều. Thang 0–255.
 *
 * 🔴 VÌ SAO PHẢI CÓ: lượt nhập đầu tôi chọn đoạn phim theo TỐI + THẺ và không
 * hề đo chuyển động — rồi đúng thứ lọt vào là một đoạn giọt nước BÁM KÍNH, đo
 * ra **1,99/giây**, tức gần như đứng im. Henry xem clip và nói ngay *"trong
 * clip tao ko thấy video chi thấy hình tĩnh"*. Nghịch lý là cổng độ sáng ĐẨY
 * thẳng về phía đó: đoạn càng tối và càng phẳng thì càng dễ là đoạn không có
 * gì chuyển động.
 *
 * Mốc đo được lúc chốt: giọt nước bám kính **1,99** · mây trôi **14,6** · phố
 * có người qua lại **20,4**.
 *
 * 🔴 ĐÂY LÀ ĐIỀU KIỆN TUYỂN, KHÔNG PHẢI ĐỘ ĐỘNG NGƯỜI XEM NHẬN ĐƯỢC. Đo trên
 * đoạn NGUỒN, tốc độ gốc, chưa qua `blur`/lớp phủ/Ken Burns của khung clip.
 * Đo lại trên khung hình đã render thì con số tụt rất mạnh (một đoạn 11,8 ở
 * đây giao ra chỉ còn trung vị 1 trên cả khung) — xem bảng số đo trong
 * `remotion/src/InsightClip.tsx`. Muốn biết clip trông có động không thì phải
 * đo trên chính file mp4 đã render, đừng suy từ con số này.
 */
export function measureMotion(ffmpeg, mp4Path, durationSec, tmpDir) {
  const vf = "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=64:114,format=rgb24";
  const grab = (t, out) => {
    execFileSync(
      ffmpeg,
      [
        '-hide_banner',
        '-v',
        'error',
        '-ss',
        String(t),
        '-i',
        mp4Path,
        '-vf',
        vf,
        '-frames:v',
        '1',
        '-y',
        out,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    return decodePng(readFileSync(out));
  };
  const lum = (px, i, bpp) =>
    bpp === 1 ? px[i] : 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  // Trả CẢ HAI: trung bình trả lời "có động không", trung vị trả lời "động có
  // TRẢI RA không". Một dải nhỏ động mạnh kéo được trung bình lên trong khi
  // quá nửa khung đứng im — xem bảng số đo ở `scripts/stock-video.mjs`.
  const delta = (a, b) => {
    const n = a.w * a.h;
    const d = new Float64Array(n);
    let s = 0;
    for (let k = 0; k < n; k++) {
      const v = Math.abs(lum(a.px, k * a.bpp, a.bpp) - lum(b.px, k * b.bpp, b.bpp));
      d[k] = v;
      s += v;
    }
    d.sort();
    return { mean: s / n, spread: d[n >> 1] };
  };

  const A = join(tmpDir, '.mo-a.png');
  const B = join(tmpDir, '.mo-b.png');
  const ds = [];
  try {
    for (const f of [0.2, 0.5, 0.8]) {
      const t = Math.max(0.5, Math.min(durationSec - 1.5, durationSec * f));
      ds.push(delta(grab(t, A), grab(t + 1, B)));
    }
  } finally {
    rmSync(A, { force: true });
    rmSync(B, { force: true });
  }
  // Lấy mẫu GIỮA của ba lượt, cho từng chỉ số RIÊNG — một đoạn có thể động đều
  // ở giữa mà đứng im ở đầu/cuối, gộp hai chỉ số theo cùng một lượt là để lượt
  // ồn ào nhất quyết định cả hai.
  const mid = (key) => {
    const v = ds.map((d) => d[key]).sort((x, y) => x - y);
    return Math.round(v[1] * 100) / 100;
  };
  return { mean: mid('mean'), spread: mid('spread') };
}
