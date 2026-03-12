const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

module.exports = async function handler(req, res) {
  const setHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  };
  if (req.method === 'OPTIONS') { setHeaders(res); return res.status(200).end(); }

  try {
    const { query, matchCount = 6 } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!query) setHeaders(res); return res.status(200).json({ docs: '' });

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

    setHeaders(res); return res.status(200).json({ docs });

  } catch (e) {
    // On error, return empty docs (Claude will still work, just without RAG)
    setHeaders(res); return res.status(200).json({ docs: '', error: e.message });
  }
}
