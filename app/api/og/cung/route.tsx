// app/api/og/cung/route.tsx
// ẢNH MỘT CUNG cho kênh chat — bản ảnh của khối "Xem cơ sở tính toán" mỗi cung
// trên trang luận giải (public/luan-giai-core.js `buildPreGenHtml`):
//   · SƠ ĐỒ 12 cung: cung đang xem + tam phương tứ chính, mũi tên Tứ Hóa Phi
//     Tinh bay từ cung này tới cung đích (trên web khối này mới là chữ);
//   · "Đánh giá 6 chiều" (`cungScores[cung]`, cùng 6 chỉ số thanh điểm trên web)
//     vẽ thành lục giác, có số;
//   · chính tinh, sao trong cung (cát trái / hung phải như ảnh lá số), cách cục.
// Số liệu CHỈ từ engine (`computeLaso`, `tuHoaPhiTinh`, `starMeta`, `canCung`).
// Link ký, loại `cung`, khoá `c` = tên cung.
export const runtime = 'nodejs';

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { loadOgFonts, ogFallbackRedirect } from '@/lib/og/font';
import { readChartParams } from '@/lib/og/laso-image';
import { BrandFooter, BrandHeader, C, H, LUOI_CHI, W, birthLine } from '@/lib/og/brand';
import { canCung, computeLaso, starMeta, tuHoaPhiTinh } from '@/lib/engine/laso';

type Star = { ten?: string; brightness?: string; hoa?: string | null };
type Palace = {
  cungName: string;
  diaChi: string;
  stars?: Star[];
  majorStars?: Star[];
  tamHopCungs?: { cungName: string }[];
  xungChieuCung?: { cungName: string; majorStars?: Star[] } | null;
};
type Scores = Record<string, number>;

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Cùng 6 chỉ số, cùng thứ tự thanh "Đánh giá 6 chiều" của luan-giai-core.js.
const METRICS: [string, string][] = [
  ['thienVan', 'Thiên Vận'],
  ['canCo', 'Căn Cơ'],
  ['mayMan', 'May Mắn'],
  ['phuTro', 'Phù Trợ'],
  ['binhYen', 'Bình Yên'],
  ['benVung', 'Bền Vững'],
];
const HOA_COLOR: Record<string, string> = { Lộc: '#1E6B3C', Quyền: '#7B3FA0', Khoa: '#1455A4', Kỵ: '#C0392B' };
// Cột PHẢI (hung) — cùng tập với ảnh lá số (`BAD_TYPES`, app/api/og/la-so-anh).
const HUNG = new Set(['sát tinh', 'hung tinh', 'bại tinh', 'tuế_tinh']);
const BO_QUA = new Set(['chính tinh', 'vòng_trang_sinh', 'tuan_triet']);
const fmt = (n: number) => String(n).replace('.', ',');

// Sơ đồ 12 cung.
const O = 146;
const G = O * 4;
// Lục giác điểm.
const RS = 430;
const RR = 138;

export async function GET(req: NextRequest) {
  const parsed = readChartParams('cung', req.nextUrl.searchParams);
  if (!parsed) return new Response('forbidden', { status: 403 });
  const { birth, namXem, cung } = parsed;
  const r = computeLaso(birth, namXem || undefined);
  if (!r.ok || !r.ls) return new Response(r.error || 'bad request', { status: 400 });
  const ls = r.ls as Record<string, unknown>;
  const palaces = (ls.palaces as Palace[]) || [];
  const pal = palaces.find((p) => p.cungName === cung);
  if (!pal) return new Response('unknown cung', { status: 400 });
  const sc = ((ls.cungScores as Record<string, Scores>) || {})[cung];
  const th = tuHoaPhiTinh(r.ls, cung);
  const canNam = String(ls.canChiNam || '').split(' ')[0];
  const canCuaCung = canCung(canNam, pal.diaChi);
  const tamHop = (pal.tamHopCungs || []).map((p) => p.cungName);
  const xung = pal.xungChieuCung?.cungName || '';
  const cachCuc = ((ls.cachCuc as { ten: string; cung?: string }[]) || []).filter((c) => c.cung === cung).map((c) => c.ten);
  // "Phân tích sao" của engine (khối cùng tên trên web) — tối đa 3 dòng cho vừa ảnh.
  const phanTich = (((ls.cachCucTungCung as Record<string, string[]>) || {})[cung] || []).slice(0, 3);

  const fonts = await loadOgFonts([400, 700], req);
  if (!fonts.length) return ogFallbackRedirect(req);

  // ── Sơ đồ: tâm từng ô theo địa chi ──
  const tam = (diaChi: string): [number, number] => {
    const [row, col] = LUOI_CHI[CHI.indexOf(diaChi)] || [0, 0];
    return [col * O + O / 2, row * O + O / 2];
  };
  const [ax, ay] = tam(pal.diaChi);
  const rows = th?.rows || [];
  const denCung = new Map<string, number>();
  // Mũi tên CONG về khoảng trống giữa sơ đồ (điểm uốn ~ tâm lưới): đi từ MÉP ô
  // nguồn tới MÉP ô đích, không cắt ngang tên cung. Nhiều sao cùng tới một cung
  // → dời điểm uốn cho khỏi chồng nhau.
  const moc = (x: number, y: number, tx: number, ty: number): [number, number] => {
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    const t = O / 2 / Math.max(Math.abs(dx / len), Math.abs(dy / len)) + 2;
    return [x + (dx / len) * t, y + (dy / len) * t];
  };
  const muiTen = rows
    .filter((x) => !x.self)
    .map((x, i) => {
      const k = denCung.get(x.cung) || 0;
      denCung.set(x.cung, k + 1);
      const [bx, by] = tam(x.diaChi);
      const qx = G / 2 + (i - 1.5) * 14 + k * 18;
      const qy = G / 2 + (i - 1.5) * 14 - k * 18;
      const [x1, y1] = moc(ax, ay, qx, qy);
      const [x2, y2] = moc(bx, by, qx, qy);
      const ex = x2 - qx;
      const ey = y2 - qy;
      const el = Math.hypot(ex, ey) || 1;
      const [ux, uy] = [ex / el, ey / el];
      const head = `${x2},${y2} ${x2 - ux * 18 - uy * 9},${y2 - uy * 18 + ux * 9} ${x2 - ux * 18 + uy * 9},${y2 - uy * 18 - ux * 9}`;
      return { ...x, d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${(x2 - ux * 14).toFixed(1)},${(y2 - uy * 14).toFixed(1)}`, head };
    });
  const tuHoaTai = (cungName: string) => rows.filter((x) => x.self && x.cung === cungName);

  // ── Lục giác 6 chiều ──
  const cx = RS / 2;
  const cy = RS / 2;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / METRICS.length;
  const at = (i: number, f: number) => [cx + RR * f * Math.cos(ang(i)), cy + RR * f * Math.sin(ang(i))];
  const vals = METRICS.map(([k]) => (sc && typeof sc[k] === 'number' ? sc[k] : 0));
  const ring = (f: number) => METRICS.map((_, i) => at(i, f).map((n) => n.toFixed(1)).join(',')).join(' ');
  const poly = vals.map((v, i) => at(i, Math.max(0, Math.min(10, v)) / 10).map((n) => n.toFixed(1)).join(',')).join(' ');

  // ── Sao trong cung ──
  const phu = (pal.stars || []).filter((s) => {
    const t = starMeta(s.ten || '')?.type || '';
    return s.ten && !BO_QUA.has(t);
  });
  const cat = phu.filter((s) => !HUNG.has(starMeta(s.ten || '')?.type || '')).map((s) => s.ten!);
  const hung = phu.filter((s) => HUNG.has(starMeta(s.ten || '')?.type || '')).map((s) => s.ten!);
  const chinh = pal.majorStars || [];
  const chinhTxt = chinh.length
    ? chinh.map((s) => `${s.ten}${s.brightness ? ` (${s.brightness})` : ''}${s.hoa ? ` · Hóa ${s.hoa}` : ''}`).join(' · ')
    : `Vô chính diệu${pal.xungChieuCung?.majorStars?.length ? ` — mượn ${pal.xungChieuCung.majorStars.map((s) => s.ten).join(', ')} từ ${xung}` : ''}`;

  const khoi = (nhan: string, noiDung: string, mau = C.ink) => (
    <div key={nhan} style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>{nhan}</div>
      <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: mau, lineHeight: 1.3 }}>{noiDung}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: C.bg, fontFamily: 'BeVN' }}>
        <BrandHeader
          title={`Cung ${cung}`}
          sub={birthLine(birth)}
          sub2={`${canCuaCung ? canCuaCung + ' ' : ''}${pal.diaChi} · tam hợp ${tamHop.join(', ')} · xung chiếu ${xung}`}
        />
        <div style={{ display: 'flex', margin: '6px 24px 0', alignItems: 'flex-start' }}>
          {/* Sơ đồ 12 cung + Tứ Hóa Phi Tinh */}
          <div style={{ display: 'flex', position: 'relative', width: G, height: G }}>
            {palaces.map((p) => {
              const [row, col] = LUOI_CHI[CHI.indexOf(p.diaChi)] || [0, 0];
              const la = p.cungName === cung;
              const tp = tamHop.includes(p.cungName) || p.cungName === xung;
              const tu = tuHoaTai(p.cungName);
              return (
                <div
                  key={p.diaChi}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    left: col * O,
                    top: row * O,
                    width: O,
                    height: O,
                    background: la ? '#FBE3DF' : tp ? C.curVan : C.paper,
                    border: `${la ? 3 : 1}px solid ${la ? C.red : tp ? C.gold : C.grid}`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 14, color: C.mute }}>{p.diaChi}</div>
                  <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: la ? C.red : C.ink, textAlign: 'center' }}>
                    {p.cungName}
                  </div>
                  {tu.map((x) => (
                    <div key={x.hoa} style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: HOA_COLOR[x.hoa] }}>
                      {`Tự hóa ${x.hoa}`}
                    </div>
                  ))}
                </div>
              );
            })}
            <svg width={G} height={G} style={{ position: 'absolute', top: 0, left: 0 }}>
              {muiTen.map((m) => [
                <path key={`l${m.hoa}`} d={m.d} fill="none" stroke={HOA_COLOR[m.hoa]} strokeWidth={3.5} />,
                <polygon key={`h${m.hoa}`} points={m.head} fill={HOA_COLOR[m.hoa]} />,
              ])}
            </svg>
          </div>

          {/* Lục giác 6 chiều */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 4 }}>
            <div style={{ display: 'flex', fontSize: 20, color: C.mute }}>Đánh giá 6 chiều (0–10)</div>
            <div style={{ display: 'flex', position: 'relative', width: RS, height: RS }}>
              <svg width={RS} height={RS} style={{ position: 'absolute', top: 0, left: 0 }}>
                {[1, 0.8, 0.6, 0.4, 0.2].map((f) => (
                  <polygon key={f} points={ring(f)} fill={f === 1 ? '#FFFFFF' : 'none'} stroke={C.grid} strokeWidth={1.5} />
                ))}
                {METRICS.map((_, i) => {
                  const [x, y] = at(i, 1);
                  return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.grid} strokeWidth={1.5} />;
                })}
                <polygon points={poly} fill="rgba(176,58,46,0.18)" stroke={C.red} strokeWidth={4} />
              </svg>
              {METRICS.map(([, nhan], i) => {
                const [x, y] = at(i, 1.3);
                return (
                  <div
                    key={nhan}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', left: x - 70, top: y - 26, width: 140 }}
                  >
                    <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: C.ink }}>{nhan}</div>
                    <div style={{ display: 'flex', fontSize: 19, color: C.mute }}>{fmt(vals[i])}</div>
                  </div>
                );
              })}
            </div>
            {sc && typeof sc.tong === 'number' ? (
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.ink }}>{`Tổng điểm cung: ${fmt(sc.tong)}/10`}</div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', margin: '14px 24px 0' }}>
          {th ? (
            <div style={{ display: 'flex', width: '100%', fontSize: 18, color: C.mute }}>{`Tứ Hóa Phi Tinh — can cung ${th.can}`}</div>
          ) : null}
          {rows.map((x) => (
            <div key={x.hoa} style={{ display: 'flex', alignItems: 'center', width: '50%', marginTop: 4 }}>
              <div style={{ display: 'flex', width: 26, height: 6, background: HOA_COLOR[x.hoa], marginRight: 10 }} />
              <div style={{ display: 'flex', fontSize: 21, color: C.ink }}>
                <span style={{ fontWeight: 700, color: HOA_COLOR[x.hoa], marginRight: 6 }}>{`Hóa ${x.hoa}`}</span>
                {`${x.star} → ${x.self ? 'tự hóa tại chính cung' : `cung ${x.cung}`}`}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', margin: '0 30px' }}>
          {khoi('Chính tinh', chinhTxt, C.red)}
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', width: '50%', paddingRight: 12 }}>{khoi('Sao cát trong cung', cat.join(', ') || '—', C.green)}</div>
            <div style={{ display: 'flex', width: '50%' }}>{khoi('Sao hung trong cung', hung.join(', ') || '—', C.red)}</div>
          </div>
          {cachCuc.length ? khoi('Cách cục', cachCuc.join(' · ')) : null}
          {phanTich.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
              <div style={{ display: 'flex', fontSize: 18, color: C.mute }}>Phân tích sao</div>
              {phanTich.map((t) => (
                <div key={t} style={{ display: 'flex', fontSize: 19, color: C.ink, lineHeight: 1.35 }}>{`• ${t}`}</div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <BrandFooter
          origin={req.nextUrl.origin}
          note="Ô đỏ: cung đang xem · ô vàng: tam phương tứ chính · mũi tên: Tứ Hóa Phi Tinh theo can cung"
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
