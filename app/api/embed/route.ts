// app/api/embed/route.ts
export const maxDuration = 60;
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const OPENAI_API_KEY      = process.env.OPENAI_API_KEY!;
const SUPABASE_URL        = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const body = await parseBody(request) as { chunks?: { content: string; source: string }[] };
  const { chunks } = body;
  if (!chunks?.length) return err('No chunks', 400);

  const results = { ok: 0, errors: [] as string[] };

  for (const chunk of chunks) {
    try {
      const embResp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ input: chunk.content.slice(0, 3000), model: 'text-embedding-3-small', dimensions: 1024 }),
      });
      if (!embResp.ok) { results.errors.push(`Embed error: ${(await embResp.json() as {error:{message:string}}).error?.message}`); continue; }
      const embedding = (await embResp.json() as {data:{embedding:number[]}[]}).data[0].embedding;

      const upResp = await fetch(`${SUPABASE_URL}/rest/v1/tuvi_docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify([{ content: chunk.content, source: chunk.source, embedding }]),
      });
      if (!upResp.ok) { results.errors.push(`Upload error: ${(await upResp.text()).slice(0,100)}`); continue; }
      results.ok++;
    } catch(e:unknown) { results.errors.push((e as Error).message); }
  }

  return ok(results);
}
