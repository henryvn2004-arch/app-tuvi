// app/api/thay-hoi/route.ts
// Trang chủ chat: khách gõ câu hỏi đầu tiên → trả về thầy phụ trách
// (`thayChoCauHoi`, lib/agent/thay-theo-chu-de.ts). Hai nơi gọi:
//   - trang chủ tĩnh `public/index-sample-v3.html` → mở `/app?q=…&thay=…#chat`;
//   - màn chat `/app` (shell.js `navigate()`, Minh Bảo dẫn đường) → hiện thẻ
//     mời thầy, cần thêm `nghia` (tên chủ đề để nói với khách) và `mon` (môn
//     chuyên của thầy, đọc từ `master_profiles.discipline` — nguồn duy nhất,
//     không chép vào client).
// Không gọi model, không tốn Lượng. Đọc `mon` hỏng thì bỏ trống, không chặn.
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { thayChoCauHoi } from '@/lib/agent/thay-theo-chu-de';
import { nghiaChuDe } from '@/lib/agent/luan-chu-de';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function monCuaThay(id: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/master_profiles?id=eq.${encodeURIComponent(id)}&select=discipline&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as { discipline?: string | null }[];
    return rows[0]?.discipline || null;
  } catch (e) {
    console.error('[thay-hoi] master_profiles', e);
    return null;
  }
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 500);
  const r = thayChoCauHoi(q);
  const mon = await monCuaThay(r.thay);
  const { nghiaViec, ...rest } = r;
  return NextResponse.json({ ...rest, nghia: nghiaViec || nghiaChuDe(r.chuDe), mon }, { headers: { 'Cache-Control': 'no-store' } });
}
