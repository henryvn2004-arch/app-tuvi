// app/api/og/la-so-anh/route.tsx
// ẢNH LÁ SỐ 12 CUNG cho kênh chat (Zalo/Messenger/WhatsApp/Telegram) — app chat
// không có lưới lá số như web, nên gửi hẳn một tấm ảnh. Bố cục theo lưới web
// (`renderGrid` của public/laso-chart.js: Tỵ-Ngọ-Mùi-Thân ở hàng trên, Dần-Sửu-
// Tý-Hợi ở hàng dưới), chữ to cho màn hình điện thoại (1080×1350).
//
// Số liệu CHỈ lấy từ engine (`computeLaso`) — route không tính gì thêm.
// Link do server ký (lib/og/laso-image.ts); sai chữ ký → 403.
// Tham số đã gồm năm xem ⇒ cùng URL luôn ra cùng ảnh ⇒ CDN nhớ lâu.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readLasoImageParams } from '@/lib/og/laso-image';
import { computeLaso, type Laso } from '@/lib/engine/laso';
import { ccInfo } from '@/lib/engine/diachi';

type Star = { ten?: string; nhom?: string; brightness?: string; hoa?: string | null };
type Palace = {
  idx: number;
  diaChi: string;
  cungName: string;
  isMenh?: boolean;
  isThan?: boolean;
  stars?: Star[];
  majorStars?: Star[];
};

const W = 1080;
const H = 1350;
const PAD = 20;
const HEAD = 104;
const FOOT = 44;
const CW = (W - PAD * 2) / 4;
const CH = (H - HEAD - FOOT - PAD) / 4;

const C = {
  bg: '#F4F2EC',
  card: '#FFFDF8',
  line: '#D9CDB3',
  ink: '#2B2118',
  mute: '#7C6942',
  gold: '#B08A3E',
  red: '#9B2C2C',
  curVan: '#FFF3D6',
};
const HOA_COLOR: Record<string, string> = { Lộc: '#1E6B3C', Quyền: '#9B2C2C', Khoa: '#1F4E8C', Kỵ: '#333333' };
const BRIGHT: Record<string, string> = { Miếu: 'M', Vượng: 'V', Đắc: 'Đ', Bình: 'B', Hãm: 'H' };
const TRANG_SINH = new Set(['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng']);
const TUAN_TRIET = new Set(['Tuần', 'Triệt', 'Tuần+Triệt']);
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const PHU_MAX = 12;

/** Tên nạp âm đầy đủ ("Lộ Bàng Thổ") của năm can chi ÂM — tra bảng `ccInfo`
 *  (lib/engine/diachi.ts) qua một chu kỳ 60 năm; engine chỉ trả hành ("Thổ"). */
function napAmTen(canChi: string): string {
  for (let y = 1924; y < 1984; y++) {
    const c = ccInfo(y);
    if (c && c.canChi === canChi) return c.napAm;
  }
  return '';
}

function Cell({ p, dvTuoi, cur }: { p?: Palace; dvTuoi?: number; cur: boolean }) {
  if (!p) return <div style={{ display: 'flex', width: CW, height: CH }} />;
  const stars = p.stars || [];
  const chinh = p.majorStars || [];
  const phu = stars.filter((s) => s.nhom !== 'chinh' && !TRANG_SINH.has(s.ten || '') && !TUAN_TRIET.has(s.ten || ''));
  const ts = stars.find((s) => TRANG_SINH.has(s.ten || ''));
  const tuan = stars.some((s) => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const triet = stars.some((s) => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  const tt = tuan && triet ? 'TUẦN+TRIỆT' : tuan ? 'TUẦN' : triet ? 'TRIỆT' : '';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: CW,
        height: CH,
        padding: '8px 10px',
        background: cur ? C.curVan : C.card,
        border: `1px solid ${C.line}`,
        ...(p.isMenh ? { border: `3px solid ${C.red}` } : {}),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: p.isMenh ? C.red : C.ink }}>
          {p.cungName.toUpperCase()}
          {p.isThan ? ' · THÂN' : ''}
        </div>
        <div style={{ display: 'flex', fontSize: 16, color: C.mute }}>{p.diaChi}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6, minHeight: 58 }}>
        {chinh.length ? (
          chinh.map((s) => (
            // Mỗi mẩu một khối `nowrap`: hàng hẹp thì "Hóa Khoa" xuống dòng NGUYÊN
            // cụm, không gãy giữa chữ.
            <div
              key={s.ten}
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', fontSize: 24, fontWeight: 700, color: C.ink }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{(s.ten || '').toUpperCase()}</span>
              {s.brightness && BRIGHT[s.brightness] ? (
                <span style={{ whiteSpace: 'nowrap', fontSize: 15, fontWeight: 400, color: C.mute, marginLeft: 5 }}>
                  ({BRIGHT[s.brightness]})
                </span>
              ) : null}
              {s.hoa ? (
                <span
                  style={{ whiteSpace: 'nowrap', fontSize: 16, fontWeight: 700, color: HOA_COLOR[s.hoa] || C.ink, marginLeft: 6 }}
                >
                  Hóa {s.hoa}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>Vô chính diệu</div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4, flexGrow: 1, alignContent: 'flex-start' }}>
        {phu.slice(0, PHU_MAX).map((s, i) => (
          <div
            key={`${s.ten}-${i}`}
            style={{
              display: 'flex',
              fontSize: 17,
              lineHeight: 1.4,
              marginRight: 8,
              color: s.hoa ? HOA_COLOR[s.hoa] || C.ink : '#4A3F33',
              fontWeight: s.hoa ? 700 : 400,
            }}
          >
            {s.ten}
            {s.hoa ? ` (${s.hoa})` : ''}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.mute }}>
        <div style={{ display: 'flex' }}>{[ts?.ten || '', tt].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', fontWeight: 700, color: cur ? C.red : C.gold }}>{dvTuoi != null ? dvTuoi : ''}</div>
      </div>
    </div>
  );
}

function Center({ ls, lines, name }: { ls: Laso; lines: string[]; name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: CW * 2,
        height: CH * 2,
        padding: 28,
        background: C.bg,
        border: `1px solid ${C.line}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 15, letterSpacing: 5, color: C.gold }}>LÁ SỐ TỬ VI</div>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.ink, marginTop: 8, textAlign: 'center' }}>
        {name || String(ls.canChiNam || '')}
      </div>
      <div style={{ display: 'flex', width: 120, height: 2, background: C.gold, margin: '16px 0' }} />
      {lines.map((t) => (
        <div key={t} style={{ display: 'flex', fontSize: 21, color: C.ink, marginTop: 7, textAlign: 'center' }}>
          {t}
        </div>
      ))}
    </div>
  );
}

export async function GET(req: NextRequest) {
  const parsed = readLasoImageParams(req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls;

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  const palaces = (ls.palaces as unknown as Palace[]) || [];
  const byChi: Record<number, Palace> = {};
  for (const p of palaces) byChi[CHI.indexOf(p.diaChi)] = p;
  const daiVans = (ls.daiVans as unknown as { cungIdx: number; tuoiStart: number; tuoiEnd: number; diaChi?: string }[]) || [];
  const dvHT = ls.daiVanHienTai as unknown as { cungIdx?: number; tuoiStart?: number; tuoiEnd?: number } | undefined;
  const cell = (chi: number) => {
    const p = byChi[chi];
    const dv = p ? daiVans.find((d) => d.cungIdx === p.idx) : undefined;
    const cur = !!(p && dvHT && dvHT.cungIdx === p.idx);
    return <Cell key={chi} p={p} dvTuoi={dv?.tuoiStart} cur={cur} />;
  };

  const menh = palaces.find((p) => p.isMenh);
  const than = palaces.find((p) => p.isThan);
  const tieuHan = palaces[ls.tieuHanIdx as unknown as number];
  const gioi = birth.gender === 'nu' ? 'Nữ' : 'Nam';
  const ngay = `${birth.day}/${birth.month}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'}`;
  const lines = [
    `${gioi} · ${ngay} · giờ ${CHI[birth.hourBranch as number]}`,
    `Năm ${ls.canChiNam || ''} · ${napAmTen(String(ls.canChiNam || '')) || `Mệnh ${ls.napAm || ''}`}`,
    `${ls.cuc || ''}`,
    `Mệnh tại ${menh?.diaChi || '?'} · Thân tại ${than?.diaChi || '?'}`,
    `Năm xem ${namXem} · ${ls.tuoiXem || ''} tuổi (âm)`,
    dvHT ? `Đại vận hiện tại: ${dvHT.tuoiStart}–${dvHT.tuoiEnd} tuổi` : '',
    tieuHan ? `Tiểu hạn: ${tieuHan.cungName} (${tieuHan.diaChi})` : '',
  ].filter((t) => t.trim());

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: HEAD,
            padding: `0 ${PAD + 8}px`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 15, letterSpacing: 5, color: C.gold }}>TỬ VI MINH BẢO</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: C.ink, marginTop: 4 }}>
              {birth.name ? `Lá số của ${birth.name}` : `Lá số ${gioi} ${birth.year}`}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{ngay}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: `0 ${PAD}px` }}>
          <div style={{ display: 'flex' }}>{[5, 6, 7, 8].map(cell)}</div>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>{[4, 3].map(cell)}</div>
            <Center ls={ls} lines={lines} name={birth.name || ''} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>{[9, 10].map(cell)}</div>
          </div>
          <div style={{ display: 'flex' }}>{[2, 1, 0, 11].map(cell)}</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: FOOT,
            padding: `0 ${PAD + 8}px`,
            fontSize: 15,
            color: C.mute,
          }}
        >
          <div style={{ display: 'flex' }}>Ô viền đỏ: cung Mệnh · Ô nền vàng: đại vận đang đi · Số góc phải: tuổi vào vận</div>
          <div style={{ display: 'flex', fontWeight: 700 }}>tuviminhbao.com</div>
        </div>
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
