export const config = { runtime: 'edge' };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { chunks } = await req.json();
    if (!chunks || !chunks.length) return new Response(JSON.stringify({ error: 'No chunks' }), { status: 400, headers: corsHeaders });

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

    return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
