// remotion/src/Subtitles.tsx
// ============================================================
// Phụ đề — CỐ Ý là một component riêng, dùng chung cho mọi loại clip.
//
// Vì sao phụ đề không phải tuỳ chọn: phần lớn người lướt TikTok ở Việt Nam xem
// KHÔNG BẬT TIẾNG. Clip không phụ đề thì với họ là clip câm — mọi công sức viết
// lời đọc đổ đi. Cổng 1 vì thế coi cảnh không có lời đọc là lỗi chặn.
//
// Chữ phụ đề LẤY THẲNG từ `scene.text` của ScriptSpec — cùng một chuỗi vừa đưa
// cho TTS đọc. Một nguồn, nên tiếng và chữ không bao giờ lệch nhau. Nếu tách
// làm hai trường thì sớm muộn có clip nói một đằng hiện một nẻo.
// ============================================================

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND, FONT } from './brand';

/**
 * Cắt một câu dài thành các mẩu vừa đọc.
 *
 * Ngưỡng 42 ký tự/dòng × 2 dòng là quy ước tự đặt: rộng hơn thì chữ nhỏ lại
 * trên màn điện thoại, hẹp hơn thì phụ đề nhảy quá nhanh.
 */
export function chunkSubtitle(text: string, maxChars = 58): string[] {
  const words = text.trim().split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      out.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

export const Subtitles: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // 58 ký tự ≈ 2 dòng ở cỡ chữ 52px trên khổ 1080. Bản đầu để 84 và ra 3 dòng
  // — chiếm gần một phần tư màn hình, che mất chính thứ clip đang giới thiệu.
  const chunks = chunkSubtitle(text);

  // Chia đều thời lượng cảnh cho các mẩu — tương ứng với việc TTS đọc đều.
  const per = durationInFrames / chunks.length;
  const idx = Math.min(chunks.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const appear = interpolate(local, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        // ⚠️ 18% từ đáy là VÙNG AN TOÀN, không phải con số cho đẹp: TikTok phủ
        // caption + nút tương tác lên đúng dải đó. Phụ đề đặt thấp hơn sẽ bị
        // che mất trên máy thật trong khi bản render trông vẫn hoàn hảo.
        paddingBottom: '18%',
        paddingLeft: 70,
        paddingRight: 70,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 52,
          lineHeight: 1.35,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          opacity: appear,
          transform: `translateY(${(1 - appear) * 12}px)`,
          // Viền đậm thay vì nền khối: chữ vẫn đọc được trên mọi nền (kể cả
          // ảnh chụp màn hình nền trắng) mà không che mất phần hình bên dưới.
          textShadow: `0 0 18px rgba(6,26,46,.95), 0 3px 0 rgba(6,26,46,.9), 0 -3px 0 rgba(6,26,46,.9), 3px 0 0 rgba(6,26,46,.9), -3px 0 0 rgba(6,26,46,.9)`,
          letterSpacing: '-0.01em',
        }}
      >
        {chunks[idx]}
      </div>
      <div style={{ height: 6 }} />
      <div
        style={{
          width: 90,
          height: 5,
          borderRadius: 3,
          background: BRAND.gold,
          opacity: 0.55 * appear,
        }}
      />
    </AbsoluteFill>
  );
};
