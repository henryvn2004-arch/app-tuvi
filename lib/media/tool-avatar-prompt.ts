// lib/media/tool-avatar-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH ĐẠI DIỆN cho từng tool bằng gpt-image.
//
// 🔴 Reskin webtoon 2026-09-17 (Sprint 5, sau khi Sprint 5b banner đã xong):
// bỏ HẲN bộ khung "line art vàng kim trên nền navy" cũ (chốt 2026-08, xem
// `docs/nhat-ky/2026-08.md` mục "Hình đại diện tool").
//
// 🔴 ĐỔI HƯỚNG LẦN 2 (cùng ngày, sau khi Henry duyệt 6 mẫu Minh Bảo): avatar
// KHÔNG dùng Minh Bảo — dùng chính THẦY/CÔ luận giải (nhân vật CHÍNH của hero
// banner nhóm đó, xem `master-groups.ts`), đang CẦM/CHỈ VÀO đúng cái
// DELIVERABLE (bản luận/biểu đồ/kết quả) mà TOOL ĐÓ trả ra, như đang giải
// thích cho khách. Mỗi tool tra nhóm qua `TOOL_TO_HERO_GROUP` (dùng CHUNG với
// hero-banner-prompt.ts — một nguồn nhóm DUY NHẤT ở `master-groups.ts`) rồi
// lấy đúng mô tả thầy/cô của nhóm đó — 52 tool cùng nhóm thì cùng một thầy/cô
// (khác deliverable trong tay), tool khác nhóm thì thầy/cô khác hẳn.
// Vẫn neo bằng ẢNH Minh Bảo (`images/edits`, `ANCHOR_IMAGE_PATH`) — CHỈ để
// giữ đúng NÉT VẼ/BẢNG MÀU (đã có bằng chứng từ 11 banner: neo ảnh Minh Bảo
// rồi tả nhân vật khác hẳn trong prompt vẫn ra đúng phong cách), Minh Bảo
// KHÔNG xuất hiện trong avatar — icon quá nhỏ, hai nhân vật sẽ rối.
//
// ⚠️ KHỔ VUÔNG NHỎ (1024², hiển thị thật ở 104px/`tools/*.html` và 48px/PDF
// print header — xem `public/tools/tools.css` `.xt-avatar` và
// `public/shell.css` `.ws-print-avatar`) — KHÁC hero-banner (khổ ngang lớn).
// Bố cục vì thế phải ĐƠN GIẢN, thầy/cô to & giữa khung, deliverable là vật
// phụ DUY NHẤT, nền phẳng không chi tiết rườm rà — chi tiết nhỏ sẽ mờ hẳn khi
// thu về 48-104px.
//
// 🔴 MỚI RA MẪU 6 TOOL ĐẠI DIỆN (`SAMPLE` trong `gen-tool-avatars.mjs`) theo
// hướng CŨ (Minh Bảo) — CHƯA vẽ lại mẫu nào theo hướng MỚI (thầy/cô) — chờ
// Henry duyệt trước khi vẽ hết 52.
// ============================================================

import { edit2Prompt, ANCHOR_IMAGE_PATH } from './webtoon-style';
import { MASTER_BY_ID, TOOL_TO_HERO_GROUP } from './master-groups';

// Re-export cho `scripts/gen-tool-avatars.mjs` (đọc file neo trước khi gọi
// API) — nguồn thật khai ở `webtoon-style.ts`, dùng chung với hero-banner.
export { ANCHOR_IMAGE_PATH };

// Khổ NHỎ (xem cảnh báo đầu file) — bố cục phải đơn giản, KHÔNG rườm rà như
// hero-banner. Giữ tên `ART_DIRECTION`/`COMPOSITION`/`DO_NOT` để phần diff so
// với bản cũ dễ đọc, nhưng nội dung đổi hẳn.
const ART_DIRECTION = `ART DIRECTION:

This is a small SQUARE icon-portrait (displayed as small as 48-104px) — the opposite of a wide narrative scene. Center the subject large and clear, filling most of the frame, shown from roughly the chest up. A plain, softly gradient warm background (cream/beige, no scenery clutter) — nothing that would turn to mush at a small size.`;

const COMPOSITION = `COMPOSITION:

- ONE clear focal subject (the master), large, centered, filling most of the square frame, shown from the chest up
- The master holds or gestures at exactly ONE deliverable object/chart (described below) — kept simple and large enough to read small
- Plain soft warm background (cream/beige gradient), no background scenery, no crowd, no small background details
- No text, caption or label anywhere in the image`;

const DO_NOT = `DO NOT:

- Do NOT draw the boy/child from the reference image — he does not appear in this picture at all; the reference image is for illustration STYLE only (line art, coloring, warm palette), not identity
- Do NOT draw a wide scene with background scenery, other people, or small background details — this is a SQUARE ICON, not a banner
- Do NOT make the subject small within the frame — fill most of the square
- Do NOT add any text, caption, or label anywhere in the image
- Do NOT render Chinese characters — if the tool's deliverable implies writing, use plain unreadable marks/dots, never fabricated glyphs`;

export interface ToolAvatarSpec {
  /** tool_id trong bảng tool_pricing — cũng là tên file ảnh (<id>.webp). */
  id: string;
  /** Tên hiển thị — vào phần Context để model hiểu ý nghĩa, KHÔNG in lên ảnh. */
  label: string;
  /** Một câu tóm ý nghĩa/mục đích tool — phần Context. */
  context: string;
  /**
   * Tư thế + DELIVERABLE cụ thể mà thầy/cô đang cầm/chỉ vào + biểu cảm. KHÔNG
   * mô tả lại ngoại hình thầy/cô (đã lấy từ `master-groups.ts` theo nhóm) —
   * đây là phần DUY NHẤT thật sự khác nhau giữa các tool CÙNG nhóm.
   */
  centralSubject: string;
  /** Mô-típ phụ riêng của tool, cộng thêm vào deliverable mặc định. */
  extraMotifs?: string[];
}

/**
 * 52 tool đang bật (`enabled=true` trong `tool_pricing`, trừ 5 biến thể dùng
 * CHUNG avatar với bản gốc — xem `TOOL_AVATAR_ALIAS` cuối file — vì chỉ khác
 * input/output (tải ảnh lên để ghép / bản "pro" đọc sâu hơn) chứ không khác
 * Ý NGHĨA cổ pháp).
 */
export const TOOL_AVATARS: ToolAvatarSpec[] = [
  // ── Bói Bài — nhóm thầy/cô "boi-bai" ──
  {
    id: 'tarot',
    label: 'Tarot 78 Lá',
    context: 'Rút một lá bài Tarot, nghe một câu trả lời rõ cho chuyện đang rối.',
    centralSubject:
      'The master holds up ONE large tarot card facing the viewer with both hands, studying it with a knowing, warm smile. The card face is plain except for a thin decorative border and one small engraved star — no readable symbols or text.',
  },
  {
    id: 'oracle',
    label: 'Oracle Phương Đông',
    context: 'Rút một lá oracle triết lý phương Đông, đọc một lời khuyên tĩnh tâm.',
    centralSubject:
      'The master holds up a single rounded oracle card close to her face with one hand, its face bearing one small minimal lotus glyph resting just below a small yin-yang mark, studying it with calm, knowing eyes.',
  },
  {
    id: 'boi-bai-tay',
    label: 'Bói Bài Tây',
    context: 'Bói bài Tây kiểu dân gian, đoán hướng đi sắp tới.',
    centralSubject:
      'The master holds a small fan of three playing cards in one hand, backs facing the viewer, each marked only with a small minimal spade outline, the other hand just turning one card face-up with a knowing smile.',
  },

  // ── Chiêm Tinh Tây — nhóm thầy/cô "chiem-tinh-tay" ──
  {
    id: 'ban-do-sao',
    label: 'Bản Đồ Sao Lúc Sinh',
    context: 'Dựng bánh xe 12 nhà chiêm tinh Tây đúng khoảnh khắc chào đời.',
    centralSubject:
      'The master holds up a large round Western natal-chart wheel with both hands, gazing at it with calm, delighted eyes — the wheel shows twelve slim house segments with a handful of classical planet glyphs (☉ ☽ ♀ ♂) on its rim, no readable text.',
  },

  // ── Công Cụ Tử Vi — nhóm thầy/cô "laso" ──
  {
    id: 'an-sao',
    label: 'An Sao Lá Số',
    context: 'An sao lá số Tử Vi Đẩu Số — dựng 12 cung theo đúng cổ pháp, miễn phí, chưa luận giải.',
    centralSubject:
      'The master holds up a square 12-palace natal-chart grid with both hands, one small star glyph glowing softly in its middle palace, studying it closely with a focused, attentive expression — this is the raw chart itself, freshly drawn, before any reading begins.',
  },

  // ── Đặt Tên & Ngày — nhóm thầy/cô "dat-ten-lich" ──
  {
    id: 'dat-ten-dn',
    label: 'Đặt Tên Doanh Nghiệp',
    context: 'Đặt tên công ty hợp ngũ hành và tuổi người chủ.',
    centralSubject:
      'The master holds a brush just above a small blank rectangular name-seal card resting on an open scroll, pausing mid-stroke with a calm, quietly pleased expression, as if the right name has just come to her.',
  },
  {
    id: 'dat-ten-con',
    label: 'Đặt Tên Con',
    context: 'Đặt tên con hợp ngũ hành của cả cha và mẹ.',
    centralSubject:
      'The master holds a brush just above an open scroll showing one small blank name card beside a soft glowing infant silhouette sketched lightly in the corner, looking down at it with a warm, tender smile.',
  },
  {
    id: 'chon-ngay-tot',
    label: 'Chọn Ngày Tốt',
    context: 'Chọn ngày tốt cho cưới hỏi, khai trương, ký hợp đồng.',
    centralSubject:
      'The master holds up a simple calendar page in one hand, one date marked with a small gold circle, a faint compass needle resting just below it on the other palm, pointing at the marked date with a pleased smile.',
  },

  // ── Huyền Học ──
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học',
    context: 'Đọc con số từ ngày sinh: đường đời, đỉnh cao, năm cá nhân.',
    centralSubject:
      'The master holds one open palm forward with a single abstract geometric number-glyph (not a real digit) glowing softly just above it, studying the glyph with quiet, serene focus.',
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch 64 Quẻ',
    context: 'Gieo một quẻ trong 64 quẻ Kinh Dịch, đọc hào đang động.',
    centralSubject:
      'The master is mid-toss of three small bronze coins with one hand, watching them with calm, knowing eyes — beside her a simple hexagram symbol (six stacked short horizontal bars, one glowing brighter than the rest) hovers softly, fully abstract, nothing resembling a flag or religious emblem.',
  },
  {
    id: 'mai-hoa',
    label: 'Mai Hoa Dịch Số',
    context: 'Gieo quẻ bằng số hoặc giờ theo Mai Hoa Dịch Số, đọc Thể và Dụng.',
    centralSubject:
      'The master holds a single bare plum-blossom branch upright in one hand, angular and spare, bearing exactly five small five-petaled blossoms in thin outline, a tiny two-bar mark tucked beside it, studying it with calm focus.',
  },
  {
    id: 'ky-mon',
    label: 'Kỳ Môn Độn Giáp',
    context: 'Dựng bàn 9 cung theo giờ hiện tại, chỉ hướng nên đi.',
    centralSubject:
      'The master holds a small nine-palace grid (3×3, Lạc Thư style) flat on one palm, a thin compass needle laid diagonally across it pointing toward one palace, a faint radiating burst behind the needle tip, studying the grid with quiet concentration.',
  },

  // ── Lịch Số ──
  {
    id: 'hoang-dao',
    label: 'Giờ Hoàng Đạo',
    context: 'Tra giờ hoàng đạo hôm nay, việc nên làm trong giờ đó.',
    centralSubject:
      'The master holds a minimal sundial card in one hand — a thin vertical gnomon casting one line-shadow across a shallow arc of twelve fine hour ticks, a small sun disc at one end and a crescent moon at the other — studying it with calm, patient attention.',
  },
  {
    id: 'ngay-tot',
    label: 'Ngày Tốt Trong Tháng',
    context: 'Liệt kê những ngày tốt trong tháng này, xếp theo từng ngày.',
    centralSubject:
      'The master holds up a calendar month grid — rows of small square cells in thin line, three or four cells marked by small gold dots scattered through the grid, a thin crescent moon above marking the lunar month — pointing at one marked cell with a pleased expression.',
  },
  {
    id: 'luc-nham',
    label: 'Lục Nhâm Giản',
    context: 'Tra một quẻ Lục Nhâm theo giờ và ngày cho việc đang canh cánh trong lòng.',
    centralSubject:
      'The master holds a small round divination disc (式盤) in both hands — an inner rotating dial with twelve fine branch ticks inside a slightly larger outer ring, offset as if just turned, a thin needle-pointer resting across it — studying it with calm, focused eyes.',
  },

  // ── Luận Giải — nhóm thầy/cô "laso" ──
  {
    id: 'gio-sinh',
    label: 'Xác Định Giờ Sinh',
    context: 'Lập 12 lá số theo 12 giờ, thu hẹp dần về đúng giờ sinh.',
    centralSubject:
      'The master holds a thin clock-face ring up with both hands, divided into twelve slim hour segments, eleven fading toward transparency and exactly one drawn solid and emphasized, a small hourglass resting at its very center, studying it with careful, methodical focus.',
  },
  {
    id: 'laso',
    label: 'Luận Giải Lá Số',
    context:
      'Đọc trọn 24 phần lá số Tử Vi Đẩu Số: cung, đại vận, cách cục, điểm mạnh yếu — bản luận giải đầy đủ nhất.',
    centralSubject:
      'The master holds up a large circular Tử Vi 12-palace chart with both hands, a bright star glyph glowing softly in one palace, tracing it slowly with one finger as if mid-explanation to someone just out of frame, calm, warmly wise expression.',
  },
  {
    id: 'chu-trinh-cuoc-doi',
    label: 'Chu Trình Cuộc Đời',
    context: 'Đọc trọn các giai đoạn một đời người qua lá số, từ trẻ đến già.',
    centralSubject:
      'The master holds up a single spiral chart with both hands, winding outward from one still point through four gentle turns, growing slightly wider with each turn, five small tick marks spaced along its path marking life stages, tracing the spiral outward with one finger, warm and thoughtful expression, as if mid-explanation.',
  },
  {
    id: 'tu-binh',
    label: 'Tử Bình Bát Tự',
    context: 'Lập bát tự, đọc Nhật Can, Dụng Thần, Cách Cục, Đại Vận.',
    centralSubject:
      'The master holds a small tray bearing four slim vertical stelae side by side, plain rectangular columns of equal height evenly spaced, a small five-element ring resting at their base, thin horizontal tick marks partway up each column, studying the tray with calm, dignified focus.',
  },
  {
    id: 'van-han-nam',
    label: 'Vận Hạn 12 Tháng Tới',
    context: 'Xem đúng 12 tháng tới: cung hạn, sao, cách cục của từng tháng.',
    centralSubject:
      'The master holds up a thin ring chart with both hands, divided into twelve slim monthly segments, one emphasized with a small gold star, a faint spiral arrow tracing once around showing the months in sequence, pointing at the emphasized month while explaining.',
  },
  {
    id: 'chan-dung-tien-kiep',
    label: 'Chân Dung Tiền Kiếp',
    context: 'Nhận một chân dung và câu chuyện một đời từ chính lá số.',
    centralSubject:
      'The master holds up a small round portrait frame with both hands, showing a soft silhouette figure stepping gently out of a swirl of cloud motifs inside the frame — mystical but welcoming, never ghostly — studying it with a warm, knowing smile.',
  },
  {
    id: 'xem-lam-an',
    label: 'Xem Tuổi Làm Ăn',
    context: 'Chấm yếu tố hợp tác giữa bạn và người sắp làm ăn chung.',
    centralSubject:
      'The master holds a small balanced scale level in one hand, two soft simplified silhouette figures resting one on each side of the scale in perfect balance, studying it with a calm, confident, quietly optimistic expression.',
  },
  {
    id: 'nguoi-khac',
    label: 'Lá Số Người Khác',
    context: 'Nhận cẩm nang ứng xử với một người cụ thể qua lá số của họ.',
    centralSubject:
      'The master holds a small open book in one hand, a second smaller silhouette sketched softly on its page as the person being understood, pointing at the page with the other hand, warmly curious expression.',
  },
  {
    id: 'nhan-mach',
    label: 'Sổ Nhân Mạch',
    context: 'Xem cả đội đang thiếu kiểu người nào, ai với ai dễ va chạm.',
    centralSubject:
      'The master holds up a small round card showing a loose constellation of five to six simplified silhouette figures connected to one another by thin gold lines like a gently glowing network, one connection brighter than the rest, studying it with calm, attentive focus.',
  },
  {
    id: 'cong-so',
    label: 'Tử Vi Công Sở & Hướng Nghiệp',
    context: 'Đọc kiểu người ở chỗ làm và cả chặng đường sự nghiệp.',
    centralSubject:
      'The master holds a small card showing a simple two-winged official hat (烏紗帽) resting above a few ascending steps drawn in thin line, pointing at it with a confident, quietly encouraging expression.',
  },
  {
    id: 'xem-tuoi',
    label: 'Xem Tuổi Vợ Chồng',
    context: 'Chấm yếu tố tương hợp giữa hai lá số của hai người.',
    centralSubject:
      'The master holds up a small round card showing two soft simplified silhouette figures standing close together with a thin gold thread linking their joined hands, studying it with a warm, hopeful smile.',
  },
  {
    id: 'chan-dung-vo-chong',
    label: 'Chân Dung Vợ Chồng',
    context: 'Vẽ chân dung người bạn đời tương lai từ cung Phu Thê.',
    centralSubject:
      'The master holds up a small round portrait frame with both hands, showing a soft, gentle silhouette of a young couple standing close together inside the frame, faces not detailed — just enough to read as "the future partner" — studying it with a delighted, knowing smile.',
  },
  {
    id: 'duyen-no-tien-kiep',
    label: 'Duyên Nợ Tiền Kiếp',
    context: 'Ghép hai lá số, tìm mối duyên kiếp trước giữa hai người.',
    centralSubject:
      'The master holds up a small round card showing two soft simplified silhouette figures standing a little apart, a single thin gold thread looping gently between their hands, a large soft crescent moon behind them referencing Nguyệt Lão, studying it with a warm, wistful, quietly hopeful expression.',
  },
  {
    id: 'xem-tuoi-sinh-con',
    label: 'Xem Tuổi Sinh Con',
    context: 'Tra năm sinh con hợp địa chi của cả bố và mẹ.',
    centralSubject:
      'The master holds a small card showing a simple cradle silhouette flanked by two small parent silhouettes both looking down at it, studying it with a warm, quietly joyful expression.',
  },
  {
    id: 'day-con',
    label: 'Dạy Con Theo Lá Số',
    context: 'Đọc con tiếp thu kiểu nào, kỷ luật nào phản tác dụng với con.',
    centralSubject:
      'The master holds a small card showing a parent and small child silhouette looking up together toward a small star, pointing at the star with a gentle, encouraging expression.',
  },
  {
    id: 'huong-nghiep-tre',
    label: 'Hướng Nghiệp Sớm Cho Con',
    context: 'Gợi ý hoạt động nên cho con làm quen theo lứa tuổi.',
    centralSubject:
      'The master holds a small card showing a child silhouette standing at a point where three thin paths diverge, each ending in one small plain icon (a book, a brush, a gear), pointing at the paths with a warm, encouraging expression.',
  },

  // ── Mệnh Lý — nhóm thầy/cô "menh-ly" ──
  {
    id: 'nap-am',
    label: 'Nạp Âm Ngũ Hành',
    context: 'Tra mệnh nạp âm, hành, màu và hướng hợp theo năm sinh.',
    centralSubject:
      'The master holds up a small ring card with both hands, showing five small linked glyphs — a plain circle (Kim), a slim branch (Mộc), a wave line (Thủy), a flame outline (Hỏa), a square (Thổ) — arranged evenly around one shared midpoint with thin connecting lines forming the generating cycle, one glyph subtly emphasized, studying it with calm, attentive focus.',
  },
  {
    id: 'ngu-hanh-ten',
    label: 'Ngũ Hành Tên',
    context: 'Chấm điểm ngũ hành từng chữ trong tên, hợp hay khắc mệnh.',
    centralSubject:
      'The master holds a small card showing a short vertical column of three or four thin abstract calligraphy strokes (suggesting written characters without forming real ones), each stroke marked at its base by one tiny five-element glyph, a thin scale-like balance line beneath, studying it with quiet focus.',
  },
  {
    id: 'so-dep',
    label: 'Xem Số Đẹp',
    context: 'Chấm điểm số điện thoại/số đẹp bằng Bát Tinh, Quẻ Dịch, Ngũ Hành.',
    centralSubject:
      'The master holds a small card showing a short row of small abstract numeral-like glyphs (clean geometric marks, not real digits) sitting above one tiny three-bar trigram mark, a thin ring of scoring tick marks around the row, studying it with a pleased, appraising expression.',
  },
  {
    id: 'tuong-hop',
    label: 'Tương Hợp Tuổi',
    context: 'Xét nhanh hai tuổi có hợp nhau hay không, chỉ cần năm sinh.',
    centralSubject:
      'The master holds two small zodiac-branch tokens, one in each hand, facing each other — each a plain rounded tile bearing one tiny abstract animal-silhouette mark, no realistic detail — a faint ring of twelve branch ticks visible behind them, studying them with a thoughtful, comparing expression.',
  },

  // ── Phong Thủy — nhóm thầy/cô "phong-thuy" ──
  {
    id: 'bat-trach',
    label: 'Hướng Bát Trạch',
    context: 'Tính mệnh quái và hướng nhà hợp theo Bát Trạch.',
    centralSubject:
      'The master holds a round compass marked with eight short even tick marks around its rim in one hand, the other hand resting on a small simple house model (plain roofline over a rectangle) beside her, pointing toward one favourable direction with a confident smile. No ring of trigram bars, nothing resembling a national flag.',
  },
  {
    id: 'kim-lau',
    label: 'Kim Lâu & Tam Tai',
    context: 'Kiểm tra tuổi có phạm Kim Lâu, Hoang Ốc hay Tam Tai không.',
    centralSubject:
      'The master holds a small card showing a house silhouette (plain roofline over a rectangle) sitting inside one protective thin ring with a light gap marking a single "watch" point rather than a warning, a thin ring of twelve faint year-ticks surrounding it, studying it with a calm, attentive expression.',
  },
  {
    id: 'phong-thuy',
    label: 'Phong Thủy Nội Thất',
    context: 'Chụp ảnh phòng, nhận phân tích phong thủy theo Bát Trạch và Ngũ Hành.',
    centralSubject:
      'The master holds a simple room floor-plan card with both hands (a plain rectangle with one door gap and a couple of thin furniture rectangles inside), overlaid by a light compass rose radiating from its centre — plain tick marks only — studying it with focused, practical attention.',
  },
  {
    id: 'ban-lam-viec',
    label: 'Phong Thủy Bàn Làm Việc',
    context: 'Chụp ảnh bàn làm việc, xem cách kê có đang cản đường thăng tiến.',
    centralSubject:
      'The master holds a round wooden Luo Pan compass out above a small simple desk-and-chair model resting nearby, studying the desk placement with focused, practical curiosity.',
  },
  {
    id: 'cua-hang-phong-thuy',
    label: 'Phong Thủy Cửa Hàng & VP',
    context: 'Chụp ảnh cửa hàng, xem cách bày biện có đang cản khách vào.',
    centralSubject:
      'The master holds a small card showing a simple shopfront silhouette (a thin awning line over an open doorway gap) with a light compass rose radiating from just inside the doorway, faint footstep-like tick marks leading toward it, studying it with calm, practical focus.',
  },
  {
    id: 'phong-thuy-render',
    label: 'Render Phòng Phong Thủy',
    context: 'Xem trước ảnh dựng phòng sau khi sửa theo phong thủy.',
    centralSubject:
      'The master holds a small card showing a room outline split by one thin vertical line into two halves — the left half plain and empty, the right half holding the same room with a couple of small furniture rectangles neatly placed, a small arrow curling from left to right — studying it with a pleased, satisfied expression.',
  },

  // ── Xem Tướng — nhóm thầy/cô "xem-tuong" ──
  {
    id: 'dien-tuong',
    label: 'Diện Tướng',
    context: 'Đọc nhân tướng học tổng thể từ ảnh khuôn mặt.',
    centralSubject:
      'The master holds up a small round hand-mirror-shaped card showing a simple face outline overlaid with a light grid of the twelve traditional face-reading zones (十二宫), each zone left blank, studying it with a calm, attentive expression.',
  },
  {
    id: 'nhan-tuong',
    label: 'Nhãn Tướng',
    context: 'Đọc tướng mắt theo Liễu Trang Thần Tướng từ ảnh khuôn mặt.',
    centralSubject:
      'The master holds a small card showing one large, softly gazing eye drawn in clean line art (almond outline, single-line iris, no realistic lashes), one thin brow-arc above it standing in for a crescent moon, studying it with a knowing, gentle smile.',
  },
  {
    id: 'thu-tuong',
    label: 'Thủ Tướng',
    context: 'Đọc chỉ tay theo Ngũ Hành Hình Tướng từ ảnh bàn tay.',
    centralSubject:
      'The master gently holds a small card showing a simplified open palm outline, faceless and plain, three thin curving lines traced across it standing for the head, heart and life lines, a small five-element glyph resting at the base of the wrist, studying it with calm, careful attention.',
  },
  {
    id: 'thanh-tuong',
    label: 'Thanh Tướng',
    context: 'Ghi âm giọng nói, xem giọng hợp nghề nào — kể cả bản đọc chuyên sâu (Thanh Tướng Pro).',
    centralSubject:
      'The master holds a small card showing three thin concentric sound-wave arcs radiating gently outward from a small mouth-shaped mark, tilting her head as if listening closely, warm, attentive expression.',
  },
  {
    id: 'khi-sac',
    label: 'Khí Sắc',
    context: 'Đọc khí sắc trên khuôn mặt, luận vận khí 1 đến 3 tháng tới.',
    centralSubject:
      'The master holds a small round card showing a simple face silhouette softly wrapped by a swirling qi-cloud line drifting up around it like rising mist, studying it with a bright, quietly serene expression — the picture of good complexion and good fortune.',
  },

  // ── Phong Cách AI — nhóm thầy/cô "phong-cach-ai" ──
  {
    id: 'da-lieu-ai',
    label: 'Da Liệu Toàn Diện',
    context: 'Soi ảnh da, chỉ ra những vùng đang có vấn đề cần chú ý.',
    centralSubject:
      'The master holds up a small round hand-mirror-shaped card showing a simple face outline marked only by a soft, sparse dot-grid pattern (a few dots gently brighter, no realistic skin texture), studying it with a calm, quietly confident expression.',
  },
  {
    id: 'kieu-toc-phan-tich',
    label: 'Phân Tích & Thử Kiểu Tóc',
    context: 'Chấm khuôn mặt hợp kiểu tóc nào, thử ngay kiểu mới lên ảnh thật.',
    centralSubject:
      'The master holds a small pair of scissors in one hand and gestures with the other toward a small card showing one elegant flowing hair-curl caught mid-motion, bright, playful, quietly delighted expression.',
  },
  {
    id: 'mau-sac-hop-menh',
    label: 'Màu Sắc Hợp Mệnh',
    context: 'Gợi ý những màu hợp mệnh theo ngũ hành.',
    centralSubject:
      'The master holds a small hand-fan half-open, its ribs drawn as five thin lines each tipped with one tiny five-element glyph instead of colour, like a colour wheel reduced to line art, studying it with a pleased, thoughtful expression.',
  },
  {
    id: 'personal-color',
    label: 'Personal Color',
    context: 'Xác định tông da hợp mùa màu nào trong 4 mùa, thử ngay lên ảnh.',
    centralSubject:
      'The master holds a small round card divided by one thin line into warm and cool halves — a small sun glyph on one side, a small crescent moon glyph on the other — comparing the two sides with a bright, curious, quietly pleased expression.',
  },
  {
    id: 'trang-diem-phan-tich',
    label: 'Phân Tích & Thử Trang Điểm',
    context: 'Gợi ý lối trang điểm hợp gương mặt, thử ngay lên ảnh thật.',
    centralSubject:
      'The master holds a small slim makeup brush in one hand, tracing a thin curved line in the air like a brush stroke, warm, radiant, quietly delighted expression.',
  },
  {
    id: 'trang-phuc-theo-ngay',
    label: 'Trang Phục & Thử Đồ',
    context: 'Gợi ý trang phục hôm nay hợp với vận của bạn, thử ngay lên ảnh thật.',
    centralSubject:
      'The master holds a slim hanger with a flowing robe swaying gently from it in one hand, the other hand just reaching to touch its sleeve, bright, anticipatory, quietly pleased expression.',
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
 * Prompt cho `images/edits`, neo Minh Bảo qua `ANCHOR_IMAGE_PATH` CHỈ để giữ
 * phong cách vẽ (`edit2Prompt` xử lý phần STYLE) — nhân vật thật trong ảnh là
 * thầy/cô của nhóm (`master-groups.ts`), Minh Bảo KHÔNG xuất hiện. `t.centralSubject`
 * chỉ tả tư thế + deliverable, không lặp lại ngoại hình thầy/cô bằng chữ.
 */
export function buildToolAvatarPrompt(t: ToolAvatarSpec): string {
  const groupId = TOOL_TO_HERO_GROUP[resolveAvatarId(t.id)];
  const group = groupId ? MASTER_BY_ID[groupId] : undefined;
  if (!group) {
    throw new Error(
      `buildToolAvatarPrompt: tool "${t.id}" chưa có trong TOOL_TO_HERO_GROUP (master-groups.ts) — không biết dùng thầy/cô nào.`
    );
  }
  const extra = t.extraMotifs?.length ? `\nChi tiết thêm: ${t.extraMotifs.join('; ')}` : '';
  const subject = `The subject is ${group.master}. ${t.centralSubject}${extra}`;
  return edit2Prompt(
    [
      `Context: ${t.label} — ${t.context}`,
      ART_DIRECTION,
      COMPOSITION,
      `CENTRAL SUBJECT (IMPORTANT):\n\n${subject}`,
      DO_NOT,
    ].join('\n\n---\n\n')
  );
}
