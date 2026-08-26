// app/api/cron-master-write/route.ts
// Two-stage pipeline: Storyboard → Full article in master's classical voice
export const maxDuration = 300;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { parseLlmJson } from '@/lib/llm/json';
import { withCronLog } from '@/lib/cron/log';
import { brandCheck } from '@/lib/content/brand-check';
import { BRAND_FORMAT_RULES } from '@/lib/content/brand-rules';
import { VIRAL_KE_CHUYEN, HOOK_RULES } from '@/lib/content/viral-core';
import { initialPublishStatus } from '@/lib/content/publish-filter';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_KEY    = process.env.OPENAI_API_KEY!;
const ARTICLES_PER_RUN = 1;

// ── Supabase helper ────────────────────────────────────────────────────────────
async function sbFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { cache: 'no-store',
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

// ── LLM call (Gemini-primary + Anthropic-backup qua helper chung) ───────────────
//
// ⚠️ Tên cũ là `callClaude` — SAI VÀ GÂY HIỂU NHẦM. Nó đi qua `llmText` tức là
// định tuyến: `chat.standalone_provider` không set trên prod nên rơi về mặc
// định `gemini` ⇒ pipeline này chạy **gemini-2.5-flash**, Sonnet chỉ là dự
// phòng khi Gemini ném lỗi. Đổi tên thành `callLlm` để đọc code là biết đúng.
//
// Đổi `llmText` → `llmTextFull` + `logLlmUsage`: trước đây TOÀN BỘ chi phí viết
// bài không nằm trong sổ nào (đo 30 ngày: `events.llm_usage` chỉ có 30 dòng, cùng
// kỳ pipeline đẻ ~150 bài). Hai hệ quả: panel Biên LN thiếu hẳn khoản này, và
// những lượt âm thầm rơi sang Sonnet — đắt hơn ~13 lần — không ai thấy.
async function callLlm(
  prompt: string,
  maxTokens = 3000, // Nâng 50% (Henry chốt 2026-08-20, cùng đợt chống cắt ngang toàn repo)
  opts: { json?: boolean } = {},
): Promise<string> {
  const r = await llmTextFull({ prompt, maxTokens, json: opts.json });
  // best-effort, KHÔNG await: ghi sổ hỏng thì cũng đừng làm hỏng lượt viết bài.
  void logLlmUsage('cron-master-write', r.model, {
    input_tokens: r.usage.input_tokens,
    output_tokens: r.usage.output_tokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }, r.durationMs);
  return r.text.trim();
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

  // 🔴 ĐÂY LÀ CHỖ LÀM MẤT CHỦ ĐỀ. Bản cũ: `JSON.parse(await callClaude(prompt,
  // 500))` — không cờ `json`, không bóc fence, KHÔNG có nhánh dự phòng (khác
  // `extractMetadata` ngay dưới, vốn được bọc try/catch). Ném lỗi ở đây là chủ
  // đề bị chốt `error` và mất luôn. Bằng chứng cờ fence là vấn đề THẬT: chính
  // `cron-khao-luan` phải tự tay `.replace(/^```json/…)` vì gặp hoài.
  //
  // Ba lớp vá, theo thứ tự rẻ → đắt:
  //   1. `json: true` — ép JSON hợp lệ ở TẦNG API (Gemini responseMimeType),
  //      chặn tận gốc thay vì đi dọn chuỗi.
  //   2. maxTokens 500 → 1200 → 1800 (nâng 50% thêm, Henry chốt 2026-08-20).
  //      4 section × key_points + hook + closing bằng tiếng Việt (~2,5 token/
  //      từ) chạm sát trần cũ; hết chỗ là JSON CỤT, mà JSON cụt thì không lớp
  //      bóc nào cứu được. Output chỉ tính token thực dùng nên nới trần gần
  //      như không tốn thêm.
  //   3. `parseLlmJson` + thử lại 1 lượt kèm nhắc định dạng — lưới cho nhánh
  //      backup Anthropic (API không có JSON mode).
  const raw = await callLlm(prompt, 1800, { json: true });
  const parsed = parseLlmJson(raw);
  if (parsed && Array.isArray((parsed as Storyboard).sections)) return parsed as Storyboard;

  console.warn(
    `[cron-master-write] storyboard parse hỏng (${raw.length} ký tự) → thử lại. Đầu: ${raw.slice(0, 120)}`,
  );
  const retry = await callLlm(
    `${prompt}\n\nCHỈ trả về đúng một object JSON hợp lệ, không lời dẫn, không backtick.`,
    1800,
    { json: true },
  );
  const parsed2 = parseLlmJson(retry);
  if (parsed2 && Array.isArray((parsed2 as Storyboard).sections)) return parsed2 as Storyboard;
  throw new Error('storyboard: không parse được JSON sau 2 lượt');
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

${VIRAL_KE_CHUYEN}

FORMAT: 1200-1500 từ, markdown (## cho mục chính, **bold** cho điểm nhấn, > cho câu chiêm nghiệm đáng nhớ)
KHÔNG đề cập AI, không học thuật cứng nhắc, không câu mở theo kiểu "Trong hành trình..."

${BRAND_FORMAT_RULES}

Chỉ trả về nội dung markdown, không bọc JSON, không backtick ngoài.`;

  return callLlm(prompt, 7500); // Nâng 50% (Henry chốt 2026-08-20)
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

${HOOK_RULES}

Tạo metadata JSON một dòng duy nhất (KHÔNG backtick, KHÔNG xuống dòng trong JSON):
{"title":"tiêu đề ≤60 ký tự theo luật ở trên","slug":"slug-ascii","excerpt":"tóm tắt ≤155 ký tự theo luật ở trên","category":"chiem-nghiem hoặc luan-la-so hoặc hoc-thuat","tags":["tag1","tag2","tag3"]}`;

  // 250 token cho title + slug + excerpt 155 ký tự + 3 tag bằng tiếng Việt là
  // rất sát — nới lên 500 → 750 (nâng 50% thêm, Henry chốt 2026-08-20). Chỗ
  // này ĐÃ có nhánh dự phòng ở caller nên hỏng không mất chủ đề, nhưng rơi về
  // dự phòng nghĩa là title thành chính chuỗi chủ đề, tức mất luôn cái tiêu
  // đề tối ưu cho tìm kiếm.
  const raw = await callLlm(prompt, 750, { json: true });
  const parsed = parseLlmJson(raw);
  if (!parsed) throw new Error('metadata: không parse được JSON');
  return parsed as Omit<MasterArticleOutput, 'content'>;
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

  const results = { written: 0, saved: 0, blocked: 0, errors: [] as string[] };
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

      // ── BRAND-CHECK GATE — bước QC cuối cùng còn chặn được ──────────────────
      // Profile 'nghien-cuu' KHÁC HẲN 'khao-luan': tùy bút này viết ngôi thứ
      // NHẤT và ký tên thầy — đo trên prod 300/306 bài dùng "tôi", đó là định
      // dạng chứ không phải lỗi. Gate ở đây chỉ siết phần dùng chung (tên cung,
      // sao bịa, 2 thẻ H1, rule-dump) và bắt "bạn" → "quý vị" (85/306 bài).
      const gate = await brandCheck({
        content: article.content,
        title: article.title,
        slug: article.slug,
        profile: 'nghien-cuu',
        payload: article,
      });
      article.content = gate.content;
      if (!gate.pass) {
        results.blocked++;
        results.errors.push(
          `QC chặn "${t.topic.slice(0, 30)}": ${gate.violations.filter(v => v.severity === 'block').map(v => v.rule).join(', ')}`,
        );
        await updateStatus(t.id, 'qc_failed');
        continue;
      }

      // Word count estimate — tính SAU gate vì gate có thể đã sửa nội dung.
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
          publish_status: await initialPublishStatus(),
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

export async function GET(request: NextRequest) {
  return withCronLog('cron-master-write', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) { return handle(request); }
