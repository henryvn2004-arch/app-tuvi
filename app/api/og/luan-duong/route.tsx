// app/api/og/luan-duong/route.tsx
// OG card ĐỘNG cho link chia sẻ phiên Luận Đường (/luan-duong/<id>). Thay ảnh seal
// tĩnh bằng thẻ cá nhân hoá (tên/ngày sinh người xem + thầy luận + trích lời thầy)
// → preview trên FB/Zalo/iMessage hấp dẫn hơn nhiều → tăng click vào phễu chia sẻ.
// Params (do trang /luan-duong truyền, đã escape sẵn server-side):
//   ?ctx=<nhãn lá số>&thay=<tên thầy>&q=<trích lời thầy>
export const runtime = 'edge';

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ctx = (sp.get('ctx') || '').slice(0, 80);
  const thay = (sp.get('thay') || 'Thầy Luận Đường').slice(0, 40);
  const q = (sp.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 150);

  const fonts = await loadOgFonts([400, 700]);
  // Nới regex ở bản trước mới giảm TẦN SUẤT trượt; mảng rỗng vẫn ném 500. Chốt thật.
  if (!fonts.length) return ogFallbackRedirect(req);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#061A2E',
          fontFamily: 'BeVN, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '64px 72px',
        }}
      >
        {/* nền loang gold góc phải */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.10)',
            display: 'flex',
          }}
        />
        {/* con dấu 紫微明寶 */}
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '72px',
            width: '96px',
            height: '96px',
            borderRadius: '12px',
            border: '2px solid rgba(201,168,76,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c9a84c',
            fontSize: '30px',
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          <span>紫微</span>
          <span>明寶</span>
        </div>

        {/* eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '34px', height: '2px', background: '#c9a84c', display: 'flex' }} />
          <span style={{ fontSize: '15px', color: '#c9a84c', letterSpacing: '5px' }}>
            LUẬN ĐƯỜNG · TỬ VI MINH BẢO
          </span>
        </div>

        {/* nhãn lá số (tên · ngày · giới) */}
        <div style={{ fontSize: ctx.length > 42 ? '40px' : '48px', color: '#ffffff', fontWeight: 700, display: 'flex', marginBottom: '10px' }}>
          {ctx || 'Lá số Tử Vi'}
        </div>
        {/* thầy luận */}
        <div style={{ fontSize: '22px', color: '#c9a84c', display: 'flex', marginBottom: '30px' }}>
          Luận bởi Thầy {thay}
        </div>

        {/* trích lời thầy */}
        {q ? (
          <div style={{ display: 'flex', maxWidth: '900px' }}>
            <div style={{ width: '4px', background: 'rgba(201,168,76,0.7)', borderRadius: '2px', display: 'flex', marginRight: '20px' }} />
            <div style={{ fontSize: '27px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, display: 'flex' }}>
              “{q}…”
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.7)', display: 'flex', maxWidth: '860px', lineHeight: 1.5 }}>
            Lời luận giải riêng cho lá số này — nhấn để đọc và hỏi thầy cho chính bạn.
          </div>
        )}

        {/* footer CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 700, display: 'flex' }}>Xem lời thầy luận</span>
          <span style={{ fontSize: '20px', color: '#c9a84c', display: 'flex' }}>→</span>
          <span style={{ fontSize: '18px', color: 'rgba(201,168,76,0.6)', display: 'flex', marginLeft: 'auto' }}>tuviminhbao.com</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' },
    },
  );
}
