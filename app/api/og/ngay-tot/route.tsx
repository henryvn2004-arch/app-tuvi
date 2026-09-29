// app/api/og/ngay-tot/route.tsx
// ẢNH LỊCH NGÀY TỐT một tháng cho một việc — gửi kèm khi thầy tra `xem_ngay_tot`
// trong chat. Lịch 7 cột (Thứ 2 → CN): nền theo tính chất chung của ngày
// (`overallTinhChat`), ngày kỵ (Tam Nương / Nguyệt Kỵ / Dương Công) ghi đỏ, và
// 6 ngày tốt nhất CHO VIỆC ĐÓ viền vàng kèm điểm — đúng danh sách tool trả cho thầy
// (`topDaysForActivity(computeMonth(nam, thang), viec, 6)`, lib/agent/tools.ts).
// Số liệu CHỈ từ engine tuvi-engine/ngay-tot. Link ký, loại `ngay-tot`
// (khoá `mo` = "nam-thang", `hd` = mã việc); ngày sinh người hỏi (nếu có) chỉ để in tên.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readExtraChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import {
  computeMonth,
  topDaysForActivity,
  ACTIVITY_META,
  ACTIVITY_LIST,
  type ActivityKey,
} from '../../../../tuvi-engine/dist/ngay-tot/index.js';

const THU = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const NEN: Record<string, string> = { tốt: '#E8F3EC', xấu: '#F8E9E6', bình: '#FFFFFF' };
const CHU: Record<string, string> = { tốt: C.green, xấu: C.red, bình: C.ink };
const O = 146;
const OH = 118;

export async function GET(req: NextRequest) {
  const parsed = readExtraChartParams('ngay-tot', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const [nam, thang] = (parsed.extra.mo || '').split('-').map(Number);
  const viec = String(parsed.extra.hd || '') as ActivityKey;
  if (!(ACTIVITY_LIST as readonly string[]).includes(viec) || !(nam >= 2020 && nam <= 2036) || !(thang >= 1 && thang <= 12)) {
    return new Response('bad params', { status: 400 });
  }
  const days = computeMonth(nam, thang);
  const top = topDaysForActivity(days, viec, 6);
  const diemNgay = new Map(top.map((t) => [t.info.duongLich.day, t.score.score]));
  const meta = ACTIVITY_META[viec];

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  // Thứ của ngày 1 (0 = Thứ 2 … 6 = CN) — tính từ chính ngày dương, không đoán.
  const lech = (new Date(Date.UTC(nam, thang - 1, 1)).getUTCDay() + 6) % 7;
  const o: (typeof days[number] | null)[] = [...Array(lech).fill(null), ...days];
  while (o.length % 7) o.push(null);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title={`Ngày tốt ${meta.name.toLowerCase()} — tháng ${thang}/${nam}`}
          sub={parsed.birth ? `Người hỏi: ${birthLine(parsed.birth)}` : meta.desc}
          sub2="Viền vàng: 6 ngày tốt nhất cho việc này · nền xanh/đỏ: ngày tốt/xấu chung"
        />
        <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 29px 0' }}>
          <div style={{ display: 'flex' }}>
            {THU.map((t) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'center', width: O, fontSize: 18, color: C.mute, paddingBottom: 6 }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: O * 7 }}>
            {o.map((d, i) => {
              if (!d) return <div key={`x${i}`} style={{ display: 'flex', width: O, height: OH }} />;
              const tc = d.overallTinhChat;
              const diem = diemNgay.get(d.duongLich.day);
              const ky = [d.kyTamNuong && 'Tam Nương', d.kyNguyetKy && 'Nguyệt Kỵ', d.kyDuongCong && 'Dương Công'].filter(Boolean)[0];
              return (
                <div
                  key={d.duongLich.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: O - 4,
                    height: OH - 4,
                    margin: 2,
                    padding: '6px 8px',
                    borderRadius: 10,
                    background: NEN[tc] || C.paper,
                    border: diem != null ? `4px solid ${C.gold}` : `1px solid ${C.grid}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: CHU[tc] || C.ink }}>{String(d.duongLich.day)}</div>
                    <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{`${d.amLich.day}/${d.amLich.month} ÂL`}</div>
                  </div>
                  <div style={{ display: 'flex', fontSize: 15, color: C.ink }}>{d.canChiNgay}</div>
                  {diem != null ? (
                    <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: C.gold }}>{`${diem}/10 điểm`}</div>
                  ) : ky ? (
                    <div style={{ display: 'flex', fontSize: 14, fontWeight: 700, color: C.red }}>{ky}</div>
                  ) : (
                    <div style={{ display: 'flex', fontSize: 14, color: C.mute }}>{`trực ${d.truc}`}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', margin: '14px 30px 0' }}>
          <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>
            {top.length ? `Ngày tốt nhất để ${meta.name.toLowerCase()}` : `Tháng này không có ngày đạt điểm ≥6 để ${meta.name.toLowerCase()}`}
          </div>
          {top.map(({ info, score }) => (
            <div key={info.duongLich.day} style={{ display: 'flex', alignItems: 'baseline', marginTop: 6 }}>
              <div style={{ display: 'flex', width: 250, fontSize: 21, fontWeight: 700, color: C.ink }}>
                {`${info.thuTrongTuan} ${info.duongLich.day}/${info.duongLich.month}`}
              </div>
              <div style={{ display: 'flex', width: 90, fontSize: 21, fontWeight: 700, color: C.gold }}>{`${score.score}/10`}</div>
              <div style={{ display: 'flex', flex: 1, fontSize: 17, color: C.mute }}>
                {`giờ tốt ${(info.gioHoangDao || []).map((g) => g.chi).slice(0, 4).join(', ')}`}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Chấm theo 12 trực · 28 tú · sao hoàng/hắc đạo · ngày kỵ cổ truyền" />
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
