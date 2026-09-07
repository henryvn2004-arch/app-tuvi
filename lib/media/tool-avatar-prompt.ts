// lib/media/tool-avatar-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH ĐẠI DIỆN cho từng tool bằng gpt-image — line art vàng
// kim trên nền navy, phong cách tranh minh hoạ Tử Vi cao cấp (KHÔNG phải icon
// phẳng). Đã chốt qua nhiều vòng duyệt tay với Henry (xem
// `docs/nhat-ky/2026-08.md` mục "Hình đại diện tool"):
//   1. Bản icon-phẳng đầu tiên (vòng tròn đối xứng cứng) → chê "nhìn đâu cũng
//      vòng tròn", không có hồn.
//   2. Đổi sang khung "narrative hero illustration" (không đối xứng hoàn hảo,
//      có nhân vật/cấu trúc biểu tượng làm trọng tâm, mây/trăng/sao bao quanh)
//      → khớp Ý.
//   3. Nhân vật lúc đầu mặt buồn/cúi xuống → chỉnh sang biểu cảm TƯƠI, mắt mở,
//      khẽ cười — xem `EXPRESSION_RULE` dưới.
//   4. Hán tự trang trí gpt-image hay bịa chữ GIẢ (không đọc được) → bỏ hẳn,
//      thay bằng hoa văn/tua rua/mây (xem `CHINESE_AESTHETICS`).
//
// ⚠️ KHÔNG ép MỌI tool có nhân vật người. Bảng `TOOL_AVATARS` chọn theo đúng
// bản chất từng tool: tool có tính LUẬN GIẢI CON NGƯỜI (đọc lá số, chân dung,
// tương hợp, xem tướng, phong cách AI...) → nhân vật (1 người/couple/em
// bé/nhóm tuỳ tool). Tool có tính TRA CỨU/CƠ CHẾ THUẦN (an sao trần, Kinh
// Dịch, Bát Trạch, Nạp Âm, lịch...) → cấu trúc biểu tượng trừu tượng (vòng
// quẻ, la bàn, lịch...), không gán gượng một nhân vật vào đó.
// ============================================================

/** Bắt đầu MỌI ảnh — phần khung nghệ thuật cố định, không đổi theo tool. */
const ART_DIRECTION = `ART DIRECTION:

This is NOT an icon.
This is a rich, narrative-style hero illustration.

The composition should feel artistic, mystical, and slightly asymmetrical — not rigid or overly geometric.`;

const COMPOSITION = `COMPOSITION:

- A large celestial circular structure inspired by Luo Pan or astrology, but not perfectly rigid
- The circle can be partially broken, layered, or blended into the scene
- Surrounding space should include atmospheric elements (clouds, stars, flow)
- The background fills the entire square canvas edge to edge with a rich, fully saturated deep navy blue. Absolutely NO vignette, no soft circular spotlight fading to black or gray at the corners, no photographic glow halo, no blur — the four corners are the same crisp navy as the center.`;

/**
 * Áp cho MỌI nhân vật người trong bộ ảnh. Đây là chỗ sửa NẾU sau này thấy
 * nhân vật lại "buồn" — chỉ sửa MỘT chỗ, không sửa tay 30+ dòng centralSubject.
 */
const EXPRESSION_RULE = `If the central subject includes a human figure, her or his expression must read as UPLIFTING and HOPEFUL: eyes open (not closed, not downcast, not sleepy), a light, warm, gently serene smile — like someone quietly pleased with what the reading reveals. Never somber, sorrowful, tired, or melancholic.`;

const CHINESE_AESTHETICS = `CHINESE AESTHETICS (CRITICAL):

- Do NOT render dense blocks of Chinese characters — gpt-image tends to fabricate fake, unreadable glyphs that read as wrong to anyone literate in Chinese. Prefer plain ornamental dots, tassels, knotwork and cloud scrollwork over actual characters. At most one or two small, simple decorative marks may hint at writing, never a caption or label.
- Include traditional cloud motifs (祥云)
- Include small symbolic marks (like trigrams, zodiac hints) used sparingly, never as a symmetric ring of trigrams around a yin-yang disc (that specific layout reads as a national flag, not a metaphysics motif)`;

const CELESTIAL_ELEMENTS = `CELESTIAL ELEMENTS:

- Crescent moon
- Stars (✦)
- Orbit lines or cosmic arcs`;

const LINE_STYLE = `LINE STYLE:

- Thin, refined gold line (#E6C76B, #F2E3B3) on the deep navy background (#0B2A45 → #123A5A)
- Clean but slightly expressive (not too mechanical)
- No other colors anywhere in the image; never render any part of the image in gray, black-and-white, sepia, or any desaturated tone`;

const BALANCE = `BALANCE:

- Mix of:
  - detailed areas (halo / outer structure)
  - open negative space
  - flowing decorative elements`;

const DO_NOT = `DO NOT:

- Do NOT make it a simple icon
- Do NOT make perfect symmetry
- Do NOT reduce everything to circles only
- Do NOT remove character or narrative feeling
- Do NOT render the background as gray, desaturated, or vignetted — it must stay a rich navy blue corner to corner
- Do NOT give any human figure a sad, solemn, sleepy, or melancholic expression — see the expression rule above
- Do NOT add any text, caption, or label anywhere in the image`;

const FINAL_FEELING = `FINAL FEELING:

A luxurious, mystical Chinese astrology artwork — like a high-end Zi Wei Dou Shu illustration, rich in detail, slightly poetic, warm and alive, not somber. Inspired by editorial illustration, Chinese celestial art, and luxury spiritual branding, not UI icons.`;

export interface ToolAvatarSpec {
  /** tool_id trong bảng tool_pricing — cũng là tên file ảnh (<id>.webp). */
  id: string;
  /** Tên hiển thị — vào phần Context để model hiểu ý nghĩa, KHÔNG in lên ảnh. */
  label: string;
  /** Một câu tóm ý nghĩa/mục đích tool — phần Context. */
  context: string;
  /**
   * CHỦ THỂ TRUNG TÂM — hoặc mô tả nhân vật (gufeng, dáng, hành động, đang
   * nhìn/làm gì) hoặc mô tả cấu trúc biểu tượng trừu tượng khi tool không
   * hợp gán nhân vật. Đây là phần DUY NHẤT thật sự khác nhau giữa các tool.
   */
  centralSubject: string;
  /** Mô-típ phụ riêng của tool, cộng thêm vào CELESTIAL_ELEMENTS mặc định. */
  extraMotifs?: string[];
}

/**
 * 52 tool đang bật (`enabled=true` trong `tool_pricing`, trừ 5 biến thể dùng
 * CHUNG avatar với bản gốc — xem `TOOL_AVATAR_ALIAS` cuối file — vì chỉ khác
 * input/output (tải ảnh lên để ghép / bản "pro" đọc sâu hơn) chứ không khác
 * Ý NGHĨA cổ pháp).
 */
export const TOOL_AVATARS: ToolAvatarSpec[] = [
  // ── Bói Bài — cổ pháp Tây, để lá bài là chủ thể, không gán nhân vật ──
  {
    id: 'tarot',
    label: 'Tarot 78 Lá',
    context: 'Rút một lá bài Tarot, nghe một câu trả lời rõ cho chuyện đang rối.',
    centralSubject:
      'A single upright tarot card as the symbolic structure at the center — its face left blank apart from a thin decorative border and one small engraved star, floating as if just drawn from the deck, faint fanned cards barely visible behind it. No human figure needed; let the card itself be the calm, poised presence at the center.',
  },
  {
    id: 'oracle',
    label: 'Oracle Phương Đông',
    context: 'Rút một lá oracle triết lý phương Đông, đọc một lời khuyên tĩnh tâm.',
    centralSubject:
      'A single rounded oracle card at the center, its face bearing one small minimal lotus glyph, resting calmly just below a small yin-yang mark — the card itself is the symbolic structure. No human figure.',
  },
  {
    id: 'boi-bai-tay',
    label: 'Bói Bài Tây',
    context: 'Bói bài Tây kiểu dân gian, đoán hướng đi sắp tới.',
    centralSubject:
      'Three playing cards fanned gently at the center, backs facing the viewer, each marked only with a small minimal spade outline — the fan itself is the symbolic structure, no human figure.',
  },

  // ── Chiêm Tinh Tây — vòng hoàng đạo, không phải bát quái ──
  {
    id: 'ban-do-sao',
    label: 'Bản Đồ Sao Lúc Sinh',
    context: 'Dựng bánh xe 12 nhà chiêm tinh Tây đúng khoảnh khắc chào đời.',
    centralSubject:
      'A Western natal-chart wheel as the symbolic structure — twelve slim house segments with a handful of classical planet glyphs (☉ ☽ ♀ ♂) resting lightly on its rim, gently asymmetrical rather than perfectly rigid. No human figure; let the wheel itself be the calm centerpiece.',
    extraMotifs: ['faint constellation dots connected by hair-thin lines in the background corners'],
  },

  // ── Công Cụ Tử Vi — an sao trần, trước khi ai luận ──
  {
    id: 'an-sao',
    label: 'An Sao Lá Số',
    context: 'An sao lá số Tử Vi Đẩu Số — dựng 12 cung theo đúng cổ pháp, miễn phí, chưa luận giải.',
    centralSubject:
      'A square 12-palace natal-chart grid as the symbolic structure at the center, one small star glyph glowing softly in its middle palace. No human figure — this is the raw chart itself, before anyone reads it.',
  },

  // ── Đặt Tên & Ngày ──
  {
    id: 'dat-ten-dn',
    label: 'Đặt Tên Doanh Nghiệp',
    context: 'Đặt tên công ty hợp ngũ hành và tuổi người chủ.',
    centralSubject:
      'A minimal elegant East Asian young man in traditional Chinese ancient style (gufeng, 古风), in side profile, brush in hand, pausing mid-stroke above a small blank name-seal — smooth flowing hair tied back, delicate robe ties and sash. Calm and quietly pleased, as if the right name has just come to him.',
  },
  {
    id: 'dat-ten-con',
    label: 'Đặt Tên Con',
    context: 'Đặt tên con hợp ngũ hành của cả cha và mẹ.',
    centralSubject:
      'A minimal elegant East Asian young mother in gufeng style, in side profile, gently cradling a small swaddled infant silhouette in her arms and looking down at the baby — delicate hair ornaments and tassels, flowing robe. Calm, radiant, and tender.',
  },
  {
    id: 'chon-ngay-tot',
    label: 'Chọn Ngày Tốt',
    context: 'Chọn ngày tốt cho cưới hỏi, khai trương, ký hợp đồng.',
    centralSubject:
      'A simple calendar page as the symbolic structure, one date marked with a small gold circle, resting just above a faint compass needle. No human figure — the chosen day is the whole story.',
  },

  // ── Huyền Học ──
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học',
    context: 'Đọc con số từ ngày sinh: đường đời, đỉnh cao, năm cá nhân.',
    centralSubject:
      'A minimal elegant East Asian young person in gufeng style, in side profile, eyes gently open in quiet focus, with one abstract geometric number-glyph (not a real digit) glowing softly just above their open palm. Calm and serene, quietly pleased with what the numbers reveal.',
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch 64 Quẻ',
    context: 'Gieo một quẻ trong 64 quẻ Kinh Dịch, đọc hào đang động.',
    centralSubject:
      'A segmented circle as the symbolic structure at the center: six concentric rings nested inside one another like tree rings, each an unbroken thin gold line except one single ring broken by a small radial gap and marked with a slightly brighter gold tone — the point of change. Fully abstract and geometric, no human figure, nothing resembling a national flag or religious emblem.',
  },
  {
    id: 'mai-hoa',
    label: 'Mai Hoa Dịch Số',
    context: 'Gieo quẻ bằng số hoặc giờ theo Mai Hoa Dịch Số, đọc Thể và Dụng.',
    centralSubject:
      'A single bare plum-blossom branch as the symbolic structure at the center, angular and spare, bearing exactly five small five-petaled blossoms in thin outline, a tiny two-bar mark tucked beside it. No human figure.',
  },
  {
    id: 'ky-mon',
    label: 'Kỳ Môn Độn Giáp',
    context: 'Dựng bàn 9 cung theo giờ hiện tại, chỉ hướng nên đi.',
    centralSubject:
      'A nine-palace grid (3×3, Lạc Thư style) as the symbolic structure at the center, one thin compass needle laid diagonally across it pointing toward one palace, a faint radiating burst behind the needle tip. No human figure.',
  },

  // ── Lịch Số ──
  {
    id: 'hoang-dao',
    label: 'Giờ Hoàng Đạo',
    context: 'Tra giờ hoàng đạo hôm nay, việc nên làm trong giờ đó.',
    centralSubject:
      'A minimal sundial as the symbolic structure at the center — a thin vertical gnomon casting one line-shadow across a shallow arc of twelve fine hour ticks, a small sun disc at one end and a crescent moon at the other. No human figure.',
  },
  {
    id: 'ngay-tot',
    label: 'Ngày Tốt Trong Tháng',
    context: 'Liệt kê những ngày tốt trong tháng này, xếp theo từng ngày.',
    centralSubject:
      'A calendar month grid as the symbolic structure at the center — rows of small square cells in thin line, three or four cells marked by small gold dots scattered through the grid, a thin crescent moon above marking the lunar month. No human figure.',
  },
  {
    id: 'luc-nham',
    label: 'Lục Nhâm Giản',
    context: 'Tra một quẻ Lục Nhâm theo giờ và ngày cho việc đang canh cánh trong lòng.',
    centralSubject:
      'A small round divination disc (式盤) as the symbolic structure at the center — an inner rotating dial with twelve fine branch ticks inside a slightly larger outer ring, offset as if just turned, a thin needle-pointer resting across it. No human figure.',
  },

  // ── Luận Giải — phần lớn có nhân vật, vì đây là nhóm "đọc con người" ──
  {
    id: 'gio-sinh',
    label: 'Xác Định Giờ Sinh',
    context: 'Lập 12 lá số theo 12 giờ, thu hẹp dần về đúng giờ sinh.',
    centralSubject:
      'A thin clock-face ring as the symbolic structure at the center, divided into twelve slim hour segments, eleven fading toward transparency and exactly one drawn solid and emphasized, a small hourglass resting at the very center. No human figure — this tool is a technical narrowing-down, not a personal reading yet.',
  },
  {
    id: 'laso',
    label: 'Luận Giải Lá Số',
    context:
      'Đọc trọn 24 phần lá số Tử Vi Đẩu Số: cung, đại vận, cách cục, điểm mạnh yếu — bản luận giải đầy đủ nhất.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, looking upward and outward toward a crescent moon with a bright, warm, gently smiling expression, as if reading her own chart unfolding around her — delicate hair ornaments and tassels, smooth flowing hair, graceful silhouette. Calm, radiant, and timeless, fully integrated into the celestial halo behind her (a Tử Vi 12-palace chart ring), not isolated or floating separately.',
  },
  {
    id: 'chu-trinh-cuoc-doi',
    label: 'Chu Trình Cuộc Đời',
    context: 'Đọc trọn các giai đoạn một đời người qua lá số, từ trẻ đến già.',
    centralSubject:
      'A single spiral as the symbolic structure at the very center, winding outward from one still point through four gentle turns, growing slightly wider with each turn, five small tick marks spaced along its path marking life stages — yet the spiral remains one unbroken continuous line. Fully abstract and geometric, no human figure or silhouette.',
  },
  {
    id: 'tu-binh',
    label: 'Tử Bình Bát Tự',
    context: 'Lập bát tự, đọc Nhật Can, Dụng Thần, Cách Cục, Đại Vận.',
    centralSubject:
      'Four slim vertical stelae as the symbolic structure, standing side by side at the center, plain rectangular columns of equal height evenly spaced, a small five-element ring resting at their base, thin horizontal tick marks partway up each column. No human figure.',
  },
  {
    id: 'van-han-nam',
    label: 'Vận Hạn 12 Tháng Tới',
    context: 'Xem đúng 12 tháng tới: cung hạn, sao, cách cục của từng tháng.',
    centralSubject:
      'A thin ring as the symbolic structure at the center, divided into twelve slim monthly segments, one emphasized with a small gold star, a faint spiral arrow tracing once around showing the months in sequence. No human figure.',
  },
  {
    id: 'chan-dung-tien-kiep',
    label: 'Chân Dung Tiền Kiếp',
    context: 'Nhận một chân dung và câu chuyện một đời từ chính lá số.',
    centralSubject:
      'A minimal elegant East Asian figure in gufeng style, in side profile, stepping gently out of a swirl of cloud motifs as if arriving from a past life — soft, serene, quietly warm expression, eyes open and calm, delicate flowing robe and hair. Mystical but welcoming, never ghostly or sorrowful.',
  },
  {
    id: 'xem-lam-an',
    label: 'Xem Tuổi Làm Ăn',
    context: 'Chấm yếu tố hợp tác giữa bạn và người sắp làm ăn chung.',
    centralSubject:
      'Two minimal elegant East Asian figures in gufeng style, in side profile facing each other with a small respectful bow of the head, a thin balanced scale resting between them — calm, confident, quietly optimistic expressions, like partners reading a good sign together.',
  },
  {
    id: 'nguoi-khac',
    label: 'Lá Số Người Khác',
    context: 'Nhận cẩm nang ứng xử với một người cụ thể qua lá số của họ.',
    centralSubject:
      'A minimal elegant East Asian figure in gufeng style, in side profile, holding a small open book, a second smaller silhouette sketched softly just ahead as the person being understood. Calm, attentive, warmly curious expression.',
  },
  {
    id: 'nhan-mach',
    label: 'Sổ Nhân Mạch',
    context: 'Xem cả đội đang thiếu kiểu người nào, ai với ai dễ va chạm.',
    centralSubject:
      'A loose constellation of five to six small simplified silhouette figures as the symbolic structure at the center, connected to one another by thin gold lines like a gently glowing network, one connection brighter than the rest. No detailed faces; the network itself is the story of a team.',
  },
  {
    id: 'cong-so',
    label: 'Tử Vi Công Sở & Hướng Nghiệp',
    context: 'Đọc kiểu người ở chỗ làm và cả chặng đường sự nghiệp.',
    centralSubject:
      'A minimal elegant East Asian figure in gufeng scholar-official style, in side profile, wearing a simple two-winged official hat (烏紗帽), one foot raised onto the first of a few ascending steps, gazing forward with a confident, quietly proud expression.',
  },
  {
    id: 'xem-tuoi',
    label: 'Xem Tuổi Vợ Chồng',
    context: 'Chấm yếu tố tương hợp giữa hai lá số của hai người.',
    centralSubject:
      'Two minimal elegant East Asian figures in gufeng style, standing close in side profile facing each other with warm smiles, a thin gold thread linking their joined hands. Calm, hopeful, glowing with quiet happiness.',
  },
  {
    id: 'chan-dung-vo-chong',
    label: 'Chân Dung Vợ Chồng',
    context: 'Vẽ chân dung người bạn đời tương lai từ cung Phu Thê.',
    centralSubject:
      'A minimal elegant East Asian young couple in gufeng style, facing each other in profile, close but not touching, with delicate hair ornaments and tassels, smooth flowing hair lines, graceful silhouettes — soft, idealized, warmly smiling expressions, calm and timeless, fully integrated into the celestial composition around them.',
  },
  {
    id: 'duyen-no-tien-kiep',
    label: 'Duyên Nợ Tiền Kiếp',
    context: 'Ghép hai lá số, tìm mối duyên kiếp trước giữa hai người.',
    centralSubject:
      'Two minimal elegant East Asian figures in gufeng style, in side profile, standing a little apart, a single thin gold thread looping gently between their hands, a large soft crescent moon behind them referencing Nguyệt Lão. Warm, wistful, quietly hopeful expressions — not sorrowful.',
  },
  {
    id: 'xem-tuoi-sinh-con',
    label: 'Xem Tuổi Sinh Con',
    context: 'Tra năm sinh con hợp địa chi của cả bố và mẹ.',
    centralSubject:
      'A minimal elegant East Asian couple in gufeng style, in side profile, standing on either side of a small cradle silhouette, both looking down at it with warm, hopeful smiles. Calm and quietly joyful.',
  },
  {
    id: 'day-con',
    label: 'Dạy Con Theo Lá Số',
    context: 'Đọc con tiếp thu kiểu nào, kỷ luật nào phản tác dụng với con.',
    centralSubject:
      "A minimal elegant East Asian parent and small child in gufeng style, in side profile, the parent's hand resting gently on the child's shoulder, both looking up together toward a small star. Warm, gentle, encouraging expressions on both.",
  },
  {
    id: 'huong-nghiep-tre',
    label: 'Hướng Nghiệp Sớm Cho Con',
    context: 'Gợi ý hoạt động nên cho con làm quen theo lứa tuổi.',
    centralSubject:
      "A minimal elegant East Asian child in gufeng style, in side profile, standing at a point where three thin paths diverge, each ending in one small plain icon (a book, a brush, a gear) — the child's expression curious and eager, looking forward with quiet excitement.",
  },

  // ── Mệnh Lý — tra cứu cơ chế, giữ trừu tượng ──
  {
    id: 'nap-am',
    label: 'Nạp Âm Ngũ Hành',
    context: 'Tra mệnh nạp âm, hành, màu và hướng hợp theo năm sinh.',
    centralSubject:
      'A ring of five small linked glyphs as the symbolic structure — a plain circle (Kim), a slim branch (Mộc), a wave line (Thủy), a flame outline (Hỏa), a square (Thổ) — arranged evenly around one shared midpoint, thin connecting lines forming the generating cycle, one glyph subtly emphasized. No human figure.',
  },
  {
    id: 'ngu-hanh-ten',
    label: 'Ngũ Hành Tên',
    context: 'Chấm điểm ngũ hành từng chữ trong tên, hợp hay khắc mệnh.',
    centralSubject:
      'A short vertical column of three or four thin abstract calligraphy strokes as the symbolic structure (suggesting written characters without forming real ones), each stroke marked at its base by one tiny five-element glyph, a thin scale-like balance line beneath. No human figure.',
  },
  {
    id: 'so-dep',
    label: 'Xem Số Đẹp',
    context: 'Chấm điểm số điện thoại/số đẹp bằng Bát Tinh, Quẻ Dịch, Ngũ Hành.',
    centralSubject:
      'A short row of small abstract numeral-like glyphs as the symbolic structure (clean geometric marks, not real digits), sitting above one tiny three-bar trigram mark, a thin ring of scoring tick marks around the row. No human figure.',
  },
  {
    id: 'tuong-hop',
    label: 'Tương Hợp Tuổi',
    context: 'Xét nhanh hai tuổi có hợp nhau hay không, chỉ cần năm sinh.',
    centralSubject:
      'Two small zodiac-branch tokens as the symbolic structure, facing each other — each a plain rounded tile bearing one tiny abstract animal-silhouette mark, no realistic detail — with a thin connecting line between them, a faint ring of twelve branch ticks around them. No human figure.',
  },
  {
    id: 'bat-trach',
    label: 'Hướng Bát Trạch',
    context: 'Tính mệnh quái và hướng nhà hợp theo Bát Trạch.',
    centralSubject:
      'A small house silhouette as the symbolic structure at the center (plain roofline over a rectangle, door as a thin gap), sitting in the middle of a plain circle marked with eight short straight tick marks at even intervals around its rim, a single compass needle laid across pointing to one favourable direction. No human figure, no ring of trigram bars, nothing resembling a national flag.',
  },
  {
    id: 'kim-lau',
    label: 'Kim Lâu & Tam Tai',
    context: 'Kiểm tra tuổi có phạm Kim Lâu, Hoang Ốc hay Tam Tai không.',
    centralSubject:
      'A small house silhouette as the symbolic structure (plain roofline over a rectangle) sitting inside one protective thin ring with a light gap marking a single "watch" point rather than a warning, a thin ring of twelve faint year-ticks surrounding it. No human figure.',
  },

  // ── Phong Cách AI — nhân vật là chính, đúng bản chất "soi ảnh bạn" ──
  {
    id: 'da-lieu-ai',
    label: 'Da Liệu Toàn Diện',
    context: 'Soi ảnh da, chỉ ra những vùng đang có vấn đề cần chú ý.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, her cheek marked only by a soft, sparse dot-grid pattern (a few dots gently brighter) — no realistic skin texture. Calm, fresh, quietly confident expression.',
  },
  {
    id: 'kieu-toc-phan-tich',
    label: 'Phân Tích & Thử Kiểu Tóc',
    context: 'Chấm khuôn mặt hợp kiểu tóc nào, thử ngay kiểu mới lên ảnh thật.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, her long hair swept into one elegant flowing curl caught mid-motion, a small pair of scissors resting lightly nearby. Bright, playful, quietly delighted expression.',
  },
  {
    id: 'mau-sac-hop-menh',
    label: 'Màu Sắc Hợp Mệnh',
    context: 'Gợi ý những màu hợp mệnh theo ngũ hành.',
    centralSubject:
      'A small hand-fan as the symbolic structure at the center, opened halfway, its ribs drawn as five thin lines each tipped with one tiny five-element glyph instead of colour, a thin ring of fine tick marks behind it like a colour wheel reduced to line art. No human figure.',
  },
  {
    id: 'personal-color',
    label: 'Personal Color',
    context: 'Xác định tông da hợp mùa màu nào trong 4 mùa, thử ngay lên ảnh.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, her face gently touched by one thin line dividing warm from cool — a small sun glyph on one side, a small crescent moon glyph on the other. Bright, curious, quietly pleased expression.',
  },
  {
    id: 'trang-diem-phan-tich',
    label: 'Phân Tích & Thử Trang Điểm',
    context: 'Gợi ý lối trang điểm hợp gương mặt, thử ngay lên ảnh thật.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, one thin curved line tracing along her cheekbone like a brush stroke, a small slim makeup brush resting near her face. Warm, radiant, quietly delighted expression.',
  },
  {
    id: 'trang-phuc-theo-ngay',
    label: 'Trang Phục & Thử Đồ',
    context: 'Gợi ý trang phục hôm nay hợp với vận của bạn, thử ngay lên ảnh thật.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, standing beside a slim hanger holding a flowing robe that sways gently, her hand just reaching to touch its sleeve. Bright, anticipatory, quietly pleased expression.',
  },

  // ── Phong Thủy — không gian là chủ thể, giữ trừu tượng ──
  {
    id: 'phong-thuy',
    label: 'Phong Thủy Nội Thất',
    context: 'Chụp ảnh phòng, nhận phân tích phong thủy theo Bát Trạch và Ngũ Hành.',
    centralSubject:
      'A simple room floor-plan outline as the symbolic structure (a plain rectangle with one door gap and a couple of thin furniture rectangles inside), overlaid by a light compass rose radiating from its centre — plain tick marks only, no ring of trigram bars or yin-yang disc. No human figure.',
  },
  {
    id: 'ban-lam-viec',
    label: 'Phong Thủy Bàn Làm Việc',
    context: 'Chụp ảnh bàn làm việc, xem cách kê có đang cản đường thăng tiến.',
    centralSubject:
      'A simple desk-and-chair silhouette as the symbolic structure, seen at a three-quarter angle in plain thin outline, a small compass needle floating just above the desk surface, faint ascending step-lines behind the chair. No human figure.',
  },
  {
    id: 'cua-hang-phong-thuy',
    label: 'Phong Thủy Cửa Hàng & VP',
    context: 'Chụp ảnh cửa hàng, xem cách bày biện có đang cản khách vào.',
    centralSubject:
      'A simple shopfront silhouette as the symbolic structure — a thin awning line over an open doorway gap — with a light compass rose radiating from just inside the doorway, faint footstep-like tick marks leading toward it. No human figure.',
  },
  {
    id: 'phong-thuy-render',
    label: 'Render Phòng Phong Thủy',
    context: 'Xem trước ảnh dựng phòng sau khi sửa theo phong thủy.',
    centralSubject:
      'A simple room outline as the symbolic structure, split by one thin vertical line into two halves — the left half plain and empty, the right half holding the same room with a couple of small furniture rectangles neatly placed, a small arrow curling from left to right. No human figure.',
  },

  // ── Xem Tướng — soi chính người dùng, nhân vật là trọng tâm ──
  {
    id: 'dien-tuong',
    label: 'Diện Tướng',
    context: 'Đọc nhân tướng học tổng thể từ ảnh khuôn mặt.',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, shown frontally rather than in profile, her face overlaid with a light grid of the twelve traditional face-reading zones (十二宫), each zone left blank. Calm, open, quietly warm expression, eyes soft and bright.',
  },
  {
    id: 'nhan-tuong',
    label: 'Nhãn Tướng',
    context: 'Đọc tướng mắt theo Liễu Trang Thần Tướng từ ảnh khuôn mặt.',
    centralSubject:
      'One large, softly gazing eye as the symbolic structure at the center, drawn in clean line art (almond outline, single-line iris, no realistic lashes), one thin brow-arc above it standing in for a crescent moon, a radiating iris-like ring echoing the halo behind it.',
  },
  {
    id: 'thu-tuong',
    label: 'Thủ Tướng',
    context: 'Đọc chỉ tay theo Ngũ Hành Hình Tướng từ ảnh bàn tay.',
    centralSubject:
      'A simplified open palm as the symbolic structure at the center, faceless and plain, three thin curving lines traced across it standing for the head, heart and life lines, a small five-element glyph resting at the base of the wrist. No human face.',
  },
  {
    id: 'thanh-tuong',
    label: 'Thanh Tướng',
    context: 'Ghi âm giọng nói, xem giọng hợp nghề nào — kể cả bản đọc chuyên sâu (Thanh Tướng Pro).',
    centralSubject:
      'A minimal elegant East Asian young woman in gufeng style, in side profile, lips slightly parted as if softly singing, three thin concentric sound-wave arcs radiating gently from her mouth. Warm, expressive, quietly joyful expression.',
  },
  {
    id: 'khi-sac',
    label: 'Khí Sắc',
    context: 'Đọc khí sắc trên khuôn mặt, luận vận khí 1 đến 3 tháng tới.',
    centralSubject:
      "A minimal elegant East Asian young woman in gufeng style, in side profile, her face softly wrapped by a swirling qi-cloud line drifting up around her like rising mist. Bright, glowing, quietly serene expression — the picture of good complexion and good fortune.",
  },
];

/**
 * Biến thể dùng CHUNG avatar với bản gốc — khác input/output (tải ảnh lên để
 * ghép / bản "pro" đọc sâu hơn) chứ không khác Ý NGHĨA cổ pháp, nên vẽ riêng
 * là lãng phí và không ai phân biệt được. Khoá này cũng là nguồn DUY NHẤT cho
 * việc suy avatar của các key lệch tên trong `window.SHELL_INTRO` (xem
 * `public/shell.js`).
 */
export const TOOL_AVATAR_ALIAS: Record<string, string> = {
  'kieu-toc-tryon': 'kieu-toc-phan-tich',
  'personal-color-tryon': 'personal-color',
  'trang-diem-tryon': 'trang-diem-phan-tich',
  'trang-phuc-tryon': 'trang-phuc-theo-ngay',
  'thanh-tuong-pro': 'thanh-tuong',
  // Lệch tên giữa SHELL_INTRO.key (khai trong app-*.html) và tool_id thật.
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
  const celestial = t.extraMotifs?.length
    ? `${CELESTIAL_ELEMENTS}\n- ${t.extraMotifs.join('\n- ')}`
    : CELESTIAL_ELEMENTS;

  return [
    `Create a premium Chinese metaphysics illustration in elegant gold line art on a deep navy background.`,
    `Context:\n${t.label}\n${t.context}`,
    ART_DIRECTION,
    COMPOSITION,
    `CENTRAL SUBJECT (IMPORTANT):\n\n${t.centralSubject}\n\n${EXPRESSION_RULE}`,
    CHINESE_AESTHETICS,
    celestial,
    LINE_STYLE,
    BALANCE,
    DO_NOT,
    FINAL_FEELING,
  ].join('\n\n---\n\n');
}
