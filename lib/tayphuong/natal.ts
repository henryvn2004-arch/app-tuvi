/**
 * lib/tayphuong/natal.ts — bản đồ sao lúc sinh (natal chart) theo chiêm tinh Tây.
 *
 * Engine: `celestine` (MIT, 0 phụ thuộc con) — thư viện tính vị trí thiên thể
 * đối chứng NASA/JPL Horizons và Swiss Ephemeris. Vốn là phụ thuộc gián tiếp
 * của `mingyu-core`, nay KHAI RÕ trong package.json vì ta dùng thẳng.
 *
 * VÌ SAO CHẠY Ở SERVER: cần ephemeris thật cho 15 thiên thể + hệ nhà Placidus
 * phụ thuộc vĩ độ. Chép sang vanilla JS thì bản đồ VẪN ra, chỉ là ra sai.
 *
 * ⚠️ ĐÂY KHÔNG PHẢI TỬ VI. Cùng dùng chữ "cung" và "nhà" nhưng chỉ những thứ
 * khác hẳn; trang và prompt đều phải nói thẳng để người đọc không đem đối chiếu
 * với lá số Tử Vi của chính họ.
 *
 * Vứt phần thô của celestine (47 KB → ~7 KB): bỏ `input`/`options`/`calculated`,
 * bỏ `lots`, và mỗi khía cạnh chỉ giữ trường dùng để vẽ và để luận.
 */
import { calculateChart } from 'celestine';
import {
  docCung, docHanhTinh, docGoc, NHA, DIEM, HANH_VI, THE_VI, PHAM_VI, HINH_THE,
} from './terms';

export interface DiemSao {
  ten: string;
  kyHieu: string;
  nghia: string;
  chinh: boolean;
  cung: string;
  cungKyHieu: string;
  do: number;
  phut: number;
  kinhDo: number;
  nha: number | null;
  nghich: boolean;
  pham: string;
}

export interface BanDoSao {
  noiSinh: { vido: number; kinhdo: number; muiGio: number };
  sinh: string;
  heNha: string;
  sao: DiemSao[];
  giaoDiem: DiemSao[];
  truc: { ten: string; nghia: string; cung: string; do: number; phut: number; kinhDo: number }[];
  nha: { so: number; ten: string; nghia: string; cung: string; do: number; kinhDo: number }[];
  gocChieu: {
    a: string; b: string; loai: string; kyHieu: string;
    muc: 'hoa' | 'cang' | 'trung'; nghia: string; lech: number; manh: number;
  }[];
  hinhThe: { ten: string; nghia: string; sao: string[] }[];
  canBang: {
    hanh: { ten: string; so: number }[];
    the: { ten: string; so: number }[];
    banCau: { ten: string; so: number }[];
    nghich: string[];
  };
}

export interface DauVaoNatal {
  ngay: number; thang: number; nam: number;
  gio: number; phut: number;
  vido: number; kinhdo: number; muiGio: number;
}

/** Chỉ giữ khía cạnh chính + phụ đáng kể; bỏ những góc mờ dưới ngưỡng. */
const MANH_TOI_THIEU = 20;

function mapDiem(p: Record<string, any>): DiemSao {
  const h = docHanhTinh(p.name);
  const c = docCung(p.sign);
  return {
    ten: h.ten, kyHieu: h.kyHieu || p.symbol || '', nghia: h.nghia, chinh: h.chinh,
    cung: c.ten, cungKyHieu: c.kyHieu,
    do: p.degree ?? 0, phut: p.minute ?? 0, kinhDo: p.longitude ?? 0,
    nha: p.house ?? null,
    nghich: !!p.isRetrograde,
    pham: PHAM_VI[p.dignity?.state] || '',
  };
}

export function lapBanDo(v: DauVaoNatal): BanDoSao {
  const ch = calculateChart({
    year: v.nam, month: v.thang, day: v.ngay,
    hour: v.gio, minute: v.phut,
    latitude: v.vido, longitude: v.kinhdo, timezone: v.muiGio,
  }) as Record<string, any>;

  const truc = ['ascendant', 'midheaven', 'descendant', 'imumCoeli']
    .map((k) => ch.angles?.[k])
    .filter(Boolean)
    .map((a: Record<string, any>) => {
      const d = DIEM[a.name] || { ten: a.name, nghia: '' };
      const c = docCung(a.sign);
      return { ten: d.ten, nghia: d.nghia, cung: c.ten, do: a.degree, phut: a.minute, kinhDo: a.longitude };
    });

  const goc = ((ch.aspects?.all || []) as Record<string, any>[])
    .filter((a) => (a.strength ?? 0) >= MANH_TOI_THIEU)
    .map((a) => {
      const g = docGoc(a.type);
      return {
        a: docHanhTinh(a.body1).ten || a.body1,
        b: docHanhTinh(a.body2).ten || a.body2,
        loai: g.ten, kyHieu: g.kyHieu, muc: g.muc, nghia: g.nghia,
        lech: Math.round((a.deviation ?? 0) * 10) / 10,
        manh: a.strength ?? 0,
      };
    })
    .sort((x, y) => y.manh - x.manh);

  const dem = (o: Record<string, string[]> | undefined, nhan: Record<string, string>) =>
    Object.entries(o || {}).map(([k, arr]) => ({ ten: nhan[k] || k, so: (arr || []).length }));

  return {
    noiSinh: { vido: v.vido, kinhdo: v.kinhdo, muiGio: v.muiGio },
    sinh: `${v.ngay}/${v.thang}/${v.nam} ${String(v.gio).padStart(2, '0')}:${String(v.phut).padStart(2, '0')}`,
    heNha: ch.houses?.systemName || 'Placidus',
    sao: ((ch.planets || []) as Record<string, any>[]).map(mapDiem),
    giaoDiem: ((ch.nodes || []) as Record<string, any>[]).map((n) => {
      const d = DIEM[n.name] || { ten: n.name, nghia: '' };
      const c = docCung(n.sign);
      return {
        ten: d.ten, kyHieu: '☊', nghia: d.nghia, chinh: false,
        cung: c.ten, cungKyHieu: c.kyHieu,
        do: n.degree ?? 0, phut: n.minute ?? 0, kinhDo: n.longitude ?? 0,
        nha: n.house ?? null, nghich: false, pham: '',
      };
    }),
    truc,
    nha: ((ch.houses?.cusps || []) as Record<string, any>[]).map((h) => {
      const meta = NHA[h.house - 1]!;
      const c = docCung(h.sign);
      return { so: h.house, ten: meta.ten, nghia: meta.nghia, cung: c.ten, do: h.degree, kinhDo: h.longitude };
    }),
    gocChieu: goc,
    // Cùng một hình thế có thể được liệt kê nhiều lần với bộ sao khác nhau —
    // gộp theo TÊN + bộ sao để không bày bốn dòng "Chữ T" trông như lỗi.
    hinhThe: [
      ...new Map(
        ((ch.patterns || []) as Record<string, any>[]).map((p) => {
          const m = HINH_THE[p.type] || { ten: p.type, nghia: '' };
          const sao = (p.bodies || []).map((b: string) => docHanhTinh(b).ten || b);
          return [m.ten + '|' + sao.join(','), { ten: m.ten, nghia: m.nghia, sao }];
        })
      ).values(),
    ],
    canBang: {
      hanh: dem(ch.summary?.elements, HANH_VI),
      the: dem(ch.summary?.modalities, THE_VI),
      banCau: dem(ch.summary?.hemispheres as never, {
        north: 'Bắc (trên)', south: 'Nam (dưới)', east: 'Đông (trái)', west: 'Tây (phải)',
      }),
      nghich: ((ch.summary?.retrograde || []) as string[]).map((b) => docHanhTinh(b).ten || b),
    },
  };
}

/** Ngữ cảnh PHẲNG cho rail — `extractGenericContext` bỏ qua mọi object. */
export function railData(b: BanDoSao) {
  const chinh = b.sao.filter((s) => s.chinh);
  return {
    sinh: b.sinh,
    heNha: b.heNha,
    trucChinh: b.truc.map((t) => `${t.ten}: ${t.do}° ${t.cung} — ${t.nghia}`).join('\n'),
    saoChinh: chinh
      .map((s) => `${s.ten} ở ${s.do}°${s.phut}' ${s.cung}, nhà ${s.nha ?? '?'}${s.nghich ? ', NGHỊCH HÀNH' : ''}${s.pham ? ', ' + s.pham : ''} — ${s.nghia}`)
      .join('\n'),
    saoPhu: b.sao.filter((s) => !s.chinh).map((s) => `${s.ten} ${s.cung} nhà ${s.nha ?? '?'}`).join(', '),
    giaoDiem: b.giaoDiem.map((s) => `${s.ten}: ${s.cung} nhà ${s.nha ?? '?'} — ${s.nghia}`).join('\n'),
    gocChieuManh: b.gocChieu
      .slice(0, 12)
      .map((g) => `${g.a} ${g.loai} ${g.b} (lệch ${g.lech}°, độ mạnh ${g.manh}%) — ${g.nghia}`)
      .join('\n'),
    hinhThe: b.hinhThe.map((h) => `${h.ten} [${h.sao.join(', ')}] — ${h.nghia}`).join('\n') || 'không có hình thế nổi bật',
    canBangHanh: b.canBang.hanh.map((x) => `${x.ten} ${x.so}`).join(', '),
    canBangThe: b.canBang.the.map((x) => `${x.ten} ${x.so}`).join(', '),
    banCau: b.canBang.banCau.map((x) => `${x.ten} ${x.so}`).join(', '),
    saoNghichHanh: b.canBang.nghich.join(', ') || 'không có sao nghịch hành',
    dauNha: b.nha.map((h) => `${h.ten}: đầu nhà ở ${h.do}° ${h.cung}`).join('\n'),
  };
}
