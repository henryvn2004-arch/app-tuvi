// remotion/src/Character.tsx
// ============================================================
// NHÂN VẬT SIGNATURE của Tử Vi Minh Bảo — vẽ bằng SVG, KHÔNG phải ảnh nhập.
//
// 🔑 VÌ SAO VẼ BẰNG CODE thay vì tải vector/sinh bằng model (đã cân ba đường):
//   · Nhất quán theo CẤU TRÚC, không nhờ tuyển chọn. Cùng một đoạn code thì
//     cùng nét, cùng tỉ lệ, cùng màu — không có cách nào lệch. Kho vector miễn
//     phí thì đo được 9 tác giả trong 50 kết quả; model sinh ảnh thì trôi
//     phong cách giữa các lượt gen.
//   · Nó CHUYỂN ĐỘNG được. Ảnh nhập vào chỉ Ken Burns; hình vẽ bằng code thì
//     cúi xuống, quay lưng, bước ra khỏi khung — tức KỂ CHUYỆN chứ không minh
//     hoạ. Đây là điểm quyết định, vì chuyển động đúng là thứ phân biệt clip
//     typography làm kỹ với làm ẩu.
//   · 0đ vĩnh viễn · không giấy phép · không provenance · không Storage ·
//     không script nhập kho. Tư thế mới = một hàng số, không phải một asset.
//
// 📐 Hình dạng bám ĐÚNG bản brief Henry đưa:
//   3,5 đầu · đầu tròn · mắt tròn · KHÔNG có miệng (cảm xúc qua cử chỉ) ·
//   thân bo tròn mềm mại · đường viền mềm, bo tròn, đồng nhất.
//
// ⚠️ KHÔNG có miệng là quyết định của brief và nó cũng đúng về mặt kỹ thuật:
// miệng là thứ khó vẽ đúng nhất và dễ thành đáng sợ nhất ở cỡ nhỏ. Bỏ miệng
// thì mọi cảm xúc dồn vào TƯ THẾ — mà tư thế thì tham số hoá được.
// ============================================================

import React from 'react';

/** Bảng màu của nhân vật — chép từ bản brief. */
export const CHAR = {
  body: '#FFFFFF',
  ink: '#0A0A0F',
  pink: '#FF7DAA',
  gold: '#FFD166',
  violet: '#B388FF',
  mint: '#6EE7C7',
} as const;

/**
 * Hệ toạ độ nội bộ của nhân vật: gốc ở GIỮA HAI BÀN CHÂN, y tăng lên trên.
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

/**
 * Bề dày chi. Tỉ lệ với đầu, không phải số chọn bừa: brief tả *"thân bo tròn,
 * mềm mại"* — chi quá mảnh thì ra hình que tăm, quá dày thì mất dáng người.
 * 0,22 và 0,27 đường kính đầu là mức soi bằng mắt trên bảng contact sheet.
 */
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
  /** Nhún người lên/xuống (đơn vị nội bộ, dương = nhún xuống). */
  crouch?: number;
  /** Hướng mặt: trước (2 mắt) · nghiêng (1 mắt) · sau (không mắt). */
  face?: 'front' | 'side' | 'back';
  /** Mắt nhắm — dùng cho tĩnh tâm / thiền. */
  eyesClosed?: boolean;
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Dựng đường gấp khúc của một chi từ hai góc. Trả về chuỗi `points` cho polyline. */
function limbPoints(ox: number, oy: number, side: 1 | -1, l1: number, l2: number, limb: Limb) {
  const a1 = rad(limb.a1) * side;
  const a2 = rad(limb.a1 + limb.a2) * side;
  const x1 = ox + Math.sin(a1) * l1;
  const y1 = oy - Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a2) * l2;
  const y2 = y1 - Math.cos(a2) * l2;
  return { mid: [x1, y1] as const, end: [x2, y2] as const, d: `M${ox},${oy} L${x1},${y1} L${x2},${y2}` };
}

/**
 * 7 tư thế cơ bản, tên khớp ĐÚNG bản brief.
 *
 * 🔑 Đây là **từ vựng ĐÓNG**: kịch bản khai tên tư thế, không mô tả tự do. Nhờ
 * vậy phần "hình có hợp nội dung không" là một phép TRA BẢNG deterministic, 0đ
 * — và khi cổng 2 chấm thì nó so lời đọc với một cái tên cố định dùng lại ở
 * mọi clip, chứ không phải một câu tôi viết mới cho từng bức để tự tâng.
 */
export const POSES = {
  /** 1 · Chào / giới thiệu — một tay giơ vẫy cao ngang đầu. */
  chao: {
    armR: { a1: 155, a2: -25 },
    armL: { a1: 14, a2: 6 },
    legR: { a1: 7, a2: 2 },
    legL: { a1: 7, a2: 2 },
  },
  /** 2 · Suy nghĩ — tay chống cằm (khuỷu nâng), đầu hơi nghiêng. */
  'suy-nghi': {
    armR: { a1: 125, a2: 160 },
    armL: { a1: 16, a2: 4 },
    legR: { a1: 6, a2: 2 },
    legL: { a1: 6, a2: 2 },
    headTilt: -9,
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
  /** 7 · Hành động / tiến lên — sải bước, tay đánh so le. */
  'hanh-dong': {
    armR: { a1: 46, a2: -20 },
    armL: { a1: -22, a2: 14 },
    legR: { a1: 28, a2: -14 },
    legL: { a1: -12, a2: 18 },
    lean: 6,
  },
  /** Phụ · Quay lưng — cảnh rời đi, khép lại. */
  'quay-lung': {
    armR: { a1: 12, a2: 6 },
    armL: { a1: 12, a2: 6 },
    legR: { a1: 7, a2: 2 },
    legL: { a1: 7, a2: 2 },
    face: 'back',
  },
  /** Phụ · Cúi đầu — bế tắc, mỏi mệt. Vai xuôi, thân chùng. */
  'cui-dau': {
    armR: { a1: 8, a2: 16 },
    armL: { a1: 8, a2: 16 },
    legR: { a1: 5, a2: 2 },
    legL: { a1: 5, a2: 2 },
    headTilt: 16,
    crouch: 16,
  },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

/**
 * Vẽ nhân vật.
 *
 * ⚠️ Mọi nét dùng `strokeLinecap="round"` + `strokeLinejoin="round"` — đó chính
 * là mục "STYLE LINE · đường viền mềm, bo tròn, đồng nhất" của brief, và cũng
 * là thứ giữ cho tay chân trông mềm chứ không trông như que tăm.
 */
export const Character: React.FC<{
  pose: PoseName | Pose;
  /** Chiều cao vẽ ra (px trong khung 1080×1920). */
  height?: number;
  /** Lật ngang — cho nhân vật quay mặt sang trái. */
  flip?: boolean;
  /** Bóng đổ dưới chân. Tắt khi đặt trên nền không phải mặt đất. */
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({ pose, height = 620, flip, shadow = true, style }) => {
  const p: Pose = typeof pose === 'string' ? POSES[pose] : pose;
  const face = p.face ?? 'front';
  const crouch = p.crouch ?? 0;

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
   * Bề ngang phải đủ chỗ cho tay duỗi hết: SHOULDER_X + ARM_1 + ARM_2 ≈ 264.
   */
  const PAD = 64;
  const HALF_W = SHOULDER_X + ARM_1 + ARM_2 + PAD;
  const vbY = -(TOTAL_H + PAD);
  const vbH = TOTAL_H + PAD * 2;
  const vb = `${-HALF_W} ${vbY} ${HALF_W * 2} ${vbH}`;
  const w = (height * HALF_W * 2) / vbH;

  return (
    <svg
      width={w}
      height={height}
      viewBox={vb}
      style={{ overflow: 'visible', ...style }}
      // y trong SVG hướng xuống, còn hệ của nhân vật hướng lên ⇒ lật một lần ở
      // đây thay vì trừ trong từng phép tính (dễ sai và khó đọc hơn nhiều).
    >
      <g transform={`scale(${flip ? -1 : 1},-1)`}>
        {shadow ? <ellipse cx={0} cy={-6} rx={120} ry={20} fill="rgba(0,0,0,.55)" /> : null}

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
          <g transform={`translate(0,${headCy}) rotate(${-(p.headTilt ?? 0)})`}>
            <circle cx={0} cy={0} r={HEAD_R + OUTLINE} fill={CHAR.ink} />
            <circle cx={0} cy={0} r={HEAD_R} fill={CHAR.body} />
            {face !== 'back' ? (
              <g transform="scale(1,-1)">
                {p.eyesClosed ? (
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
        </g>
      </g>
    </svg>
  );
};

/** Vị trí bàn tay phải trong hệ nội bộ — để gắn đạo cụ vào đúng tay. */
export function handRight(pose: PoseName | Pose) {
  const p: Pose = typeof pose === 'string' ? POSES[pose] : pose;
  return limbPoints(SHOULDER_X, SHOULDER_Y - (p.crouch ?? 0), 1, ARM_1, ARM_2, p.armR).end;
}
