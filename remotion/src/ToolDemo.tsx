// remotion/src/ToolDemo.tsx
// ============================================================
// Template clip DEMO CÔNG CỤ. Một trong nhiều template — thêm loại clip mới
// nghĩa là thêm một file cạnh file này, KHÔNG sửa file này.
//
// Bố cục mượn nguyên ngữ pháp hình ảnh đã có của `public/poster.js` (nền navy,
// vạch vàng, triện + tên miền ở chân) để clip và ảnh chia sẻ trông cùng một
// nhà. Không phát minh phong cách mới.
// ============================================================

import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BRAND, FONT } from './brand';
import { Subtitles } from './Subtitles';

export type RenderScene = {
  text: string;
  durationInFrames: number;
  /** File giọng đọc của riêng cảnh này (trong public/), bỏ trống = im lặng. */
  audio?: string;
  visual:
    | { kind: 'card'; heading?: string; body?: string }
    | { kind: 'screen'; recording: string; startSec?: number; label?: string }
    | { kind: 'image'; src: string; caption?: string };
};

// ⚠️ `type` chứ KHÔNG phải `interface`: Remotion đòi props thoả
// `Record<string, unknown>`, mà interface không tự thoả ràng buộc đó còn type
// alias thì có. Đổi sang interface là vỡ typecheck ở `<Composition>`.
export type ToolDemoProps = {
  hook: string;
  hookDurationInFrames: number;
  hookAudio?: string;
  scenes: RenderScene[];
  cta: string;
  ctaDurationInFrames: number;
  ctaAudio?: string;
  toolLabel: string;
  /** Tên file nhạc trong public/music/. Bỏ trống → render KHÔNG nhạc. */
  music?: string;
};

// ── Nền chung ─────────────────────────────────────────────────────────────

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{ background: `linear-gradient(165deg, ${BRAND.navy} 0%, ${BRAND.navy2} 100%)` }}
  />
);

/** Dải thương hiệu trên đỉnh — nhỏ, không tranh chỗ với nội dung. */
const TopBar: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      position: 'absolute',
      top: 64,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    }}
  >
    <div style={{ width: 26, height: 2, background: BRAND.gold, opacity: 0.7 }} />
    <span
      style={{
        fontFamily: FONT.sans,
        fontSize: 22,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color: BRAND.gold,
        opacity: 0.85,
      }}
    >
      {label}
    </span>
    <div style={{ width: 26, height: 2, background: BRAND.gold, opacity: 0.7 }} />
  </div>
);

// ── Hook: khung hình đầu tiên, quyết định sống chết của clip ───────────────

const Hook: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // ⚠️ Chữ phải CÓ MẶT NGAY khung hình 0 — chỉ phóng nhẹ, KHÔNG fade từ 0.
  // Fade-in ở đây là ném đi vài phần mười giây quý nhất: người xem quyết định
  // lướt hay ở lại trước khi animation kịp chạy xong.
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
  const scale = interpolate(s, [0, 1], [0.94, 1]);

  return (
    <AbsoluteFill>
      <Backdrop />
      <TopBar label={label} />
      <AbsoluteFill
        style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px' }}
      >
        <div
          style={{
            fontFamily: FONT.serif,
            fontSize: 88,
            lineHeight: 1.22,
            fontWeight: 700,
            color: BRAND.textOnNavy,
            textAlign: 'center',
            transform: `scale(${scale})`,
          }}
        >
          {text}
        </div>
        <div
          style={{
            marginTop: 44,
            width: interpolate(s, [0, 1], [0, 150]),
            height: 6,
            borderRadius: 3,
            background: BRAND.gold,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Cảnh quay màn hình ────────────────────────────────────────────────────

const ScreenScene: React.FC<{
  recording: string;
  startSec: number;
  label: string;
  toolLabel: string;
  text: string;
}> = ({ recording, startSec, label, toolLabel, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });

  return (
    <AbsoluteFill>
      <Backdrop />
      <TopBar label={toolLabel} />
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 150 }}>
        {/* Khung "điện thoại": bo góc + viền vàng mảnh. Giữ clip quay màn hình
            trong một khung có chủ đích thay vì phủ kín — vừa gọn, vừa chừa chỗ
            an toàn cho phụ đề bên dưới. */}
        <div
          style={{
            // Tỉ lệ khớp viewport quay (393×852 ≈ 0,461) để không phải cắt
            // hai bên — cắt ngang là mất mép giao diện, thứ người xem cần thấy.
            width: 700,
            height: 1180,
            borderRadius: 42,
            overflow: 'hidden',
            border: `3px solid ${BRAND.gold}`,
            boxShadow: '0 30px 90px rgba(0,0,0,.55)',
            transform: `scale(${interpolate(s, [0, 1], [0.97, 1])})`,
            background: '#fff',
          }}
        >
          <OffthreadVideo
            src={staticFile(recording)}
            startFrom={Math.round(startSec * fps)}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
          />
        </div>
        {/* Nhãn cảnh CỐ Ý không hiện dưới khung: chỗ đó là vùng phụ đề, đặt
            thêm chữ vào là hai lớp chữ đè nhau (đã thấy thật trên bản render
            đầu). Nhãn giờ chỉ dùng để mô tả cảnh cho cổng 2 đọc. */}
      </AbsoluteFill>
      <Subtitles text={text} />
    </AbsoluteFill>
  );
};

// ── Cảnh thẻ chữ ──────────────────────────────────────────────────────────

const CardScene: React.FC<{
  heading?: string;
  body?: string;
  toolLabel: string;
  text: string;
}> = ({ heading, body, toolLabel, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });

  return (
    <AbsoluteFill>
      <Backdrop />
      <TopBar label={toolLabel} />
      <AbsoluteFill
        style={{ justifyContent: 'center', alignItems: 'center', padding: '0 90px', paddingBottom: 300 }}
      >
        {heading ? (
          <div
            style={{
              fontFamily: FONT.serif,
              fontSize: 76,
              fontWeight: 700,
              color: BRAND.gold,
              textAlign: 'center',
              opacity: s,
              marginBottom: 26,
            }}
          >
            {heading}
          </div>
        ) : null}
        {body ? (
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 44,
              lineHeight: 1.5,
              color: BRAND.textOnNavy,
              textAlign: 'center',
              opacity: s,
            }}
          >
            {body}
          </div>
        ) : null}
      </AbsoluteFill>
      <Subtitles text={text} />
    </AbsoluteFill>
  );
};

const ImageScene: React.FC<{ src: string; toolLabel: string; text: string }> = ({
  src,
  toolLabel,
  text,
}) => (
  <AbsoluteFill>
    <Backdrop />
    <TopBar label={toolLabel} />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 200 }}>
      <Img src={src.startsWith('http') ? src : staticFile(src)} style={{ width: 880, borderRadius: 28 }} />
    </AbsoluteFill>
    <Subtitles text={text} />
  </AbsoluteFill>
);

// ── Kết + CTA ─────────────────────────────────────────────────────────────

const Outro: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 90px' }}>
        <Img
          src={staticFile('seal.webp')}
          style={{ width: 168, opacity: s, marginBottom: 40 }}
        />
        <div
          style={{
            fontFamily: FONT.serif,
            fontSize: 62,
            lineHeight: 1.3,
            fontWeight: 700,
            color: BRAND.textOnNavy,
            textAlign: 'center',
            opacity: s,
          }}
        >
          {text}
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: FONT.sans,
            fontSize: 40,
            letterSpacing: '0.06em',
            color: BRAND.gold,
            opacity: s,
          }}
        >
          tuviminhbao.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Ghép ──────────────────────────────────────────────────────────────────

export const ToolDemo: React.FC<ToolDemoProps> = ({
  hook,
  hookDurationInFrames,
  hookAudio,
  scenes,
  cta,
  ctaDurationInFrames,
  ctaAudio,
  toolLabel,
  music,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Mốc bắt đầu của từng cảnh, tính TRƯỚC khi dựng JSX. Cộng dồn ngay trong
  // `.map()` thì thứ tự chạy phụ thuộc chi tiết render của React — dễ ra một
  // clip lệch nhịp mà không lỗi nào bắn ra.
  const offsets: number[] = [];
  scenes.reduce((acc, sc) => {
    offsets.push(acc);
    return acc + sc.durationInFrames;
  }, hookDurationInFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.navy }}>
      {/* Nhạc nền: âm lượng thấp hẳn dưới giọng đọc. Bỏ trống `music` thì
          KHÔNG dựng thẻ Audio nào — clip vẫn render bình thường, không vỡ.
          Chủ ý fail-soft: thiếu một file nhạc không được phép chặn cả clip. */}
      {music ? <Audio src={staticFile(`music/${music}`)} volume={0.14} loop /> : null}

      <Sequence durationInFrames={hookDurationInFrames} name="Hook">
        {hookAudio ? <Audio src={staticFile(hookAudio)} /> : null}
        <Hook text={hook} label={toolLabel} />
      </Sequence>

      {scenes.map((sc, i) => {
        return (
          <Sequence key={i} from={offsets[i]} durationInFrames={sc.durationInFrames} name={`Cảnh ${i + 1}`}>
            {sc.audio ? <Audio src={staticFile(sc.audio)} /> : null}
            {sc.visual.kind === 'screen' ? (
              <ScreenScene
                recording={sc.visual.recording}
                startSec={sc.visual.startSec ?? 0}
                label={sc.visual.label ?? ''}
                toolLabel={toolLabel}
                text={sc.text}
              />
            ) : sc.visual.kind === 'image' ? (
              <ImageScene src={sc.visual.src} toolLabel={toolLabel} text={sc.text} />
            ) : (
              <CardScene
                heading={sc.visual.heading}
                body={sc.visual.body}
                toolLabel={toolLabel}
                text={sc.text}
              />
            )}
          </Sequence>
        );
      })}

      <Sequence
        from={durationInFrames - ctaDurationInFrames}
        durationInFrames={ctaDurationInFrames}
        name="Kết"
      >
        {ctaAudio ? <Audio src={staticFile(ctaAudio)} /> : null}
        <Outro text={cta} />
      </Sequence>
    </AbsoluteFill>
  );
};
