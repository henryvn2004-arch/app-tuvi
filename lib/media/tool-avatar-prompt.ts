// lib/media/tool-avatar-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH ĐẠI DIỆN cho từng tool bằng gpt-image.
//
// 🔴 Reskin webtoon 2026-09-17 (Sprint 5, sau khi Sprint 5b banner đã xong):
// bỏ HẲN bộ khung "line art vàng kim trên nền navy" cũ (chốt 2026-08, xem
// `docs/nhat-ky/2026-08.md` mục "Hình đại diện tool") — không hợp phong cách
// webtoon/chibi ấm áp của trang chủ + banner mới. Đổi luật CŨ ("KHÔNG ép mọi
// tool có nhân vật người"): Minh Bảo giờ có mặt ở CẢ 52 avatar, đúng vai trò
// mascot cố định của site, nhưng ĐỔI VAI theo bản chất tool:
//   - Tool "LUẬN NGƯỜI" (đọc lá số, chân dung, tương hợp, xem tướng, phong
//     cách AI...) → Minh Bảo TƯƠNG TÁC với một khách (chỉ, đưa, cùng nhìn).
//   - Tool "TRA CỨU/CƠ CHẾ THUẦN" (an sao trần, Kinh Dịch, Bát Trạch, Nạp
//     Âm, lịch...) → Minh Bảo đứng/ngồi CẠNH vật thể biểu tượng của tool đó
//     (la bàn, lịch, vòng quẻ...), không cần khách.
// Neo bằng ẢNH (`images/edits`, `webtoon-style.ts`) như hero-banner — tránh
// trôi mặt Minh Bảo qua 52 lượt vẽ riêng.
//
// ⚠️ KHỔ VUÔNG NHỎ (1024², hiển thị thật ở 104px/`tools/*.html` và 48px/PDF
// print header — xem `public/tools/tools.css` `.xt-avatar` và
// `public/shell.css` `.ws-print-avatar`) — KHÁC hero-banner (khổ ngang lớn).
// Bố cục vì thế phải ĐƠN GIẢN, Minh Bảo/vật thể to & giữa khung, nền phẳng
// không chi tiết rườm rà — chi tiết nhỏ sẽ mờ hẳn khi thu về 48-104px.
//
// 🔴 MỚI RA MẪU 6 TOOL ĐẠI DIỆN (`SAMPLE` trong `gen-tool-avatars.mjs`) —
// CHƯA rà hết 46 `centralSubject` còn lại (vẫn mô tả nhân vật "gufeng" cũ,
// KHÔNG có Minh Bảo) — chờ Henry duyệt style trước khi viết lại toàn bộ,
// tránh viết lại 52 lần rồi phải sửa lại nếu style chưa đúng ý.
// ============================================================

import { edit2Prompt, ANCHOR_IMAGE_PATH } from './webtoon-style';

// Re-export cho `scripts/gen-tool-avatars.mjs` (đọc file neo trước khi gọi
// API) — nguồn thật khai ở `webtoon-style.ts`, dùng chung với hero-banner.
export { ANCHOR_IMAGE_PATH };

// Khổ NHỎ (xem cảnh báo đầu file) — bố cục phải đơn giản, KHÔNG rườm rà như
// hero-banner. Giữ tên `ART_DIRECTION`/`COMPOSITION`/`DO_NOT` để phần diff so
// với bản cũ dễ đọc, nhưng nội dung đổi hẳn.
const ART_DIRECTION = `ART DIRECTION:

This is a small SQUARE icon-portrait (displayed as small as 48-104px) — the opposite of a wide narrative scene. Center the subject large and clear, filling most of the frame. A plain, softly gradient warm background (cream/beige, no scenery clutter) — nothing that would turn to mush at a small size.`;

const COMPOSITION = `COMPOSITION:

- ONE clear focal subject, large, centered, filling most of the square frame
- At most one small supporting prop (the tool's own object/symbol), also kept simple and large enough to read small
- Plain soft warm background (cream/beige gradient), no background scenery, no crowd, no small background details
- No text, caption or label anywhere in the image`;

const DO_NOT = `DO NOT:

- Do NOT draw a wide scene with background scenery, other people, or small background details — this is a SQUARE ICON, not a banner
- Do NOT make the subject small within the frame — fill most of the square
- Do NOT add any text, caption, or label anywhere in the image
- Do NOT render Chinese characters — if the tool's prop implies writing, use plain unreadable marks/dots, never fabricated glyphs`;

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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, sitting cross-legged and holding up ONE large tarot card facing the viewer with both hands, looking at it with a curious, delighted expression. The card face is plain except for a thin decorative border and one small engraved star — no readable symbols or text. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, holding up a large round Western natal-chart wheel with both hands, gazing at it with wide, delighted eyes — the wheel shows twelve slim house segments with a handful of classical planet glyphs (☉ ☽ ♀ ♂) on its rim, no readable text. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, mid-toss of three small bronze coins with one hand, watching them with wide excited eyes — beside him a simple hexagram symbol (six stacked short horizontal bars, one glowing brighter than the rest) hovers softly, fully abstract, nothing resembling a flag or religious emblem. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, holding up a small round portrait frame with both hands, peeking at it himself with a delighted, knowing smile. Inside the frame: a soft, gentle silhouette of a young couple standing close together, faces not detailed — just enough to read as "the future partner". Keep Minh Bảo\'s exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, sitting beside a small simple house model (plain roofline over a rectangle), holding a round compass marked with eight short even tick marks around its rim, pointing at one favourable direction with a proud smile. No ring of trigram bars, nothing resembling a national flag. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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
      'Use the boy from the provided image as Minh Bảo, filling most of the square frame, kneeling beside a small simple desk-and-chair model, carefully holding a round wooden Luo Pan compass out above it, studying the desk placement with focused curiosity. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.',
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

/**
 * Prompt cho `images/edits`, neo Minh Bảo qua `ANCHOR_IMAGE_PATH` (dùng LẠI
 * đúng ảnh neo của hero-banner — một nguồn neo DUY NHẤT cho mọi bộ ảnh nhân
 * vật, xem `hero-banner-prompt.ts`). `t.centralSubject` phải tự mô tả Minh
 * Bảo đang làm gì (không lặp lại CHARACTER_DNA bằng chữ — `edit2Prompt` đã
 * xử lý phần đó).
 */
export function buildToolAvatarPrompt(t: ToolAvatarSpec): string {
  const extra = t.extraMotifs?.length ? `\nChi tiết thêm: ${t.extraMotifs.join('; ')}` : '';
  return edit2Prompt(
    [
      `Context: ${t.label} — ${t.context}`,
      ART_DIRECTION,
      COMPOSITION,
      `CENTRAL SUBJECT (IMPORTANT):\n\n${t.centralSubject}${extra}`,
      DO_NOT,
    ].join('\n\n---\n\n')
  );
}
