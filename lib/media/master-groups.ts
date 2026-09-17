// lib/media/master-groups.ts
// ============================================================
// Mô tả 11 "thầy/cô" luận giải (nhân vật CHÍNH, khác Minh Bảo) — NGUỒN DUY
// NHẤT, dùng chung bởi `hero-banner-prompt.ts` (cảnh banner ngang) VÀ
// `tool-avatar-prompt.ts` (icon vuông — thầy/cô cầm deliverable của từng
// tool, chốt Henry 2026-09-17: "avatar dùng chính nhân vật ông thầy/bà cô
// xem... cầm cái deliverable của từng tool giải thích").
//
// Đặt Ở MODULE RIÊNG (không phải trong hero-banner-prompt.ts hay
// tool-avatar-prompt.ts) để tránh circular import — hero-banner-prompt.ts
// vẫn import `TOOL_AVATAR_ALIAS` từ tool-avatar-prompt.ts, nên nếu đặt ở một
// trong hai file đó thì file kia import ngược lại sẽ vòng (bài học đã cắn với
// `ANCHOR_IMAGE_PATH`, xem `webtoon-style.ts`).
//
// Mỗi `master` viết KHÔNG dùng đại từ he/she (luôn "the master") để ghép tự
// nhiên vào bất kỳ ngữ cảnh nào (banner tả hành động cụ thể, avatar tả đang
// cầm deliverable khác nhau) mà không lệch giống.
// ============================================================

export interface MasterGroupSpec {
  /** id nhóm — khớp `HERO_BANNER_GROUPS.id` (hero-banner-prompt.ts). */
  id: string;
  label: string;
  /** Mô tả tuổi, giới tính, trang phục, thần thái — không dùng đại từ he/she. */
  master: string;
}

export const MASTER_GROUPS: MasterGroupSpec[] = [
  {
    id: 'laso',
    label: 'Tử Vi Đẩu Số (lá số 12 cung)',
    master:
      'an elderly Vietnamese man with a warm, kind, round "phúc hậu" face (gentle smiling eyes, soft rosy cheeks), short neatly trimmed white beard and moustache (not a long dramatic wizard beard), white hair mostly covered by a simple dark khăn đóng (traditional Vietnamese turban-style headwrap), wearing a simple dark brown áo the (traditional Vietnamese long tunic) — a distinctly Vietnamese scholar look, not Chinese, calm and warmly wise expression',
  },
  {
    id: 'tu-binh',
    label: 'Bát Tự / Tử Bình (âm dương ngũ hành, tứ trụ)',
    master:
      'an elderly Vietnamese man in his seventies, full white hair and a short trimmed white beard, a warm dignified "phúc hậu" expression, wearing a simple dark forest-green traditional Vietnamese áo the — old-fashioned in style',
  },
  {
    id: 'than-so-hoc',
    label: 'Thần Số Học (tính toán con số)',
    master:
      'an elderly Vietnamese man in his seventies, full white hair combed neatly back, a short trimmed white moustache, a warm attentive "phúc hậu" expression, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing',
  },
  {
    id: 'kinh-dich',
    label: 'Kinh Dịch / Mai Hoa / Kỳ Môn / Lục Nhâm (gieo quẻ)',
    master:
      'a calm, mysterious elderly Vietnamese woman in her sixties, full white hair loosely tied back in a low bun, a serene knowing expression, wearing a simple deep indigo-purple traditional áo dài — old-fashioned in style',
  },
  {
    id: 'phong-thuy',
    label: 'Phong Thủy / Bát Trạch / Kim Lâu (la bàn, nhà cửa)',
    master:
      'a confident, practical-looking elderly Vietnamese man in his sixties, full white hair combed neatly back, a warm reassuring smile, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing',
  },
  {
    id: 'xem-tuong',
    label: 'Nhân Tướng Học (soi mặt, soi tay)',
    master:
      'a warm elderly Vietnamese woman ("bà") in her sixties, kind round "phúc hậu" face, silver hair neatly rolled into a small bun, wearing a simple soft brown áo bà ba',
  },
  {
    id: 'chiem-tinh-tay',
    label: 'Chiêm Tinh Phương Tây (bản đồ sao)',
    master:
      'an elegant elderly Vietnamese woman in her sixties, full white hair swept back neatly, a calm dreamy expression, wearing a simple flowing dark teal traditional áo dài with subtle star-like embroidery — old-fashioned in style',
  },
  {
    id: 'dat-ten-lich',
    label: 'Đặt Tên / Chọn Ngày / Lịch Số (bút lông, lịch)',
    master:
      'a plump, warm-faced Vietnamese grandmother in her sixties, silver hair in a simple bun, a cheerful "phúc hậu" smile, wearing a simple soft brown áo bà ba — visually distinct from the other older characters (rounder, softer, cheerier)',
  },
  {
    id: 'menh-ly',
    label: 'Mệnh Lý tra cứu (nạp âm, ngũ hành tên, số đẹp, tương hợp)',
    master:
      'a warm, kind-faced elderly Vietnamese woman in her sixties, full white hair neatly tied back, a gentle motherly "phúc hậu" expression, wearing a simple dark indigo traditional áo dài — old-fashioned in style',
  },
  {
    id: 'phong-cach-ai',
    label: 'Phong Cách & Diện Mạo (soi ảnh, thử kiểu)',
    master:
      'a warm elderly Vietnamese woman in her sixties, full white hair neatly rolled into a small bun, a friendly encouraging smile, wearing a simple soft brown áo dài — old-fashioned in style, with a keen eye for what suits people',
  },
  {
    id: 'boi-bai',
    label: 'Bói Bài (Tarot, Oracle, Bài Tây)',
    master:
      'a striking elderly Vietnamese woman in her sixties, full white hair partly wrapped in a dark patterned headscarf, warm mysterious eyes, wearing a flowing dark red and gold shawl over simple traditional clothing — a distinctive, old-fashioned fortune-teller look',
  },
];

export const MASTER_BY_ID: Record<string, MasterGroupSpec> = Object.fromEntries(
  MASTER_GROUPS.map((g) => [g.id, g])
);

/**
 * tool_id (đã resolve alias qua `resolveAvatarId`) → id nhóm thầy/cô. PHỦ ĐỦ
 * 52 tool trong `TOOL_AVATARS` (tool-avatar-prompt.ts) — tool nào thiếu ở đây
 * thì `resolveHeroGroup`/`buildToolAvatarPrompt` phải ném lỗi rõ ràng thay vì
 * âm thầm rơi về nhóm sai.
 */
export const TOOL_TO_HERO_GROUP: Record<string, string> = {
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
