// app/api/embed-tai-lieu/route.ts
export const maxDuration = 60;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_KEY   = process.env.OPENAI_API_KEY!;
const BATCH_SIZE   = 10;

async function sbFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, ...(opts.headers as Record<string,string> || {}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);
  if (!OPENAI_KEY) return err('OPENAI_API_KEY not set', 500);

  const results = { embedded: 0, skipped: 0, errors: [] as string[] };
  const startTime = Date.now();

  try {
    const r = await sbFetch(`/tai_lieu?embedding=is.null&select=id,slug,title,excerpt,content&limit=${BATCH_SIZE}`);
    const articles = r.ok ? (r.body || []) : [];

    for (const article of articles) {
      if (Date.now() - startTime > 50000) break;
      try {
        const text = [article.title, article.excerpt||'', (article.content||'').slice(0,4000)].filter(Boolean).join('\n\n');
        const embRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0,8000) }),
        });
        if (!embRes.ok) throw new Error(`OpenAI embed failed: ${embRes.status}`);
        const embedding = (await embRes.json() as {data:{embedding:number[]}[]}).data[0].embedding;
        const saved = await sbFetch(`/tai_lieu?id=eq.${article.id}`, { method: 'PATCH', body: JSON.stringify({ embedding: JSON.stringify(embedding) }) });
        if (saved.ok) results.embedded++;
        else results.errors.push(`DB error for ${article.slug}`);
        await new Promise(r => setTimeout(r, 200));
      } catch(e:unknown) { results.errors.push(`${article.slug}: ${(e as Error).message}`); results.skipped++; }
    }
  } catch(e:unknown) { return err((e as Error).message); }

  return ok({ message: 'OK', duration_ms: Date.now() - startTime, ...results });
}

export async function POST(request: NextRequest) { return GET(request); }
