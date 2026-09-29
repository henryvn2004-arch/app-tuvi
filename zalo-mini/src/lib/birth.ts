// Lá số trong Sổ (`user_charts.birth`) mang shape TuviForm của web
// ({hoten,ngay,thang,nam,gioIdx|gioHour,gioitinh}); API chat/vận ngày nhận
// shape contract ({name,day,month,year,hourBranch,gender}). Đổi giữa hai shape
// y như `birthToApi` trong public/shell.js — đừng tự chế cách khác.

export interface ChartBirth {
  hoten?: string;
  ngay?: number | string;
  thang?: number | string;
  nam?: number | string;
  gioIdx?: number | string;
  gioHour?: number | string;
  gioitinh?: string;
}

export interface Chart {
  id: number;
  label: string;
  birth: ChartBirth;
  relation: string | null;
}

/** lib/contract/v1.ts BirthParams */
export interface BirthParams {
  day: number;
  month: number;
  year: number;
  hourBranch: number;
  gender: 'nam' | 'nu';
  name?: string;
}

export const GIO = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
].map((chi, i) => {
  const from = (i * 2 + 23) % 24;
  return { idx: i, label: `${chi} (${from}h–${(from + 2) % 24}h)` };
});

export function toBirthParams(b: ChartBirth | null | undefined): BirthParams | null {
  if (!b || !Number(b.ngay) || !Number(b.thang) || !Number(b.nam)) return null;
  let idx: number | null = b.gioIdx != null && b.gioIdx !== '' ? Number(b.gioIdx) : null;
  if (idx == null && b.gioHour != null && b.gioHour !== '')
    idx = Math.floor(((Number(b.gioHour) + 1) % 24) / 2);
  return {
    day: Number(b.ngay),
    month: Number(b.thang),
    year: Number(b.nam),
    hourBranch: idx == null || Number.isNaN(idx) ? -1 : idx,
    gender: b.gioitinh === 'nu' ? 'nu' : 'nam',
    name: b.hoten || undefined,
  };
}

export function describeBirth(b: ChartBirth): string {
  const p = toBirthParams(b);
  if (!p) return '';
  const gio = p.hourBranch >= 0 ? `giờ ${GIO[p.hourBranch]!.label.split(' ')[0]}` : 'không rõ giờ';
  return `${p.day}/${p.month}/${p.year} · ${gio} · ${p.gender === 'nu' ? 'Nữ' : 'Nam'}`;
}
