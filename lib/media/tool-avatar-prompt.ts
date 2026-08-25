// lib/media/tool-avatar-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH ĐẠI DIỆN cho từng tool bằng gpt-image — line art vàng
// kim trên nền navy, phong cách la bàn phong thủy (Luo Pan). Cùng một khối
// PHONG CÁCH/MÀU/RÀNG BUỘC cho cả bộ (đồng nhất thương hiệu — xem `BRAND_STYLE`
// dưới), chỉ CHỦ ĐỀ trung tâm đổi theo từng tool.
//
// ⚠️ KHÔNG ép mọi tool vào bát quái/Hán tự — cổ pháp NÀO của tool thì hình vẽ
// theo cổ pháp ĐÓ (Tarot dùng lá bài, chiêm tinh Tây dùng vòng hoàng đạo và ký
// hiệu hành tinh, không phải bát quái). Khung ngoài (halo nhiều vòng, tia sáng)
// vẫn đồng nhất cho cả site — chỉ NỘI DUNG trung tâm đổi theo hệ mà tool đó
// dùng. Xem bảng `TOOL_AVATARS` — mỗi dòng là MỘT tool đã tự viết tay theo
// đúng ý nghĩa/mô tả của tool đó, không suy diễn hàng loạt.
// ============================================================

export const BRAND_STYLE = `STYLE:
Minimal, elegant gold line art on a deep navy background — the aesthetic of a premium Chinese/Eastern metaphysics app, in the spirit of high-end Zi Wei Dou Shu (紫微斗數) branding.

COMPOSITION:
- Centered circular composition
- A large multi-layered circular halo inspired by a Luo Pan (feng shui compass) — concentric rings with fine divisions and subtle markings
- Keep the halo rich in detail; keep the central subject simple and elegant
- Strong balance between dense circular detail and empty negative space — do NOT overcrowd the center
- The background fills the ENTIRE square canvas edge to edge with the flat navy gradient described below. Absolutely NO vignette, NO soft circular spotlight fading to black or gray at the corners, NO photographic glow halo around the outside of the composition, NO blur. The four corners of the square are the same crisp navy as the rest of the background, right up to the pixel edge.

LINE STYLE:
- Ultra clean monoline, thin and consistent stroke weight (a 1.5–2px feel)
- Slight weight variation for hierarchy (main lines heavier than fine detail lines)
- No filled solid shapes except small accent marks (stars, dots) — everything else stays outline/line-art

COLOR:
- Line: soft gold (#E6C76B) — every single line in the image, in the halo AND in the central subject, is drawn in this gold. This is a strict rule with NO exceptions for any element.
- Highlight accents: pale gold (#F2E3B3)
- Background: a flat, fully SATURATED deep navy blue, #0B2A45 at the outer edge softly warming to #123A5A near the center — this is a rich navy BLUE, never gray, never black, never desaturated
- The image must read as vivid navy-and-gold at a glance. If you are about to render any part of this image in gray, black-and-white, sepia, or any desaturated/monochrome tone, STOP and use the navy background + gold lines instead — a grayscale or dimmed result is always wrong, regardless of the subject matter.
- No other colors anywhere in the image

MOOD:
Mystical, intelligent, calm, premium. Ancient knowledge rendered with modern minimalism.

STRICT CONSTRAINTS:
- No bright yellow, no neon, no 3D, no shading or gradients inside objects
- No painterly or traditional illustration style, no photorealism
- No overly complex characters or calligraphy blocks, no clutter
- No human facial detail — if a human figure appears, it is a simplified silhouette or profile only, never a rendered face
- No text, no lettering, no logos, no watermark anywhere in the image
- Square format, subject perfectly centered
- Never arrange trigram bars symmetrically around a yin-yang disc (four or eight trigrams evenly spaced around a circular yin-yang center) — that specific layout reads as a national flag, not as a metaphysics motif. A single trigram or hexagram used as its own subject is fine; a full symmetric ring of them around yin-yang is not.

QUALITY TARGET: a luxury astrology app hero illustration / icon — clean enough to sit inside a small rounded avatar frame in a product UI, still reads clearly at 64×64px.`;

export interface ToolAvatarSpec {
  /** tool_id trong bảng tool_pricing — cũng là tên file ảnh (<id>.webp). */
  id: string;
  /** Tên hiển thị, chỉ để ghi chú khi đọc lại prompt — KHÔNG vào ảnh (cấm chữ). */
  label: string;
  /** Một câu: ý nghĩa/mục đích cốt lõi của tool — quyết định chủ đề trung tâm. */
  subject: string;
  /** Hình tượng trung tâm — MỘT hình, đơn giản, đặt giữa halo. */
  core: string;
  /** 2–4 mô-típ phụ rải quanh (chọn đúng cổ pháp của tool, xem hướng dẫn đầu file). */
  elements: string[];
}

/**
 * Bảng 51 tool đang bật (`enabled=true` trong `tool_pricing`, trừ 4 biến thể
 * "thử trực tiếp ảnh" dùng CHUNG avatar với bản phân tích gốc — xem
 * `TRYON_ALIAS` cuối file, vì hai bản chỉ khác input/output chứ không khác
 * Ý NGHĨA cổ pháp). Viết tay từng dòng theo đúng mô tả tool đã duyệt trong
 * `_patches/migration-tool-descriptions.sql`, không suy diễn hàng loạt.
 */
export const TOOL_AVATARS: ToolAvatarSpec[] = [
  // ── Bói Bài ──
  {
    id: 'tarot',
    label: 'Tarot 78 Lá',
    subject: 'Rút một lá bài Tarot, nghe một câu trả lời rõ cho chuyện đang rối.',
    core: 'a single upright tarot card floating at the very center, its face left blank with only a thin decorative border and one small star engraved at its middle — a card about to be read, not a specific named arcana',
    elements: ['small diamond stars (✦) scattered around the card', 'a thin crescent moon arcing above the card', 'faint radial lines like fanned-out cards behind it, barely visible'],
  },
  {
    id: 'oracle',
    label: 'Oracle Phương Đông',
    subject: 'Rút một lá oracle triết lý phương Đông, đọc một lời khuyên tĩnh tâm.',
    core: 'a single rounded oracle card at center bearing one small minimal lotus glyph line-drawn on its face, calm and symmetrical',
    elements: ['a small yin-yang symbol resting just beneath the card', 'thin cloud-motif wisps (祥云) drifting above', 'a few soft stars at the outer edge'],
  },
  {
    id: 'boi-bai-tay',
    label: 'Bói Bài Tây',
    subject: 'Bói bài Tây kiểu dân gian, đoán hướng đi sắp tới.',
    core: 'three playing cards fanned out at center, backs facing the viewer, each back marked only with a small minimal spade outline, no numbers or letters',
    elements: ['a thin crescent moon above the fan of cards', 'small diamond stars scattered around', 'a soft radial glow behind the cards'],
  },
  // ── Chiêm Tinh Tây ──
  {
    id: 'ban-do-sao',
    label: 'Bản Đồ Sao Lúc Sinh',
    subject: 'Dựng bánh xe 12 nhà chiêm tinh Tây đúng khoảnh khắc chào đời.',
    core: 'a Western natal-chart wheel at center — a circle divided into twelve slim house segments by fine radial lines, with a handful of small classical planet glyphs (☉ ☽ ♀ ♂) placed lightly around its rim',
    elements: ['a ring of the twelve zodiac glyphs running just inside the outer halo', 'a small crescent moon and a tiny sun disc facing each other', 'faint constellation dots connected by hair-thin lines in the background'],
  },
  // ── Công Cụ Tử Vi ──
  {
    id: 'an-sao',
    label: 'An Sao Lá Số',
    subject: 'An sao lá số Tử Vi Đẩu Số — dựng 12 cung theo đúng cổ pháp.',
    core: 'a square 12-palace Tử Vi natal chart line-drawn at center (a 4×4 grid with the four inner cells merged into one), one small star glyph resting in the middle palace',
    elements: ['the palace grid ruled in the same soft gold as the halo, so it reads as part of the composition', 'small stars marking a few outer palaces', 'thin radiating lines connecting the chart to the outer halo rings'],
  },
  // ── Đặt Tên & Ngày ──
  {
    id: 'dat-ten-dn',
    label: 'Đặt Tên Doanh Nghiệp',
    subject: 'Đặt tên công ty hợp ngũ hành và tuổi người chủ.',
    core: 'a calligraphy brush at a diagonal, its tip resting on a small blank name-seal square as if just finishing a stroke — the seal left empty, no characters',
    elements: ['a thin ink-stroke flourish curling beside the brush', 'a small five-element ring (five tiny linked shapes: circle, waveform, triangle, square, cross-hatch) tucked at the base', 'faint cloud motifs in the upper halo'],
  },
  {
    id: 'dat-ten-con',
    label: 'Đặt Tên Con',
    subject: 'Đặt tên con hợp ngũ hành của cả cha và mẹ.',
    core: 'a small cradle silhouette at center with a calligraphy brush resting gently above it, tip lowered as if about to write — no visible characters',
    elements: ['a tiny star hovering just above the cradle', 'a thin crescent moon cradling the whole scene from above', 'soft cloud wisps at the outer rim'],
  },
  {
    id: 'chon-ngay-tot',
    label: 'Chọn Ngày Tốt',
    subject: 'Chọn ngày tốt cho cưới hỏi, khai trương, ký hợp đồng.',
    core: 'a simple calendar page at center, a thin grid of small squares with one single square marked by a small gold circle — a chosen good day, no numerals',
    elements: ['a compass needle laid faintly beneath the calendar', 'a few small stars near the marked square', 'thin radial ring divisions echoing the calendar grid outward into the halo'],
  },
  // ── Huyền Học ──
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học',
    subject: 'Đọc con số từ ngày sinh: đường đời, đỉnh cao, năm cá nhân.',
    core: 'a single abstract numeral-like glyph at center built from clean geometric line strokes (not a real digit, an abstract number-symbol), sitting inside a small circle',
    elements: ['a thin ring of small tick marks like a numbered dial running around the halo', 'a few diamond stars', 'faint concentric arcs suggesting cycles radiating outward'],
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch 64 Quẻ',
    subject: 'Gieo một quẻ trong 64 quẻ Kinh Dịch, đọc hào đang động.',
    core: 'a stack of six short horizontal bars at center, one above another like a small ladder — some bars drawn as one solid unbroken line, some drawn as two short line segments with a gap in the middle — one bar subtly emphasized as the moving line. Do NOT surround it with a symmetric ring of trigrams or a yin-yang disc — keep the halo around it made only of plain concentric rings and tick marks, so the whole composition does not resemble any flag or national emblem.',
    elements: ['a thin crescent moon above the hexagram', 'a couple of small diamond stars beside it', 'faint radiating lines linking the hexagram to the outer halo'],
  },
  {
    id: 'mai-hoa',
    label: 'Mai Hoa Dịch Số',
    subject: 'Gieo quẻ bằng số hoặc giờ theo Mai Hoa Dịch Số, đọc Thể và Dụng.',
    core: 'a single plum-blossom branch at center, bare and angular, bearing exactly five small five-petaled blossoms drawn in thin outline',
    elements: ['a tiny two-bar trigram mark tucked beside the branch', 'a thin crescent moon behind the branch', 'a few falling petal marks drifting toward the outer halo'],
  },
  {
    id: 'ky-mon',
    label: 'Kỳ Môn Độn Giáp',
    subject: 'Dựng bàn 9 cung theo giờ hiện tại, chỉ hướng nên đi.',
    core: 'a nine-palace grid (3×3, Lạc Thư style) at center, one thin compass needle laid diagonally across it pointing toward one palace',
    elements: ['tiny directional tick marks at the eight compass points around the grid', 'a faint radiating star burst behind the needle tip', 'thin lines connecting the grid corners to the outer halo'],
  },
  // ── Lịch Số ──
  {
    id: 'hoang-dao',
    label: 'Giờ Hoàng Đạo',
    subject: 'Tra giờ hoàng đạo hôm nay, việc nên làm trong giờ đó.',
    core: 'a minimal sundial at center — a thin vertical gnomon casting a single line-shadow across a shallow arc of twelve fine hour ticks',
    elements: ['a small sun disc at one end of the arc and a crescent moon at the other', 'one hour-tick highlighted with a tiny gold dot', 'faint radiating light lines behind the sundial'],
  },
  {
    id: 'ngay-tot',
    label: 'Ngày Tốt Trong Tháng',
    subject: 'Liệt kê những ngày tốt trong tháng, xếp theo từng ngày.',
    core: 'a calendar month grid at center — six rows of small square cells in thin line, with three or four cells marked by small gold dots scattered through the grid',
    elements: ['a thin crescent moon above the grid marking the lunar month', 'a few tiny stars beside the marked cells', 'the grid corners tapering into radial lines toward the halo'],
  },
  {
    id: 'luc-nham',
    label: 'Lục Nhâm Giản',
    subject: 'Tra một quẻ Lục Nhâm theo giờ và ngày cho việc đang canh cánh.',
    core: 'a small round divination disc (式盤 shì pán) at center — an inner rotating dial with twelve fine branch ticks inside a slightly larger outer ring, offset to suggest it has just been turned',
    elements: ['a thin needle-pointer resting across the disc', 'small stars at the four cardinal points', 'faint concentric rings bridging the disc into the outer halo'],
  },
  // ── Luận Giải ──
  {
    id: 'gio-sinh',
    label: 'Xác Định Giờ Sinh',
    subject: 'Lập 12 lá số theo 12 giờ, thu hẹp dần về đúng giờ sinh.',
    core: 'a thin clock-face ring at center divided into twelve slim hour segments, eleven of them fading toward transparency and exactly one drawn solid and emphasized',
    elements: ['a small hourglass resting at the centre of the ring', 'a few faint tick marks radiating outward from the emphasized hour', 'a thin crescent moon above'],
  },
  {
    id: 'laso',
    label: 'Luận Giải Lá Số',
    subject: 'Đọc trọn 24 phần lá số: cung, đại vận, cách cục, điểm mạnh yếu.',
    core: 'a Tử Vi 12-palace natal chart at center drawn as an open hanging scroll unrolling slightly at the bottom edge, one star glyph glowing softly in its middle palace',
    elements: ['thin scroll-roller caps at the top and bottom edges of the chart', 'small stars scattered across a few outer palaces', 'soft cloud motifs framing the top of the scroll'],
  },
  {
    id: 'chu-trinh-cuoc-doi',
    label: 'Chu Trình Cuộc Đời',
    subject: 'Đọc trọn các giai đoạn một đời người qua lá số.',
    core: 'a circular ring at center divided into a handful of slim arc segments, each holding one tiny abstract silhouette growing taller from one segment to the next — infancy through old age, read clockwise',
    elements: ['a thin spiral line connecting the segments, like a path walked once around the ring', 'a small hourglass resting at the very center', 'faint stars marking the turn between two life stages'],
  },
  {
    id: 'tu-binh',
    label: 'Tử Bình Bát Tự',
    subject: 'Lập bát tự, đọc Nhật Can, Dụng Thần, Cách Cục, Đại Vận.',
    core: 'four slim vertical stelae (石柱) standing side by side at center, each a plain rectangular column in thin outline, of equal height, evenly spaced — the Four Pillars, left bare of any characters',
    elements: ['a small five-element ring (five tiny linked glyphs) resting at the base of the four pillars', 'thin horizontal tick marks partway up each pillar, marking stem and branch', 'faint radiating lines connecting the pillar tops to the outer halo'],
  },
  {
    id: 'van-han-nam',
    label: 'Vận Hạn 12 Tháng Tới',
    subject: 'Xem đúng 12 tháng tới: cung hạn, sao, cách cục của từng tháng.',
    core: 'a thin ring at center divided into twelve slim monthly segments, one segment emphasized with a small gold star sitting inside it',
    elements: ['a faint spiral arrow tracing once around the ring, showing the months in sequence', 'small tick marks at each segment boundary', 'a crescent moon resting above the ring'],
  },
  {
    id: 'chan-dung-tien-kiep',
    label: 'Chân Dung Tiền Kiếp',
    subject: 'Nhận một chân dung và câu chuyện một đời từ lá số.',
    core: 'a simplified robed figure in profile at center, emerging from a soft swirl of cloud motifs as if stepping out of mist, face left as a plain silhouette with no features',
    elements: ['drifting cloud-motif wisps (祥云) wrapping around the lower half of the figure', 'a thin crescent moon behind the figure\'s shoulder', 'a few small stars fading into the mist'],
  },
  {
    id: 'xem-lam-an',
    label: 'Xem Tuổi Làm Ăn',
    subject: 'Chấm yếu tố hợp tác giữa bạn và người sắp làm ăn chung.',
    core: 'two simplified hands in thin outline clasped together in a handshake at center, resting above a small balanced two-pan scale drawn beneath them',
    elements: ['a thin ring of small tick marks around the handshake, like a compass reading a deal', 'a couple of small stars above the clasped hands', 'faint radiating lines linking the scale to the outer halo'],
  },
  {
    id: 'nguoi-khac',
    label: 'Lá Số Người Khác',
    subject: 'Nhận cẩm nang ứng xử với một người cụ thể qua lá số của họ.',
    core: 'a single simplified profile silhouette at center, faceless, with a thin open book shape resting just in front of it as if being read',
    elements: ['a small magnifying-glass line motif hovering near the profile', 'a few soft stars around the figure', 'faint concentric rings framing the profile like a spotlight'],
  },
  {
    id: 'nhan-mach',
    label: 'Sổ Nhân Mạch',
    subject: 'Xem cả đội đang thiếu kiểu người nào, ai với ai dễ va chạm.',
    core: 'a small constellation of five to six tiny dot-figures at center, connected to each other by thin straight lines like a network diagram, one line drawn slightly brighter than the rest',
    elements: ['the network dots echoed as small stars further out in the halo', 'a faint circular boundary loosely containing the whole network', 'thin radial lines tying the outer dots to the halo rings'],
  },
  {
    id: 'cong-so',
    label: 'Tử Vi Công Sở & Hướng Nghiệp',
    subject: 'Đọc kiểu người ở chỗ làm và cả chặng đường sự nghiệp.',
    core: 'a simplified official scholar\'s hat (烏紗帽, two thin wing-flaps extending sideways) resting above a short flight of three ascending steps, both drawn in plain line art at center',
    elements: ['a small compass-needle line resting beside the steps, pointing upward', 'a couple of stars above the hat', 'faint radial lines suggesting a career path ascending toward the halo'],
  },
  {
    id: 'xem-tuoi',
    label: 'Xem Tuổi Vợ Chồng',
    subject: 'Chấm yếu tố tương hợp giữa hai lá số của hai người.',
    core: 'two thin interlocking rings at center, overlapping slightly like a Venn diagram, with a small double-happiness-style knot line drawn in the overlap',
    elements: ['a crescent moon and a small sun disc resting one above each ring', 'a couple of small stars in the overlap area', 'faint radiating lines linking both rings outward to the halo'],
  },
  {
    id: 'chan-dung-vo-chong',
    label: 'Chân Dung Vợ Chồng',
    subject: 'Vẽ chân dung người bạn đời tương lai từ cung Phu Thê.',
    core: 'two simplified profile silhouettes at center facing each other, faceless, standing close beneath one shared thin crescent-moon arc overhead',
    elements: ['a thin red-thread-style line connecting the two silhouettes at the wrist (drawn in the same soft gold, not red)', 'small stars framing the pair', 'soft cloud motifs at the base'],
  },
  {
    id: 'duyen-no-tien-kiep',
    label: 'Duyên Nợ Tiền Kiếp',
    subject: 'Ghép hai lá số, tìm mối duyên kiếp trước giữa hai người.',
    core: 'two faceless profile silhouettes at center standing apart, connected across the gap by one single thin thread that loops loosely between them — the Nguyệt Lão red-thread motif, drawn in soft gold',
    elements: ['a large soft crescent moon behind both figures, referencing Nguyệt Lão (the Old Man Under the Moon)', 'a few small stars along the thread', 'drifting cloud motifs at the base'],
  },
  {
    id: 'xem-tuoi-sinh-con',
    label: 'Xem Tuổi Sinh Con',
    subject: 'Tra năm sinh con hợp địa chi của cả bố và mẹ.',
    core: 'a small cradle silhouette at center resting inside a thin ring marked with twelve fine earthly-branch ticks, one tick emphasized in gold',
    elements: ['a tiny star hovering above the cradle', 'a crescent moon arcing over the whole ring', 'soft cloud wisps framing the base'],
  },
  {
    id: 'day-con',
    label: 'Dạy Con Theo Lá Số',
    subject: 'Đọc con tiếp thu kiểu nào, kỷ luật nào phản tác dụng.',
    core: 'two faceless silhouettes at center of different heights, a taller one and a smaller one, standing close with one thin guiding line arcing from the taller figure\'s hand toward a small star ahead of the smaller one',
    elements: ['a soft crescent moon above the pair', 'a couple of small stars along the guiding line', 'faint cloud motifs at the base'],
  },
  {
    id: 'huong-nghiep-tre',
    label: 'Hướng Nghiệp Sớm Cho Con',
    subject: 'Gợi ý hoạt động nên cho con làm quen theo lứa tuổi.',
    core: 'one small faceless child silhouette at center standing at a fork where three thin paths diverge, each path ending in a tiny plain icon (a book, a brush, a gear) far ahead',
    elements: ['a small compass needle resting beneath the child\'s feet, pointing along the paths', 'a couple of stars above the diverging paths', 'faint radial lines tying the paths outward to the halo'],
  },
  // ── Mệnh Lý ──
  {
    id: 'nap-am',
    label: 'Nạp Âm Ngũ Hành',
    subject: 'Tra mệnh nạp âm, hành, màu và hướng hợp theo năm sinh.',
    core: 'a ring of five small linked glyphs at center — a plain circle (Kim), a slim branch (Mộc), a wave line (Thủy), a flame outline (Hỏa), a square (Thổ) — arranged evenly around one shared midpoint, one glyph subtly emphasized',
    elements: ['thin connecting lines linking each of the five glyphs to its neighbours, forming the generating cycle', 'a couple of small stars near the emphasized glyph', 'faint radial lines tying the ring outward to the halo'],
  },
  {
    id: 'ngu-hanh-ten',
    label: 'Ngũ Hành Tên',
    subject: 'Chấm điểm ngũ hành từng chữ trong tên, hợp hay khắc mệnh.',
    core: 'a short vertical column of three or four thin abstract calligraphy strokes at center (suggesting written characters without forming real ones), each stroke marked at its base by one tiny five-element glyph',
    elements: ['a thin scale-like balance line resting beneath the column', 'a small brush resting beside the strokes', 'faint radiating lines to the outer halo'],
  },
  {
    id: 'so-dep',
    label: 'Xem Số Đẹp',
    subject: 'Chấm điểm số điện thoại/số đẹp bằng Bát Tinh, Quẻ Dịch, Ngũ Hành.',
    core: 'a short row of small abstract numeral-like glyphs at center (clean geometric marks, not real digits), sitting above one tiny three-bar trigram mark',
    elements: ['a thin ring of small tick marks like a scoring dial around the row of glyphs', 'a couple of small stars above the row', 'faint radial lines to the outer halo'],
  },
  {
    id: 'tuong-hop',
    label: 'Tương Hợp Tuổi',
    subject: 'Xét nhanh hai tuổi có hợp nhau hay không, chỉ cần năm sinh.',
    core: 'two small zodiac-branch tokens at center facing each other — each a plain rounded tile bearing one tiny abstract animal-silhouette mark, no realistic detail — with a thin connecting line between them',
    elements: ['a couple of small stars above the two tokens', 'a thin ring of twelve faint branch ticks around them, echoing the full zodiac cycle', 'soft radial lines to the halo'],
  },
  {
    id: 'bat-trach',
    label: 'Hướng Bát Trạch',
    subject: 'Tính mệnh quái và hướng nhà hợp theo Bát Trạch.',
    core: 'a small house silhouette at center (a plain roofline over a rectangle, door as a thin gap), sitting in the middle of a plain circle marked with eight short straight tick marks at even intervals around its rim, like the eight points of a compass',
    elements: ['a couple of small stars above the roofline', 'a thin crescent moon in an upper corner of the halo', 'faint radial lines tying the compass to the outer halo'],
  },
  {
    id: 'kim-lau',
    label: 'Kim Lâu & Tam Tai',
    subject: 'Kiểm tra tuổi có phạm Kim Lâu, Hoang Ốc hay Tam Tai không.',
    core: 'a small house silhouette at center (plain roofline over a rectangle) sitting inside one protective thin ring, with a light gap in the ring marking a single "watch" point rather than a warning',
    elements: ['a thin ring of twelve faint year-ticks surrounding the house, one tick set slightly apart from the rest', 'a couple of small stars above the roofline', 'faint radial lines to the outer halo'],
  },
  // ── Phong Cách AI ──
  {
    id: 'da-lieu-ai',
    label: 'Da Liệu AI Toàn Diện',
    subject: 'Soi ảnh da, chỉ ra vùng đang có vấn đề cần chú ý.',
    core: 'a simplified faceless oval face outline at center, its surface marked only by a light dot-grid pattern (a few dots slightly larger to suggest areas of attention), no realistic skin texture',
    elements: ['a thin magnifying-glass line resting near one edge of the face outline', 'a couple of small stars framing the face', 'soft radial lines to the outer halo'],
  },
  {
    id: 'kieu-toc-phan-tich',
    label: 'Phân Tích & Thử Kiểu Tóc AI',
    subject: 'Chấm khuôn mặt hợp kiểu tóc nào, thử ngay kiểu mới lên ảnh thật.',
    core: 'a simplified faceless head-and-shoulders silhouette at center, topped by one flowing line of hair swept to the side in a single elegant curling stroke',
    elements: ['a small pair of scissors drawn in thin outline resting beside the hair curl', 'a couple of small stars near the flowing line', 'soft radial lines to the outer halo'],
  },
  {
    id: 'mau-sac-hop-menh',
    label: 'Màu Sắc Hợp Mệnh',
    subject: 'Gợi ý những màu hợp mệnh theo ngũ hành.',
    core: 'a small hand-fan shape at center opened halfway, its ribs drawn as five thin lines each tipped with one tiny five-element glyph (circle, branch, wave, flame, square) instead of colour',
    elements: ['a couple of small stars above the fan', 'a thin ring of fine tick marks behind the fan, like a colour wheel reduced to line art', 'faint radial lines to the outer halo'],
  },
  {
    id: 'personal-color',
    label: 'Personal Color AI',
    subject: 'Xác định tông da hợp mùa màu nào trong 4 mùa, thử ngay lên ảnh.',
    core: 'a simplified faceless oval face outline at center, split down the middle by one thin vertical line — one half bordered by a small sun glyph, the other by a small crescent moon, standing for warm and cool',
    elements: ['four tiny leaf/petal/snowflake/flame glyphs (one per season) arranged evenly around the face', 'a couple of small stars', 'soft radial lines to the outer halo'],
  },
  {
    id: 'trang-diem-phan-tich',
    label: 'Phân Tích & Thử Trang Điểm AI',
    subject: 'Gợi ý lối trang điểm hợp gương mặt, thử ngay lên ảnh thật.',
    core: 'a simplified faceless oval face outline at center with one thin curved line tracing along the cheek like a brush stroke, and a small slim makeup-brush resting beside the face',
    elements: ['a couple of tiny dot accents near the brush stroke, like light highlighting', 'small stars framing the face', 'soft radial lines to the outer halo'],
  },
  {
    id: 'trang-phuc-theo-ngay',
    label: 'Trang Phục & Thử Đồ AI',
    subject: 'Gợi ý trang phục hợp vận trong ngày, thử ngay lên ảnh thật.',
    core: 'a slim clothes-hanger at center holding one flowing robe silhouette (a loose áo-dài-like line, no pattern), swaying gently to one side',
    elements: ['a couple of small stars above the hanger', 'a thin crescent moon resting behind the robe', 'faint radial lines to the outer halo'],
  },
  // ── Phong Thủy ──
  {
    id: 'phong-thuy',
    label: 'Phong Thủy Nội Thất',
    subject: 'Chụp ảnh phòng, nhận phân tích phong thủy Bát Trạch, Ngũ Hành.',
    core: 'a simple room floor-plan outline at center (a plain rectangle with one door gap and a couple of thin furniture rectangles inside), overlaid by a light compass rose radiating from its centre. Keep the compass rose to plain tick marks only — no ring of trigram bars, no yin-yang disc, so the composition does not resemble any flag or national emblem.',
    elements: ['a couple of small stars above the room outline', 'faint radial lines tying the plan to the outer halo', 'a thin crescent moon in an upper corner of the halo'],
  },
  {
    id: 'ban-lam-viec',
    label: 'Phong Thủy Bàn Làm Việc',
    subject: 'Chụp ảnh bàn làm việc, xem cách kê có cản đường thăng tiến.',
    core: 'a simple desk-and-chair silhouette at center in plain thin outline, seen from a three-quarter angle, with a small compass needle floating just above the desk surface',
    elements: ['a couple of small stars above the desk', 'faint ascending step-lines behind the chair, echoing career progress', 'soft radial lines to the outer halo'],
  },
  {
    id: 'cua-hang-phong-thuy',
    label: 'Phong Thủy Cửa Hàng & VP',
    subject: 'Chụp ảnh cửa hàng, xem cách bày biện có cản khách vào.',
    core: 'a simple shopfront silhouette at center — a thin awning line over an open doorway gap — with a light compass rose radiating from just inside the doorway',
    elements: ['a couple of small stars above the awning', 'faint footstep-like tick marks leading toward the doorway', 'soft radial lines to the outer halo'],
  },
  {
    id: 'phong-thuy-render',
    label: 'Render Phòng Phong Thủy',
    subject: 'Xem trước ảnh dựng phòng sau khi sửa theo phong thủy.',
    core: 'a simple room outline at center split by one thin vertical line into two halves — the left half plain and empty, the right half holding the same room with a couple of small furniture rectangles neatly placed',
    elements: ['a small arrow curling from the left half to the right, marking the change', 'a couple of small stars above the room', 'soft radial lines to the outer halo'],
  },
  // ── Xem Tướng ──
  {
    id: 'dien-tuong',
    label: 'Diện Tướng',
    subject: 'Đọc nhân tướng học tổng thể từ ảnh khuôn mặt.',
    core: 'a simplified faceless frontal face outline at center, overlaid with a light grid of thin lines marking the twelve traditional face-reading zones (十二宫), each zone left blank',
    elements: ['a couple of small stars framing the face', 'a thin ring echoing the face grid further out in the halo', 'soft radial lines to the outer halo'],
  },
  {
    id: 'nhan-tuong',
    label: 'Nhãn Tướng',
    subject: 'Đọc tướng mắt theo Liễu Trang Thần Tướng từ ảnh khuôn mặt.',
    core: 'one large simplified eye at center drawn in clean line art (almond outline, single line iris, no lashes or realistic detail), with one thin brow-arc above it standing in for a crescent moon',
    elements: ['a couple of small stars framing the eye', 'a thin radiating iris-like ring behind the eye, echoing the halo', 'soft cloud motifs at the base'],
  },
  {
    id: 'thu-tuong',
    label: 'Thủ Tướng',
    subject: 'Đọc chỉ tay theo Ngũ Hành Hình Tướng từ ảnh bàn tay.',
    core: 'a simplified open palm silhouette at center, faceless and plain, with three thin curving lines traced across it standing for the head, heart and life lines',
    elements: ['a couple of small stars above the palm', 'a small five-element glyph resting at the base of the wrist', 'soft radial lines to the outer halo'],
  },
  {
    id: 'thanh-tuong',
    label: 'Thanh Tướng',
    subject: 'Ghi âm giọng nói, xem giọng hợp nghề nào.',
    core: 'a simplified faceless profile silhouette at center with three thin concentric sound-wave arcs radiating outward from where the mouth would be',
    elements: ['a couple of small stars riding along the outer sound wave', 'a thin crescent moon behind the profile', 'soft radial lines to the outer halo'],
  },
  {
    id: 'khi-sac',
    label: 'Khí Sắc',
    subject: 'Đọc khí sắc khuôn mặt, luận vận khí 1–3 tháng tới.',
    core: 'a simplified faceless oval face outline at center, wrapped by a soft swirling qi-cloud line that drifts up and around it like rising mist',
    elements: ['a couple of small stars caught within the swirling mist', 'a thin crescent moon above the face', 'faint radial lines to the outer halo'],
  },
];

/**
 * Biến thể "thử trực tiếp ảnh" (tryon) DÙNG CHUNG avatar với bản phân tích
 * gốc — khác input/output (tải ảnh lên để ghép) chứ không khác Ý NGHĨA cổ
 * pháp, nên vẽ hai bức giống hệt là lãng phí và không ai phân biệt được.
 * Khoá này cũng là nguồn DUY NHẤT cho việc suy avatar của các key lệch tên
 * trong `window.SHELL_INTRO` (xem `public/shell.js`).
 */
export const TOOL_AVATAR_ALIAS: Record<string, string> = {
  'kieu-toc-tryon': 'kieu-toc-phan-tich',
  'personal-color-tryon': 'personal-color',
  'trang-diem-tryon': 'trang-diem-phan-tich',
  'trang-phuc-tryon': 'trang-phuc-theo-ngay',
  'thanh-tuong-pro': 'thanh-tuong',
  // Lệch tên giữa SHELL_INTRO.key (khai trong app-*.html) và tool_id thật —
  // xem đối chiếu trong nhật ký PR "Hình đại diện tool".
  'bat-tu': 'tu-binh',
  'chon-ngay': 'chon-ngay-tot',
  'dat-ten': 'dat-ten-con',
  'luan-giai': 'laso',
  'sinh-con': 'xem-tuoi-sinh-con',
};

/** tool_id/key bất kỳ (kể cả alias) → id ảnh thật để build đường dẫn file. */
export function resolveAvatarId(idOrKey: string): string {
  return TOOL_AVATAR_ALIAS[idOrKey] || idOrKey;
}

export function buildToolAvatarPrompt(t: ToolAvatarSpec): string {
  const elementsBlock = t.elements.map((e) => `- ${e}`).join('\n');
  return [
    `Create a highly refined, premium Chinese/Eastern metaphysics line-art icon illustration.`,
    `SUBJECT: ${t.label} — ${t.subject}`,
    `CORE VISUAL (the one thing at the very center, simple and elegant): ${t.core}.`,
    `SUPPORTING ELEMENTS (small, secondary, placed within the halo — do not let them compete with the core visual):\n${elementsBlock}`,
    BRAND_STYLE,
  ].join('\n\n');
}
