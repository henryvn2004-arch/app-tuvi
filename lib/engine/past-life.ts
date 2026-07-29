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
import { getPalaceReadout, starElement, type PhuTheReadout } from './portrait';

type Rec = Record<string, unknown>;

interface StarObj {
  ten: string;
  hoa?: string | null;
  nhom?: string;
  brightness?: string;
}


// ── Bối cảnh (era) ──────────────────────────────────────────────────────
// 5 nền văn minh: Trung Hoa · Việt Nam · Nhật Bản · Hàn Quốc · Thái Lan.
//
// KIẾN TRÚC — vì sao KHÔNG viết trang phục riêng cho từng nền:
// Bản 2 nền cũ dùng CHUNG `attireEn` của bảng nghề cho cả Trung Hoa lẫn Việt
// Nam (Henry: "trang phục cổ Việt Nam cũng giống Trung Quốc, không cần ghì").
// Mẹo đó KHÔNG dùng lại được cho Nhật/Hàn/Thái: quan Hàn mặc dallyeongpo đội
// mũ samo, võ tướng Nhật mặc giáp ō-yoroi, quan Thái mặc chong kraben đội mũ
// chóp nhọn — không nền nào có "mũ sa đen" hay "đai ngọc" kiểu Trung Hoa. Giữ
// nguyên chuỗi cũ thì ra người Trung Hoa mặc đồ Trung Hoa đứng trước phông
// Thái, tệ hơn là không làm.
//
// Nhưng viết ma trận 44 chức phận × 5 nền = 220 chuỗi trang phục thì vừa đồ sộ
// vừa dễ sai, mà phần lớn không ai nhìn tới. Nên tách 2 tầng:
//   Tầng 1 — `attireEn` trong bảng nghề viết TRUNG LẬP: tả CẤP BẬC, chất liệu
//            và tinh thần ("a high official's formal court robe…"), không gắn
//            dấu hiệu của nền nào.
//   Tầng 2 — `costumeGrammarEn`/`sceneGrammarEn` dưới đây dạy model cấp bậc đó
//            ăn mặc và sống trong không gian nào ở NỀN NÀY. 5 khối thay cho
//            220 chuỗi.
// Trung Hoa KHÔNG bị đổi output: khối grammar của nó cấp lại đúng những dấu
// hiệu vừa gỡ khỏi bảng nghề (lụa hanfu, mũ sa đen, đai ngọc).
//
// ĐÁNH ĐỔI CÒN LẠI: 44 danh xưng (Tể tướng / Thượng thư / Thái y / Quan án…)
// vẫn dùng CHUNG cho cả 5 nền. Với Trung/Việt/Hàn/Nhật thì đúng (cùng hệ quan
// chế Hán). Với Thái Lan thì KHÔNG chuẩn — Ayutthaya có hệ sakdina riêng. Giữ
// nguyên vì đây là NHÃN TIẾNG VIỆT cho người đọc Việt: "Thái y" đọc ra ngay là
// ngự y trong cung, còn dịch sang chức danh Thái thì không ai hiểu. Bản sắc để
// ẢNH và TRUYỆN gánh.
export type EraId = 'trung-hoa' | 'viet-nam' | 'nhat-ban' | 'han-quoc' | 'thai-lan';

export interface Era {
  id: EraId;
  label: string;
  /** Nhãn THỜI ĐẠI hiện cho người đọc — mô tả được mà không claim lịch sử.
   *  Cố ý KHÔNG dùng tên triều đại có thật (Edo/Joseon/Ayutthaya): người đọc
   *  sẽ đi tra rồi bắt lỗi, và dễ đụng nhân vật lịch sử thật. */
  ageLabel: string;
  /** Câu định vị bối cảnh trong prompt ảnh. */
  settingEn: string;
  /** Nét mặt/chủng tộc cho prompt ảnh. */
  ethnicityEn: string;
  /** Vùng văn hoá — thay chỗ "East Asian" từng hardcode (Thái là Đông Nam Á). */
  regionEn: string;
  /** Truyền thống hội hoạ để quy chiếu — KHÔNG đổi chất liệu vẽ (vẫn painterly
   *  pastel như Henry đã duyệt), chỉ đổi hệ quy chiếu văn hoá. */
  artTraditionEn: string;
  /** Cấp bậc trong bảng nghề ăn mặc thế nào ở nền này. */
  costumeGrammarEn: string;
  /** Kiến trúc/cảnh vật của nền này. */
  sceneGrammarEn: string;
  /** Ràng buộc bối cảnh cho prompt viết truyện. */
  storySetting: string;
  /** Chất liệu văn hoá BẮT BUỘC dùng trong truyện — đây mới là thứ phân biệt
   *  5 nền, chứ không phải cái tên nhân vật. */
  cultureVi: string;
  /** ĐỊA DANH CÓ THẬT để neo câu chuyện. Henry: không có mốc thật thì người
   *  đọc không biết chuyện xảy ra ở đâu, truyện bị trôi. Địa danh là loại mốc
   *  AN TOÀN nhất — sông núi tỉnh thành hầu như không đổi, khó sai. */
  geographyVi: string;
  /** TRIỀU ĐẠI/THỜI KỲ CÓ THẬT khớp với `ageLabel`. Rủi ro cao hơn địa danh
   *  (dễ sai niên đại) nên prompt bắt nói ở mức "thời X", cấm nêu năm cụ thể. */
  periodVi: string;
}

export const ERAS: Record<EraId, Era> = {
  'trung-hoa': {
    id: 'trung-hoa',
    label: 'Trung Hoa cổ',
    ageLabel: 'thời đế chế thống nhất',
    settingEn: 'ancient imperial China',
    ethnicityEn: 'Han Chinese East Asian facial features',
    regionEn: 'East Asian',
    artTraditionEn: 'classical Chinese gongbi ink-and-colour court painting',
    costumeGrammarEn:
      'Render every garment as Chinese imperial dress: officials in wide-sleeved cross-collared silk court robes with a woven square rank badge, a jade-plaque belt and a black gauze futou cap; the highest nobility in richly patterned court robes with jade ornaments; warriors in Chinese lamellar armour with shoulder guards and a war cloak; scholars in cross-collared hanfu with a cloth headband; physicians, merchants and artisans in plain cross-collared hemp or cotton robes with a waist sash; hair grown long and bound in a topknot beneath cap or pin.',
    sceneGrammarEn:
      'Architecture and objects are Chinese: red lacquered timber columns, upturned glazed-tile eaves, wooden lattice windows, bamboo scrolls and ink stones, paved courtyards with old pines.',
    storySetting:
      'Trung Hoa thời phong kiến. Neo vào MỘT triều đại có thật rồi giữ nguyên suốt truyện; nhân vật là người HƯ CẤU sống trong triều đại đó.',
    geographyVi:
      'Trường Giang, Hoàng Hà, Chiết Giang, Giang Nam, Tứ Xuyên, Sơn Đông, Cam Túc, Hà Bắc, Lĩnh Nam, Trường An, Lạc Dương, Khai Phong, Kim Lăng, Tô Châu, Hàng Châu, Đôn Hoàng, Ngọc Môn Quan, Thái Sơn, Tần Lĩnh, Vạn Lý Trường Thành.',
    periodVi:
      'Chọn MỘT triều và MỘT đời vua có thật để neo: nhà Hán (Hán Cao Tổ, Hán Vũ Đế, Hán Quang Vũ Đế) · nhà Đường (Đường Thái Tông, Võ Tắc Thiên, Đường Huyền Tông) · nhà Tống (Tống Thái Tổ, Tống Nhân Tông) · nhà Minh (Minh Thái Tổ, Minh Thành Tổ, Vạn Lịch) · nhà Thanh (Khang Hy, Càn Long).',
    cultureVi:
      'khoa cử và quan trường, biên ải phương bắc, ấm trà và bàn trà, bút lông – nghiên mực – thư pháp, đèn lồng đêm hội, ngựa trạm đưa thư, chợ phiên, rượu hâm.',
  },
  'viet-nam': {
    id: 'viet-nam',
    label: 'Việt Nam cổ',
    ageLabel: 'thời quân chủ phương Nam',
    settingEn: 'pre-modern Đại Việt, an old Vietnamese royal capital',
    ethnicityEn: 'Vietnamese Southeast Asian facial features',
    regionEn: 'East Asian',
    artTraditionEn: 'classical Vietnamese court painting and folk woodblock-print tradition',
    costumeGrammarEn:
      'Render every garment as Vietnamese court and village dress: officials in a cross-collared áo giao lĩnh or áo tấc robe with an embroidered rank panel and a winged mũ cánh chuồn cap; men of standing wearing a khăn vấn wrapped cloth turban; warriors in lamellar or brigandine over a fitted tunic with a sash; commoners and artisans in plain brown or indigo tunics, wide trousers, a woven conical nón hat and bare or sandalled feet; women in layered áo with a long skirt and a wrapped turban.',
    sceneGrammarEn:
      'Architecture and landscape are Vietnamese: dark tiled communal-hall roofs with curved ridges, carved timber posts, bamboo groves and banyan trees, flooded rice terraces, river landings with wooden sampans, a village gate and pond.',
    storySetting:
      'Đại Việt thời phong kiến. Neo vào MỘT triều đại có thật rồi giữ nguyên suốt truyện; nhân vật là người HƯ CẤU sống trong triều đại đó.',
    geographyVi:
      'sông Hồng, sông Mã, sông Lam, sông Đáy, Thăng Long, Phố Hiến, Vân Đồn, Kinh Bắc, Sơn Nam, Hải Dương, Thanh Hóa, Nghệ An, Hoan Châu, ải Chi Lăng, Tam Điệp, Yên Tử, Hoa Lư, Lam Sơn.',
    periodVi:
      'Chọn MỘT triều và MỘT đời vua có thật để neo: nhà Lý (Lý Thái Tổ, Lý Thánh Tông, Lý Nhân Tông) · nhà Trần (Trần Thái Tông, Trần Nhân Tông) · nhà Hồ · nhà Lê sơ (Lê Thái Tổ, Lê Thánh Tông) · thời Lê trung hưng – Trịnh Nguyễn phân tranh · nhà Tây Sơn (Quang Trung) · nhà Nguyễn (Gia Long, Minh Mạng, Tự Đức, Thành Thái).',
    cultureVi:
      'luỹ tre và đình làng, đồng ruộng nước và mùa gặt, sông và đò ngang, chợ quê, chùa làng tiếng chuông chiều, khoa cử chữ Nho, trầu cau, giặc phương bắc tràn xuống.',
  },
  'nhat-ban': {
    id: 'nhat-ban',
    label: 'Nhật Bản cổ',
    ageLabel: 'thời mạc phủ',
    settingEn: 'pre-modern feudal Japan, the domain of a provincial lord',
    ethnicityEn: 'Japanese East Asian facial features',
    regionEn: 'East Asian',
    artTraditionEn: 'classical Japanese nihonga painting with ukiyo-e-influenced portraiture',
    costumeGrammarEn:
      'Render every garment as Japanese dress — NEVER Chinese robes or gauze caps: retainers and officials in a kamishimo with stiff winged shoulders over a kimono, or a wide-sleeved kariginu court robe with a small lacquered eboshi cap; warriors in Japanese lamellar armour of small plates laced with coloured silk cords, a shoulder guard and a crested helmet; scholars, physicians and monks in a plain dark kimono with a haori overcoat, or a monastic kesa; commoners in a short indigo kimono with a narrow sash, straw sandals; men’s hair oiled and tied in a small topknot, women’s hair long, straight and glossy, held by a lacquered pin.',
    sceneGrammarEn:
      'Architecture and landscape are Japanese: a timber castle keep on a fitted stone base with white plaster walls and dark tiled gables, tatami rooms behind sliding shoji paper doors, a raked stone garden, a torii gate, cherry and maple, a wooden bridge over a stream.',
    storySetting:
      'Nhật Bản thời phong kiến, dưới quyền một lãnh chúa. Neo vào MỘT thời kỳ có thật rồi giữ nguyên suốt truyện; nhân vật và phiên trấn của nhân vật là HƯ CẤU, đặt trong thời kỳ đó.',
    geographyVi:
      'Kyoto, Osaka, Edo, Kamakura, Nara, Sakai, đảo Kyushu, đảo Shikoku, vùng Kanto, vùng Kansai, vùng Tohoku, núi Phú Sĩ, hồ Biwa, sông Yodo, eo biển Shimonoseki, đường Tokaido.',
    periodVi:
      'Chọn MỘT thời kỳ và dòng họ/nhân vật cầm quyền có thật để neo: thời Kamakura (mạc phủ Minamoto) · thời Muromachi (mạc phủ Ashikaga) · thời Chiến Quốc – Sengoku (Oda Nobunaga, Toyotomi Hideyoshi) · thời Edo (mạc phủ Tokugawa, Tokugawa Ieyasu).',
    cultureVi:
      'lãnh chúa và phiên trấn, thành gỗ trên nền đá, phòng chiếu tatami sau cửa giấy, trà thất và nghi thức pha trà, thanh kiếm đeo bên hông, hoa anh đào và lá phong đỏ, tiếng chuông chùa, cầu gỗ bắc qua suối.',
  },
  'han-quoc': {
    id: 'han-quoc',
    label: 'Hàn Quốc cổ',
    ageLabel: 'thời các vương triều cổ',
    settingEn: 'pre-modern Korea, an old Korean royal capital',
    ethnicityEn: 'Korean East Asian facial features',
    regionEn: 'East Asian',
    artTraditionEn: 'classical Korean court portraiture with minhwa folk-painting colour',
    costumeGrammarEn:
      'Render every garment as Korean hanbok — NEVER Chinese or Japanese cut: officials in a round-collared dallyeongpo robe with a rank badge on the chest and a black horsehair samo cap with side wings; scholars in a pale wide-sleeved robe with a broad-brimmed black horsehair gat hat; warriors in Korean lamellar with a red-tasselled conical helmet; men in a short jeogori jacket over full baji trousers with a durumagi overcoat; women in a very short jeogori above a high-waisted, wide chima skirt; hair in a topknot held by a manggeon headband, or braided and pinned for women.',
    sceneGrammarEn:
      'Architecture and landscape are Korean: hanok timber halls with brightly painted dancheong beams under deep tiled eaves, paper doors and warm ondol floors, low stone walls, persimmon trees, ridged mountains and a temple on a mountain pass.',
    storySetting:
      'Triều Tiên thời phong kiến. Neo vào MỘT vương triều có thật rồi giữ nguyên suốt truyện; nhân vật là người HƯ CẤU sống trong vương triều đó.',
    geographyVi:
      'Hanyang (nay là Seoul), Kaesong, Pyongyang, Gyeongju, đảo Jeju, sông Hàn, sông Đại Đồng, núi Kumgang, núi Halla, vùng Gyeongsang, vùng Jeolla, vùng Hamgyong, đèo Mungyong.',
    periodVi:
      'Chọn MỘT vương triều và MỘT đời vua có thật để neo: Tân La – Silla (Munmu) · Cao Ly – Goryeo (Taejo Wang Geon, Gongmin) · Triều Tiên – Joseon (Taejo Yi Seong-gye, Sejong Đại đế, Yeongjo, Jeongjo). Chế độ khoa cử có từ thời Goryeo trở đi.',
    cultureVi:
      'khoa cử và bè phái trong triều, nhà hanok sàn sưởi ondol, áo trắng thường phục, nhân sâm và thuốc bắc, đàn gayageum, rượu gạo đục, đèo núi mùa đông dài, chùa trên núi.',
  },
  'thai-lan': {
    id: 'thai-lan',
    label: 'Thái Lan cổ',
    ageLabel: 'thời vương quốc bên sông',
    settingEn: 'a pre-modern Tai kingdom in mainland Southeast Asia',
    ethnicityEn: 'Thai Southeast Asian facial features',
    regionEn: 'Southeast Asian',
    artTraditionEn: 'classical Thai temple mural painting with gold-leaf detailing',
    costumeGrammarEn:
      'Render every garment as Thai court and village dress — NEVER Chinese silk court robes, NEVER gauze or horsehair caps: nobles and officials in a wrapped chong kraben lower garment with a fitted brocade court coat, a jewelled collar, gold armlets and a tall spired ceremonial headdress; lesser officials with a sabai sash draped over one shoulder and a bare or lightly covered chest; warriors in quilted and lacquered armour with a crested helmet; monks in saffron robes; commoners in a simple wrapped cloth with a sabai or short jacket, barefoot; women in a sabai across one shoulder over a wrapped skirt, hair short-cropped or coiled with gold pins.',
    sceneGrammarEn:
      'Architecture and landscape are Thai: a gilded temple with steep multi-tiered roofs and curving naga finials, whitewashed stupas, teak stilt houses above water, a river landing with long slender boats, banana and palm, heavy monsoon light.',
    storySetting:
      'Một vương quốc của người Thái ở lục địa Đông Nam Á, Phật giáo Nam tông là quốc đạo. Neo vào MỘT vương quốc có thật rồi giữ nguyên suốt truyện; nhân vật là người HƯ CẤU sống trong vương quốc đó.',
    geographyVi:
      'sông Chao Phraya, sông Mê Kông, sông Ping, Ayutthaya, Sukhothai, Lopburi, Chiang Mai, Nakhon Si Thammarat, Phitsanulok, cao nguyên Khorat, eo Kra, vịnh Xiêm La, rừng Tenasserim.',
    periodVi:
      'Chọn MỘT vương quốc và MỘT đời vua có thật để neo: Sukhothai (Ramkhamhaeng) · Ayutthaya (Ramathibodi I, Naresuan, Narai) · Lan Na (Mangrai, Tilokkarat) · Thonburi – Rattanakosin (Taksin, Rama I).',
    cultureVi:
      'chùa mái nhọn dát vàng, sư khất thực buổi sớm, voi trong đội quân và trong lễ, chợ họp trên sông, nhà sàn gỗ tếch, mùa mưa và mùa khô rõ rệt, thuyền dài, hoa sen trên ao chùa.',
  },
};

/** Bối cảnh MẶC ĐỊNH khi không suy được từ lá số (chỉ dùng làm lưới an toàn).
 *
 * Trung Hoa cổ vì đúng với định vị của tool: cả trang giải thích rằng từ vựng
 * gốc của Tử Vi là từ vựng triều đình phong kiến, và tool "trả lá số về đúng
 * bối cảnh cổ thư viết ra nó". Cũng là nền model gen ảnh làm tốt nhất. */
const DEFAULT_ERA: EraId = 'trung-hoa';

export const ERA_IDS = Object.keys(ERAS) as EraId[];

export function resolveEra(id?: string): Era {
  return ERAS[(id as EraId) in ERAS ? (id as EraId) : DEFAULT_ERA];
}

/** Chọn nền văn minh TỪ CHÍNH LÁ SỐ — deterministic.
 *
 * Henry đã bỏ nút cho người dùng chọn, mà giữ mặc định Trung Hoa thì 4 nền kia
 * không ai thấy. Nay bốc theo hash lá số: cùng một lá số LUÔN ra cùng một nền
 * (sinh lại không đổi người, không đổi thế giới), lá số khác nhau thì trải đều
 * 5 nền — nhóm bạn cùng bấm ra 5 nền khác nhau, tự nhiên có chuyện để so.
 *
 * CỐ Ý KHÔNG suy từ ngũ hành mệnh. Nghe thì hợp lý (5 hành ↔ 5 nền) nhưng
 * tương ứng ngũ hành – phương vị chỉ cho ra NHÓM (Nhật/Hàn cùng phương Đông,
 * Việt/Thái cùng phương Nam), không phải 1-1. Ép thành 1-1 rồi gọi là cổ pháp
 * là bịa một quy tắc không có trong sách.
 *
 * Salt 'era|' để chỉ số nền độc lập với chỉ số bốc tên nhân vật (cùng seed gốc
 * nhưng khác nhánh) — không thì tên và nền dính chặt vào nhau. */
export function pickEraForLaso(ls: Laso, gender: 'nam' | 'nu'): Era {
  const seed = 'era|' + [ls.canChiNam, ls.menhDC, ls.thanDC, ls.napAm, ls.cuc, gender].join('|');
  return ERAS[ERA_IDS[stableHash(seed) % ERA_IDS.length]];
}

// ── Chính tinh × TẦNG → chức phận thời xưa ──────────────────────────────
// Nguồn: chương "CUNG QUAN LỘC" trong *Tử Vi Đẩu Số Tân Biên* (Vân Đằng Thái
// Thứ Lang) — đã có sẵn trong RAG của site (`tuvi_docs`, source
// `[TÂN BIÊN][CUNG QUAN LỘC]`, mục 8.1–8.45).
//
// VÌ SAO CHIA 3 TẦNG: bản đầu map 1 chính tinh → 1 chức phận, kết quả là 11/14
// chức phận đều là quan/tướng trong triều đình (Henry test prod và bắt được).
// Nguyên nhân: cổ thư mô tả mỗi sao ở trạng thái ĐẮC Ý NHẤT, mà trong xã hội
// phong kiến đắc ý = làm quan; lấy nguyên tầng đó làm mặc định cho cả 14 sao
// thì ra một triều đình toàn quan.
//
// Đọc kỹ chương Quan Lộc thì chính sách đã chia sẵn 3 tầng, lặp đi lặp lại:
//   • "công danh hiển hách / phú quý song toàn / uy quyền hiển hách"  → CAO
//   • "nên chuyên về doanh thương, kỹ nghệ, y dược, sư phạm"          → GIỮA
//   • "chức vị nhỏ thấp / trắc trở / an thường thủ phận"              → THẤP
// Ba tầng dưới đây là ba tầng của sách, module chỉ đặt tên nhân vật cho mỗi ô.
//
// `title` cố ý là DANH TỪ NGẮN để người dùng kể lại được ("tao kiếp trước làm
// Tể tướng") — xem thêm ghi chú ở bản trước.
//
// NÂNG THANG BẬC (Henry, vòng sau): "user thường thích nghe những thứ hơi
// shocked, ngạc nhiên, thì mới viral được… giờ đang đọc thầy thuốc này, chủ
// tiệm vải này, nghe tầm tầm không catchy. Upgrade position nhưng vẫn giữ
// nguyên tính chất các sao, các cung."
// → Cả 42 chức phận nâng 1–2 bậc VỀ QUY MÔ, giữ nguyên DOMAIN và bản chất
//   sao: Vũ Khúc vẫn là tiền + võ (chủ hiệu vàng bạc → cự phú buôn vàng bạc
//   khắp mấy châu), Thiên Đồng vẫn là y (thầy lang → ngự y trưởng / đại danh
//   y), Cự Môn vẫn là khẩu thiệt (trạng sư → ngự sử đại phu).
// TITLE PHẢI NGẮN (Henry chốt tiếp): title là DANH XƯNG, đọc xong nhớ được để
//   kể lại — "Đại đô đốc", "Ngự sử đại phu", "Cự phú". Râu ria ("nắm binh
//   quyền và quân lương", "tiếng nói vang cả triều") dồn hết vào `desc`, KHÔNG
//   nhét vào title. Bản đầu tao viết title dài, vừa khó nhớ vừa nghe như đang
//   cố khoe.
// QUAN TRỌNG: chỉ DỊCH CẢ THANG lên, KHÔNG nén khoảng cách giữa 3 tầng — tầng
// thấp vẫn phải đọc ra là lận đận so với tầng cao của CÙNG sao. Nén lại thì
// điểm cung Quan Lộc mất hết ý nghĩa, mọi lá số ra na ná nhau, và mất luôn
// khả năng nói "chức phận này chỉ rơi vào X% lá số". Đo lại sau khi nâng:
// cao/giữa/thấp = 24/52/24% trên 552 lá số, 79 chức phận khác nhau xuất hiện,
// cái phổ biến nhất 4,2% — độ trải giữ nguyên.
//
// Tầng THẤP đã được LÀM DỊU theo yêu cầu Henry: sách ghi thẳng có "hạng tham
// quan ô lại" (Tham Lang tại Tý/Ngọ) và nghề đao phủ/mổ thịt, nhưng người trả
// tiền đọc xong thấy mình kiếp trước làm những nghề đó thì cụt hứng. Tầng thấp
// nay là "lận đận / bên lề" chứ không phải "xấu xa".
export type OccTier = 'cao' | 'giua' | 'thap';

export interface Occupation {
  /** Danh xưng theo giới tính — ngắn, cụ thể, kể lại được. */
  titleNam: string;
  titleNu: string;
  /** Nhóm nghề — dùng chọn bối cảnh nền cho ảnh. */
  domain: 'vo' | 'van' | 'quyen' | 'thuong' | 'y' | 'nghe' | 'tu';
  /** 1 câu chức phận, để LLM bám khi viết truyện. */
  desc: string;
  /** Trang phục + đạo cụ (tiếng Anh) cho prompt ảnh. */
  attireEn: string;
  /** Trích dẫn Tân Biên làm căn cứ — hiện ở khối "Cơ Sở Trong Lá Số". */
  source: string;
}

const OCCUPATION_TABLE: Record<string, Record<OccTier, Occupation>> = {
  'Tử Vi': {
    cao: {
      titleNam: 'Phiên vương', titleNu: 'Công chúa nhiếp chính', domain: 'quyen',
      desc: 'Người được ban đất phong, cai quản cả một vùng như tiểu quốc riêng — trên chỉ có vua, dưới là muôn dân trong cõi ấy.',
      attireEn:
        'a princely court robe of deep purple and crimson silk with gold-thread dragon-rank embroidery, a jewelled ceremonial belt and a tall coronet of rank',
      source: 'Tân Biên 8.1: "công danh hiển hách, phú quý song toàn"',
    },
    giua: {
      titleNam: 'Tổng trấn', titleNu: 'Mệnh phụ phu nhân', domain: 'quyen',
      desc: 'Người thay triều đình cai quản cả một vùng rộng — quyền uy trong tay, nhưng vẫn phải ngoái nhìn về kinh đô.',
      attireEn:
        'a provincial governor’s formal robe of deep indigo silk with rank embroidery, a jewelled belt of office and a tall cap of authority',
      source: 'Tân Biên 8.1: đơn thủ tại Tý — "bình thường"',
    },
    thap: {
      titleNam: 'Vương tôn thất thế', titleNu: 'Quận chúa sa cơ', domain: 'quyen',
      desc: 'Người mang dòng máu quý tộc và cốt cách bề trên, nhưng thời thế đã đổi — phong ấp mất, chỉ còn lại cái danh và khí chất.',
      attireEn:
        'a once-magnificent court robe now faded and carefully mended, an old pendant of rank kept from better days',
      source: 'Tân Biên 8.1: Tham đồng cung — "công danh rực rỡ tất sinh tai họa"',
    },
  },
  'Thiên Phủ': {
    cao: {
      titleNam: 'Thượng thư bộ Hộ', titleNu: 'Nữ quan chưởng khố', domain: 'quyen',
      desc: 'Người nắm toàn bộ tiền lương thuế má của cả nước — không hào nhoáng, nhưng mọi việc lớn đều phải qua tay.',
      attireEn:
        'a senior minister’s robe of deep indigo silk with silver-thread trim, a belt of office and the formal rank headwear of his post',
      source: 'Tân Biên 8.7: Vũ đồng cung — "chức vụ thuộc về tài chánh hay kinh tế"',
    },
    giua: {
      titleNam: 'Đại thương gia', titleNu: 'Chủ thương hội tơ lụa', domain: 'thuong',
      desc: 'Người gây dựng cả một mạng lưới buôn bán, tính toán chắc tay, của cải bền vững qua nhiều đời.',
      attireEn:
        'a wealthy merchant-prince’s layered robe of fine brown and bronze silk with a broad embroidered sash and a heavy seal at the waist',
      source: 'Tân Biên 8.7: "thành công trong việc kinh doanh buôn bán"',
    },
    thap: {
      titleNam: 'Quản sự kho lẫm', titleNu: 'Nữ quản sự thương hội', domain: 'thuong',
      desc: 'Người giữ của cho kẻ khác, cẩn thận tỉ mỉ cả đời — kho ấy đầy ắp mà chưa từng là của mình.',
      attireEn:
        'a neat dark work robe of good cloth with rolled sleeves, an ink-stained sash and a bundle of tally slips',
      source: 'Tân Biên 8.7: "có danh chức cũng chỉ trong một thời gian ngắn"',
    },
  },
  'Thiên Cơ': {
    cao: {
      titleNam: 'Quốc sư', titleNu: 'Nữ quân sư', domain: 'van',
      desc: 'Người bày mưu định kế sau lưng bậc chí tôn — không cầm quân, nhưng quyết định thắng bại của cả cuộc chiến.',
      attireEn:
        'a slate-blue scholar-strategist’s robe with wide sleeves and a fine embroidered headband, holding a closed fan',
      source: 'Tân Biên 8.6: "chuyên việc tham mưu, tất có chức vị lớn lao"',
    },
    giua: {
      titleNam: 'Tông sư chế tác', titleNu: 'Nữ danh sư nghề đỡ', domain: 'nghe',
      desc: 'Người sống bằng đôi tay khéo và cái đầu tính toán, chế ra những cơ quan khí giới mà kẻ khác không làm nổi — cả vùng có việc khó là tìm tới, triều đình cũng từng vời.',
      attireEn:
        'a fine hemp master-craftsman’s robe with sleeves tied back, a leather tool apron and precisely made implements at the belt',
      source: 'Tân Biên 8.6: "nên chuyên về kỹ nghệ, máy móc"; 8.23: Cơ-Nguyệt gặp Tả Hữu — "đàn bà hay làm nghề cô đỡ"',
    },
    thap: {
      titleNam: 'Thuật sĩ đoán mệnh', titleNu: 'Nữ thuật sĩ bói quẻ', domain: 'tu',
      desc: 'Người thông minh nhanh trí, sống bằng lời đoán và lòng tin của thiên hạ — nay đây mai đó, không chốn nào giữ chân được lâu.',
      attireEn:
        'a travelling robe of good grey cloth, a shoulder bag of divination slips and a small cloth banner',
      source: 'Tân Biên 8.6: "công danh muộn màng và chật vật"',
    },
  },
  'Thái Dương': {
    cao: {
      titleNam: 'Thượng thư đầu triều', titleNu: 'Nữ thượng thư', domain: 'van',
      desc: 'Người đứng giữa công đường, tiếng nói vang xa khắp thiên hạ — danh tiếng rạng rỡ mà cũng chói mắt kẻ khác.',
      attireEn:
        'a bright vermilion court official’s robe with a gold-embroidered rank badge and the formal rank headwear of high office',
      source: 'Tân Biên 8.5: "công danh sớm đạt, văn võ kiêm toàn"',
    },
    giua: {
      titleNam: 'Tri phủ', titleNu: 'Nữ sư phó vương phủ', domain: 'van',
      desc: 'Người cầm cân nảy mực hoặc cầm sách dạy người ở cả một vùng — uy tín đủ để một lời nói ra là có người nghe theo.',
      attireEn:
        'a dignified dark red robe of plain silk with an embroidered rank panel and a scholar’s headwear, carrying a bound register',
      source: 'Tân Biên 8.5: Cự đồng tại Dần — "nên chuyên về hình luật"; Lương đồng tại Mão — "y dược, sư phạm"',
    },
    thap: {
      titleNam: 'Danh sĩ lỡ vận', titleNu: 'Nữ sĩ ẩn danh', domain: 'van',
      desc: 'Người có tài thật, danh tiếng cũng có, nhưng cả đời không gặp cơ hội thi thố — giữ chữ nghĩa cho riêng mình.',
      attireEn:
        'a plain undyed scholar’s robe worn thin at the cuffs, a modest cloth headband and a single well-read book',
      source: 'Tân Biên 8.5: "có tài nhưng không gặp cơ hội thi thố, suốt đời hậm hực"',
    },
  },
  'Thái Âm': {
    cao: {
      titleNam: 'Quan chưởng cơ mật', titleNu: 'Thượng cung', domain: 'van',
      desc: 'Người lo việc bên trong — giấy tờ cơ mật, sổ sách, tính toán thầm lặng. Ít ai thấy mặt, nhưng thiếu thì cả cung rối loạn.',
      attireEn:
        'a soft pale silver-blue silk robe with delicate rank embroidery, understated and refined, with a fine hairpin of office',
      source: 'Tân Biên 8.8: Đồng đồng cung tại Tý — "công danh hiển hách, có tài can gián người trên"',
    },
    giua: {
      titleNam: 'Đại điền chủ', titleNu: 'Chủ xưởng dệt ngự dụng', domain: 'thuong',
      desc: 'Người trông coi ruộng vườn thẳng cánh cò bay, hoặc khung cửi dệt hàng tiến cung — cơ nghiệp lặng lẽ mà nuôi được cả một vùng.',
      attireEn:
        'a comfortable robe of soft undyed silk and pale blue cotton with a fine sash, sleeves tied for work, a bundle of keys at the waist',
      source: 'Tân Biên 8.8: Đồng đồng cung tại Ngọ — "nên chuyên về kỹ nghệ hay doanh thương"',
    },
    thap: {
      titleNam: 'Thư lại phủ quan', titleNu: 'Nghệ nhân dệt gấm', domain: 'nghe',
      desc: 'Người cần mẫn với công việc tỉ mỉ dưới đèn — làm cho người khác, tay nghề được trọng mà tên tuổi thì không.',
      attireEn:
        'a simple pale robe of good cotton, sleeves bound with cord, ink or fine thread staining the fingers',
      source: 'Tân Biên 8.8: "lúc thiếu thời lật đật vất vả"',
    },
  },
  'Vũ Khúc': {
    cao: {
      titleNam: 'Đại đô đốc', titleNu: 'Nữ tướng coi quân nhu', domain: 'vo',
      desc: 'Người vừa cầm quân vừa cầm tiền — cứng rắn, thực tế, quyết đoán trong cả trận mạc lẫn sổ sách.',
      attireEn:
        'dark plated commander’s armour over a deep-toned robe, a broad leather belt with metal fittings and a commander’s sash',
      source: 'Tân Biên 8.4: "võ nghiệp hiển đạt"; Phủ đồng cung — "chức vụ thuộc về tài chánh hay kinh tế"',
    },
    giua: {
      titleNam: 'Cự phú', titleNu: 'Nữ cự phú kim hoàn', domain: 'thuong',
      desc: 'Người buôn vàng bạc châu báu khắp mấy châu — mắt tinh tay chắc, nói ít, mà giá đã chốt thì không ai cãi được.',
      attireEn:
        'a solid rich merchant’s robe of dark fine cloth with a metal-clasped belt, a small brass scale and a locked strongbox within reach',
      source: 'Tân Biên 8.4: "chuyên về doanh thương cũng có nhiều tài lộc"',
    },
    thap: {
      titleNam: 'Chủ lò rèn binh khí', titleNu: 'Chủ hiệu kim khí', domain: 'nghe',
      desc: 'Người sống bằng kim khí và sức vóc, tay chai vì lửa — ngay thẳng, ít lời, nhưng hàng làm ra thì quân đội cũng phải dùng.',
      attireEn:
        'a sturdy dark work robe with a heavy leather apron, forearms bared, soot marking the cloth, fine finished blades on the rack behind',
      source: 'Tân Biên 8.4: Phá đồng cung — "xuất thân bằng võ nghiệp, nhưng rất chật vật"',
    },
  },
  'Thiên Đồng': {
    cao: {
      titleNam: 'Ngự y trưởng', titleNu: 'Nữ ngự y', domain: 'y',
      desc: 'Người đứng đầu việc chữa bệnh chốn cung đình — tay nghề được cả hoàng tộc đặt tính mạng vào.',
      attireEn:
        'a refined pale robe of fine cream silk with subtle rank insignia of the imperial medical office, a lacquered medicine case at hand',
      source: 'Tân Biên 8.3: Lương đồng cung — "rất nổi tiếng nếu chuyên về y khoa hay sư phạm"',
    },
    giua: {
      titleNam: 'Đại danh y', titleNu: 'Nữ danh y', domain: 'y',
      desc: 'Người chữa bệnh cứu người có tiếng khắp vùng, sống hiền hòa — hưởng phúc lành hơn là tranh đoạt.',
      attireEn:
        'a well-made cream and soft-brown physician’s robe of clean fine fabric, with an embroidered medicine satchel',
      source: 'Tân Biên 8.3: "nên chuyên về thương mại hay kỹ nghệ"; Lương đồng — y khoa',
    },
    thap: {
      titleNam: 'Lương y ẩn cư', titleNu: 'Nữ lương y vân du', domain: 'y',
      desc: 'Người đi khắp nơi tìm cây thuốc, ưa dịch chuyển hơn ưa danh phận — nhưng ai bệnh nặng thì vẫn lặn lội tìm tới tận nơi.',
      attireEn:
        'a weathered travelling robe of good undyed hemp, a large woven basket of rare herbs on the back, straw sandals',
      source: 'Tân Biên 8.3: "làm việc hay chóng chán, thích di chuyển, nên làm công việc lưu động"',
    },
  },
  'Liêm Trinh': {
    cao: {
      titleNam: 'Thượng thư bộ Hình', titleNu: 'Nữ quan chưởng hình', domain: 'quyen',
      desc: 'Người đứng đầu việc xét xử và luật lệ cả nước — nghiêm khắc, không dễ lay chuyển, và vì thế chuốc oán không ít.',
      attireEn:
        'a severe black judicial robe with crimson trim and a high rank insignia, severe formal rank headwear',
      source: 'Tân Biên 8.2: "võ nghiệp hiển đạt, kiêm nhiếp cả việc chính trị, được nhiều người kính nể"',
    },
    giua: {
      titleNam: 'Chủ xưởng ngự dụng', titleNu: 'Chủ lò gốm ngự dụng', domain: 'nghe',
      desc: 'Người gây dựng nghề bằng kỷ luật và tay nghề — quản người chặt, sản phẩm làm ra tiến được vào cung.',
      attireEn:
        'a sturdy dark master’s robe with sleeves tied back, clay or dye marking the hem, fine finished wares on the shelf behind',
      source: 'Tân Biên 8.2: Phá đồng cung — "nên chuyên về kỹ nghệ, hay thương mại"',
    },
    thap: {
      titleNam: 'Đô úy coi ngục', titleNu: 'Nữ quan coi ngục', domain: 'quyen',
      desc: 'Người giữ kỷ luật ở ngục thất kinh thành, nơi ít ai muốn đến — ngày qua ngày đối diện với phần khắc nghiệt nhất của luật lệ.',
      attireEn:
        'a dark uniform robe of office with a leather belt of rank and a ring of heavy keys, austere and worn',
      source: 'Tân Biên 8.2: Tham đồng cung — "thường gặp nhiều trở ngại, tai ương, nhất là hình ngục"',
    },
  },
  'Tham Lang': {
    cao: {
      titleNam: 'Quan chưởng lễ nhạc', titleNu: 'Nữ quan chưởng ca vũ', domain: 'nghe',
      desc: 'Người cai quản phần hoa lệ nhất của triều đình — tài hoa và giỏi giao tế bậc nhất thiên hạ.',
      attireEn:
        'an ornate court robe of warm russet and gold silk with elaborate patterning and precious ornaments',
      source: 'Tân Biên 8.23: Tham + Xương/Khúc tại Hợi, Tý — "có danh chức, được nhiều người biết tiếng"',
    },
    giua: {
      titleNam: 'Chủ đệ nhất tửu lâu', titleNu: 'Chủ đệ nhất ca lâu', domain: 'thuong',
      desc: 'Người quen biết khắp chốn, từ quan lại tới thương nhân — sống bằng tài khéo và sức hút riêng hơn là bằng chức tước.',
      attireEn:
        'a richly colored layered silk robe with a decorative sash and fine small ornaments, worldly and welcoming',
      source: 'Tân Biên 8.9: "công danh trắc trở nhưng nếu buôn bán lại phát đạt"',
    },
    thap: {
      titleNam: 'Danh kép', titleNu: 'Đào nương nức tiếng', domain: 'nghe',
      desc: 'Người có tài thật, đi hát khắp các phủ đệ và bến chợ, phủ nào cũng tranh nhau mời — được yêu mến một đêm rồi lại lên đường.',
      attireEn:
        'a colourful performer’s robe of good cloth, a little worn at the sleeves, a fine instrument carried on the back',
      source: 'Tân Biên 8.9: "chức vị nhỏ thấp, thăng giáng thất thường"',
    },
  },
  'Cự Môn': {
    cao: {
      titleNam: 'Ngự sử đại phu', titleNu: 'Nữ quan biện sự', domain: 'van',
      desc: 'Người sống bằng lời nói — biện luận sắc bén, đàn hặc cả bậc quyền quý, đứng được giữa chốn tranh tụng khốc liệt nhất.',
      attireEn:
        'a dark charcoal formal censor’s robe with an embroidered rank panel and a scholar’s headwear, holding a rolled memorial',
      source: 'Tân Biên 8.10: Nhật đồng cung tại Dần — "công danh hiển hách. Nên chuyên về hình luật"',
    },
    giua: {
      titleNam: 'Đại nho mở trường', titleNu: 'Nữ sư dạy lễ nghi', domain: 'van',
      desc: 'Người dạy chữ dạy nghề cho cả một vùng, được kính trọng — nhưng cái miệng thẳng cũng hay gây chuyện.',
      attireEn:
        'a dark blue master-teacher’s robe of good cloth, with writing implements and a stack of manuscripts on the desk beside',
      source: 'Tân Biên 8.10: "làm thầy giáo cũng nổi tiếng, có nhiều tài năng, nhất là ăn nói"',
    },
    thap: {
      titleNam: 'Tay môi giới lão luyện', titleNu: 'Bà mối mát tay', domain: 'thuong',
      desc: 'Người sống bằng tài ăn nói, việc khó mấy cũng dàn xếp được — được việc cho thiên hạ mà mang tiếng thị phi.',
      attireEn:
        'a practical everyday robe of good coarse cloth with a shoulder bag, weather-worn and quick-eyed',
      source: 'Tân Biên 8.10: "chức vị nhỏ thấp, hay gặp tai ương… thường gặp nhiều chuyện thị phi"',
    },
  },
  'Thiên Tướng': {
    cao: {
      titleNam: 'Tể tướng', titleNu: 'Nữ quan chưởng ấn', domain: 'quyen',
      desc: 'Người phụ tá bậc nhất, giữ ấn tín, thay chủ điều hành cả bộ máy — quyền lớn mà không phải là chủ.',
      attireEn:
        'a formal chancellor’s robe of deep teal and gold with a ceremonial seal pouch at the waist and the formal rank headwear of high office',
      source: 'Tân Biên 8.11: "công danh nhẹ bước, văn võ kiêm toàn"',
    },
    giua: {
      titleNam: 'Tông sư ngự dụng', titleNu: 'Tông sư thêu ngự dụng', domain: 'nghe',
      desc: 'Người làm ra những thứ tinh xảo mà kẻ khác không làm nổi, tác phẩm tiến cống vào cung — danh tiếng nằm ở tay nghề chứ không ở chức tước.',
      attireEn:
        'a fine craftsman-master’s robe of soft grey-green silk with sleeve guards, exquisite tools and half-finished work at hand',
      source: 'Tân Biên 8.11: đơn thủ tại Tỵ, Hợi — "nên chuyên về kỹ thuật hay mỹ thuật"',
    },
    thap: {
      titleNam: 'Tổng quản đại phủ', titleNu: 'Nữ tổng quản nội phủ', domain: 'quyen',
      desc: 'Người tin cẩn đứng sau một gia chủ quyền thế, thu xếp mọi việc trơn tru — mà tên tuổi không bao giờ được nhắc.',
      attireEn:
        'a tidy dark steward’s robe of good cloth with a sash of office and a set of household keys',
      source: 'Tân Biên 8.11: đơn thủ tại Mão, Dậu — "chức vị nhỏ thấp, thăng giáng thất thường"',
    },
  },
  'Thiên Lương': {
    cao: {
      titleNam: 'Thái phó', titleNu: 'Nữ thái phó', domain: 'van',
      desc: 'Người giữ việc can gián và dạy dỗ bậc chí tôn, thầy của cả hoàng đế — nói thẳng điều mà cả triều không ai dám mở miệng.',
      attireEn:
        'an elder tutor’s formal robe in muted earth tones with a rank panel, scholarly bearing, a plain wooden hairpin',
      source: 'Tân Biên 8.12: đơn thủ tại Tý, Ngọ — "phú quý đến tột bực, có danh tiếng lừng lẫy"',
    },
    giua: {
      titleNam: 'Danh y kiêm đại nho', titleNu: 'Nữ danh y kiêm đại nho', domain: 'y',
      desc: 'Người vừa chữa bệnh vừa dạy người — cả vùng gọi bằng thầy và tìm đến lúc hoạn nạn.',
      attireEn:
        'a calm robe of muted olive and cream of good cloth, a medicine chest and a stack of books sharing the same table',
      source: 'Tân Biên 8.12: "nên chuyên về y dược hay sư phạm. Buôn bán cũng phát đạt"',
    },
    thap: {
      titleNam: 'Cao nhân ẩn dật', titleNu: 'Sư bà trụ trì', domain: 'tu',
      desc: 'Người rời chốn đông người, cứu giúp lặng lẽ và không màng danh phận — nhưng tiếng lành đồn xa, người vẫn lặn lội tìm tới.',
      attireEn:
        'a simple well-worn monastic robe, a wooden staff and prayer beads, sandals of woven straw',
      source: 'Tân Biên 8.12: đơn thủ tại Tỵ, Hợi — "công danh phú quý như đám mây nổi… nên làm công việc lưu động"',
    },
  },
  'Thất Sát': {
    cao: {
      titleNam: 'Đại tướng quân trấn ải', titleNu: 'Nữ đại tướng quân', domain: 'vo',
      desc: 'Người cầm đại quân giữ cả một dải biên cương — quyết liệt, cô độc, quen sống giữa sinh tử.',
      attireEn:
        'battle-worn dark commander’s armour with a heavy weathered cloak over the shoulders, a general’s sash, commanding and austere',
      source: 'Tân Biên 8.13: đơn thủ tại Dần, Thân — "thành công trong những việc thật khó khăn… uy quyền lớn lao"',
    },
    giua: {
      titleNam: 'Đại đương gia tiêu cục', titleNu: 'Nữ đương gia tiêu cục', domain: 'vo',
      desc: 'Người nhận những chuyến hàng nguy hiểm mà kẻ khác từ chối — giữ chữ tín bằng chính tính mạng mình và cả cơ nghiệp.',
      attireEn:
        'well-made travelling garb of tough dark cloth with leather guards, a fine blade at the hip and a road-worn cloak',
      source: 'Tân Biên 8.13: Liêm đồng cung — "kinh doanh, buôn bán hay chuyên về kỹ nghệ, cũng phát đạt và được yên thân"',
    },
    thap: {
      titleNam: 'Thủ lĩnh phường săn', titleNu: 'Nữ thủ lĩnh phường săn', domain: 'vo',
      desc: 'Người gan lì, quen với rừng núi và hiểm nguy — sống bằng sức mình, cầm đầu một toán người và không nợ ai điều gì.',
      attireEn:
        'rugged hunting clothes of hide and stout cloth, a fur collar, a good bow or carrying frame across the back',
      source: 'Tân Biên 8.13: đơn thủ tại Thìn, Tuất — "chẳng được lâu bền, tai ương họa hại thường đi liền với lợi danh"',
    },
  },
  'Phá Quân': {
    cao: {
      titleNam: 'Tiên phong đại tướng', titleNu: 'Nữ tiên phong đại tướng', domain: 'vo',
      desc: 'Người đi đầu mở đường, dám đập bỏ cái cũ — làm nên tên tuổi giữa thời loạn bằng chính lưỡi dao của mình.',
      attireEn:
        'light commander’s scouting armor of dark leather and metal plates, a travel-worn officer’s cloak, rugged and mobile',
      source: 'Tân Biên 8.14: đơn thủ tại Tý, Ngọ — "lập công danh trong thời loạn… có nhiều mưu trí và rất dũng mãnh"',
    },
    giua: {
      titleNam: 'Chủ đội thương thuyền', titleNu: 'Nữ chủ đội thương thuyền', domain: 'thuong',
      desc: 'Người dựng cơ nghiệp trên sóng nước, cầm cả một đội thuyền — mấy lần trắng tay rồi lại làm lại từ đầu.',
      attireEn:
        'a windworn robe of sturdy fine indigo cloth with a wide sash, sun-darkened skin, rope and cargo tallies nearby',
      source: 'Tân Biên 8.14: đơn thủ tại Dần, Thân — "nên kinh doanh, buôn bán hay chuyên về kỹ nghệ"',
    },
    thap: {
      titleNam: 'Thủ lĩnh khai hoang', titleNu: 'Nữ thủ lĩnh khai hoang', domain: 'vo',
      desc: 'Người bỏ chốn cũ đi mở đất mới, dẫn theo cả một đoàn người — cực nhọc nhưng tự do, đời dựng lại nhiều lần từ hai bàn tay.',
      attireEn:
        'hard-wearing work clothes of undyed hemp, a broad conical hat, tools slung across the shoulder, dust on everything',
      source: 'Tân Biên 8.14: đơn thủ tại Dần, Thân — "công danh trắc trở, chức vị nhỏ thấp"',
    },
  },
};

// Fallback khi Quan Lộc và cả cung xung chiếu đều vô chính diệu — rất hiếm.
// Sách (8.45) nói "coi Chính diệu xung chiếu như Chính diệu tọa thủ", nên
// nhánh này chỉ chạy khi cả hai cung đều trống chính tinh.
const DEFAULT_OCCUPATION: Occupation = {
  titleNam: 'Danh sĩ ẩn thế', titleNu: 'Nữ sĩ ẩn thế', domain: 'van',
  desc: 'Người có học, có chí, tiếng tăm cũng có, nhưng cả đời không rơi vào một chức phận rõ ràng nào — đứng ngoài thời cuộc mà nhìn vào.',
  attireEn: 'a plain undyed hemp scholar’s robe without rank insignia, simple and worn, a modest cloth headband',
  source: 'Tân Biên 8.45: "Cung Quan Lộc vô Chính diệu… công danh không thể hiển đạt được"',
};

// Bối cảnh nền cho ảnh, theo nhóm nghề.
const DOMAIN_BACKDROP: Record<Occupation['domain'], string> = {
  vo: 'a windswept frontier fortress rampart at dawn, distant banners and mountains softly blurred behind',
  van: 'a quiet study with wooden shelves of manuscripts and scrolls, soft light through a carved window screen',
  quyen: 'a grand palace hall with tall carved timber columns and hanging ceremonial banners, softly blurred',
  thuong: 'a prosperous old trading street with wooden storefronts and hanging lanterns, softly blurred',
  y: 'an apothecary room with rows of small wooden medicine drawers and hanging dried herbs, warm and calm',
  nghe: 'a lantern-lit artisan quarter at dusk, silk banners and warm scattered lights softly blurred',
  tu: 'a mountain temple courtyard in morning mist, old stone steps and ancient trees softly blurred',
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
// Pool tên tách theo BỐI CẢNH — mỗi nền một bộ.
//
// GHI CHÚ VỀ POOL THÁI: người Thái KHÔNG có họ cho tới đạo luật năm 1913, nên
// cấu trúc "họ + tên" áp vào bối cảnh cổ là sai lịch sử. Nhưng cấu trúc 2 slot
// dùng chung cho cả 5 nền, và tên một chữ trơ trọi thì đọc như biệt danh chứ
// không như tên người. Nên slot đầu ở đây KHÔNG phải họ mà là một yếu tố tên
// gốc Phạn/Pali thường gặp trong tên Thái — ghép lại vẫn đọc ra Thái mà không
// khẳng định một dòng họ nào có thật.
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
  // Họ Nhật: tránh các dòng họ gắn chặt lịch sử (Tokugawa, Oda, Toyotomi,
  // Minamoto, Taira, Takeda, Date) — chọn họ phổ thông, không gợi ai cả.
  'nhat-ban': {
    ho: ['Kurata', 'Ishikawa', 'Sagara', 'Nishimura', 'Katsura', 'Morikawa', 'Takeuchi', 'Hoshino', 'Yagi', 'Shimizu', 'Kanzaki', 'Ono'],
    nam: ['Hidemasa', 'Ryosuke', 'Takahiro', 'Nobuharu', 'Masaki', 'Tsuneo', 'Yorihisa', 'Sadatoshi'],
    nu: ['Ayame', 'Chiyo', 'Sanae', 'Mitsuko', 'Kaede', 'Sumire', 'Yaeko', 'Nobuko'],
  },
  // Họ Hàn: kho họ Triều Tiên vốn chỉ vài chục chữ và ai cũng mang, nên dùng
  // họ thật là chuyện thường — không chỉ đích danh ai. Tên đệm-tên chọn kiểu
  // Hán-Hàn hai âm tiết cho hợp bối cảnh cổ.
  'han-quoc': {
    ho: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Yoon', 'Han', 'Seo', 'Song', 'Nam', 'Hwang', 'Ryu'],
    nam: ['Seon-ho', 'Jae-mun', 'Byung-ju', 'Do-hyeon', 'Sang-yeol', 'Tae-heon', 'Min-seok', 'Yeong-jun'],
    nu: ['Seo-yeon', 'Ji-hwa', 'Eun-bi', 'Hye-rin', 'Yun-seo', 'Da-eun', 'Mi-ok', 'So-hui'],
  },
  // Thái: xem ghi chú trên — slot đầu là yếu tố tên gốc Phạn/Pali, KHÔNG phải
  // họ. Tránh Rama / Naresuan / Chakri (vương triều và nhân vật có thật).
  'thai-lan': {
    ho: ['Suriya', 'Kanok', 'Mani', 'Inthra', 'Thep', 'Sawat', 'Bunma', 'Wichai', 'Ratana', 'Somphong', 'Chaiya', 'Nakhon'],
    nam: ['Prasit', 'Narong', 'Kasem', 'Anan', 'Thawee', 'Decha', 'Sunthon', 'Boonchu'],
    nu: ['Ampha', 'Sunan', 'Chanthra', 'Malai', 'Wanida', 'Pimchan', 'Duangjai', 'Sarocha'],
  },
};

/** Hash ổn định (không dùng Math.random — cùng lá số phải ra cùng tên). */
export function stableHash(seed: string): number {
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

// ── Chọn chính tinh chủ + chấm TẦNG cho cung Quan Lộc ───────────────────
// Henry chốt cách làm: KHÔNG chỉ nhìn độ sáng, mà đọc cả KHỐI DỮ LIỆU cung
// Quan (chỉ phần dữ liệu, không cần tới phần luận giải văn xuôi) — vì Thất Sát
// hãm gặp Tuần/Triệt, hoặc gặp Hóa Khoa/Quyền/Lộc, thì đã bớt hãm, không còn
// là tầng thấp nữa. Mỗi yếu tố dưới đây đều có mục riêng trong chương Quan Lộc
// của Tân Biên (8.15–8.22), nên thang điểm bám sách chứ không phải tự chế.

/** Ngũ hành tương SINH: hành X sinh cho SINH_MAP[X]. */
const SINH_MAP: Record<string, string> = {
  Kim: 'Thủy', 'Thủy': 'Mộc', 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim',
};

const BRIGHTNESS_SCORE: Record<string, number> = {
  'Miếu': 2, 'Vượng': 2, 'Đắc': 1, 'Bình': 0, 'Hãm': -2,
};
const HOA_SCORE: Record<string, number> = { 'Quyền': 2, 'Khoa': 1, 'Lộc': 1, 'Kỵ': -2 };
const CAT_TINH_SETS = [
  ['Văn Xương', 'Văn Khúc'],
  ['Thiên Khôi', 'Thiên Việt'],
  ['Tả Phù', 'Hữu Bật'],
  ['Lộc Tồn'],
];
const SAT_TINH = new Set(['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp']);

/**
 * Chọn chính tinh CHỦ của cung Quan Lộc. Khi cung có 2 chính tinh (Tử Phủ, Cơ
 * Nguyệt, Vũ Tướng…), luật do Henry chốt: ưu tiên sao CÙNG HÀNH với mệnh, kế
 * đến sao có hành SINH cho hành mệnh (vd Vũ Khúc hành Kim — hợp mệnh Kim, hoặc
 * sinh cho mệnh Thủy); hết cả hai thì lấy sao sáng hơn.
 */
function pickQuanMajor(p: Rec | undefined, menhHanh: string): StarObj | null {
  const majors = palaceStarObjs(p, true).filter((s) => OCCUPATION_TABLE[s.ten]);
  if (!majors.length) return null;
  if (majors.length === 1) return majors[0];

  if (menhHanh) {
    const same = majors.find((s) => starElement(s.ten) === menhHanh);
    if (same) return same;
    const sinh = majors.find((s) => SINH_MAP[starElement(s.ten)] === menhHanh);
    if (sinh) return sinh;
  }
  let best = majors[0];
  for (const s of majors) {
    if ((BRIGHTNESS_SCORE[s.brightness || ''] ?? 0) > (BRIGHTNESS_SCORE[best.brightness || ''] ?? 0)) best = s;
  }
  return best;
}

export interface TierScore {
  score: number;
  tier: OccTier;
  /** Từng khoản cộng/trừ — hiện ở khối "Cơ Sở Trong Lá Số" cho minh bạch. */
  breakdown: string[];
}

/** Chấm tầng chức phận từ khối dữ liệu cung Quan Lộc. */
function scoreQuanTier(ls: Laso, quan: Rec | undefined, lead: StarObj | null): TierScore {
  const breakdown: string[] = [];
  let score = 0;
  const add = (n: number, why: string) => {
    if (!n) return;
    score += n;
    breakdown.push(`${n > 0 ? '+' : ''}${n} ${why}`);
  };

  const bright = lead?.brightness || '';
  add(BRIGHTNESS_SCORE[bright] ?? 0, `${lead?.ten || 'chính tinh'}${bright ? ` ${bright}` : ''}`);

  const stars = palaceStarObjs(quan);
  for (const s of stars) {
    if (s.hoa && HOA_SCORE[s.hoa] != null) add(HOA_SCORE[s.hoa], `${s.ten} hóa ${s.hoa}`);
  }

  // Tuần/Triệt: gặp sao HÃM thì bớt hãm (+1), gặp sao MIẾU/VƯỢNG thì phá cách
  // tốt (−1) — đúng ý "Tuần/Triệt làm bớt hãm" Henry nêu, và khớp 8.45 (vô
  // chính diệu có Tuần/Triệt án ngữ thì "sau vẫn hiển đạt").
  const hasTuanTriet = stars.some((s) => s.nhom === 'tuan_triet');
  if (hasTuanTriet) {
    if (bright === 'Hãm') add(1, 'Tuần/Triệt án ngữ (giải hãm)');
    else if (bright === 'Miếu' || bright === 'Vượng') add(-1, 'Tuần/Triệt án ngữ (phá cách tốt)');
  }

  const names = new Set(stars.map((s) => s.ten));
  for (const set of CAT_TINH_SETS) {
    const hit = set.filter((n) => names.has(n));
    if (hit.length) add(1, hit.join('/'));
  }
  const sat = stars.filter((s) => SAT_TINH.has(s.ten)).map((s) => s.ten);
  if (sat.length) add(-sat.length, sat.join('/'));

  for (const c of getPalaceReadout(ls, 'Quan Lộc').cachCuc) {
    const loai = String(c.loai || '').toLowerCase();
    if (loai === 'quy_cuc' || loai === 'phu_cuc' || loai === 'tốt') add(2, `cách ${c.ten}`);
    else if (loai === 'ban_tien_cuc' || loai === 'xấu') add(-2, `cách ${c.ten}`);
  }

  const tier: OccTier = score >= TIER_CUTOFF_CAO ? 'cao' : score <= TIER_CUTOFF_THAP ? 'thap' : 'giua';
  return { score, tier, breakdown };
}

// Ngưỡng chia tầng — ĐÃ hiệu chỉnh bằng số liệu thật, không phải đặt cảm tính.
// Chạy 1.872 lá số (1955–2005 × 12 giờ sinh × 2 giới × 3 ngày) rồi quét histogram
// điểm: cặp (cao ≥ 4, thấp ≤ −1) cho phân bố 20% / 56% / 24%, sát mục tiêu
// 20/55/25 đã chốt với Henry. Cặp cũ (3 / −2) cho 34% tầng cao — tức một phần
// ba người dùng đều làm quan lớn, vẫn còn hiện tượng "toàn quan với tướng".
// Để riêng thành hằng số cho dễ chỉnh lại khi bảng nghề đổi.
const TIER_CUTOFF_CAO = 4;
const TIER_CUTOFF_THAP = -1;

const TIER_LABEL: Record<OccTier, string> = {
  cao: 'hiển đạt',
  giua: 'thị dân',
  thap: 'lận đận',
};

export interface OccupationResult extends Occupation {
  /** Danh xưng đã chọn theo giới tính. */
  title: string;
  /** Chính tinh quyết định nghề. */
  star: string;
  brightness?: string;
  tier: OccTier;
  tierLabel: string;
  tierScore: number;
  tierBreakdown: string[];
  /** true nếu Quan Lộc vô chính diệu, phải mượn chính tinh cung xung chiếu. */
  borrowed: boolean;
  /** Sắc thái thêm từ phụ tinh + tứ hóa tại Quan Lộc. */
  notes: string[];
  backdropEn: string;
}

function computeOccupation(ls: Laso, gender: 'nam' | 'nu'): OccupationResult {
  const palaces = (ls.palaces as Rec[]) || [];
  const quan = palaces.find((p) => p.cungName === 'Quan Lộc') as Rec | undefined;
  // Hành của mệnh lấy từ cục (vd "Kim tứ cục" → Kim) — cùng cách portrait.ts dùng.
  const menhHanh = String(ls.cuc || '').trim().split(/\s+/)[0] || '';

  let lead = pickQuanMajor(quan, menhHanh);
  let borrowed = false;
  if (!lead) {
    // 8.45: "coi Chính diệu xung chiếu như Chính diệu tọa thủ".
    lead = pickQuanMajor(quan?.xungChieuCung as Rec | undefined, menhHanh);
    borrowed = !!lead;
  }

  const tierInfo = scoreQuanTier(ls, quan, lead);
  const base = lead ? OCCUPATION_TABLE[lead.ten][tierInfo.tier] : DEFAULT_OCCUPATION;

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
    title: gender === 'nu' ? base.titleNu : base.titleNam,
    star: lead?.ten || '(vô chính diệu)',
    brightness: lead?.brightness,
    tier: tierInfo.tier,
    tierLabel: TIER_LABEL[tierInfo.tier],
    tierScore: tierInfo.score,
    tierBreakdown: tierInfo.breakdown,
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


// ── Quét cách cục CẢ 12 CUNG → các tuyến đời đan vào truyện ──────────────
// Henry đọc bản đầu và chỉ ra truyện "chủ yếu kể về công việc". Đúng: prompt
// chỉ được nạp 5 cung riêng biệt (Mệnh, Quan Lộc, Tài Bạch, Phúc Đức, Thiên
// Di) + cung Thân trùng lên một trong số đó — mà 3 trong 5 cung ấy đều thuộc
// mảng bản thân/công danh/tiền bạc, nên nhân vật chỉ có đời làm việc. Thiếu
// hẳn hôn nhân, con cái, anh em, bạn bè, bệnh tật, nhà cửa, cha mẹ.
//
// Nay quét CẢ 12 CUNG, chấm độ nổi bật theo cách cục đặc biệt mà engine đã
// tính sẵn, rồi lấy các cung có tín hiệu THẬT làm tuyến phụ cho truyện. Cung
// nào lá số không nói gì thì không ép vào — tránh bịa cho đủ mảng.
const CUNG_ROLE: Record<string, string> = {
  'Mệnh': 'cốt cách, tính khí gốc',
  'Phụ Mẫu': 'cha mẹ, bậc bề trên đỡ đầu hoặc đè nén',
  'Phúc Đức': 'xuất thân, phúc phần tổ tiên, đời sống tinh thần',
  'Điền Trạch': 'nhà cửa, ruộng vườn, chốn an cư',
  'Quan Lộc': 'đường công danh, chức phận',
  'Nô Bộc': 'bạn bè, thuộc hạ, kẻ dưới quyền',
  'Thiên Di': 'đi lại, tha hương, chuyện xảy ra khi rời nhà',
  'Tật Ách': 'bệnh tật, thương tích, tai ách mang trên thân',
  'Tài Bạch': 'tiền bạc, của cải, cách kiếm sống',
  'Tử Tức': 'con cái, người nối nghiệp hoặc học trò',
  'Phu Thê': 'hôn nhân, người bạn đời',
  'Huynh Đệ': 'anh em, người cùng vai cùng lứa',
};

export interface LifeThread {
  cung: string;
  /** Tuyến đời mà cung này phụ trách trong truyện. */
  role: string;
  weight: number;
  chinhTinh: string[];
  cachCuc: { ten: string; moTa: string }[];
  yNghia: string[];
}

/** Cách cục "nặng ký" (phán mạnh) đáng để dựng thành tình tiết. */
function cachCucWeight(loai: string): number {
  const l = loai.toLowerCase();
  if (l === 'quy_cuc' || l === 'phu_cuc' || l === 'ban_tien_cuc' || l === 'tốt' || l === 'xấu') return 3;
  return 1;
}

/**
 * Chọn các tuyến đời phụ cho truyện: quét 12 cung, bỏ những cung đã là trụ
 * chính (Mệnh, Quan Lộc — nhân vật và chức phận đã dựng từ đó), chấm điểm theo
 * cách cục đặc biệt + số câu ý nghĩa cổ pháp, lấy các cung nổi bật nhất.
 */
export function computeLifeThreads(ls: Laso, maxThreads = 5): LifeThread[] {
  const CORE = new Set(['Mệnh', 'Quan Lộc']);
  const out: LifeThread[] = [];

  for (const cung of Object.keys(CUNG_ROLE)) {
    if (CORE.has(cung)) continue;
    const r = getPalaceReadout(ls, cung);
    const ccWeight = r.cachCuc.reduce((n, c) => n + cachCucWeight(String(c.loai || '')), 0);
    // Cách cục đặc biệt là tín hiệu mạnh nhất; ý nghĩa cổ pháp chỉ phụ trợ để
    // phân định khi nhiều cung cùng không có cách cục nào.
    const weight = ccWeight * 3 + Math.min(r.yNghia.length, 8) * 0.4;
    if (weight <= 0) continue;
    out.push({
      cung,
      role: CUNG_ROLE[cung],
      weight: Math.round(weight * 10) / 10,
      chinhTinh: r.chinhTinh,
      cachCuc: r.cachCuc.map((c) => ({ ten: c.ten, moTa: c.moTa })),
      yNghia: r.yNghia.slice(0, 6),
    });
  }

  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, maxThreads);
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
  /** Các tuyến đời phụ (hôn nhân, con cái, bạn bè, bệnh tật…) quét từ cách cục
   * cả 12 cung — để truyện không chỉ xoay quanh công việc. */
  threads: LifeThread[];
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
/** `era` bỏ trống → suy từ chính lá số (xem pickEraForLaso). Truyền tay chỉ
 *  dùng khi cần ép một nền cụ thể (test, hoặc dữ liệu lịch sử đã lưu era). */
export function computePastLife(ls: Laso, gender: 'nam' | 'nu', era?: Era): PastLifeProfile {
  era = era || pickEraForLaso(ls, gender);
  const palaces = (ls.palaces as Rec[]) || [];
  const thanP = palaces.find((p) => p.isThan) as Rec | undefined;
  const thanCungName = String(thanP?.cungName || 'Mệnh');

  return {
    gender,
    era,
    characterName: pickCharacterName(ls, gender, era),
    occupation: computeOccupation(ls, gender),
    arc: computeLifeArc(ls),
    threads: computeLifeThreads(ls),
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
    `  • Đại vận ${d.idx}, cung ${d.cungName} (${d.diaChi})` +
      (d.score != null ? ` — điểm vận ${d.score}/10` : ''),
  ];
  if (d.chinhTinh.length) lines.push(`    Chính tinh: ${d.chinhTinh.join(', ')}`);
  if (d.rulesTot.length) lines.push(`    Thuận: ${d.rulesTot.join(' | ')}`);
  if (d.rulesXau.length) lines.push(`    Nghịch: ${d.rulesXau.join(' | ')}`);
  if (d.canhBao.length) lines.push(`    Cảnh báo: ${d.canhBao.join(' | ')}`);
  if (d.yNghia.length) lines.push(`    Luận vận hạn: ${d.yNghia.join(' | ')}`);
  return lines.join('\n');
}

/** Khối "dòng đời 5 hồi" cho prompt viết truyện.
 *
 * CỐ Ý KHÔNG đưa mốc tuổi (ageFrom–ageTo) vào prompt, dù engine có sẵn. Lý do:
 * 9 đại vận × 10 năm bắt đầu từ số cục (2–6) nên nhóm hồi cố định luôn cho ra
 * ĐÚNG MỘT dải tuổi ở MỌI lá số — hồi cuối luôn rơi vào 82–95. Đưa số đó vào
 * prompt thì lá số nào cũng thành chuyện một người sống tới ngoài tám mươi, phi
 * lý với bối cảnh cổ và làm mọi truyện giống nhau ở chỗ dễ thấy nhất. Nhãn giai
 * đoạn (Thiếu thời → Cuối đời) đã đủ để LLM biết thứ tự và chặng đời; tuổi thật
 * vẫn giữ trong engine cho phần tính tuổi vẽ chân dung. */
export function formatArcForLLM(arc: LifeArc): string {
  return arc.acts
    .map(
      (a) =>
        `HỒI ${a.index} — ${a.stage} — ${ROLE_LABEL[a.role]}\n` +
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

  // Các tuyến đời NGOÀI công danh. Sáu block ở trên đều xoay quanh bản thân —
  // công danh — tiền bạc, nên nếu chỉ đưa từng ấy thì truyện dồn hết vào công
  // việc. Khối này quét cách cục cả 12 cung, lấy những cung có tín hiệu mạnh
  // nhất (hôn nhân, con cái, anh em, bạn bè, bệnh tật, nhà cửa, cha mẹ...) để
  // truyện có đời sống chứ không chỉ có sự nghiệp.
  const printed = new Set(['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phúc Đức', 'Thiên Di', profile.thanCungName]);
  if (profile.threads.length) {
    const t = profile.threads
      .map((th) => {
        const seg: string[] = [`• ${th.cung.toUpperCase()} — ${th.role}`];
        if (printed.has(th.cung)) {
          seg.push('  (dữ liệu chi tiết đã ghi ở khối cung phía trên)');
        } else {
          seg.push(`  Sao: ${th.chinhTinh.length ? th.chinhTinh.join(', ') : 'vô chính diệu'}`);
          if (th.yNghia.length) seg.push(`  Ý nghĩa cổ pháp: ${th.yNghia.join(' | ')}`);
        }
        if (th.cachCuc.length)
          seg.push(`  Cách cục đặc biệt: ${th.cachCuc.map((c) => `${c.ten} — ${c.moTa}`).join(' | ')}`);
        return seg.join('\n');
      })
      .join('\n');
    lines.push(
      'CÁC TUYẾN ĐỜI NGOÀI CÔNG DANH (xếp theo mức độ nổi bật trong lá số này — ' +
        'MỖI tuyến phải xuất hiện ít nhất một lần trong 5 hồi):\n' +
        t,
    );
  }

  if (profile.napAm) lines.push(`Nạp âm: ${profile.napAm}${profile.cuc ? ` · ${profile.cuc}` : ''}`);
  return lines.join('\n\n');
}
