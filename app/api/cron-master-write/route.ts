// app/api/cron-master-write/route.ts
// Two-stage pipeline: Storyboard → Full article in master's classical voice
export const maxDuration = 300;
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
  const raw = data.content[0].text.trim();
  // Strip outer ```json...``` only, not any inner backticks in content
  if (raw.startsWith('```')) {
    const inner = raw.replace(/^```(?:json)?\s*/, '');
    return inner.trimEnd().endsWith('```') ? inner.trimEnd().slice(0, -3).trimEnd() : inner;
  }
  return raw;
}

// ── Stage 1: Storyboard ────────────────────────────────────────────────────────
interface Storyboard {
  hook: string;
  sections: { heading: string; key_points: string[] }[];
  closing: string;
}

async function buildStoryboard(
  topic: string,
  master: MasterProfile,
  styleCtx: string,
): Promise<Storyboard> {
  const prompt = `Bạn là ${master.display_name}, học giả mệnh lý người Hoa, làm việc trong môi trường Trung Quốc, Đài Loan, Hồng Kông, Ma Cao.
Bio: ${master.bio}

Chủ đề bài viết: "${topic}"

Tham khảo văn phong từ các bài viết trước:
---
${styleCtx.slice(0, 2000)}
---

Tạo dàn bài cho bài viết KỂ CHUYỆN, cá nhân, dễ đọc (~1200-1500 từ).

NGUYÊN TẮC CỐT LÕI:
- Mở bài IN MEDIAS RES: ném thẳng vào giữa một cảnh cụ thể — có người thật (tên tắt hoặc mô tả), địa điểm, khoảnh khắc. KHÔNG mở bằng định nghĩa, KHÔNG "Hôm nay tôi sẽ nói về..."
- Nhân vật câu chuyện phải gắn với bối cảnh xã hội Hoa ngữ: doanh nhân Đài Loan, gia đình Hồng Kông lo chuyện hôn nhân con cái, người trẻ Thượng Hải đổi việc, chủ doanh nghiệp Ma Cao trước quyết định lớn...
- Cấu trúc: Cảnh mở (tension) → bối cảnh/vấn đề → góc nhìn Tử Vi như lăng kính → chiêm nghiệm cá nhân
- Hook phải là một câu cảnh hoặc câu thoại cụ thể, không phải câu hỏi tu từ

Trả về JSON một dòng (KHÔNG backtick, key_points tối đa 6 từ):
{"hook":"câu mở cảnh cụ thể","sections":[{"heading":"tên mục ngắn","key_points":["ý ngắn","ý ngắn"]}],"closing":"hướng kết bài"}
Cần đúng 4 sections.`;

  const raw = await callClaude(prompt, 500);
  return JSON.parse(raw) as Storyboard;
}

// ── Stage 2a: Write article content (plain markdown, no JSON) ─────────────────
async function writeContent(
  topic: string,
  master: MasterProfile,
  storyboard: Storyboard,
  styleCtx: string,
): Promise<string> {
  const sectionsOutline = storyboard.sections
    .map(s => `**${s.heading}**: ${s.key_points.join(', ')}`)
    .join('\n');

  const prompt = `Bạn là ${master.display_name}, đang viết một bài chia sẻ cá nhân về Tử Vi Đẩu Số cho độc giả người Việt.

CHỦ ĐỀ: "${topic}"
MỞ BÀI (dùng nguyên câu này, triển khai từ đây): ${storyboard.hook}
KẾT BÀI HƯỚNG ĐẾN: ${storyboard.closing}

DÀN Ý:
${sectionsOutline}

VĂN PHONG MẪU (học cách diễn đạt, không copy):
---
${styleCtx.slice(0, 1800)}
---

KỸ THUẬT KỂ CHUYỆN — TUÂN THỦ NGHIÊM:

1. MỞ BÀI IN MEDIAS RES
   Bắt đầu ngay giữa một cảnh: có người, có khoảnh khắc, có cảm xúc. Ví dụ tốt: "Anh Minh gọi cho tôi lúc 11 giờ đêm, giọng khàn đặc." Ví dụ tệ: "Tử Vi Đẩu Số là một hệ thống..."

2. NHÂN VẬT CỤ THỂ, BỐI CẢNH HÀ NGỮ
   Câu chuyện phải đặt trong môi trường Trung Quốc/Đài Loan/Hồng Kông/Ma Cao. Nhân vật có nghề nghiệp, vấn đề thật: chủ doanh nghiệp gia đình Đài Loan lo chuyện thừa kế, cặp vợ chồng Hồng Kông quyết định mua nhà, người trẻ Thượng Hải đứng trước ngã rẽ sự nghiệp, doanh nhân Ma Cao trước một thương vụ lớn...

3. TENSION TRƯỚC KHI CÓ ĐÁP ÁN
   Không giải thích Tử Vi ngay. Để vấn đề của nhân vật treo lơ lửng đủ lâu để người đọc cảm được sức nặng của nó trước khi lăng kính mệnh lý xuất hiện.

4. SHOW, ĐỪNG TELL
   Thay vì "anh ấy rất lo lắng" → "anh gõ ngón tay liên tục lên mặt bàn, mắt nhìn ra ngoài cửa sổ nhìn xuống đường Harcourt Road bên dưới."

5. DIALOGUE NGẮN, TỰ NHIÊN
   Một vài câu thoại làm bài sống hơn hẳn. Không cần nhiều, 2-3 lần là đủ.

6. TỬ VI NHƯ LĂNG KÍNH, KHÔNG PHẢI GIÁO TRÌNH
   Kiến thức Tử Vi xuất hiện để lý giải câu chuyện, không phải để định nghĩa hay liệt kê. Người đọc học được qua ngữ cảnh, không qua lý thuyết.

7. KẾT NHỎ, CÁ NHÂN
   Không kết luận lớn lao. Một quan sát nhỏ, thật, từ góc nhìn của bạn. Ký tên *${master.display_name}*.

FORMAT: 1200-1500 từ, markdown (## cho mục chính, **bold** cho điểm nhấn, > cho câu chiêm nghiệm đáng nhớ)
KHÔNG đề cập AI, không học thuật cứng nhắc, không câu mở theo kiểu "Trong hành trình..."

Chỉ trả về nội dung markdown, không bọc JSON, không backtick ngoài.`;

  return callClaude(prompt, 5000);
}

// ── Stage 2b: Extract metadata ─────────────────────────────────────────────────
interface MasterArticleOutput {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  content: string;
}

const VALID_CATS = ['hoc-thuat', 'luan-la-so', 'chiem-nghiem', 'thuc-hanh', 'ly-luan'];

async function extractMetadata(topic: string, content: string): Promise<Omit<MasterArticleOutput, 'content'>> {
  const preview = content.slice(0, 400);
  const prompt = `Chủ đề: "${topic}"
Mở bài: ${preview}

Tạo metadata JSON một dòng duy nhất (KHÔNG backtick, KHÔNG xuống dòng trong JSON):
{"title":"tiêu đề hấp dẫn 50-75 ký tự","slug":"slug-ascii","excerpt":"tóm tắt gợi cảm xúc dưới 155 ký tự","category":"chiem-nghiem hoặc luan-la-so hoặc hoc-thuat","tags":["tag1","tag2","tag3"]}`;

  const raw = await callClaude(prompt, 250);
  return JSON.parse(raw) as Omit<MasterArticleOutput, 'content'>;
}

async function writeArticle(
  topic: string,
  master: MasterProfile,
  storyboard: Storyboard,
  styleCtx: string,
  _tuviCtx: string,
): Promise<MasterArticleOutput> {
  // Stage 2a: write markdown content
  const content = await writeContent(topic, master, storyboard, styleCtx);

  // Stage 2b: extract metadata
  let meta: Omit<MasterArticleOutput, 'content'>;
  try {
    meta = await extractMetadata(topic, content);
  } catch {
    meta = {
      title: topic.slice(0, 75),
      slug: '',
      excerpt: storyboard.hook.slice(0, 155),
      category: 'chiem-nghiem',
      tags: [],
    };
  }

  const article: MasterArticleOutput = { ...meta, content };

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
