// app/api/push-subscribe/route.ts
// POST: lưu subscription | DELETE: xóa subscription
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, tuoi, can_chi } = body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      tuoi?: number;
      can_chi?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Lấy user_id nếu có Bearer token
    let user_id: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await sb.auth.getUser(token);
      user_id = data.user?.id ?? null;
    }

    const { error } = await sb.from('push_subscriptions').upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_id, tuoi: tuoi ?? null, can_chi: can_chi ?? null },
      { onConflict: 'endpoint' }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
