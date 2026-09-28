// lib/og/laso-image.ts
// Link ẢNH LÁ SỐ 12 cung (`/api/og/la-so-anh`) — "URL là file" như /api/og/social:
// không lưu ở đâu, CDN nhớ theo URL. Kênh chat gửi link này ngay khi thầy lập lá số.
//
// Link KÝ HMAC: tham số chứa ngày sinh, và route chạy engine an sao — không ký
// thì ai cũng dùng endpoint của mình làm máy vẽ lá số miễn phí (tốn CPU hàm).
// Khoá: MEDIA_SIGN_SECRET, chưa đặt thì dùng SUPABASE_SERVICE_KEY (cả hai chỉ
// có ở server). Không có khoá nào ⇒ không tạo link / route từ chối (fail-closed).

import { createHmac, timingSafeEqual } from 'crypto';
import type { BirthParams } from '@/lib/contract/v1';

const IMG_BASE = 'https://www.tuviminhbao.com/api/og/la-so-anh';
const KEYS = ['d', 'm', 'y', 'h', 'g', 'l', 'nx', 'n'] as const;

function secret(): string {
  return process.env.MEDIA_SIGN_SECRET || process.env.SUPABASE_SERVICE_KEY || '';
}

/** Chuỗi ký: các khoá theo thứ tự cố định — thứ tự tham số trên URL không ảnh hưởng. */
function canonical(q: URLSearchParams): string {
  return KEYS.map((k) => `${k}=${q.get(k) ?? ''}`).join('&');
}

function sign(q: URLSearchParams): string {
  return createHmac('sha256', secret()).update(canonical(q)).digest('hex').slice(0, 24);
}

/** Link ảnh lá số đã ký. null khi thiếu dữ liệu sinh hoặc thiếu khoá ký. */
export function lasoImageUrl(b: BirthParams | null | undefined, namXem: number): string | null {
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
  });
  q.set('s', sign(q));
  return `${IMG_BASE}?${q.toString()}`;
}

/** Kiểm chữ ký; đúng → tham số sinh + năm xem, sai → null. */
export function readLasoImageParams(q: URLSearchParams): { birth: BirthParams; namXem: number } | null {
  const s = q.get('s') || '';
  if (!secret() || !/^[0-9a-f]{24}$/.test(s)) return null;
  const want = Buffer.from(sign(q));
  if (!timingSafeEqual(Buffer.from(s), want)) return null;
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
  return { birth, namXem: num('nx') };
}
