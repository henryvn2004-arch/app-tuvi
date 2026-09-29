// app/api/og/van-ngay/route.tsx
// ẢNH VẬN NGÀY cho kênh chat — gửi kèm khi thầy tra `tra_nhat_van` hoặc khách bấm
// "Vận hôm nay". Bản ảnh của thẻ Vận Ngày (/app, `render` trong app-home.html):
// tính chất ngày, trực · tú · sao ngày, giờ hoàng đạo, nên/kiêng, hướng, màu; phần
// RIÊNG theo lá số (cung nhật hạn + chính tinh, hành ngày ↔ mệnh, ngày xung tuổi)
// và dải 7 ngày tới.
// Số liệu CHỈ từ engine: `computeVanNgay` · `computeVanNgayCaNhan` · `computeTuan`
// (lib/engine/van-ngay.ts — cùng `resolveNhatHanIdx` tool dùng). CỐ Ý KHÔNG chấm
// điểm/10 cho ngày (luật engine: chỉ đại vận có điểm thật).
// Link ký, loại `van-ngay`; ngày xem nằm ở khoá `td`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { computeLaso } from '@/lib/engine/laso';
import { computeTuan, computeVanNgay, computeVanNgayCaNhan } from '@/lib/engine/van-ngay';

const MAU: Record<string, string> = { tốt: C.green, xấu: C.red, bình: C.ink };
const NEN: Record<string, string> = { tốt: '#E8F3EC', xấu: '#F8E9E6', bình: C.paper };
// Như thẻ Vận Ngày trên web (LOAI_CAU, app-home.html): chỉ dịch `loai` — tên cách
// cục trong dữ liệu có mục bị cắt cụt, văn cổ `tomTat` lại nói về cả đời người.
const LOAI_CAU: Record<string, string> = { tốt: 'thuận lợi', xấu: 'cần thận trọng', trung: 'bình ổn' };
const QUAN_HE: Record<string, string> = {
  sinh: 'mệnh bạn sinh hành ngày — hao sức, nên giữ nhịp',
  'duoc-sinh': 'hành ngày sinh mệnh bạn — được nâng đỡ',
  khac: 'mệnh bạn khắc hành ngày — làm chủ được việc',
  'bi-khac': 'hành ngày khắc mệnh bạn — nên thận trọng',
  hoa: 'hành ngày trùng mệnh bạn — hòa hợp',
};

export async function GET(req: NextRequest) {
  const parsed = readChartParams('van-ngay', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem, homNay } = parsed;
  if (!homNay) return new Response('bad params', { status: 400 });
  const { d, m, y } = homNay;
  const v = computeVanNgay(d, m, y);
  const r = computeLaso(birth, namXem || undefined);
  const ls = r.ok && r.ls ? (r.ls as Record<string, unknown>) : null;
  const cn = ls ? computeVanNgayCaNhan(ls, v, d, m, y) : null;
  const chiNam = ls ? String(ls.canChiNam || '').split(' ')[1] || undefined : undefined;
  const tuan = computeTuan(d, m, y, 7, chiNam);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const nhan = (t: string) => <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>{t}</div>;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title={`Vận ngày ${v.ngay.thu} ${v.ngay.duong}`}
          sub={birthLine(birth)}
          sub2={`${v.ngay.am} · ngày ${v.ngay.canChi} (${v.ngay.canHanh})`}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            margin: '4px 30px 0',
            padding: '22px 24px',
            borderRadius: 14,
            background: NEN[v.danhGia.tinhChat],
            border: `2px solid ${MAU[v.danhGia.tinhChat]}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, color: MAU[v.danhGia.tinhChat], marginRight: 16 }}>
              {`Ngày ${v.danhGia.tinhChat}`}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: C.ink, flex: 1 }}>{v.danhGia.nhan}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 21, color: C.ink, marginTop: 10 }}>
            {`Trực ${v.truc.ten} (${v.truc.tinhChat}) · Tú ${v.tu.ten} (${v.tu.tinhChat}) · Sao ${v.saoNgay.ten} (${v.saoNgay.hoangDao ? 'hoàng đạo' : 'hắc đạo'})`}
          </div>
          {v.ngayKy.length ? (
            <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: C.red, marginTop: 4 }}>{`Ngày kỵ: ${v.ngayKy.join(', ')}`}</div>
          ) : null}
        </div>

        {cn ? (
          <div style={{ display: 'flex', flexDirection: 'column', margin: '28px 30px 0' }}>
            {nhan('Riêng với lá số của bạn')}
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: C.ink, marginTop: 4 }}>
              {`Nhật hạn vào cung ${cn.cungNhatHan} (${cn.diaChiNhatHan})${cn.chinhTinh.length ? ' · ' + cn.chinhTinh.join(', ') : ' · vô chính diệu'}`}
            </div>
            {cn.linhVuc ? <div style={{ display: 'flex', fontSize: 21, color: C.mute, marginTop: 2 }}>{`Việc hôm nay dễ chạm tới: ${cn.linhVuc}`}</div> : null}
            {cn.quanHeHanh ? (
              <div style={{ display: 'flex', fontSize: 21, color: C.ink, marginTop: 2 }}>{`Mệnh ${cn.napAmHanh}: ${QUAN_HE[cn.quanHeHanh]}`}</div>
            ) : null}
            {cn.bixung ? (
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: C.red, marginTop: 2 }}>{`Ngày xung tuổi bạn (${cn.canChiNam}) — tránh việc lớn`}</div>
            ) : null}
            {cn.cachCuc ? (
              <div style={{ display: 'flex', fontSize: 18, color: cn.cachCuc.loai === 'tốt' ? C.green : cn.cachCuc.loai === 'xấu' ? C.red : C.ink, marginTop: 2 }}>{`Cách cục cung nhật hạn: ${LOAI_CAU[cn.cachCuc.loai] || 'bình ổn'}`}</div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', margin: '28px 30px 0' }}>
          {nhan('Giờ hoàng đạo')}
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
            {v.gioTot.slice(0, 6).map((g) => (
              <div
                key={g.chi}
                style={{ display: 'flex', flexDirection: 'column', width: 334, margin: '0 6px 6px 0', padding: '10px 12px', borderRadius: 8, background: C.paper, border: `1px solid ${C.grid}` }}
              >
                <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.ink }}>{`${g.chi} · ${g.range}`}</div>
                <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{g.viec ? `${g.sao} — ${g.viec}` : g.sao}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', margin: '22px 30px 0' }}>
          {v.nen.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 12 }}>
              {nhan('Nên làm')}
              <div style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: C.green }}>{v.nen.slice(0, 4).map((x) => x.ten).join(', ')}</div>
            </div>
          ) : null}
          {/* Như thẻ Vận Ngày trên web: cột nào trống thì bỏ hẳn, không in gạch ngang. */}
          {v.kieng.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {nhan('Nên kiêng')}
              <div style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: C.red }}>{v.kieng.map((x) => x.ten).join(', ')}</div>
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 21, color: C.ink, margin: '18px 30px 0' }}>
          {`Hỷ thần ${v.huong.hyThan} · Tài thần ${v.huong.taiThan} · Màu hợp: ${(cn?.mauCaNhan.length ? cn.mauCaNhan : v.mau.list).slice(0, 4).join(', ')}`}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', margin: '28px 30px 0' }}>
          {nhan('7 ngày tới')}
          <div style={{ display: 'flex', marginTop: 4 }}>
            {tuan.map((t) => (
              <div
                key={t.iso}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: (W - 60) / 7 - 6,
                  marginRight: 6,
                  padding: '16px 0',
                  borderRadius: 10,
                  background: NEN[t.tinhChat],
                  border: `${t.bixung ? 3 : 1}px solid ${t.bixung ? C.red : C.grid}`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{t.thu}</div>
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: MAU[t.tinhChat], marginTop: 2 }}>{`${t.d}/${t.m}`}</div>
                <div style={{ display: 'flex', fontSize: 16, color: C.ink, marginTop: 2 }}>{t.canChi}</div>
                <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, marginTop: 4, color: t.bixung ? C.red : t.ngayKy ? C.red : C.mute }}>
                  {t.bixung ? 'xung tuổi' : t.ngayKy ? 'ngày kỵ' : t.tinhChat}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Trực · 28 tú · sao hoàng/hắc đạo · nhật hạn theo lá số · không chấm điểm ngày" />
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
