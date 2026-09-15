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
  /**
   * Cảnh + bối cảnh RIÊNG cho (sắc "tốt", biến thể v=2) — phú quý rõ rệt (ô
   * tô, nhà lầu, đi nước ngoài, làm sếp...) để v1/v2 kể hai chuyện khác hẳn,
   * không chỉ đổi phông. CHỈ áp dụng cho "tốt": "trung"/"xấu" ở v2 vẫn dùng
   * `canh[sac]` + `boiCanh[1]` như cũ — hai sắc đó đã có bối cảnh riêng cho
   * từng biến thể rồi, không cần cảnh phú quý (phi lý với "trung"/"xấu").
   */
  canhTot2?: string;
  boiCanhTot2?: string;
  /**
   * Cảnh + bối cảnh RIÊNG cho tuổi "trung-niên" (40-60), 12 khía ngoài
   * tổng-quan — KHÔNG chỉ đổi tuổi nhân vật qua `nhanVat()`, mà đổi cả SỰ
   * VIỆC lẫn MÔI TRƯỜNG: "tốt" ở tuổi này là phú quý đã THÀNH HÌNH (nhà lầu,
   * xe hơi, du lịch châu Âu), khác hẳn "mới bắt đầu" của `canhTot2`; "trung"/
   * "xấu" là đời sống trung niên thường (cha mẹ đã già, con đã lớn, sự
   * nghiệp đã ổn định). Vì vậy môi trường tách theo TỪNG sắc thái luôn, không
   * dùng chung một `boiCanh` như bậc trưởng-thành. CHỈ 1 biến thể (không phải
   * mảng 3 như `boiCanh`) — quy mô nhỏ hơn, xem lý do ở nhật ký gen trung-niên.
   */
  trungNien?: { canh: Record<Sac, string>; boiCanh: Record<Sac, string> };
  /**
   * true = cảnh CHỈ CÓ HAI NGƯỜI (vd. Xem Tuổi — hai lá số đang so, không phải
   * một cung của MỘT lá số). `SAC_THAI[sac].quanhCanh` mặc định tả một ĐÁM
   * ĐÔNG xung quanh nhân vật chính (đúng cho Cung Nô Bộc/Huynh Đệ...) — ghép
   * vào cảnh hai người riêng tư thì model vẽ thừa 2-3 người lạ chen vào, làm
   * loãng đúng ý "chỉ hai người" (đã thấy ở bản `tu-tuong--tot` mẫu: dư hẳn
   * 3 người ngồi ké). Bật cờ này để dùng `HAI_NGUOI_QUANH_CANH[sac]` thay thế.
   */
  chiHaiNguoi?: boolean;
}

/** Thay cho `SAC_THAI[sac].quanhCanh` khi `KhiaCanh.chiHaiNguoi` bật. */
const HAI_NGUOI_QUANH_CANH: Record<Sac, string> = {
  tot: 'no one else is in the frame — just the two of them, fully absorbed in each other',
  trung: 'no one else is in the frame — just the two of them, going about this together',
  xau: 'no one else is in the frame — just the two of them, and no one else to soften the moment',
};

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
    canhTot2:
      'walking into a hotel lobby in a sharply tailored outfit, several staff and guests turning to greet them warmly, a bellhop nodding respectfully and holding the door',
    boiCanhTot2:
      'the marble lobby of an upscale hotel: a grand chandelier, a reception desk with orchid arrangements, deep leather armchairs, a doorman in uniform holding open a glass door',
    trungNien: {
      canh: {
        tot: 'standing at a podium delivering closing remarks to a packed conference hall, one hand resting on the lectern, the audience already rising to applaud',
        trung: 'walking into the office with an easy unhurried pace, nodding good morning to people along the corridor, another ordinary day begun',
        xau: 'standing alone at the office window after everyone else has left, jacket still on, staring out at the darkening skyline in thought',
      },
      boiCanh: {
        tot: 'a business conference hall: rows of upholstered seats, a large screen still showing a closing slide, a bouquet of flowers on the podium, event staff in matching sashes near the exit',
        trung: 'a mid-size company office corridor: framed certificates on the wall, potted areca palms, a reception desk with a vase of gladioli, colleagues crossing in the background',
        xau: 'a corner office at dusk: a desk stacked with folders, a cold cup of tea, city lights just beginning to come on outside a wide window, a framed family photo turned slightly away',
      },
    },
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
    canhTot2:
      'helping an elderly parent step out of a chauffeured car in front of a five-star hotel entrance, offering an arm, both dressed for a family celebration',
    boiCanhTot2:
      'the marble portico of a five-star beachfront hotel: a doorman holding an umbrella, a fountain in the circular driveway, valet cars queued, orchids in tall vases flanking the entrance',
    trungNien: {
      canh: {
        tot: "wheeling an elderly parent's wheelchair through a private clinic garden after a check-up, both laughing at something, a nurse waving them off warmly",
        trung: 'sitting with an elderly parent on the phone, one hand cradling the receiver, nodding along to an ordinary update',
        xau: "sitting at an elderly parent's hospital bedside, holding their thin hand, watching the slow rise and fall of the blanket",
      },
      boiCanh: {
        tot: 'the garden courtyard of a private geriatric clinic: manicured hedges, a shaded pergola, wheelchair ramps discreetly built in, a fountain trickling nearby',
        trung: 'a family living room in the evening: a landline phone on a lace doily, a wall calendar with a lunar almanac, a slow ceiling fan, an old photograph on the sideboard',
        xau: "a hospital ward room: a monitor beeping softly, a thermos and folded blanket on the visitor's chair, a nurse's clipboard hanging on the bed rail, fluorescent light through drawn curtains",
      },
    },
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
    canhTot2:
      'standing at the head of a long banquet table during a family reunion, raising a toast while dozens of relatives applaud, a large garlanded ancestral portrait behind',
    boiCanhTot2:
      'a grand hall rented for a family reunion banquet: round tables set with red tablecloths, a gold stage backdrop, a towering flower arrangement, waiters in white gloves circulating with trays',
    trungNien: {
      canh: {
        tot: 'standing at the head of a restored ancestral hall during a family reunion, cutting the ribbon on a newly re-gilded altar as relatives of three generations applaud',
        trung: 'lighting incense at the family altar with a grown nephew standing quietly beside them, passing on the ritual without ceremony',
        xau: 'standing alone before the ancestral altar, incense smoke curling, troubled by a disagreement somewhere in the extended family',
      },
      boiCanh: {
        tot: 'a newly restored ancestral hall (từ đường): fresh red lacquer pillars, a re-gilded altar with dragon carvings, a long reunion table already set, a banner welcoming the clan hung across the entrance',
        trung: 'a modest family altar room: a brass incense bowl, ancestor photographs in wooden frames, a string of dried longan hung to one side, afternoon light through a lattice window',
        xau: 'a family altar room at dusk: an unlit second bundle of incense left on the tray, a chair pulled slightly away from the table, a framed photo dusty at the edge, the light dimming',
      },
    },
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
    canhTot2:
      'standing at the balcony rail of a brand-new high-floor apartment, arms spread wide taking in the skyline view, a housewarming banner and balloons still up behind them',
    boiCanhTot2:
      'the wraparound balcony of a high-floor apartment: floor-to-ceiling glass, a small potted olive tree, rattan lounge chairs, the city skyline and river spread out below at dusk',
    trungNien: {
      canh: {
        tot: 'standing at the gate of a finished multi-storey villa, keys in hand, looking back at the house with quiet satisfaction as a gardener trims the hedge behind',
        trung: 'sweeping the front yard of a modest but well-kept house in the ordinary course of the morning',
        xau: 'standing under a water-stained ceiling patch with a bucket already set below it, looking up and weighing the cost of the repair',
      },
      boiCanh: {
        tot: "the front gate of a finished multi-storey villa: a paved driveway, a young frangipani tree in a large ceramic pot, wrought-iron gates, a gardener's cart parked to one side",
        trung: 'a modest single-storey house front yard: a swept concrete yard, potted bonsai lined along the wall, a motorbike under a corrugated awning, a bougainvillea over the gate',
        xau: 'an ageing house interior: a water stain spreading across the ceiling, peeling paint at the cornice, a stepladder left out, furniture pushed aside to keep it dry',
      },
    },
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
    canhTot2:
      'shaking hands across a boardroom table with a foreign business partner, both smiling, a translator and colleagues seated around, a city skyline through the glass wall behind',
    boiCanhTot2:
      'a glass-walled corner boardroom high in a Saigon tower: a long table with name cards and bottled water, a projector mid-slide, a floor-to-ceiling window overlooking the river and skyline at dusk',
    trungNien: {
      canh: {
        tot: 'sitting at the head of a long boardroom table chairing a leadership meeting, gesturing confidently at a chart while department heads nod',
        trung: "reviewing a stack of reports at a manager's desk, pen in hand, steady and unremarkable",
        xau: 'standing at an empty desk that used to belong to a departed staff member, quietly weighing a difficult decision',
      },
      boiCanh: {
        tot: 'a corporate boardroom: a long polished table with name plates, a wall-mounted display showing a bar chart, department heads seated in order, a city skyline through floor-to-ceiling windows',
        trung: "a manager's desk in an open-plan office: stacked binders, a nameplate, a potted money tree, colleagues at their own desks in soft focus behind",
        xau: 'a quiet office after hours: an empty desk with a chair pushed in, a cleared nameplate slot, the rest of the floor dark except for one desk lamp still on',
      },
    },
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
    canhTot2:
      'hosting a rooftop gathering, glass raised high, surrounded by well-dressed friends applauding a toast, string lights strung overhead against the night skyline',
    boiCanhTot2:
      'a rooftop lounge terrace overlooking the city at night: rattan sofas, a small bar cart, string lights woven through potted palms, the skyline glittering beyond the railing',
    trungNien: {
      canh: {
        tot: 'raising a toast at a private dinner with three well-dressed business partners, all leaning in over a signed agreement on the table',
        trung: 'having tea with two old friends at a familiar table, the conversation easy and ordinary',
        xau: 'sitting alone at a table set for four, checking the time, the other seats still empty',
      },
      boiCanh: {
        tot: 'a private dining room at an upscale restaurant: a round table set with fine porcelain, a bottle of wine in a cooler, a signed contract folder beside the plates, soft pendant lighting',
        trung: "a familiar neighbourhood teahouse: wooden stools, a clay teapot on a woven mat, a caged songbird hanging by the window, old friends' motorbikes parked outside",
        xau: 'a restaurant table set for four: folded napkins untouched, a menu closed, a phone face-up on the table, the restaurant filling up with other parties around them',
      },
    },
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
    canhTot2:
      'settling into a wide business-class seat with a glass of champagne offered on a tray, looking out the window at clouds lit gold by the setting sun',
    boiCanhTot2:
      'the business-class cabin of a long-haul flight: wide reclining seats with privacy dividers, a folded blanket and slippers laid out, a flight attendant passing with a tray, a golden sunset filling the window',
    trungNien: {
      canh: {
        tot: 'standing at a plaza overlooking a grand European square, camera around the neck, spreading both arms wide at the view with a broad delighted grin',
        trung: 'wheeling a suitcase through a domestic airport terminal for a routine work trip, checking a boarding pass',
        xau: 'sitting on a bench in an airport terminal, boarding pass in hand, watching a departures board that reads DELAYED',
      },
      boiCanh: {
        tot: 'a grand European city square: ornate stone architecture and a Gothic cathedral spire, a fountain at the centre, pigeons scattering, outdoor café tables under umbrellas, tourists with cameras nearby',
        trung: 'a domestic airport departure hall: rows of check-in counters, a coffee kiosk, a departures board, travellers with rolling luggage moving past',
        xau: 'an airport gate area at night: rows of tired travellers slumped in seats, a vending machine humming, a departures board glowing red with delays, cleaning staff pushing a cart past',
      },
    },
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
    canhTot2:
      'finishing a set at a private gym with a personal trainer, toweling off with a satisfied grin, a smoothie bar and floor-to-ceiling windows behind',
    boiCanhTot2:
      'a private gym club with floor-to-ceiling city views: modern equipment in neat rows, a smoothie bar in the corner, soft recessed lighting, a yoga studio visible through a glass partition',
    trungNien: {
      canh: {
        tot: 'finishing a health check at a private wellness clinic, receiving a folder of clean results with a relieved satisfied smile from the doctor',
        trung: 'sitting in a clinic waiting room for a routine annual check-up, patient and unbothered',
        xau: 'sitting across from a doctor at a desk, listening to test results with a furrowed, worried brow',
      },
      boiCanh: {
        tot: 'the consultation room of a private wellness clinic: soft indirect lighting, a wall of framed medical certificates, a bowl of fresh fruit on the desk, a nurse smiling by the door',
        trung: 'a general clinic waiting room: rows of cushioned chairs, a numbered ticket display, a water dispenser, other patients quietly waiting',
        xau: "a doctor's consultation office: an x-ray lit on a wall panel, a folder of test results open on the desk, a box of tissues within reach, blinds half drawn against the afternoon sun",
      },
    },
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
    canhTot2:
      'standing beside a gleaming black sedan parked in front of a spacious multi-storey home, tossing the car keys once and catching them, a wide satisfied grin',
    boiCanhTot2:
      'the paved driveway of a spacious multi-storey home in a new suburb: a glossy black sedan under a car porch, a manicured front garden, wrought-iron gates, a security camera mounted discreetly above',
    trungNien: {
      canh: {
        tot: 'standing in the driveway of a grand multi-storey home beside a gleaming imported sedan, tossing the car keys once with a satisfied grin as a housekeeper waters the garden behind',
        trung: 'reviewing a household budget notebook at the dining table, calculator beside a cup of tea, steady and unremarkable',
        xau: 'sitting before a laptop showing an overdue loan notice, rubbing the temples with one hand, a stack of unpaid bills beside the keyboard',
      },
      boiCanh: {
        tot: 'the driveway of a grand multi-storey home: a glossy imported sedan under a covered car porch, manicured topiary hedges, a two-storey glass foyer visible through the open door, a uniformed housekeeper watering potted orchids',
        trung: 'a family dining table in the evening: a household ledger notebook, a calculator, a rice cooker on the counter behind, a wall calendar marked with due dates',
        xau: 'a home office corner at night: a laptop screen glowing with a red overdue notice, a stack of unpaid bills bound with a rubber band, a cold cup of coffee, a single desk lamp',
      },
    },
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
    canhTot2:
      'standing proudly beside a child receiving a gold medal on stage, camera flashes popping, a large banner and trophy table behind',
    boiCanhTot2:
      'a school auditorium stage set up for an awards ceremony: a red banner with an emblem, a table lined with trophies and medals, parents in the front rows raising phones to take photos',
    trungNien: {
      canh: {
        tot: 'standing proudly beside a young adult child in a graduation gown, pinning the tassel, both beaming for a photo as classmates celebrate around them',
        trung: 'sitting across the table from a grown child home for the weekend, talking over a simple family meal',
        xau: 'standing in a doorway watching a grown child pack a bag in tense silence, wanting to say something and not finding the words',
      },
      boiCanh: {
        tot: 'a university graduation ceremony lawn: rows of graduates in gowns and mortarboards, a stage banner with the university crest, families taking photos, flower bouquets being handed around',
        trung: 'a family dining table on a weekend visit: a simple home-cooked meal laid out, a rice cooker steaming on the counter, a framed childhood photo on the shelf behind',
        xau: "a grown child's bedroom, half-packed: an open suitcase on the bed, drawers left open, a poster from years ago still on the wall, evening light through a half-closed curtain",
      },
    },
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
    canhTot2:
      'clinking champagne glasses on a candlelit resort balcony overlooking the sea, both dressed elegantly, a small anniversary cake set between them',
    boiCanhTot2:
      'a resort balcony suite at dusk overlooking the sea: a small round table set with candles and a cake, rattan chairs, string lights along the railing, the ocean glowing under a setting sun',
    trungNien: {
      canh: {
        tot: "clinking glasses at a candlelit anniversary dinner marking decades together, one reaching to straighten the other's collar with an affectionate smile",
        trung: 'sitting together in the living room after dinner, each with a cup of tea, the television murmuring, comfortable after years together',
        xau: 'sitting at opposite ends of the sofa, each absorbed in their own phone, the silence between them longer than usual',
      },
      boiCanh: {
        tot: 'an elegant restaurant private table for an anniversary dinner: a small cake with a lit candle, a bottle of wine, a single rose in a slim vase, soft warm lighting',
        trung: 'a comfortable living room after dinner: a worn but well-kept sofa, a television on a low cabinet, two cups of tea on coasters, family photos spanning years on the wall',
        xau: 'a living room at night: a sofa with a visible gap between the two seats, a television playing to no one, two phones glowing in the dim light, a family photo askew on the wall',
      },
    },
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
    canhTot2:
      'standing together in front of a newly opened family shop, both beaming as they cut a ribbon stretched across the entrance',
    boiCanhTot2:
      'the entrance of a newly opened family shop: a ribbon-cutting stand with scissors and a ribbon, potted congratulatory flower arrangements lining the pavement, a small crowd of well-wishers',
    trungNien: {
      canh: {
        tot: 'standing arm in arm with a sibling at a large extended-family reunion dinner, both surrounded by their own grown children, raising a toast together',
        trung: 'sitting with a sibling on the porch during a holiday visit, catching up over tea, easy and familiar',
        xau: 'standing apart from a sibling after a tense conversation about the family inheritance, both looking away toward different parts of the yard',
      },
      boiCanh: {
        tot: 'a large extended-family reunion dinner: several round tables joined together under string lights in a courtyard, children of both families running between the tables, a banner celebrating the family gathering',
        trung: 'a family house porch during Tết: a tray of candied fruit and watermelon seeds, a pot of tea, slippers lined at the door, motorbikes parked in the yard beyond',
        xau: 'a family house courtyard after a gathering has thinned out: chairs left pushed back from an emptied table, a lone motorbike still in the yard, dusk settling over the tiled roof',
      },
    },
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
    canhTot2:
      'striding confidently through the lobby of a modern office tower in a tailored coat, phone in hand, sunlight streaming through the glass facade ahead',
    boiCanhTot2:
      'the glass atrium lobby of a modern office tower: a soaring ceiling, polished stone floor reflecting light, a coffee kiosk, sharply dressed people crossing in the background',
  },
};

// ── Riêng cho Xem Tuổi (vợ chồng/làm ăn) ─────────────────────
// KHÔNG gộp vào KHIA_CANH: đó là tập ĐÓNG, khoá cứng đúng 13 khoá (12 cung +
// tổng quan), đối chiếu chéo với CUNG_BY_PHAN/PHAN_TO_KHIA/VARIANT_COUNT/
// ILLUS_NGUONG của Luận Giải & Chu Trình Cuộc Đời (`check-illus.mjs`) — nhét
// thêm khoá vào đó phá cả 3 nguồn kia (đã ăn lỗi CI khi thử). Xem Tuổi luận
// về HAI người, không phải một cung của MỘT lá số, nên đứng bảng riêng, đúng
// cách `THANG_CANH` (Vận Hạn 12 Tháng) đã tách khỏi KHIA_CANH.
//
// LUÔN có một người thứ hai trong cảnh (đối phương). Chỉ tả nhân vật chính
// bằng `nhanVat()`, người thứ hai giữ vai trò ngầm định trong `canh` (không
// tên, không mô tả riêng) — đúng cách `phu-the`/`tu-tuc`/`huynh-de` đã làm,
// để không phải nhân đôi chi phí một bộ mô tả nhân vật thứ hai. Mọi khía đều
// bật `chiHaiNguoi` — xem lý do ở định nghĩa cờ đó.
export const XEM_TUOI_CANH: Record<string, KhiaCanh> = {
  'xet-tuoi': {
    vi: 'Xem Tuổi — so tuổi, nạp âm hai người',
    canh: {
      tot: 'sitting close together at a table, one finger tracing down a printed lá số sheet while the other leans in smiling, both clearly pleased with what they see',
      trung: 'sitting side by side comparing two printed lá số sheets spread on the table, expressions unreadable, simply reading',
      xau: 'sitting across the table from each other, each holding their own printed sheet, brows drawn, not looking up at the other',
    },
    boiCanh: [
      'a home living room table set for a family visit: a tray with a teapot and two cups, an almanac calendar on the wall, an incense stick smouldering nearby, a ceiling fan turning slowly',
      "the small shopfront table of a neighbourhood fortune-teller: a glass cabinet of incense and talismans behind, a single fluorescent tube overhead, a stack of well-worn almanac books, a cat asleep on the doorstep",
      'a corner table in a quiet Vietnamese coffee shop: two glasses of cà phê sữa đá sweating rings onto the wood, a shelf of potted succulents, rain streaking the window beside them',
    ],
    chiHaiNguoi: true,
  },
  'ngu-hanh': {
    vi: 'Xem Tuổi — ngũ hành tương sinh tương khắc',
    canh: {
      tot: 'standing together at the stove, one holding the pan steady while the other adds the seasoning, moving in easy sync',
      trung: 'standing at the stove taking turns stirring the pot, each waiting patiently for the other',
      xau: 'standing at the stove elbow to elbow, both reaching for the same spoon at once, neither giving way',
    },
    boiCanh: [
      'a narrow tiled kitchen at dinner time: a gas ring with a pot bubbling, bunches of herbs in a basin, a rice cooker venting steam, a string of garlic hanging from a nail',
      'a countryside kitchen with a wood-fired stove: a blackened kettle, bundles of firewood stacked by the wall, a cat weaving underfoot, light falling through a gap in the tin roof',
      'the cramped stall kitchen of a street food cart at dusk: a large simmering pot, stacked bowls, a portable gas burner, motorbikes parked just beyond the tarpaulin awning',
    ],
    chiHaiNguoi: true,
  },
  'tu-tuong': {
    vi: 'Xem Tuổi — tư tưởng, cùng chí hướng hay bất đồng',
    canh: {
      tot: 'leaning together over an open notebook, both pointing to the same line, nodding at the same time',
      trung: 'sitting together looking at a notebook, one talking while the other listens, mild and unremarkable',
      xau: 'sitting with the notebook between them, each pointing to a different page, voices raised without shouting',
    },
    boiCanh: [
      'a living room coffee table cluttered with an open notebook and two mugs: a bookshelf behind, a standing fan, evening light through a curtain',
      'a corner table in a quiet café: an open notebook and a laptop half-closed, two cups of coffee, a potted plant on the windowsill, soft rain outside',
      'a shared office desk after hours: papers and an open notebook under a desk lamp, a whiteboard half-covered in scribbles behind, the rest of the office dark and empty',
    ],
    chiHaiNguoi: true,
  },
  'tinh-cach': {
    vi: 'Xem Tuổi — tính cách, hoà hợp hay va chạm',
    canh: {
      tot: 'sitting together on the sofa laughing at the same joke on the television, shoulders shaking',
      trung: 'sitting together on the sofa, each scrolling their own phone, comfortable silence',
      xau: 'sitting on the sofa, one reaching for the remote at the same moment as the other pulls it back, both faces tight',
    },
    boiCanh: [
      'a small apartment living room: a worn sofa, a television on a low cabinet, a laundry rack by the balcony door, a single lamp glowing',
      'a countryside living room in the evening: a wooden bench, a television on a stand, a mosquito coil smouldering on the floor, moths circling the ceiling light',
      'a rented studio living room: a futon sofa still a little bare, a television propped on cardboard boxes, a single potted plant by the window, city lights beginning to show outside',
    ],
    chiHaiNguoi: true,
  },
  'van-hanh': {
    vi: 'Xem Tuổi — vận hành, giai đoạn hiện tại của cả hai',
    canh: {
      tot: 'walking side by side down a bright street, matching stride, one turning to say something that makes the other laugh',
      trung: 'walking side by side along an ordinary street, both looking ahead, neither hurrying',
      xau: 'walking the same street a few steps apart, one glancing back to check on the other who is lagging behind',
    },
    boiCanh: [
      'a busy wet-market street at morning: baskets of produce spilling onto the pavement, motorbikes weaving past, awnings casting patchy shade',
      "a park path at dusk: joggers and cyclists passing, benches under flowering trees, a vendor's cart parked at the entrance",
      'a riverside path at sunset: fishing boats moored along the bank, strings of lights just switching on at riverside stalls, the water catching the last colour of the sky',
    ],
    chiHaiNguoi: true,
  },
};

/** Khối tả dựng cho Xem Tuổi — bảng riêng `XEM_TUOI_CANH`, xem lý do ở đó. */
export interface XemTuoiInput {
  /** Khoá trong `XEM_TUOI_CANH`. */
  khia: string;
  sac: Sac;
  gioi: Gioi;
  tuoi?: Tuoi;
  /** Biến thể bối cảnh 1..3. Ngoài tầm thì quay vòng. */
  v?: number;
}

export function buildXemTuoiPrompt(input: XemTuoiInput): IllusPrompt {
  const { khia, sac, gioi, tuoi = 'truong-thanh' } = input;
  const kc = XEM_TUOI_CANH[khia];
  if (!kc) throw new Error(`illus-prompt: không có khía Xem Tuổi "${khia}"`);
  const v = ((Math.max(1, input.v || 1) - 1) % kc.boiCanh.length) + 1;
  const st = SAC_THAI[sac];

  const prompt = [
    STYLE_LOCK,
    '',
    nhanVat(gioi, tuoi) + '.',
    '',
    `Scene: ${kc.canh[sac]}.`,
    `Expression: ${st.bieuCam}.`,
    `People around them: ${kc.chiHaiNguoi ? HAI_NGUOI_QUANH_CANH[sac] : st.quanhCanh}.`,
    `Environment: ${kc.boiCanh[v - 1]}. ${st.doVat}.`,
    `Light: ${st.anhSang}.`,
    '',
    'Composition: wide horizontal frame, the character placed off-centre towards the right, seen from a natural eye-level three-quarter angle, room to breathe around them.',
    '',
    TEXT_SAFE_AREA,
  ].join('\n');

  return {
    id: `xt-${khia}--${sac}--${gioi}--${tuoi}--v${v}`,
    nhan: `${kc.vi} · ${sac} · ${gioi} · ${tuoi} · biến thể ${v}`,
    prompt,
  };
}

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
  const st = SAC_THAI[sac];

  // Trung niên đọc bảng RIÊNG nếu khía đã khai `trungNien` — xem lý do ở
  // định nghĩa trường đó (KhiaCanh). CHỈ 1 biến thể, luôn v=1, KHÔNG quay
  // vòng theo `boiCanh.length` như trưởng-thành (bảng đó là mảng 3, bảng này
  // là 1 chuỗi/sắc). Thiếu khai (vd. tong-quan — đã có ảnh trung-niên thật từ
  // trước theo cảnh chung) thì rơi xuống nhánh trưởng-thành bên dưới như cũ.
  if (tuoi === 'trung-nien' && kc.trungNien) {
    const prompt = [
      STYLE_LOCK,
      '',
      nhanVat(gioi, tuoi) + '.',
      '',
      `Scene: ${kc.trungNien.canh[sac]}.`,
      `Expression: ${st.bieuCam}.`,
      `People around them: ${st.quanhCanh}.`,
      `Environment: ${kc.trungNien.boiCanh[sac]}. ${st.doVat}.`,
      `Light: ${st.anhSang}.`,
      '',
      'Composition: wide horizontal frame, the character placed off-centre towards the right, seen from a natural eye-level three-quarter angle, room to breathe around them.',
      '',
      TEXT_SAFE_AREA,
    ].join('\n');
    return {
      id: `${khia}--${sac}--${gioi}--${tuoi}--v1`,
      nhan: `${kc.vi} · ${sac} · ${gioi} · ${tuoi} · biến thể 1`,
      prompt,
    };
  }

  const v = ((Math.max(1, input.v || 1) - 1) % kc.boiCanh.length) + 1;

  // (tốt, v=2) đọc cảnh/bối cảnh phú quý riêng nếu khía đã khai — xem lý do ở
  // `canhTot2`/`boiCanhTot2` (KhiaCanh). Thiếu khai (chưa viết tới, hoặc future
  // v3+) thì rơi về `canh[sac]`/`boiCanh[v-1]` như mọi tổ hợp khác.
  const dungTot2 = sac === 'tot' && v === 2 && !!kc.canhTot2 && !!kc.boiCanhTot2;
  const canhText = dungTot2 ? kc.canhTot2! : kc.canh[sac];
  const moiTruong = dungTot2 ? kc.boiCanhTot2! : kc.boiCanh[v - 1];

  const prompt = [
    STYLE_LOCK,
    '',
    nhanVat(gioi, tuoi) + '.',
    '',
    `Scene: ${canhText}.`,
    `Expression: ${st.bieuCam}.`,
    `People around them: ${st.quanhCanh}.`,
    `Environment: ${moiTruong}. ${st.doVat}.`,
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
