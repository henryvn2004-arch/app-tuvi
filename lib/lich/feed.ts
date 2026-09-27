// lib/lich/feed.ts
// ============================================================
// LỊCH RIÊNG (docs/DAC-TRUNG-PLAN.md) — feed lịch `.ics` cho điện thoại/Google
// Lịch: ngày tốt và ngày nên tránh của RIÊNG một lá số, 60 ngày tới. Đăng ký
// một lần, ứng dụng lịch tự kéo lại mỗi ngày.
//
// Nguồn số: `computeTuan()` (lib/engine/van-ngay.ts) — CÙNG hàm tô dải tuần ở
// thẻ vận ngày, gồm tính chất ngày (hoàng đạo/trực/tú, trừ ngày kỵ) và cờ
// `bixung` (ngày xung CHÍNH tuổi người này). Không có công thức mới nào ở đây.
//
// Link feed KHÔNG đăng nhập được (ứng dụng lịch không gửi header) ⇒ khoá bằng
// chữ ký HMAC trên (chartId, userId). Khoá ký = SUPABASE_SERVICE_KEY — bí mật
// chỉ có ở server, luôn có mặt, khỏi thêm biến môi trường. Đổi khoá đó thì mọi
// link lịch cũ chết — chấp nhận được (người ta đăng ký lại một cú bấm).
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto';
import { computeTuan } from '@/lib/engine/van-ngay';

export const SO_NGAY = 60;

function khoa(): string {
  return process.env.SUPABASE_SERVICE_KEY || '';
}

function chuKy(chartId: number, userId: string): string {
  return createHmac('sha256', khoa()).update(`lich:${chartId}:${userId}`).digest('base64url').slice(0, 32);
}

/** Token feed: "<chartId>.<chữ ký>". */
export function taoToken(chartId: number, userId: string): string {
  return `${chartId}.${chuKy(chartId, userId)}`;
}

/** Tách token → chartId (chưa kiểm chữ ký — phải đọc user_id của mục sổ trước). */
export function chartIdCuaToken(token: string): number | null {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{32})$/.exec(String(token || ''));
  return m ? Number(m[1]) : null;
}

export function kiemToken(token: string, userId: string): boolean {
  const id = chartIdCuaToken(token);
  if (id == null || !khoa()) return false;
  const a = Buffer.from(taoToken(id, userId));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── ICS ──────────────────────────────────────────────────────
/** Gập dòng theo RFC 5545: ≤75 OCTET mỗi dòng (tiếng Việt nhiều byte/ký tự). */
function gap(line: string): string {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length ? 74 : 75; // dòng nối bắt đầu bằng một dấu cách
    if (Buffer.byteLength(cur + ch) > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function thoat(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function ymd(y: number, m: number, d: number): string {
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

/**
 * Dựng lịch cho MỘT lá số. `chiNamSinh` = chi năm sinh (âm lịch) của người đó,
 * để `computeTuan` đánh dấu ngày xung tuổi.
 * Chỉ đưa lên lịch ngày TỐT (không xung tuổi) + ngày XUNG CHÍNH TUỔI người này.
 * CỐ Ý không đưa "ngày xấu" chung: đo 60 ngày thì 19 ngày bị gắn "nên tránh",
 * gần như 3 ngày một lần — lịch thành bức tường cảnh báo, và phần lớn là ngày
 * xấu GIỐNG NHAU với mọi người, không phải "lịch riêng".
 */
export function dungLich(opts: {
  chartId: number;
  ten: string;
  chiNamSinh: string;
  tu: { d: number; m: number; y: number };
}): string {
  const { chartId, ten, chiNamSinh, tu } = opts;
  const ngay = computeTuan(tu.d, tu.m, tu.y, SO_NGAY, chiNamSinh);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const L: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tuviminhbao.com//Lich rieng//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${thoat('Lịch riêng · ' + ten)}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ];
  for (const n of ngay) {
    const tot = n.tinhChat === 'tốt' && !n.bixung;
    const tranh = !!n.bixung;
    if (!tot && !tranh) continue;
    const lyDo = tranh ? `ngày ${n.canChi} xung tuổi ${ten}` : `ngày ${n.canChi} là ngày tốt`;
    const tomTat = tot ? `✦ Ngày tốt · ${n.canChi}` : `Xung tuổi · tránh việc lớn · ${n.canChi}`;
    const sau = new Date(Date.UTC(n.y, n.m - 1, n.d + 1));
    L.push(
      'BEGIN:VEVENT',
      `UID:${n.iso}-${chartId}@tuviminhbao.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(n.y, n.m, n.d)}`,
      `DTEND;VALUE=DATE:${ymd(sau.getUTCFullYear(), sau.getUTCMonth() + 1, sau.getUTCDate())}`,
      `SUMMARY:${thoat(tomTat)}`,
      `DESCRIPTION:${thoat(`Theo lá số của ${ten}: ${lyDo}.\nXem chi tiết giờ tốt, việc nên làm: https://tuviminhbao.com/app`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  L.push('END:VCALENDAR');
  return L.map(gap).join('\r\n') + '\r\n';
}
