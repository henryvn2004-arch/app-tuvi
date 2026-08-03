// app/api/og/social/route.tsx
// ============================================================
// M2 (track Media Pipeline) — render ảnh ĐĂNG MẠNG XÃ HỘI bằng Satori.
//
// VÌ SAO SATORI CHỨ KHÔNG PHẢI MODEL SINH ẢNH: đo trên prod, mỗi lượt
// `gpt-image-1` tốn 1.658đ — khoản đắt nhất hệ thống (~96% chi phí một lượt
// chân dung). Một pipeline chạy hằng ngày mà gọi model ảnh thì tiền đội lên
// theo số bài. Satori render ngay trong edge runtime, **0đ**, và ra chữ tiếng
// Việt sắc nét hơn hẳn model ảnh (model hay viết sai dấu).
//
// URL CHÍNH LÀ FILE. Không lưu bucket: mỗi URL tự nó là công thức dựng lại bức
// ảnh, ổn định và công khai — đúng thứ Instagram Graph API đòi hỏi (nó không
// nhận upload trực tiếp, chỉ nhận URL). Cache 7 ngày ở CDN.
//
// Hai biến thể, cố ý chỉ hai:
//   quote → 1080×1350 (4:5) — khung cao nhất mà feed Facebook/Instagram cho phép
//   story → 1080×1920 (9:16) — story/reels/TikTok
// ============================================================
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const NAVY = '#061A2E';
const NAVY_2 = '#0D3B5E';
const GOLD = '#c9a84c';

const SIZES = {
  quote: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
} as const;
type Variant = keyof typeof SIZES;

// Cache font qua các lượt gọi edge. Hai độ đậm: câu trích cần 700, phần phụ 400.
const fontCache: Record<number, ArrayBuffer | null> = {};

async function loadFont(weight: 400 | 700): Promise<ArrayBuffer | null> {
  if (fontCache[weight] !== undefined) return fontCache[weight];
  try {
    // Satori chỉ đọc được TTF — khai User-Agent cũ để Google Fonts trả TTF thay
    // vì WOFF2 (cùng mẹo đã dùng ở /api/og).
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&display=swap`, {
      headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' },
    }).then((r) => r.text());
    const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!m) {
      fontCache[weight] = null;
      return null;
    }
    fontCache[weight] = await fetch(m[1]).then((r) => r.arrayBuffer());
    return fontCache[weight];
  } catch {
    fontCache[weight] = null;
    return null;
  }
}

/** Câu trích dài thì chữ nhỏ lại — giữ cho khối chữ luôn vừa khung, không tràn. */
function quoteSize(len: number, variant: Variant): number {
  const base = variant === 'story' ? 1.12 : 1;
  if (len > 150) return Math.round(46 * base);
  if (len > 110) return Math.round(54 * base);
  if (len > 70) return Math.round(62 * base);
  return Math.round(72 * base);
}

function clamp(s: string, max: number): string {
  const t = (s || '').trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s*\S+$/, '') + '…' : t;
}

export async function GET(request: NextRequest) {
  const p = new URL(request.url).searchParams;

  const variant: Variant = p.get('v') === 'story' ? 'story' : 'quote';
  const { w, h } = SIZES[variant];
  const kicker = clamp(p.get('k') || 'TỬ VI MINH BẢO', 40);
  const quote = clamp(p.get('q') || '', 190);
  const title = clamp(p.get('t') || '', 90);

  const [f400, f700] = await Promise.all([loadFont(400), loadFont(700)]);
  const fonts = [
    ...(f700 ? [{ name: 'BeVN', data: f700, weight: 700 as const, style: 'normal' as const }] : []),
    ...(f400 ? [{ name: 'BeVN', data: f400, weight: 400 as const, style: 'normal' as const }] : []),
  ];
  const fontFamily = fonts.length ? 'BeVN, sans-serif' : 'sans-serif';

  // Story cao hơn feed 570px — dồn phần dư vào khoảng đệm trên/dưới để khối
  // chữ vẫn nằm giữa tầm mắt, thay vì kéo giãn chữ ra cho đầy.
  const padY = variant === 'story' ? 200 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: `${w}px`,
          height: `${h}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: NAVY,
          padding: `${padY}px 88px`,
          fontFamily,
          position: 'relative',
        }}
      >
        {/* Vệt sáng góc — cùng ngôn ngữ thị giác với OG image của site */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: `${Math.round(w * 0.55)}px`,
            height: `${h}px`,
            background: `linear-gradient(160deg, transparent 0%, ${NAVY_2} 100%)`,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '64px', height: '4px', background: GOLD, marginBottom: '30px', display: 'flex' }} />
          <div style={{ fontSize: '24px', color: GOLD, letterSpacing: '6px', display: 'flex' }}>
            {kicker.toUpperCase()}
          </div>
        </div>

        {/* Câu trích — vai chính của bức ảnh */}
        <div
          style={{
            display: 'flex',
            fontSize: `${quoteSize(quote.length, variant)}px`,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.42,
          }}
        >
          {quote}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {title ? (
            <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.52)', marginBottom: '18px', display: 'flex' }}>
              {title}
            </div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '2px', background: GOLD, marginRight: '18px', display: 'flex' }} />
            <div style={{ fontSize: '26px', color: GOLD, letterSpacing: '2px', display: 'flex' }}>tuviminhbao.com</div>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    },
  );
}
