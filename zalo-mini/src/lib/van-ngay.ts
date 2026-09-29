// Vận hôm nay — /api/van-ngay (miễn phí, không cần đăng nhập). Có lá số thì
// POST kèm birth để thêm tầng cá nhân (cung nhật hạn). Kiểu: lib/engine/van-ngay.ts.
import { API_BASE } from '../config';
import type { BirthParams } from './birth';

export interface VanNgay {
  ngay: { duong: string; am: string; thu: string; canChi: string };
  danhGia: { tinhChat: 'tốt' | 'xấu' | 'bình'; nhan: string };
  saoNgay: { ten: string; yNghia: string; hoangDao: boolean };
  ngayKy: string[];
  xung: { chi: string; namSinh: number[] };
  gioTot: { chi: string; range: string }[];
  nen: { ten: string; vi: string }[];
  kieng: { ten: string; vi: string }[];
  mau: { hanh: string; list: string[] };
  huong: { hyThan: string; taiThan: string };
  caNhan?: {
    cungNhatHan: string;
    chinhTinh: string[];
    linhVuc: string | null;
    bixung: boolean;
    cachCuc: { ten: string; tomTat: string } | null;
  };
}

export async function fetchVanNgay(birth: BirthParams | null): Promise<VanNgay> {
  const res = birth
    ? await fetch(`${API_BASE}/api/van-ngay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birth, tuan: false }),
      })
    : await fetch(`${API_BASE}/api/van-ngay?tuan=0`);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.ok) throw new Error(d.error || 'Chưa lấy được vận hôm nay');
  return d as VanNgay;
}
