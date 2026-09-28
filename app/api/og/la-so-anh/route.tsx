// app/api/og/la-so-anh/route.tsx
// ẢNH LÁ SỐ 12 CUNG cho kênh chat (Zalo/Messenger/WhatsApp/Telegram) — app chat
// không có lưới lá số như web, nên gửi hẳn một tấm ảnh (1080×1350, chữ to cho
// điện thoại).
//
// Bố cục theo khuôn lá số của phần mềm "An Sao — Tử Vi Thiên Lương" (bản tham
// khảo trong scripts/oracle/vendor/, Henry chốt là khuôn chuẩn): mỗi ô có
// CAN CHI + TÊN CUNG ở đầu, chính tinh ở giữa, phụ tinh chia hai cột (cát bên
// trái, hung/sát/bại bên phải), vòng Tràng Sinh góc trái dưới, tuổi đại hạn góc
// phải dưới; trung cung có thông tin người xem + đường tam phương tứ chính.
// Chỉ lấy BỐ CỤC — không chép mã của họ; màu ngũ hành theo laso-chart.css.
//
// Số liệu CHỈ lấy từ engine (`computeLaso`, `canCung`, `starMeta`,
// `canChiNgayGio` — lib/engine/laso.ts). Link do server ký (lib/og/laso-image.ts);
// sai chữ ký → 403. Tham số gồm năm xem ⇒ cùng URL luôn ra cùng ảnh ⇒ CDN nhớ lâu.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readLasoImageParams } from '@/lib/og/laso-image';
import { BrandFooter, FOOT } from '@/lib/og/brand';
import { canChiNgayGio, canCung, computeLaso, starMeta } from '@/lib/engine/laso';
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
type Item = { text: string; color: string; bold?: boolean };

const W = 1080;
const H = 1350;
const PAD = 16;
const HEAD = 64;
const CW = (W - PAD * 2) / 4;
const CH = (H - HEAD - FOOT - PAD) / 4;

const C = {
  bg: '#FBF8F1',
  paper: '#FFFFFF',
  line: '#6B5B3E',
  ink: '#1F1A14',
  mute: '#6E6250',
  gold: '#A8843A',
  red: '#B03A2E',
  curVan: '#FFF4D9',
  tamHop: '#C0392B',
  tuChinh: '#1455A4',
};
// Màu ngũ hành — cùng bảng .sc-* của public/laso-chart.css (Thổ đậm hơn một
// nấc để đọc được trên nền trắng khi ảnh bị nén).
const EL: Record<string, string> = { kim: '#7F8C8D', mộc: '#27AE60', thủy: '#1A1A1A', hỏa: '#E74C3C', thổ: '#B8860B' };
const HOA_COLOR: Record<string, string> = { Lộc: '#1E6B3C', Quyền: '#7B3FA0', Khoa: '#1455A4', Kỵ: '#C0392B' };
const BRIGHT: Record<string, string> = { Miếu: 'M', Vượng: 'V', Đắc: 'Đ', Bình: 'B', Hãm: 'H' };
// Nhóm sao xếp cột PHẢI — cùng tập `_BAD_TYPES` của public/laso-chart.js.
const BAD_TYPES = new Set(['sát tinh', 'hung tinh', 'bại tinh', 'tuế_tinh']);
const TRANG_SINH = new Set(['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng']);
const TUAN_TRIET = new Set(['Tuần', 'Triệt', 'Tuần+Triệt']);
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Vị trí [hàng, cột] của từng địa chi trên lưới 4×4 (Tý ở hàng dưới, cột 3).
const POS: Record<number, [number, number]> = {
  5: [0, 0], 6: [0, 1], 7: [0, 2], 8: [0, 3],
  4: [1, 0], 9: [1, 3],
  3: [2, 0], 10: [2, 3],
  2: [3, 0], 1: [3, 1], 0: [3, 2], 11: [3, 3],
};

const elColor = (ten?: string) => EL[starMeta(ten || '')?.element || ''] || C.ink;

/** Tên nạp âm đầy đủ ("Lộ Bàng Thổ") của năm can chi ÂM — tra bảng `ccInfo`
 *  (lib/engine/diachi.ts) qua một chu kỳ 60 năm; engine chỉ trả hành ("Thổ"). */
function napAmTen(canChi: string): string {
  for (let y = 1924; y < 1984; y++) {
    const c = ccInfo(y);
    if (c && c.canChi === canChi) return c.napAm;
  }
  return '';
}

function Col({ items, align }: { items: Item[]; align: 'flex-start' | 'flex-end' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '50%' }}>
      {items.map((it, i) => (
        <div
          key={`${it.text}-${i}`}
          style={{ display: 'flex', fontSize: 16, lineHeight: 1.32, color: it.color, fontWeight: it.bold ? 700 : 400 }}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

function Cell({ p, canNam, dvTuoi, cur }: { p?: Palace; canNam: string; dvTuoi?: number; cur: boolean }) {
  if (!p) return <div style={{ display: 'flex', width: CW, height: CH }} />;
  const stars = p.stars || [];
  const chinh = p.majorStars || [];
  const left: Item[] = [];
  const right: Item[] = [];
  // Hóa của chính tinh đứng như một sao riêng (Kỵ bên hung, còn lại bên cát).
  for (const s of chinh) {
    if (s.hoa) (s.hoa === 'Kỵ' ? right : left).push({ text: `Hóa ${s.hoa}`, color: HOA_COLOR[s.hoa] || C.ink, bold: true });
  }
  for (const s of stars) {
    const ten = s.ten || '';
    if (s.nhom === 'chinh' || TRANG_SINH.has(ten) || TUAN_TRIET.has(ten)) continue;
    const bad = BAD_TYPES.has(starMeta(ten)?.type || '');
    const b = bad && s.brightness && BRIGHT[s.brightness] ? ` (${BRIGHT[s.brightness]})` : '';
    (bad ? right : left).push({ text: ten + b, color: elColor(ten) });
    if (s.hoa) (s.hoa === 'Kỵ' ? right : left).push({ text: `Hóa ${s.hoa}`, color: HOA_COLOR[s.hoa] || C.ink, bold: true });
  }
  const ts = stars.find((s) => TRANG_SINH.has(s.ten || ''));
  const tuan = stars.some((s) => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const triet = stars.some((s) => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  const tt = tuan && triet ? 'TUẦN · TRIỆT' : tuan ? 'TUẦN' : triet ? 'TRIỆT' : '';
  const can = canCung(canNam, p.diaChi);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: CW,
        height: CH,
        padding: '6px 9px',
        background: cur ? C.curVan : C.paper,
        border: `1px solid ${C.line}`,
        ...(p.isMenh ? { border: `3px solid ${C.red}` } : {}),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 15, color: C.mute }}>{`${can} ${p.diaChi}`.trim().toUpperCase()}</div>
        <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: p.isMenh ? C.red : C.ink }}>
          {p.cungName.toUpperCase()}
          {p.isThan ? ' (THÂN)' : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6, minHeight: 56 }}>
        {chinh.length ? (
          chinh.map((s) => (
            <div key={s.ten} style={{ display: 'flex', alignItems: 'baseline', fontSize: 23, fontWeight: 700, color: elColor(s.ten) }}>
              <span style={{ whiteSpace: 'nowrap' }}>{(s.ten || '').toUpperCase()}</span>
              {s.brightness && BRIGHT[s.brightness] ? (
                <span style={{ whiteSpace: 'nowrap', fontSize: 16, fontWeight: 400, marginLeft: 4 }}>
                  ({BRIGHT[s.brightness]})
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', fontSize: 17, color: C.mute }}>Vô chính diệu</div>
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 4, flexGrow: 1 }}>
        <Col items={left} align="flex-start" />
        <Col items={right} align="flex-end" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 14, color: elColor(ts?.ten) }}>{ts?.ten || ''}</div>
        {tt ? <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: C.ink }}>{tt}</div> : null}
        <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: cur ? C.red : C.gold }}>
          {dvTuoi != null ? dvTuoi : ''}
        </div>
      </div>
    </div>
  );
}

/** Điểm neo trên mép TRUNG CUNG của ô chi `chi` (toạ độ trong trung cung, px):
 *  tâm ô kẹp vào khung trung cung (lưới 4×4, trung cung = ô [1..3]×[1..3]). */
function anchor(chi: number): { x: number; y: number } {
  const [r, c] = POS[chi];
  const clamp = (v: number) => Math.min(3, Math.max(1, v));
  return { x: (clamp(c + 0.5) - 1) * CW, y: (clamp(r + 0.5) - 1) * CH };
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

  const canChiNam = String(ls.canChiNam || '');
  const canNam = canChiNam.split(' ')[0];
  const palaces = (ls.palaces as unknown as Palace[]) || [];
  const byChi: Record<number, Palace> = {};
  for (const p of palaces) byChi[CHI.indexOf(p.diaChi)] = p;
  const byName = (n: string) => palaces.find((p) => p.cungName === n);
  const daiVans = (ls.daiVans as unknown as { cungIdx: number; tuoiStart: number; tuoiEnd: number }[]) || [];
  const dvHT = ls.daiVanHienTai as unknown as { cungIdx?: number; tuoiStart?: number; tuoiEnd?: number } | undefined;
  const cell = (chi: number) => {
    const p = byChi[chi];
    const dv = p ? daiVans.find((d) => d.cungIdx === p.idx) : undefined;
    const cur = !!(p && dvHT && dvHT.cungIdx === p.idx);
    return <Cell key={chi} p={p} canNam={canNam} dvTuoi={dv?.tuoiStart} cur={cur} />;
  };

  // ── Trung cung ──
  const menh = palaces.find((p) => p.isMenh);
  const than = palaces.find((p) => p.isThan);
  const dvCung = dvHT ? palaces.find((p) => p.idx === dvHT.cungIdx) : undefined;
  const tieuHan = palaces[ls.tieuHanIdx as unknown as number];
  const gioi = birth.gender === 'nu' ? 'NỮ' : 'NAM';
  const amDuong = String(ls.amDuong || '') === 'dương' ? 'DƯƠNG' : 'ÂM';
  const namXemCc = ccInfo(namXem)?.canChi || '';
  const lich = birth.isLunar ? null : canChiNgayGio(birth.day!, birth.month!, birth.year!, birth.hourBranch!);
  const rows: [string, string, string][] = lich
    ? [
        ['Năm', `${birth.year} (${lich.amLich.year})`, canChiNam],
        ['Tháng', `${birth.month} (${lich.amLich.month})`, ''],
        ['Ngày', `${birth.day} (${lich.amLich.day})`, lich.ngay],
        ['Giờ', CHI[birth.hourBranch!], lich.gio],
      ]
    : [
        ['Âm lịch', `${birth.day}/${birth.month}/${birth.year}`, canChiNam],
        ['Giờ', CHI[birth.hourBranch!], ''],
      ];
  const info = [
    `Mệnh: ${napAmTen(canChiNam) || ls.napAm || ''}`,
    `Cục: ${ls.cuc || ''}`,
    `An Mệnh: ${menh?.diaChi || '?'} · An Thân: ${than?.diaChi || '?'}${than ? ` (${than.cungName})` : ''}`,
    dvHT && dvCung ? `Đại hạn: ${dvCung.cungName} · ${dvCung.diaChi} · ${dvHT.tuoiStart}–${dvHT.tuoiEnd} tuổi` : '',
    tieuHan ? `Tiểu hạn ${namXem}: ${tieuHan.cungName} · ${tieuHan.diaChi}` : '',
  ].filter(Boolean);

  // Tam phương tứ chính của Mệnh: Mệnh–Quan Lộc–Tài Bạch (tam hợp) + Mệnh–Thiên Di.
  const chiOf = (p?: Palace) => (p ? CHI.indexOf(p.diaChi) : -1);
  const m = chiOf(menh);
  const q = chiOf(byName('Quan Lộc'));
  const t = chiOf(byName('Tài Bạch'));
  const d = chiOf(byName('Thiên Di'));
  const lines = m >= 0 && q >= 0 && t >= 0 && d >= 0;
  const A = lines ? { m: anchor(m), q: anchor(q), t: anchor(t), d: anchor(d) } : null;

  const center = (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: CW * 2,
        height: CH * 2,
        background: C.bg,
        border: `1px solid ${C.line}`,
      }}
    >
      {A ? (
        <svg width={CW * 2} height={CH * 2} style={{ position: 'absolute', top: 0, left: 0 }}>
          <line x1={A.m.x} y1={A.m.y} x2={A.q.x} y2={A.q.y} stroke={C.tamHop} strokeWidth={1.2} strokeOpacity={0.3} />
          <line x1={A.q.x} y1={A.q.y} x2={A.t.x} y2={A.t.y} stroke={C.tamHop} strokeWidth={1.2} strokeOpacity={0.3} />
          <line x1={A.t.x} y1={A.t.y} x2={A.m.x} y2={A.m.y} stroke={C.tamHop} strokeWidth={1.2} strokeOpacity={0.3} />
          <line x1={A.m.x} y1={A.m.y} x2={A.d.x} y2={A.d.y} stroke={C.tuChinh} strokeWidth={1.2} strokeOpacity={0.3} strokeDasharray="6 5" />
        </svg>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '24px 34px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 14, letterSpacing: 5, color: C.gold }}>LÁ SỐ TỬ VI</div>
        {birth.name ? (
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: C.ink, marginTop: 6 }}>{birth.name}</div>
        ) : null}
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.red, marginTop: 6 }}>
          {amDuong} {gioi}
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: C.ink, marginTop: 4 }}>
          {`${ls.tuoiXem || ''} tuổi · Năm xem ${namXem}${namXemCc ? ` (${namXemCc.toUpperCase()})` : ''}`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12, width: '100%' }}>
          {rows.map(([k, v, cc]) => (
            <div key={k} style={{ display: 'flex', fontSize: 19, color: C.ink, marginTop: 3 }}>
              <div style={{ display: 'flex', width: 92, color: C.mute }}>{k}:</div>
              <div style={{ display: 'flex', width: 170 }}>{v}</div>
              <div style={{ display: 'flex', fontWeight: 700 }}>{cc.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', width: 140, height: 2, background: C.gold, margin: '14px 0 8px' }} />
        {info.map((x) => (
          <div key={x} style={{ display: 'flex', fontSize: 19, color: C.ink, marginTop: 5, textAlign: 'center' }}>
            {x}
          </div>
        ))}
      </div>
    </div>
  );

  const ngay = `${birth.day}/${birth.month}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'}`;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: HEAD, padding: `0 ${PAD + 6}px` }}
        >
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: C.ink }}>
            {birth.name ? `Lá số của ${birth.name}` : `Lá số ${gioi === 'NỮ' ? 'Nữ' : 'Nam'} ${birth.year}`}
          </div>
          <div style={{ display: 'flex', fontSize: 17, color: C.mute }}>{`${ngay} · giờ ${CHI[birth.hourBranch!]}`}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: `0 ${PAD}px` }}>
          <div style={{ display: 'flex' }}>{[5, 6, 7, 8].map(cell)}</div>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>{[4, 3].map(cell)}</div>
            {center}
            <div style={{ display: 'flex', flexDirection: 'column' }}>{[9, 10].map(cell)}</div>
          </div>
          <div style={{ display: 'flex' }}>{[2, 1, 0, 11].map(cell)}</div>
        </div>
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Viền đỏ: cung Mệnh · Nền vàng: đại hạn đang đi · Số góc phải: tuổi vào đại hạn"
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
