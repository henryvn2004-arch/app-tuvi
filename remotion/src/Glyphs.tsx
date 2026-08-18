// remotion/src/Glyphs.tsx
// ============================================================
// BỘ HÌNH KÝ HIỆU — đạo cụ nhân vật cầm trên tay VÀ icon nổi trong cảnh.
//
// 🔑 MỘT bộ dùng cho HAI chỗ, cố ý. Brief tách "đạo cụ" (nhân vật cầm) khỏi
// "icon" (ký hiệu đứng riêng), nhưng nếu vẽ hai bộ thì cùng một khái niệm
// ("kính lúp") có hai nét khác nhau trong cùng một clip — đúng lớp lỗi "hai
// danh sách chép tay rồi trôi khỏi nhau" mà repo này đã trả giá nhiều lần.
// Ở đây chỉ khác CHỖ ĐẶT, không khác hình.
//
// 📐 Luật vẽ, áp cho MỌI glyph — đây là thứ giữ cho bộ hình trông cùng một nhà:
//   · Khung nội bộ 100×100, tâm ở (0,0), y hướng XUỐNG (hệ SVG thường).
//   · Bề dày nét ĐỒNG NHẤT `W` — brief ghi "consistent stroke".
//   · Tối đa HAI màu: màu nhấn + trắng. Không đổ bóng, không gradient.
//   · `strokeLinecap/Linejoin = round` — cùng ngôn ngữ nét với nhân vật.
//
// ⚠️ MÀU NHẤN: brief đề nghị neon (hồng/tím/xanh ngọc) nhưng Henry chốt lấy
// màu THEME CỦA SITE. Nên mặc định là `--gold #C9A84C` (8,6:1 trên nền đen,
// dư sức cho nét mảnh). `--red #C0392B` chỉ 3,9:1 nên CHỈ dùng làm MẢNG ĐẶC
// lớn (ngọn lửa, trái tim), không bao giờ làm nét mảnh.
// ============================================================

import React from 'react';
import { BRAND } from './brand';

/** Bề dày nét chuẩn của cả bộ. Đổi số này là đổi cả 20 hình cùng lúc. */
const W = 7;
/** Nét phụ — chi tiết bên trong, mảnh hơn để không tranh với đường bao. */
const W2 = 5;
const INK = '#FFFFFF';
/**
 * Nét viền tối cho ĐỒ ĐẠC (`SETS`).
 *
 * ⚠️ Bắt buộc, không phải trang trí: đồ đạc màu trắng vẽ ĐÈ lên thân người
 * cũng màu trắng thì hai mảng tan vào nhau — đúng lỗi đã phải vá ở tay/thân
 * nhân vật. Chép cùng một giá trị `#0A0A0F` với `CHAR.ink` thay vì import, để
 * `Glyphs` không phụ thuộc ngược vào `Character` (Character đã import Glyphs).
 */
const DARK = '#0A0A0F';
const OUT = 9;

type Draw = (c: string) => React.ReactNode;

/**
 * 20 ký hiệu. Chọn theo MIỀN NỘI DUNG của kênh (mệnh lý · tâm lý · hành động),
 * không phải theo "icon nào hay gặp": lá số, đồng xu vuông lỗ, la bàn, đèn lồng
 * là thứ khán giả gắn ngay với tử vi; cánh cửa, dấu hỏi, mũi tên là nhịp kể.
 */
export const GLYPHS: Record<string, { draw: Draw; scale?: number }> = {
  // ── Mệnh lý ────────────────────────────────────────────────────────────
  /** Lá số 12 cung — vành ô vuông bao quanh khoảng giữa trống. Đúng bố cục thật. */
  'la-so': {
    draw: (c) => (
      <>
        <rect
          x={-36}
          y={-36}
          width={72}
          height={72}
          rx={6}
          stroke={c}
          strokeWidth={W}
          fill="none"
        />
        <path
          d="M-12,-36 L-12,-12 L-36,-12 M12,-36 L12,-12 L36,-12 M-12,36 L-12,12 L-36,12 M12,36 L12,12 L36,12"
          stroke={c}
          strokeWidth={W2}
          fill="none"
        />
      </>
    ),
  },
  /** Đồng xu vuông lỗ — tài lộc. */
  'dong-xu': {
    draw: (c) => (
      <>
        <circle r={30} stroke={c} strokeWidth={W} fill="none" />
        <rect x={-10} y={-10} width={20} height={20} stroke={c} strokeWidth={W} fill="none" />
      </>
    ),
  },
  /** La bàn — định hướng, phong thuỷ. */
  'la-ban': {
    draw: (c) => (
      <>
        <circle r={30} stroke={INK} strokeWidth={W} fill="none" />
        <path d="M0,-20 L11,0 L0,20 L-11,0 Z" fill={c} />
      </>
    ),
  },
  /** Đèn lồng — soi đường, huyền học. Ngọn lửa là mảng ĐẶC nên dùng đỏ được. */
  'den-long': {
    draw: (c) => (
      <>
        <path d="M-16,-38 L16,-38 M0,-38 L0,-30" stroke={INK} strokeWidth={W2} strokeLinecap="round" />
        <rect x={-24} y={-30} width={48} height={52} rx={22} stroke={c} strokeWidth={W} fill="none" />
        <path d="M0,-16 q11,11 0,24 q-11,-13 0,-24 Z" fill={BRAND.red} />
        <path d="M0,22 L0,36" stroke={c} strokeWidth={W2} strokeLinecap="round" />
      </>
    ),
  },
  /** Ngôi sao — tinh đẩu. */
  'ngoi-sao': {
    draw: (c) => (
      <path
        d="M0,-34 L9,-11 L34,-11 L14,4 L21,28 L0,14 L-21,28 L-14,4 L-34,-11 L-9,-11 Z"
        stroke={c}
        strokeWidth={W}
        fill="none"
        strokeLinejoin="round"
      />
    ),
  },
  /** Trăng khuyết — âm, đêm, phần khuất. */
  'mat-trang': {
    draw: (c) => <path d="M15,-30 a32,32 0 1,0 0,60 a26,26 0 1,1 0,-60 Z" fill={c} />,
  },

  // ── Tra cứu · hiểu ra ──────────────────────────────────────────────────
  /** Kính lúp — soi, phân tích. */
  'kinh-lup': {
    draw: (c) => (
      <>
        <circle cx={-8} cy={-8} r={26} stroke={c} strokeWidth={W} fill="none" />
        <path d="M11,11 L34,34" stroke={INK} strokeWidth={W + 1} strokeLinecap="round" />
      </>
    ),
  },
  /** Sách mở — tra cứu, cổ thư. */
  sach: {
    draw: (c) => (
      <>
        <path
          d="M-40,-24 Q-20,-32 -3,-24 L-3,26 Q-20,18 -40,26 Z"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M40,-24 Q20,-32 3,-24 L3,26 Q20,18 40,26 Z"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M0,-27 L0,25" stroke={INK} strokeWidth={W2} strokeLinecap="round" />
      </>
    ),
  },
  /** Bóng đèn — khoảnh khắc hiểu ra. */
  'bong-den': {
    draw: (c) => (
      <>
        <circle cx={0} cy={-8} r={22} stroke={c} strokeWidth={W} fill="none" />
        <path d="M-11,18 L11,18 M-8,28 L8,28" stroke={INK} strokeWidth={W2} strokeLinecap="round" />
        <path
          d="M-36,-32 L-28,-26 M36,-32 L28,-26 M0,-42 L0,-36"
          stroke={c}
          strokeWidth={W2}
          strokeLinecap="round"
        />
      </>
    ),
  },
  /** Dấu hỏi — câu hỏi treo lại cho người xem. */
  'dau-hoi': {
    draw: (c) => (
      <>
        <path
          d="M-16,-18 a16,16 0 1,1 16,17 l0,9"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={0} cy={26} r={5} fill={c} />
      </>
    ),
  },
  /** Gương — soi lại chính mình. */
  guong: {
    draw: (c) => (
      <>
        <ellipse cx={0} cy={-10} rx={24} ry={30} stroke={c} strokeWidth={W} fill="none" />
        <path d="M0,20 L0,38" stroke={INK} strokeWidth={W} strokeLinecap="round" />
        <path d="M-11,-18 L-3,-27" stroke={INK} strokeWidth={W2} strokeLinecap="round" />
      </>
    ),
  },

  // ── Thời gian · đường đi ───────────────────────────────────────────────
  /** Đồng hồ — thời vận, đại vận. */
  'dong-ho': {
    draw: (c) => (
      <>
        <circle r={30} stroke={INK} strokeWidth={W} fill="none" />
        <path
          d="M0,-17 L0,0 L15,10"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  /** Bản đồ gấp — định hướng dài hạn. */
  'ban-do': {
    draw: (c) => (
      <>
        <path
          d="M-38,-18 L-13,-28 L13,-18 L38,-28 L38,24 L13,34 L-13,24 L-38,34 Z"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M-13,-28 L-13,24 M13,-18 L13,34" stroke={INK} strokeWidth={W2} />
      </>
    ),
  },
  /** Mũi tên — tiến lên, bước tiếp theo. */
  'mui-ten': {
    draw: (c) => (
      <>
        <path d="M-30,0 L26,0" stroke={c} strokeWidth={W} strokeLinecap="round" />
        <path
          d="M11,-16 L30,0 L11,16"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  /** Túi hành lý — lên đường, mang theo. */
  tui: {
    draw: (c) => (
      <>
        <path d="M-14,-16 a14,14 0 0,1 28,0" stroke={INK} strokeWidth={W2} fill="none" />
        <rect x={-30} y={-16} width={60} height={46} rx={8} stroke={c} strokeWidth={W} fill="none" />
      </>
    ),
  },

  // ── Nhịp kể · cảm xúc ──────────────────────────────────────────────────
  /** Cánh cửa — đóng lại / mở ra. Dùng nhiều trong nội dung tổn thương. */
  'canh-cua': {
    draw: (c) => (
      <>
        <rect x={-26} y={-38} width={52} height={76} rx={5} stroke={c} strokeWidth={W} fill="none" />
        <circle cx={14} cy={3} r={5} fill={INK} />
      </>
    ),
  },
  /** Chìa khoá — lời giải, cách gỡ. */
  'chia-khoa': {
    draw: (c) => (
      <>
        <circle cx={-20} cy={-14} r={16} stroke={c} strokeWidth={W} fill="none" />
        <path d="M-9,-3 L27,33" stroke={INK} strokeWidth={W} strokeLinecap="round" />
        <path d="M12,18 L22,8 M20,26 L30,16" stroke={INK} strokeWidth={W2} strokeLinecap="round" />
      </>
    ),
  },
  /** Trái tim — tình cảm. Mảng ĐẶC nên đỏ đủ đọc trên nền đen. */
  'trai-tim': {
    draw: () => (
      <path
        d="M0,31 C-34,9 -34,-16 -18,-24 C-8,-29 0,-22 0,-14 C0,-22 8,-29 18,-24 C34,-16 34,9 0,31 Z"
        fill={BRAND.red}
      />
    ),
  },
  /** Chiếc ô — che chở, hoá giải. */
  'chiec-o': {
    draw: (c) => (
      <>
        <path
          d="M-38,0 a38,34 0 0,1 76,0 Z"
          stroke={c}
          strokeWidth={W}
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M0,0 L0,26 q0,11 -13,11"
          stroke={INK}
          strokeWidth={W}
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  /** Bút lông — viết, đặt tên, ghi lại. */
  but: {
    draw: (c) => (
      <>
        <path d="M-22,29 L17,-13" stroke={INK} strokeWidth={W + 1} strokeLinecap="round" />
        <path d="M13,-17 q15,-15 23,-7 q-8,15 -23,7 Z" fill={c} />
        <path d="M-22,29 l-11,9 l4,-13 Z" fill={c} />
      </>
    ),
  },
};

/**
 * BỐI CẢNH — đồ đạc của một cảnh, khác hẳn `GLYPHS` ở KÍCH THƯỚC và VAI TRÒ:
 * glyph là một ký hiệu cầm tay/nổi trong khung, còn set là thứ nhân vật ngồi
 * vào hoặc đứng cạnh, vẽ đè lên phần dưới thân người.
 *
 * Cố ý để RẤT ÍT món. Mỗi món thêm vào là một thứ nữa phải ăn khớp với chiều
 * cao nhân vật ở mọi tư thế ngồi — và sai một chút thì nhân vật lơ lửng trên
 * mặt bàn. Chỉ thêm khi có kịch bản thật cần.
 */
export const SETS: Record<string, { w: number; h: number; draw: (c: string) => React.ReactNode }> = {
  /** Bàn ăn — mặt bàn + hai chân + hai bát. Cảnh "ngồi ăn cùng nhau". */
  'ban-an': {
    w: 860,
    h: 300,
    draw: (c) => (
      <>
        {/*
         * ⚠️ Bát phải nằm ở y NHỎ HƠN mặt bàn. Bản đầu vẽ bát từ y=64 cong
         * XUỐNG, tức chìm hẳn dưới mặt bàn — render ra chỉ còn hai vạch vàng
         * ló lên. Trong SVG y tăng xuống dưới, nên "đặt lên bàn" = trừ đi.
         */}
        {[250, 610].map((x) => (
          <g key={x}>
            <path d={`M${x - 44},14 q44,84 88,0 Z`} fill={INK} stroke={DARK} strokeWidth={OUT} />
            <path
              d={`M${x - 50},12 L${x + 50},12`}
              stroke={c}
              strokeWidth={12}
              strokeLinecap="round"
            />
          </g>
        ))}
        <rect
          x={0}
          y={64}
          width={860}
          height={36}
          rx={18}
          fill={INK}
          stroke={DARK}
          strokeWidth={OUT}
        />
        <rect
          x={132}
          y={96}
          width={28}
          height={198}
          rx={10}
          fill={INK}
          stroke={DARK}
          strokeWidth={OUT}
        />
        <rect
          x={700}
          y={96}
          width={28}
          height={198}
          rx={10}
          fill={INK}
          stroke={DARK}
          strokeWidth={OUT}
        />
      </>
    ),
  },
  /** Băng ghế — cảnh "ngồi cạnh nhau" mà không có bàn. */
  // ⚠️ Tỉ lệ cao/rộng của băng ghế phải khớp CHIỀU CAO NGỒI: mặt ghế nằm ở
  // đỉnh hộp, nên `h` quyết định ghế cao bao nhiêu so với bề rộng. 140/800
  // là con số giải ngược từ mốc hông của tư thế ngồi — đổi `h` là ghế đâm
  // qua mông hoặc lơ lửng dưới chân.
  'ghe-bang': {
    w: 800,
    h: 140,
    draw: () => (
      <>
        <rect x={0} y={0} width={800} height={30} rx={15} fill={INK} stroke={DARK} strokeWidth={OUT} />
        <rect x={92} y={28} width={24} height={104} rx={9} fill={INK} stroke={DARK} strokeWidth={OUT} />
        <rect
          x={684}
          y={28}
          width={24}
          height={104}
          rx={9}
          fill={INK}
          stroke={DARK}
          strokeWidth={OUT}
        />
      </>
    ),
  },
};

export type SetName = keyof typeof SETS;

export function isSet(name: string | undefined): name is SetName {
  return Boolean(name && name in SETS);
}

/** Vẽ bối cảnh. `width` là bề rộng THẬT trên khung 1080×1920. */
export const SceneSet: React.FC<{ name: SetName; width?: number; color?: string }> = ({
  name,
  width = 860,
  color = BRAND.gold,
}) => {
  const s = SETS[name];
  return (
    <svg width={width} height={(width * s.h) / s.w} viewBox={`0 0 ${s.w} ${s.h}`}>
      {s.draw(color)}
    </svg>
  );
};

export type GlyphName = keyof typeof GLYPHS;

export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];

/** Có phải tên ký hiệu hợp lệ không — dùng để rơi về nhánh an toàn. */
export function isGlyph(name: string | undefined): name is GlyphName {
  return Boolean(name && name in GLYPHS);
}

/**
 * Vẽ một ký hiệu đứng riêng (dùng làm icon trong cảnh).
 *
 * `size` là bề rộng THẬT trên khung 1080×1920; khung nội bộ luôn 100 nên tỉ lệ
 * tự lo, không phải chỉnh từng hình.
 */
export const Glyph: React.FC<{
  name: GlyphName;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ name, size = 116, color = BRAND.gold, style }) => {
  const g = GLYPHS[name];
  const s = g.scale ?? 1;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ overflow: 'visible', ...style }}>
      <g transform={`scale(${s})`}>{g.draw(color)}</g>
    </svg>
  );
};
