// remotion/src/InsightClip.tsx
// ============================================================
// Template clip LAYER 1 — "insight về người xem", KHÔNG quay màn hình.
//
// 🔑 VÌ SAO PHẢI CÓ TEMPLATE THỨ HAI: `ToolDemo.tsx` dựng quanh một bản quay
// màn hình thật (`OffthreadVideo`). Nhưng nội dung kiểu *"Có ba kiểu người
// khi bị tổn thương"* thì KHÔNG có màn hình nào để quay — mà đó lại là 70%
// lượng clip theo chiến lược kênh. Nhồi loại nội dung đó vào `ToolDemo` là
// dựng một khung điện thoại rỗng ở giữa clip.
//
// Hai loại cảnh, cùng một nhận diện (nền navy, vạch vàng, triện ở kết):
//   · `typo`  — chữ lớn hiện dần theo TỪNG TỪ. 0đ, không cần asset nào.
//   · `photo` — một bức ảnh có sẵn (vd 64 bức tranh quẻ đã sinh, nằm trong
//               Supabase Storage) + Ken Burns. Cũng 0đ vì ảnh đã có.
//
// ⚠️ Cảnh `typo` CỐ Ý KHÔNG dùng component phụ đề: chữ lớn giữa khung CHÍNH
// LÀ phụ đề. Bật thêm phụ đề ở dưới là hai lớp chữ nói cùng một câu.
// ============================================================

import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BRAND, FONT } from './brand';

export type InsightScene = {
  text: string;
  durationInFrames: number;
  /** File giọng đọc của riêng cảnh này (trong public/). Bỏ trống = im lặng. */
  audio?: string;
  visual:
    | { kind: 'typo'; accent?: string }
    | { kind: 'photo'; src: string; accent?: string; caption?: string };
};

// `type` chứ không `interface` — Remotion đòi props thoả `Record<string, unknown>`.
export type InsightProps = {
  hook: string;
  hookDurationInFrames: number;
  hookAudio?: string;
  scenes: InsightScene[];
  cta: string;
  ctaDurationInFrames: number;
  ctaAudio?: string;
  /** Nhãn nhỏ trên đỉnh — chủ đề, KHÔNG phải tên công cụ. */
  topLabel: string;
  music?: string;
  /**
   * Ảnh NỀN cho cả clip (0 · 1 · nhiều bức, luân phiên đều theo thời lượng).
   *
   * 🔑 Khác hẳn `visual.kind = 'photo'` vốn là ảnh CỦA MỘT CẢNH. Nội dung Layer
   * 1 có 20+ cảnh nhưng không có 20 bức ảnh hợp cảnh, và ảnh đổi mỗi 3 giây thì
   * mắt chạy theo ảnh chứ không đọc chữ. Ảnh nền thì ngược lại: giữ chữ làm
   * chính, ảnh chỉ bỏ cái nền phẳng đi.
   */
  backdrop?: string[];
};

// ── Nền ───────────────────────────────────────────────────────────────────

/**
 * Nền navy + một vệt sáng trôi rất chậm.
 *
 * Vệt sáng không phải trang trí: nền phẳng tuyệt đối trên khung dọc 20 giây
 * đọc thành "ảnh tĩnh có chữ", và người xem lướt qua. Chuyển động chậm giữ
 * cảm giác clip đang chạy kể cả ở cảnh chỉ có chữ.
 */
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(165deg, ${BRAND.navy} 0%, ${BRAND.navy2} 100%)` }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${18 + t * 26}%`,
          width: 1500,
          height: 1500,
          marginLeft: -750,
          marginTop: -750,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.gold}22 0%, transparent 62%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Số khung hình chuyển giữa hai ảnh nền. */
const XFADE = 26;

/**
 * Ảnh nền phủ toàn khung + lớp phủ để chữ còn đọc được.
 *
 * 🔴 PHẢI ĐẶT NGOÀI MỌI `Sequence`. `useCurrentFrame()` bên trong một Sequence
 * trả về khung hình CỤC BỘ của sequence đó — đặt ở trong thì Ken Burns nhảy về
 * đầu mỗi lần đổi cảnh, tức 21 lần giật trong một clip. Đặt ngoài thì nó đọc
 * khung hình của cả clip và trôi liền một mạch.
 *
 * 🔑 LỚP PHỦ LÀ BẮT BUỘC, không phải để cho đẹp. Tranh nền sáng và nhiều chi
 * tiết; chữ trắng đặt thẳng lên là mất chữ ở đúng những khung có mảng sáng. Phủ
 * navy đậm rồi mới đặt chữ ⇒ độ đọc không phụ thuộc vào việc bức tranh kia sáng
 * hay tối, nên đổi ảnh khác không phải cân lại.
 */
const PhotoBackdrop: React.FC<{ images: string[] }> = ({ images }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const seg = durationInFrames / Math.max(1, images.length);
  // Ken Burns chạy suốt cả clip, KHÔNG reset theo từng ảnh: một chuyển động
  // chậm liền mạch đọc là "máy quay đang trôi", còn nhiều đoạn zoom ngắn nối
  // nhau đọc là trình chiếu ảnh.
  const scale = interpolate(frame, [0, Math.max(1, durationInFrames)], [1.05, 1.18], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: BRAND.navy }}>
      {images.map((src, i) => {
        const start = i * seg;
        const end = start + seg;
        // Ảnh đầu hiện sẵn từ khung 0 (không fade vào từ nền trống); ảnh cuối
        // giữ tới hết. Chỉ các mối nối ở giữa mới chuyển.
        const opacity = interpolate(
          frame,
          [start - XFADE, start, end - XFADE, end],
          [i === 0 ? 1 : 0, 1, 1, i === images.length - 1 ? 1 : 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        if (opacity <= 0) return null;
        return (
          <AbsoluteFill key={src} style={{ opacity }}>
            <Img
              src={staticFile(src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale})`,
              }}
            />
          </AbsoluteFill>
        );
      })}
      {/*
       * 🔑 KHÔNG còn phủ navy toàn khung.
       *
       * Bản trước phủ 0,64 lên cả khung để ép tương phản chữ — tức trả tiền cho
       * một bức ảnh rồi giấu nó đi. Nay tương phản do NỀN RIÊNG CỦA CHỮ
       * (`TextPlate`) lo, nên lớp này chỉ còn giữ TÔNG thương hiệu: đủ để bức
       * ảnh ngả về navy chứ không đủ để nó chìm.
       *
       * ⚠️ Đổi 0,20 thì phải soi lại bằng mắt trên ảnh SÁNG NHẤT trong kho —
       * plate lo phần chữ, còn số này lo phần nhìn.
       */}
      <AbsoluteFill style={{ background: BRAND.navy, opacity: 0.2 }} />
      {/*
       * Tối dần hai đầu — GIỮ, và không phải để cho đẹp: nhãn TopBar nằm ở mép
       * trên, còn TikTok phủ caption + thanh điều hướng lên ~250px mép dưới.
       * Hai vùng đó phải tối bất kể bức ảnh bên dưới là gì.
       */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${BRAND.navy} 0%, transparent 22%, transparent 74%, ${BRAND.navy} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Nền riêng cho khối chữ, thay cho lớp phủ toàn khung.
 *
 * 🔑 Vì sao đổi: phủ cả khung là cách THÔ để lấy tương phản — nó giải quyết
 * chữ bằng cách hy sinh ảnh. Nền bám riêng khối chữ giải quyết đúng chỗ cần:
 * ảnh giữ nguyên ở mọi chỗ KHÔNG có chữ.
 *
 * ⚠️ Hộp phải ổn định suốt cảnh. `WordKaraoke` dựng SẴN mọi từ ngay từ khung 0
 * (chỉ đổi `opacity` theo nhịp đọc) nên chiều cao không nhảy — nếu sau này đổi
 * sang thật sự thêm từ dần thì plate sẽ giật theo, lúc đó phải đo hộp theo bản
 * chữ ĐẦY ĐỦ chứ không theo phần đang hiện.
 *
 * `blur` phía sau giữ được vệt màu và bố cục của ảnh (mắt vẫn thấy có ảnh ở
 * dưới) trong khi chi tiết nhiễu thì tan đi — đó mới là thứ ăn mất chữ.
 */
const TextPlate: React.FC<{ on?: boolean; children: React.ReactNode }> = ({ on, children }) =>
  on ? (
    <div
      style={{
        padding: '44px 52px',
        borderRadius: 34,
        background: `${BRAND.navy}D9`,
        backdropFilter: 'blur(18px)',
        border: `1px solid ${BRAND.gold}33`,
        boxShadow: '0 26px 80px rgba(0,0,0,.42)',
      }}
    >
      {children}
    </div>
  ) : (
    <>{children}</>
  );

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

// ── Chữ hiện dần theo từng từ ─────────────────────────────────────────────

/**
 * Cỡ chữ co theo độ dài câu.
 *
 * Khai một cỡ cố định thì câu dài tràn khỏi khung dọc — và trên khổ 9:16 thì
 * chữ tràn không "xuống dòng đẹp", nó đẩy cả khối lệch khỏi vùng an toàn của
 * TikTok (thanh nút bên phải + caption dưới đáy).
 */
function fitSize(len: number, base: number) {
  if (len <= 34) return base;
  if (len <= 52) return base * 0.84;
  if (len <= 74) return base * 0.7;
  return base * 0.6;
}

/** Bỏ dấu câu để so khớp `accent` với từng từ. */
const bare = (w: string) => w.replace(/[.,!?:;"'“”…]/g, '').toLowerCase();

/**
 * Cả câu hiện NGAY, rồi sáng dần theo nhịp đọc (kiểu karaoke).
 *
 * 🔴 BẢN ĐẦU CHO CHỮ HIỆN LẦN LƯỢT TỪNG TỪ VÀ ĐÓ LÀ SAI — soi khung hình thật
 * mới thấy: ở đầu mỗi cảnh khung gần như TRỐNG (một hai từ nhỏ nằm lệch trái,
 * phần còn lại là nền), mà đầu cảnh đúng là lúc người xem quyết định lướt
 * tiếp. Hiệu ứng "chữ chạy dần" đẹp khi xem một mình, nhưng nó mua chuyển
 * động bằng cách bỏ trống khung — đắt hơn nhiều so với thứ nó đổi lại.
 *
 * Cách này giữ được cả hai: khung LUÔN đầy chữ (đọc trước được cả câu, tốt cho
 * retention) mà vẫn có chuyển động bám theo giọng đọc.
 *
 * `accent` là chuỗi con trong `text` được tô vàng — khai riêng chứ KHÔNG nhúng
 * ký hiệu vào `text`, vì chính chuỗi đó còn gửi cho TTS và dùng làm phụ đề;
 * nhét `*sao*` vào là giọng đọc đọc luôn dấu sao.
 */
const WordKaraoke: React.FC<{
  text: string;
  accent?: string;
  baseSize: number;
}> = ({ text, accent, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const size = fitSize(text.length, baseSize);
  const accentWords = accent ? new Set(accent.split(/\s+/).map(bare).filter(Boolean)) : null;

  // Cả khối nhích lên một nhịp ở đầu cảnh — đủ để mắt biết cảnh vừa đổi.
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 10 });

  // Nhịp sáng rải đều trong 78% cảnh: chạy hết quá sớm thì nửa sau đứng im,
  // quá muộn thì chữ còn đang sáng trong khi giọng đã đọc xong câu.
  const per = (durationInFrames * 0.78) / Math.max(1, words.length);

  return (
    <div
      style={{
        fontFamily: FONT.serif,
        fontSize: size,
        lineHeight: 1.26,
        fontWeight: 700,
        textAlign: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 0.26em',
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
      }}
    >
      {words.map((w, i) => {
        // Sáng dần quanh mốc của từ đó thay vì bật tắt — bật tắt trông giật.
        const lit = interpolate(frame, [i * per - 2, i * per + 5], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const hot = accentWords?.has(bare(w));
        return (
          <span
            key={i}
            style={{
              color: hot ? BRAND.gold : BRAND.textOnNavy,
              opacity: interpolate(lit, [0, 1], [hot ? 0.42 : 0.3, 1]),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────

const Hook: React.FC<{ text: string; label: string; noBg?: boolean }> = ({ text, label, noBg }) => (
  <AbsoluteFill>
    {noBg ? null : <Backdrop />}
    <TopBar label={label} />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 78px' }}>
      {/* ⚠️ Hook KHÔNG reveal từng từ: ba giây đầu quyết định người ta lướt hay
          ở lại, và chữ chạy dần nghĩa là giây đầu tiên chưa đọc được gì. */}
      <TextPlate on={noBg}>
        <HookText text={text} />
      </TextPlate>
    </AbsoluteFill>
  </AbsoluteFill>
);

const HookText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
  return (
    <>
      <div
        style={{
          fontFamily: FONT.serif,
          fontSize: fitSize(text.length, 96),
          lineHeight: 1.2,
          fontWeight: 700,
          color: BRAND.textOnNavy,
          textAlign: 'center',
          transform: `scale(${interpolate(s, [0, 1], [0.94, 1])})`,
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
    </>
  );
};

// ── Cảnh chữ ──────────────────────────────────────────────────────────────

const TypoScene: React.FC<{ text: string; accent?: string; label: string; noBg?: boolean }> = ({
  text,
  accent,
  label,
  noBg,
}) => (
  <AbsoluteFill>
    {noBg ? null : <Backdrop />}
    <TopBar label={label} />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 88px' }}>
      <TextPlate on={noBg}>
        <WordKaraoke text={text} accent={accent} baseSize={86} />
      </TextPlate>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ── Cảnh ảnh ──────────────────────────────────────────────────────────────

/**
 * Ảnh phủ gần kín khung + Ken Burns, chữ nằm dưới trên nền tối dần.
 *
 * ⚠️ Lớp tối phía dưới là BẮT BUỘC, không phải thẩm mỹ: ảnh quẻ có vùng sáng
 * và vùng tối lẫn lộn, đặt chữ trắng thẳng lên là có bức đọc được có bức mất
 * hẳn chữ — mà mỗi clip lại dùng một bức khác nhau nên không kiểm bằng mắt
 * từng cái được.
 */
const PhotoScene: React.FC<{
  src: string;
  text: string;
  accent?: string;
  label: string;
  noBg?: boolean;
}> = ({ src, text, accent, label, noBg }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(p, [0, 1], [1.02, 1.12]);

  return (
    <AbsoluteFill>
      {noBg ? null : <Backdrop />}
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 186 }}>
        <div
          style={{
            width: 944,
            height: 944,
            borderRadius: 28,
            overflow: 'hidden',
            border: `3px solid ${BRAND.gold}66`,
            boxShadow: '0 30px 90px rgba(0,0,0,.55)',
          }}
        >
          <Img
            src={src.startsWith('http') ? src : staticFile(src)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
            }}
          />
        </div>
      </AbsoluteFill>
      <TopBar label={label} />

      {/* Dải tối ôm mép dưới ảnh — ảnh quẻ có bức sáng bức tối, không có lớp
          này thì có bức chữ đọc được có bức mất hẳn, mà mỗi clip lại dùng một
          bức khác nên không soi bằng mắt từng cái được. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent 54%, ${BRAND.navy}E6 62%, ${BRAND.navy} 70%)`,
        }}
      />
      {/* Chữ đặt GIỮA khoảng trống dưới ảnh, không dán xuống đáy: TikTok phủ
          caption + thanh điều hướng lên ~250px cuối khung. */}
      <div
        style={{
          position: 'absolute',
          top: 1176,
          left: 0,
          right: 0,
          bottom: 258,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 78px',
        }}
      >
        <WordKaraoke text={text} accent={accent} baseSize={66} />
      </div>
    </AbsoluteFill>
  );
};

// ── Kết ───────────────────────────────────────────────────────────────────

const Outro: React.FC<{ text: string; noBg?: boolean }> = ({ text, noBg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });

  return (
    <AbsoluteFill>
      {noBg ? null : <Backdrop />}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 88px' }}>
        <TextPlate on={noBg}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Img src={staticFile('seal.webp')} style={{ width: 156, opacity: s, marginBottom: 38 }} />
            <div
              style={{
                fontFamily: FONT.serif,
                fontSize: fitSize(text.length, 62),
                lineHeight: 1.32,
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
                marginTop: 38,
                fontFamily: FONT.sans,
                fontSize: 40,
                letterSpacing: '0.06em',
                color: BRAND.gold,
                opacity: s,
              }}
            >
              tuviminhbao.com
            </div>
          </div>
        </TextPlate>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Ghép ──────────────────────────────────────────────────────────────────

export const InsightClip: React.FC<InsightProps> = ({
  hook,
  hookDurationInFrames,
  hookAudio,
  scenes,
  cta,
  ctaDurationInFrames,
  ctaAudio,
  topLabel,
  music,
  backdrop,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Mốc bắt đầu tính TRƯỚC khi dựng JSX — cộng dồn trong `.map()` thì thứ tự
  // chạy phụ thuộc chi tiết render của React (bài học từ `ToolDemo`).
  const offsets: number[] = [];
  scenes.reduce((acc, sc) => {
    offsets.push(acc);
    return acc + sc.durationInFrames;
  }, hookDurationInFrames);

  // Có ảnh nền ⇒ ảnh vẽ MỘT lần ở ngoài, và mọi cảnh thôi vẽ nền riêng của nó.
  // Thiếu vế thứ hai thì nền navy của từng cảnh phủ kín ảnh và cả clip trông y
  // hệt bản không có ảnh — hỏng theo kiểu KHÔNG có lỗi nào bắn ra.
  const hasBg = Boolean(backdrop && backdrop.length);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.navy }}>
      {music ? <Audio src={staticFile(`music/${music}`)} volume={0.3} loop /> : null}
      {hasBg ? <PhotoBackdrop images={backdrop as string[]} /> : null}

      <Sequence durationInFrames={hookDurationInFrames} name="Hook">
        {hookAudio ? <Audio src={staticFile(hookAudio)} /> : null}
        <Hook text={hook} label={topLabel} noBg={hasBg} />
      </Sequence>

      {scenes.map((sc, i) => (
        <Sequence
          key={i}
          from={offsets[i]}
          durationInFrames={sc.durationInFrames}
          name={`Cảnh ${i + 1}`}
        >
          {sc.audio ? <Audio src={staticFile(sc.audio)} /> : null}
          {sc.visual.kind === 'photo' ? (
            <PhotoScene
              src={sc.visual.src}
              text={sc.text}
              accent={sc.visual.accent}
              label={topLabel}
              noBg={hasBg}
            />
          ) : (
            <TypoScene text={sc.text} accent={sc.visual.accent} label={topLabel} noBg={hasBg} />
          )}
        </Sequence>
      ))}

      <Sequence
        from={durationInFrames - ctaDurationInFrames}
        durationInFrames={ctaDurationInFrames}
        name="Kết"
      >
        {ctaAudio ? <Audio src={staticFile(ctaAudio)} /> : null}
        <Outro text={cta} noBg={hasBg} />
      </Sequence>
    </AbsoluteFill>
  );
};
