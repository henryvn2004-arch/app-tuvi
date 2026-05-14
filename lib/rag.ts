// Shared server-side RAG helpers
import { rerankDocs } from './cohere';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL   = process.env.SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY!;

async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 2000) }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data: { embedding: number[] }[] }).data[0].embedding;
  } catch { return null; }
}

/**
 * Search master_docs luan-la-so cross-master for reasoning examples.
 * Used as supplementary context after primary tuvi_docs.
 */
export async function searchMasterReasoning(query: string, topN = 2): Promise<string> {
  if (!query?.trim() || !OPENAI_API_KEY || !SUPABASE_KEY) return '';
  try {
    const embedding = await embedText(query);
    if (!embedding) return '';

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_master_docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        target_master_id: null,
        target_article_type: 'luan-la-so',
        match_count: 10,
        match_threshold: 0.3,
      }),
    });
    if (!res.ok) return '';
    const docs = (await res.json()) as { source_title: string; content: string }[];
    if (!docs.length) return '';

    const normalized = docs.map(d => ({ source: d.source_title, content: d.content }));
    const reranked = await rerankDocs(query, normalized, topN);
    return reranked.map(d => `[${d.source}]\n${d.content}`).join('\n\n---\n\n');
  } catch { return ''; }
}
