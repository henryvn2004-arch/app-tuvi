// lib/media/hero-banner-prompt.ts
// ============================================================
// Dựng prompt sinh ẢNH BANNER CHÍNH (khối hook đầu trang tool, `.intro-card`)
// bằng gpt-image — tranh thủy mặc (sumi-e) toàn cảnh, khổ ngang, CÓ MÀU, khác
// hẳn `tool-avatar-prompt.ts` (icon vuông, line art vàng-navy, không màu).
//
// Phong cách lấy gần nguyên văn từ bản Henry duyệt (ChatGPT gợi ý, 2026-09-14):
// tranh thủy mặc + minh hoạ digital bán hiện thực, bảng màu trầm, núi mờ
// sương, bố cục điện ảnh khổ rộng. Xem `docs/nhat-ky/2026-09.md` mục "Banner
// chính hero — thủy mặc" cho ảnh mẫu đã duyệt.
//
// 🔑 BANNER DÙNG CHUNG THEO NHÓM, không vẽ riêng từng tool (51 tool vẽ riêng
// là tốn cả tiền lẫn công viết cảnh, mà nhiều tool trong cùng một nhánh cổ
// pháp không khác nhau đủ để cần ảnh riêng — chốt Henry 2026-09-14). Mỗi
// NHÓM có một nhân vật/đạo cụ đặc trưng đúng bản chất nhóm đó (Tử Vi cầm lá
// số, Bát Tự xếp tứ trụ, Thần Số Học tính toán con số...); tool lẻ tra
// `TOOL_TO_HERO_GROUP` (dùng LẠI alias `TOOL_AVATAR_ALIAS` của
// tool-avatar-prompt.ts — một nguồn alias DUY NHẤT, không lặp bảng lệch tên).
// ============================================================

import { TOOL_AVATAR_ALIAS } from './tool-avatar-prompt';

/** Khối phong cách cố định — CHÍNH XÁC theo bản Henry duyệt, không diễn giải lại. */
const STYLE_PROMPT = `Traditional Chinese ink wash painting style, sumi-e inspired, ink and watercolor on aged parchment paper, elegant brushwork, minimal muted color palette (beige, ink gray, black, soft red accents), misty mountains, flowing clouds, traditional oriental landscape, cinematic composition, detailed ink texture, vintage paper grain, serene and atmospheric mood, semi-realistic illustration, harmonious blend of classical Chinese painting and modern digital art, high detail, soft lighting, wide panoramic composition.`;

const NEGATIVE = `Avoid: text, typography, logo, watermark, modern objects, neon colors, oversaturated, 3D render, cartoonish.`;

export interface HeroBannerGroupSpec {
  /** id nhóm — cũng là tiền tố tên file (<id>-NN.png) trong Storage. */
  id: string;
  label: string;
  /** Mô tả CẢNH đặc trưng của nhóm — phần DUY NHẤT khác nhau giữa các nhóm. */
  scene: string;
}

/**
 * 11 nhóm phủ đủ 52 tool đang bật (đối chiếu `TOOL_AVATARS`,
 * tool-avatar-prompt.ts) — mỗi nhóm một nhân vật/đạo cụ đúng bản chất cổ
 * pháp của nhóm, cùng khung bố cục (nhân vật bên phải, mặt trời/trăng mờ sau
 * núi, đình nhỏ trên vách đá, cành thông góc phải, khoảng trống bên trái để
 * chèn chữ) để cả bộ đồng nhất phong cách dù khác cảnh.
 */
export const HERO_BANNER_GROUPS: HeroBannerGroupSpec[] = [
  {
    id: 'laso',
    label: 'Tử Vi Đẩu Số (lá số 12 cung)',
    scene: `A wise elderly Chinese sage/scholar in flowing traditional robe with a yin-yang emblem on the sleeve, hair tied in a topknot held by a hairpin, long flowing beard, standing at the right side of the frame, holding an open scroll that displays a faint astrological chart grid, gazing down at it thoughtfully. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. A gentle waterfall and still water in the foreground. Twisted pine branches with clusters of needles frame the upper right corner of the composition. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered (soft parchment sky, no dense mountain or foliage detail).`,
  },
  {
    id: 'tu-binh',
    label: 'Bát Tự / Tử Bình (âm dương ngũ hành, tứ trụ)',
    scene: `A wise Chinese scholar in flowing traditional robe, seated at a low stone table at the right side of the frame, arranging four tall bamboo slips upright in a row (representing the Four Pillars), one hand placing a small yin-yang token beside them. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học (tính toán con số)',
    scene: `A young Chinese scholar in traditional robe, standing at the right side of the frame, holding an abacus-like counting frame with faint glowing numeral marks along its rods, gazing down in quiet calculation. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. A gentle waterfall and still water in the foreground. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch / Mai Hoa / Kỳ Môn / Lục Nhâm (gieo quẻ)',
    scene: `An elderly Chinese sage in flowing robe, seated at the right side of the frame, casting three bronze coins onto a low table where a faint hexagram of broken and unbroken lines glows softly above it. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'phong-thuy',
    label: 'Phong Thủy / Bát Trạch / Kim Lâu (la bàn, nhà cửa)',
    scene: `A Chinese geomancer in traditional robe, standing at the right side of the frame, holding a round wooden Luo Pan compass out before him, studying its dial. A faint line-drawing of a house rooftop rests among the mist behind him. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'xem-tuong',
    label: 'Nhân Tướng Học (soi mặt, soi tay)',
    scene: `A Chinese physiognomy master in traditional robe, standing at the right side of the frame, holding a small round bronze mirror up before him, studying a reflection with a thoughtful gaze. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'chiem-tinh-tay',
    label: 'Chiêm Tinh Phương Tây (bản đồ sao)',
    scene: `An elegant robed astrologer standing at the right side of the frame beneath a night sky, holding an antique brass astrolabe up toward a faint zodiac wheel of stars glowing above. A large soft crescent moon glows low behind layered misty mountain peaks in the middle distance, faint constellation dots scattered across the upper sky. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'dat-ten-lich',
    label: 'Đặt Tên / Chọn Ngày / Lịch Số (bút lông, lịch)',
    scene: `A Chinese scholar in traditional robe, seated at a low table at the right side of the frame, brush in hand, pausing mid-stroke above an open scroll bearing a few elegant calligraphy characters, a small calendar page resting nearby. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'menh-ly',
    label: 'Mệnh Lý tra cứu (nạp âm, ngũ hành tên, số đẹp, tương hợp)',
    scene: `A Chinese scholar in traditional robe, standing at the right side of the frame, one hand extended with five small glowing tokens (representing the five elements: metal, wood, water, fire, earth) hovering in a gentle circle above the palm. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'phong-cach-ai',
    label: 'Phong Cách & Diện Mạo (soi ảnh, thử kiểu)',
    scene: `An elegant young woman in flowing traditional robe, standing at the right side of the frame before a tall standing bronze mirror, gently touching her own reflection's cheek with a soft, curious expression. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
  },
  {
    id: 'boi-bai',
    label: 'Bói Bài (Tarot, Oracle, Bài Tây)',
    scene: `An elegant fortune teller in flowing traditional robe, seated at a low table at the right side of the frame, fanning out a small hand of ornate cards face-down, one card just being drawn. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. Twisted pine branches frame the upper right corner. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered.`,
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

export function buildHeroBannerPrompt(g: HeroBannerGroupSpec): string {
  return [
    `Create a wide panoramic Chinese ink wash (sumi-e) landscape illustration.`,
    `Context: banner artwork for the "${g.label}" group of tools — the illustration is a calm, atmospheric backdrop shared by every tool in this group; it will have short hook text overlaid on its left side later, so keep that side visually quiet.`,
    `SCENE:\n\n${g.scene}`,
    STYLE_PROMPT,
    NEGATIVE,
  ].join('\n\n---\n\n');
}
