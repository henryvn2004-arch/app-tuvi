// app/api/og/luc-nham/route.tsx
// ẢNH KHÓA ĐẠI LỤC NHÂM cho kênh chat — gửi khi thầy Linh Cơ lập khóa (mời thầy
// / hội chẩn). Khóa lập theo THỜI ĐIỂM HỎI (cổ pháp Lục Nhâm), nên link mang
// mốc `t` đúng lúc engine lập khóa trong lượt chat ⇒ ảnh trùng khít khóa thầy
// vừa luận. Kèm dòng người hỏi (tên + ngày giờ sinh) để ảnh chia sẻ đi vẫn biết
// là của ai. Số liệu CHỈ từ `lapKhoa` (lib/liuren/ke.ts). Link ký, loại `luc-nham`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readTimeChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine, gioVN } from '@/lib/og/brand';
import { lapKhoa } from '@/lib/liuren/ke';

const MUC: Record<string, string> = { cat: C.green, hung: C.red, binh: C.ink };

export async function GET(req: NextRequest) {
  const parsed = readTimeChartParams('luc-nham', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const k = lapKhoa(parsed.khi);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const title = (t: string) => <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginBottom: 8 }}>{t}</div>;
  const box = { display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.paper, border: `1px solid ${C.grid}` } as const;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title="Khóa Đại Lục Nhâm"
          sub={parsed.birth ? `Người hỏi: ${birthLine(parsed.birth)}` : 'Khóa lập theo giờ hỏi'}
          sub2={`Lập lúc ${gioVN(parsed.khi)} · ${k.truDem} · nguyệt tướng ${k.nguyetTuong}`}
        />
        <div style={{ display: 'flex', margin: '8px 30px 0' }}>
          {(
            [
              ['Năm', k.canChi.nam],
              ['Tháng', k.canChi.thang],
              ['Ngày', k.canChi.ngay],
              ['Giờ', k.canChi.gio],
              ['Tuần không', k.tuanKhong.join(' ')],
            ] as [string, string][]
          ).map(([t, v]) => (
            <div key={t} style={{ ...box, width: (W - 60) / 5, padding: '8px 0' }}>
              <div style={{ display: 'flex', fontSize: 16, color: C.mute }}>{t}</div>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: C.ink }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', margin: '22px 30px 0' }}>
          {title(`Tam truyền — ${k.phap.ten} · ${k.dangTruyen.ten}`)}
          {k.tamTruyen.map((x) => (
            <div key={x.ten} style={{ display: 'flex', alignItems: 'center', height: 70, marginBottom: 4, background: C.paper, border: `1px solid ${C.grid}`, paddingLeft: 18 }}>
              <div style={{ display: 'flex', width: 170, fontSize: 22, color: C.mute }}>{x.ten}</div>
              <div style={{ display: 'flex', width: 110, fontSize: 36, fontWeight: 700, color: C.ink }}>{x.chi}</div>
              <div style={{ display: 'flex', width: 220, fontSize: 26, fontWeight: 700, color: MUC[x.muc] || C.ink }}>{x.tuong}</div>
              <div style={{ display: 'flex', fontSize: 21, color: C.ink }}>{`${x.hanh} · ${x.vuongSuy}${x.tuanKhong ? ' · Không vong' : ''}`}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', margin: '18px 30px 0' }}>
          {title('Tứ khóa')}
          <div style={{ display: 'flex' }}>
            {k.tuKhoa.map((x) => (
              <div key={x.ten} style={{ ...box, width: (W - 60) / 4, padding: '10px 0' }}>
                <div style={{ display: 'flex', fontSize: 17, color: C.mute }}>{x.ten}</div>
                <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: MUC[x.muc] || C.ink, marginTop: 2 }}>{x.tuong}</div>
                <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.ink }}>{x.tren}</div>
                <div style={{ display: 'flex', fontSize: 22, color: C.mute }}>{x.duoi}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', margin: '18px 30px 0' }}>
          {title('Thiên bàn — chi thiên bàn trên chi địa bàn · thiên tướng')}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {k.thienBan.map((x) => (
              <div key={x.dia} style={{ ...box, width: (W - 60) / 6, padding: '6px 0' }}>
                <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: C.ink }}>{x.thien}</div>
                <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{`trên ${x.dia}`}</div>
                <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: MUC[x.muc] || C.ink }}>{x.tuong}</div>
              </div>
            ))}
          </div>
        </div>
        {k.khoaThe.length ? (
          <div style={{ display: 'flex', margin: '14px 30px 0', fontSize: 19, color: C.ink }}>{`Khóa thể: ${k.khoaThe.join(' · ')}`}</div>
        ) : null}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Đại Lục Nhâm · khóa lập theo giờ hỏi (giờ Việt Nam) · xanh là cát, đỏ là hung" />
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
