import { Composition } from 'remotion';
import { ToolDemo, type ToolDemoProps } from './ToolDemo';
import { InsightClip, type InsightProps } from './InsightClip';
import { CharacterSheet } from './CharacterSheet';
import { VIDEO } from './brand';

/**
 * Tổng thời lượng suy TỪ PROPS chứ không khai cứng: mỗi clip một độ dài, mà độ
 * dài đó do thời lượng giọng đọc từng cảnh quyết định. Khai cứng ở đây là chỗ
 * chắc chắn sẽ lệch — clip bị cắt cụt hoặc thừa mấy giây câm ở đuôi.
 */
const totalFrames = (p: ToolDemoProps | InsightProps) =>
  p.hookDurationInFrames +
  p.scenes.reduce((s, sc) => s + sc.durationInFrames, 0) +
  p.ctaDurationInFrames;

const DEMO: ToolDemoProps = {
  toolLabel: 'Thần Số Học',
  hook: 'Ngày sinh của bạn giấu một con số.',
  hookDurationInFrames: VIDEO.fps * 3,
  scenes: [
    {
      text: 'Chỉ cần ngày tháng năm sinh và họ tên đầy đủ.',
      durationInFrames: VIDEO.fps * 4,
      visual: { kind: 'card', heading: 'Nhập 4 ô', body: 'Ngày · Tháng · Năm · Họ tên' },
    },
  ],
  cta: 'Tra thử miễn phí.',
  ctaDurationInFrames: VIDEO.fps * 3,
};

const INSIGHT: InsightProps = {
  topLabel: 'Bạn là kiểu người nào',
  hook: 'Có ba kiểu người khi bị tổn thương.',
  hookDurationInFrames: VIDEO.fps * 3,
  scenes: [
    {
      text: 'Kiểu thứ nhất chọn im lặng.',
      durationInFrames: VIDEO.fps * 4,
      visual: { kind: 'typo', accent: 'im lặng.' },
    },
  ],
  cta: 'Bạn là kiểu nào?',
  ctaDurationInFrames: VIDEO.fps * 3,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ToolDemo"
      component={ToolDemo}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={DEMO}
      durationInFrames={totalFrames(DEMO)}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
    />
    {/* Clip Layer 1 — insight về người xem, không quay màn hình. */}
    <Composition
      id="InsightClip"
      component={InsightClip}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={INSIGHT}
      durationInFrames={totalFrames(INSIGHT)}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
    />
    {/* Bảng soi tư thế nhân vật — công cụ DUYỆT, không phải clip để đăng. */}
    <Composition
      id="CharacterSheet"
      component={CharacterSheet}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      durationInFrames={1}
    />
  </>
);
