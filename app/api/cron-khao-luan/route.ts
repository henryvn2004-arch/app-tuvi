// app/api/cron-khao-luan/route.ts
export const maxDuration = 60;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const OPENAI_KEY    = process.env.OPENAI_API_KEY!;
const ARTICLES_PER_RUN = 1;

async function sbFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { 'Content-Type':'application/json', 'apikey':SUPABASE_KEY, 'Authorization':`Bearer ${SUPABASE_KEY}`, ...(opts.headers as Record<string,string>||{}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

function toSlug(str: string) {
  return String(str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').replace(/[^a-z0-9\-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
}

async function popTopics(count: number) {
  const r = await sbFetch(`/topic_queue?status=eq.pending&order=priority.asc,created_at.asc&limit=${count}&select=id,topic,type,priority`);
  if (!r.ok || !r.body?.length) return [];
  const ids = r.body.map((t: {id: string}) => t.id);
  await sbFetch(`/topic_queue?id=in.(${ids.join(',')})`, { method:'PATCH', body:JSON.stringify({status:'processing'}) });
  return r.body;
}

async function updateStatus(id: string, status: string) {
  await sbFetch(`/topic_queue?id=eq.${id}`, { method:'PATCH', body:JSON.stringify({status, used_at:new Date().toISOString()}) });
}

async function slugExists(table: string, slug: string) {
  const r = await sbFetch(`/${table}?slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`);
  return r.ok && r.body?.length > 0;
}

async function embedText(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
    body:JSON.stringify({model:'text-embedding-3-small', input:text.slice(0,8000)}),
  });
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
  return (await res.json() as {data:{embedding:number[]}[]}).data[0].embedding;
}

async function ragSearch(topic: string) {
  if (!OPENAI_KEY) return '';
  try {
    const embedding = await embedText(topic);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method:'POST', headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},
      body:JSON.stringify({query_embedding:embedding, match_count:6, match_threshold:0.25}),
    });
    if (!res.ok) return '';
    const docs = await res.json() as {source:string;content:string}[];
    return docs.map(d=>`[${d.source}]\n${d.content}`).join('\n\n---\n\n');
  } catch { return ''; }
}

const VALID_KL_CATS = ['hon-nhan','gia-dinh','tai-chinh','cong-viec','tinh-cach','van-han','dien-san','quan-he','benh-tat','con-cai'];

async function writeArticle(topic: string, ctx: string) {
  const ctxBlock = ctx || '(Dùng kiến thức Tử Vi Đẩu Số tổng quát)';
  const prompt = `Đóng vai nhà nghiên cứu Tử Vi, văn phong nho nhã, điềm đạm, súc tích.
Câu hỏi: ${topic}
Tài liệu (BẮT BUỘC bám sát, không bịa ngoài tài liệu):\n${ctxBlock}
Trả lời trực tiếp, ≤300 từ, không dùng bullet. Có 1 ví dụ thực tế.
Trả về JSON thuần (KHÔNG backtick):
{"title":"Tiêu đề có từ khóa","slug":"slug-ascii","excerpt":"Tóm tắt dưới 155 ký tự","category":"CHỌN 1 TRONG: hon-nhan|gia-dinh|tai-chinh|cong-viec|tinh-cach|van-han|dien-san|quan-he|benh-tat|con-cai","tags":["tag1","tag2"],"featured":false,"content":"markdown ≤300 từ"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-5', max_tokens:2000, messages:[{role:'user',content:prompt}]}),
  });
  if (!res.ok) { const e = await res.json() as {error:{message:string}}; throw new Error(e.error?.message||`Claude ${res.status}`); }
  const data = await res.json() as {content:{text:string}[]};
  const text = data.content[0].text.trim().replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
  const article = JSON.parse(text);

  if (!VALID_KL_CATS.includes(article.category)) article.category = 'tinh-cach';
  const rawTags = Array.isArray(article.tags) ? article.tags as string[] : [];
  article.tags = rawTags.filter((t: string) => VALID_KL_CATS.includes(t));
  if (!article.tags.includes(article.category)) article.tags.unshift(article.category);
  if (article.tags.length === 0) article.tags = [article.category];
  return article;
}

export async function OPTIONS() { return options(); }

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);

  const results = { written: 0, saved: 0, errors: [] as string[] };
  const startTime = Date.now();

  const topics = await popTopics(ARTICLES_PER_RUN);
  if (!topics.length) return ok({ message: 'No pending topics', results });

  for (const t of topics as {id:string;topic:string;type:string}[]) {
    if (Date.now() - startTime > 55000) { await updateStatus(t.id, 'pending'); break; }
    if (t.type === 'tai-lieu') { await updateStatus(t.id, 'pending'); continue; }
    try {
      const ctx = await ragSearch(t.topic);
      const article = await writeArticle(t.topic, ctx);
      results.written++;
      let slug = article.slug || toSlug(article.title);
      if (await slugExists('khao_luan', slug)) slug = slug + '-' + Date.now().toString().slice(-4);
      article.slug = slug;
      const saved = await sbFetch('/khao_luan', {
        method:'POST', headers:{'Prefer':'resolution=ignore-duplicates'},
        body:JSON.stringify({slug:article.slug, title:article.title, excerpt:article.excerpt, category:article.category, tags:article.tags, featured:article.featured||false, content:article.content, created_at:new Date().toISOString()}),
      });
      if (saved.ok) { results.saved++; await updateStatus(t.id, 'done'); }
      else { results.errors.push(`DB: ${JSON.stringify(saved.body).slice(0,80)}`); await updateStatus(t.id, 'error'); }
    } catch(e:unknown) { results.errors.push(`${t.topic.slice(0,30)}: ${(e as Error).message.slice(0,60)}`); await updateStatus(t.id, 'error'); }
    await new Promise(r => setTimeout(r, 1500));
  }

  return ok({ message: 'OK', duration_ms: Date.now() - startTime, ...results });
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }
