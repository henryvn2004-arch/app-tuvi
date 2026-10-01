// app/api/og/bien-dong-thang/route.tsx
// ẢNH "BIẾN ĐỘNG 12 THÁNG" cho kênh chat — bản ảnh của biểu đồ 12 tháng ở phần
// 24 trên web (public/luan-giai-core.js `buildVanThangHtml`): 12 tháng âm của
// năm xem, điểm tháng nội suy từ điểm năm + biên dao động theo sao động trong
// tam phương tứ chính cung nguyệt hạn (engine `tinhVanThang`, qua `vanThang`).
// Khác ảnh `van-12-thang` (12 tháng TỚI, chỉ bày sao): ảnh này có điểm — CHỈ để
// vẽ, không đưa cho thầy luận (Henry chốt).
// Link do server ký (lib/og/laso-image.ts, loại `bien-dong-thang`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { BandChart, Highlights, canChiNam, canChiThang, pct, tenSao, type BandRow } from '@/lib/og/band-chart';
import { computeLaso, vanThang } from '@/lib/engine/laso';

type Sao = { ten: string; cung: string; w: number };
type Palace = { idx: number; cungName: string };

export async function GET(req: NextRequest) {
  const parsed = readChartParams('bien-dong-thang', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls;
  const tv = ((ls.tieuVanScores as unknown as { nam: number; tuoi: number }[]) || []).find((t) => t.tuoi === ls.tuoiXem);
  const ms = tv ? vanThang(ls, tv.nam) : [];
  const goc = (ls.bienDongGoc as unknown as { ds: Sao[] }[]) || [];
  if (!tv || ms.length !== 12) return new Response('no data', { status: 400 });

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const palaces = (ls.palaces as unknown as Palace[]) || [];
  const tenCung = (i: number) => palaces.find((p) => p.idx === i)?.cungName || '';
  const rows: BandRow[] = ms.map((m) => ({
    diem: m.diem,
    lo: m.lo,
    hi: m.hi,
    pct: m.pct,
    l1: `Th ${m.thang}`,
    l2: canChiThang(tv.nam, m.thang),
    l3: tenCung(m.cungIdx),
  }));
  const dong = ms.reduce((a, b) => (b.pct > a.pct ? b : a));
  const yen = ms.reduce((a, b) => (b.pct < a.pct ? b : a));
  const saoOf = (m: (typeof ms)[number]) => [...(goc[m.cungIdx]?.ds || []), ...(m.luu || [])];
  const items: [string, string, string][] = [
    ['Biến động nhất', `Tháng ${dong.thang} · ${pct(dong.pct)} · ${tenSao(saoOf(dong), 4)}`, C.red],
    ['Êm nhất', `Tháng ${yen.thang} · ${pct(yen.pct)} · nguyệt hạn ${tenCung(yen.cungIdx)}`, C.green],
  ];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title={`Biến động 12 tháng năm ${canChiNam(tv.nam)}`} sub={birthLine(birth)} sub2={`Tháng âm lịch năm ${tv.nam}`} />
        <BandChart rows={rows} />
        <Highlights items={items} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Chấm: điểm tháng nội suy từ điểm năm · thanh vàng: biên dao động theo sao động trong tam phương tứ chính cung nguyệt hạn"
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
