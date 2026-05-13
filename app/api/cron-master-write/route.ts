// app/api/cron-master-write/route.ts
// Two-stage pipeline: Storyboard → Full article in master's classical voice
export const maxDuration = 60;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const OPENAI_KEY    = process.env.OPENAI_API_KEY!;
const ARTICLES_PER_RUN = 1;

// ── Supabase helper ────────────────────────────────────────────────────────────
async function sbFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...(opts.headers as Record<string, string> || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

// ── Slug ───────────────────────────────────────────────────────────────────────
function toSlug(str: string) {
  return String(str || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 90);
}

// ── topic_queue helpers ────────────────────────────────────────────────────────
async function popTopics(count: number) {
  // Only pick master-write topics that have a master_id assigned
  const r = await sbFetch(
    `/topic_queue?status=eq.pending&type=eq.master-article&order=priority.asc,created_at.asc&limit=${count}&select=id,topic,type,priority,master_id,article_type`
  );
  if (!r.ok || !r.body?.length) return [];
  const ids = (r.body as { id: string }[]).map(t => t.id);
  await sbFetch(`/topic_queue?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'processing' }),
  });
  return r.body;
}

async function updateStatus(id: string, status: string) {
  await sbFetch(`/topic_queue?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, used_at: new Date().toISOString() }),
  });
}

async function slugExists(slug: string) {
  const r = await sbFetch(`/master_articles?slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`);
  return r.ok && r.body?.length > 0;
}

// ── Fetch master profile ───────────────────────────────────────────────────────
interface MasterProfile {
  id: string;
  display_name: string;
  bio: string;
  style_summary: string;
  style_rules: string[];
  specialty_topics: string[];
  primary_article_type: string;
}

async function fetchMaster(masterId: string): Promise<MasterProfile | null> {
  const r = await sbFetch(
    `/master_profiles?id=eq.${masterId}&select=id,display_name,bio,style_summary,style_rules,specialty_topics,primary_article_type&limit=1`
  );
  if (!r.ok || !r.body?.length) return null;
  return r.body[0] as MasterProfile;
}

// ── OpenAI embed ───────────────────────────────────────────────────────────────
async function embedText(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
  return ((await res.json()) as { data: { embedding: number[] }[] }).data[0].embedding;
}

// ── RAG: master style docs ─────────────────────────────────────────────────────
async function ragMasterStyle(embedding: number[], masterId: string, articleType: string): Promise<string> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_master_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({
        query_embedding: embedding,
        target_master_id: masterId,
        target_article_type: articleType || null,
        match_count: 6,
        match_threshold: 0.2,
      }),
    });
    if (!res.ok) return '';
    const docs = (await res.json()) as { source_title: string; content: string }[];
    return docs.map(d => `[${d.source_title}]\n${d.content}`).join('\n\n---\n\n');
  } catch { return ''; }
}

// ── RAG: tuvi factual docs ─────────────────────────────────────────────────────
async function ragTuviDocs(embedding: number[]): Promise<string> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 6, match_threshold: 0.25 }),
    });
    if (!res.ok) return '';
    const docs = (await res.json()) as { source: string; content: string }[];
    return docs.map(d => `[${d.source}]\n${d.content}`).join('\n\n---\n\n');
  } catch { return ''; }
}

// ── Claude call ────────────────────────────────────────────────────────────────
async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const e = await res.json() as { error: { message: string } };
    throw new Error(e.error?.message || `Claude ${res.status}`);
  }
  const data = await res.json() as { content: { text: string }[] };
  return data.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
}

// ── Stage 1: Storyboard ────────────────────────────────────────────────────────
interface Storyboard {
  thesis: string;
  sections: { heading: string; key_points: string[] }[];
  conclusion_direction: string;
}

async function buildStoryboard(
  topic: string,
  master: MasterProfile,
  styleCtx: string,
): Promise<Storyboard> {
  const styleRules = master.style_rules.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n');
  const prompt = `Bạn là ${master.display_name}, học giả nghiên cứu Tử Vi Đẩu Số từ trước 1975.
Văn phong: ${master.style_summary}
Nguyên tắc viết:
${styleRules}

Chủ đề bài viết: "${topic}"

Bài mẫu văn phong của bạn:
---
${styleCtx.slice(0, 3000)}
---

Tạo dàn bài chi tiết cho bài viết ~1200-1500 từ.
Trả về JSON thuần (KHÔNG backtick markdown):
{
  "thesis": "luận điểm trung tâm (1-2 câu)",
  "sections": [
    {"heading": "Tiêu đề mục", "key_points": ["điểm 1", "điểm 2", "điểm 3"]}
  ],
  "conclusion_direction": "hướng kết luận"
}
Cần 4-6 sections. Bám sát văn phong học thuật cổ điển.`;

  const raw = await callClaude(prompt, 800);
  return JSON.parse(raw) as Storyboard;
}

// ── Stage 2: Full article ──────────────────────────────────────────────────────
interface MasterArticleOutput {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  content: string;
}

const VALID_CATS = ['hoc-thuat', 'luan-la-so', 'chiem-nghiem', 'thuc-hanh', 'ly-luan'];

async function writeArticle(
  topic: string,
  master: MasterProfile,
  storyboard: Storyboard,
  styleCtx: string,
  tuviCtx: string,
): Promise<MasterArticleOutput> {
  const styleRules = master.style_rules.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n');
  const sectionsOutline = storyboard.sections
    .map(s => `## ${s.heading}\n- ${s.key_points.join('\n- ')}`)
    .join('\n\n');

  const prompt = `Bạn là ${master.display_name}, học giả nghiên cứu Tử Vi Đẩu Số.
Bio: ${master.bio}
Văn phong: ${master.style_summary}
Nguyên tắc viết (PHẢI tuân theo):
${styleRules}

CHỦ ĐỀ: "${topic}"
LUẬN ĐIỂM: ${storyboard.thesis}
KẾT LUẬN HƯỚNG ĐẾN: ${storyboard.conclusion_direction}

DÀN BÀI:
${sectionsOutline}

TÀI LIỆU VĂN PHONG (bài mẫu của bạn — học cách diễn đạt):
---
${styleCtx.slice(0, 2500)}
---

TÀI LIỆU CHUYÊN MÔN (sự kiện và kiến thức Tử Vi — bám sát, không bịa):
---
${tuviCtx.slice(0, 2500) || '(Dùng kiến thức Tử Vi Đẩu Số tổng quát)'}
---

Viết bài hoàn chỉnh theo dàn bài trên. Yêu cầu:
- 1200-1500 từ, markdown
- Giọng văn học thuật cổ điển, điềm tĩnh, uyên bác
- Dùng thuật ngữ Tử Vi chính xác (sao, cung, can, chi, hóa...)
- Có dẫn chứng từ cổ thư hoặc kinh nghiệm luận giải
- KHÔNG đề cập AI, không tự xưng là AI
- Tác giả ký tên: ${master.display_name}

Trả về JSON thuần (KHÔNG backtick):
{
  "title": "Tiêu đề bài viết (có từ khóa, 50-80 ký tự)",
  "slug": "slug-ascii-no-diacritic",
  "excerpt": "Tóm tắt dưới 160 ký tự",
  "category": "CHỌN 1: hoc-thuat|luan-la-so|chiem-nghiem|thuc-hanh|ly-luan",
  "tags": ["tag1", "tag2", "tag3"],
  "content": "nội dung markdown đầy đủ"
}`;

  const raw = await callClaude(prompt, 3500);
  const article = JSON.parse(raw) as MasterArticleOutput;

  if (!VALID_CATS.includes(article.category)) {
    article.category = master.primary_article_type === 'luan-la-so' ? 'luan-la-so' : 'hoc-thuat';
  }
  const rawTags = Array.isArray(article.tags) ? article.tags as string[] : [];
  article.tags = rawTags.slice(0, 5).filter((t: string) => typeof t === 'string' && t.length > 0);
  if (!article.tags.includes(article.category)) article.tags.unshift(article.category);

  return article;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export async function OPTIONS() { return options(); }

interface TopicRow {
  id: string;
  topic: string;
  type: string;
  priority: number;
  master_id: string;
  article_type: string;
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);

  const results = { written: 0, saved: 0, errors: [] as string[] };
  const startTime = Date.now();

  const topics = await popTopics(ARTICLES_PER_RUN) as TopicRow[];
  if (!topics.length) return ok({ message: 'No pending master-article topics', results });

  for (const t of topics) {
    if (Date.now() - startTime > 52000) { await updateStatus(t.id, 'pending'); break; }

    try {
      // Fetch master profile
      const master = await fetchMaster(t.master_id);
      if (!master) {
        results.errors.push(`Master not found: ${t.master_id}`);
        await updateStatus(t.id, 'error');
        continue;
      }

      // Embed topic
      const embedding = await embedText(t.topic);

      // Dual RAG
      const [styleCtx, tuviCtx] = await Promise.all([
        ragMasterStyle(embedding, t.master_id, t.article_type),
        ragTuviDocs(embedding),
      ]);

      // Stage 1: Storyboard
      const storyboard = await buildStoryboard(t.topic, master, styleCtx);
      results.written++;

      // Stage 2: Write article
      const article = await writeArticle(t.topic, master, storyboard, styleCtx, tuviCtx);

      // Ensure unique slug
      let slug = article.slug || toSlug(article.title);
      if (!slug) slug = toSlug(t.topic);
      if (await slugExists(slug)) slug = slug + '-' + Date.now().toString().slice(-5);
      article.slug = slug;

      // Word count estimate
      const wordCount = article.content.trim().split(/\s+/).length;

      // Save to master_articles
      const saved = await sbFetch('/master_articles', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          master_id: t.master_id,
          category: article.category,
          tags: article.tags,
          storyboard: storyboard,
          word_count: wordCount,
          created_at: new Date().toISOString(),
        }),
      });

      if (saved.ok) {
        results.saved++;
        await updateStatus(t.id, 'done');
      } else {
        results.errors.push(`DB: ${JSON.stringify(saved.body).slice(0, 100)}`);
        await updateStatus(t.id, 'error');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message?.slice(0, 80) || 'unknown';
      results.errors.push(`${t.topic.slice(0, 30)}: ${msg}`);
      await updateStatus(t.id, 'error');
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  return ok({
    message: 'OK',
    duration_ms: Date.now() - startTime,
    ...results,
  });
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }
