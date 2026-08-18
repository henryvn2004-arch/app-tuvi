// remotion/src/CharacterSheet.tsx
// ============================================================
// Bảng soi toàn bộ tư thế + đạo cụ của nhân vật signature — KHÔNG phải cảnh clip.
//
// 🔑 Vì sao có file này: sửa dáng người là việc phải NHÌN mới biết đúng sai, mà
// render cả clip rồi mới soi thì mỗi vòng chỉnh tốn vài phút. Bảng này render
// một khung tĩnh, xem được cả bộ cạnh nhau — chỗ nào lệch tỉ lệ hay trùng dáng
// lộ ra ngay. Cùng lối "render 1 khung hình tĩnh trước" đã dùng cho ToolDemo.
//
// ⚠️ Bảng tĩnh KHÔNG thay được việc xem clip: từ khi nhân vật có nhịp riêng
// (vẫy tay, bước đi, đi xa dần), phần lớn giá trị nằm ở CHUYỂN ĐỘNG mà một
// khung hình không chứa nổi. Mỗi tư thế ở đây vì thế bị "đóng băng" tại một
// mốc thời gian chọn tay — đủ để soi hình dạng, không đủ để chấm nhịp.
// ============================================================

import { AbsoluteFill } from 'remotion';
import { CHAR, Character, POSE_NAMES, type PoseName } from './Character';
import { GLYPH_NAMES, Glyph } from './Glyphs';
import { FONT } from './brand';

const NHAN = {
  chao: '1 · Chào (vẫy tay)',
  'suy-nghi': '2 · Suy nghĩ',
  'hieu-ra': '3 · Hiểu ra (Aha!)',
  'phan-tich': '4 · Phân tích',
  'loi-khuyen': '5 · Lời khuyên',
  'tinh-tam': '6 · Tĩnh tâm',
  'hanh-dong': '7 · Bước đi',
  'quay-lung': '+ · Quay lưng, đi xa',
  'cui-dau': '+ · Cúi đầu',
  'ngoi-buon': '8 · Ngồi lặng',
  'ngoi-an': '9 · Ngồi ăn',
  chay: '10 · Chạy',
  'voi-tay': '11 · Với tay',
  'dang-tay': '12 · Dang tay',
  'che-mat': '13 · Che mặt',
  'ngoai-lai': '14 · Ngoái lại',
} satisfies Record<PoseName, string>;

/**
 * Mốc giây "đóng băng" từng tư thế — chọn tay để bắt đúng đỉnh của nhịp.
 *
 * Không có bảng này thì `hanh-dong` và `quay-lung` rơi vào lúc `sin = 0`, tức
 * hai chân chụm lại, và bảng soi sẽ báo là hai tư thế đó "trùng dáng đứng
 * yên" trong khi trên clip chúng đang bước.
 */
const FREEZE: Record<PoseName, number> = {
  chao: 0.3,
  'suy-nghi': 0.9,
  'hieu-ra': 0.12,
  'phan-tich': 1.2,
  'loi-khuyen': 1.1,
  'tinh-tam': 0.9,
  'hanh-dong': 0.27,
  'quay-lung': 0.33,
  'cui-dau': 1.6,
  'ngoi-buon': 1.6,
  'ngoi-an': 0.32,
  chay: 0.17,
  'voi-tay': 0.35,
  'dang-tay': 0.6,
  'che-mat': 0.6,
  'ngoai-lai': 0.36,
};

/** Đạo cụ gắn kèm vài tư thế, để soi luôn chỗ vật nằm trên tay. */
const PROP_OF: Partial<Record<PoseName, string>> = {
  'phan-tich': 'kinh-lup',
  'loi-khuyen': 'trai-tim',
  'hieu-ra': 'la-so',
  'ngoi-buon': 'dong-ho',
};

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{ background: CHAR.ink, padding: '54px 48px' }}>
    <div
      style={{
        fontFamily: FONT.sans,
        color: CHAR.accent,
        fontSize: 28,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
      }}
    >
      Nhân vật signature
    </div>
    <div style={{ fontFamily: FONT.serif, color: '#fff', fontSize: 56, fontWeight: 700 }}>
      Tử Vi Minh Bảo
    </div>
    <div style={{ fontFamily: FONT.sans, color: '#8A8F98', fontSize: 24, marginTop: 6 }}>
      3,5 đầu · không miệng · nét bo tròn · màu nhấn = vàng thương hiệu
    </div>

    <div
      style={{
        marginTop: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        rowGap: 10,
        columnGap: 6,
      }}
    >
      {POSE_NAMES.map((n) => (
        <div key={n} style={{ textAlign: 'center' }}>
          <div
            style={{ height: 268, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <Character pose={n} timeSec={FREEZE[n]} prop={PROP_OF[n]} height={252} />
          </div>
          <div style={{ fontFamily: FONT.sans, color: '#C8CDD4', fontSize: 20, marginTop: 2 }}>
            {NHAN[n]}
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        marginTop: 26,
        fontFamily: FONT.sans,
        color: CHAR.accent,
        fontSize: 24,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}
    >
      Đạo cụ · icon ({GLYPH_NAMES.length})
    </div>
    <div
      style={{
        marginTop: 14,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        rowGap: 12,
        columnGap: 8,
      }}
    >
      {GLYPH_NAMES.map((g) => (
        <div key={g} style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Glyph name={g} size={78} />
          </div>
          <div style={{ fontFamily: FONT.sans, color: '#8A8F98', fontSize: 17, marginTop: 2 }}>
            {g}
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
