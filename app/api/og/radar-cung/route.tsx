// app/api/og/radar-cung/route.tsx
// ẢNH "ĐIỂM MẠNH YẾU 12 CUNG" cho kênh chat — bản ảnh của vành 12 cung trên web
// (`buildCungRadarHtml` trong public/luan-giai-core.js → `HookCharts.hexRadar`):
// mỗi trục là một cung, độ dài = `cungScores[cung].tong` (0–10) engine chấm.
// Cùng thứ tự trục Mệnh → Phụ Mẫu → … → Huynh Đệ như web.
// Link do server ký (lib/og/laso-image.ts, loại `radar-cung`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W } from '@/lib/og/brand';
import { computeLaso } from '@/lib/engine/laso';

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Cùng thứ tự `CUNG_TRUC` của public/luan-giai-core.js.
const CUNG = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];
const SIZE = 820;
const R = 300;
const fmt = (n: number) => n.toFixed(1).replace('.', ',');

export async function GET(req: NextRequest) {
  const parsed = readChartParams('radar-cung', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const sc = (r.ls.cungScores as unknown as Record<string, { tong?: number }>) || {};
  const dims = CUNG.map((c) => ({ c, v: typeof sc[c]?.tong === 'number' ? (sc[c].tong as number) : 0 }));
  if (!dims.some((d) => d.v > 0)) return new Response('no scores', { status: 400 });

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / dims.length;
  const at = (i: number, f: number) => [cx + R * f * Math.cos(ang(i)), cy + R * f * Math.sin(ang(i))];
  const ring = (f: number) => dims.map((_, i) => at(i, f).map((n) => n.toFixed(1)).join(',')).join(' ');
  const poly = dims.map((d, i) => at(i, Math.max(0, Math.min(10, d.v)) / 10).map((n) => n.toFixed(1)).join(',')).join(' ');

  const sorted = [...dims].sort((a, b) => b.v - a.v);
  const manh = sorted.slice(0, 3);
  const yeu = sorted.slice(-3).reverse();
  const gioi = birth.gender === 'nu' ? 'Nữ' : 'Nam';
  const sub = `${birth.name ? birth.name + ' · ' : ''}${gioi} · ${birth.day}/${birth.month}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'} · giờ ${CHI[birth.hourBranch!]}`;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Điểm mạnh yếu 12 cung" sub={sub} />
        <div style={{ display: 'flex', justifyContent: 'center', width: W }}>
          <div style={{ display: 'flex', position: 'relative', width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
              {[1, 0.8, 0.6, 0.4, 0.2].map((f) => (
                <polygon key={f} points={ring(f)} fill={f === 1 ? '#FFFFFF' : 'none'} stroke={C.grid} strokeWidth={1.5} />
              ))}
              {dims.map((_, i) => {
                const [x, y] = at(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.grid} strokeWidth={1.5} />;
              })}
              <polygon points={poly} fill="rgba(20,85,164,0.22)" stroke="#2F5BEA" strokeWidth={4} />
              {dims.map((d, i) => {
                const [x, y] = at(i, Math.max(0, Math.min(10, d.v)) / 10);
                return <circle key={`p${i}`} cx={x} cy={y} r={7} fill={d.c === 'Mệnh' ? C.red : '#2F5BEA'} />;
              })}
            </svg>
            {dims.map((d, i) => {
              const [x, y] = at(i, 1.2);
              return (
                <div
                  key={`l${i}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'absolute',
                    left: x - 70,
                    top: y - 26,
                    width: 140,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: d.c === 'Mệnh' ? C.red : C.ink }}>{d.c}</div>
                  <div style={{ display: 'flex', fontSize: 19, color: C.mute }}>{fmt(d.v)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', padding: '10px 40px 0', flexGrow: 1 }}>
          {(
            [
              ['Mạnh nhất', manh, C.green],
              ['Cần lưu ý', yeu, C.red],
            ] as [string, typeof dims, string][]
          ).map(([k, list, col]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
              <div style={{ display: 'flex', fontSize: 22, color: C.mute }}>{k}</div>
              {list.map((d) => (
                <div key={d.c} style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: col, marginTop: 8 }}>
                  {`${d.c} · ${fmt(d.v)}`}
                </div>
              ))}
            </div>
          ))}
        </div>
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Điểm từng cung (0–10) do hệ thống chấm theo cổ pháp · càng xa tâm càng vượng"
        />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
    },
  );
}
