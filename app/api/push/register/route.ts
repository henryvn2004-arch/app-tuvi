// app/api/push/register/route.ts
// App native (Capacitor) gọi sau khi được cấp device token push (FCM/APNs):
// lưu token vào push_tokens để cron "Vận hôm nay" gửi mỗi sáng. Gắn user_id nếu
// có Bearer (cá nhân hoá), không thì lưu token khách (nhận push chung). Upsert
// theo token (đăng ký lại không nhân bản). Xem _patches/migration-push-tokens.sql.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;
  const token = String(b.token || '').trim();
  const platform = ['android', 'ios', 'web'].includes(String(b.platform)) ? String(b.platform) : 'android';
  if (!token || token.length < 8 || token.length > 4096) return err('Missing token', 400);

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Gắn user nếu có Bearer (không bắt buộc — khách vẫn nhận push chung).
    let userId: string | null = null;
    const auth = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (auth) {
      const { data } = await sb.auth.getUser(auth);
      userId = data?.user?.id || null;
    }

    const birth = b.birth && typeof b.birth === 'object' ? b.birth : null;
    const { error } = await sb.from('push_tokens').upsert(
      { token, platform, user_id: userId, birth, enabled: true, updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
    if (error) {
      console.error('[push/register] store:', error.message);
      return err('Store failed', 500);
    }
    return ok({ ok: true });
  } catch (e) {
    console.error('[push/register] exception', e);
    return err('Register error', 500);
  }
}
