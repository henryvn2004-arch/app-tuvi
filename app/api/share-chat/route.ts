// app/api/share-chat/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SB_URL  = process.env.SUPABASE_URL!;
const SB_SERV = process.env.SUPABASE_SERVICE_KEY!;
const BASE    = 'https://tuviminhbao.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cors(res: NextResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch {
    return cors(NextResponse.json({ error: 'Bad JSON' }, { status: 400 }));
  }

  const { toolType, label, summary, messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return cors(NextResponse.json({ error: 'Missing messages' }, { status: 400 }));
  }

  // Only store user+assistant turns, drop system blobs (lá số data)
  const filtered = (messages as Array<{ role: string; content: string }>)
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: (m.content || '').slice(0, 8000) }));

  const sb = createClient(SB_URL, SB_SERV);
  const { data, error } = await sb
    .from('shared_chats')
    .insert({ tool_type: toolType ?? null, label: label ?? 'Hội thoại', summary: summary ?? null, messages: filtered })
    .select('id')
    .single();

  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
  const url = `${BASE}/shared-chat/${data.id}`;
  return cors(NextResponse.json({ id: data.id, url }));
}
