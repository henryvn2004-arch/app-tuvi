// app/api/og/than-so/route.tsx
// ẢNH THẦN SỐ HỌC cho kênh chat — gửi khi thầy Thanh Hư vào xem hoặc khách bấm
// "Thần số học". Bản ảnh của trang /app/than-so-hoc: vòng số lõi (Đường Đời,
// Định Mệnh, Linh Hồn, Sứ Mệnh) + ba chỉ số bổ sung + Năm Cá Nhân, lưới
// Pythagoras 3-6-9 / 2-5-8 / 1-4-7 và mũi tên.
//
// Số liệu CHỈ lấy từ engine (`computeThanSoHoc` → public/tools-shared/than-so-hoc.js,
// cùng file web chạy); lưới đọc từ `bieuDoCo` engine trả ra. Cần HỌ TÊN (thiếu → 400,
// router không gửi link); ngày âm tự đổi sang dương (`solarDateOf`). Link ký, loại `than-so`.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, W, birthLine } from '@/lib/og/brand';
import { computeThanSoHoc } from '@/lib/engine/than-so-hoc';
import { solarDateOf } from '@/lib/engine/laso';

// Màu số theo `NUM_COLORS` của public/tools-shared/than-so-hoc.js (vòng số trên web).
const NUM_COLORS = ['', '#C0392B', '#E67E22', '#F1C40F', '#2ECC71', '#1455A4', '#8E44AD', '#1ABC9C', '#E91E63', '#2C3E50', '#c9a84c', '#5FA8D3', '#1E6B3C'];
const LUOI = [
  [3, 6, 9],
  [2, 5, 8],
  [1, 4, 7],
];

function Num({ n, label, sub, size }: { n: number; label: string; sub: string; size: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size + 70 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: size,
          background: n ? NUM_COLORS[Math.min(n, 12)] : 'transparent',
          border: n ? 'none' : `2px dashed ${C.grid}`,
          color: n ? '#FFFFFF' : C.mute,
          fontSize: size * 0.46,
          fontWeight: 700,
        }}
      >
        {n ? String(n) : '—'}
      </div>
      <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 8 }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{sub}</div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const parsed = readChartParams('than-so', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const ten = String(birth.name || '').trim();
  // Pythagoras tính trên ngày DƯƠNG — nhập âm thì đổi trước, cùng đường thầy Thanh Hư.
  const dl = solarDateOf(birth);
  if (!ten || !dl) return new Response('need name + valid date', { status: 400 });
  const r = computeThanSoHoc(dl.day, dl.month, dl.year, ten, namXem || undefined);
  if (!r.ok || !r.data) return new Response(r.error || 'bad request', { status: 400 });
  const d = r.data as Record<string, unknown>;
  const num = (k: string) => Number(d[k]) || 0;
  const str = (k: string) => String(d[k] ?? '');

  // "1×1, 3×1, 6×1" → {1:1, 3:1, 6:1}
  const grid: Record<number, number> = {};
  for (const m of str('bieuDoCo').matchAll(/(\d)×(\d+)/g)) grid[Number(m[1])] = Number(m[2]);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const khongCo = (v: string) => !v || v.startsWith('(');
  const lines: [string, string][] = [
    ['Mũi tên mạnh', str('muiTenManh')],
    ['Mũi tên trống', str('muiTenTrong')],
    ['Bài học còn thiếu', str('baiHocConThieu')],
  ];
  // "Chặng 1 (0–27 tuổi): đỉnh 9 / thử thách 3 · Chặng 2 …" → 4 ô; ô đang đi đọc từ `changHienTai`.
  const changs = str('dinhCaoThuThach')
    .split(' · ')
    .map((x) => x.match(/^(Chặng \d+) \(([^)]+)\): đỉnh (\d+) \/ thử thách (\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m);
  const changNay = str('changHienTai').split(' — ')[0];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title="Thần Số Học"
          sub={birthLine(birth)}
          sub2={birth.isLunar ? `Tính theo ngày dương lịch ${dl.day}/${dl.month}/${dl.year}` : undefined}
        />
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '14px 30px 0' }}>
          <Num n={num('soDuongDoi')} label="Đường Đời" sub="từ ngày sinh" size={132} />
          <Num n={num('soDinhMenh')} label="Định Mệnh" sub="từ họ tên" size={132} />
          <Num n={num('soLinhHon')} label="Linh Hồn" sub="từ nguyên âm" size={132} />
          <Num n={num('soSuMenh')} label="Sứ Mệnh" sub="từ phụ âm" size={132} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '26px 30px 0' }}>
          <Num n={num('soNgaySinh')} label="Ngày Sinh" sub="tài năng bẩm sinh" size={92} />
          <Num n={num('soThaiDo')} label="Thái Độ" sub="ấn tượng đầu tiên" size={92} />
          <Num n={num('soTruongThanh')} label="Trưởng Thành" sub="nửa sau cuộc đời" size={92} />
          <Num n={num('namCaNhan')} label={`Năm Cá Nhân`} sub={`năm ${num('namXemThanSo') || ''}`} size={92} />
        </div>
        <div style={{ display: 'flex', margin: '34px 30px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginBottom: 10 }}>Biểu đồ ngày sinh</div>
            {LUOI.map((row) => (
              <div key={row.join('')} style={{ display: 'flex' }}>
                {row.map((n) => {
                  const k = grid[n] || 0;
                  return (
                    <div
                      key={n}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 124,
                        height: 104,
                        margin: 4,
                        borderRadius: 12,
                        border: `2px solid ${k ? C.line : C.grid}`,
                        background: k ? '#F3ECDD' : C.paper,
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: k ? C.ink : '#CFCFCF' }}>
                        {k ? String(n).repeat(Math.min(k, 4)) : String(n)}
                      </div>
                      <div style={{ display: 'flex', fontSize: 18, color: k ? C.mute : '#CFCFCF' }}>{k ? `×${k}` : 'trống'}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: 560, paddingLeft: 20, paddingTop: 30 }}>
            {lines.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
                <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{k}</div>
                <div style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: khongCo(v) ? C.mute : C.ink }}>
                  {khongCo(v) ? 'không có' : v}
                </div>
              </div>
            ))}
          </div>
        </div>
        {changs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', margin: '26px 30px 0' }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>Bốn chặng đời — đỉnh cao / thử thách · nền vàng là chặng đang đi</div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              {changs.map((m) => {
                const cur = m[1] === changNay;
                return (
                  <div
                    key={m[1]}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: (W - 60) / changs.length,
                      padding: '10px 0',
                      background: cur ? C.curVan : C.paper,
                      border: `1px solid ${cur ? C.gold : C.grid}`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: cur ? C.red : C.ink }}>{m[1]}</div>
                    <div style={{ display: 'flex', fontSize: 16, color: C.mute }}>{m[2]}</div>
                    <div style={{ display: 'flex', fontSize: 20, color: C.ink, marginTop: 4 }}>{`đỉnh ${m[3]} · thử thách ${m[4]}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter origin={req.nextUrl.origin} note="Thần số học Pythagoras · tên tính theo họ tên khai sinh, bỏ dấu" />
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
