// app/api/og/ca-nha/route.tsx
// ẢNH CẢ NHÀ × 12 THÁNG ÂM TỚI cho kênh chat — gửi kèm khi thầy tra `tra_ca_nha`.
// Bản ảnh của lưới trên /app/ca-nha (public/app-ca-nha.html `render`): mỗi hàng
// một tháng âm, mỗi cột một người, ô là cung nguyệt hạn của người đó + số sao cát
// / sát-bại trong chùm tam phương tháng đó; ô vàng = HAI người trở lên cùng hạn
// vào một cung trong tháng (`trung`). Số liệu CHỈ từ `khungCaNha`
// (lib/engine/ca-nha.ts → buildKhung12Thang), cùng hàm tool dùng.
// Link ký, loại `ca-nha`: khoá `p` = danh sách người (base64url), `td` = mốc
// "hôm nay" lúc gửi (khung 12 tháng tính từ tháng âm chứa ngày đó ⇒ ảnh cố định).
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { decodePeople, readExtraChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W } from '@/lib/og/brand';
import { khungCaNha } from '@/lib/engine/ca-nha';

const THANG_W = 200;
const ROW = 64;
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export async function GET(req: NextRequest) {
  const parsed = readExtraChartParams('ca-nha', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const people = decodePeople(parsed.extra.p || '');
  if (!people.length || !parsed.homNay) return new Response('bad params', { status: 400 });
  const k = khungCaNha(people, parsed.homNay);
  const nguoi = k.nguoi;
  const trung = new Set(k.trung.flatMap((t) => t.ai.map((ten) => `${t.i}|${ten}`)));

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const colW = Math.floor((W - 48 - THANG_W) / Math.max(1, nguoi.length));
  const tomTat = (n: (typeof nguoi)[number]) =>
    n.loi ? n.loi : `${n.birth.day}/${n.birth.month}/${n.birth.year}${n.birth.isLunar ? ' ÂL' : ''}${n.birth.hourBranch != null ? ` · ${CHI[n.birth.hourBranch]}` : ''}`;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title="Cả nhà — 12 tháng âm tới"
          sub={`${nguoi.length} người · cung nguyệt hạn từng tháng · +cát / −sát, bại trong tam phương`}
          sub2="Ô vàng: từ hai người trở lên cùng hạn vào một cung trong tháng đó"
        />
        <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
            <div style={{ display: 'flex', width: THANG_W }} />
            {nguoi.map((n) => (
              <div key={n.ten} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: colW }}>
                <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: C.ink, textAlign: 'center' }}>{n.ten}</div>
                <div style={{ display: 'flex', fontSize: 13, color: C.mute, textAlign: 'center' }}>{tomTat(n)}</div>
              </div>
            ))}
          </div>
          {k.thangs.map((t, i) => (
            <div
              key={t.nhan + i}
              style={{
                display: 'flex',
                height: ROW,
                borderTop: `1px solid ${C.grid}`,
                background: t.dangDienRa ? 'rgba(255,244,217,0.5)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: THANG_W }}>
                <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: t.dangDienRa ? C.red : C.ink }}>
                  {`${t.nhan}${t.dangDienRa ? ' · nay' : ''}`}
                </div>
                <div style={{ display: 'flex', fontSize: 13, color: C.mute }}>{t.nhanDay.replace(/^.*\((.*)\)$/, '$1')}</div>
              </div>
              {nguoi.map((n) => {
                const o = n.thangs[i];
                const vang = trung.has(`${i}|${n.ten}`);
                return (
                  <div
                    key={n.ten}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: colW - 6,
                      margin: '4px 3px',
                      borderRadius: 8,
                      background: vang ? '#F6E3B0' : C.paper,
                      border: `1px solid ${vang ? C.gold : C.grid}`,
                    }}
                  >
                    {o ? (
                      [
                        <div key="c" style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: C.ink, textAlign: 'center' }}>
                          {o.cungNguyetHan}
                        </div>,
                        <div key="s" style={{ display: 'flex', fontSize: 14 }}>
                          <span style={{ color: C.green, fontWeight: 700, marginRight: 8 }}>{`+${o.catTinh.length}`}</span>
                          <span style={{ color: C.red, fontWeight: 700 }}>{`−${o.satTinh.length + o.baiTinh.length}`}</span>
                        </div>,
                      ]
                    ) : (
                      <div style={{ display: 'flex', fontSize: 14, color: C.mute }}>—</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Nguyệt hạn theo lá số từng người · tháng âm lịch, tính từ tháng đang diễn ra" />
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
