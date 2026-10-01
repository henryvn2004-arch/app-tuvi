// lib/og/band-chart.tsx
// Khối biểu đồ "điểm + biên dao động" dùng chung cho ảnh `van-10-nam` và
// `bien-dong-thang` — bản ảnh của biểu đồ phần 24 trên web
// (public/luan-giai-core.js `bdBandSvg`): chấm là điểm, thanh vàng là khoảng
// dao động [lo, hi], nhãn ±% trên đầu thanh. Số lấy NGUYÊN từ engine, ở đây chỉ vẽ.
import { C, W } from '@/lib/og/brand';

export type BandRow = { diem: number; lo: number; hi: number; pct: number; l1: string; l2: string; l3?: string; cur?: boolean };

export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
export const pct = (p: number) => `±${Math.round(p * 100)}%`;
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const canChiNam = (nam: number) => `${CAN[(((nam - 4) % 10) + 10) % 10]} ${CHI[(((nam - 4) % 12) + 12) % 12]}`;
/** Can chi tháng âm `thang` (1–12) của năm `nam` — Ngũ Hổ Độn (tháng Giêng = Dần). */
export const canChiThang = (nam: number, thang: number) => {
  const canGieng = (((((nam - 4) % 10) + 10) % 10) % 5) * 2 + 2;
  return `${CAN[(canGieng + thang - 1) % 10]} ${CHI[(2 + thang - 1) % 12]}`;
};
/** Tên sao không trùng, tối đa `max` tên. */
export function tenSao(list: { ten: string }[], max = 5): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of list) {
    if (seen.has(d.ten)) continue;
    seen.add(d.ten);
    out.push(d.ten);
  }
  if (!out.length) return 'không có sao động';
  return out.length > max ? `${out.slice(0, max).join(', ')}…` : out.join(', ');
}

const PX = 76;
const PW = W - PX - 36;
const PY = 44;
const PH = 700;

/** Cao tổng của khối (để route chừa chỗ). */
export const BAND_H = PY + PH + 92;

export function BandChart({ rows, curLabel }: { rows: BandRow[]; curLabel?: string }) {
  const n = rows.length;
  const bw = PW / n;
  const cw = Math.min(26, bw * 0.42);
  const sy = (v: number) => PH - (Math.max(0, Math.min(10, v)) / 10) * PH;
  const cx = (i: number) => i * bw + bw / 2;
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${sy(r.diem).toFixed(1)}`).join(' ');
  const ci = rows.findIndex((r) => r.cur);
  return (
    <div style={{ display: 'flex', position: 'relative', width: W, height: BAND_H }}>
      <svg width={W} height={BAND_H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <g transform={`translate(${PX},${PY})`}>
          {ci >= 0 ? <rect x={ci * bw} y={-30} width={bw} height={PH + 30} fill={C.curVan} /> : null}
          {[0, 2, 4, 6, 8, 10].map((v) => (
            <line key={v} x1={0} y1={sy(v)} x2={PW} y2={sy(v)} stroke={C.grid} strokeWidth={1} />
          ))}
          {rows.map((r, i) => (
            <rect
              key={`b${i}`}
              x={cx(i) - cw / 2}
              y={sy(r.hi)}
              width={cw}
              height={Math.max(2, sy(r.lo) - sy(r.hi))}
              rx={4}
              fill="rgba(168,132,58,0.32)"
            />
          ))}
          {rows.map((r, i) => (
            <line key={`t${i}`} x1={cx(i) - cw / 2} x2={cx(i) + cw / 2} y1={sy(r.hi)} y2={sy(r.hi)} stroke={C.gold} strokeWidth={3} />
          ))}
          {rows.map((r, i) => (
            <line key={`d${i}`} x1={cx(i) - cw / 2} x2={cx(i) + cw / 2} y1={sy(r.lo)} y2={sy(r.lo)} stroke={C.gold} strokeWidth={3} />
          ))}
          <path d={line} fill="none" stroke={C.mute} strokeWidth={2.5} strokeOpacity={0.8} />
          {rows.map((r, i) => (
            <circle key={`c${i}`} cx={cx(i)} cy={sy(r.diem)} r={r.cur ? 11 : 8} fill={C.ink} stroke="#FFFFFF" strokeWidth={3} />
          ))}
        </g>
      </svg>
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <div key={v} style={{ display: 'flex', position: 'absolute', left: 34, top: PY + sy(v) - 12, fontSize: 18, color: C.mute }}>
          {v}
        </div>
      ))}
      {rows.map((r, i) => (
        <div
          key={`p${i}`}
          style={{
            display: 'flex',
            position: 'absolute',
            left: PX + cx(i) - 40,
            top: PY + sy(r.hi) - 30,
            width: 80,
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: C.gold,
          }}
        >
          {pct(r.pct)}
        </div>
      ))}
      {rows.map((r, i) => (
        <div
          key={`x${i}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'absolute',
            left: PX + cx(i) - bw / 2,
            top: PY + PH + 10,
            width: bw,
            fontSize: n > 10 ? 16 : 18,
            color: r.cur ? C.red : C.ink,
            fontWeight: r.cur ? 700 : 400,
          }}
        >
          <div style={{ display: 'flex' }}>{r.l1}</div>
          <div style={{ display: 'flex', fontSize: n > 10 ? 13 : 14, color: C.mute }}>{r.l2}</div>
          {r.l3 ? <div style={{ display: 'flex', fontSize: n > 10 ? 13 : 14, color: C.mute }}>{r.l3}</div> : null}
        </div>
      ))}
      {ci >= 0 && curLabel ? (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: PX + ci * bw,
            width: bw,
            justifyContent: 'center',
            top: PY - 28,
            fontSize: 15,
            fontWeight: 700,
            color: C.red,
          }}
        >
          {curLabel}
        </div>
      ) : null}
    </div>
  );
}

/** Dòng điểm nhấn dưới biểu đồ: nhãn trái · nội dung phải. */
export function Highlights({ items }: { items: [string, string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 40px 0', flexGrow: 1 }}>
      {items.map(([k, v, col]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', fontSize: 24, marginTop: 12 }}>
          <div style={{ display: 'flex', width: 260, flexShrink: 0, color: C.mute, fontSize: 21 }}>{k}</div>
          <div style={{ display: 'flex', fontWeight: 700, color: col, flexShrink: 1 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
