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
export const STYLE_LOCK = `Hand-drawn Vietnamese slice-of-life light novel illustration. Soft pencil lineart with slightly rough, imperfect strokes and faint sketch underdrawing left visible. Gentle watercolour washes over flat muted colours, with visible paper grain and small blooms where the wash pools. THE PALETTE IS FIXED AND IDENTICAL IN EVERY IMAGE OF THE SERIES regardless of mood: warm cream paper, soft sage green, dusty blue, pale ochre, faded terracotta, with warm skin tones. Never sepia, never brown-toned, never monochrome, never desaturated to grey — a sad scene uses exactly the same colours as a happy one. The everyday environment is richly and specifically observed: real ordinary objects that quietly tell a story, drawn with light economical strokes rather than heavily rendered. Depth comes from line weight and wash density only, never from photographic blur. A candid unposed moment, framing slightly off-balance. Consistent visual style, character design, face and hairstyle across every image in the series. No photorealism, no cinematic or dramatic lighting, no 3D, no glossy digital rendering, no thick uniform outlines, no neon or saturated colours, no lens flare, no motion blur.`;

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
// 🔑 SẮC THÁI NẰM Ở BIỂU CẢM + HOẠT CẢNH NGƯỜI XUNG QUANH, KHÔNG NẰM Ở MÀU.
//
// Bản đầu đẩy sắc thái vào ánh sáng và tông màu — hỏng hai đường cùng lúc:
// bức "xấu" ra nâu sepia lệch hẳn khỏi 12 bức còn lại (đọc liền một bản luận
// 13 phần thì nhìn như hai bộ tranh khác nhau), còn bức "trung" thì xám đều
// nên đọc thành "xấu". Nay màu KHOÁ CỨNG trong `STYLE_LOCK` cho cả ba bậc, và
// việc phân biệt dồn hết sang thứ người ta đọc được ngay: mặt nhân vật đang
// vui hay đang nghĩ, và quanh họ có ai không.
//
// Ánh sáng vẫn đổi nhẹ theo bậc, nhưng chỉ là ĐỘ SÁNG của cùng bảng màu —
// không được ngả tông.
const SAC_THAI: Record<Sac, { bieuCam: string; quanhCanh: string; anhSang: string; doVat: string }> = {
  tot: {
    bieuCam:
      'genuinely smiling, eyes bright and creased at the corners, caught mid-laugh or mid-sentence, shoulders open and relaxed, clearly enjoying the moment',
    quanhCanh:
      'the people nearby are warm and animated — someone leaning in to talk, someone laughing, someone reaching out a hand; the place is busy with cheerful ordinary activity',
    anhSang: 'clear warm late-morning sunlight pouring in, everything luminous and fresh',
    doVat: 'the place is tidy and cared-for: healthy green plants, fresh flowers in a jar, things put back where they belong',
  },
  trung: {
    bieuCam:
      'an ordinary everyday expression — neither smiling nor troubled, mildly attentive, caught in the middle of a routine task, entirely unremarkable',
    quanhCanh:
      'the people nearby are simply getting on with their own day, nobody paying particular attention to anybody; plain daily life, nothing happening',
    anhSang: 'plain even daylight of a normal day, natural and unremarkable',
    doVat: 'the place is lived-in and ordinary: a little everyday clutter, nothing broken and nothing special',
  },
  xau: {
    bieuCam:
      'thoughtful and withdrawn, brow faintly drawn, chin resting on a hand, gaze settled on nothing in particular, deep in worry but composed and dignified — pensive, never weeping, never anguished',
    quanhCanh:
      'the space around them is emptier than it should be — others turned away or already gone, an empty chair, nobody sharing the moment',
    anhSang: 'soft light of a quiet overcast afternoon, gentle and even, the same colours simply a little quieter',
    doVat: 'the place is worn and let go: a plant gone dry, cups unwashed, papers left where they fell',
  },
};

// ── KHÍA CẠNH (cung) → CẢNH + BỐI CẢNH VIỆT NAM ─────────────
// VIẾT TAY, không nhờ LLM diễn lúc chạy — đúng lý do đã ghi ở `que-motifs.ts`:
// nhờ model diễn mỗi lượt thì hai lần dựng lại ra hai bộ cảnh khác nhau, tốn
// thêm một lượt gọi mỗi bức, và không ai soát được cảnh TRƯỚC khi đốt tiền vẽ.
//
// 🔑 CẢNH VIẾT RIÊNG CHO TỪNG SẮC THÁI, không phải một cảnh chung rồi đổi ánh
// sáng. "Cung Quan Lộc tốt" và "Cung Quan Lộc xấu" là HAI SỰ VIỆC khác nhau
// (đang cười nói với đồng nghiệp / ngồi lại một mình sau khi mọi người về),
// chứ không phải một sự việc chụp dưới hai thứ đèn.
//
// `boiCanh` là nguồn BIẾN THỂ: cùng (khía × sắc × giới) nhưng khác bối cảnh thì
// ra hai bức khác hẳn nhau — chống trùng giữa các lá số mà không phải đổi màu.
// Bối cảnh tả CHI TIẾT và ĐẶC VIỆT NAM (ghế nhựa thấp, bình trà đá, quạt cây,
// dây điện chằng chịt, bàn thờ Thần Tài, mái tôn, gạch bông...) — chi tiết đời
// thường chính là thứ kể chuyện, tả chung chung thì ra tranh stock vô hồn.
export interface KhiaCanh {
  /** Nhãn tiếng Việt (để đối chiếu bằng mắt lúc duyệt, KHÔNG vào prompt). */
  vi: string;
  /** Sự việc NHÌN THẤY ĐƯỢC, riêng cho từng sắc thái. */
  canh: Record<Sac, string>;
  /** 3 bối cảnh Việt Nam có thật — chỉ số biến thể `v` chọn một. */
  boiCanh: [string, string, string];
}

export const KHIA_CANH: Record<string, KhiaCanh> = {
  menh: {
    vi: 'Cung Mệnh — bản thân, khí chất',
    canh: {
      tot: 'standing and stretching in the early morning with a wide easy smile, raising a hand to greet a neighbour passing by',
      trung: 'sitting on a low plastic stool with a glass of tea, idly watching the street go by',
      xau: 'sitting alone on the step, elbows on knees, chin on hand, staring at the ground and thinking hard',
    },
    boiCanh: [
      'the doorway of a narrow tube house in a Hanoi alley: mossy wall, a blue low plastic stool, a bicycle leaning, a cage bird hanging, tangled electric wires overhead',
      'the rooftop of an old Saigon apartment block at first light: stainless water tanks, laundry lines strung between poles, potted crown-of-thorns in styrofoam boxes, corrugated iron roofs below',
      'a village front yard in the Mekong Delta: a large glazed water jar, a hammock slung between two areca palms, a mat drying rice in the sun',
    ],
  },
  'phu-mau': {
    vi: 'Cung Phụ Mẫu — cha mẹ',
    canh: {
      tot: 'laughing with an elderly parent who is patting the back of their hand, a plate of cut fruit and tea between them',
      trung: 'peeling a pomelo beside an elderly parent, both half-watching a television off-frame',
      xau: 'sitting beside an elderly parent, neither of them speaking, both gazing off in different directions',
    },
    boiCanh: [
      'a family living room: a lacquered wooden ancestral altar on the wall with a small red electric candle, a bloc calendar, a slow ceiling fan, a glass-front cabinet of old cups',
      'a tiled kitchen: red and blue low plastic stools, a pot steaming on a gas ring, bunches of herbs in a basin, a wall calendar with a landscape photo',
      'the tiled front step of a countryside house: a courtyard beyond, a water jar with a coconut ladle, a bougainvillea over the gate, a motorbike under a tin awning',
    ],
  },
  'phuc-duc': {
    vi: 'Cung Phúc Đức — phúc phần, gốc rễ tinh thần',
    canh: {
      tot: 'lighting incense with a calm smile while family members behind them arrange an offering tray of fruit and flowers',
      trung: 'lighting three incense sticks alone, an ordinary act on an ordinary day',
      xau: 'standing before the altar holding unlit incense, head bowed, lost in thought',
    },
    boiCanh: [
      'the courtyard of a small neighbourhood pagoda: moss on stone slabs, a bronze incense urn thick with sticks, yellow flag bunting, a frangipani tree dropping blossom',
      'a modest family ancestral altar: a brass incense bowl, a five-fruit tray, a vase of chrysanthemums, faded photographs, a small red bulb glowing',
      'under an enormous banyan beside a village communal house: hanging aerial roots, a low brick wall, worn stone steps, an old woman selling incense from a basket',
    ],
  },
  'dien-trach': {
    vi: 'Cung Điền Trạch — nhà cửa, tài sản',
    canh: {
      tot: 'pegging washing on the line with a smile, calling something cheerful across to a neighbour on the opposite balcony',
      trung: 'watering the potted plants on the balcony in the ordinary course of the morning',
      xau: 'standing at the balcony rail looking out, a basket of laundry half-hung and forgotten behind them',
    },
    boiCanh: [
      'the balcony of a narrow Saigon tube house: an iron security grille, plastic buckets, a mop drying, bundles of electric cable, corrugated roofs and a water tank beyond',
      'an old apartment block walkway above a city canal: chipped mosaic tiles, orchids in hanging coconut-husk pots, a motorbike helmet on a hook, laundry strung the length of the rail',
      'a newly rented flat still bare: cardboard boxes unopened, a rolled sleeping mat, a single stool, an electric fan still in its plastic, evening light through unwashed glass',
    ],
  },
  'quan-loc': {
    vi: 'Cung Quan Lộc — sự nghiệp',
    canh: {
      tot: 'standing at the desk mid-conversation with two colleagues who are laughing, papers spread between them, everyone leaning in',
      trung: 'working steadily at a laptop, chin resting on one hand, a half-finished glass of iced coffee beside the keyboard',
      xau: 'sitting back from the closed laptop, hand over mouth, staring past the screen at nothing, the neighbouring desks already emptied',
    },
    boiCanh: [
      'an open-plan office in central Saigon: tall windows with a hazy high-rise skyline, desks of lightly sketched colleagues, a plastic cup of iced coffee sweating on the desk, a pothos trailing off a filing cabinet',
      'a cramped startup room: whiteboards covered in scribbles, a standing fan, too many cables, instant noodle cups, a small Thần Tài shrine with a red bulb in the corner by the door',
      'a corner table in a Vietnamese street-side coffee shop used as an office: a glass of cà phê sữa đá with a metal filter, low stools, a tiled floor, motorbikes parked at the kerb beyond the open front',
    ],
  },
  'no-boc': {
    vi: 'Cung Nô Bộc — bạn bè, đồng nghiệp, người xung quanh',
    canh: {
      tot: 'raising a glass in the middle of a loud happy table, four friends laughing and reaching for the same dish',
      trung: 'eating at a table with two colleagues, chopsticks moving, the conversation mild and unremarkable',
      xau: 'sitting at the end of the table while the others talk among themselves, bowl untouched, half turned away',
    },
    boiCanh: [
      'a sidewalk eatery at night: tiny red and blue plastic stools spilling onto the pavement, a steaming hotpot on a portable gas burner, a jug of iced tea, plastic baskets of herbs, motorbikes parked at the kerb',
      'an office pantry: an electric kettle, a stack of instant noodle cups, a small fridge covered in magnets, a window with vertical blinds half open',
      'a public park badminton court at dusk: a sagging net, other players in the background, bicycles leaned against a tree, a bag of shuttlecocks on the bench',
    ],
  },
  'thien-di': {
    vi: 'Cung Thiên Di — đi xa, môi trường bên ngoài',
    canh: {
      tot: 'shouldering a bag with a bright smile, turning back to wave at someone seeing them off',
      trung: 'sitting with a bag between their feet, checking the time, simply waiting',
      xau: 'standing apart from the crowd holding a bag, looking back the way they came',
    },
    boiCanh: [
      'the departure hall of Tân Sơn Nhất airport: rows of steel seats, a wall of glass, families with taped cardboard boxes and woven plastic bags, a floor polisher in the distance',
      'a night sleeper coach on a mountain road: two tiers of reclining berths, curtains drawn, sandals in a net bag, a small fan clipped above the window',
      'the deck of a small ferry crossing a wide Mekong river: motorbikes packed nose to tail, water hyacinth drifting past, a woman selling boiled peanuts from a shallow basket',
    ],
  },
  'tat-ach': {
    vi: 'Cung Tật Ách — sức khoẻ, tai ách',
    canh: {
      tot: 'stretching at dawn among a crowd of cheerful elderly exercisers, smiling and keeping up with them',
      trung: 'sitting in a waiting area holding a folded form, patient and unbothered',
      xau: 'sitting alone in an empty corridor holding a form, staring at the floor tiles',
    },
    boiCanh: [
      'a city park at dawn: rows of elderly people doing slow exercises, a portable speaker, bicycles laid on the grass, a vendor with a bicycle cart of sticky rice',
      'a long hospital corridor: blue plastic chairs bolted in rows, a numbered ticket display, families with thermoses and plastic bags of food, fluorescent tubes overhead',
      'a small neighbourhood pharmacy at night: glass cabinets of boxes, a weighing scale by the door, a hand-written price list, a scooter idling outside',
    ],
  },
  'tai-bach': {
    vi: 'Cung Tài Bạch — tiền bạc',
    canh: {
      tot: 'handing change to a customer with a broad smile, the stall busy, another customer waiting happily with a basket',
      trung: 'sorting banknotes into a small tin box at the counter on an ordinary afternoon',
      xau: 'sitting still in front of a spread of unpaid bills, calculator untouched, chin on hand, deep in thought',
    },
    boiCanh: [
      'a wet-market stall at first light: produce stacked in woven baskets, a tarpaulin awning, a hanging scale, a roll of plastic bags, a stool and a metal cash tin',
      'the counter of a small family shop: shelves of instant noodles and detergent behind, a Thần Tài shrine with a red bulb and an orange on a saucer, a wall-mounted fan, a QR code stand',
      'a kitchen table in the evening: bills and receipts spread across a floral plastic tablecloth, a calculator, a rice cooker on the counter, a bare bulb on a cord above',
    ],
  },
  'tu-tuc': {
    vi: 'Cung Tử Tức — con cái',
    canh: {
      tot: 'laughing on the floor with a small child who is holding a toy plane up in triumph',
      trung: 'sitting beside a child doing homework, pointing at the page with everyday patience',
      xau: 'sitting near a child absorbed in something else, hand on knee, watching them and worrying',
    },
    boiCanh: [
      'a living room floor: a woven mat, scattered wooden blocks and toy cars, a child drawing taped to the wall, a standing fan, a window with iron grilles and city rooftops beyond',
      'a primary school gate at pick-up time: parents waiting on parked motorbikes, helmets dangling, a red flag, a vendor selling fish-shaped snacks from a cart',
      "a child's bedroom at night: a mosquito net half tucked up, a small night light, a school bag slumped by the door, star stickers on the wardrobe",
    ],
  },
  'phu-the': {
    vi: 'Cung Phu Thê — vợ chồng, tình duyên',
    canh: {
      tot: 'laughing together over two glasses of iced tea, one of them reaching across to touch the other arm',
      trung: 'eating dinner together, each half-watching their own phone, comfortable and quiet',
      xau: 'sitting at the same table with two untouched cups, both looking away in different directions',
    },
    boiCanh: [
      'a sidewalk café in the Hanoi Old Quarter in autumn: low stools on the pavement, a plane tree, old shuttered windows above, a tray of green tea and sunflower seeds',
      'stopped on a motorbike at the rail of a city bridge at dusk: helmets still on the wrists, the river below, strings of lights on the far bank, other bikes streaming past',
      'a small kitchen at dinner time: two bowls of rice set out on a floral tablecloth, a dish of braised fish steaming, a rice cooker venting, a fan turning in the corner',
    ],
  },
  'huynh-de': {
    vi: 'Cung Huynh Đệ — anh chị em',
    canh: {
      tot: 'joking with a sibling while the two of them carry dishes together, both grinning',
      trung: 'sitting on the same step as a sibling, each on their phone, an easy silence',
      xau: 'sitting apart from a sibling on the same step, backs half turned, nothing being said',
    },
    boiCanh: [
      'the tiled front steps of a family house: a motorbike parked in the yard, slippers lined up by the door, a bougainvillea over the gate, a dog asleep in the shade',
      'a shared childhood bedroom: two narrow beds, old posters, a desk with a stack of schoolbooks, a wall fan, afternoon light through a grilled window',
      'a kitchen during a family gathering: dishes being carried past, a pot of soup on a portable burner, relatives lightly sketched in the doorway, a crate of beer on the floor',
    ],
  },
  'tong-quan': {
    vi: 'Tổng quan lá số — cả cuộc đời',
    canh: {
      tot: 'stepping out into the street with an open confident stride, nodding a greeting to people they pass',
      trung: 'standing at the kerb waiting to cross, one of many in the ordinary flow of the day',
      xau: 'standing still at the edge of the crowd, looking out over the city, thinking',
    },
    boiCanh: [
      'a wide Saigon intersection at golden hour: a river of motorbikes, helmets and face masks, a traffic light on a yellow pole, shopfront signs and tangled cables above',
      'the high bank above the Red River in Hanoi: banana plants on the slope, a long bridge in the haze, brick kilns and a scatter of low houses beyond',
      'a terraced hillside path in the northern highlands: paddies folding away into valley mist, a buffalo on the track below, a woman with a back basket climbing ahead',
    ],
  },
};

// ── THÁNG ÂM LỊCH (Vận Hạn 12 Tháng) ─────────────────────────
// 🔑 KHÔNG CÓ TRỤC SẮC THÁI. `lib/engine/van-han-12.ts` từ chối chấm điểm cho
// MỘT THÁNG (chú thích thẳng trong file đó: "gán điểm là bịa") — không có
// flag/ngưỡng nào để đọc như đại vận hay cung. Ảnh tháng vì vậy chỉ đổi CẢNH
// theo đúng mùa/lễ tiết âm lịch, không suy tốt/xấu.
//
// `THANG_SAC` là hằng số CỐ ĐỊNH đứng vào đúng vị trí "sắc thái" trong quy ước
// tên file 5-phần `<khia>--<sac>--<gioi>--<tuoi>--v<n>` (dùng chung bộ máy
// buildUrl/parseId/tierA sẵn có của illus-match.js + admin route) — bản thân
// giá trị này KHÔNG mang nghĩa sắc thái nào, chỉ để khớp đúng số phần tên file.
export const THANG_SAC = 'chuan';

export interface ThangCanh {
  /** Nhãn tiếng Việt (để đối chiếu bằng mắt lúc duyệt, KHÔNG vào prompt). */
  vi: string;
  /** Sự việc NHÌN THẤY ĐƯỢC — đúng MỘT cảnh, không chia theo sắc thái. */
  canh: string;
  /** 3 bối cảnh Việt Nam có thật, đặc trưng tháng/mùa đó — chỉ số biến thể `v` chọn một. */
  boiCanh: [string, string, string];
}

export const THANG_CANH: Record<string, ThangCanh> = {
  'thang-01': {
    vi: 'Tháng Giêng — Tết',
    canh: 'walking through a flower market at dawn carrying a small kumquat tree wrapped in red cellophane, exchanging a cheerful nod with a flower seller',
    boiCanh: [
      'a flower market street in Hanoi before Tết: rows of peach blossom branches and kumquat trees in red pots, vendors on bicycles loaded with flowers, red envelopes strung on a stall pole',
      'a Saigon street corner decorated for Tết: a row of yellow mai apricot trees in ceramic pots, red paper lanterns strung overhead, watermelons stacked in a pyramid at a stall',
      "a countryside family courtyard on Tết morning: a pot of boiled bánh chưng still steaming by the kitchen door, a red altar cloth glimpsed through the doorway, firecracker paper scattered on the ground, relatives arriving on motorbikes",
    ],
  },
  'thang-02': {
    vi: 'Tháng Hai — lễ hội đầu xuân',
    canh: 'walking under a fine drizzling spring rain holding a folded conical hat overhead, smiling at the crowd of festival-goers passing by',
    boiCanh: [
      'a Northern spring festival ground: a canvas tent stage in the distance, bamboo poles strung with colourful flags, food stalls under plastic tarpaulins in light rain, mud tracked on the grass',
      'the stone steps up to a hillside pagoda in fine spring drizzle: moss on a low wall, a vendor selling grilled corn under an umbrella, pilgrims in raincoats climbing ahead',
      'a village communal house yard during a spring festival: a bamboo swing frame being tested by children, a folding table of offerings, a loudspeaker on a pole, umbrellas bobbing across the wet grass',
    ],
  },
  'thang-03': {
    vi: 'Tháng Ba — Giỗ Tổ, Thanh Minh',
    canh: 'kneeling to clear weeds from a family grave mound, a small bundle of incense and flowers set down on the grass beside them',
    boiCanh: [
      'a countryside cemetery on a Thanh Minh morning: low grave mounds among green rice fields, a red silk-cotton hoa gạo tree in bloom nearby, a bunch of chrysanthemums on the grass',
      'the base of a giant hoa gạo tree beside a village pond: bright red blossoms scattered on the water, a stone path, a water buffalo grazing on the far bank',
      'a family gathering at a hillside memorial ground: relatives lightly sketched further off with brooms and offering trays, a folding umbrella stuck in the earth, mist over distant hills',
    ],
  },
  'thang-04': {
    vi: 'Tháng Tư — đầu hè, sen nở',
    canh: 'leaning on a windowsill with a cup of iced lotus tea, looking out past stacks of study books at a pond just starting to bloom',
    boiCanh: [
      'a room overlooking a lotus pond in early bloom: pink buds among round leaves, a desk piled with textbooks and highlighter pens, a standing fan turning, a cicada husk on the windowsill',
      'a roadside lotus tea stall beside a pond: bundles of lotus flowers stacked in a basket, a kettle over a small burner, plastic stools, a bicycle parked against the railing',
      'a schoolyard at the end of the day in early summer heat: a row of parked bicycles, a flame tree just beginning to bud, students clustered around a noticeboard, a fan spinning in an open classroom window',
    ],
  },
  'thang-05': {
    vi: 'Tháng Năm — Tết Đoan Ngọ',
    canh: 'sitting down to a small bowl of rượu nếp and green plums early in the morning, fanning themselves with a bamboo hand fan against the heat',
    boiCanh: [
      'a kitchen table set for Tết Đoan Ngọ: a bowl of purple sticky rice wine, a plate of green plums and lychees, a bundle of mugwort hung by the door, morning sun already strong through the window',
      'a wet-market stall on the morning of Đoan Ngọ: baskets of rượu nếp balls, bundles of green mangoes and plums, a woman fanning a tray of glutinous rice cakes, heat shimmer over the tin roofs beyond',
      'a village courtyard at noon: a large canopy tree offering shade, a hammock strung between two posts, a fan spinning on an extension cord run outdoors, chickens dozing under a cart',
    ],
  },
  'thang-06': {
    vi: 'Tháng Sáu — cao điểm mùa hè',
    canh: 'walking barefoot along the shoreline carrying rubber sandals in one hand, squinting cheerfully into the bright glare off the water',
    boiCanh: [
      'a Central Vietnam beach at midday: brightly painted basket boats pulled up on the sand, umbrellas made of dried leaves, fishermen mending nets in the shade, haze over the water',
      'a shaded veranda in peak summer: a hammock strung between porch posts, an electric fan on the floor, a tray of chilled watermelon slices, cicada shells stuck to a tree trunk outside',
      'a narrow city alley at the height of summer: laundry drooping in still heat, a shaved-ice cart parked at the corner, children queuing with coins, the tarmac shimmering in the distance',
    ],
  },
  'thang-07': {
    vi: 'Tháng Bảy — Vu Lan, mưa ngâu',
    canh: 'pinning a red silk rose to their own chest in front of a small mirror, a soft private smile, rain tapping steadily outside',
    boiCanh: [
      "the entrance of a neighbourhood pagoda in gentle Ngâu rain: a basket of red and white silk roses for Vu Lan, monks' robes drying under an eave, dripping umbrellas in a stand by the door",
      'a family altar prepared for Vu Lan: a tray of votive paper offerings, a bowl of fruit, rain streaking the window glass behind, a string of small paper lanterns',
      'a covered market alley during a Ngâu shower: vendors pulling tarpaulins tighter, a puddle reflecting shopfront lights, a bicycle basket lined with plastic against the rain',
    ],
  },
  'thang-08': {
    vi: 'Tháng Tám — Trung Thu',
    canh: "lighting a small paper star lantern's candle at dusk, surrounded by children reaching for their own lanterns",
    boiCanh: [
      'a street given over to Trung Thu: stalls strung with paper star lanterns and plastic masks, boxes of mooncakes stacked in cellophane, a lion-dance drum resting against a wall',
      'a rooftop terrace at moonrise: a low table set with mooncakes, pomelo, and green tea, paper lanterns hung along the railing, city lights spreading below',
      "a village courtyard for a children's Trung Thu procession: a homemade star lantern on a stick, a paper dragon head propped against a wall, drummers gathering, the full moon rising over the rooftops",
    ],
  },
  'thang-09': {
    vi: 'Tháng Chín — thu, gió heo may',
    canh: 'standing at the edge of a field with a light jacket pulled close against the first cool breeze, watching the wind move over the ripening rice',
    boiCanh: [
      'the edge of a Red River Delta paddy field turning gold: egrets stepping through the shallows, a scarecrow of plastic bags, a dirt path lined with tall grass swaying in a cool breeze',
      'a Hanoi lakeside path in early autumn: milk-flower trees dropping small white blossoms, a coffee cart with a striped umbrella, leaves just starting to turn along the path',
      'a highland terrace path at the edge of ripening rice: layered paddies catching the low autumn sun, a water buffalo cart on the track, mist still clinging to a distant ridge',
    ],
  },
  'thang-10': {
    vi: 'Tháng Mười — mùa gặt, cốm',
    canh: 'carrying a bundle of freshly cut rice stalks over one shoulder, wiping sweat from the brow with the back of a hand, smiling toward workers further down the field',
    boiCanh: [
      'a golden rice field at the height of harvest: sheaves stacked along the bunds, a threshing machine running, sacks of grain piled on a small trailer, distant figures bent over their sickles',
      'a cốm-making yard in a village near Hanoi: young green rice grains roasting in a wide pan over a wood fire, a mortar and pestle nearby, bundles wrapped in lotus leaves and tied with straw',
      'a rural road at dusk after harvest: bicycles loaded with rice sacks, straw spread to dry along the roadside, a haystack beside a brick house, smoke rising from a stove pipe',
    ],
  },
  'thang-11': {
    vi: 'Tháng Mười Một — đầu đông',
    canh: 'wrapping both hands around a warm cup of tea on a cool foggy morning, breath faintly visible, watching mist drift over the rooftops',
    boiCanh: [
      'a Hanoi street at dawn in early winter fog: a roadside chè stall with a steaming pot, vendors in knit hats and scarves, motorbike headlights faint in the mist',
      'a highland town market in the cold: baskets of persimmons and cold-season vegetables, breath visible in the air, vendors warming hands over a charcoal brazier',
      'a family kitchen on a cold morning: a pot of soup steaming on the stove, a heavy curtain hung over the doorway against the draught, a knitted blanket over a chair, fogged-up window glass',
    ],
  },
  'thang-12': {
    vi: 'Tháng Chạp — chuẩn bị Tết',
    canh: 'kneeling on a mat carefully folding banana leaves around a mound of glutinous rice, string and knife laid ready beside them',
    boiCanh: [
      'a courtyard set up for wrapping bánh chưng: a large pot ready over a wood fire, stacks of banana leaves and bamboo string, a basket of split mung beans, elderly relatives sketched further back tying parcels',
      'a year-end flower market being set up before dawn: rows of peach and mai branches still wrapped for transport, string lights being tested, a truck unloading potted chrysanthemums',
      'a house mid-spring-clean before Tết: a stepladder against a freshly wiped altar shelf, a bucket and cloth on the floor, a rolled red paper scroll ready to hang, a calendar torn down to its last page',
    ],
  },
};

/** Khối tả dựng cho MỘT tháng — không có tham số sắc thái, xem lý do ở trên. */
export interface ThangInput {
  /** Khoá trong `THANG_CANH`, "thang-01".."thang-12". */
  thang: string;
  gioi: Gioi;
  /** Mặc định `truong-thanh` — cửa sổ 12 tháng không đủ dài để cần đổi tuổi. */
  tuoi?: Tuoi;
  /** Biến thể bối cảnh 1..3. Ngoài tầm thì quay vòng. */
  v?: number;
}

export function buildThangPrompt(input: ThangInput): IllusPrompt {
  const { thang, gioi, tuoi = 'truong-thanh' } = input;
  const tc = THANG_CANH[thang];
  if (!tc) throw new Error(`illus-prompt: không có tháng "${thang}"`);
  const v = ((Math.max(1, input.v || 1) - 1) % tc.boiCanh.length) + 1;

  const prompt = [
    STYLE_LOCK,
    '',
    nhanVat(gioi, tuoi) + '.',
    '',
    `Scene: ${tc.canh}.`,
    `Environment: ${tc.boiCanh[v - 1]}.`,
    '',
    'Composition: wide horizontal frame, the character placed off-centre towards the right, seen from a natural eye-level three-quarter angle, room to breathe around them.',
    '',
    TEXT_SAFE_AREA,
  ].join('\n');

  return {
    id: `${thang}--${THANG_SAC}--${gioi}--${tuoi}--v${v}`,
    nhan: `${tc.vi} · ${gioi} · ${tuoi} · biến thể ${v}`,
    prompt,
  };
}

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
  const st = SAC_THAI[sac];

  const prompt = [
    STYLE_LOCK,
    '',
    nhanVat(gioi, tuoi) + '.',
    '',
    `Scene: ${kc.canh[sac]}.`,
    `Expression: ${st.bieuCam}.`,
    `People around them: ${st.quanhCanh}.`,
    `Environment: ${kc.boiCanh[v - 1]}. ${st.doVat}.`,
    `Light: ${st.anhSang}.`,
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
