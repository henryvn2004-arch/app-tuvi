const COHERE_API_KEY = process.env.COHERE_API_KEY!;

interface CohereResult {
  index: number;
  relevance_score: number;
}

/**
 * Rerank chunks using Cohere Rerank v2.
 * Returns chunks sorted by relevance, trimmed to topN.
 */
export async function rerankDocs<T extends { content: string }>(
  query: string,
  chunks: T[],
  topN: number,
): Promise<T[]> {
  if (!chunks.length || !COHERE_API_KEY) return chunks.slice(0, topN);

  const resp = await fetch('https://api.cohere.com/v2/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents: chunks.map(c => c.content),
      top_n: topN,
    }),
  });

  if (!resp.ok) {
    console.error('[cohere rerank] error', resp.status, await resp.text());
    return chunks.slice(0, topN);
  }

  const json = await resp.json() as { results: CohereResult[] };
  return json.results.map(r => chunks[r.index]);
}
