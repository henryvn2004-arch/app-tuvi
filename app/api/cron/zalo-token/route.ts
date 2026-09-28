// app/api/cron/zalo-token/route.ts
// Làm mới cặp token Zalo OA mỗi ngày (bảng `zalo_oa_tokens`).
//
// VÌ SAO CẦN CRON dù adapter đã tự làm mới khi token hết hạn: refresh token
// Zalo cũng có hạn (~3 tháng) và chỉ được gia hạn KHI dùng. OA vắng khách
// đủ lâu thì lượt tự-làm-mới đầu tiên sẽ gặp refresh token đã chết ⇒ bot câm,
// phải cấp lại tay. Làm mới hằng ngày giữ cả hai token luôn tươi.
//
// Kênh chưa cấu hình (thiếu env) → `skipped`, không ghi lỗi: chưa bật kênh
// thì không có gì để hỏng. Đã cấu hình mà làm mới thất bại → NÉM để
// withCronLog ghi status=error và panel vận hành thấy.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { refreshZaloToken, zaloConfigured } from '@/lib/channels/zalo';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('zalo-token', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!zaloConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'zalo chưa cấu hình' });
  }
  const token = await refreshZaloToken();
  if (!token) throw new Error('Làm mới token Zalo OA thất bại — xem log [zalo]');
  return NextResponse.json({ ok: true });
}
