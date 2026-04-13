// app/api/history/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SB_URL  = process.env.SUPABASE_URL!;
const SB_SERV = process.env.SUPABASE_SERVICE_KEY!;

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const supabase = createClient(SB_URL, SB_SERV);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

// ===== GET =====
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const supabase = createClient(SB_URL, SB_SERV);

  try {
    // -- list: tất cả readings của user --
    if (action === 'list') {
      const [{ data: lasos }, { data: xemTuoi }, { data: chatList }, { data: purchases }] = await Promise.all([
        supabase.from('laso_public')
          .select('slug, person_name, gioi_tinh, nam_sinh, thang_sinh, ngay_sinh, gio_chi, cung_menh, chinh_tinh, nap_am, cuc, laso_image, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('xem_tuoi_cache')
          .select('id, slug, product_type, person_a, person_b, total_score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('chat_history')
          .select('laso_slug, product, updated_at, created_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase.from('purchases')
          .select('slug, amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      return cors(NextResponse.json({ lasos: lasos ?? [], xemTuoi: xemTuoi ?? [], chatList: chatList ?? [], purchases: purchases ?? [] }));
    }

    // -- laso: luan_giai cached --
    if (action === 'laso') {
      const slug = searchParams.get('slug');
      if (!slug) return cors(NextResponse.json({ error: 'Missing slug' }, { status: 400 }));
      const { data } = await supabase.from('laso_public')
        .select('slug, person_name, gioi_tinh, nam_sinh, thang_sinh, ngay_sinh, gio_chi, cung_menh, chinh_tinh, nap_am, cuc, luan_giai, laso_image, can_chi_nam, created_at')
        .eq('slug', slug).single();
      if (!data) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      return cors(NextResponse.json(data));
    }

    // -- chat: lịch sử chat --
    if (action === 'chat') {
      const slug = searchParams.get('slug');
      if (!slug) return cors(NextResponse.json({ error: 'Missing slug' }, { status: 400 }));
      const { data } = await supabase.from('chat_history')
        .select('messages, updated_at')
        .eq('user_id', user.id).eq('laso_slug', slug).single();
      return cors(NextResponse.json({ messages: data?.messages ?? [], updated_at: data?.updated_at ?? null }));
    }

    // -- xem_tuoi: cached result by id --
    if (action === 'xem_tuoi') {
      const id = searchParams.get('id');
      if (!id) return cors(NextResponse.json({ error: 'Missing id' }, { status: 400 }));
      const { data } = await supabase.from('xem_tuoi_cache')
        .select('*').eq('id', id).eq('user_id', user.id).single();
      return cors(NextResponse.json(data ?? null));
    }

    return cors(NextResponse.json({ error: 'Unknown action' }, { status: 400 }));

  } catch (e: any) {
    return cors(NextResponse.json({ error: e.message }, { status: 500 }));
  }
}

// ===== POST =====
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const supabase = createClient(SB_URL, SB_SERV);

  try {
    const body = await req.json();

    // -- save_chat --
    if (action === 'save_chat') {
      const { slug, messages, product } = body;
      if (!slug || !Array.isArray(messages)) return cors(NextResponse.json({ error: 'Missing fields' }, { status: 400 }));
      const { error } = await supabase.from('chat_history').upsert({
        user_id: user.id,
        laso_slug: slug,
        product: product ?? 'laso',
        messages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,laso_slug' });
      if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
      return cors(NextResponse.json({ ok: true }));
    }

    // -- save_xem_tuoi --
    if (action === 'save_xem_tuoi') {
      const { slug, product_type, person_a, person_b, total_score, result_json } = body;
      if (!slug) return cors(NextResponse.json({ error: 'Missing slug' }, { status: 400 }));
      const { error } = await supabase.from('xem_tuoi_cache').insert({
        user_id: user.id,
        slug, product_type: product_type ?? 'xem-tuoi',
        person_a, person_b,
        total_score: total_score ?? 0,
        result_json: result_json ?? {},
      });
      if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
      return cors(NextResponse.json({ ok: true }));
    }

    // -- link_laso: gắn user_id cho lá số cũ chưa có owner --
    if (action === 'link_laso') {
      const { slug, person_name } = body;
      if (!slug) return cors(NextResponse.json({ error: 'Missing slug' }, { status: 400 }));
      const { error } = await supabase.from('laso_public')
        .update({ user_id: user.id, person_name: person_name ?? null })
        .eq('slug', slug).is('user_id', null);
      if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));
      return cors(NextResponse.json({ ok: true }));
    }

    return cors(NextResponse.json({ error: 'Unknown action' }, { status: 400 }));

  } catch (e: any) {
    return cors(NextResponse.json({ error: e.message }, { status: 500 }));
  }
}
