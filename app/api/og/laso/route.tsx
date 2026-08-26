// app/api/og/laso/route.tsx
// Enhanced OG image cho lá số pages
// Usage: /api/og/laso?cm=Tý&ct=Tử+Vi+Thiên+Phủ&cc=Tử+Phủ+Vũ+Tướng&diem=7.2&gt=Nam&year=1998
export const runtime = 'edge';

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';

function diemColor(d: number) {
  if (d >= 7) return '#4ade80';
  if (d >= 5.5) return '#fbbf24';
  if (d >= 4) return '#60a5fa';
  return '#f87171';
}

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams;
  const cm   = sp.get('cm') || 'Tý';           // cung mệnh
  const ct   = sp.get('ct') || '';             // chính tinh
  const cc   = sp.get('cc') || '';             // top cách cục (comma-sep, max 3)
  const diem = parseFloat(sp.get('diem') || '0');
  const gt   = sp.get('gt') || 'Nam';          // giới tính
  const year = sp.get('year') || '';
  const canChi = sp.get('cc_nam') || '';       // can chi năm (e.g. Canh Ngọ)

  const cachCucList = cc.split(',').filter(Boolean).slice(0, 3);
  const fonts = await loadOgFonts([700], req);
  // Không font nào ⇒ Satori ném "No fonts are loaded" (500). Trả ảnh tĩnh thay vì
  // để link chia sẻ mất sạch preview.
  if (!fonts.length) return ogFallbackRedirect(req);

  const col = diemColor(diem);

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px', display: 'flex',
        background: '#061A2E', fontFamily: 'BeVN, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '600px', height: '630px',
          background: 'linear-gradient(135deg, transparent, #0D2E4A)',
          display: 'flex',
        }} />

        {/* Left panel */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '52px 0 52px 72px', flex: 1, zIndex: 1,
        }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '2px', background: '#c9a84c', display: 'flex' }} />
            <span style={{ fontSize: '13px', color: '#c9a84c', letterSpacing: '4px', textTransform: 'uppercase' }}>
              TỬ VI MINH BẢO
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', display: 'flex' }}>
            Lá Số Tử Vi · {gt}{year ? ` · ${year}` : ''}
          </div>
          {canChi && (
            <div style={{ fontSize: '42px', color: '#c9a84c', fontWeight: 700, marginBottom: '8px', display: 'flex' }}>
              {canChi}
            </div>
          )}

          {/* Cung menh + chinh tinh */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '22px', color: '#fff', fontWeight: 700 }}>Cung {cm}</span>
            {ct && <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>· {ct}</span>}
          </div>

          {/* Cach cuc tags */}
          {cachCucList.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {cachCucList.map((c, i) => (
                <div key={i} style={{
                  padding: '4px 12px', background: 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.4)',
                  borderRadius: '4px', fontSize: '13px', color: '#a78bfa',
                  display: 'flex',
                }}>
                  {c.trim()}
                </div>
              ))}
            </div>
          )}

          {/* Domain */}
          <div style={{ marginTop: 'auto', fontSize: '14px', color: 'rgba(201,168,76,0.5)', display: 'flex' }}>
            tuviminhbao.com
          </div>
        </div>

        {/* Right panel — score */}
        <div style={{
          width: '260px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          padding: '0 32px', zIndex: 1,
        }}>
          {diem > 0 && (
            <>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex' }}>
                Điểm cung
              </div>
              <div style={{ fontSize: '72px', fontWeight: 700, color: col, lineHeight: 1, display: 'flex' }}>
                {diem.toFixed(1)}
              </div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: 'flex' }}>
                / 10
              </div>
            </>
          )}
        </div>
      </div>
    ),
    {
      width: 1200, height: 630, fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' },
    }
  );
}
