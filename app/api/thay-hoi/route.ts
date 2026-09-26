// app/api/thay-hoi/route.ts
// Trang chủ chat (`public/index-sample-v3.html`): khách gõ câu hỏi đầu tiên →
// trả về thầy phụ trách (`thayChoCauHoi`, lib/agent/thay-theo-chu-de.ts), rồi
// trang chủ mở `/app?q=…&thay=…#chat` để rail của thầy đó trả lời. Không gọi
// model, không đụng DB, không tốn Lượng — chỉ đọc chủ đề của câu hỏi.
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { thayChoCauHoi } from '@/lib/agent/thay-theo-chu-de';

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 500);
  return NextResponse.json(thayChoCauHoi(q), { headers: { 'Cache-Control': 'no-store' } });
}
