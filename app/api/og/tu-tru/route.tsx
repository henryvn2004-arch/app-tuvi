// app/api/og/tu-tru/route.tsx
// ẢNH TỨ TRỤ BÁT TỰ cho kênh chat — gửi khi thầy Tâm Kính vào xem (mời thầy /
// hội chẩn) hoặc khách bấm "Lá số Bát Tự". Bố cục theo bảng tứ trụ trên web
// (public/app-bat-tu.html `renderTuTruTable`): 4 cột Năm/Tháng/Ngày/Giờ, hàng
// Thiên Can (kèm thập thần) · Địa Chi · Tàng Can · Nạp Âm, cột Ngày là Nhật chủ.
// Dưới bảng: ngũ hành, cường nhược, dụng thần, cách cục, dải đại vận.
//
// Số liệu CHỈ lấy từ engine (`computeTuBinh` — public/tubinh-ansao-engine.js,
// cùng file web chạy). Link do server ký (lib/og/laso-image.ts, loại `tu-tru`).
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, HANH_COLOR, W, birthLine } from '@/lib/og/brand';
import { computeTuBinh, hanhCanChi } from '@/lib/engine/tubinh';

type Tru = { ten: string; can: string; chi: string; napAm?: string; tangCan?: { can: string }[] };
type ThapThan = Record<string, { thienCan?: string; tangCan?: Record<string, string> }>;
type DaiVan = { can: string; chi: string; tuoiStart: number; tuoiEnd: number; score?: number; label?: string };

const HANH = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'];
const LABEL_W = 150;
// 60 = lề hai bên, 4 = viền khung 2px × 2.
const COL_W = (W - 64 - LABEL_W) / 4;
const col = (x: string) => HANH_COLOR[hanhCanChi(x)] || C.ink;
const fmt = (n: number) => String(n).replace('.', ',');

export async function GET(req: NextRequest) {
  const parsed = readChartParams('tu-tru', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeTuBinh(birth, namXem || undefined);
  if (!r.ok || !r.data) return new Response(r.error || 'bad request', { status: 400 });
  const bt = r.data as Record<string, unknown>;
  const tuTru = (bt.tuTru as Tru[]) || [];
  if (tuTru.length !== 4) return new Response('no pillars', { status: 400 });
  const tt = (bt.thapThan as ThapThan) || {};
  const nhatCan = String(bt.nhatCan || '');
  const cn = (bt.cuongNhuoc as { score?: number; label?: string }) || {};
  const dt = (bt.dungThan as { primary?: string; secondary?: string }) || {};
  const cc = (bt.cachCuc as { primary?: string }) || {};
  const nh = (bt.nguHanh as { counts?: Record<string, number> }) || {};
  const dvs = ((bt.daiVans as DaiVan[]) || []).slice(0, 8);
  const dvHT = bt.daiVanHienTai as DaiVan | undefined;

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const isNhat = (t: Tru) => t.ten === 'Ngày';
  const cell = (t: Tru, h: number, child: React.ReactNode) => (
    <div
      key={t.ten}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: COL_W,
        height: h,
        borderLeft: `1px solid ${C.grid}`,
        background: isNhat(t) ? '#FDF6EE' : C.paper,
      }}
    >
      {child}
    </div>
  );
  const row = (label: string, h: number, render: (t: Tru, i: number) => React.ReactNode) => (
    <div key={label} style={{ display: 'flex', borderTop: `1px solid ${C.grid}` }}>
      <div style={{ display: 'flex', alignItems: 'center', width: LABEL_W, height: h, paddingLeft: 16, fontSize: 18, color: C.mute, background: '#FAF7F0' }}>
        {label}
      </div>
      {tuTru.map((t, i) => cell(t, h, render(t, i)))}
    </div>
  );
  const counts = nh.counts || {};
  const maxCount = Math.max(1, ...HANH.map((h) => counts[h] || 0));

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader title="Tứ Trụ Bát Tự" sub={birthLine(birth)} />
        <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 30px 0', border: `2px solid ${C.line}`, background: C.paper }}>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', width: LABEL_W, height: 50, background: '#FAF7F0' }} />
            {tuTru.map((t) =>
              cell(
                t,
                50,
                <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: isNhat(t) ? C.gold : C.line }}>
                  {isNhat(t) ? 'Ngày (Nhật chủ)' : t.ten}
                </div>,
              ),
            )}
          </div>
          {row('Thiên Can', 130, (t, i) => [
            <div key="c" style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: col(t.can) }}>{t.can}</div>,
            <div key="t" style={{ display: 'flex', fontSize: 17, color: C.mute }}>{i === 2 ? 'Nhật chủ' : tt[t.ten]?.thienCan || ''}</div>,
          ])}
          {row('Địa Chi', 108, (t) => (
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: col(t.chi) }}>{t.chi}</div>
          ))}
          {row('Tàng Can', 140, (t, i) =>
            (t.tangCan || []).map((x) => {
              const ttn = i === 2 && x.can === nhatCan ? '' : tt[t.ten]?.tangCan?.[x.can] || '';
              return (
                <div key={x.can} style={{ display: 'flex', alignItems: 'baseline', fontSize: 19, marginTop: 2 }}>
                  <span style={{ fontWeight: 700, color: col(x.can) }}>{x.can}</span>
                  {ttn ? <span style={{ fontSize: 15, color: C.mute, marginLeft: 6 }}>{ttn}</span> : null}
                </div>
              );
            }),
          )}
          {row('Nạp Âm', 70, (t) => (
            <div style={{ display: 'flex', fontSize: 17, color: C.ink }}>{t.napAm || ''}</div>
          ))}
        </div>

        <div style={{ display: 'flex', margin: '30px 30px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 440 }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginBottom: 6 }}>Ngũ hành trong tứ trụ</div>
            {HANH.map((h) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
                <div style={{ display: 'flex', width: 62, fontSize: 19, fontWeight: 700, color: HANH_COLOR[h] }}>{h}</div>
                <div style={{ display: 'flex', width: 300, height: 18, background: '#EFE9DD', borderRadius: 9 }}>
                  <div style={{ display: 'flex', width: (300 * (counts[h] || 0)) / maxCount, height: 18, background: HANH_COLOR[h], borderRadius: 9 }} />
                </div>
                <div style={{ display: 'flex', fontSize: 19, color: C.ink, marginLeft: 10 }}>{String(counts[h] || 0)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, paddingLeft: 20 }}>
            {(
              [
                ['Nhật chủ', `${nhatCan} ${hanhCanChi(nhatCan)}${cn.label ? ` · ${cn.label}` : ''}${typeof cn.score === 'number' ? ` (${fmt(cn.score)}/10)` : ''}`],
                ['Dụng thần', dt.primary ? `${dt.primary}${dt.secondary ? ` · hỉ thần ${dt.secondary}` : ''}` : '—'],
                ['Cách cục', cc.primary || '—'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{k}</div>
                <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: C.ink }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', margin: '30px 30px 0', flexGrow: 1 }}>
          <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>Đại vận — điểm 0–10 · nền vàng là vận đang đi</div>
          <div style={{ display: 'flex', marginTop: 8 }}>
            {dvs.map((d) => {
              const cur = !!dvHT && dvHT.tuoiStart === d.tuoiStart;
              return (
                <div
                  key={d.tuoiStart}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: (W - 60) / dvs.length,
                    padding: '8px 0',
                    background: cur ? C.curVan : C.paper,
                    border: `1px solid ${cur ? C.gold : C.grid}`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: col(d.can) }}>{d.can}</div>
                  <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: col(d.chi) }}>{d.chi}</div>
                  <div style={{ display: 'flex', fontSize: 16, color: cur ? C.red : C.mute, marginTop: 2 }}>{`${d.tuoiStart}–${d.tuoiEnd} tuổi`}</div>
                  {typeof d.score === 'number' ? (
                    <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: d.score >= 7 ? C.green : d.score >= 5 ? C.ink : C.red, marginTop: 4 }}>
                      {`${fmt(d.score)}đ`}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <BrandFooter origin={req.nextUrl.origin} note="Tứ trụ lập theo tiết khí · Tử Bình Chân Thuyên + Trích Thiên Tủy" />
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
