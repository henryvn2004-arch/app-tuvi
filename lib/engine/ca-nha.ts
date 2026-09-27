// lib/engine/ca-nha.ts
// ============================================================
// "Cả nhà mình" (docs/DAC-TRUNG-PLAN.md) — xếp lá số của nhiều người trong nhà
// cạnh nhau theo 12 tháng âm tới. NGUỒN DUY NHẤT cho cả tool rail `tra_ca_nha`
// (lib/tools/registry.ts, ra chữ cho model) lẫn trang `/app/ca-nha`
// (app/api/ca-nha, ra JSON) — hai nơi tự tính là trôi khỏi nhau.
//
// Chỉ dữ kiện engine (cung nguyệt hạn + sao trong chùm tam phương tứ chính,
// `buildKhung12Thang`), 0 lượt LLM. KHÔNG chấm tháng tốt/xấu: đếm sát/bại để
// "chấm tháng xấu" thì gần như tháng nào cũng trúng (chùm hiếm khi sạch sao
// xấu), và đó là một công thức tự đặt.
// ============================================================

import { computeLaso } from '@/lib/engine/laso';
import { buildKhung12Thang, type ThangKhung } from '@/lib/engine/van-han-12';
import type { BirthParams } from '@/lib/contract/v1';

export interface NguoiNhaVao {
  ten: string;
  birth: BirthParams;
  vaiTro?: string | null;
}

export interface NguoiKhung {
  ten: string;
  vaiTro: string | null;
  birth: BirthParams;
  /** Lý do không lập được lá số (thường là thiếu giờ sinh) — null nếu ổn. */
  loi: string | null;
  cungTieuHan: string;
  cungLuuNien: string;
  thangs: ThangKhung[];
}

export interface ThangTrung {
  /** Chỉ số tháng trong khung, 0..11. */
  i: number;
  nhan: string;
  cung: string;
  ai: string[];
}

export interface CaNhaKhung {
  thangs: { nhan: string; nhanDay: string; dangDienRa: boolean }[];
  nguoi: NguoiKhung[];
  /** Tháng mà HAI người trở lên cùng hạn vào MỘT cung. */
  trung: ThangTrung[];
}

export function vnToday(): { d: number; m: number; y: number } {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { d: g('day'), m: g('month'), y: g('year') };
}

export function khungCaNha(people: NguoiNhaVao[], today = vnToday()): CaNhaKhung {
  const nguoi: NguoiKhung[] = people.map((p) => {
    const base = { ten: p.ten, vaiTro: p.vaiTro ?? null, birth: p.birth };
    const res = computeLaso(p.birth, today.y);
    if (!res.ok || !res.ls) {
      const loi = String(res.error || 'không lập được lá số').replace(/\.$/, '');
      return { ...base, loi, cungTieuHan: '', cungLuuNien: '', thangs: [] };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = buildKhung12Thang(res.ls as any, today.d, today.m, today.y);
    const t0 = k.thangs[0];
    return { ...base, loi: null, cungTieuHan: t0?.cungTieuHan || '?', cungLuuNien: t0?.cungLuuNien || '?', thangs: k.thangs };
  });

  const co = nguoi.filter((n) => !n.loi);
  const mau = co[0]?.thangs || [];
  const thangs = mau.map((t) => ({ nhan: t.nhan, nhanDay: t.nhanDay, dangDienRa: t.dangDienRa }));
  const trung: ThangTrung[] = [];
  mau.forEach((t, i) => {
    const theoCung = new Map<string, string[]>();
    for (const n of co) {
      const x = n.thangs[i];
      if (!x || x.loi) continue;
      theoCung.set(x.cungNguyetHan, [...(theoCung.get(x.cungNguyetHan) || []), n.ten]);
    }
    for (const [cung, ai] of theoCung) if (ai.length >= 2) trung.push({ i, nhan: t.nhan, cung, ai });
  });
  return { thangs, nguoi, trung };
}
