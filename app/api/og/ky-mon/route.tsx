// app/api/og/ky-mon/route.tsx
// ẢNH BÀN KỲ MÔN ĐỘN GIÁP cho kênh chat — gửi khi thầy Tâm Kính dựng bàn (mời
// thầy xem hướng/giờ hành sự). Bàn dựng theo THỜI ĐIỂM HỎI, link mang mốc `t`
// đúng lúc engine dựng bàn trong lượt chat ⇒ ảnh trùng khít bàn thầy vừa luận.
// Lưới 3×3 theo Lạc Thư, NAM Ở TRÊN (`luoi` của engine, cùng lối vẽ trang web).
// Kèm dòng người hỏi (tên + ngày giờ sinh). Số liệu CHỈ từ `dungBan`
// (lib/qimen/board.ts). "Hạng" là xếp hạng TƯƠNG ĐỐI trong bàn (xem `chamDiem`),
// không phải phán cát hung — chân ảnh nói rõ. Link ký, loại `ky-mon`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readTimeChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine, gioVN } from '@/lib/og/brand';
import { dungBan } from '@/lib/qimen/board';

const MUC: Record<string, string> = { cat: C.green, hung: C.red, binh: C.ink };
const NEN: Record<string, string> = { cat: '#E8F3EC', hung: '#F8E9E6', binh: C.paper };
const O = 336;

export async function GET(req: NextRequest) {
  const parsed = readTimeChartParams('ky-mon', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const b = dungBan(parsed.khi);
  const theoSo = new Map(b.cungs.map((c) => [c.so, c]));

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const dong = (nhan: string, m: { ten: string; muc: string } | null, size: number) =>
    m ? (
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 2 }}>
        <span style={{ fontSize: 15, color: C.mute, width: 44 }}>{nhan}</span>
        <span style={{ fontSize: size, fontWeight: 700, color: MUC[m.muc] || C.ink }}>{m.ten}</span>
      </div>
    ) : null;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title="Bàn Kỳ Môn Độn Giáp"
          sub={parsed.birth ? `Người hỏi: ${birthLine(parsed.birth)}` : 'Bàn dựng theo giờ hỏi'}
          sub2={`Dựng lúc ${gioVN(parsed.khi)} · giờ ${b.canChi.gio} · ${b.tietKhi} ${b.nguyen} · ${b.cuc}`}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', width: O * 3 + 12, margin: '4px auto 0' }}>
          {b.luoi.map((so) => {
            const c = theoSo.get(so);
            if (!c) return <div key={so} style={{ display: 'flex', width: O, height: 300, margin: 2 }} />;
            if (so === 5) {
              return (
                <div
                  key={so}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: O, height: 300, margin: 2, background: C.paper, border: `2px solid ${C.line}`, borderRadius: 12 }}
                >
                  <div style={{ display: 'flex', fontSize: 22, color: C.mute }}>Trung cung</div>
                  <div style={{ display: 'flex', fontSize: 19, color: C.ink, marginTop: 10 }}>{`Trực phù: ${b.trucPhu}`}</div>
                  <div style={{ display: 'flex', fontSize: 19, color: C.ink, marginTop: 4 }}>{`Trực sử: ${b.trucSu}`}</div>
                  {c.canDia ? <div style={{ display: 'flex', fontSize: 17, color: C.mute, marginTop: 4 }}>{`Địa bàn: ${c.canDia}`}</div> : null}
                </div>
              );
            }
            return (
              <div
                key={so}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: O,
                  height: 300,
                  margin: 2,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: NEN[c.muc] || C.paper,
                  border: `2px solid ${MUC[c.muc] === C.ink ? C.grid : MUC[c.muc]}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: C.ink }}>{c.huong}</div>
                  <div style={{ display: 'flex', fontSize: 16, color: C.mute }}>{`${c.ten} · hạng ${c.hang}`}</div>
                </div>
                {dong('Cửa', c.cua, 28)}
                {dong('Sao', c.sao, 22)}
                {dong('Thần', c.than, 22)}
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontSize: 15, color: C.mute, width: 44 }}>Can</span>
                  <span style={{ fontSize: 21, color: C.ink }}>{`${c.canThien || '—'} / ${c.canDia || '—'}`}</span>
                  {c.tamKy ? <span style={{ fontSize: 17, fontWeight: 700, color: C.gold, marginLeft: 10 }}>{c.tamKy}</span> : null}
                </div>
                <div style={{ display: 'flex', flexGrow: 1 }} />
                <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: MUC[c.muc] || C.mute }}>{c.viec}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Nam ở trên · can: thiên bàn / địa bàn · hạng 1 = phương đỡ nhất trong bàn (xếp hạng tương đối)"
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
