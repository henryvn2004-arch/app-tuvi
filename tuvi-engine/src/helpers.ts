// ============================================================
// HELPERS — utility functions
// ============================================================
import { DIA_CHI, THIEN_CAN, NAP_AM } from './constants.js';
import type { DiaChi, ThienCan, NguHanh, AmDuong, Gioitinh } from './types.js';

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function dcIdx(dc: string): number {
  const i = DIA_CHI.indexOf(dc as DiaChi);
  if (i === -1) throw new Error(`Unknown địa chi: "${dc}"`);
  return i;
}

export function canIdx(can: string): number {
  const i = THIEN_CAN.indexOf(can as ThienCan);
  if (i === -1) throw new Error(`Unknown thiên can: "${can}"`);
  return i;
}

export function isAmDuong(diaChi: DiaChi): 'âm' | 'dương' {
  const amDC: DiaChi[] = ['Sửu','Mão','Tỵ','Mùi','Dậu','Hợi'];
  return amDC.includes(diaChi) ? 'âm' : 'dương';
}

export function isThuanChieu(amDuong: AmDuong, gioitinh: Gioitinh): boolean {
  return (amDuong === 'dương' && gioitinh === 'nam') ||
         (amDuong === 'âm'    && gioitinh === 'nu');
}

export function getNapAm(canChi: string): NguHanh | null {
  if (!canChi) return null;
  const key = canChi.trim();
  if (NAP_AM[key]) return NAP_AM[key];
  for (const [cc, hanh] of Object.entries(NAP_AM)) {
    if (key.includes(cc) || cc.includes(key)) return hanh;
  }
  return null;
}
