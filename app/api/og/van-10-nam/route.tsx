// app/api/og/van-10-nam/route.tsx
// ẢNH "MƯỜI NĂM TỚI" cho kênh chat — bản ảnh của biểu đồ 10 năm ở phần 24 trên
// web (public/luan-giai-core.js `buildVanNamHtml`): chấm là điểm năm (engine
// `tieuVanScores.mainScore`, nội suy từ điểm đại vận), thanh vàng là biên dao
// động (`tieuVanScores[].bienDong` — sao động trong tam phương tứ chính cung
// tiểu hạn). Điểm năm CHỈ để vẽ — không đưa cho thầy luận (Henry chốt).
// Link do server ký (lib/og/laso-image.ts, loại `van-10-nam`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { BandChart, Highlights, canChiNam, fmt1, pct, tenSao, type BandRow } from '@/lib/og/band-chart';
import { computeLaso } from '@/lib/engine/laso';

type Sao = { ten: string; cung: string; w: number };
type TV = { nam: number; tuoi: number; mainScore: number; tieuHanCung: string; bienDong?: { pct: number; hi: number; lo: number; luu: Sao[] } };
type Goc = { ds: Sao[] };
type Palace = { idx: number; cungName: string };

export async function GET(req: NextRequest) {
  const parsed = readChartParams('van-10-nam', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls;
  const tvs = (ls.tieuVanScores as unknown as TV[]) || [];
  const goc = (ls.bienDongGoc as unknown as Goc[]) || [];
  const palaces = (ls.palaces as unknown as Palace[]) || [];
  const i0 = tvs.findIndex((t) => t.tuoi === ls.tuoiXem);
  const ten = i0 >= 0 ? tvs.slice(i0, i0 + 10) : [];
  if (ten.length < 2 || !ten.every((t) => t.bienDong) || !goc.length) return new Response('no data', { status: 400 });

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const saoOf = (t: TV) => {
    const p = palaces.find((x) => x.cungName === t.tieuHanCung);
    return [...((p && goc[p.idx]?.ds) || []), ...(t.bienDong!.luu || [])];
  };
  const rows: BandRow[] = ten.map((t, i) => ({
    diem: t.mainScore,
    lo: t.bienDong!.lo,
    hi: t.bienDong!.hi,
    pct: t.bienDong!.pct,
    l1: String(t.nam),
    l2: canChiNam(t.nam),
    l3: t.tieuHanCung,
    cur: i === 0,
  }));
  const x = ten[0];
  const dong = ten.reduce((a, b) => (b.bienDong!.pct > a.bienDong!.pct ? b : a));
  const yen = ten.reduce((a, b) => (b.bienDong!.pct < a.bienDong!.pct ? b : a));
  const items: [string, string, string][] = [
    ['Năm xem', `${x.nam} ${canChiNam(x.nam)} · ${fmt1(x.mainScore)} (${fmt1(x.bienDong!.lo)}–${fmt1(x.bienDong!.hi)})`, C.gold],
    ['Biến động nhất', `${dong.nam} · ${pct(dong.bienDong!.pct)} · ${tenSao(saoOf(dong), 4)}`, C.red],
    ['Êm nhất', `${yen.nam} · ${pct(yen.bienDong!.pct)} · tiểu hạn ${yen.tieuHanCung}`, C.green],
  ];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Mười năm tới" sub={birthLine(birth)} />
        <BandChart rows={rows} curLabel="Năm xem" />
        <Highlights items={items} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Chấm: điểm năm nội suy từ điểm đại vận · thanh vàng: biên dao động theo sao động trong tam phương tứ chính cung tiểu hạn"
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
