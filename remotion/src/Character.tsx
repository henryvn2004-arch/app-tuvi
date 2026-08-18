// remotion/src/Character.tsx
// ============================================================
// NHÂN VẬT SIGNATURE của Tử Vi Minh Bảo — vẽ bằng SVG, KHÔNG phải ảnh nhập.
//
// 🔑 VÌ SAO VẼ BẰNG CODE thay vì tải vector/sinh bằng model (đã cân ba đường):
//   · Nhất quán theo CẤU TRÚC, không nhờ tuyển chọn. Cùng một đoạn code thì
//     cùng nét, cùng tỉ lệ, cùng màu — không có cách nào lệch. Kho vector miễn
//     phí thì đo được 9 tác giả trong 50 kết quả; model sinh ảnh thì trôi
//     phong cách giữa các lượt gen.
//   · Nó CHUYỂN ĐỘNG được — xem mục CHUYỂN ĐỘNG bên dưới.
//   · 0đ vĩnh viễn · không giấy phép · không provenance · không Storage ·
//     không script nhập kho. Tư thế mới = một hàng số, không phải một asset.
//
// 📐 Hình dạng bám ĐÚNG bản brief: 3,5 đầu · đầu tròn · hai chấm mắt · KHÔNG có
// miệng (cảm xúc dồn vào tư thế) · thân bo tròn · nét bo tròn đồng nhất.
//
// ── 🔴 CHUYỂN ĐỘNG: vì sao bản đầu "boring", và vá ở đâu ───────────────────
// Bản đầu chỉ có ba thứ: tư thế TĨNH + nhún thở 6px + mờ dần lúc vào. Tức nhân
// vật vẫn là một BỨC HÌNH, chỉ khác là bức hình có nhấp nháy. Đúng nhận xét của
// Henry, và đúng chỗ đắt nhất bị bỏ phí: chọn vẽ bằng code CHÍNH LÀ để có
// chuyển động, mà lại không dùng.
//
// Nay bốn tầng, xếp theo mức đóng góp đo bằng mắt:
//   1. CHUYỂN TƯ THẾ (`fromPose` + `blend`) — sang cảnh mới thì nhân vật *đi
//      từ* tư thế cũ *sang* tư thế mới trong ~0,5s. Đây là tầng duy nhất KHÔNG
//      thể làm bằng ảnh nhập, và là thứ biến minh hoạ thành kể chuyện.
//   2. NHỊP RIÊNG TỪNG TƯ THẾ (`MOTIONS`) — vẫy tay thì tay vẫy thật, bước đi
//      thì hai chân thật sự sải luân phiên, quay lưng thì vừa đi vừa xa dần.
//   3. CHỚP MẮT — với gương mặt chỉ có hai chấm, đây là tín hiệu sống rẻ nhất
//      và mạnh nhất. Chu kỳ suy từ `t`, KHÔNG dùng `Math.random` (Remotion
//      render khung hình không theo thứ tự ⇒ ngẫu nhiên là nhấp nháy loạn).
//   4. THỞ — giữ lại, nhưng nay là nền chứ không phải toàn bộ.
//
// ⚠️ MỌI chuyển động phải là hàm THUẦN của `timeSec`. Không state, không ref,
// không random. Đây là ràng buộc của Remotion chứ không phải sở thích.
// ============================================================

import React from 'react';
import { BRAND } from './brand';
import { GLYPHS, isGlyph, type GlyphName } from './Glyphs';

/**
 * Bảng màu nhân vật.
 *
 * ⚠️ `accent` lấy ĐÚNG vàng thương hiệu của site (`--gold #C9A84C`) chứ không
 * phải bảng neon trong brief — Henry chốt "màu nhấn thì chọn màu theme của
 * site". Nhờ vậy nhân vật, vạch TopBar, chữ nhấn và triện đều cùng một vàng.
 */
export const CHAR = {
  body: '#FFFFFF',
  ink: '#0A0A0F',
  accent: BRAND.gold,
} as const;

/**
 * Hệ toạ độ nội bộ: gốc ở GIỮA HAI BÀN CHÂN, y tăng LÊN TRÊN.
 *
 * Chọn gốc ở chân chứ không ở tâm hình vì mọi tư thế đều đứng trên một mặt
 * đất — neo vào chân thì nhân vật không trôi lên xuống khi đổi tư thế.
 */
const HEAD_R = 100;
/** 3,5 đầu = 3,5 × đường kính đầu. Con số này lấy thẳng từ brief. */
const TOTAL_H = HEAD_R * 2 * 3.5;

const HEAD_CY = TOTAL_H - HEAD_R; // tâm đầu
const SHOULDER_Y = TOTAL_H - HEAD_R * 2 - 24;
const HIP_Y = SHOULDER_Y - 210;
const SHOULDER_X = 80;
const HIP_X = 58;

const ARM_1 = 96; // vai → khuỷu
const ARM_2 = 88; // khuỷu → bàn tay
const LEG_1 = 118; // hông → gối
const LEG_2 = 126; // gối → bàn chân

/** Bề dày nét viền tối — mỏng, chỉ đủ tách hai mảng trắng chồng nhau. */
const OUTLINE = 9;

const ARM_W = 44;
const LEG_W = 54;

/**
 * Một chi = hai đoạn thẳng nối bằng khớp tròn.
 *
 * `a1` = góc đoạn gốc, `a2` = góc đoạn ngọn — cả hai tính bằng ĐỘ, mốc 0 là
 * chỉ thẳng xuống, dương là xoay ra phía ngoài thân. Bên trái tự lật dấu nên
 * một bảng số dùng được cho cả hai bên.
 */
export type Limb = { a1: number; a2: number };

export type Pose = {
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
  /** Nghiêng cả thân (độ, dương = ngả sang phải). */
  lean?: number;
  /** Nghiêng riêng đầu — dùng cho tư thế nghi ngờ / lắng nghe. */
  headTilt?: number;
  /**
   * Dời đầu SO VỚI VAI (đơn vị nội bộ; `headDy` âm = thụt xuống giữa hai vai).
   *
   * 🔑 Đây là thứ DUY NHẤT tả được "cúi gằm". `crouch` hạ CẢ người nên hình
   * dạng không đổi — đo trên bảng đối chiếu thì tư thế `cui-dau` bản trước
   * trông y hệt đứng thẳng, đúng như Henry đã nhận xét. Còn `headTilt` chỉ
   * xoay một hình TRÒN nên gần như vô hình, nó chỉ dịch được hai chấm mắt.
   * Đầu phải THỤT XUỐNG và ĐỔ RA TRƯỚC thì mắt mới đọc ra là gục.
   */
  headDx?: number;
  headDy?: number;
  /** Nhún người lên/xuống (đơn vị nội bộ, dương = nhún xuống). */
  crouch?: number;
  /** Hướng mặt: trước (2 mắt) · nghiêng (1 mắt) · sau (không mắt). */
  face?: 'front' | 'side' | 'back';
  /** Mắt nhắm — dùng cho tĩnh tâm / thiền. */
  eyesClosed?: boolean;
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Dựng đường gấp khúc của một chi từ hai góc. */
function limbPoints(ox: number, oy: number, side: 1 | -1, l1: number, l2: number, limb: Limb) {
  const a1 = rad(limb.a1) * side;
  const a2 = rad(limb.a1 + limb.a2) * side;
  const x1 = ox + Math.sin(a1) * l1;
  const y1 = oy - Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a2) * l2;
  const y2 = y1 - Math.cos(a2) * l2;
  return {
    mid: [x1, y1] as const,
    end: [x2, y2] as const,
    /** Vector đơn vị khuỷu → bàn tay, để đẩy đạo cụ ra khỏi nắm tay. */
    dir: [Math.sin(a2), -Math.cos(a2)] as const,
    d: `M${ox},${oy} L${x1},${y1} L${x2},${y2}`,
  };
}

/**
 * 9 tư thế, tên khớp bản brief.
 *
 * 🔑 Đây là **từ vựng ĐÓNG**: kịch bản khai tên tư thế, không mô tả tự do. Nhờ
 * vậy phần "hình có hợp nội dung không" là một phép TRA BẢNG deterministic, 0đ
 * — và khi cổng 2 chấm thì nó so lời đọc với một cái tên cố định dùng lại ở
 * mọi clip, chứ không phải một câu tôi viết mới cho từng bức để tự tâng.
 *
 * ⚠️ Tư thế nào có nhịp riêng trong `MOTIONS` thì dáng ở đây phải là dáng
 * NGHỈ, để nhịp cộng lên trên. `hanh-dong` bản trước khai sẵn một bước sải rồi
 * lại cộng thêm dao động → chân dang quá rộng suốt cảnh, trông vướng. Nay dáng
 * nghỉ đứng thẳng, còn bước sải HOÀN TOÀN do `MOTIONS` sinh ra.
 */
export const POSES = {
  /** 1 · Chào / giới thiệu — một tay giơ cao (nhịp vẫy nằm ở MOTIONS). */
  chao: {
    armR: { a1: 155, a2: -25 },
    armL: { a1: 14, a2: 6 },
    legR: { a1: 7, a2: 2 },
    legL: { a1: 7, a2: 2 },
  },
  /**
   * 2 · Suy nghĩ — tay đỡ dưới cằm, đầu hơi nghiêng.
   *
   * ⚠️ Bàn tay KHÔNG chạm được đúng cằm và đó là giới hạn HÌNH HỌC, không phải
   * chọn sai số: vai ở x=80, cằm ở (0,500) — cách nhau 65 đơn vị, trong khi
   * cánh tay dài 96+88. Muốn chạm thật thì khuỷu phải gập vào giữa ngực và bị
   * thân che mất. Nên đặt tay ngay DƯỚI cằm, ngoài mép mặt — đúng lối mọi bộ
   * mascot phẳng vẫn làm, và ở cỡ xem trên điện thoại thì đọc y như đỡ cằm.
   *
   * 🪤 Và ĐỪNG gập sâu hơn nữa để kéo tay vào gần cằm: thử `a2 = 185` thì cẳng
   * tay nằm CHỒNG LÊN cánh tay trên, hai mảng trắng dày trùng nhau nên nếp gập
   * biến mất — bảng đối chiếu đọc ra thành "một cánh tay duỗi thẳng chỉ sang
   * ngang". Nếp gập phải còn thấy được thì tư thế mới còn nghĩa.
   */
  'suy-nghi': {
    armR: { a1: 125, a2: 160 },
    armL: { a1: 16, a2: 4 },
    legR: { a1: 6, a2: 2 },
    legL: { a1: 6, a2: 2 },
    headTilt: -9,
    headDx: 8,
  },
  /** 3 · Hiểu ra (Aha!) — ngón trỏ giơ thẳng lên quá đỉnh đầu. */
  'hieu-ra': {
    armR: { a1: 172, a2: 0 },
    armL: { a1: 16, a2: 6 },
    legR: { a1: 7, a2: 2 },
    legL: { a1: 7, a2: 2 },
  },
  /** 4 · Phân tích / quan sát — chồm tới, tay đưa vật ra trước. */
  'phan-tich': {
    armR: { a1: 75, a2: 25 },
    armL: { a1: 20, a2: -14 },
    legR: { a1: 14, a2: 4 },
    legL: { a1: 2, a2: 6 },
    lean: 10,
  },
  /** 5 · Đưa ra lời khuyên — một tay mở ngang, lòng bàn tay ngửa. */
  'loi-khuyen': {
    armR: { a1: 105, a2: -20 },
    armL: { a1: 16, a2: 6 },
    legR: { a1: 7, a2: 2 },
    legL: { a1: 7, a2: 2 },
  },
  /** 6 · Tin tưởng / tĩnh tâm — hai tay chắp trước ngực, mắt nhắm. */
  'tinh-tam': {
    armR: { a1: 0, a2: -132 },
    armL: { a1: 0, a2: -132 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    eyesClosed: true,
  },
  /** 7 · Hành động / tiến lên — dáng NGHỈ; bước sải do MOTIONS sinh. */
  'hanh-dong': {
    armR: { a1: 6, a2: 4 },
    armL: { a1: 6, a2: 4 },
    legR: { a1: 4, a2: 2 },
    legL: { a1: 4, a2: 2 },
    lean: 7,
  },
  /** Phụ · Quay lưng — dáng NGHỈ; MOTIONS cho bước đi + xa dần. */
  'quay-lung': {
    armR: { a1: 10, a2: 5 },
    armL: { a1: 10, a2: 5 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    face: 'back',
  },
  /** Phụ · Cúi đầu — bế tắc, mỏi mệt. Đầu THỤT xuống + đổ ra trước, thân chùng. */
  'cui-dau': {
    armR: { a1: 16, a2: 26 },
    armL: { a1: 16, a2: 26 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    headTilt: 20,
    headDx: 22,
    headDy: -46,
    crouch: 30,
    lean: 9,
  },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

export const POSE_NAMES = Object.keys(POSES) as PoseName[];

export function isPose(name: string | undefined): name is PoseName {
  return Boolean(name && name in POSES);
}

// ── Chuyển động ───────────────────────────────────────────────────────────

/** Phần CỘNG THÊM vào tư thế nền. Cộng chứ không thay, nên hai tầng độc lập. */
type Delta = {
  armR?: Partial<Limb>;
  armL?: Partial<Limb>;
  legR?: Partial<Limb>;
  legL?: Partial<Limb>;
  lean?: number;
  headTilt?: number;
  headDx?: number;
  headDy?: number;
  crouch?: number;
};

type Motion = {
  /** Nhịp của chi, theo `t` giây kể từ đầu cảnh. */
  pose?: (t: number) => Delta;
  /** Nhún cả người (đơn vị nội bộ, dương = nhích LÊN). */
  bob?: (t: number) => number;
  /** Phóng to/thu nhỏ cả người — dùng cho "đi xa dần". */
  zoom?: (t: number) => number;
  /** Lắc nhẹ đạo cụ đang cầm (độ). */
  sway?: (t: number) => number;
};

/** Nhịp thở nền, áp cho mọi tư thế không khai riêng. Chậm và nhỏ, cố ý. */
const BREATHE: Motion = { bob: (t) => Math.sin(t * 1.75) * 5 };

/**
 * Nhịp riêng từng tư thế.
 *
 * 🔑 Nguyên tắc chọn nhịp: mỗi tư thế chỉ được có MỘT chuyển động mang nghĩa,
 * đúng luật "animation nhẹ, không flashy" của brief. Vẫy tay thì chỉ tay vẫy;
 * bước đi thì chỉ chân/tay so le. Cộng hai ba nhịp vào một tư thế là thành
 * hoạt hình rung lắc, và mắt người xem rời khỏi CHỮ — mà chữ mới là nội dung.
 */
const MOTIONS: Partial<Record<PoseName, Motion>> = {
  /** Vẫy tay thật: cẳng tay quét qua lại quanh khuỷu đang giơ cao. */
  chao: {
    pose: (t) => ({ armR: { a1: Math.sin(t * 5.2) * 5, a2: Math.sin(t * 5.2) * 22 } }),
    bob: (t) => Math.sin(t * 1.9) * 4,
  },
  /** Đầu đưa qua lại rất chậm + ngón tay gõ nhẹ vào cằm. */
  'suy-nghi': {
    pose: (t) => ({
      headTilt: Math.sin(t * 0.85) * 5,
      armR: { a1: 0, a2: Math.sin(t * 4.4) * 4 },
    }),
    bob: (t) => Math.sin(t * 1.6) * 4,
  },
  /**
   * Bật lên một nhịp ở đầu cảnh rồi giữ — đúng "pop" của brief.
   * Cánh tay giơ nảy nhẹ theo, để nó không đứng chết sau cú bật.
   */
  'hieu-ra': {
    pose: (t) => ({ armR: { a1: Math.sin(t * 3.4) * 4, a2: 0 } }),
    bob: (t) => Math.max(0, 1 - t * 2.6) * 26 + Math.sin(t * 1.9) * 4,
    zoom: (t) => 1 + Math.max(0, 1 - t * 3) * 0.05,
  },
  /** Tay đưa vật quét một cung nhỏ — như đang soi. */
  'phan-tich': {
    pose: (t) => ({ armR: { a1: Math.sin(t * 1.25) * 8, a2: Math.sin(t * 1.25) * -5 } }),
    bob: (t) => Math.sin(t * 1.7) * 4,
    sway: (t) => Math.sin(t * 1.25) * 9,
  },
  /** Lòng bàn tay nâng lên hạ xuống — nhịp của người đang giảng. */
  'loi-khuyen': {
    pose: (t) => ({ armR: { a1: Math.sin(t * 1.35) * 6, a2: Math.sin(t * 1.35) * 5 } }),
    bob: (t) => Math.sin(t * 1.7) * 4,
  },
  /** Thở SÂU — biên độ gấp đôi bình thường, đó chính là nội dung của tư thế. */
  'tinh-tam': { bob: (t) => Math.sin(t * 1.15) * 10 },
  /**
   * Bước đi thật: hai chân sải luân phiên, hai tay đánh ngược pha, thân nhún
   * ở tần số GẤP ĐÔI (mỗi bước một nhịp nhún, không phải mỗi chu kỳ một nhịp).
   */
  'hanh-dong': {
    pose: (t) => {
      const w = Math.sin(t * 5);
      return {
        legR: { a1: 26 * w, a2: -14 * Math.max(0, -w) },
        legL: { a1: -26 * w, a2: -14 * Math.max(0, w) },
        armR: { a1: -20 * w, a2: 0 },
        armL: { a1: 20 * w, a2: 0 },
      };
    },
    bob: (t) => -Math.abs(Math.sin(t * 5)) * 9 + 5,
  },
  /**
   * Quay lưng ĐI XA DẦN: cùng bước cycle, chậm hơn, cộng thu nhỏ 16% trong 3
   * giây đầu. Đây là tư thế duy nhất kể một hành động có HƯỚNG — "rút đi" —
   * nên nó phải thấy được là đang rời khỏi khung, không chỉ là quay lưng đứng.
   */
  'quay-lung': {
    pose: (t) => {
      const w = Math.sin(t * 3.6);
      return {
        legR: { a1: 19 * w, a2: -10 * Math.max(0, -w) },
        legL: { a1: -19 * w, a2: -10 * Math.max(0, w) },
        armR: { a1: -14 * w, a2: 0 },
        armL: { a1: 14 * w, a2: 0 },
      };
    },
    bob: (t) => -Math.abs(Math.sin(t * 3.6)) * 7 + 4,
    zoom: (t) => 1 - Math.min(t, 3) * 0.055,
  },
  /** Thở dài: vai chùng xuống rồi nhấc lên rất chậm, biên độ lớn. */
  'cui-dau': {
    pose: (t) => ({ crouch: Math.sin(t * 0.95) * 8, headTilt: Math.sin(t * 0.95) * 3 }),
    bob: (t) => Math.sin(t * 0.95) * 3,
  },
};

// ── Chớp mắt ──────────────────────────────────────────────────────────────

/** Chu kỳ chớp (giây) và độ dài một lần chớp. Suy từ `t`, KHÔNG ngẫu nhiên. */
const BLINK_PERIOD = 3.6;
const BLINK_LEN = 0.13;
const blinking = (t: number) => (t + 1.1) % BLINK_PERIOD < BLINK_LEN;

// ── Pha trộn hai tư thế ───────────────────────────────────────────────────

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpLimb = (a: Limb, b: Limb, k: number): Limb => ({
  a1: lerp(a.a1, b.a1, k),
  a2: lerp(a.a2, b.a2, k),
});

/**
 * Nội suy tuyến tính giữa hai tư thế.
 *
 * ⚠️ `face` và `eyesClosed` SNAP ở mốc 0,5 chứ không nội suy: nửa quay lưng
 * nửa quay mặt là một cái đầu không có nghĩa, còn mắt "nhắm 50%" thì trông như
 * lỗi render. Chỉ GÓC mới nội suy được.
 */
function blendPose(from: Pose, to: Pose, k: number): Pose {
  if (k >= 1) return to;
  if (k <= 0) return from;
  const late = k >= 0.5 ? to : from;
  return {
    armR: lerpLimb(from.armR, to.armR, k),
    armL: lerpLimb(from.armL, to.armL, k),
    legR: lerpLimb(from.legR, to.legR, k),
    legL: lerpLimb(from.legL, to.legL, k),
    lean: lerp(from.lean ?? 0, to.lean ?? 0, k),
    headTilt: lerp(from.headTilt ?? 0, to.headTilt ?? 0, k),
    headDx: lerp(from.headDx ?? 0, to.headDx ?? 0, k),
    headDy: lerp(from.headDy ?? 0, to.headDy ?? 0, k),
    crouch: lerp(from.crouch ?? 0, to.crouch ?? 0, k),
    face: late.face,
    eyesClosed: late.eyesClosed,
  };
}

const addLimb = (base: Limb, d?: Partial<Limb>): Limb =>
  d ? { a1: base.a1 + (d.a1 ?? 0), a2: base.a2 + (d.a2 ?? 0) } : base;

function applyDelta(p: Pose, d: Delta): Pose {
  return {
    ...p,
    armR: addLimb(p.armR, d.armR),
    armL: addLimb(p.armL, d.armL),
    legR: addLimb(p.legR, d.legR),
    legL: addLimb(p.legL, d.legL),
    lean: (p.lean ?? 0) + (d.lean ?? 0),
    headTilt: (p.headTilt ?? 0) + (d.headTilt ?? 0),
    headDx: (p.headDx ?? 0) + (d.headDx ?? 0),
    headDy: (p.headDy ?? 0) + (d.headDy ?? 0),
    crouch: (p.crouch ?? 0) + (d.crouch ?? 0),
  };
}

// ── Vẽ ────────────────────────────────────────────────────────────────────

const resolve = (p: PoseName | Pose): Pose => (typeof p === 'string' ? POSES[p] : p);

/**
 * Vẽ nhân vật.
 *
 * ⚠️ Mọi nét dùng `strokeLinecap="round"` + `strokeLinejoin="round"` — đó chính
 * là mục "STYLE LINE · đường viền mềm, bo tròn, đồng nhất" của brief, và cũng
 * là thứ giữ cho tay chân trông mềm chứ không trông như que tăm.
 */
export const Character: React.FC<{
  pose: PoseName | Pose;
  /** Tư thế TRƯỚC ĐÓ — khai để nhân vật *chuyển* sang tư thế mới thay vì nhảy. */
  fromPose?: PoseName | Pose;
  /** 0 = còn ở `fromPose`, 1 = đã sang hẳn `pose`. */
  blend?: number;
  /**
   * Giây kể từ đầu cảnh. Bỏ trống ⇒ hình ĐỨNG YÊN hoàn toàn (dùng cho bảng
   * đối chiếu tư thế). Có giá trị ⇒ chạy nhịp riêng + thở + chớp mắt.
   */
  timeSec?: number;
  /** Chiều cao vẽ ra (px trong khung 1080×1920). */
  height?: number;
  /** Lật ngang — cho nhân vật quay mặt sang trái. */
  flip?: boolean;
  /** Bóng đổ dưới chân. Tắt khi đặt trên nền không phải mặt đất. */
  shadow?: boolean;
  /** Đạo cụ cầm ở tay phải. Tên trong `GLYPHS`; tên lạ thì bỏ qua, không vỡ. */
  prop?: GlyphName | string;
  style?: React.CSSProperties;
}> = ({ pose, fromPose, blend = 1, timeSec, height = 620, flip, shadow = true, prop, style }) => {
  const target = resolve(pose);
  const base = fromPose ? blendPose(resolve(fromPose), target, blend) : target;

  // Nhịp lấy theo tư thế ĐÍCH, không theo tư thế đang pha: nửa nhịp đi bộ
  // trộn nửa nhịp vẫy tay ra một thứ không đọc được là gì.
  const poseKey = typeof pose === 'string' ? pose : undefined;
  const motion = (poseKey && MOTIONS[poseKey as PoseName]) || BREATHE;
  const t = timeSec ?? 0;
  const live = timeSec !== undefined;

  const p = live && motion.pose ? applyDelta(base, motion.pose(t)) : base;
  const bob = live ? (motion.bob ?? BREATHE.bob!)(t) : 0;
  const zoom = live && motion.zoom ? motion.zoom(t) : 1;
  const sway = live && motion.sway ? motion.sway(t) : 0;

  const face = p.face ?? 'front';
  const crouch = p.crouch ?? 0;
  const eyesShut = p.eyesClosed || (live && blinking(t));

  const shoulderY = SHOULDER_Y - crouch;
  const hipY = HIP_Y - crouch;
  const headCy = HEAD_CY - crouch;

  const armR = limbPoints(SHOULDER_X, shoulderY, 1, ARM_1, ARM_2, p.armR);
  const armL = limbPoints(-SHOULDER_X, shoulderY, -1, ARM_1, ARM_2, p.armL);
  const legR = limbPoints(HIP_X, hipY, 1, LEG_1, LEG_2, p.legR);
  const legL = limbPoints(-HIP_X, hipY, -1, LEG_1, LEG_2, p.legL);

  /*
   * 🪤 Khung nhìn phải tính SAU khi lật trục y, không phải trước.
   *
   * Hệ nội bộ: chân ở y=0, đỉnh đầu ở y=TOTAL_H, y hướng LÊN. Nhóm ngoài cùng
   * `scale(1,-1)` nên trong toạ độ SVG nhân vật nằm ở **y âm**: từ −TOTAL_H
   * (đầu) tới 0 (chân). Lấy viewBox bắt đầu từ số dương như hình thường là cắt
   * mất cả người — đúng lỗi đã vấp ở lượt render đầu.
   *
   * PAD nới rộng để chứa cả đạo cụ và cú bật của `hieu-ra`.
   */
  const PAD = 112;
  const HALF_W = SHOULDER_X + ARM_1 + ARM_2 + PAD;
  const vbY = -(TOTAL_H + PAD);
  const vbH = TOTAL_H + PAD * 2;
  const vb = `${-HALF_W} ${vbY} ${HALF_W * 2} ${vbH}`;
  const w = (height * HALF_W * 2) / vbH;

  // Đạo cụ nằm QUÁ nắm tay một đoạn, theo hướng cẳng tay. Đo trên bảng đối
  // chiếu: đặt đúng tại bàn tay thì với tư thế giơ cao (`hieu-ra`) vật đè lên
  // đầu; đẩy ra 38 đơn vị thì nó nằm gọn phía trên, tách hẳn khỏi mặt.
  const propName = isGlyph(prop) ? prop : null;
  const propX = armR.end[0] + armR.dir[0] * 38;
  const propY = armR.end[1] + armR.dir[1] * 38;

  return (
    <svg width={w} height={height} viewBox={vb} style={{ overflow: 'visible', ...style }}>
      {/* y trong SVG hướng xuống, còn hệ của nhân vật hướng lên ⇒ lật một lần
          ở đây thay vì trừ trong từng phép tính (dễ sai và khó đọc hơn nhiều). */}
      <g transform={`scale(${flip ? -1 : 1},-1) translate(0,${bob}) scale(${zoom})`}>
        {shadow ? (
          /*
           * 🔑 Bóng là vệt SÁNG mờ, không phải vệt tối.
           *
           * Bản trước dùng đen 55% — đúng trên nền navy cũ, nhưng sân khấu nay
           * là đen `#0A0A0F`, nên một mảng đen phủ lên nền đen đọc thành CÁI HỐ
           * dưới chân chứ không thành bóng đổ. Soi khung hình thật mới thấy.
           * Nền tối thì thứ "đặt nhân vật xuống mặt đất" phải là ánh sáng hắt.
           *
           * Bóng co lại khi nhân vật nhún lên — thiếu vế này thì cú bật của
           * `hieu-ra` trông như cả sàn nhà nhấc lên theo.
           */
          <ellipse
            cx={0}
            cy={-6 - bob}
            rx={124 - Math.abs(bob) * 1.4}
            ry={17}
            fill="rgba(255,255,255,.07)"
          />
        ) : null}

        <g transform={`rotate(${-(p.lean ?? 0)})`}>
          {/*
           * 🔑 Mỗi bộ phận vẽ HAI lượt: nét viền tối rộng hơn, rồi thân trắng
           * đè lên. Đây vừa là mục "STYLE LINE · đường viền mềm" của brief, vừa
           * chữa một lỗi ĐO ĐƯỢC ở lượt render đầu: tay trắng nằm trên thân
           * trắng thì tan vào nhau, tư thế chống cằm nhìn thành cụt tay. Viền
           * tối là thứ duy nhất tách được hai mảng cùng màu.
           *
           * ⚠️ Thứ tự vẽ QUAN TRỌNG: viền của bộ phận sau che thân của bộ phận
           * trước, nên phải đi từ lớp xa nhất (chân) tới gần nhất (đầu). Gộp
           * hết viền lên trước rồi mới tô thân thì không tách được gì.
           */}
          {[
            { d: legL.d, w: LEG_W },
            { d: legR.d, w: LEG_W },
            { d: null, w: 0 }, // chỗ của thân, xử lý riêng bên dưới
            { d: armL.d, w: ARM_W },
            { d: armR.d, w: ARM_W },
          ].map((part, i) =>
            part.d === null ? (
              <g key="than">
                {[CHAR.ink, CHAR.body].map((color, j) => (
                  <path
                    key={j}
                    d={`M${-SHOULDER_X},${shoulderY}
                        L${SHOULDER_X},${shoulderY}
                        Q${SHOULDER_X + 10},${(shoulderY + hipY) / 2} ${HIP_X + 4},${hipY}
                        L${-HIP_X - 4},${hipY}
                        Q${-SHOULDER_X - 10},${(shoulderY + hipY) / 2} ${-SHOULDER_X},${shoulderY} Z`}
                    fill={color}
                    stroke={color}
                    strokeWidth={j === 0 ? 34 + OUTLINE * 2 : 34}
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            ) : (
              <g key={i}>
                {[CHAR.ink, CHAR.body].map((color, j) => (
                  <path
                    key={j}
                    d={part.d}
                    stroke={color}
                    strokeWidth={j === 0 ? part.w + OUTLINE * 2 : part.w}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </g>
            )
          )}

          {/* Đầu + mắt. Lật lại trục y cho mắt vì hình mắt không đối xứng. */}
          <g
            transform={`translate(${p.headDx ?? 0},${headCy + (p.headDy ?? 0)}) rotate(${-(p.headTilt ?? 0)})`}
          >
            <circle cx={0} cy={0} r={HEAD_R + OUTLINE} fill={CHAR.ink} />
            <circle cx={0} cy={0} r={HEAD_R} fill={CHAR.body} />
            {face !== 'back' ? (
              <g transform="scale(1,-1)">
                {eyesShut ? (
                  <>
                    {face === 'front' ? (
                      <path
                        d="M-52,6 q18,-16 36,0"
                        stroke={CHAR.ink}
                        strokeWidth={9}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : null}
                    <path
                      d={face === 'front' ? 'M16,6 q18,-16 36,0' : 'M14,6 q18,-16 36,0'}
                      stroke={CHAR.ink}
                      strokeWidth={9}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </>
                ) : (
                  <>
                    {face === 'front' ? <circle cx={-34} cy={4} r={17} fill={CHAR.ink} /> : null}
                    <circle cx={face === 'front' ? 34 : 30} cy={4} r={17} fill={CHAR.ink} />
                  </>
                )}
              </g>
            ) : null}
          </g>

          {/*
           * Đạo cụ vẽ SAU CÙNG (nằm trên tay) và tự lật trục y lại — glyph vẽ
           * trong hệ SVG thường, còn ở đây đang trong nhóm đã lật.
           *
           * ⚠️ CỐ Ý KHÔNG xoay đạo cụ theo góc cẳng tay: tay giơ cao 155° thì
           * vật cầm sẽ lộn ngược, mà một cái đèn lồng lộn ngược thì người xem
           * đọc là lỗi chứ không đọc là động tác. Vật giữ thẳng đứng + lắc nhẹ
           * theo nhịp là cách bộ hình mascot phẳng nào cũng làm, và nó đọc đúng.
           */}
          {propName ? (
            <g transform={`translate(${propX},${propY}) scale(1,-1) rotate(${sway})`}>
              <g transform={`scale(${1.5 * (GLYPHS[propName].scale ?? 1)})`}>
                {GLYPHS[propName].draw(CHAR.accent)}
              </g>
            </g>
          ) : null}
        </g>
      </g>
    </svg>
  );
};

/** Vị trí bàn tay phải trong hệ nội bộ — để gắn thứ khác vào đúng tay. */
export function handRight(pose: PoseName | Pose) {
  const p = resolve(pose);
  return limbPoints(SHOULDER_X, SHOULDER_Y - (p.crouch ?? 0), 1, ARM_1, ARM_2, p.armR).end;
}
