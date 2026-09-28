// app/api/og/van-12-thang/route.tsx
// ẢNH "12 THÁNG ÂM TỚI" cho kênh chat — bản ảnh của khung tool Vận Hạn 12 Tháng
// (`buildKhung12Thang`, lib/engine/van-han-12.ts): mỗi dòng là TRỌN một tháng
// âm, cung nguyệt hạn + chính tinh, sao cát và sao sát/bại trong tam phương tứ
// chính của cung đó.
// ⚠️ KHÔNG chấm điểm tháng — luật đã chốt ở van-han-12.ts: chỉ đại vận có điểm
// thật, gán điểm cho nguyệt hạn là bịa. Ảnh chỉ bày sao, để thầy luận.
// Mốc "hôm nay" (`td`) nằm trong link ký ⇒ cùng URL luôn ra cùng ảnh.
// Link do server ký (lib/og/laso-image.ts, loại `van-12-thang`); sai chữ ký → 403.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, FOOT, H, W } from '@/lib/og/brand';
import { computeLaso } from '@/lib/engine/laso';
import { buildKhung12Thang } from '@/lib/engine/van-han-12';

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const BRIGHT: Record<string, string> = { Miếu: 'M', Vượng: 'V', Đắc: 'Đ', Bình: 'B', Hãm: 'H' };
const HEAD = 150;
const COLHEAD = 40;
const ROW = (H - HEAD - COLHEAD - FOOT - 20) / 12;
const COLS = [210, 250, 270, 270];

/** "11/9/2026" → "11/9". */
const ngan = (s: string) => s.split('/').slice(0, 2).join('/');
/** "Thiên Đồng(Hãm)[Hóa Khoa]" → "Thiên Đồng (H) · Hóa Khoa". */
const chinhNgan = (s: string) =>
  s.replace(/\((Miếu|Vượng|Đắc|Bình|Hãm)\)/, (_, b: string) => ` (${BRIGHT[b]})`).replace(/\[(Hóa [^\]]+)\]/, ' · $1');

export async function GET(req: NextRequest) {
  const parsed = readChartParams('van-12-thang', req.nextUrl.searchParams);
  if (!parsed || !parsed.homNay) return new Response('forbidden', { status: 403 });
  const { birth, namXem, homNay } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const k = buildKhung12Thang(r.ls, homNay.d, homNay.m, homNay.y);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const gioi = birth.gender === 'nu' ? 'Nữ' : 'Nam';
  const sub = `${birth.name ? birth.name + ' · ' : ''}${gioi} · ${birth.day}/${birth.month}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'} · giờ ${CHI[birth.hourBranch!]} · ${k.duongTu} → ${k.duongDen}`;
  const cell = (w: number, children: React.ReactNode, extra: React.CSSProperties = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: w, ...extra }}>{children}</div>
  );

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <div style={{ display: 'flex', height: HEAD }}>
          <BrandHeader title="Vận 12 tháng âm tới" sub={sub} />
        </div>
        <div
          style={{
            display: 'flex',
            height: COLHEAD,
            alignItems: 'center',
            padding: '0 40px',
            fontSize: 17,
            color: C.mute,
            borderBottom: `2px solid ${C.line}`,
          }}
        >
          {cell(COLS[0], 'Tháng')}
          {cell(COLS[1], 'Cung nguyệt hạn')}
          {cell(COLS[2], 'Sao cát')}
          {cell(COLS[3], 'Sao sát · bại')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {k.thangs.map((t) => (
            <div
              key={t.stt}
              style={{
                display: 'flex',
                height: ROW,
                padding: '0 40px',
                background: t.dangDienRa ? C.curVan : t.stt % 2 ? C.paper : C.bg,
                borderBottom: `1px solid ${C.grid}`,
              }}
            >
              {cell(
                COLS[0],
                [
                  <div key="a" style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: t.dangDienRa ? C.red : C.ink }}>
                    {t.nhan.replace(' ÂL', '') + (t.dangDienRa ? ' · nay' : '')}
                  </div>,
                  <div key="b" style={{ display: 'flex', fontSize: 16, color: C.mute }}>{`${ngan(t.duongTu)} – ${ngan(t.duongDen)}`}</div>,
                ],
              )}
              {cell(
                COLS[1],
                t.loi ? (
                  <div style={{ display: 'flex', fontSize: 17, color: C.mute }}>—</div>
                ) : (
                  [
                    <div key="a" style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.ink }}>{t.cungNguyetHan}</div>,
                    <div key="b" style={{ display: 'flex', fontSize: 15, color: C.mute }}>
                      {t.chinhTinh.length ? t.chinhTinh.map(chinhNgan).join(', ') : 'Vô chính diệu'}
                    </div>,
                  ]
                ),
              )}
              {cell(
                COLS[2],
                <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 17, color: C.green }}>
                  {t.catTinh.length ? t.catTinh.slice(0, 4).join(', ') : '—'}
                </div>,
              )}
              {cell(
                COLS[3],
                <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 17, color: C.red }}>
                  {[...t.satTinh, ...t.baiTinh].slice(0, 4).join(', ') || '—'}
                </div>,
              )}
            </div>
          ))}
        </div>
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Sao tính trên tam phương tứ chính của cung nguyệt hạn · nhờ thầy luận từng tháng để hiểu kỹ"
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
