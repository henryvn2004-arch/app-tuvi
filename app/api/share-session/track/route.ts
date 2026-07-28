// app/api/share-session/track/route.ts
// Beacon đo phễu chia sẻ: người nhận nối phiên từ link share và hỏi thật lần đầu
// → +1 signup_count qua RPC security-definer. Chỉ nhận kind='signup' (view đếm ở
// server khi render trang /luan-duong, tránh client thổi phồng). Fire-and-forget.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
// S6 (track COO): TRƯỚC ĐÂY dùng SUPABASE_ANON_KEY. Đây là route SERVER, không
// có lý do gì phải đi bằng khoá công khai — mà chính chỗ đó buộc RPC
// `incr_shared_counter` phải mở EXECUTE cho `anon`, tức ai cũng gọi thẳng vào
// PostgREST để thổi phồng bộ đếm chia sẻ. Đổi sang service key để rào chắn
// nằm ở ĐÂY (validate id + ép kind='signup'), rồi mới thu được quyền của anon.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;
  const id = String(b.id || '');
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return err('id không hợp lệ', 400);
  if (String(b.kind || '') !== 'signup') return err('kind không hợp lệ', 400);
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    await sb.rpc('incr_shared_counter', { p_id: id, p_kind: 'signup' });
    return ok({ ok: true });
  } catch (e: unknown) {
    console.error('[share-session/track] exception', e);
    return ok({ ok: false }); // beacon không được làm hỏng luồng người dùng
  }
}
