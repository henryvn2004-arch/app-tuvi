// app/api/og/tet/route.tsx
// ẢNH TẾT NHÀ MÌNH cho kênh chat — gửi kèm khi thầy tra `xem_tet_ca_nha`.
// Hai khối, đúng như dữ liệu tool trả cho thầy (execXemTetCaNha, lib/tools/registry.ts):
//   1. Tuổi xông đất theo tuổi CHỦ NHÀ (người hỏi) — `computeXongDat`: 4 tuổi đầu
//      bảng + tuổi nên tránh + cảnh báo chủ nhà phạm Thái Tuế.
//   2. Xuất hành mùng 1–3 — `computeVanNgay`: tính chất ngày, giờ hoàng đạo, hướng
//      Hỷ thần / Tài thần, và NGƯỜI NHÀ NÀO bị ngày đó xung tuổi.
// Link ký, loại `tet`: khoá `p` = danh sách người (người đầu là chủ nhà), `td` = mốc
// "hôm nay" lúc gửi — Tết nào là "Tết tới" suy từ mốc đó (`tetSapToi`) ⇒ ảnh cố định.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { decodePeople, readExtraChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { namAm } from '@/lib/engine/laso';
import { computeVanNgay } from '@/lib/engine/van-ngay';
import { computeXongDat, tetSapToi, VERDICT_LABEL } from '@/lib/engine/xong-dat';

const MAU_NGAY: Record<string, string> = { tốt: C.green, xấu: C.red, bình: C.ink };
const NEN_NGAY: Record<string, string> = { tốt: '#E8F3EC', xấu: '#F8E9E6', bình: C.paper };
const MAU_TUOI: Record<string, string> = { 'rat-hop': C.green, hop: C.green, binh: C.ink, 'nen-tranh': C.red };

export async function GET(req: NextRequest) {
  const parsed = readExtraChartParams('tet', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const people = decodePeople(parsed.extra.p || '');
  if (!people.length || !parsed.homNay) return new Response('bad params', { status: 400 });
  const { d, m, y } = parsed.homNay;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const t = tetSapToi(iso);
  if (!t.tetIso || t.conNgay < 0) return new Response('no tet table', { status: 400 });

  const nha = people.map((p) => ({ ten: p.ten, birth: p.birth, am: namAm(p.birth) })).filter((p) => p.am);
  const chu = nha[0];
  if (!chu || chu.birth !== people[0].birth) return new Response('bad params', { status: 400 }); // chủ nhà phải quy được năm âm
  const xd = computeXongDat(chu.am!.nam, t.namXem);
  const [ty, tm, tdd] = t.tetIso.split('-').map(Number);
  const mung = [0, 1, 2].map((i) => {
    const dt = new Date(Date.UTC(ty, tm - 1, tdd + i));
    const v = computeVanNgay(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear());
    return { v, xung: nha.filter((p) => p.am!.chi === v.xung.chi).map((p) => p.ten) };
  });

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const nhan = (s: string) => <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>{s}</div>;
  const tranh = xd ? xd.candidates.filter((c) => c.verdict === 'nen-tranh').slice(0, 6) : [];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title={`Tết ${xd?.namCanChi || ''} ${t.namXem} — nhà mình`.replace('  ', ' ')}
          sub={`Chủ nhà${chu.ten ? ` ${chu.ten}` : ''} · ${birthLine(chu.birth)}`}
          sub2={`Mùng 1 = ${t.tetIso.split('-').reverse().join('/')} · còn ${t.conNgay} ngày${nha.length > 1 ? ` · cả nhà ${nha.length} người` : ''}`}
        />

        {xd ? (
          <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 30px 0' }}>
            {nhan(`Tuổi hợp xông đất nhà ${chu.ten || 'mình'} (tuổi ${xd.chuNha.canChi}, mệnh ${xd.chuNha.napAm})`)}
            {xd.chuNhaNote.map((n) => (
              <div key={n} style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: C.red, marginTop: 2 }}>{n}</div>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 6 }}>
              {xd.candidates.slice(0, 4).map((c, i) => (
                <div
                  key={c.namSinh}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 506,
                    margin: `0 ${i % 2 ? 0 : 8}px 8px 0`,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: C.paper,
                    border: `2px solid ${c.verdict === 'rat-hop' ? C.gold : C.grid}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: C.ink, marginRight: 12 }}>{c.canChi}</div>
                    <div style={{ display: 'flex', fontSize: 18, color: C.mute, flex: 1 }}>{`sinh ${c.namSinh} · ${c.tuoi} tuổi`}</div>
                    <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: MAU_TUOI[c.verdict] }}>{VERDICT_LABEL[c.verdict]}</div>
                  </div>
                  <div style={{ display: 'flex', fontSize: 16, color: C.ink, marginTop: 2 }}>{c.reasons.slice(0, 2).join(' · ')}</div>
                </div>
              ))}
            </div>
            {tranh.length ? (
              <div style={{ display: 'flex', fontSize: 20, color: C.red, marginTop: 2 }}>
                {`Tuổi nên tránh: ${tranh.map((c) => `${c.canChi} (${c.namSinh})`).join(', ')}`}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', margin: '26px 30px 0' }}>
          {nhan('Xuất hành mùng 1 – 3')}
          <div style={{ display: 'flex', marginTop: 6 }}>
            {mung.map(({ v, xung }, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 332,
                  marginRight: i < 2 ? 12 : 0,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: NEN_NGAY[v.danhGia.tinhChat],
                  border: `${xung.length ? 3 : 1}px solid ${xung.length ? C.red : C.grid}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: C.ink, marginRight: 10 }}>{`Mùng ${i + 1}`}</div>
                  <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{v.ngay.duong}</div>
                </div>
                <div style={{ display: 'flex', fontSize: 19, color: C.ink }}>{`Ngày ${v.ngay.canChi}`}</div>
                <div style={{ display: 'flex', fontSize: 21, fontWeight: 700, color: MAU_NGAY[v.danhGia.tinhChat], marginTop: 2 }}>
                  {`Ngày ${v.danhGia.tinhChat}${v.ngayKy.length ? ` · ${v.ngayKy.join(', ')}` : ''}`}
                </div>
                <div style={{ display: 'flex', fontSize: 16, color: C.mute, marginTop: 8 }}>Giờ hoàng đạo</div>
                {v.gioTot.slice(0, 4).map((g) => (
                  <div key={g.chi} style={{ display: 'flex', fontSize: 18, color: C.ink }}>{`${g.chi} · ${g.range}`}</div>
                ))}
                <div style={{ display: 'flex', fontSize: 16, color: C.mute, marginTop: 8 }}>Hướng xuất hành</div>
                <div style={{ display: 'flex', fontSize: 18, color: C.ink }}>{`Hỷ thần: ${v.huong.hyThan}`}</div>
                <div style={{ display: 'flex', fontSize: 18, color: C.ink }}>{`Tài thần: ${v.huong.taiThan}`}</div>
                <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: xung.length ? C.red : C.green, marginTop: 8 }}>
                  {xung.length ? `Xung tuổi ${xung.join(', ')} — nên đi ngày khác` : 'Không xung tuổi ai trong nhà'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {nha.length > 1 ? (
          <div style={{ display: 'flex', fontSize: 18, color: C.mute, margin: '16px 30px 0' }}>
            {`Cả nhà: ${nha.map((p) => `${p.ten || 'Chủ nhà'} (tuổi ${p.am!.chi})`).join(' · ')}`}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Tuổi chấm theo địa chi + nạp âm · còn tùy người xông đất có tang chế, gia cảnh, tính nết" />
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
