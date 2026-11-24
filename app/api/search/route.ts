// app/api/search/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { ok, options, parseBody } from '@/lib/cors';
import { checkRouteRate, rateLimitedResponse, requestIp } from '@/lib/ops/rate-limit';

const OPENAI_API_KEY    = process.env.OPENAI_API_KEY!;
const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export async function OPTIONS() { return options(); }

// Endpoint công khai (chatbot.js gọi mỗi câu hỏi) mà mỗi lượt gọi OpenAI + một RPC pgvector:
// giới hạn theo IP; chatbot bỏ qua RAG khi lỗi nên 429 không làm hỏng cuộc chat.
const SEARCH_PER_MIN = 60;
const MATCH_MAX = 10;

export async function POST(request: NextRequest) {
  if (!checkRouteRate('search', requestIp(request), SEARCH_PER_MIN).allowed) return rateLimitedResponse();
  const body = await parseBody(request) as { query?: unknown; matchCount?: unknown };
  const { query } = body;
  if (typeof query !== 'string' || !query) return ok({ docs: '' });
  // `match_count` đi thẳng vào RPC: chặn trần để một request không kéo cả bảng.
  const matchCount = Math.min(Math.max(Math.floor(Number(body.matchCount)) || 7, 1), MATCH_MAX);

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
