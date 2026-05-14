// app/api/search/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { ok, options, parseBody } from '@/lib/cors';
import { rerankDocs } from '@/lib/cohere';

const OPENAI_API_KEY    = process.env.OPENAI_API_KEY!;
const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const VECTOR_FETCH = 15; // fetch rộng hơn để rerank có đủ candidates
const RERANK_TOP   = 7;  // trả về top sau rerank

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const body = await parseBody(request) as { query?: string; matchCount?: number };
  const { query } = body;
  if (!query) return ok({ docs: '' });

  try {
    const embResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: query.slice(0, 1000), model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    if (!embResp.ok) throw new Error(`OpenAI error: ${await embResp.text()}`);
    const embedding = (await embResp.json()).data[0].embedding;

    const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: VECTOR_FETCH, match_threshold: 0.55 }),
    });
    if (!searchResp.ok) throw new Error(`Supabase error: ${await searchResp.text()}`);
    const results = await searchResp.json() as { source: string; content: string }[];

    const reranked = await rerankDocs(query, results, RERANK_TOP);
    const docs = reranked.map(r => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');
    return ok({ docs });
  } catch(e: unknown) {
    return ok({ docs: '', error: (e as Error).message });
  }
}
