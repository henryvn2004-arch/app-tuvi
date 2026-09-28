// lib/og/laso-image.ts
// Link ẢNH theo lá số cho kênh chat — "URL là file" như /api/og/social: không lưu
// ở đâu, CDN nhớ theo URL. Mỗi loại ảnh là một route `/api/og/<kind>`:
//   la-so-anh    — lưới 12 cung (gửi ngay khi thầy lập lá số)
//   duong-doi    — đường đời qua 9 đại vận
//   radar-cung   — vành điểm 12 cung
//   van-12-thang — 12 tháng âm tới (cần mốc "hôm nay" `td`)
//
// Link KÝ HMAC: tham số chứa ngày sinh, và route chạy engine an sao — không ký
// thì ai cũng dùng endpoint của mình làm máy vẽ lá số miễn phí (tốn CPU hàm).
// Chữ ký phủ cả LOẠI ảnh: link của loại này không mở được loại khác.
// Khoá: MEDIA_SIGN_SECRET, chưa đặt thì dùng SUPABASE_SERVICE_KEY (cả hai chỉ
// có ở server). Không có khoá nào ⇒ không tạo link / route từ chối (fail-closed).

import { createHmac, timingSafeEqual } from 'crypto';
import type { BirthParams } from '@/lib/contract/v1';

export type ChartKind = 'la-so-anh' | 'duong-doi' | 'radar-cung' | 'van-12-thang';

const BASE = 'https://www.tuviminhbao.com/api/og/';
const KEYS = ['d', 'm', 'y', 'h', 'g', 'l', 'nx', 'n', 'td'] as const;

function secret(): string {
  return process.env.MEDIA_SIGN_SECRET || process.env.SUPABASE_SERVICE_KEY || '';
}

/** Chuỗi ký: loại ảnh + các khoá theo thứ tự cố định (thứ tự trên URL không ảnh hưởng). */
function canonical(kind: ChartKind, q: URLSearchParams): string {
  return kind + '|' + KEYS.map((k) => `${k}=${q.get(k) ?? ''}`).join('&');
}

function sign(kind: ChartKind, q: URLSearchParams): string {
  return createHmac('sha256', secret()).update(canonical(kind, q)).digest('hex').slice(0, 24);
}

/**
 * Link ảnh đã ký. `homNay` (d/m/y dương) chỉ cho `van-12-thang` — khung 12
 * tháng tính từ tháng âm chứa ngày đó, nên phải nằm trong URL để ảnh cố định.
 * null khi thiếu dữ liệu sinh hoặc thiếu khoá ký.
 */
export function chartImageUrl(
  kind: ChartKind,
  b: BirthParams | null | undefined,
  namXem: number,
  homNay?: { d: number; m: number; y: number },
): string | null {
  if (!secret() || !b || !b.day || !b.month || !b.year) return null;
  if (b.hourBranch == null || b.hourBranch < 0 || b.hourBranch > 11) return null;
  if (b.gender !== 'nam' && b.gender !== 'nu') return null;
  const q = new URLSearchParams({
    d: String(b.day),
    m: String(b.month),
    y: String(b.year),
    h: String(b.hourBranch),
    g: b.gender,
    l: b.isLunar ? '1' : '0',
    nx: String(namXem),
    n: String(b.name || '')
      .trim()
      .slice(0, 40),
    td: homNay ? `${homNay.d}-${homNay.m}-${homNay.y}` : '',
  });
  q.set('s', sign(kind, q));
  return `${BASE}${kind}?${q.toString()}`;
}

/** Link ảnh lưới lá số 12 cung. */
export const lasoImageUrl = (b: BirthParams | null | undefined, namXem: number) => chartImageUrl('la-so-anh', b, namXem);

/** Kiểm chữ ký; đúng → tham số sinh + năm xem (+ "hôm nay" nếu có), sai → null. */
export function readChartParams(
  kind: ChartKind,
  q: URLSearchParams,
): { birth: BirthParams; namXem: number; homNay: { d: number; m: number; y: number } | null } | null {
  const s = q.get('s') || '';
  if (!secret() || !/^[0-9a-f]{24}$/.test(s)) return null;
  if (!timingSafeEqual(Buffer.from(s), Buffer.from(sign(kind, q)))) return null;
  const num = (k: string) => Number(q.get(k));
  const g = q.get('g');
  if (g !== 'nam' && g !== 'nu') return null;
  const birth: BirthParams = {
    day: num('d'),
    month: num('m'),
    year: num('y'),
    hourBranch: num('h'),
    gender: g,
    isLunar: q.get('l') === '1',
    ...(q.get('n') ? { name: q.get('n') as string } : {}),
  };
  const td = (q.get('td') || '').split('-').map(Number);
  const homNay = td.length === 3 && td.every((x) => x > 0) ? { d: td[0], m: td[1], y: td[2] } : null;
  return { birth, namXem: num('nx'), homNay };
}

/** Kiểm chữ ký link ảnh lưới lá số (giữ tên cũ cho route la-so-anh). */
export function readLasoImageParams(q: URLSearchParams): { birth: BirthParams; namXem: number } | null {
  const r = readChartParams('la-so-anh', q);
  return r ? { birth: r.birth, namXem: r.namXem } : null;
}
