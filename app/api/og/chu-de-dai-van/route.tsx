// app/api/og/chu-de-dai-van/route.tsx
// ẢNH "BỐN CHUYỆN LỚN QUA 9 ĐẠI VẬN" cho kênh chat — bản ảnh của biểu đồ phần 14
// trên web (public/luan-giai-core.js `buildChuDeDaiVanHtml`): Sự nghiệp · Tài lộc
// · Tình duyên · Sức khỏe theo engine `ls.chuDeDaiVan` (cung đại vận làm Mệnh
// tạm, điểm = 0,6×cung gốc + 0,4×cung tạm).
// ⚠️ KHÔNG in số: điểm chủ đề suy từ điểm CUNG, không phải công thức chấm đại
// vận — Henry chốt chỉ điểm đại vận mới đưa ra cho người xem. Trục chỉ ghi
// "mạnh"/"yếu", chữ dưới ảnh nói bằng tên chủ đề và tuổi.
// Mỗi chủ đề chỉ vẽ trong độ tuổi có nghĩa (`trongTuoi` của engine).
// Link do server ký (lib/og/laso-image.ts, loại `chu-de-dai-van`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { Highlights } from '@/lib/og/band-chart';
import { computeLaso } from '@/lib/engine/laso';

type CD = { ten: string; diem: number; trongTuoi?: boolean };
type DV = { tuoiStart: number; tuoiEnd: number; diaChi: string; chuDe: Record<string, CD> };

const KEYS = ['su_nghiep', 'tai_loc', 'tinh_duyen', 'suc_khoe'] as const;
const MAU: Record<(typeof KEYS)[number], string> = { su_nghiep: '#1455A4', tai_loc: '#1E6B3C', tinh_duyen: '#B03A2E', suc_khoe: '#A8843A' };
const PX = 76;
const PW = W - PX - 36;
const PY = 44;
const PH = 600;
const BOX = PY + PH + 80;

export async function GET(req: NextRequest) {
  const parsed = readChartParams('chu-de-dai-van', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls;
  const cd = ((ls.chuDeDaiVan as unknown as DV[]) || []).filter((d) => KEYS.every((k) => d.chuDe && d.chuDe[k]));
  if (cd.length < 2) return new Response('no data', { status: 400 });

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const cur = ls.daiVanHienTai as unknown as { tuoiStart?: number } | undefined;
  const ci = cd.findIndex((d) => cur && d.tuoiStart === cur.tuoiStart);
  const cw = PW / cd.length;
  const sx = (i: number) => (i + 0.5) * cw;
  const sy = (v: number) => PH - (Math.max(0, Math.min(10, v)) / 10) * PH;
  const tuoi = (d: DV) => `${d.tuoiStart}–${d.tuoiEnd} tuổi`;
  // Chỉ đại vận trong độ tuổi CÓ NGHĨA của chủ đề (engine `trongTuoi`; engine cũ thiếu cờ ⇒ coi là có).
  const co = (d: DV, k: (typeof KEYS)[number]) => d.chuDe[k].trongTuoi !== false;
  // Đường đứt ở chỗ ra/vào độ tuổi: mỗi đoạn liền mạch bắt đầu bằng M.
  const duong = (k: (typeof KEYS)[number]) =>
    cd
      .map((d, i) => (co(d, k) ? `${i > 0 && co(cd[i - 1], k) ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(d.chuDe[k].diem).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ');

  const items: [string, string, string][] = [];
  if (ci >= 0) {
    const xs = KEYS.filter((k) => co(cd[ci], k))
      .map((k) => cd[ci].chuDe[k])
      .sort((a, b) => b.diem - a.diem);
    if (xs.length >= 2)
      items.push(['Đang đi', `${tuoi(cd[ci])} · mạnh nhất ${xs[0].ten.toLowerCase()}, yếu nhất ${xs[xs.length - 1].ten.toLowerCase()}`, C.gold]);
  }
  for (const k of KEYS) {
    const trong = cd.filter((d) => co(d, k));
    if (!trong.length) continue;
    const best = trong.reduce((a, b) => (b.chuDe[k].diem > a.chuDe[k].diem ? b : a));
    items.push([`${cd[0].chuDe[k].ten} cao nhất`, tuoi(best), MAU[k]]);
  }

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Bốn chuyện lớn qua 9 đại vận" sub={birthLine(birth)} />
        <div style={{ display: 'flex', gap: 26, padding: '0 40px', fontSize: 20, color: C.ink }}>
          {KEYS.map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, background: MAU[k], marginRight: 8 }} />
              {cd[0].chuDe[k].ten}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', position: 'relative', width: W, height: BOX }}>
          <svg width={W} height={BOX} style={{ position: 'absolute', top: 0, left: 0 }}>
            <g transform={`translate(${PX},${PY})`}>
              {ci >= 0 ? <rect x={ci * cw} y={-30} width={cw} height={PH + 30} fill={C.curVan} /> : null}
              {[0, 2, 4, 6, 8, 10].map((v) => (
                <line key={v} x1={0} y1={sy(v)} x2={PW} y2={sy(v)} stroke={C.grid} strokeWidth={1} />
              ))}
              {KEYS.map((k) => (
                <path
                  key={k}
                  d={duong(k)}
                  fill="none"
                  stroke={MAU[k]}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
              ))}
              {KEYS.map((k) =>
                cd.map((d, i) =>
                  co(d, k) ? <circle key={`${k}${i}`} cx={sx(i)} cy={sy(d.chuDe[k].diem)} r={6} fill={MAU[k]} stroke="#FFFFFF" strokeWidth={2} /> : null,
                ),
              )}
            </g>
          </svg>
          <div style={{ display: 'flex', position: 'absolute', left: 22, top: PY - 4, fontSize: 17, color: C.mute }}>mạnh</div>
          <div style={{ display: 'flex', position: 'absolute', left: 30, top: PY + PH - 18, fontSize: 17, color: C.mute }}>yếu</div>
          {ci >= 0 ? (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: PX + ci * cw,
                width: cw,
                justifyContent: 'center',
                top: PY - 28,
                fontSize: 15,
                fontWeight: 700,
                color: C.red,
              }}
            >
              Đang ở đây
            </div>
          ) : null}
          {cd.map((d, i) => (
            <div
              key={`x${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: PX + i * cw,
                top: PY + PH + 10,
                width: cw,
                fontSize: 17,
                color: i === ci ? C.red : C.ink,
                fontWeight: i === ci ? 700 : 400,
              }}
            >
              <div style={{ display: 'flex' }}>{`${d.tuoiStart}–${d.tuoiEnd}`}</div>
              <div style={{ display: 'flex', fontSize: 14, fontWeight: 400, color: C.mute, whiteSpace: 'nowrap' }}>{`Mệnh ở ${d.diaChi}`}</div>
            </div>
          ))}
        </div>
        <Highlights items={items} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Sự nghiệp vẽ đến 65 tuổi; tài lộc, tình duyên vẽ từ tuổi trưởng thành"
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
