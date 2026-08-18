// remotion/src/CharacterSheet.tsx
// ============================================================
// Bảng soi toàn bộ tư thế của nhân vật signature — KHÔNG phải một cảnh clip.
//
// 🔑 Vì sao có file này: sửa dáng người là việc phải NHÌN mới biết đúng sai, mà
// render cả clip rồi mới soi thì mỗi vòng chỉnh tốn vài phút. Bảng này render
// một khung tĩnh, xem được cả bộ cạnh nhau — chỗ nào lệch tỉ lệ hay trùng dáng
// lộ ra ngay. Cùng lối "render 1 khung hình tĩnh trước" đã dùng cho ToolDemo.
// ============================================================

import { AbsoluteFill } from 'remotion';
import { CHAR, Character, POSES, type PoseName } from './Character';
import { FONT } from './brand';

const NHAN = {
  chao: '1 · Chào / giới thiệu',
  'suy-nghi': '2 · Suy nghĩ',
  'hieu-ra': '3 · Hiểu ra (Aha!)',
  'phan-tich': '4 · Phân tích / quan sát',
  'loi-khuyen': '5 · Đưa ra lời khuyên',
  'tinh-tam': '6 · Tin tưởng / tĩnh tâm',
  'hanh-dong': '7 · Hành động / tiến lên',
  'quay-lung': '+ · Quay lưng',
  'cui-dau': '+ · Cúi đầu',
} satisfies Record<PoseName, string>;

export const CharacterSheet: React.FC = () => {
  const names = Object.keys(POSES) as PoseName[];
  return (
    <AbsoluteFill style={{ background: CHAR.ink, padding: '70px 54px' }}>
      <div
        style={{
          fontFamily: FONT.sans,
          color: CHAR.pink,
          fontSize: 30,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Nhân vật signature
      </div>
      <div style={{ fontFamily: FONT.serif, color: '#fff', fontSize: 62, fontWeight: 700 }}>
        Tử Vi Minh Bảo
      </div>
      <div style={{ fontFamily: FONT.sans, color: '#8A8F98', fontSize: 26, marginTop: 8 }}>
        3,5 đầu · đầu tròn · mắt tròn · không miệng · nét bo tròn đồng nhất
      </div>

      <div
        style={{
          marginTop: 44,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          rowGap: 26,
          columnGap: 10,
        }}
      >
        {names.map((n) => (
          <div key={n} style={{ textAlign: 'center' }}>
            <div
              style={{
                height: 380,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <Character pose={n} height={360} />
            </div>
            <div
              style={{
                fontFamily: FONT.sans,
                color: '#C8CDD4',
                fontSize: 25,
                marginTop: 6,
              }}
            >
              {NHAN[n]}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
