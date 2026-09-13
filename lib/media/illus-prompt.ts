// lib/media/illus-prompt.ts
// ============================================================
// Dựng prompt cho THƯ VIỆN HÌNH MINH HOẠ — mỗi phần luận giải một bức, để bản
// luận đọc như một cuốn light novel thay vì một bức tường chữ.
//
// Cùng kiến trúc đã chạy với bộ 64 tranh Quẻ Phục Hy (`que-image-prompt.ts`):
//   · KHỐI PHONG CÁCH giữ nguyên văn, KHÔNG diễn giải lại
//   · KHỐI CHỦ ĐỀ suy từ DỮ LIỆU (khía cạnh × sắc thái × giới), không bịa
//   · SẮC THÁI nằm ở ÁNH SÁNG / TƯ THẾ / TÌNH TRẠNG BỐI CẢNH, không nằm ở nét
//     mặt bi thảm — đúng bài học `MOOD_LIGHT` của bộ quẻ
//
// 🔑 BA QUYẾT ĐỊNH KHÁC với bản gợi ý ban đầu, đều có lý do đo được:
//
// 1. KHÔNG CHỮ TRONG TRANH. Ảnh mẫu duyệt style có chữ viết tay tiếng Việt
//    ngay trong tranh — đẹp, nhưng KHÔNG dùng được cho thư viện: một bức phục
//    vụ nhiều lá số, mà chữ thì phải khớp đúng phần luận của TỪNG lá số. Thêm
//    nữa model sinh ảnh viết tiếng Việt có dấu sai chính tả là chuyện thường,
//    và một chữ sai trong tranh là "AI rác" ngay trước mắt người trả tiền.
//    Nên: tranh chừa sẵn KHOẢNG TRỐNG (xem `TEXT_SAFE_AREA`), chữ phủ bằng
//    HTML lên trên — nét sắc, đổi được theo từng lá số, chọn được font.
//
// 2. PHONG CÁCH BÁM ẢNH MẪU, KHÔNG bám chữ "sketch-style / minimal background /
//    not polished". Hai thứ đó mô tả hai bức tranh khác hẳn nhau: ảnh mẫu có
//    bối cảnh DÀY chi tiết đời thường (cốc, sổ, dây sạc, cây, đồ chơi) và chính
//    đống chi tiết ấy mới kể chuyện. Làm theo chữ thì ra tranh trống trơn —
//    đúng lỗi lượt sinh đầu tiên của bộ quẻ đã vấp.
//
// 3. NHÂN VẬT CÓ MỘT CHI TIẾT BẤT BIẾN (Trí: đồng hồ dây da sẫm tay trái ·
//    Thư: mặt ngọc nhỏ trên dây mảnh). Khuôn mặt do model vẽ sẽ trôi qua vài
//    trăm lượt gen dù tả kỹ tới đâu; một vật nhỏ dễ vẽ lại thì không trôi, và
//    mắt người đọc neo vào đó để nhận ra "vẫn là nhân vật ấy".
// ============================================================

/**
 * KHỐI PHONG CÁCH — KHOÁ. Đừng "cải thiện" khối này: nó là bản duyệt mỹ thuật,
 * sửa một chữ là cả thư viện trôi khỏi phong cách đã chốt và không ráp được với
 * số ảnh đã vẽ trước đó.
 */
export const STYLE_LOCK = `Hand-drawn Vietnamese slice-of-life light novel illustration. Soft pencil lineart with slightly rough, imperfect strokes and faint sketch underdrawing left visible. Gentle watercolour washes over flat muted colours — warm cream, soft sage green, dusty blue, pale ochre, faded terracotta — with visible paper grain and small blooms where the wash pools. Warm natural daylight, diffuse and slightly uneven, as if falling through a window. The everyday environment is richly and specifically observed: real ordinary objects that quietly tell a story, drawn with light economical strokes rather than heavily rendered. Depth comes from line weight and wash density only, never from photographic blur. A candid unposed moment, framing slightly off-balance. Quiet, tender, unhurried mood — an ordinary afternoon remembered years later. Consistent visual style, character design, face and hairstyle across every image in the series. No photorealism, no cinematic or dramatic lighting, no 3D, no glossy digital rendering, no thick uniform outlines, no neon or saturated colours, no lens flare, no motion blur.`;

/**
 * Luật CHỮ + KHOẢNG TRỐNG — đi kèm MỌI prompt. Vùng trống nằm ở đâu là hợp
 * đồng với tầng hiển thị: `illus-overlay` phủ chữ đúng vào đó, nên đổi bên
 * (trái ↔ phải) là phải đổi cả CSS, không phải chuyện thẩm mỹ riêng của tranh.
 */
export const TEXT_SAFE_AREA = `Absolutely no lettering anywhere in the image: no captions, no titles, no handwriting, no readable words, numbers or logos. Signage, book spines, screens and packaging must be left blank or reduced to soft illegible abstract marks. Keep the left third of the frame calm and uncluttered — a plain wall, open sky, or soft out-of-focus background — as deliberate negative space.`;

// ── NHÂN VẬT ────────────────────────────────────────────────
// Tả theo TUỔI vì nhân vật phải già đi qua 9 đại vận: đọc tới Đại Vận 7 mà vẫn
// thấy mình 25 tuổi thì hỏng cả ý đồ. Khối tả giữ NGUYÊN VĂN giữa các độ tuổi
// trừ phần tuổi tác và trang phục — đổi thêm chỗ khác là mất nhất quán.

export type Tuoi = 'nhi-dong' | 'thanh-nien' | 'truong-thanh' | 'trung-nien' | 'lao-nien';
export type Gioi = 'nam' | 'nu';
export type Sac = 'tot' | 'trung' | 'xau';

const TUOI_DESC: Record<Tuoi, { nam: string; nu: string }> = {
  'nhi-dong': { nam: 'a Vietnamese boy of about ten', nu: 'a Vietnamese girl of about ten' },
  'thanh-nien': { nam: 'a Vietnamese man of about twenty', nu: 'a Vietnamese woman of about twenty' },
  'truong-thanh': { nam: 'a Vietnamese man in his early thirties', nu: 'a Vietnamese woman in her early thirties' },
  'trung-nien': { nam: 'a Vietnamese man in his early fifties', nu: 'a Vietnamese woman in her early fifties' },
  'lao-nien': { nam: 'a Vietnamese man in his late sixties', nu: 'a Vietnamese woman in her late sixties' },
};

/** Chi tiết nhận dạng BẤT BIẾN — còn nguyên ở mọi độ tuổi, mọi bức. */
const NEO_NHAN_DANG: Record<Gioi, string> = {
  nam: 'a plain dark leather-strap watch on his left wrist, worn in every scene',
  nu: 'a small pale jade pendant on a thin cord at her throat, worn in every scene',
};

const TRANG_PHUC: Record<Gioi, Record<Tuoi, string>> = {
  nam: {
    'nhi-dong': 'a soft cotton t-shirt and shorts',
    'thanh-nien': 'a plain t-shirt and simple dark trousers',
    'truong-thanh': 'a plain soft shirt, sleeves pushed up, and simple dark trousers',
    'trung-nien': 'a neat plain shirt in a muted colour and dark trousers',
    'lao-nien': 'a loose soft shirt in a faded muted colour',
  },
  nu: {
    'nhi-dong': 'a simple cotton dress',
    'thanh-nien': 'a simple blouse and plain trousers or a long skirt',
    'truong-thanh': 'a simple blouse or light knit in a muted colour',
    'trung-nien': 'a neat plain blouse in a muted colour',
    'lao-nien': 'a loose soft áo bà ba style blouse in a faded muted colour',
  },
};

/** Khối tả nhân vật — nguyên văn, chỉ thay tuổi/trang phục theo tham số. */
export function nhanVat(gioi: Gioi, tuoi: Tuoi): string {
  const base =
    gioi === 'nam'
      ? `Trí, ${TUOI_DESC[tuoi].nam}, short slightly messy black hair falling over the forehead, a calm thoughtful face with gentle narrow eyes, slim build`
      : `Thư, ${TUOI_DESC[tuoi].nu}, long straight black hair past the shoulders, loosely tucked behind one ear, a soft calm slightly introspective face with warm dark eyes, slim build`;
  return `${base}, wearing ${TRANG_PHUC[gioi][tuoi]}, ${NEO_NHAN_DANG[gioi]}, no other accessories`;
}

// ── SẮC THÁI ────────────────────────────────────────────────
// Sắc thái đổi ÁNH SÁNG · TƯ THẾ · TÌNH TRẠNG BỐI CẢNH. KHÔNG đổi sang nét mặt
// bi kịch: người ta trả tiền để đọc về đời mình, không phải để bị doạ. Bức
// "xấu" phải vẫn giữ được phẩm giá — trầm và chật vật, không nước mắt.
const SAC_THAI: Record<Sac, string> = {
  tot: 'clear warm late-morning light, the air luminous and still; posture open and settled, attention fully on what is in front of them, a small private contentment; the surroundings tidy and cared-for, plants healthy, small signs that someone looks after this place',
  trung: 'even soft overcast daylight, neither bright nor grim; posture neutral and mid-motion, attention drifting slightly elsewhere, neither pleased nor troubled; the surroundings ordinary and a little cluttered, nothing wrong and nothing special',
  xau: 'thin cool light of a late overcast afternoon, colours drawing towards grey, one small lamp working harder than it should; posture closed and tired, shoulders drawn in, gaze turned away from the task at hand; the surroundings worn and disordered, a plant gone dry, things left where they fell — quiet and weary but never melodramatic, no tears, no darkness, the person still dignified',
};

/** Mức gắn bó với người khác trong khung — đổi theo sắc thái, cho cảnh có ≥2 người. */
const TUONG_TAC: Record<Sac, string> = {
  tot: 'the two are turned towards each other, easy and comfortable, sharing the same moment',
  trung: 'the two share the space but are half-turned away, each occupied with their own thing',
  xau: 'the two are physically close but disconnected, no eye contact, a clear gap of empty space between them',
};

// ── KHÍA CẠNH (cung) → CẢNH + BỐI CẢNH VIỆT NAM ─────────────
// VIẾT TAY, không nhờ LLM diễn lúc chạy — đúng lý do đã ghi ở `que-motifs.ts`:
// nhờ model diễn mỗi lượt thì hai lần dựng lại ra hai bộ cảnh khác nhau, tốn
// thêm một lượt gọi mỗi bức, và không ai soát được cảnh TRƯỚC khi đốt tiền vẽ.
//
// `boiCanh` là nguồn BIẾN THỂ: cùng (khía × sắc × giới) nhưng khác bối cảnh thì
// ra hai bức khác hẳn nhau — chống trùng giữa các lá số mà không phải đổi màu.
export interface KhiaCanh {
  /** Nhãn tiếng Việt (để đối chiếu bằng mắt lúc duyệt, KHÔNG vào prompt). */
  vi: string;
  /** Việc nhân vật đang làm — một sự việc NHÌN THẤY ĐƯỢC, không phải lời bình. */
  canh: string;
  /** Có người thứ hai trong khung không (quyết định dùng `TUONG_TAC` hay không). */
  coNguoiKhac?: boolean;
  /** 3 bối cảnh Việt Nam có thật — chỉ số biến thể `v` chọn một. */
  boiCanh: [string, string, string];
}

export const KHIA_CANH: Record<string, KhiaCanh> = {
  menh: {
    vi: 'Cung Mệnh — bản thân, khí chất',
    canh: 'alone in a quiet private moment with themselves, sitting still and thinking, a cup of tea going cold nearby',
    boiCanh: [
      'a small rented room in a narrow Hanoi alley house, morning light through a grilled window',
      'the rooftop of a Saigon apartment block at first light, water tanks and laundry lines around them',
      'a window seat on an early intercity bus, the countryside sliding past outside',
    ],
  },
  'phu-mau': {
    vi: 'Cung Phụ Mẫu — cha mẹ',
    canh: 'sitting with an elderly parent, a pot of tea and two small cups between them',
    coNguoiKhac: true,
    boiCanh: [
      'a family living room with a wooden ancestral altar shelf and a ceiling fan',
      'a tiled kitchen with low plastic stools and a pot on the stove',
      'the front step of a countryside house, a courtyard and a water jar beyond',
    ],
  },
  'phuc-duc': {
    vi: 'Cung Phúc Đức — phúc phần, gốc rễ tinh thần',
    canh: 'standing quietly with three lit incense sticks held at the chest, smoke drifting upward',
    boiCanh: [
      'the courtyard of a small neighbourhood pagoda, moss on the stone',
      'a modest family ancestral altar with fruit and a small vase of flowers',
      'under an enormous old banyan tree beside a village communal house',
    ],
  },
  'dien-trach': {
    vi: 'Cung Điền Trạch — nhà cửa, tài sản',
    canh: 'hanging washing on a line at home, or standing in a doorway looking back into the room',
    boiCanh: [
      'the balcony of a narrow Saigon tube house, wires and rooftops beyond',
      'an apartment balcony overlooking a city canal at dusk',
      'a bare newly-rented flat with cardboard boxes still unopened',
    ],
  },
  'quan-loc': {
    vi: 'Cung Quan Lộc — sự nghiệp',
    canh: 'working at a laptop, chin resting on one hand, a notebook and pens spread across the desk',
    boiCanh: [
      'an open-plan office in central Saigon, tall windows with a hazy city skyline beyond, colleagues lightly sketched at other desks',
      'a cramped startup room with whiteboards, a standing fan and too many cables',
      'a corner table in a street-side Vietnamese coffee shop used as an office, a glass of cà phê sữa đá beside the laptop',
    ],
  },
  'no-boc': {
    vi: 'Cung Nô Bộc — bạn bè, đồng nghiệp, người xung quanh',
    canh: 'sharing a meal at a crowded low table with two or three friends, chopsticks in mid-air',
    coNguoiKhac: true,
    boiCanh: [
      'a sidewalk eatery with tiny plastic stools spilling onto the pavement, evening',
      'an office pantry with a kettle, instant noodle cups and a window',
      'a public park badminton court at dusk, other players in the background',
    ],
  },
  'thien-di': {
    vi: 'Cung Thiên Di — đi xa, môi trường bên ngoài',
    canh: 'waiting with a worn travel bag at their feet, looking out at the way ahead',
    boiCanh: [
      'the departure hall of Tân Sơn Nhất airport, rows of seats and a wall of windows',
      'the aisle of a night sleeper coach on a mountain road, curtains drawn',
      'the deck of a small ferry crossing a wide Mekong Delta river, water hyacinth drifting past',
    ],
  },
  'tat-ach': {
    vi: 'Cung Tật Ách — sức khoẻ, tai ách',
    canh: 'sitting on a plastic chair holding a folded medical form, waiting to be called',
    boiCanh: [
      'a long hospital corridor lined with blue plastic chairs, fluorescent light',
      'a small neighbourhood pharmacy at night, glass cabinets of boxes',
      'a city park at dawn full of elderly people doing slow exercises',
    ],
  },
  'tai-bach': {
    vi: 'Cung Tài Bạch — tiền bạc',
    canh: 'sitting at a table counting money and receipts, a calculator and a phone beside a mug',
    boiCanh: [
      'a wet-market stall at first light, produce stacked in baskets, awning overhead',
      'the counter of a small family shop, shelves of goods behind',
      'a kitchen table covered in bills under a bare hanging bulb, late evening',
    ],
  },
  'tu-tuc': {
    vi: 'Cung Tử Tức — con cái',
    canh: 'sitting on the floor playing with a small child among scattered wooden blocks and toy cars',
    coNguoiKhac: true,
    boiCanh: [
      'a living room floor covered in toys, a window with city buildings beyond',
      'the gate of a primary school at pick-up time, other parents waiting',
      "a child's bedroom at night with a small night light and a drawing taped to the wall",
    ],
  },
  'phu-the': {
    vi: 'Cung Phu Thê — vợ chồng, tình duyên',
    canh: 'sitting at a small table with their partner, two drinks between them',
    coNguoiKhac: true,
    boiCanh: [
      'a sidewalk café in the Hanoi Old Quarter in autumn, plane trees and old shutters',
      'stopped on a motorbike at the rail of a city bridge at dusk, river below',
      'a small kitchen at dinner time, two bowls set out, steam rising',
    ],
  },
  'huynh-de': {
    vi: 'Cung Huynh Đệ — anh chị em',
    canh: 'sitting side by side on the same step with a sibling, not talking, comfortable',
    coNguoiKhac: true,
    boiCanh: [
      'the tiled front steps of a family house, a motorbike parked in the yard',
      'a shared childhood bedroom with two beds and old posters',
      'a kitchen during a family gathering, dishes being carried past',
    ],
  },
  'tong-quan': {
    vi: 'Tổng quan lá số — cả cuộc đời',
    canh: 'standing at the edge of a busy crossing, taking in the whole city before moving',
    boiCanh: [
      'a wide Saigon intersection at golden hour, motorbikes streaming past',
      'a high bank above the Red River in Hanoi, the city hazy in the distance',
      'a terraced hillside path in the northern highlands, valleys folding away below',
    ],
  },
};

// ── DỰNG PROMPT ─────────────────────────────────────────────

export interface IllusInput {
  /** Khoá trong `KHIA_CANH`. */
  khia: string;
  sac: Sac;
  gioi: Gioi;
  /** Mặc định `truong-thanh` — độ tuổi dùng cho 12 cung bản mệnh. */
  tuoi?: Tuoi;
  /** Biến thể bối cảnh 1..3. Ngoài tầm thì quay vòng. */
  v?: number;
}

export interface IllusPrompt {
  /** Mã ảnh = tên file = khoá tra cứu. */
  id: string;
  /** Nhãn tiếng Việt để duyệt bằng mắt. */
  nhan: string;
  prompt: string;
}

export function buildIllusPrompt(input: IllusInput): IllusPrompt {
  const { khia, sac, gioi, tuoi = 'truong-thanh' } = input;
  const kc = KHIA_CANH[khia];
  if (!kc) throw new Error(`illus-prompt: không có khía cạnh "${khia}"`);
  const v = ((Math.max(1, input.v || 1) - 1) % kc.boiCanh.length) + 1;

  const prompt = [
    STYLE_LOCK,
    '',
    nhanVat(gioi, tuoi) + '.',
    '',
    `Scene: ${kc.canh}.`,
    `Environment: ${kc.boiCanh[v - 1]}.`,
    `Mood and light: ${SAC_THAI[sac]}.`,
    ...(kc.coNguoiKhac ? [`Interaction: ${TUONG_TAC[sac]}.`] : []),
    '',
    'Composition: wide horizontal frame, the character placed off-centre towards the right, seen from a natural eye-level three-quarter angle, room to breathe around them.',
    '',
    TEXT_SAFE_AREA,
  ].join('\n');

  return {
    id: `${khia}--${sac}--${gioi}--${tuoi}--v${v}`,
    nhan: `${kc.vi} · ${sac} · ${gioi} · ${tuoi} · biến thể ${v}`,
    prompt,
  };
}
