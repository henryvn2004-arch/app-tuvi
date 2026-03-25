// api/cron-khao-luan.js
// Vercel Cron 22:00 VN (15:00 UTC)
// Flow: topic_queue → embed → RAG tuvi_docs → Claude viết → tai_lieu / khao_luan

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY    = process.env.OPENAI_API_KEY;
const ARTICLES_PER_RUN = 5;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

async function popTopics(count) {
  const r = await sbFetch(`/topic_queue?status=eq.pending&order=priority.asc,created_at.asc&limit=${count}&select=id,topic,type,priority`);
  if (!r.ok || !r.body?.length) return [];
  const ids = r.body.map(t => t.id);
  await sbFetch(`/topic_queue?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'processing' }),
  });
  return r.body;
}

async function updateTopicStatus(id, status) {
  await sbFetch(`/topic_queue?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, used_at: new Date().toISOString() }),
  });
}

function toSlug(str) {
  return String(str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function slugExists(table, slug) {
  const r = await sbFetch(`/${table}?slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`);
  return r.ok && r.body?.length > 0;
}

async function embedText(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
  return (await res.json()).data[0].embedding;
}

async function ragSearch(topic) {
  if (!OPENAI_KEY) return '';
  try {
    const embedding = await embedText(topic);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 6, match_threshold: 0.25 }),
    });
    if (!res.ok) return '';
    const docs = await res.json();
    if (!docs?.length) return '';
    console.log(`[cron] RAG: ${docs.length} docs cho "${topic.slice(0,40)}"`);
    return docs.map(d => `[${d.source}]\n${d.content}`).join('\n\n---\n\n');
  } catch(e) {
    console.warn('[cron] RAG failed:', e.message);
    return '';
  }
}

async function writeArticle(topic, type, ctx) {
  const isTL = type === 'tai-lieu';
  const model = isTL ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514';
  const ctxBlock = ctx || '(Dùng kiến thức Tử Vi Đẩu Số tổng quát)';

  const prompt = isTL
    ? `Bạn là biên tập viên từ điển Tử Vi "Tử Vi Minh Bảo". Viết bài từ điển dễ hiểu về chủ đề sau.

Chủ đề: ${topic}
Tài liệu tham khảo:\n${ctxBlock}

Yêu cầu: giọng thân thiện, dễ hiểu, ứng dụng thực tế, markdown, 250-400 từ.

Trả về JSON thuần (KHÔNG backtick):
{"title":"Tiêu đề SEO-friendly","slug":"slug-ascii","excerpt":"Tóm tắt dưới 155 ký tự","category":"sao-chinh|sao-phu|cung|cach-cuc|van-han|luan-giai|khai-niem","tags":["tag1","tag2","tag3"],"content":"markdown 250-400 từ"}`
    : `Bạn là học giả Tử Vi Đẩu Số của "Tử Vi Minh Bảo". Viết bài khảo luận học thuật về chủ đề sau.

Chủ đề: ${topic}
Tài liệu tham khảo:\n${ctxBlock}

Yêu cầu: học thuật nhưng dễ đọc, chiều sâu phân tích, markdown, ~500 từ.

Trả về JSON thuần (KHÔNG backtick):
{"title":"Tiêu đề khảo luận (không phải câu hỏi)","slug":"slug-ascii","excerpt":"Tóm tắt dưới 155 ký tự","category":"chiem-tinh|triet-hoc|thuc-hanh|van-han|nhan-vat|so-sanh","tags":["tag1","tag2","tag3"],"featured":false,"content":"markdown ~500 từ"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude ${res.status}`);
  }
  const data = await res.json();
  const text = data.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(text);
}

async function insertArticle(table, article) {
  const row = table === 'khao_luan'
    ? { slug:article.slug, title:article.title, excerpt:article.excerpt, category:article.category, tags:article.tags, featured:article.featured||false, content:article.content, created_at:new Date().toISOString() }
    : { slug:article.slug, title:article.title, excerpt:article.excerpt, category:article.category, tags:article.tags, content:article.content, created_at:new Date().toISOString() };
  return await sbFetch(`/${table}`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  });
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { written: 0, saved: 0, errors: [] };
  const startTime = Date.now();

  const topics = await popTopics(ARTICLES_PER_RUN);
  if (!topics.length) {
    console.log('[cron-khao-luan] topic_queue trống');
    return res.status(200).json({ message: 'No pending topics', results });
  }

  console.log(`[cron-khao-luan] ${topics.length} topics`);

  for (const t of topics) {
    if (Date.now() - startTime > 55000) {
      await updateTopicStatus(t.id, 'pending');
      break;
    }

    const table = t.type === 'tai-lieu' ? 'tai_lieu' : 'khao_luan';
    console.log(`[cron-khao-luan] "${t.topic.slice(0,50)}" → ${table}`);

    try {
      const ctx = await ragSearch(t.topic);
      const article = await writeArticle(t.topic, t.type || 'khao-luan', ctx);
      results.written++;

      let slug = article.slug || toSlug(article.title);
      if (await slugExists(table, slug)) slug = slug + '-' + Date.now().toString().slice(-4);
      article.slug = slug;

      const saved = await insertArticle(table, article);
      if (saved.ok) {
        results.saved++;
        console.log(`[cron-khao-luan] ✅ ${table}: "${article.title.slice(0,50)}"`);
        await updateTopicStatus(t.id, 'done');
      } else {
        results.errors.push(`DB: ${JSON.stringify(saved.body).slice(0,80)}`);
        await updateTopicStatus(t.id, 'error');
      }
    } catch(e) {
      console.error(`[cron-khao-luan] ❌ ${e.message}`);
      results.errors.push(`${t.topic.slice(0,30)}: ${e.message.slice(0,60)}`);
      await updateTopicStatus(t.id, 'error');
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  return res.status(200).json({ message: 'OK', duration_ms: Date.now() - startTime, ...results });
}
