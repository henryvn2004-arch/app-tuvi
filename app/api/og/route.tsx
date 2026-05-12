// app/api/og/route.tsx — Dynamic OG image for all content types
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Cache font across edge invocations
let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache;
  try {
    // @vercel/og (Satori) only supports TTF — request old UA to get TTF from Google Fonts
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' } }
    ).then(r => r.text());
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!match) return null;
    fontCache = await fetch(match[1]).then(r => r.arrayBuffer());
    return fontCache;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawTitle = searchParams.get('title') || 'Tử Vi Minh Bảo';
  const sub      = searchParams.get('sub') || '';

  const title = rawTitle.length > 55 ? rawTitle.slice(0, 52) + '…' : rawTitle;
  const fontSize = title.length > 36 ? 40 : 52;

  const fontData = await loadFont();
  const fonts = fontData
    ? [{ name: 'BeVN', data: fontData, weight: 700 as const, style: 'normal' as const }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#061A2E',
          padding: '64px 80px',
          fontFamily: fonts.length ? 'BeVN, sans-serif' : 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Right gradient */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '480px', height: '630px',
          background: 'linear-gradient(135deg, transparent 0%, #0D3B5E 100%)',
          display: 'flex',
        }} />

        {/* Gold accent bar */}
        <div style={{ width: '56px', height: '3px', background: '#c9a84c', marginBottom: '28px', display: 'flex' }} />

        {/* Site name */}
        <div style={{
          fontSize: '15px', color: '#c9a84c',
          letterSpacing: '5px', textTransform: 'uppercase',
          marginBottom: '32px', display: 'flex',
        }}>
          TỬ VI MINH BẢO
        </div>

        {/* Title */}
        <div style={{
          fontSize: `${fontSize}px`, color: '#FFFFFF', fontWeight: 700,
          lineHeight: 1.3, flex: 1, display: 'flex', alignItems: 'center',
          maxWidth: '960px',
        }}>
          {title}
        </div>

        {/* Category / subtitle */}
        {sub ? (
          <div style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.5)',
            marginTop: '24px', display: 'flex',
          }}>
            {sub}
          </div>
        ) : null}

        {/* Domain */}
        <div style={{
          fontSize: '15px', color: 'rgba(201,168,76,0.55)',
          marginTop: '14px', display: 'flex',
        }}>
          tuviminhbao.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  );
}
