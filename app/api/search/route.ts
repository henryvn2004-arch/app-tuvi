// app/api/search/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const OPENAI_API_KEY    = process.env.OPENAI_API_KEY!;
const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const body = await parseBody(request) as { query?: string; matchCount?: number };
  const { query, matchCount = 7 } = body;
  if (!query) return ok({ docs: '' });

  try {
    const embResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: query.slice(0, 1000), model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    if (!embResp.ok) throw new Error(`OpenAI error: ${await embResp.text()}`);
    const embedding = (await embResp.json()).data[0].embedding;

    // Ngưỡng 0,55 → 0,40 (2026-09-29): với text-embedding-3-small, đoạn ĐÚNG chủ đề
    // trong tuvi_docs chỉ đạt ~0,45–0,56 (đo: "hạn nặng" → 5.1.x 0,48–0,50; "sao lưu" →
    // 4.1 0,45; "đám tang" → 5.2 0,56), đoạn lạc đề thường <0,40 ⇒ 0,55 cắt mất gần hết.
    const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: matchCount, match_threshold: 0.4 }),
    });
    if (!searchResp.ok) throw new Error(`Supabase error: ${await searchResp.text()}`);
    const results = await searchResp.json() as { source: string; content: string }[];
    const docs = results.map(r => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');
    return ok({ docs });
  } catch(e: unknown) {
    return ok({ docs: '', error: (e as Error).message });
  }
}
