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
// ============================================================

/** Khối phong cách cố định — CHÍNH XÁC theo bản Henry duyệt, không diễn giải lại. */
const STYLE_PROMPT = `Traditional Chinese ink wash painting style, sumi-e inspired, ink and watercolor on aged parchment paper, elegant brushwork, minimal muted color palette (beige, ink gray, black, soft red accents), misty mountains, flowing clouds, traditional oriental landscape, cinematic composition, detailed ink texture, vintage paper grain, serene and atmospheric mood, semi-realistic illustration, harmonious blend of classical Chinese painting and modern digital art, high detail, soft lighting, wide panoramic composition.`;

const NEGATIVE = `Avoid: text, typography, logo, watermark, modern objects, neon colors, oversaturated, 3D render, cartoonish.`;

export interface HeroBannerSpec {
  /** tool_id — cũng là tiền tố tên file (<id>-NN.png). */
  id: string;
  label: string;
  /** Mô tả CẢNH cụ thể cho tool này — phần DUY NHẤT khác nhau giữa các tool. */
  scene: string;
}

/**
 * PILOT — mới chỉ có "laso" (Luận giải Tử Vi), theo đúng ảnh mẫu Henry đưa.
 * Chưa điền 51 tool còn lại: chờ chốt phong cách qua lượt duyệt này trước,
 * tránh sinh hàng loạt rồi phải vẽ lại nếu phong cách chưa đúng ý.
 */
export const HERO_BANNERS: HeroBannerSpec[] = [
  {
    id: 'laso',
    label: 'Luận giải Tử Vi',
    scene: `A wise elderly Chinese sage/scholar in flowing traditional robe with a yin-yang emblem on the sleeve, hair tied in a topknot held by a hairpin, long flowing beard, standing at the right side of the frame, holding an open scroll that displays a faint astrological chart grid, gazing down at it thoughtfully. A large soft red sun glows low behind layered misty mountain peaks in the middle distance. A small traditional pavilion sits atop a distant cliff, half-hidden in fog. A gentle waterfall and still water in the foreground. Twisted pine branches with clusters of needles frame the upper right corner of the composition. Wide open negative space on the left side of the frame for text overlay, kept simple and uncluttered (soft parchment sky, no dense mountain or foliage detail).`,
  },
];

export function buildHeroBannerPrompt(t: HeroBannerSpec): string {
  return [
    `Create a wide panoramic Chinese ink wash (sumi-e) landscape illustration.`,
    `Context: banner artwork for the tool "${t.label}" — the illustration is a calm, atmospheric backdrop; it will have short hook text overlaid on its left side later, so keep that side visually quiet.`,
    `SCENE:\n\n${t.scene}`,
    STYLE_PROMPT,
    NEGATIVE,
  ].join('\n\n---\n\n');
}
