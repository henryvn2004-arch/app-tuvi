// app/api/tuvi-chats/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SB_URL  = process.env.SUPABASE_URL!;
const SB_SERV = process.env.SUPABASE_SERVICE_KEY!;

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(SB_URL, SB_SERV);
  const { data: { user } } = await sb.auth.getUser(token);
  return user ?? null;
}

// GET /api/tuvi-chats — load all chats for user
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const sb = createClient(SB_URL, SB_SERV);
  const { data, error } = await sb
    .from('tuvi_chats')
    .select('id, label, type, laso_data, summary, messages, last_msg, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
  return cors(NextResponse.json({ chats: data ?? [] }));
}

// POST /api/tuvi-chats — upsert one chat
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return cors(NextResponse.json({ error: 'Bad JSON' }, { status: 400 })); }

  const { id, label, type, laso_data, summary, messages, last_msg, updated_at } = body;
  if (!id) return cors(NextResponse.json({ error: 'Missing id' }, { status: 400 }));

  const sb = createClient(SB_URL, SB_SERV);
  const { error } = await sb.from('tuvi_chats').upsert({
    id,
    user_id: user.id,
    label:      label     ?? 'Lá số mới',
    type:       type      ?? null,
    laso_data:  laso_data ?? null,
    summary:    summary   ?? '',
    messages:   messages  ?? [],
    last_msg:   last_msg  ?? '',
    updated_at: updated_at ?? new Date().toISOString(),
  }, { onConflict: 'id,user_id' });

  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
  return cors(NextResponse.json({ ok: true }));
}

// DELETE /api/tuvi-chats?id=xxx — delete one chat
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return cors(NextResponse.json({ error: 'Missing id' }, { status: 400 }));

  const sb = createClient(SB_URL, SB_SERV);
  const { error } = await sb.from('tuvi_chats').delete().eq('id', id).eq('user_id', user.id);
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
  return cors(NextResponse.json({ ok: true }));
}
