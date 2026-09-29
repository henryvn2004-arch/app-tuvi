// app/api/og/dai-van/route.tsx
// ẢNH CHI TIẾT 9 ĐẠI VẬN cho kênh chat — bảng chấm điểm từng đại vận theo ba
// trục Thiên Thời (/5) · Địa Lợi (/1) · Nhân Hòa (/4) và Tổng (/10), vận đang đi
// tô vàng; cùng số với khối "Chấm điểm đại vận" của trang Chu Trình Cuộc Đời
// (public/luan-giai-core.js, phần 15–24) và bảng /tools/dai-van.
// Khác ảnh "đường đời" (duong-doi): ở đó là ĐƯỜNG điểm tổng qua đời người, ở
// đây là VÌ SAO điểm ra như vậy — trục nào kéo lên, trục nào kéo xuống.
// Số liệu CHỈ từ engine (`ls.daiVans[i].scoring`, `scoreDaiVan` trong
// public/tuvi-ansao-engine.js — chỉ 9 đại vận đầu có điểm). Link ký, loại `dai-van`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { canCung, computeLaso } from '@/lib/engine/laso';

type Scoring = {
  thienThoi?: { score?: number };
  diaLoi?: { score?: number };
  nhanHoa?: { score?: number; boMenh?: string; boVan?: string };
  tong?: number;
};
type DV = { cungIdx: number; diaChi?: string; tuoiStart: number; tuoiEnd: number; scoring?: Scoring };
type Palace = { cungName: string; diaChi: string; majorStars?: { ten?: string }[] };

// Tên đọc được của mã bộ sao (`BO_CHINH_TINH` của engine: TPVT/CNDL/SPT/CN).
const BO: Record<string, string> = {
  TPVT: 'Tử Phủ Vũ Tướng',
  CNDL: 'Cơ Nguyệt Đồng Lương',
  SPT: 'Sát Phá Liêm Tham',
  CN: 'Cự Nhật',
};
const TRUC: [keyof Scoring, string, number, string][] = [
  ['thienThoi', 'Thiên Thời', 5, '#A8843A'],
  ['diaLoi', 'Địa Lợi', 1, '#0E7490'],
  ['nhanHoa', 'Nhân Hòa', 4, '#7B2FBE'],
];
const mauTong = (v: number) => (v >= 7 ? C.green : v >= 4 ? C.blue : C.red);
const fmt = (n: number) => String(n).replace('.', ',');
const ROW = 82;

export async function GET(req: NextRequest) {
  const parsed = readChartParams('dai-van', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls as Record<string, unknown>;
  const palaces = (ls.palaces as Palace[]) || [];
  const dvs = ((ls.daiVans as DV[]) || []).filter((d) => d.scoring).slice(0, 9);
  if (!dvs.length) return new Response('no scores', { status: 400 });
  const ht = ls.daiVanHienTai as DV | undefined;
  const canNam = String(ls.canChiNam || '').split(' ')[0];
  const cur = dvs.find((d) => ht && d.tuoiStart === ht.tuoiStart);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const thanh = (v: number, max: number, mau: string, w: number) => (
    <div style={{ display: 'flex', width: w, height: 12, background: '#EFE9DD', borderRadius: 6, marginTop: 4 }}>
      <div style={{ display: 'flex', width: (w * Math.max(0, Math.min(max, v))) / max, height: 12, background: mau, borderRadius: 6 }} />
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title="Chấm điểm 9 đại vận"
          sub={birthLine(birth)}
          sub2="Thiên Thời /5 · Địa Lợi /1 · Nhân Hòa /4 → Tổng /10 · nền vàng: vận đang đi"
        />
        <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 24px 0' }}>
          {dvs.map((d, i) => {
            const p = palaces[d.cungIdx];
            const sc = d.scoring!;
            const la = d === cur;
            const tong = typeof sc.tong === 'number' ? sc.tong : 0;
            const chinh = (p?.majorStars || []).map((s) => s.ten).join(', ') || 'Vô chính diệu';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW,
                  padding: '0 14px',
                  marginBottom: 4,
                  borderRadius: 10,
                  background: la ? C.curVan : C.paper,
                  border: `${la ? 3 : 1}px solid ${la ? C.gold : C.grid}`,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
                  <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: la ? C.red : C.ink }}>{`${d.tuoiStart}–${d.tuoiEnd} tuổi`}</div>
                  <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{`Đại vận ${i + 1}`}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', width: 290 }}>
                  <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: C.ink }}>
                    {`${p?.cungName || '?'} · ${[canCung(canNam, p?.diaChi || ''), p?.diaChi].filter(Boolean).join(' ')}`}
                  </div>
                  <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{chinh}</div>
                </div>
                {TRUC.map(([k, nhan, max, mau]) => {
                  const v = Number((sc[k] as { score?: number } | undefined)?.score ?? 0);
                  return (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', width: 130, marginRight: 12 }}>
                      <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{`${nhan} ${fmt(v)}/${max}`}</div>
                      {thanh(v, max, mau, 130)}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: mauTong(tong) }}>{fmt(tong)}</div>
                </div>
              </div>
            );
          })}
        </div>
        {cur?.scoring?.nhanHoa?.boMenh ? (
          <div style={{ display: 'flex', flexDirection: 'column', margin: '10px 30px 0' }}>
            <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>Nhân Hòa của vận đang đi — bộ sao Mệnh gặp bộ sao đại vận</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.ink }}>
              {`${BO[cur.scoring.nhanHoa.boMenh] || cur.scoring.nhanHoa.boMenh} → ${BO[cur.scoring.nhanHoa.boVan || ''] || cur.scoring.nhanHoa.boVan || '—'}`}
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Thiên Thời: tam hợp vận–tuổi · Địa Lợi: cung vận–nạp âm mệnh · Nhân Hòa: bộ sao Mệnh–vận, sát tinh"
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
