// app/api/og/bat-trach/route.tsx
// ẢNH BÁT TRẠCH cho kênh chat — gửi khi thầy Huyền Không vào xem hoặc khách bấm
// "Hướng hợp tuổi". Bản ảnh của la bàn trên /app/bat-trach: 8 hướng quanh cung
// mệnh, BẮC Ở TRÊN như web, hướng cát xanh / hung đỏ kèm tên sao Du Niên.
//
// Cùng nguồn số với thầy Huyền Không trong chat (`THAY_KHACH['huyen-khong']`,
// lib/tools/registry.ts): năm ÂM (`namAm`) → `getCungMenh` → `guaOf` — bảng
// Du Niên đọc thẳng public/tools-shared/bat-trach.js. Link ký, loại `bat-trach`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { getCungMenh, guaOf, nhomOf } from '@/lib/engine/bat-trach';
import { namAm } from '@/lib/engine/laso';

const HUONG_VN: Record<string, string> = { N: 'Bắc', S: 'Nam', E: 'Đông', W: 'Tây', NE: 'Đông Bắc', NW: 'Tây Bắc', SE: 'Đông Nam', SW: 'Tây Nam' };
// Bắc ở trên (cùng la bàn web `.dir-N{top:…}`).
const LUOI = ['NW', 'N', 'NE', 'W', '', 'E', 'SW', 'S', 'SE'];
const O = 300;

export async function GET(req: NextRequest) {
  const parsed = readChartParams('bat-trach', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth } = parsed;
  const na = namAm(birth);
  if (!na) return new Response('bad birth', { status: 400 });
  const cung = getCungMenh(na.nam, birth.gender!);
  const g = guaOf(cung);
  const sao: Record<string, { ten: string; tot: boolean }> = {};
  for (const [ten, h] of Object.entries(g.good)) sao[h] = { ten, tot: true };
  for (const [ten, h] of Object.entries(g.bad)) sao[h] = { ten, tot: false };

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const list = (tot: boolean) =>
    Object.entries(tot ? g.good : g.bad).map(([ten, h]) => (
      <div key={ten} style={{ display: 'flex', fontSize: 23, marginTop: 6 }}>
        <span style={{ fontWeight: 700, color: tot ? C.green : C.red, width: 150 }}>{HUONG_VN[h]}</span>
        <span style={{ color: C.ink }}>{ten}</span>
      </div>
    ));

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Bát Trạch — hướng hợp tuổi" sub={birthLine(birth)} />
        <div style={{ display: 'flex', flexWrap: 'wrap', width: O * 3 + 12, margin: '10px auto 0' }}>
          {LUOI.map((h, i) => {
            if (!h) {
              return (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: O, height: 250, margin: 2, background: C.paper, border: `2px solid ${C.line}`, borderRadius: 14 }}
                >
                  <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>Cung mệnh</div>
                  <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: C.ink }}>{g.name}</div>
                  <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginTop: 4 }}>{`${g.elem} · ${nhomOf(cung)} Tứ Mệnh`}</div>
                  <div style={{ display: 'flex', fontSize: 17, color: C.mute, marginTop: 4 }}>{`năm âm ${na.nam}`}</div>
                </div>
              );
            }
            const s = sao[h];
            const tot = !!s?.tot;
            return (
              <div
                key={h}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: O,
                  height: 250,
                  margin: 2,
                  borderRadius: 14,
                  background: tot ? '#E8F3EC' : '#F8E9E6',
                  border: `2px solid ${tot ? C.green : C.red}`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.ink }}>{HUONG_VN[h]}</div>
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: tot ? C.green : C.red, marginTop: 8 }}>{s?.ten || ''}</div>
                <div style={{ display: 'flex', fontSize: 18, color: C.mute, marginTop: 4 }}>{tot ? 'hướng tốt' : 'hướng xấu'}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', margin: '26px 60px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>Hướng tốt — cửa chính, giường, bàn làm việc</div>
            {list(true)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '50%', paddingLeft: 20 }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>Hướng xấu — nên tránh</div>
            {list(false)}
          </div>
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Bát Trạch · cung mệnh theo năm sinh âm lịch và giới tính · Bắc ở trên" />
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
