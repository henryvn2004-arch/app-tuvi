// app/api/get-laso/route.ts
export const maxDuration = 10;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return err('Missing slug', 400);
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await sb.from('laso_public').select('*').eq('slug', slug).single();
    if (error || !data) return err('Không tìm thấy lá số', 404);
    return ok(data);
  } catch(e:unknown) { return err((e as Error).message); }
}
