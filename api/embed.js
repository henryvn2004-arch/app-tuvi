const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  const setHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  };

  if (req.method === 'OPTIONS') { setHeaders(res); return res.status(200).end(); }

  try {
    const { chunks } = req.body;
    if (!chunks || !chunks.length) setHeaders(res); return res.status(400).json({ error: 'No chunks' });

    const results = { ok: 0, errors: [] };

    for (const chunk of chunks) {
      try {
        // Get embedding from OpenAI
        const embResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ input: chunk.content.slice(0, 3000), model: 'text-embedding-3-small', dimensions: 1024 }),
        });
        if (!embResp.ok) {
          const err = await embResp.json();
          results.errors.push(`Embed error: ${err.error?.message}`);
          continue;
        }
        const embData = await embResp.json();
        const embedding = embData.data[0].embedding;

        // Upload to Supabase
        const upResp = await fetch(`${SUPABASE_URL}/rest/v1/tuvi_docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify([{ content: chunk.content, source: chunk.source, embedding }]),
        });
        if (!upResp.ok) {
          const err = await upResp.text();
          results.errors.push(`Upload error: ${err.slice(0, 100)}`);
          continue;
        }
        results.ok++;
      } catch (e) {
        results.errors.push(e.message);
      }
    }

    setHeaders(res); return res.status(200).json(results);

  } catch (e) {
    setHeaders(res); return res.status(500).json({ error: e.message });
  }
}
