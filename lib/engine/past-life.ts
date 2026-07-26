// lib/engine/past-life.ts
// ============================================================
// "Chân Dung Tiền Kiếp" — phóng chiếu lá số vào bối cảnh Trung Hoa cổ.
//
// ĐỊNH VỊ (quan trọng, đọc trước khi sửa): Tử Vi Đẩu Số KHÔNG có cung nào nói
// về tiền kiếp — đó là khái niệm Phật giáo (luân hồi), không phải mệnh lý
// Trung Hoa. Tool này KHÔNG bói tiền kiếp. Nó dựa trên một quan sát khác:
// toàn bộ từ vựng gốc của Tử Vi là từ vựng TRIỀU ĐÌNH PHONG KIẾN — cách cục
// mang tên "Quân Thần Khánh Hội", "Tướng Tinh Đắc Địa", diễn giải cổ ghi thẳng
// "công hầu khanh tướng", "trấn thủ biên ải", "quan coi kho lẫm". Khi luận tử
// vi cho người hiện đại, ta đang DỊCH XUÔI từ ngôn ngữ phong kiến sang đời
// sống hôm nay (Thất Sát → "nghề áp lực cao"). Tool này chỉ bỏ bước dịch đó
// đi — trả cách cục về đúng bối cảnh mà cổ thư viết ra nó.
//
// Module THUẦN deterministic (không gọi LLM). Route gọi tiếp LLM để viết
// truyện + prompt ảnh từ dữ liệu module này trả ra.
// ============================================================

import type { Laso } from './laso';
import { getPalaceReadout, type PhuTheReadout } from './portrait';

type Rec = Record<string, unknown>;

interface StarObj {
  ten: string;
  hoa?: string | null;
  nhom?: string;
  brightness?: string;
}


// ── Bối cảnh (era) ──────────────────────────────────────────────────────
// Henry chọn thêm Việt Nam cổ, và chỉ ra một điều làm việc này rẻ hẳn: trang
// phục cung đình Việt xưa vốn chịu ảnh hưởng nặng của Trung Hoa nên KHÔNG cần
// bộ mô tả riêng — dùng chung `attireEn` của bảng OCCUPATION_BY_STAR cho cả
// hai bối cảnh. Danh xưng cũng dùng chung luôn: Tể tướng / Thượng thư / Thái y
// / Quan án / Tướng quân đều là từ Hán-Việt, đúng cho cả triều đình Đại Việt.
//
// ĐÁNH ĐỔI ĐÃ BIẾT (Henry chốt: "không cần ghì"): vì không ép các dấu hiệu
// nhận diện riêng của trang phục Việt (áo giao lĩnh, áo ngũ thân, khăn vấn,
// mũ cánh chuồn), ảnh bối cảnh Việt Nam nhiều khả năng trông gần giống ảnh
// bối cảnh Trung Hoa. Nếu sau khi xem ảnh thật thấy cần tách bạch hơn thì chỗ
// cần sửa là `extraEn` dưới đây, không phải cả bảng nghề.
export type EraId = 'trung-hoa' | 'viet-nam';

export interface Era {
  id: EraId;
  label: string;
  /** Câu định vị bối cảnh trong prompt ảnh. */
  settingEn: string;
  /** Nét mặt/chủng tộc cho prompt ảnh. */
  ethnicityEn: string;
  /** Vài dấu hiệu nhẹ để ảnh không trôi hẳn sang bối cảnh kia. */
  extraEn: string;
  /** Ràng buộc bối cảnh cho prompt viết truyện. */
  storySetting: string;
}

export const ERAS: Record<EraId, Era> = {
  'trung-hoa': {
    id: 'trung-hoa',
    label: 'Trung Hoa cổ',
    settingEn: 'ancient imperial China',
    ethnicityEn: 'East Asian (Chinese) facial features',
    extraEn: 'Classical Chinese imperial aesthetic.',
    storySetting:
      'Trung Hoa cổ đại, một triều đại HƯ CẤU không tên. Dùng chữ chung: triều đình, kinh thành, biên ải, hoàng thượng.',
  },
  'viet-nam': {
    id: 'viet-nam',
    label: 'Việt Nam cổ',
    settingEn: 'pre-modern Vietnam (Đại Việt), an old Vietnamese imperial capital',
    ethnicityEn: 'Vietnamese Southeast Asian facial features',
    extraEn:
      'Vietnamese imperial aesthetic — court dress of Đại Việt, historically close to Chinese court dress of the same era but in a Vietnamese setting.',
    storySetting:
      'Đại Việt thời phong kiến, một triều đại HƯ CẤU không tên. Dùng chữ chung: triều đình, kinh thành, biên ải, bệ hạ. Địa danh nếu có phải là địa danh hư cấu mang âm hưởng Việt, KHÔNG dùng tên triều đại/nhân vật lịch sử Việt Nam có thật (không Lý, Trần, Lê, Nguyễn, không Trần Hưng Đạo, không Nguyễn Trãi).',
  },
};

export function resolveEra(id?: string): Era {
  return ERAS[(id as EraId) in ERAS ? (id as EraId) : 'trung-hoa'];
}

// ── Chính tinh → chức phận thời xưa ─────────────────────────────────────
// Nguồn: chính diễn giải cổ pháp của từng chính tinh (Thất Sát = tướng ở
// biên ải, Cự Môn = khẩu thiệt/biện luận, Thiên Cơ = mưu trí...). CHỦ ĐỘNG
// giữ dạng BẢNG TRA CỨNG thay vì để LLM tự nghĩ nghề — cùng triết lý với
// portrait-stars.json: phần "suy ra cái gì" phải deterministic, LLM chỉ được
// viết văn trên dữ liệu đã chốt.
//
// `title` CỐ Ý ngắn và cụ thể (Tể tướng / Thái y / Quan án / Tướng quân trấn
// ải…) thay vì mô tả dài kiểu "người nắm giữ luật lệ mà lòng không dễ lay
// chuyển" — Henry test prod xong phản hồi: thứ người dùng KỂ LẠI cho bạn bè là
// một danh từ chức phận ("tao kiếp trước làm Tể tướng"), mô tả dài thì đọc
// xong không nhớ nổi để mà kể. Vế thơ/bi kịch vẫn có, nhưng do LLM sinh riêng
// (`biDanh`) và hiển thị nhỏ bên dưới, không trộn vào danh xưng.
//
// `attireEn` đi thẳng vào prompt ảnh — đây là thứ khiến bức chân dung TRÔNG
// đúng nghề (giáp trụ vs áo the vs áo quan), nên phải cụ thể chứ không tả
// chung chung "ancient Chinese clothing".
export interface Occupation {
  /** Danh xưng gốc — LLM được phép thêm vế sau cho có chất truyện, nhưng KHÔNG
   * được đổi nghề. */
  title: string;
  /** Nhóm nghề — dùng chọn bối cảnh nền cho ảnh. */
  domain: 'vo' | 'van' | 'quyen' | 'thuong' | 'y' | 'nghe' | 'tu';
  /** 1 câu chức phận, để LLM bám khi viết truyện. */
  desc: string;
  /** Trang phục + đạo cụ (tiếng Anh) cho prompt ảnh. */
  attireEn: string;
}

const OCCUPATION_BY_STAR: Record<string, Occupation> = {
  'Tử Vi': {
    title: 'Vương gia',
    domain: 'quyen',
    desc: 'Người mang dòng dõi tôn quý, đứng ở hàng cao nhất trong triều, quen với việc ra lệnh hơn là nhận lệnh.',
    attireEn:
      'an imperial court robe of deep purple and crimson silk with elaborate gold-thread embroidery, a formal jade-inlaid belt and a tall ceremonial headdress',
  },
  'Thiên Phủ': {
    title: 'Quan quốc khố',
    domain: 'quyen',
    desc: 'Người nắm giữ kho tàng, tiền lương và vật tư của triều đình — chức không hào nhoáng nhưng ai cũng phải qua tay.',
    attireEn:
      'a senior official’s robe of deep indigo silk with restrained silver-thread trim, a jade belt and a black gauze official’s cap',
  },
  'Thiên Cơ': {
    title: 'Quân sư',
    domain: 'van',
    desc: 'Người bày mưu định kế sau lưng chủ soái — không cầm quân nhưng quyết định thắng bại.',
    attireEn:
      'a plain slate-blue scholar’s robe with wide sleeves and a simple cloth headband, holding a closed folding fan',
  },
  'Thái Dương': {
    title: 'Thượng thư',
    domain: 'van',
    desc: 'Người đứng giữa công đường, danh tiếng rạng rỡ, tiếng nói vang xa nhưng cũng dễ chói mắt kẻ khác.',
    attireEn:
      'a bright vermilion court official’s robe with a gold-embroidered rank badge on the chest and a black gauze official’s cap',
  },
  'Thái Âm': {
    title: 'Quan nội đình',
    domain: 'van',
    desc: 'Người lo việc trong, giấy tờ sổ sách, tính toán thầm lặng phía sau — ít ai thấy mặt nhưng thiếu thì rối loạn.',
    attireEn:
      'a soft pale silver-blue silk robe with delicate embroidery, understated and refined, with a simple hairpin',
  },
  'Vũ Khúc': {
    title: 'Tổng binh',
    domain: 'vo',
    desc: 'Người vừa cầm quân vừa cầm tiền — cứng rắn, thực tế, quyết đoán trong cả trận mạc lẫn tính toán.',
    attireEn:
      'dark lamellar armor worn over a deep-toned robe, a broad leather belt with metal fittings, disciplined and functional',
  },
  'Thiên Đồng': {
    title: 'Thái y',
    domain: 'y',
    desc: 'Người chữa bệnh cứu người, sống hiền hòa, hưởng phúc lành hơn là tranh đoạt.',
    attireEn:
      'a simple cream and soft-brown physician’s robe of coarse but clean fabric, with a cloth medicine satchel',
  },
  'Liêm Trinh': {
    title: 'Quan án',
    domain: 'quyen',
    desc: 'Người coi việc xét xử, hình phạt, luật lệ — nghiêm khắc, không dễ lay chuyển, dễ chuốc oán.',
    attireEn:
      'a severe black judicial robe with crimson trim and a dark rank insignia, a stiff black official’s cap',
  },
  'Tham Lang': {
    title: 'Lãng tử giang hồ',
    domain: 'nghe',
    desc: 'Người đa tài đa nghệ, giao du rộng, sống bằng tài khéo và sức hút riêng hơn là bằng chức tước.',
    attireEn:
      'a richly colored layered silk robe of a wandering artisan-merchant, with decorative sash and small ornaments',
  },
  'Cự Môn': {
    title: 'Trạng sư',
    domain: 'van',
    desc: 'Người sống bằng lời nói — biện luận, dạy học, tranh tụng; sắc bén nhưng cũng vì miệng lưỡi mà mang họa.',
    attireEn:
      'a dark charcoal scholar’s robe with a plain sash and a simple cloth cap, carrying a bamboo scroll',
  },
  'Thiên Tướng': {
    title: 'Tể tướng',
    domain: 'quyen',
    desc: 'Người phụ tá bậc nhất, giữ ấn tín, thay chủ điều hành — trung thành, chỉn chu, quyền lớn mà không phải chủ.',
    attireEn:
      'a formal minister’s robe of deep teal and gold with a ceremonial seal pouch at the waist and a black gauze cap',
  },
  'Thiên Lương': {
    title: 'Gián quan',
    domain: 'y',
    desc: 'Người giữ việc can gián, nói thẳng điều bề trên không muốn nghe — được kính trọng nhưng cô độc, hay chuốc ghét vì lẽ phải.',
    attireEn:
      'an elder’s robe in muted earth tones with a long grey beard, a plain wooden hairpin and a scholarly bearing',
  },
  'Thất Sát': {
    title: 'Tướng quân trấn ải',
    domain: 'vo',
    desc: 'Người cầm quân giữ ải nơi biên cương — quyết liệt, cô độc, quen sống giữa sinh tử.',
    attireEn:
      'battle-worn dark iron armor with a fur-lined cloak over the shoulders, a weathered leather belt, commanding and austere',
  },
  'Phá Quân': {
    title: 'Tiên phong',
    domain: 'vo',
    desc: 'Người đi đầu phá trận, mở đường — dám đập bỏ cái cũ, đời nhiều lần dựng lại từ đầu.',
    attireEn:
      'light scouting armor of dark leather and metal plates, a travel-worn cloak, rugged and mobile',
  },
};

// Fallback khi Quan Lộc (và cả cung xung chiếu) vô chính diệu — hiếm.
const DEFAULT_OCCUPATION: Occupation = {
  title: 'Hàn sĩ',
  domain: 'van',
  desc: 'Kẻ sĩ nghèo có học, có chí, nhưng cả đời không rơi vào một chức phận rõ ràng nào — sống bên lề thời cuộc.',
  attireEn:
    'a plain undyed hemp scholar’s robe without rank insignia, simple and worn, a modest cloth headband',
};

// Bối cảnh nền cho ảnh, theo nhóm nghề.
const DOMAIN_BACKDROP: Record<Occupation['domain'], string> = {
  vo: 'a windswept frontier fortress rampart at dawn, distant banners and mountains softly blurred behind',
  van: 'a quiet imperial study with wooden shelves of bamboo scrolls, soft light through a lattice window',
  quyen: 'a grand palace hall with red lacquered columns and hanging silk banners, softly blurred',
  thuong: 'a prosperous old trading street with wooden storefronts and hanging lanterns, softly blurred',
  y: 'an apothecary room with rows of small wooden medicine drawers and hanging dried herbs, warm and calm',
  nghe: 'a lantern-lit artisan quarter at dusk, silk banners and warm scattered lights softly blurred',
  tu: 'a mountain temple courtyard in morning mist, old stone steps and pine trees softly blurred',
};

// ── Phụ tinh tại Quan Lộc → sắc thái nghề nghiệp ────────────────────────
// KHÔNG đổi nghề gốc (nghề do chính tinh quyết định), chỉ thêm ghi chú để LLM
// viết cho đúng chất. Mỗi ghi chú bám sát ý nghĩa cổ pháp của sao đó.
const CAREER_MODIFIERS: { stars: string[]; note: string }[] = [
  { stars: ['Văn Xương', 'Văn Khúc'], note: 'ngả hẳn về đường văn chương, chữ nghĩa, khoa bảng' },
  { stars: ['Kình Dương', 'Đà La'], note: 'con đường công danh nhiều va chạm, tranh đoạt, thương tích' },
  { stars: ['Hỏa Tinh', 'Linh Tinh'], note: 'tính khí nóng nảy gấp gáp, thăng trầm đột ngột trong nghề' },
  { stars: ['Địa Không', 'Địa Kiếp'], note: 'có lúc rời bỏ chức phận, ngả về tu hành, ẩn dật hoặc trắng tay làm lại' },
  { stars: ['Đào Hoa', 'Hồng Loan', 'Thiên Riêu'], note: 'nổi tiếng nhờ tài hoa và sức hút cá nhân, dính dáng chuyện tình ái' },
  { stars: ['Lộc Tồn'], note: 'nghề nghiệp gắn liền với tiền bạc, bổng lộc dồi dào' },
  { stars: ['Tả Phù', 'Hữu Bật'], note: 'luôn có người phò tá, đề bạt, không phải đơn độc' },
  { stars: ['Thiên Mã'], note: 'chức phận gắn với đi lại, chinh chiến hoặc bôn ba xa xứ' },
  { stars: ['Thiên Khôi', 'Thiên Việt'], note: 'gặp quý nhân tiến cử đúng lúc, có cơ hội mà người khác không có' },
];

// Tứ Hóa tại Quan Lộc — trọng lượng cao hơn phụ tinh thường.
const HOA_NOTES: Record<string, string> = {
  'Lộc': 'đường công danh sinh lợi, có thực quyền về tài vật',
  'Quyền': 'nắm quyền lực thật sự, chỉ huy được người khác',
  'Khoa': 'có danh tiếng, được ghi nhận về học vấn hoặc tài năng',
  'Kỵ': 'công danh nhiều trắc trở, dễ mắc kẹt hoặc bị cản phá',
};

// ── Tên nhân vật ────────────────────────────────────────────────────────
// Bản đầu CẤM đặt tên riêng (sợ trùng nhân vật lịch sử có thật). Henry test
// prod xong chỉ ra hệ quả: 5 hồi truyện gọi nhân vật bằng "vị tướng quân ấy",
// "người thầy thuốc ấy" suốt từ đầu tới cuối thì đọc như bản báo cáo, không ra
// truyện, và không có gì để người đọc bám vào mà nhớ.
//
// Nay CÓ tên, nhưng tên do CODE chọn từ pool cố định (không để LLM tự bịa —
// LLM rất dễ rơi trúng Gia Cát Lượng/Tào Tháo). Pool chỉ gồm họ + tên phổ
// thông, cố ý TRÁNH các tổ hợp gắn với nhân vật lịch sử nổi tiếng. Chọn
// deterministic theo lá số → cùng một lá số luôn ra cùng một tên (gen lại
// không đổi người), nhưng lá số khác nhau thì tên khác nhau.
// Pool tên tách theo BỐI CẢNH. Henry chốt không ghì trang phục Việt (vốn gần
// giống Trung Hoa), nên tên nhân vật thành dấu hiệu nhận diện mạnh nhất còn
// lại — và nó rẻ hơn hẳn bộ mô tả trang phục riêng.
const NAME_POOLS: Record<EraId, { ho: string[]; nam: string[]; nu: string[] }> = {
  'trung-hoa': {
    ho: ['Lục', 'Doãn', 'Tạ', 'Mạnh', 'Thôi', 'Hạ', 'Vương', 'Tô', 'Kỷ', 'Tần', 'Diệp', 'Hàn'],
    nam: ['Tử Kỳ', 'Bá Nhiên', 'Duy Cẩn', 'Mộ Ngôn', 'Thanh Vân', 'Trọng Khiêm', 'Hữu Đạo', 'Nguyên Thực'],
    nu: ['Thanh Lam', 'Tố Nghi', 'Diệu Hoa', 'Vân Thư', 'Tuệ Kỳ', 'Diệu Linh', 'Nhu Gia', 'Uyển Chi'],
  },
  'viet-nam': {
    ho: ['Trần', 'Lê', 'Phạm', 'Đặng', 'Vũ', 'Đinh', 'Hoàng', 'Bùi', 'Ngô', 'Đỗ', 'Dương', 'Trịnh'],
    nam: ['Đức Toàn', 'Văn Cẩn', 'Hữu Nghiêm', 'Đình Khuê', 'Bá Lộc', 'Trọng Nghĩa', 'Quang Đán', 'Sĩ Liêm'],
    nu: ['Ngọc Diệp', 'Thục Trinh', 'Ngọc Uyển', 'Thanh Nhàn', 'Diệu Thường', 'Ngọc Chân', 'Tố Liên', 'Thu Nương'],
  },
};

/** Hash ổn định (không dùng Math.random — cùng lá số phải ra cùng tên). */
function stableHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickCharacterName(ls: Laso, gender: 'nam' | 'nu', era: Era): string {
  // Seed CỐ Ý không chứa era: cùng một lá số đổi bối cảnh vẫn là "cùng một
  // người" được hình dung lại ở nơi khác, nên chọn cùng vị trí trong pool —
  // chỉ pool đổi, thứ tự bốc thì giữ nguyên.
  const seed = [ls.canChiNam, ls.menhDC, ls.thanDC, ls.napAm, ls.cuc, gender].join('|');
  const h = stableHash(seed);
  const pool = NAME_POOLS[era.id];
  const ten = gender === 'nu' ? pool.nu : pool.nam;
  return `${pool.ho[h % pool.ho.length]} ${ten[Math.floor(h / pool.ho.length) % ten.length]}`;
}

function palaceStarObjs(p: Rec | undefined, majorsOnly = false): StarObj[] {
  if (!p) return [];
  if (majorsOnly) return ((p.majorStars as StarObj[]) || []).filter((s) => s?.ten);
  return ((p.stars as StarObj[]) || []).filter((s) => s?.ten);
}

const BRIGHTNESS_RANK: Record<string, number> = {
  'Miếu': 5, 'Vượng': 4, 'Đắc': 3, 'Bình': 2, 'Hãm': 1,
};

/** Chọn chính tinh ĐẠI DIỆN của một cung: sáng nhất thắng; đồng hạng thì lấy
 * sao đứng trước (thứ tự an sao của engine). */
function pickLeadMajor(p: Rec | undefined): StarObj | null {
  const majors = palaceStarObjs(p, true).filter((s) => OCCUPATION_BY_STAR[s.ten]);
  if (!majors.length) return null;
  let best = majors[0];
  for (const s of majors) {
    if ((BRIGHTNESS_RANK[s.brightness || ''] ?? 0) > (BRIGHTNESS_RANK[best.brightness || ''] ?? 0)) best = s;
  }
  return best;
}

export interface OccupationResult extends Occupation {
  /** Chính tinh quyết định nghề. */
  star: string;
  brightness?: string;
  /** true nếu Quan Lộc vô chính diệu, phải mượn chính tinh cung xung chiếu
   * (Phu Thê) theo đúng cổ pháp "vô chính diệu tất phải mượn đối cung luận". */
  borrowed: boolean;
  /** Sắc thái thêm từ phụ tinh + tứ hóa tại Quan Lộc. */
  notes: string[];
  backdropEn: string;
}

function computeOccupation(ls: Laso): OccupationResult {
  const palaces = (ls.palaces as Rec[]) || [];
  const quan = palaces.find((p) => p.cungName === 'Quan Lộc') as Rec | undefined;

  let lead = pickLeadMajor(quan);
  let borrowed = false;
  if (!lead) {
    lead = pickLeadMajor(quan?.xungChieuCung as Rec | undefined);
    borrowed = !!lead;
  }

  const base = lead ? OCCUPATION_BY_STAR[lead.ten] : DEFAULT_OCCUPATION;

  // Sắc thái từ phụ tinh + tứ hóa ĐÓNG TẠI Quan Lộc (không xét tam hợp — giữ
  // đúng nguyên tắc "xem sao tại chính cung" đã chốt ở portrait.ts).
  const quanStars = palaceStarObjs(quan);
  const quanNames = new Set(quanStars.map((s) => s.ten));
  const notes: string[] = [];
  for (const m of CAREER_MODIFIERS) {
    const hit = m.stars.filter((s) => quanNames.has(s));
    if (hit.length) notes.push(`${hit.join('/')} → ${m.note}`);
  }
  for (const s of quanStars) {
    if (s.hoa && HOA_NOTES[s.hoa]) notes.push(`${s.ten} hóa ${s.hoa} → ${HOA_NOTES[s.hoa]}`);
  }

  return {
    ...base,
    star: lead?.ten || '(vô chính diệu)',
    brightness: lead?.brightness,
    borrowed,
    notes,
    backdropEn: DOMAIN_BACKDROP[base.domain],
  };
}

// ── 9 đại vận → 5 hồi truyện ────────────────────────────────────────────
// Gộp cố định [ĐV1-2][ĐV3-4][ĐV5-6][ĐV7-8][ĐV9] theo THỜI GIAN, rồi mới GẮN
// NHÃN vai trò kịch (đỉnh cao / biến cố) vào đúng hồi chứa đại vận có điểm
// cao nhất / thấp nhất.
//
// CỐ Ý không làm ngược lại (cố định "hồi 3 = đỉnh cao"): nếu ép đỉnh cao luôn
// nằm giữa truyện thì mọi lá số ra cùng một hình dáng câu chuyện. Để nhãn TỰ
// TRÔI theo điểm thật thì người có đại vận đẹp sớm ra "thiếu niên đắc chí rồi
// lụi dần", người có đại vận đẹp muộn ra "nửa đời lận đận, hậu vận huy hoàng"
// — khác nhau thật, đúng theo lá số, không phải template đổi tên.
const ACT_GROUPS: number[][] = [[0, 1], [2, 3], [4, 5], [6, 7], [8]];
const ACT_STAGES = ['Thiếu thời', 'Lập thân', 'Trung niên', 'Hậu vận', 'Cuối đời'];

export interface DaiVanBrief {
  idx: number;
  diaChi: string;
  cungName: string;
  tuoiStart: number;
  tuoiEnd: number;
  score: number | null;
  chinhTinh: string[];
  rulesTot: string[];
  rulesXau: string[];
  canhBao: string[];
  yNghia: string[];
}

export type ActRole = 'thuong' | 'dinh-cao' | 'bien-co' | 'thang-tram';

export interface PastLifeAct {
  index: number;
  stage: string;
  ageFrom: number;
  ageTo: number;
  role: ActRole;
  daiVans: DaiVanBrief[];
}

function briefDaiVan(ls: Laso, dv: Rec, idx: number): DaiVanBrief {
  const palaces = (ls.palaces as Rec[]) || [];
  const p = palaces[dv.cungIdx as number] as Rec | undefined;
  const rules = (dv.rules as Rec[]) || [];
  const pick = (t: string) =>
    rules.filter((r) => r.type === t).map((r) => String(r.text || '')).filter(Boolean);
  const scoring = dv.scoring as Rec | undefined;
  return {
    idx: idx + 1,
    diaChi: String(dv.diaChi || ''),
    cungName: String(p?.cungName || ''),
    tuoiStart: Number(dv.tuoiStart) || 0,
    tuoiEnd: Number(dv.tuoiEnd) || 0,
    score: scoring && typeof scoring.tong === 'number' ? (scoring.tong as number) : null,
    chinhTinh: palaceStarObjs(p, true).map((s) => (s.brightness ? `${s.ten} (${s.brightness})` : s.ten)),
    rulesTot: pick('tot'),
    rulesXau: pick('xau'),
    canhBao: pick('canh_bao'),
    yNghia: ((dv.yNghia as string[]) || []).slice(0, 6),
  };
}

export interface LifeArc {
  acts: PastLifeAct[];
  /** Index (0-based) của đại vận điểm cao nhất / thấp nhất trong 9 đại vận. */
  peakDvIdx: number;
  troughDvIdx: number;
  /** Tuổi dùng để vẽ chân dung. KHÔNG phải giữa đại vận đỉnh cao toàn cục:
   * đại vận đỉnh cao rơi vào cuối đời (vd 86–95 tuổi) là chuyện thường, mà vẽ
   * chân dung một cụ già thì hỏng cả bức. Nay neo vào đại vận điểm CAO NHẤT
   * TRONG QUÃNG ĐỜI TRƯỞNG THÀNH (đại vận bắt đầu trước tuổi 56) rồi mới kẹp
   * 25–55 — vẫn deterministic, vẫn là "lúc rực rỡ nhất", nhưng ở độ tuổi vẽ
   * được. Đỉnh cao toàn cục vẫn giữ nguyên cho phần TRUYỆN (peakDvIdx). */
  portraitAge: number;
  /** Index (0-based) đại vận dùng để chọn tuổi vẽ chân dung. */
  portraitDvIdx: number;
}

/** Đại vận bắt đầu từ tuổi này trở đi không được dùng làm mốc tuổi vẽ chân
 * dung (quá già để làm chân dung nhân vật chính). */
const PORTRAIT_MAX_START_AGE = 56;
const PORTRAIT_AGE_MIN = 25;
const PORTRAIT_AGE_MAX = 55;

function computeLifeArc(ls: Laso): LifeArc {
  const dvsRaw = ((ls.daiVans as Rec[]) || []).slice(0, 9);
  const briefs = dvsRaw.map((dv, i) => briefDaiVan(ls, dv, i));

  // Đại vận không có scoring (hiếm — engine luôn tính, nhưng phòng hờ) bị loại
  // khỏi việc chọn đỉnh/đáy để không bị coi là "điểm 0 = thấp nhất".
  const scored = briefs.filter((b) => b.score != null);
  let peakDvIdx = 0;
  let troughDvIdx = 0;
  if (scored.length) {
    let hi = scored[0];
    let lo = scored[0];
    for (const b of scored) {
      if ((b.score as number) > (hi.score as number)) hi = b;
      if ((b.score as number) < (lo.score as number)) lo = b;
    }
    peakDvIdx = hi.idx - 1;
    troughDvIdx = lo.idx - 1;
  }

  const acts: PastLifeAct[] = ACT_GROUPS.map((group, i) => {
    const members = group.map((g) => briefs[g]).filter(Boolean);
    const hasPeak = group.includes(peakDvIdx);
    const hasTrough = group.includes(troughDvIdx);
    const role: ActRole =
      hasPeak && hasTrough ? 'thang-tram' : hasPeak ? 'dinh-cao' : hasTrough ? 'bien-co' : 'thuong';
    return {
      index: i + 1,
      stage: ACT_STAGES[i],
      ageFrom: members.length ? members[0].tuoiStart : 0,
      ageTo: members.length ? members[members.length - 1].tuoiEnd : 0,
      role,
      daiVans: members,
    };
  }).filter((a) => a.daiVans.length > 0);

  // Mốc tuổi vẽ chân dung — xem ghi chú ở LifeArc.portraitAge.
  const adult = scored.filter((b) => b.tuoiStart < PORTRAIT_MAX_START_AGE);
  const pool = adult.length ? adult : scored.length ? scored : briefs;
  let portraitDv = pool[0];
  for (const b of pool) {
    if ((b.score ?? -Infinity) > (portraitDv?.score ?? -Infinity)) portraitDv = b;
  }
  const rawAge = portraitDv ? Math.round((portraitDv.tuoiStart + portraitDv.tuoiEnd) / 2) : 35;
  const portraitAge = Math.max(PORTRAIT_AGE_MIN, Math.min(PORTRAIT_AGE_MAX, rawAge));

  return {
    acts,
    peakDvIdx,
    troughDvIdx,
    portraitAge,
    portraitDvIdx: portraitDv ? portraitDv.idx - 1 : peakDvIdx,
  };
}

// ── Tổng hợp ────────────────────────────────────────────────────────────
export interface PastLifeProfile {
  gender: 'nam' | 'nu';
  era: Era;
  /** Tên nhân vật — chọn deterministic từ pool (xem pickCharacterName). */
  characterName: string;
  occupation: OccupationResult;
  arc: LifeArc;
  /** Tên cung mà Thân đóng vào (Thân luôn trùng 1 trong 12 cung). */
  thanCungName: string;
  /** Readout 6 cung dùng dựng nhân vật. */
  readouts: {
    menh: PhuTheReadout;
    than: PhuTheReadout;
    quanLoc: PhuTheReadout;
    taiBach: PhuTheReadout;
    phucDuc: PhuTheReadout;
    thienDi: PhuTheReadout;
  };
  napAm: string;
  cuc: string;
  canChiNam: string;
}

/**
 * Dựng toàn bộ dữ liệu nhân vật tiền kiếp từ lá số đã tính. Thuần
 * deterministic — mọi thứ LLM cần đã được chốt ở đây, LLM chỉ viết văn.
 */
export function computePastLife(ls: Laso, gender: 'nam' | 'nu', era: Era = ERAS['trung-hoa']): PastLifeProfile {
  const palaces = (ls.palaces as Rec[]) || [];
  const thanP = palaces.find((p) => p.isThan) as Rec | undefined;
  const thanCungName = String(thanP?.cungName || 'Mệnh');

  return {
    gender,
    era,
    characterName: pickCharacterName(ls, gender, era),
    occupation: computeOccupation(ls),
    arc: computeLifeArc(ls),
    thanCungName,
    readouts: {
      menh: getPalaceReadout(ls, 'Mệnh'),
      than: getPalaceReadout(ls, thanCungName),
      quanLoc: getPalaceReadout(ls, 'Quan Lộc'),
      taiBach: getPalaceReadout(ls, 'Tài Bạch'),
      phucDuc: getPalaceReadout(ls, 'Phúc Đức'),
      thienDi: getPalaceReadout(ls, 'Thiên Di'),
    },
    napAm: String(ls.napAm || ''),
    cuc: String(ls.cuc || ''),
    canChiNam: String(ls.canChiNam || ''),
  };
}

// ── Format cho prompt LLM ───────────────────────────────────────────────
const ROLE_LABEL: Record<ActRole, string> = {
  'thuong': 'giai đoạn bình thường',
  'dinh-cao': '★ ĐỈNH CAO CẢ ĐỜI (đại vận điểm cao nhất trong 9 đại vận)',
  'bien-co': '▼ BIẾN CỐ LỚN NHẤT (đại vận điểm thấp nhất trong 9 đại vận)',
  'thang-tram': '★▼ VỪA ĐỈNH CAO VỪA BIẾN CỐ (cả cực đại lẫn cực tiểu rơi vào giai đoạn này)',
};

function fmtDaiVan(d: DaiVanBrief): string {
  const lines = [
    `  • Đại vận ${d.idx} (${d.tuoiStart}–${d.tuoiEnd} tuổi), cung ${d.cungName} (${d.diaChi})` +
      (d.score != null ? ` — điểm vận ${d.score}/10` : ''),
  ];
  if (d.chinhTinh.length) lines.push(`    Chính tinh: ${d.chinhTinh.join(', ')}`);
  if (d.rulesTot.length) lines.push(`    Thuận: ${d.rulesTot.join(' | ')}`);
  if (d.rulesXau.length) lines.push(`    Nghịch: ${d.rulesXau.join(' | ')}`);
  if (d.canhBao.length) lines.push(`    Cảnh báo: ${d.canhBao.join(' | ')}`);
  if (d.yNghia.length) lines.push(`    Luận vận hạn: ${d.yNghia.join(' | ')}`);
  return lines.join('\n');
}

/** Khối "dòng đời 5 hồi" cho prompt viết truyện. */
export function formatArcForLLM(arc: LifeArc): string {
  return arc.acts
    .map(
      (a) =>
        `HỒI ${a.index} — ${a.stage} (${a.ageFrom}–${a.ageTo} tuổi) — ${ROLE_LABEL[a.role]}\n` +
        a.daiVans.map(fmtDaiVan).join('\n'),
    )
    .join('\n\n');
}

/** Khối "hồ sơ nhân vật" cho prompt viết truyện. */
export function formatCharacterForLLM(profile: PastLifeProfile): string {
  const o = profile.occupation;
  const lines: string[] = [];
  lines.push(
    `TÊN NHÂN VẬT (đã chốt, dùng ĐÚNG tên này, KHÔNG đổi, KHÔNG đặt tên khác): ${profile.characterName}` +
      ` — ${profile.gender === 'nu' ? 'nữ' : 'nam'}.`,
  );
  lines.push(
    `CHỨC PHẬN (đã chốt, KHÔNG được đổi sang nghề khác): ${o.title}` +
      ` — suy từ chính tinh ${o.star}${o.brightness ? ` (${o.brightness})` : ''} tại cung Quan Lộc` +
      (o.borrowed ? ' (Quan Lộc vô chính diệu → mượn chính tinh cung xung chiếu theo cổ pháp)' : '') +
      `.\n${o.desc}`,
  );
  if (o.notes.length) lines.push('Sắc thái nghề nghiệp (từ phụ tinh/tứ hóa tại Quan Lộc):\n- ' + o.notes.join('\n- '));

  const block = (label: string, r: PhuTheReadout, note: string) => {
    const parts: string[] = [];
    if (r.chinhTinh.length) parts.push(`chính tinh ${r.chinhTinh.join(', ')}`);
    if (r.phuTinh.length) parts.push(`phụ tinh ${r.phuTinh.slice(0, 8).join(', ')}`);
    let s = `${label} (${note}): ${parts.join('; ') || 'vô chính diệu'}`;
    if (r.cachCuc.length) s += `\n  Cách cục: ${r.cachCuc.map((c) => `${c.ten} — ${c.moTa}`).join(' | ')}`;
    if (r.yNghia.length) s += `\n  Ý nghĩa cổ pháp: ${r.yNghia.slice(0, 8).join(' | ')}`;
    return s;
  };

  const R = profile.readouts;
  lines.push(block('CUNG MỆNH', R.menh, 'cốt cách, tính khí gốc'));
  lines.push(block(`CUNG THÂN (đóng tại ${profile.thanCungName})`, R.than, 'con người ở nửa sau cuộc đời'));
  lines.push(block('CUNG QUAN LỘC', R.quanLoc, 'đường công danh, chức phận'));
  lines.push(block('CUNG TÀI BẠCH', R.taiBach, 'gia cảnh, cách kiếm sống, giàu nghèo'));
  lines.push(block('CUNG PHÚC ĐỨC', R.phucDuc, 'xuất thân, phúc phần tổ tiên, kết cục tinh thần'));
  lines.push(block('CUNG THIÊN DI', R.thienDi, 'không gian sống: kinh thành, biên ải, tha hương hay ở quê'));

  if (profile.napAm) lines.push(`Nạp âm: ${profile.napAm}${profile.cuc ? ` · ${profile.cuc}` : ''}`);
  return lines.join('\n\n');
}
