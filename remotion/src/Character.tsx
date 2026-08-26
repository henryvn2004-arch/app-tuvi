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
  /**
   * Vẽ hai tay ĐÈ LÊN đầu thay vì nằm sau.
   *
   * 🔑 Bắt buộc cho `che-mat`: thứ tự vẽ mặc định là tay TRƯỚC rồi đầu ĐÈ LÊN
   * (đúng cho mọi tư thế khác, để tay không che mất mặt). Nhưng ở tư thế ôm
   * mặt thì đó chính là điều cần — bản đầu render ra hai bàn tay nấp SAU đầu
   * và hai con mắt vẫn nhìn thẳng, tức tư thế nói một đằng hình vẽ một nẻo.
   */
  armsFront?: boolean;
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const TAU = Math.PI * 2;

// ── Nhịp: khai bằng HZ, và KHÔNG dùng sin đối xứng ────────────────────────
//
// 🔴 Hai lý do đo được khiến bản trước "không giống người":
//
// 1. CHẬM. Đo lại toàn bộ nhịp cũ (đơn vị rad/s) quy ra Hz rồi so với mốc
//    người thật thì lệch rất xa — và lệch theo đúng một hướng:
//
//      vẫy tay      0,83 Hz  ← người vẫy 2–3 Hz      (chậm ~2,6×)
//      tay giảng    0,21 Hz  ← nhịp tay khi nói ~1 Hz (chậm ~4,4×)
//      tay quét     0,20 Hz  ← ~0,5 Hz                (chậm ~2,5×)
//      bước đi      95 bước/phút ← người 100–120      (hơi chậm)
//      thở          17 nhịp/phút ← 12–18              (ĐÚNG, giữ nguyên)
//
// 2. ĐỐI XỨNG. `Math.sin` đi và về cùng tốc độ. Cử động người thì **bật ra
//    nhanh, về chậm** — đó là thứ mắt đọc ra là "sống" hay "máy". Một nhịp
//    sin hoàn hảo chính là định nghĩa của chuyển động rô-bốt.
//
// ⇒ Từ đây khai nhịp bằng **Hz** (đọc phát biết nhanh chậm) và có hai dạng
// sóng: `osc` cho thứ vốn đối xứng thật (thở, đung đưa), `beat` cho MỌI cử
// động có chủ đích (vẫy, chỉ, đưa tay, gắp thức ăn).

/** Dao động đối xứng, biên độ ±1. Dùng cho thở / đung đưa / bước chân. */
const osc = (t: number, hz: number) => Math.sin(t * hz * TAU);

/**
 * Một CÚ ra-vào có chủ đích, biên độ 0→1→0: bật ra trong 28% chu kỳ (nhanh,
 * chạm đích êm) rồi thu về trong 72% còn lại (chậm). Đây là hình dạng thời
 * gian của gần như mọi cử động tay có ý định ở người.
 */
function beat(t: number, hz: number) {
  const u = (((t * hz) % 1) + 1) % 1;
  if (u < 0.28) {
    const k = u / 0.28;
    return 1 - Math.pow(1 - k, 3); // ease-out mạnh: ra nhanh rồi ghìm lại
  }
  const k = (u - 0.28) / 0.72;
  return Math.cos(k * Math.PI) * 0.5 + 0.5; // về chậm, mượt hai đầu
}

/** `beat` quy về biên độ ±1 — cho cử động qua-lại có hướng (vẫy tay). */
const beat2 = (t: number, hz: number) => beat(t, hz) * 2 - 1;

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

  // ── Nhóm NGỒI ────────────────────────────────────────────────────────────
  //
  // 🔑 `crouch: 92` giải NGƯỢC từ ràng buộc "bàn chân chạm đất": đùi mở 64°
  // nên gối tụt `cos(64°)×118 = 51,7`; ống chân hơi chụm vào trong (−14°) nên
  // bàn chân tụt thêm `cos(14°)×126 = 122,3` ⇒ hông phải ở `174`, tức
  // `crouch = 266 − 174 = 92`. Lệch số này là nhân vật ngồi lơ lửng hoặc thọc
  // chân xuống dưới sàn.
  //
  // ⚠️ Ống chân CHỤM VÀO (gối 164, bàn chân 134) chứ không thẳng đứng: dựng
  // thẳng thì hai chân dạng ngang bằng nhau và đọc thành ngồi xổm kiểu ếch.
  // Đây là giới hạn thật của hình chiếu THẲNG MẶT — đùi lẽ ra phải hướng về
  // phía người xem và bị rút ngắn, mà hình phẳng thì không tả được. Vì vậy
  // hai tư thế ngồi CHỈ nên dùng kèm `set` (bàn / băng ghế).
  /** 8 · Ngồi lặng — vai xuôi, tay buông trên đùi, đầu cúi. */
  'ngoi-buon': {
    armR: { a1: 30, a2: 44 },
    armL: { a1: 30, a2: 44 },
    legR: { a1: 64, a2: -78 },
    legL: { a1: 64, a2: -78 },
    crouch: 92,
    headTilt: 16,
    headDx: 14,
    headDy: -30,
    lean: 5,
  },
  /** 9 · Ngồi ăn — một tay đưa lên miệng, tay kia đặt xuống. */
  'ngoi-an': {
    armR: { a1: 55, a2: 130 },
    armL: { a1: 26, a2: 34 },
    legR: { a1: 64, a2: -78 },
    legL: { a1: 64, a2: -78 },
    crouch: 92,
  },

  // ── Nhóm CHUYỂN ĐỘNG MẠNH ────────────────────────────────────────────────
  /** 10 · Chạy — dáng NGHỈ; sải chân nhanh do MOTIONS sinh. Ngả người nhiều. */
  chay: {
    armR: { a1: 10, a2: -58 },
    armL: { a1: 10, a2: -58 },
    legR: { a1: 4, a2: 2 },
    legL: { a1: 4, a2: 2 },
    // 13° chứ không phải 17: soi bảng đối chiếu thì 17° đọc thành "sắp ngã
    // sấp" chứ không thành "đang chạy" — sải chân mới là thứ kể chạy, độ ngả
    // chỉ để đỡ nó.
    lean: 13,
  },
  /** 11 · Với tay — chồm hẳn tới, một tay vươn ra trước như níu lại. */
  'voi-tay': {
    armR: { a1: 88, a2: 10 },
    armL: { a1: -24, a2: 24 },
    legR: { a1: 24, a2: -10 },
    legL: { a1: -18, a2: 26 },
    lean: 15,
  },
  /** 12 · Dang tay — hai tay mở ngang, bất lực / "thì sao?". */
  'dang-tay': {
    armR: { a1: 118, a2: -36 },
    armL: { a1: 118, a2: -36 },
    legR: { a1: 8, a2: 2 },
    legL: { a1: 8, a2: 2 },
    headTilt: 7,
  },
  /**
   * 13 · Che mặt — hai tay ôm lấy mặt.
   *
   * Tính được là tay CHẠM tới mặt thật (khác `suy-nghi`): bàn tay rơi vào
   * (84, 635), cách tâm đầu 91 đơn vị < bán kính 100 ⇒ nằm trong khuôn mặt.
   */
  'che-mat': {
    armR: { a1: 150, a2: 60 },
    armL: { a1: 150, a2: 60 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    headDy: -10,
    armsFront: true,
  },
  /** 14 · Ngoái lại — đang bước đi nhưng còn quay đầu nhìn về phía sau. */
  'ngoai-lai': {
    armR: { a1: 10, a2: 5 },
    armL: { a1: 10, a2: 5 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    face: 'side',
    headTilt: -10,
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

/**
 * Một chu kỳ BƯỚC dùng chung cho đi bộ · rút lui · chạy.
 *
 * Hai chân so le, hai tay đánh NGƯỢC pha với chân cùng bên (đúng cách người
 * đi — cùng pha là dáng đi rô-bốt), và gối chỉ co ở chân đang ĐƯA VỀ SAU
 * (`Math.max(0, ∓w)`) chứ không co suốt chu kỳ.
 *
 * `amp` = biên độ sải (độ) — 20 là bước rút lui, 27 là đi thường, 42 là chạy.
 */
function stride(t: number, hz: number, amp: number, armScale = 0.76): Delta {
  const w = osc(t, hz);
  return {
    legR: { a1: amp * w, a2: -amp * 0.52 * Math.max(0, -w) },
    legL: { a1: -amp * w, a2: -amp * 0.52 * Math.max(0, w) },
    armR: { a1: -amp * armScale * w, a2: 0 },
    armL: { a1: amp * armScale * w, a2: 0 },
  };
}

/**
 * Nhịp thở nền, áp cho mọi tư thế không khai riêng.
 *
 * 0,28 Hz = **17 nhịp/phút** — nằm đúng dải người thật (12–18), nên đây là
 * nhịp DUY NHẤT của bản trước không phải chỉnh.
 */
const BREATHE: Motion = { bob: (t) => osc(t, 0.28) * 5 };

/**
 * Nhịp riêng từng tư thế.
 *
 * 🔑 Nguyên tắc chọn nhịp: mỗi tư thế chỉ được có MỘT chuyển động mang nghĩa,
 * đúng luật "animation nhẹ, không flashy" của brief. Vẫy tay thì chỉ tay vẫy;
 * bước đi thì chỉ chân/tay so le. Cộng hai ba nhịp vào một tư thế là thành
 * hoạt hình rung lắc, và mắt người xem rời khỏi CHỮ — mà chữ mới là nội dung.
 */
const MOTIONS: Partial<Record<PoseName, Motion>> = {
  /** Vẫy tay: **2,2 Hz** — bản trước 0,83 Hz, chậm gần 3 lần so với người thật. */
  chao: {
    pose: (t) => ({ armR: { a1: beat2(t, 2.2) * 6, a2: beat2(t, 2.2) * 24 } }),
    bob: (t) => osc(t, 0.34) * 4,
  },
  /** Đầu đưa qua lại (0,19 Hz — chậm là ĐÚNG ở đây) + ngón tay gõ nhẹ vào cằm. */
  'suy-nghi': {
    pose: (t) => ({
      headTilt: osc(t, 0.19) * 5,
      armR: { a1: 0, a2: beat2(t, 1.1) * 5 },
    }),
    bob: (t) => osc(t, 0.26) * 4,
  },
  /**
   * Bật lên một nhịp ở đầu cảnh rồi giữ — đúng "pop" của brief.
   * Cánh tay giơ nảy nhẹ theo, để nó không đứng chết sau cú bật.
   */
  'hieu-ra': {
    pose: (t) => ({ armR: { a1: osc(t, 0.62) * 4, a2: 0 } }),
    bob: (t) => Math.max(0, 1 - t * 2.6) * 26 + osc(t, 0.32) * 4,
    zoom: (t) => 1 + Math.max(0, 1 - t * 3) * 0.05,
  },
  /** Tay đưa vật quét một cung — 0,45 Hz, nhanh gấp đôi bản trước. */
  'phan-tich': {
    pose: (t) => ({ armR: { a1: osc(t, 0.45) * 9, a2: osc(t, 0.45) * -6 } }),
    bob: (t) => osc(t, 0.28) * 4,
    sway: (t) => osc(t, 0.45) * 10,
  },
  /**
   * Nhịp tay của người đang giảng: **0,62 Hz** và là `beat` chứ không phải
   * sin — tay hất ra rồi buông về, đó mới là hình dạng thời gian thật.
   */
  'loi-khuyen': {
    pose: (t) => ({ armR: { a1: beat(t, 0.62) * 12 - 4, a2: beat(t, 0.62) * 9 - 3 } }),
    bob: (t) => osc(t, 0.28) * 4,
  },
  /** Thở SÂU — 0,18 Hz (11 nhịp/phút), biên độ gấp đôi. Chính là nội dung tư thế. */
  'tinh-tam': { bob: (t) => osc(t, 0.18) * 10 },
  /** Bước đi: **0,92 Hz = 110 bước/phút**, đúng nhịp đi bộ thoải mái của người. */
  'hanh-dong': {
    pose: (t) => stride(t, 0.92, 27),
    bob: (t) => -Math.abs(osc(t, 0.92)) * 9 + 5,
  },
  /**
   * Quay lưng ĐI XA DẦN: 0,75 Hz (90 bước/phút — CHẬM hơn mức thường một
   * cách có chủ ý, đây là bước rút lui), cộng thu nhỏ 16% trong 3 giây đầu.
   * Tư thế duy nhất kể một hành động có HƯỚNG nên phải thấy được là rời khung.
   */
  'quay-lung': {
    pose: (t) => stride(t, 0.75, 20),
    bob: (t) => -Math.abs(osc(t, 0.75)) * 7 + 4,
    zoom: (t) => 1 - Math.min(t, 3) * 0.055,
  },
  /** Ngoái lại: vẫn bước đi như `quay-lung`, đầu quay nhìn về sau. */
  'ngoai-lai': {
    pose: (t) => ({ ...stride(t, 0.7, 18), headTilt: osc(t, 0.22) * 4 }),
    bob: (t) => -Math.abs(osc(t, 0.7)) * 6 + 4,
    zoom: (t) => 1 - Math.min(t, 3) * 0.04,
  },
  /** Chạy: **1,5 Hz = 180 bước/phút**, sải rộng, nhún mạnh. */
  chay: {
    pose: (t) => stride(t, 1.5, 42, 0.62),
    bob: (t) => -Math.abs(osc(t, 1.5)) * 16 + 9,
  },
  /** Thở dài: vai chùng rồi nhấc lên rất chậm (0,15 Hz), biên độ lớn. */
  'cui-dau': {
    pose: (t) => ({ crouch: osc(t, 0.15) * 8, headTilt: osc(t, 0.15) * 3 }),
    bob: (t) => osc(t, 0.15) * 3,
  },
  /** Ngồi lặng: gần như không động, chỉ lồng ngực. Đứng im mới đúng nghĩa. */
  'ngoi-buon': {
    pose: (t) => ({ crouch: osc(t, 0.14) * 5, headTilt: osc(t, 0.14) * 2 }),
    bob: (t) => osc(t, 0.2) * 3,
  },
  /** Ngồi ăn: cứ ~2,4 giây một lần đưa tay lên miệng rồi hạ xuống. */
  'ngoi-an': {
    pose: (t) => {
      const b = beat(t, 0.42);
      return { armR: { a1: -18 * (1 - b), a2: -26 * (1 - b) } };
    },
    bob: (t) => osc(t, 0.24) * 3,
  },
  /** Với tay: gân người rướn tới từng nhịp ngắn, không phải đưa tay đều đều. */
  'voi-tay': {
    pose: (t) => ({
      armR: { a1: beat(t, 0.75) * 14 - 4, a2: 0 },
      lean: beat(t, 0.75) * 4,
    }),
    bob: (t) => osc(t, 0.3) * 4,
  },
  /** Dang tay: giữ nguyên, chỉ nhún vai một nhịp rất nhỏ. */
  'dang-tay': {
    pose: (t) => ({ armR: { a1: osc(t, 0.4) * 4, a2: 0 }, armL: { a1: osc(t, 0.4) * 4, a2: 0 } }),
    bob: (t) => osc(t, 0.3) * 4,
  },
  /** Che mặt: vai rung khẽ — biên độ RẤT nhỏ, quá tay là thành hài. */
  'che-mat': {
    pose: (t) => ({ crouch: Math.abs(osc(t, 1.1)) * 4 }),
    bob: (t) => osc(t, 0.24) * 3 - Math.abs(osc(t, 1.1)) * 2,
  },
};

// ── Chớp mắt ──────────────────────────────────────────────────────────────

/** Chu kỳ chớp (giây) và độ dài một lần chớp. Suy từ `t`, KHÔNG ngẫu nhiên. */
const BLINK_PERIOD = 3.6;
const BLINK_LEN = 0.13;
const blinking = (t: number) => (t + 1.1) % BLINK_PERIOD < BLINK_LEN;

// ── Pha trộn hai tư thế ───────────────────────────────────────────────────

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Nội suy một chi, với đoạn NGỌN chạy CHẬM HƠN đoạn gốc (`kLate`).
 *
 * 🔑 Đây là "overlapping action" — luật hoạt hình cổ điển và là tín hiệu
 * mạnh thứ hai (sau độ vọt quá đà) phân biệt cử động người với cử động máy:
 * ở người, cẳng tay LUÔN tới đích sau cánh tay trên, không bao giờ cùng lúc.
 * Hai đoạn chuyển động khớp nhau tuyệt đối chính là cái nhìn ra "rô-bốt".
 */
const lerpLimb = (a: Limb, b: Limb, k: number, kLate: number): Limb => ({
  a1: lerp(a.a1, b.a1, k),
  a2: lerp(a.a2, b.a2, kLate),
});

/**
 * Nội suy tuyến tính giữa hai tư thế.
 *
 * ⚠️ `face` và `eyesClosed` SNAP ở mốc 0,5 chứ không nội suy: nửa quay lưng
 * nửa quay mặt là một cái đầu không có nghĩa, còn mắt "nhắm 50%" thì trông như
 * lỗi render. Chỉ GÓC mới nội suy được.
 */
function blendPose(from: Pose, to: Pose, k: number, kLate = k): Pose {
  if (k >= 1 && kLate >= 1) return to;
  if (k <= 0 && kLate <= 0) return from;
  const late = k >= 0.5 ? to : from;
  return {
    armR: lerpLimb(from.armR, to.armR, k, kLate),
    armL: lerpLimb(from.armL, to.armL, k, kLate),
    legR: lerpLimb(from.legR, to.legR, k, kLate),
    legL: lerpLimb(from.legL, to.legL, k, kLate),
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
  /** Như `blend` nhưng CHẬM HƠN một nhịp, dành cho đoạn ngọn của chi. */
  blendLate?: number;
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
}> = ({
  pose,
  fromPose,
  blend = 1,
  blendLate,
  timeSec,
  height = 620,
  flip,
  shadow = true,
  prop,
  style,
}) => {
  const target = resolve(pose);
  const base = fromPose
    ? blendPose(resolve(fromPose), target, blend, blendLate ?? blend)
    : target;

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

  /*
   * 🔑 Mỗi bộ phận vẽ HAI lượt: nét viền tối rộng hơn, rồi thân trắng đè lên.
   * Đây vừa là mục "STYLE LINE · đường viền mềm" của brief, vừa chữa một lỗi
   * ĐO ĐƯỢC ở lượt render đầu: tay trắng nằm trên thân trắng thì tan vào nhau,
   * tư thế chống cằm nhìn thành cụt tay. Viền tối là thứ duy nhất tách được
   * hai mảng cùng màu.
   *
   * ⚠️ THỨ TỰ VẼ quan trọng: viền của bộ phận sau che thân của bộ phận trước,
   * nên phải đi từ lớp xa nhất (chân) tới gần nhất. Gộp hết viền lên trước rồi
   * mới tô thân thì không tách được gì.
   */
  const limb = (d: string, w: number, key: string) => (
    <g key={key}>
      {[CHAR.ink, CHAR.body].map((color, j) => (
        <path
          key={j}
          d={d}
          stroke={color}
          strokeWidth={j === 0 ? w + OUTLINE * 2 : w}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </g>
  );

  const arms = (
    <>
      {limb(armL.d, ARM_W, 'armL')}
      {limb(armR.d, ARM_W, 'armR')}
    </>
  );

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
          {limb(legL.d, LEG_W, 'legL')}
          {limb(legR.d, LEG_W, 'legR')}

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

          {p.armsFront ? null : arms}

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

          {p.armsFront ? arms : null}

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
