// lib/nghiem-chung/engine-ref.ts
// ============================================================
// "Bản kê" lời của engine cho một lá số, mỗi câu một MÃ ỔN ĐỊNH.
//
// Vì sao: hồ sơ sinh hàng loạt KHÔNG được tự viết lời lá số. Mỗi dòng đối
// chiếu chỉ được trỏ `laSoRef: ['C.Mệnh.y2', 'DV3.l0', …]`; bộ kiểm tra từ
// chối mã không tồn tại, và trang in kèm NGUYÊN VĂN câu engine dưới lời diễn
// giải. Cùng một hàm dùng ở cả ba chỗ (gói dữ liệu cho agent, bộ kiểm tra,
// route) ⇒ mã không thể lệch giữa lúc viết và lúc đọc.
//
// Mã:
//   C.<cung>.diem · C.<cung>.cc<i> (cách cục) · C.<cung>.y<i> (ý nghĩa)
//   DV<n>.diem · DV<n>.l<i> (nhận định đại vận)
//   N<năm>.tt (Thái Tuế) · N<năm>.th (tiểu hạn) · N<năm>.hoa (lưu tứ hóa) · N<năm>.b<i> (tổ hợp sao)
// ============================================================
import { luanGiaiTool } from '@/lib/mcp/tools/luan-giai';
import { vanHanTool } from '@/lib/mcp/tools/van-han';

export interface Cau {
  id: string;
  text: string;
}

interface Sao {
  ten: string;
  sang?: string;
  hoa?: string;
}

export interface BanKeLaSo {
  canChi: string;
  cuc: string;
  napAm: string;
  menh: { diaChi: string; sao: string };
  than: string;
  cung: { ten: string; diaChi: string; diem: number | null; sao: string; cau: Cau[] }[];
  daiVan: {
    thuTu: number;
    cung: string;
    diaChi: string;
    tuoiTu: number;
    tuoiDen: number;
    namTu: number;
    namDen: number;
    diem: number | null;
    hang: 'tot' | 'vua' | 'xau' | 'na';
    cau: Cau[];
  }[];
}

export interface BanKeNam {
  nam: number;
  canChi: string;
  tuoiMu: number;
  cau: Cau[];
}

const NOI_BO: Parameters<typeof luanGiaiTool.run>[1] = {
  key: 'internal:nghiem-chung',
  tier: 'master',
  label: 'nghiem-chung',
  charts_allowed: -1,
  backtest_years: -1,
  future_years: -1,
  active: true,
};

export const saoTxt = (ss: Sao[] | undefined) =>
  ss && ss.length
    ? ss.map((s) => `${s.ten}${s.sang ? ` (${s.sang.toLowerCase()})` : ''}${s.hoa ? ` hóa ${s.hoa}` : ''}`).join(', ')
    : 'vô chính diệu';

const HANG: Record<string, 'tot' | 'vua' | 'xau'> = { '🟢': 'tot', '🟡': 'vua', '🔴': 'xau' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export async function banKeLaSo(ngay: string, gio: number | string, gioiTinh: 'nam' | 'nu'): Promise<BanKeLaSo | null> {
  const r = (await luanGiaiTool.run({ ngay_duong: ngay, gio_sinh: gio, gioi_tinh: gioiTinh }, NOI_BO)) as Any;
  if (!r || r.error) return null;
  const namSinh = Number(ngay.slice(0, 4));
  const tq = r.tong_quan;
  const than = (r.cung as Any[]).find((c) => c.is_than);
  return {
    canChi: tq.can_chi_nam,
    cuc: tq.cuc,
    napAm: String(tq.nap_am || '').split(' (')[0],
    menh: { diaChi: tq.menh.dia_chi, sao: saoTxt(tq.menh.chinh_tinh) },
    than: than ? `${than.dia_chi} (cư ${than.ten})` : '—',
    cung: (r.cung as Any[]).map((c) => {
      const base = `C.${c.ten}`;
      const cau: Cau[] = [
        { id: `${base}.diem`, text: `Cung ${c.ten} (${c.dia_chi}) — ${saoTxt(c.chinh_tinh)}; điểm ${c.diem ?? '—'}/10.` },
        ...(c.cach_cuc as Any[]).map((cc, i) => ({ id: `${base}.cc${i}`, text: `${cc.ten}: ${cc.mo_ta}` })),
        ...(c.y_nghia as string[]).map((y, i) => ({ id: `${base}.y${i}`, text: y })),
      ];
      return { ten: c.ten, diaChi: c.dia_chi, diem: c.diem, sao: saoTxt(c.chinh_tinh), cau };
    }),
    daiVan: (r.dai_van as Any[])
      .filter((d) => d.diem != null)
      .map((d) => {
        const base = `DV${d.thu_tu}`;
        return {
          thuTu: d.thu_tu,
          cung: d.cung,
          diaChi: d.dia_chi,
          tuoiTu: d.tuoi_tu,
          tuoiDen: d.tuoi_den,
          namTu: namSinh + d.tuoi_tu - 1,
          namDen: namSinh + d.tuoi_den - 1,
          diem: d.diem,
          hang: HANG[d.flag] || 'na',
          cau: [
            { id: `${base}.diem`, text: `Đại vận ${d.cung} (${d.dia_chi}), ${d.tuoi_tu}–${d.tuoi_den} tuổi: điểm ${d.diem}/10.` },
            ...(d.luan as Any[]).map((l, i) => ({ id: `${base}.l${i}`, text: String(l.y) })),
          ],
        };
      }),
  };
}

export async function banKeNam(
  ngay: string,
  gio: number | string,
  gioiTinh: 'nam' | 'nu',
  nam: number,
): Promise<BanKeNam | null> {
  const v = (await vanHanTool.run({ ngay_duong: ngay, gio_sinh: gio, gioi_tinh: gioiTinh, nam_xem: nam }, NOI_BO)) as Any;
  if (!v || v.error) return null;
  const base = `N${nam}`;
  const cau: Cau[] = [
    { id: `${base}.tt`, text: `Năm ${v.can_chi_nam_xem}: lưu Thái Tuế ở cung ${v.luu_thai_tue?.cung ?? '—'}.` },
    { id: `${base}.th`, text: `Tiểu hạn ở cung ${v.tieu_han?.cung ?? '—'}; lưu đại vận ở cung ${v.luu_dai_van?.cung ?? '—'}.` },
    {
      id: `${base}.hoa`,
      text: `Lưu tứ hóa: ${(v.luu_tu_hoa as Any[]).map((t) => `Hóa ${t.hoa} (${t.sao}) → ${t.cung}`).join('; ')}.`,
    },
    ...((v.blocks as Any[]) || []).map((b, i) => ({
      id: `${base}.b${i}`,
      text: `${b.ten} [${(b.tang || []).join(', ')}${b.dong_cung ? ` · ${b.dong_cung}` : ''}]: ${b.tom_tat}`,
    })),
  ];
  return { nam, canChi: v.can_chi_nam_xem, tuoiMu: v.tuoi_mu, cau };
}

/** Bảng tra mã → câu, gộp lá số + các năm. */
export function bangTra(ls: BanKeLaSo, nams: (BanKeNam | null)[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of ls.cung) for (const x of c.cau) m.set(x.id, x.text);
  for (const d of ls.daiVan) for (const x of d.cau) m.set(x.id, x.text);
  for (const n of nams) if (n) for (const x of n.cau) m.set(x.id, x.text);
  return m;
}
