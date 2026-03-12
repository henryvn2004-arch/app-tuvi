export const config = { runtime: 'edge' };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { query, matchCount = 6 } = await req.json();
    if (!query) return new Response(JSON.stringify({ docs: '' }), { headers: corsHeaders });

    // Embed query
    const embResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: query.slice(0, 1000), model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    if (!embResp.ok) throw new Error(`OpenAI error: ${await embResp.text()}`);
    const embData = await embResp.json();
    const embedding = embData.data[0].embedding;

    // Search Supabase
    const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_tuvi_docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query_embedding: embedding, match_count: matchCount }),
    });
    if (!searchResp.ok) throw new Error(`Supabase error: ${await searchResp.text()}`);
    const results = await searchResp.json();
    const docs = results.map(r => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');

    return new Response(JSON.stringify({ docs }), { headers: corsHeaders });

  } catch (e) {
    // On error, return empty docs (Claude will still work, just without RAG)
    return new Response(JSON.stringify({ docs: '', error: e.message }), { headers: corsHeaders });
  }
}
