// lib/media/hero-banner-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH BANNER CHÍNH (khối hook đầu trang tool, `.intro-card`)
// bằng gpt-image — webtoon Ghibli/chibi, khổ ngang, CÓ MÀU.
//
// 🔴 Reskin 2026-09-16 (Henry): thay hẳn hệ "đạo sĩ Tàu tranh thuỷ mặc" cũ
// bằng bộ nhân vật MỚI theo đúng nguyên tắc đã chốt:
//   - Minh Bảo CỐ ĐỊNH, có mặt ở MỌI banner — luôn là nhân vật PHỤ (một hoạt
//     động nhỏ riêng, khác Minh Bảo chính đang luận giải), neo bằng ẢNH
//     (`images/edits` + ANCHOR_IMAGE_PATH) để không trôi nhận diện.
//   - Thầy/cô luận giải (nhân vật CHÍNH) đổi theo TỪNG NHÓM — LUÔN lớn tuổi,
//     tóc bạc, người Việt, phong cách xưa (áo the/áo dài/áo bà ba — không
//     phải robe Tàu). Phân biệt 11 nhóm bằng giới tính/trang phục/đạo cụ/
//     phòng, KHÔNG bằng tuổi tác — mọi thầy/cô đều già.
//   - Khách (1 hoặc 2 người tuỳ nhóm — `menh-ly` có tool `tuong-hop` xem hợp
//     tuổi nên 2 khách, còn lại 1 khách) trang phục HIỆN ĐẠI — đối lập có chủ
//     ý với không gian cổ của thầy/cô và Minh Bảo.
// Bộ ảnh mẫu đã duyệt: `scripts/gen-webtoon-sample.mjs` (`--only banerLasoOldManV2,…`),
// ảnh nằm ở `.webtoon-sample/` (gitignored, không commit) — xem
// `docs/reskin-webtoon/PLAN.md` cho tình trạng từng nhóm.
//
// 🔑 BANNER DÙNG CHUNG THEO NHÓM, không vẽ riêng từng tool (51 tool vẽ riêng
// là tốn cả tiền lẫn công viết cảnh — chốt Henry 2026-09-14, VẪN giữ nguyên
// ở đợt reskin này). Tool lẻ tra `TOOL_TO_HERO_GROUP` (dùng LẠI alias
// `TOOL_AVATAR_ALIAS` của tool-avatar-prompt.ts — một nguồn alias DUY NHẤT).
// ============================================================

import { TOOL_AVATAR_ALIAS } from './tool-avatar-prompt';
import { edit2Prompt } from './webtoon-style';

/**
 * Ảnh NEO nhận diện Minh Bảo cho `images/edits` — đường DUY NHẤT giữ đúng
 * khuôn mặt giữa 11 bức (tả bằng chữ thì model dựng lại từ đầu mỗi lượt và
 * trôi nhân vật, đã cắn ở character bible V1). Dùng LẠI đúng asset đã commit
 * (không phải file PNG gốc `.webtoon-sample/mascotV2.png`, không nằm trong
 * repo) — webp nén vẫn đủ nét cho images/edits, không cần bản gốc.
 */
export const ANCHOR_IMAGE_PATH = 'public/mascot/hero-scene-v2.webp';

export interface HeroBannerGroupSpec {
  /** id nhóm — cũng là tiền tố tên file (<id>-NN.png) trong Storage. */
  id: string;
  label: string;
  /** Mô tả CẢNH đặc trưng của nhóm — phần DUY NHẤT khác nhau giữa các nhóm. */
  scene: string;
}

/**
 * 11 nhóm phủ đủ 52 tool đang bật (đối chiếu `TOOL_AVATARS`,
 * tool-avatar-prompt.ts). Mỗi `scene` viết cho `images/edits` (đã neo Minh
 * Bảo qua ẢNH, không phải tả lại bằng chữ) — xem `edit2Prompt` trong
 * `webtoon-style.ts`.
 */
export const HERO_BANNER_GROUPS: HeroBannerGroupSpec[] = [
  {
    id: 'laso',
    label: 'Tử Vi Đẩu Số (lá số 12 cung)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting on the floor near a cream-and-orange cat, gently playing with it, cheerful and relaxed, clearly enjoying himself and not part of the fortune-reading conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly VIETNAMESE man with a warm, kind, round "phúc hậu" face (gentle smiling eyes, soft rosy cheeks), short neatly trimmed white beard and moustache (not a long dramatic wizard beard), white hair mostly covered by a simple dark khăn đóng (traditional Vietnamese turban-style headwrap), wearing a simple dark brown áo the (traditional Vietnamese long tunic) — a distinctly Vietnamese scholar look, not Chinese. He is seated cross-legged at a low wooden desk on the right side of the frame. A long scroll lies open flat on the desk, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it. He points gently at the chart with one hand, calm and warmly wise expression.
Facing him across the desk, a woman in her early thirties sits attentively, simple modern casual outfit, leaning in slightly, listening closely with a focused, engaged expression.
Setting: a cozy traditional study room — a large hanging scroll on the wall behind the desk showing a faint circular astrological diagram (no readable text), a short stack of old bound books on a low shelf with completely blank spines, a small warm oil lamp glowing on the desk as the brightest point in the frame.
Minh Bảo and the cat form a small charming vignette off to the side, visually separate from the old man and the woman at the desk.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no shelves, scrolls or clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'tu-binh',
    label: 'Bát Tự / Tử Bình (âm dương ngũ hành, tứ trụ)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, arranging four small smooth wooden blocks into his own little row, mimicking the old man's gesture, focused and pleased with himself, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly Vietnamese man in his seventies, full white hair and a short trimmed white beard, a warm dignified "phúc hậu" expression, wearing a simple dark forest-green traditional Vietnamese áo the — old-fashioned in style, visually distinct in color from the "laso" group's old man. He sits at a low wooden table on the right side of the frame, carefully arranging four tall bamboo slips upright in a row side by side (representing the Four Pillars), one hand placing a small round yin-yang token beside them.
Facing him across the table, a woman in her early thirties sits attentively, simple modern casual outfit, watching the bamboo slips with a focused, curious expression.
Setting: a quiet study room — a small plain tapestry with a faint bagua (eight-trigram) circular pattern on the wall behind him (no readable text or symbols), a stack of blank-spined books on a low shelf, soft warm daylight through a window.
Minh Bảo and his wooden blocks form a small charming vignette off to the side, visually separate from the old man and his guest.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học (tính toán con số)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting on a low stool, quietly stacking a few small smooth wooden number tiles into a little tower, focused and cheerful, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly Vietnamese man in his seventies, full white hair combed neatly back, a short trimmed white moustache, a warm attentive "phúc hậu" expression, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing. He sits at a low wooden desk on the right side of the frame, one hand resting on an abacus-like wooden counting frame with a few beads glowing faintly, the other pointing at a sheet of paper showing a few soft glowing numeral marks arranged in a simple grid — no readable digits or text.
Facing him across the desk, a woman in her early thirties sits attentively, simple modern casual outfit, leaning in slightly, listening closely with a focused, curious expression.
Setting: a tidy study corner — a small shelf with a few blank-covered notebooks stacked neatly, a potted plant, soft daytime light through a window.
Minh Bảo and his number tiles form a small charming vignette off to the side, visually separate from the old man and the woman at the desk.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no shelves or clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch / Mai Hoa / Kỳ Môn / Lục Nhâm (gieo quẻ)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, lying on his stomach on the floor, chin in his hands, watching three fireflies glow softly in a small glass jar beside him, quietly delighted, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a calm, mysterious elderly Vietnamese woman in her sixties, full white hair loosely tied back in a low bun, a serene knowing expression, wearing a simple deep indigo-purple traditional áo dài — old-fashioned in style. She sits at a low table on the right side of the frame, in the middle of casting three small bronze coins onto its surface — one coin still spinning — while a faint hexagram of six soft glowing horizontal lines (broken and unbroken) hovers gently above the table, no readable text or symbols.
Facing her across the table, a woman in her early thirties sits attentively, simple modern casual outfit, watching the coins with a focused, curious expression.
Setting: a quiet dim room at night, a single small candle providing warm flickering light, faint incense smoke curling upward, a plain dark wall behind her.
Minh Bảo and the firefly jar form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a wide open area of plain, dim wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'phong-thuy',
    label: 'Phong Thủy / Bát Trạch / Kim Lâu (la bàn, nhà cửa)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, kneeling beside a small wooden toy house, carefully placing a tiny toy tree next to it with a proud little smile, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a confident, practical-looking elderly Vietnamese man in his sixties, full white hair combed neatly back, a warm reassuring smile, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing. He sits at a low table on the right side of the frame, holding a round wooden Luo Pan compass out before him with both hands, studying its dial closely. On the table beside him sits a small simple architectural model of a tiled-roof house, no readable text anywhere.
Facing him across the table, a woman in her early thirties sits attentively, simple modern casual outfit, leaning in to look at the compass with a focused, curious expression.
Setting: a bright, practical daytime room — a small potted bamboo in the corner, a rolled-up house blueprint leaning against the wall (blank, no readable lines or text), soft late-morning light through a window.
Minh Bảo and his toy house form a small charming vignette off to the side, visually separate from the man and his guest.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'xem-tuong',
    label: 'Nhân Tướng Học (soi mặt, soi tay)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged, holding up a small round hand-mirror, making a silly face at his own reflection and giggling, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm elderly Vietnamese woman ("bà") in her sixties, kind round "phúc hậu" face, silver hair neatly rolled into a small bun, wearing a simple soft brown áo bà ba. She sits close to her guest on the right side of the frame, gently holding the guest's open palm in both of her hands, studying its lines with a knowing, gentle smile.
The guest: a woman in her early thirties, simple modern casual outfit, sitting attentively, palm resting in the old woman's hands, watching her face with a curious, slightly nervous smile.
Setting: a small warm sitting room — an antique standing mirror in the corner reflecting soft light, a woven basket of dried herbs, a small tray with two teacups on the low table beside them, soft afternoon light.
Minh Bảo and his hand-mirror form a small charming vignette off to the side, visually separate from the old woman and her guest.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'chiem-tinh-tay',
    label: 'Chiêm Tinh Phương Tây (bản đồ sao)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, lying on his back on a soft rug, pointing up at a few small glow-in-the-dark star stickers on the ceiling, eyes wide with wonder, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elegant elderly Vietnamese woman in her sixties, full white hair swept back neatly, a calm dreamy expression, wearing a simple flowing dark teal traditional áo dài with subtle star-like embroidery — old-fashioned in style. She sits at a small round table on the right side of the frame, holding an antique brass astrolabe up toward a faint circular zodiac wheel of soft glowing stars hovering above the table — no readable text or symbols.
Facing her across the table, a woman in her late twenties sits attentively, simple modern casual outfit, gazing up at the glowing star wheel with a delighted, curious expression.
Setting: a cozy room at night, a large window behind them showing a deep blue night sky scattered with a few faint stars, a small brass telescope standing in the corner, soft warm lamp light mixing with cool moonlight.
Minh Bảo and his ceiling stars form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a wide open area of plain night-sky or wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'dat-ten-lich',
    label: 'Đặt Tên / Chọn Ngày / Lịch Số (bút lông, lịch)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, kneeling at a tiny low stool, carefully dipping a small brush into a bowl of water and "painting" happily on a wet slate that leaves no lasting mark, tongue peeking out in concentration, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a plump, warm-faced Vietnamese grandmother in her sixties, silver hair in a simple bun, a cheerful "phúc hậu" smile, wearing a simple soft brown áo bà ba — visually distinct from the other older characters (rounder, softer, cheerier). She sits at a low desk on the right side of the frame, brush lifted just above an open scroll, about to write the very first stroke — the scroll paper is COMPLETELY BLANK, not one mark on it yet. A small calendar page with a few soft glowing dots rests nearby — no readable text or symbols anywhere on the desk.
Facing her across the desk, a woman in her late twenties sits attentively, simple modern casual outfit, watching the brush with a hopeful, curious expression, perhaps gently cradling a small wrapped gift (implying a baby-naming visit) in her lap.
Setting: a warm, tidy room — a small shelf of blank-spined books, a vase of fresh flowers, soft daytime light through a paper window.
Minh Bảo and his wet-slate painting form a small charming vignette off to the side, visually separate from the grandmother and her guest.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'menh-ly',
    label: 'Mệnh Lý tra cứu (nạp âm, ngũ hành tên, số đẹp, tương hợp)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged on the floor with an open picture book on his lap, quietly reading it with a calm, absorbed little smile, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm, kind-faced elderly VIETNAMESE woman in her sixties, full white hair neatly tied back, a gentle motherly "phúc hậu" expression, wearing a simple dark indigo traditional áo dài — old-fashioned in style, visually distinct from an old man (different gender, different room, different props). She sits at a low round wooden table on the right side of the frame, gently gesturing with one open hand toward a long scroll lying flat on the table, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it.
Facing her across the table, a young couple sits close together — this group covers a compatibility tool (checking if two people suit each other), so BOTH guests must be present: a woman in her late twenties in simple modern casual clothing, and a man of similar age beside her in simple modern casual clothing, their shoulders gently touching, both leaning in toward the scroll with warm, hopeful expressions.
Setting: a cozy traditional room, warmer and softer than a scholar's study — simple woven mats, a small vase of fresh flowers on the table, soft morning light through a paper window, a small warm lantern glowing nearby.
Minh Bảo and his book form a small charming vignette off to the side, visually separate from the woman and the couple at the table.
Leave a wide open area of plain, softly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'phong-cach-ai',
    label: 'Phong Cách & Diện Mạo (soi ảnh, thử kiểu)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, standing on tiptoe, draping a colorful silk ribbon over his own shoulder like a little cape, admiring himself with a playful grin, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm elderly Vietnamese woman in her sixties, full white hair neatly rolled into a small bun, a friendly encouraging smile, wearing a simple soft brown áo dài — old-fashioned in style, with a keen eye for what suits people. She stands beside a tall standing mirror on the right side of the frame, gently holding up a few soft fabric swatches and ribbons of different warm colors next to her guest's reflection, comparing them thoughtfully.
The guest: a woman in her mid-twenties, simple modern casual outfit, standing in front of the mirror, looking at her own reflection with a hopeful, curious smile.
Setting: a bright, airy modern room — a small clothes rack with a few plain, unlabeled garments, a vase of fresh flowers, large soft daylight through a window.
Minh Bảo and his ribbon form a small charming vignette off to the side, visually separate from the stylist and her guest.
Leave a wide open area of plain, brightly lit wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
  {
    id: 'boi-bai',
    label: 'Bói Bài (Tarot, Oracle, Bài Tây)',
    scene: `Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged, carefully building a small house of playing cards, holding his breath in concentration, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a striking elderly Vietnamese woman in her sixties, full white hair partly wrapped in a dark patterned headscarf, warm mysterious eyes, wearing a flowing dark red and gold shawl over simple traditional clothing — a distinctive, old-fashioned fortune-teller look. She sits at a small round table on the right side of the frame, fanning out a small hand of ornate but blank-faced cards, one card just being drawn and turned face-up (its face a soft glowing abstract pattern, no readable symbols or text).
Facing her across the table, a woman in her late twenties sits attentively, simple modern casual outfit, watching the drawn card with a hopeful, slightly nervous smile.
Setting: a cozy dim room, a single candle burning on the table as the brightest point, a richly patterned but plain-colored cloth draped over the table, soft shadows.
Minh Bảo and his card house form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a wide open area of plain, dim wall on the LEFT side of the frame — no clutter there — so hook text can be placed over it later.`,
  },
];

/**
 * tool_id → id nhóm banner. PHỦ ĐỦ 52 tool trong `TOOL_AVATARS`
 * (tool-avatar-prompt.ts) — tool nào thiếu ở đây thì `resolveHeroGroup` sẽ
 * ném lỗi thay vì âm thầm rơi về nhóm sai.
 */
const TOOL_TO_HERO_GROUP: Record<string, string> = {
  // ── Tử Vi Đẩu Số — mọi tool đọc/dùng lá số 12 cung ──
  'gio-sinh': 'laso',
  laso: 'laso',
  'chu-trinh-cuoc-doi': 'laso',
  'van-han-nam': 'laso',
  'chan-dung-tien-kiep': 'laso',
  'xem-lam-an': 'laso',
  'nguoi-khac': 'laso',
  'nhan-mach': 'laso',
  'cong-so': 'laso',
  'xem-tuoi': 'laso',
  'chan-dung-vo-chong': 'laso',
  'duyen-no-tien-kiep': 'laso',
  'xem-tuoi-sinh-con': 'laso',
  'day-con': 'laso',
  'huong-nghiep-tre': 'laso',
  'an-sao': 'laso',

  // ── Bát Tự / Tử Bình ──
  'tu-binh': 'tu-binh',

  // ── Thần Số Học ──
  'than-so-hoc': 'than-so-hoc',

  // ── Kinh Dịch & các thuật gieo quẻ ──
  'kinh-dich': 'kinh-dich',
  'mai-hoa': 'kinh-dich',
  'ky-mon': 'kinh-dich',
  'luc-nham': 'kinh-dich',

  // ── Phong Thủy / Bát Trạch / Kim Lâu ──
  'bat-trach': 'phong-thuy',
  'phong-thuy': 'phong-thuy',
  'ban-lam-viec': 'phong-thuy',
  'cua-hang-phong-thuy': 'phong-thuy',
  'phong-thuy-render': 'phong-thuy',
  'kim-lau': 'phong-thuy',

  // ── Nhân Tướng Học ──
  'dien-tuong': 'xem-tuong',
  'nhan-tuong': 'xem-tuong',
  'thu-tuong': 'xem-tuong',
  'thanh-tuong': 'xem-tuong',
  'khi-sac': 'xem-tuong',
  'but-tuong': 'xem-tuong',

  // ── Chiêm Tinh Phương Tây ──
  'ban-do-sao': 'chiem-tinh-tay',

  // ── Đặt Tên & Chọn Ngày & Lịch Số ──
  'dat-ten-dn': 'dat-ten-lich',
  'dat-ten-con': 'dat-ten-lich',
  'chon-ngay-tot': 'dat-ten-lich',
  'hoang-dao': 'dat-ten-lich',
  'ngay-tot': 'dat-ten-lich',

  // ── Mệnh Lý tra cứu (ngũ hành/số thuật khác, không phải Bát Tự đầy đủ) ──
  'nap-am': 'menh-ly',
  'ngu-hanh-ten': 'menh-ly',
  'so-dep': 'menh-ly',
  'tuong-hop': 'menh-ly',

  // ── Phong Cách AI / Diện mạo ──
  'da-lieu-ai': 'phong-cach-ai',
  'kieu-toc-phan-tich': 'phong-cach-ai',
  'mau-sac-hop-menh': 'phong-cach-ai',
  'personal-color': 'phong-cach-ai',
  'trang-diem-phan-tich': 'phong-cach-ai',
  'trang-phuc-theo-ngay': 'phong-cach-ai',

  // ── Bói Bài ──
  tarot: 'boi-bai',
  oracle: 'boi-bai',
  'boi-bai-tay': 'boi-bai',
};

const byId = new Map(HERO_BANNER_GROUPS.map((g) => [g.id, g]));

/**
 * tool_id/key bất kỳ (kể cả alias lệch tên trong SHELL_INTRO, dùng LẠI
 * `TOOL_AVATAR_ALIAS` — một nguồn alias DUY NHẤT với hệ avatar) → nhóm banner.
 * Ném lỗi rõ ràng nếu tool chưa khai — tốt hơn âm thầm rơi về nhóm sai.
 */
export function resolveHeroGroup(idOrKey: string): HeroBannerGroupSpec {
  // idOrKey có thể là ID NHÓM thẳng (route nhận cả ?group=) — tra trước khi
  // coi nó là tool_id, không thì 6/11 nhóm không trùng tên với tool nào
  // (xem-tuong, chiem-tinh-tay, dat-ten-lich, menh-ly, phong-cach-ai, boi-bai)
  // sẽ luôn ném lỗi dù gọi đúng ?group=<id nhóm>.
  const direct = byId.get(idOrKey);
  if (direct) return direct;

  const resolved = TOOL_AVATAR_ALIAS[idOrKey] || idOrKey;
  const groupId = TOOL_TO_HERO_GROUP[resolved];
  const group = groupId ? byId.get(groupId) : undefined;
  if (!group) {
    throw new Error(
      `resolveHeroGroup: "${idOrKey}" (resolved "${resolved}") không phải id nhóm và cũng chưa có trong TOOL_TO_HERO_GROUP.`
    );
  }
  return group;
}

/**
 * Prompt cho `images/edits` — LUÔN neo Minh Bảo qua ẢNH (`ANCHOR_IMAGE_PATH`),
 * không phải `images/generations` thuần nữa. Nơi gọi (route/script) chịu
 * trách nhiệm đọc file neo và gọi đúng endpoint `images/edits`.
 */
export function buildHeroBannerPrompt(g: HeroBannerGroupSpec): string {
  return edit2Prompt(g.scene);
}
