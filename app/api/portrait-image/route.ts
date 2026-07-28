// app/api/portrait-image/route.ts
// Proxy CÙNG-ORIGIN cho ảnh chân dung nằm trong Supabase Storage.
//
// Vì sao cần: poster 9:16 (public/poster.js) vẽ ảnh lên <canvas> rồi gọi
// toBlob(). Nếu ảnh nạp thẳng từ supabase.co mà thiếu header CORS thì canvas bị
// "tainted" và toBlob() ném SecurityError — mất trắng nút Tải Ảnh. Đi qua đây
// thì ảnh là cùng origin, không bao giờ tainted. poster.js vẫn thử đường thẳng
// TRƯỚC (nhanh hơn, đỡ tải cho server), đây chỉ là lối thoát.
//
// ALLOWLIST CỨNG theo đúng bucket 'portraits' của CHÍNH project mình. Nhận URL
// tự do thì endpoint này thành công cụ SSRF: ai cũng bắt server mình gọi vào
// địa chỉ nội bộ rồi đọc kết quả.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const ALLOWED_PREFIX = '/storage/v1/object/public/portraits/';

function deny(status: number, msg: string) {
  return new NextResponse(msg, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL) return deny(500, 'storage not configured');

  const raw = req.nextUrl.searchParams.get('u') || '';
  let target: URL, base: URL;
  try {
    target = new URL(raw);
    base = new URL(SUPABASE_URL);
  } catch {
    return deny(400, 'bad url');
  }
  if (target.origin !== base.origin) return deny(403, 'forbidden host');
  if (!target.pathname.startsWith(ALLOWED_PREFIX)) return deny(403, 'forbidden path');

  // Dựng lại URL từ origin + pathname: bỏ mọi query/hash người gọi gắn thêm
  // (trang có gắn ?retry=... khi ảnh chưa kịp lên) để không nhân bản cache.
  const clean = target.origin + target.pathname;

  let up: Response;
  try {
    up = await fetch(clean, { cache: 'no-store' });
  } catch {
    return deny(502, 'upstream error');
  }
  if (!up.ok) return deny(up.status === 404 ? 404 : 502, 'upstream ' + up.status);

  const ct = up.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) return deny(415, 'not an image');

  const buf = await up.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': ct,
      'Content-Length': String(buf.byteLength),
      // Đường dẫn trong bucket là duy nhất theo từng lượt vẽ nên nội dung không
      // bao giờ đổi — cache dài để lần tải thứ hai không phải chạm Supabase.
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
