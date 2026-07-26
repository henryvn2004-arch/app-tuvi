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

/** Bối cảnh MẶC ĐỊNH khi client không truyền gì.
 *
 * Henry bỏ nút cho người dùng chọn ("mày tự chọn được rồi") nên server chốt
 * một bối cảnh. Chọn Trung Hoa cổ vì hai lý do:
 *   1. Đúng với định vị của tool. Cả trang giải thích rằng từ vựng gốc của Tử
 *      Vi là từ vựng triều đình phong kiến Trung Hoa, và tool "trả lá số về
 *      đúng bối cảnh cổ thư viết ra nó" — cổ thư đó là sách Trung Hoa. Đặt mặc
 *      định sang Việt Nam thì lập luận của chính trang bị lung lay.
 *   2. Model gen ảnh cổ trang Trung Hoa tốt hơn hẳn, và vì đã chốt KHÔNG ghì
 *      trang phục Việt nên hai bối cảnh vốn cho ra ảnh gần giống nhau.
 *
 * `viet-nam` vẫn giữ nguyên trong ERAS và route vẫn nhận tham số `era`, nên
 * đổi mặc định chỉ là sửa đúng dòng dưới đây — không phải dựng lại gì. */
const DEFAULT_ERA: EraId = 'trung-hoa';

export function resolveEra(id?: string): Era {
  return ERAS[(id as EraId) in ERAS ? (id as EraId) : DEFAULT_ERA];
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
      titleNam: 'Vương gia nhiếp chính', titleNu: 'Trưởng công chúa nhiếp sự', domain: 'quyen',
      desc: 'Người đứng ở hàng cao nhất trong triều, quen ra lệnh hơn là nhận lệnh.',
      attireEn: 'an imperial court robe of deep purple and crimson silk with gold-thread embroidery, a jade-inlaid belt and a tall ceremonial headdress',
      source: 'Tân Biên 8.1: "công danh hiển hách, phú quý song toàn"',
    },
    giua: {
      titleNam: 'Quan viên ngoại coi phủ đệ', titleNu: 'Mệnh phụ quản gia nghiệp', domain: 'quyen',
      desc: 'Người có danh phận và gia sản, cai quản một phủ đệ hơn là cai quản thiên hạ.',
      attireEn: 'a well-made but restrained silk robe of deep indigo with modest embroidery and a plain jade ornament',
      source: 'Tân Biên 8.1: đơn thủ tại Tý — "bình thường"',
    },
    thap: {
      titleNam: 'Tông thất sa sút', titleNu: 'Con nhà quyền quý sa cơ', domain: 'quyen',
      desc: 'Người mang dòng dõi cao quý nhưng thời thế đã đổi, giữ được cốt cách mà không giữ được vị thế.',
      attireEn: 'a once-fine silk robe now faded and carefully mended, an old jade pendant kept from better days',
      source: 'Tân Biên 8.1: Tham đồng cung — "công danh rực rỡ tất sinh tai họa"',
    },
  },
  'Thiên Phủ': {
    cao: {
      titleNam: 'Quan coi quốc khố', titleNu: 'Nữ quan coi kho nội phủ', domain: 'quyen',
      desc: 'Người nắm kho tàng và tiền lương của triều đình — chức không hào nhoáng nhưng ai cũng phải qua tay.',
      attireEn: 'a senior official’s robe of deep indigo silk with silver-thread trim, a jade belt and a black gauze official’s cap',
      source: 'Tân Biên 8.7: Vũ đồng cung — "chức vụ thuộc về tài chánh hay kinh tế"',
    },
    giua: {
      titleNam: 'Chủ hiệu buôn lớn', titleNu: 'Bà chủ hiệu tơ lụa', domain: 'thuong',
      desc: 'Người gây dựng cơ nghiệp bằng buôn bán, tính toán chắc tay, của cải bền vững.',
      attireEn: 'a prosperous merchant’s layered robe of good brown and bronze silk with a wide sash and a money-pouch at the waist',
      source: 'Tân Biên 8.7: "thành công trong việc kinh doanh buôn bán"',
    },
    thap: {
      titleNam: 'Người quản kho thuê', titleNu: 'Người coi sổ sách cho chủ hiệu', domain: 'thuong',
      desc: 'Người giữ của cho kẻ khác, cẩn thận tỉ mỉ cả đời mà kho ấy chưa từng là của mình.',
      attireEn: 'a plain dark cotton work robe with rolled sleeves, an ink-stained sash and a bundle of tally slips',
      source: 'Tân Biên 8.7: "có danh chức cũng chỉ trong một thời gian ngắn"',
    },
  },
  'Thiên Cơ': {
    cao: {
      titleNam: 'Quân sư tham mưu', titleNu: 'Nữ mưu sĩ trong phủ', domain: 'van',
      desc: 'Người bày mưu định kế sau lưng chủ soái — không cầm quân nhưng quyết định thắng bại.',
      attireEn: 'a slate-blue scholar’s robe with wide sleeves and a fine cloth headband, holding a closed folding fan',
      source: 'Tân Biên 8.6: "chuyên việc tham mưu, tất có chức vị lớn lao"',
    },
    giua: {
      titleNam: 'Thợ cả chế tác máy móc', titleNu: 'Bà mụ đỡ đẻ có tiếng', domain: 'nghe',
      desc: 'Người sống bằng đôi tay khéo và cái đầu tính toán, được cả vùng tìm đến khi có việc khó.',
      attireEn: 'a practical hemp work robe with sleeves tied back, a leather tool apron and finely made implements at the belt',
      source: 'Tân Biên 8.6: "nên chuyên về kỹ nghệ, máy móc"; 8.23: Cơ-Nguyệt gặp Tả Hữu — "đàn bà hay làm nghề cô đỡ"',
    },
    thap: {
      titleNam: 'Thầy bói dạo', titleNu: 'Bà xem quẻ ngoài chợ', domain: 'tu',
      desc: 'Người thông minh nhanh trí nhưng nay đây mai đó, sống bằng lời đoán và lòng tin của người qua đường.',
      attireEn: 'a worn grey travelling robe, a shoulder bag of bamboo slips and a small cloth banner rolled up',
      source: 'Tân Biên 8.6: "công danh muộn màng và chật vật"',
    },
  },
  'Thái Dương': {
    cao: {
      titleNam: 'Thượng thư', titleNu: 'Nữ quan chưởng ấn', domain: 'van',
      desc: 'Người đứng giữa công đường, tiếng nói vang xa, danh tiếng rạng rỡ mà cũng chói mắt kẻ khác.',
      attireEn: 'a bright vermilion court official’s robe with a gold-embroidered rank badge and a black gauze official’s cap',
      source: 'Tân Biên 8.5: "công danh sớm đạt, văn võ kiêm toàn"',
    },
    giua: {
      titleNam: 'Quan hình luật cấp phủ', titleNu: 'Bà giáo dạy chữ trong phủ', domain: 'van',
      desc: 'Người cầm cân nảy mực hoặc cầm sách dạy người ở một vùng, có uy tín trong phạm vi của mình.',
      attireEn: 'a dignified dark red robe of plain silk with a simple sash and a scholar’s cap, carrying a bound register',
      source: 'Tân Biên 8.5: Cự đồng tại Dần — "nên chuyên về hình luật"; Lương đồng tại Mão — "y dược, sư phạm"',
    },
    thap: {
      titleNam: 'Kẻ sĩ không gặp thời', titleNu: 'Người đàn bà có học sống ẩn dật', domain: 'van',
      desc: 'Người có tài thật nhưng cả đời không gặp cơ hội thi thố, giữ chữ nghĩa cho riêng mình.',
      attireEn: 'a plain undyed hemp scholar’s robe, worn thin at the cuffs, a modest cloth headband and a single old book',
      source: 'Tân Biên 8.5: "có tài nhưng không gặp cơ hội thi thố, suốt đời hậm hực"',
    },
  },
  'Thái Âm': {
    cao: {
      titleNam: 'Quan nội đình coi văn thư', titleNu: 'Thượng cung nữ quan', domain: 'van',
      desc: 'Người lo việc bên trong, giấy tờ sổ sách, tính toán thầm lặng — ít ai thấy mặt nhưng thiếu thì rối loạn.',
      attireEn: 'a soft pale silver-blue silk robe with delicate embroidery, understated and refined, with a fine hairpin',
      source: 'Tân Biên 8.8: Đồng đồng cung tại Tý — "công danh hiển hách, có tài can gián người trên"',
    },
    giua: {
      titleNam: 'Chủ điền trang', titleNu: 'Bà chủ xưởng dệt', domain: 'thuong',
      desc: 'Người trông coi ruộng vườn hoặc khung cửi, cơ nghiệp lặng lẽ mà đủ đầy.',
      attireEn: 'a comfortable robe of soft undyed silk and pale blue cotton, sleeves tied for work, a bundle of keys at the sash',
      source: 'Tân Biên 8.8: Đồng đồng cung tại Ngọ — "nên chuyên về kỹ nghệ hay doanh thương"',
    },
    thap: {
      titleNam: 'Thư lại chép thuê', titleNu: 'Người dệt vải thuê', domain: 'nghe',
      desc: 'Người cần mẫn với công việc tỉ mỉ dưới đèn, làm cho người khác và sống bằng đồng công ít ỏi.',
      attireEn: 'a simple pale cotton robe, sleeves bound with cord, ink or thread staining the fingers',
      source: 'Tân Biên 8.8: "lúc thiếu thời lật đật vất vả"',
    },
  },
  'Vũ Khúc': {
    cao: {
      titleNam: 'Tổng binh coi lương thảo', titleNu: 'Nữ quan coi quân nhu', domain: 'vo',
      desc: 'Người vừa cầm quân vừa cầm tiền — cứng rắn, thực tế, quyết đoán trong cả trận mạc lẫn tính toán.',
      attireEn: 'dark lamellar armor over a deep-toned robe, a broad leather belt with metal fittings, disciplined and functional',
      source: 'Tân Biên 8.4: "võ nghiệp hiển đạt"; Phủ đồng cung — "chức vụ thuộc về tài chánh hay kinh tế"',
    },
    giua: {
      titleNam: 'Chủ hiệu vàng bạc', titleNu: 'Bà chủ tiệm cầm đồ', domain: 'thuong',
      desc: 'Người buôn bán vật quý, mắt tinh tay chắc, nói ít mà chốt giá không ai cãi được.',
      attireEn: 'a solid dark merchant’s robe with metal-clasped belt, a small brass scale and a locked box within reach',
      source: 'Tân Biên 8.4: "chuyên về doanh thương cũng có nhiều tài lộc"',
    },
    thap: {
      titleNam: 'Thợ rèn', titleNu: 'Người bán đồ sắt ngoài chợ', domain: 'nghe',
      desc: 'Người sống bằng kim khí và sức vóc, tay chai vì lửa, ngay thẳng và ít lời.',
      attireEn: 'a coarse dark work tunic with a heavy leather apron, forearms bared, soot marking the cloth',
      source: 'Tân Biên 8.4: Phá đồng cung — "xuất thân bằng võ nghiệp, nhưng rất chật vật"',
    },
  },
  'Thiên Đồng': {
    cao: {
      titleNam: 'Thái y viện sứ', titleNu: 'Nữ y trong cung', domain: 'y',
      desc: 'Người đứng đầu việc chữa bệnh chốn cung đình, tay nghề được cả triều tin cậy.',
      attireEn: 'a refined pale robe of fine cream silk with subtle medical insignia, a lacquered medicine case at hand',
      source: 'Tân Biên 8.3: Lương đồng cung — "rất nổi tiếng nếu chuyên về y khoa hay sư phạm"',
    },
    giua: {
      titleNam: 'Thầy lang mở tiệm thuốc', titleNu: 'Bà lang bốc thuốc', domain: 'y',
      desc: 'Người chữa bệnh cứu người trong vùng, sống hiền hòa, hưởng phúc lành hơn là tranh đoạt.',
      attireEn: 'a simple cream and soft-brown physician’s robe of clean coarse fabric, with a cloth medicine satchel',
      source: 'Tân Biên 8.3: "nên chuyên về thương mại hay kỹ nghệ"; Lương đồng — y khoa',
    },
    thap: {
      titleNam: 'Người hái thuốc rong', titleNu: 'Bà bán thuốc dạo', domain: 'y',
      desc: 'Người đi khắp nơi tìm cây thuốc, hay chán việc và ưa dịch chuyển, không chốn nào giữ chân được lâu.',
      attireEn: 'a weathered travelling robe of undyed hemp, a large woven basket of herbs on the back, straw sandals',
      source: 'Tân Biên 8.3: "làm việc hay chóng chán, thích di chuyển, nên làm công việc lưu động"',
    },
  },
  'Liêm Trinh': {
    cao: {
      titleNam: 'Quan án hình bộ', titleNu: 'Nữ quan coi hình luật hậu cung', domain: 'quyen',
      desc: 'Người coi việc xét xử và luật lệ — nghiêm khắc, không dễ lay chuyển, và vì thế dễ chuốc oán.',
      attireEn: 'a severe black judicial robe with crimson trim and a dark rank insignia, a stiff black official’s cap',
      source: 'Tân Biên 8.2: "võ nghiệp hiển đạt, kiêm nhiếp cả việc chính trị, được nhiều người kính nể"',
    },
    giua: {
      titleNam: 'Chủ xưởng thủ công', titleNu: 'Bà chủ lò gốm', domain: 'nghe',
      desc: 'Người gây dựng nghề bằng kỷ luật và tay nghề, quản người chặt, làm ra sản phẩm có tiếng.',
      attireEn: 'a sturdy dark work robe with sleeves tied back, clay or dye marking the hem, a craftsman’s tools nearby',
      source: 'Tân Biên 8.2: Phá đồng cung — "nên chuyên về kỹ nghệ, hay thương mại"',
    },
    thap: {
      titleNam: 'Lính canh ngục', titleNu: 'Nữ lại coi việc canh giữ', domain: 'quyen',
      desc: 'Người giữ kỷ luật ở nơi ít ai muốn đến, ngày qua ngày đối diện với phần khắc nghiệt của luật lệ.',
      attireEn: 'a plain dark uniform robe with a simple leather belt and a ring of heavy keys, austere and worn',
      source: 'Tân Biên 8.2: Tham đồng cung — "thường gặp nhiều trở ngại, tai ương, nhất là hình ngục"',
    },
  },
  'Tham Lang': {
    cao: {
      titleNam: 'Quan coi lễ nhạc', titleNu: 'Nữ quan coi ca vũ trong cung', domain: 'nghe',
      desc: 'Người cai quản phần hoa lệ nhất của triều đình, tài hoa và giỏi giao tế bậc nhất.',
      attireEn: 'an ornate court robe of warm russet and gold silk with elaborate patterning and jade ornaments',
      source: 'Tân Biên 8.23: Tham + Xương/Khúc tại Hợi, Tý — "có danh chức, được nhiều người biết tiếng"',
    },
    giua: {
      titleNam: 'Chủ tửu lâu', titleNu: 'Bà chủ ca quán', domain: 'thuong',
      desc: 'Người quen biết khắp chốn, sống bằng tài khéo và sức hút riêng hơn là bằng chức tước.',
      attireEn: 'a richly colored layered silk robe with a decorative sash and small ornaments, worldly and welcoming',
      source: 'Tân Biên 8.9: "công danh trắc trở nhưng nếu buôn bán lại phát đạt"',
    },
    thap: {
      titleNam: 'Kép hát rong', titleNu: 'Đào nương hát rong', domain: 'nghe',
      desc: 'Người có tài thật, đi hát khắp các bến chợ, được yêu mến một đêm rồi lại lên đường.',
      attireEn: 'a faded but colourful performer’s robe, patched at the sleeves, a simple instrument carried on the back',
      source: 'Tân Biên 8.9: "chức vị nhỏ thấp, thăng giáng thất thường"',
    },
  },
  'Cự Môn': {
    cao: {
      titleNam: 'Trạng sư nơi công đường', titleNu: 'Nữ quan biện sự', domain: 'van',
      desc: 'Người sống bằng lời nói — biện luận sắc bén, xét đoán rành mạch, đứng được giữa chốn tranh tụng.',
      attireEn: 'a dark charcoal formal robe with a plain sash and a scholar’s cap, holding a bamboo scroll',
      source: 'Tân Biên 8.10: Nhật đồng cung tại Dần — "công danh hiển hách. Nên chuyên về hình luật"',
    },
    giua: {
      titleNam: 'Thầy đồ làng', titleNu: 'Bà giáo dạy nữ công', domain: 'van',
      desc: 'Người dạy chữ dạy nghề cho cả vùng, được kính trọng, nhưng cái miệng thẳng cũng hay gây chuyện.',
      attireEn: 'a plain dark blue teacher’s robe, well-worn, with an ink stone and brushes on the desk beside',
      source: 'Tân Biên 8.10: "làm thầy giáo cũng nổi tiếng, có nhiều tài năng, nhất là ăn nói"',
    },
    thap: {
      titleNam: 'Người bán hàng rong khéo miệng', titleNu: 'Bà mối', domain: 'thuong',
      desc: 'Người sống bằng tài ăn nói ở chợ búa và cửa nhà người, được việc cho thiên hạ mà mang tiếng thị phi.',
      attireEn: 'a plain everyday robe of coarse cloth with a shoulder pole or cloth bundle, weather-worn and practical',
      source: 'Tân Biên 8.10: "chức vị nhỏ thấp, hay gặp tai ương… thường gặp nhiều chuyện thị phi"',
    },
  },
  'Thiên Tướng': {
    cao: {
      titleNam: 'Tể tướng', titleNu: 'Nữ quan chưởng ấn', domain: 'quyen',
      desc: 'Người phụ tá bậc nhất, giữ ấn tín, thay chủ điều hành — quyền lớn mà không phải là chủ.',
      attireEn: 'a formal minister’s robe of deep teal and gold with a ceremonial seal pouch at the waist and a black gauze cap',
      source: 'Tân Biên 8.11: "công danh nhẹ bước, văn võ kiêm toàn"',
    },
    giua: {
      titleNam: 'Nghệ nhân bậc thầy', titleNu: 'Nữ nghệ nhân thêu ngự dụng', domain: 'nghe',
      desc: 'Người làm ra những thứ tinh xảo mà kẻ khác không làm nổi, danh tiếng nằm ở tay nghề chứ không ở chức tước.',
      attireEn: 'a neat craftsman’s robe of soft grey-green cloth with sleeve guards, fine tools and half-finished work at hand',
      source: 'Tân Biên 8.11: đơn thủ tại Tỵ, Hợi — "nên chuyên về kỹ thuật hay mỹ thuật"',
    },
    thap: {
      titleNam: 'Quản gia phủ đệ', titleNu: 'Người hầu cận thân tín', domain: 'quyen',
      desc: 'Người tin cẩn đứng sau một gia chủ, thu xếp mọi việc trơn tru mà tên tuổi không bao giờ được nhắc.',
      attireEn: 'a tidy dark servant’s robe of good but plain cloth, a modest sash and a set of household keys',
      source: 'Tân Biên 8.11: đơn thủ tại Mão, Dậu — "chức vị nhỏ thấp, thăng giáng thất thường"',
    },
  },
  'Thiên Lương': {
    cao: {
      titleNam: 'Gián quan', titleNu: 'Thái phó dạy hoàng tử', domain: 'van',
      desc: 'Người giữ việc can gián và dạy dỗ bậc trên, nói thẳng điều người ta không muốn nghe.',
      attireEn: 'an elder’s formal robe in muted earth tones with a scholarly bearing, a plain wooden hairpin',
      source: 'Tân Biên 8.12: đơn thủ tại Tý, Ngọ — "phú quý đến tột bực, có danh tiếng lừng lẫy"',
    },
    giua: {
      titleNam: 'Thầy thuốc kiêm dạy học', titleNu: 'Bà lang có tiếng trong vùng', domain: 'y',
      desc: 'Người vừa chữa bệnh vừa dạy người, được cả vùng gọi bằng thầy và tìm đến lúc hoạn nạn.',
      attireEn: 'a calm robe of muted olive and cream, a medicine chest and a stack of books sharing the same table',
      source: 'Tân Biên 8.12: "nên chuyên về y dược hay sư phạm. Buôn bán cũng phát đạt"',
    },
    thap: {
      titleNam: 'Đạo sĩ vân du chữa bệnh', titleNu: 'Ni cô coi am nhỏ', domain: 'tu',
      desc: 'Người rời chốn đông người, đi hoặc ở một mình, cứu giúp lặng lẽ và không màng danh phận.',
      attireEn: 'a simple ash-grey monastic robe, well-worn, a wooden staff or prayer beads, sandals of woven straw',
      source: 'Tân Biên 8.12: đơn thủ tại Tỵ, Hợi — "công danh phú quý như đám mây nổi… nên làm công việc lưu động"',
    },
  },
  'Thất Sát': {
    cao: {
      titleNam: 'Tướng quân trấn ải', titleNu: 'Nữ tướng thống lĩnh thân binh', domain: 'vo',
      desc: 'Người cầm quân giữ ải nơi biên cương — quyết liệt, cô độc, quen sống giữa sinh tử.',
      attireEn: 'battle-worn dark iron armor with a fur-lined cloak over the shoulders, a weathered leather belt, commanding and austere',
      source: 'Tân Biên 8.13: đơn thủ tại Dần, Thân — "thành công trong những việc thật khó khăn… uy quyền lớn lao"',
    },
    giua: {
      titleNam: 'Tiêu sư áp tải hàng', titleNu: 'Chủ hiệu tiêu cục', domain: 'vo',
      desc: 'Người nhận việc nguy hiểm mà kẻ khác từ chối, giữ chữ tín bằng chính tính mạng mình.',
      attireEn: 'practical travelling garb of tough dark cloth with light leather guards, a blade at the hip and a road-worn cloak',
      source: 'Tân Biên 8.13: Liêm đồng cung — "kinh doanh, buôn bán hay chuyên về kỹ nghệ, cũng phát đạt và được yên thân"',
    },
    thap: {
      titleNam: 'Thợ săn nơi rừng sâu', titleNu: 'Người bán thú rừng ngoài chợ', domain: 'vo',
      desc: 'Người gan lì, quen với rừng núi và hiểm nguy, sống bằng sức mình và không nợ ai điều gì.',
      attireEn: 'rugged hunting clothes of hide and coarse cloth, a fur collar, a bow or carrying frame across the back',
      source: 'Tân Biên 8.13: đơn thủ tại Thìn, Tuất — "chẳng được lâu bền, tai ương họa hại thường đi liền với lợi danh"',
    },
  },
  'Phá Quân': {
    cao: {
      titleNam: 'Tiên phong phá trận', titleNu: 'Nữ tướng tiên phong', domain: 'vo',
      desc: 'Người đi đầu mở đường, dám đập bỏ cái cũ, làm nên tên tuổi giữa thời loạn.',
      attireEn: 'light scouting armor of dark leather and metal plates, a travel-worn cloak, rugged and mobile',
      source: 'Tân Biên 8.14: đơn thủ tại Tý, Ngọ — "lập công danh trong thời loạn… có nhiều mưu trí và rất dũng mãnh"',
    },
    giua: {
      titleNam: 'Chủ thuyền buôn đường biển', titleNu: 'Bà chủ bến thuyền', domain: 'thuong',
      desc: 'Người dựng cơ nghiệp trên sóng nước, mấy lần trắng tay rồi lại làm lại từ đầu.',
      attireEn: 'a windworn robe of sturdy indigo cloth with a wide sash, sun-darkened skin, rope and cargo tallies nearby',
      source: 'Tân Biên 8.14: đơn thủ tại Dần, Thân — "nên kinh doanh, buôn bán hay chuyên về kỹ nghệ"',
    },
    thap: {
      titleNam: 'Người khai hoang mở đất', titleNu: 'Người theo đoàn khai hoang', domain: 'vo',
      desc: 'Người bỏ chốn cũ đi mở đất mới, cực nhọc nhưng tự do, đời dựng lại nhiều lần từ hai bàn tay.',
      attireEn: 'hard-wearing work clothes of undyed hemp, a broad conical hat, tools slung across the shoulder, dust on everything',
      source: 'Tân Biên 8.14: đơn thủ tại Dần, Thân — "công danh trắc trở, chức vị nhỏ thấp"',
    },
  },
};

// Fallback khi Quan Lộc và cả cung xung chiếu đều vô chính diệu — rất hiếm.
// Sách (8.45) nói "coi Chính diệu xung chiếu như Chính diệu tọa thủ", nên
// nhánh này chỉ chạy khi cả hai cung đều trống chính tinh.
const DEFAULT_OCCUPATION: Occupation = {
  titleNam: 'Hàn sĩ', titleNu: 'Nữ nhân hàn vi có chí', domain: 'van',
  desc: 'Người có học, có chí, nhưng cả đời không rơi vào một chức phận rõ ràng nào — sống bên lề thời cuộc.',
  attireEn: 'a plain undyed hemp scholar’s robe without rank insignia, simple and worn, a modest cloth headband',
  source: 'Tân Biên 8.45: "Cung Quan Lộc vô Chính diệu… công danh không thể hiển đạt được"',
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
    occupation: computeOccupation(ls, gender),
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
