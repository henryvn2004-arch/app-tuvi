// app/api/og/duong-doi/route.tsx
// ẢNH "ĐƯỜNG ĐỜI QUA 9 ĐẠI VẬN" cho kênh chat — bản ảnh của biểu đồ đại vận trên
// web (public/tools-shared/daivan-chart.js): trục X là tuổi thật, đường cong là
// điểm theo NĂM nội suy bằng CÙNG pchip.js, 9 chấm là điểm THẬT engine chấm cho
// từng đại vận (`daiVans[].scoring.tong`, 0–10). Ngưỡng màu chấm theo
// `markerColor` mặc định của daivan-chart.js (≥7 · ≥5 · dưới 5).
// Link do server ký (lib/og/laso-image.ts, loại `duong-doi`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W } from '@/lib/og/brand';
import { computeLaso, pchipSeries } from '@/lib/engine/laso';

type DV = { cungIdx: number; tuoiStart: number; tuoiEnd: number; diaChi?: string; scoring?: { tong?: number } };
type Palace = { idx: number; cungName: string; diaChi: string };

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Khung vẽ biểu đồ (px trong ảnh).
const PX = 86;
const PW = W - PX - 40;
const PY = 30;
const PH = 660;
const dotColor = (s: number) => (s >= 7 ? '#1FA3D6' : s >= 5 ? '#1A3A5C' : '#C0392B');
const fmt = (n: number) => n.toFixed(1).replace('.', ',');

export async function GET(req: NextRequest) {
  const parsed = readChartParams('duong-doi', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls;

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const palaces = (ls.palaces as unknown as Palace[]) || [];
  const cungOf = (idx: number) => palaces.find((p) => p.idx === idx);
  const dvs = ((ls.daiVans as unknown as DV[]) || []).filter((d) => typeof d.scoring?.tong === 'number').slice(0, 9);
  if (dvs.length < 2) return new Response('no scores', { status: 400 });
  const dvHT = ls.daiVanHienTai as unknown as { cungIdx?: number; tuoiStart?: number } | undefined;
  const isCur = (d: DV) => !!dvHT && d.tuoiStart === dvHT.tuoiStart;

  const pts = dvs.map((d) => ({ x: (d.tuoiStart + d.tuoiEnd) / 2, y: d.scoring!.tong! }));
  const curve = pchipSeries(pts, 1);
  const x0 = dvs[0].tuoiStart;
  const x1 = dvs[dvs.length - 1].tuoiEnd + 1;
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * PW;
  const sy = (y: number) => PH - (Math.max(0, Math.min(10, y)) / 10) * PH;
  const path = curve.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${sx(curve[curve.length - 1].x).toFixed(1)},${PH} L${sx(curve[0].x).toFixed(1)},${PH} Z`;

  const best = dvs.reduce((a, b) => (b.scoring!.tong! > a.scoring!.tong! ? b : a));
  const worst = dvs.reduce((a, b) => (b.scoring!.tong! < a.scoring!.tong! ? b : a));
  const cur = dvs.find(isCur);
  const next = cur ? dvs[dvs.indexOf(cur) + 1] : undefined;
  const dvLine = (d: DV) => `${d.tuoiStart}–${d.tuoiEnd} tuổi · ${cungOf(d.cungIdx)?.cungName || CHI[d.cungIdx]} · ${fmt(d.scoring!.tong!)}đ`;
  const highlights: [string, string, string][] = [
    ['Đỉnh cao nhất', dvLine(best), '#1FA3D6'],
    ['Trũng sâu nhất', dvLine(worst), '#C0392B'],
    ...(cur ? ([['Đang đi', dvLine(cur), C.gold]] as [string, string, string][]) : []),
    ...(next ? ([['Kế tiếp', dvLine(next), C.ink]] as [string, string, string][]) : []),
  ];

  const gioi = birth.gender === 'nu' ? 'Nữ' : 'Nam';
  const sub = `${birth.name ? birth.name + ' · ' : ''}${gioi} · ${birth.day}/${birth.month}${birth.isLunar && birth.isLeapMonth ? ' nhuận' : ''}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'} · giờ ${CHI[birth.hourBranch!]}`;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Đường đời qua 9 đại vận" sub={sub} />
        {/* Biểu đồ */}
        <div style={{ display: 'flex', position: 'relative', width: W, height: PH + PY + 60 }}>
          <svg width={W} height={PH + PY + 60} style={{ position: 'absolute', top: 0, left: 0 }}>
            <g transform={`translate(${PX},${PY})`}>
              {[0, 2, 4, 6, 8, 10].map((v) => (
                <line key={v} x1={0} y1={sy(v)} x2={PW} y2={sy(v)} stroke={C.grid} strokeWidth={v === 5 ? 1.5 : 1} />
              ))}
              {cur ? (
                <rect x={sx(cur.tuoiStart)} y={0} width={sx(cur.tuoiEnd + 1) - sx(cur.tuoiStart)} height={PH} fill={C.curVan} />
              ) : null}
              <path d={area} fill="rgba(20,85,164,0.10)" />
              <path d={path} fill="none" stroke="#2F5BEA" strokeWidth={4} />
              {dvs.map((d, i) => (
                <circle
                  key={i}
                  cx={sx(pts[i].x)}
                  cy={sy(pts[i].y)}
                  r={isCur(d) ? 13 : 9}
                  fill={dotColor(pts[i].y)}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
              ))}
            </g>
          </svg>
          {/* Nhãn trục Y */}
          {[0, 2, 4, 6, 8, 10].map((v) => (
            <div
              key={v}
              style={{ display: 'flex', position: 'absolute', left: 40, top: PY + sy(v) - 12, fontSize: 18, color: C.mute }}
            >
              {v}
            </div>
          ))}
          {/* Điểm trên từng chấm + tuổi dưới trục X */}
          {dvs.map((d, i) => (
            <div
              key={`s${i}`}
              style={{
                display: 'flex',
                position: 'absolute',
                left: PX + sx(pts[i].x) - 30,
                // Chấm thấp (đáy võng) ghi số BÊN DƯỚI cho khỏi đè đường cong.
                top: PY + sy(pts[i].y) + (pts[i].y < 4 ? 16 : -44),
                width: 60,
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: dotColor(pts[i].y),
              }}
            >
              {fmt(pts[i].y)}
            </div>
          ))}
          {dvs.map((d, i) => (
            <div
              key={`x${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: PX + sx(pts[i].x) - 50,
                top: PY + PH + 10,
                width: 100,
                fontSize: 17,
                color: isCur(d) ? C.red : C.mute,
                fontWeight: isCur(d) ? 700 : 400,
              }}
            >
              <div style={{ display: 'flex' }}>{`${d.tuoiStart}–${d.tuoiEnd}`}</div>
              <div style={{ display: 'flex', fontSize: 15 }}>{cungOf(d.cungIdx)?.cungName || ''}</div>
            </div>
          ))}
          {cur ? (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: PX + sx(cur.tuoiStart) + 6,
                top: PY + 6,
                fontSize: 16,
                fontWeight: 700,
                color: C.red,
              }}
            >
              Bạn đang ở đây
            </div>
          ) : null}
        </div>
        {/* Điểm nhấn */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 40px 0', flexGrow: 1 }}>
          {highlights.map(([k, v, col]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline', fontSize: 26, marginTop: 12 }}>
              <div style={{ display: 'flex', width: 230, color: C.mute, fontSize: 22 }}>{k}</div>
              <div style={{ display: 'flex', fontWeight: 700, color: col }}>{v}</div>
            </div>
          ))}
        </div>
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Chấm: điểm từng đại vận (0–10) do hệ thống chấm theo cổ pháp · đường nối: ước tính theo năm"
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
