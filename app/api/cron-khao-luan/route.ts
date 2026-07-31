// app/api/cron-khao-luan/route.ts
// maxDuration 60 → 300: brand-check gate chèn thêm 1 lượt LLM soi bài, và khi
// bài trượt thì thêm 1 lượt viết lại (~6k token). Giữ trần 60s là tự đẩy mình
// vào timeout ngay lượt đầu có bài cần sửa. 300 = trần Node của Vercel Pro,
// cũng là con số cron-master-write đang dùng.
export const maxDuration = 300;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { llmText } from '@/lib/llm/complete';
import { withCronLog } from '@/lib/cron/log';
import { brandCheck } from '@/lib/content/brand-check';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
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
const MASTER_IDS = ['huyen-khong','tu-nguyen','linh-son','dau-nam','ngoc-tinh','thien-an','thanh-hu','bac-minh','thai-hu','tam-kinh','co-nguyet','linh-co','dieu-khong','nhat-nguyen','tinh-quang'];

async function pickAuthor(): Promise<string> {
  try {
    const r = await sbFetch('/khao_luan?select=master_id&master_id=not.is.null');
    if (!r.ok || !r.body?.length) return MASTER_IDS[0];
    const counts: Record<string, number> = {};
    for (const id of MASTER_IDS) counts[id] = 0;
    for (const row of r.body as {master_id: string}[]) {
      if (counts[row.master_id] !== undefined) counts[row.master_id]++;
    }
    return MASTER_IDS.reduce((a, b) => counts[a] <= counts[b] ? a : b);
  } catch { return MASTER_IDS[Math.floor(Math.random() * MASTER_IDS.length)]; }
}

async function writeArticle(topic: string, ctx: string) {
  const ctxBlock = ctx || '(Dùng kiến thức Tử Vi Đẩu Số tổng quát)';
  const prompt = `Đóng vai nhà nghiên cứu Tử Vi, văn phong nho nhã, điềm đạm, súc tích.
Câu hỏi: ${topic}
Tài liệu (BẮT BUỘC bám sát, không bịa ngoài tài liệu):\n${ctxBlock}
Trả lời trực tiếp, ≤300 từ, không dùng bullet. Có 1 ví dụ thực tế.
Trả về JSON thuần (KHÔNG backtick):
{"title":"Tiêu đề có từ khóa","slug":"slug-ascii","excerpt":"Tóm tắt dưới 155 ký tự","category":"CHỌN 1 TRONG: hon-nhan|gia-dinh|tai-chinh|cong-viec|tinh-cach|van-han|dien-san|quan-he|benh-tat|con-cai","tags":["tag1","tag2"],"featured":false,"content":"markdown ≤300 từ"}`;

  const text = (await llmText({ prompt, maxTokens: 2000 })).trim().replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
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

  const results = { written: 0, saved: 0, blocked: 0, errors: [] as string[] };
  const startTime = Date.now();

  const topics = await popTopics(ARTICLES_PER_RUN);
  if (!topics.length) return ok({ message: 'No pending topics', results });

  for (const t of topics as {id:string;topic:string;type:string}[]) {
    if (Date.now() - startTime > 240000) { await updateStatus(t.id, 'pending'); break; }
    // popTopics không lọc theo type (chỉ cron-master-write lọc type=eq.master-article) →
    // né cả 'tai-lieu' (tài liệu tham khảo, không phải chủ đề bài) LẪN 'master-article'
    // (chủ đề đã dành riêng cho Nghiên Cứu) để không viết nhầm blog từ topic của kênh khác.
    if (t.type === 'tai-lieu' || t.type === 'master-article') { await updateStatus(t.id, 'pending'); continue; }
    try {
      const [ctx, masterId] = await Promise.all([ragSearch(t.topic), pickAuthor()]);
      const article = await writeArticle(t.topic, ctx);
      results.written++;
      let slug = article.slug || toSlug(article.title);
      if (await slugExists('khao_luan', slug)) slug = slug + '-' + Date.now().toString().slice(-4);
      article.slug = slug;

      // ── BRAND-CHECK GATE — bước QC cuối cùng còn chặn được ──────────────────
      // `khao_luan` không có cột publish_status: POST xong là bài LÊN THẲNG
      // trang. Nên gate phải đứng ĐÚNG ở đây, ngay trước sbFetch bên dưới.
      // Gate tự autofix phần máy móc và trả về `gate.content` đã sửa; ở mode
      // 'warn' (mặc định) nó không chặn, chỉ ghi `content_qc_log`.
      const gate = await brandCheck({
        content: article.content,
        title: article.title,
        slug: article.slug,
        profile: 'khao-luan',
        payload: article,
      });
      article.content = gate.content;
      if (!gate.pass) {
        // Bài bị chặn đã được cất nguyên văn trong content_qc_log.payload —
        // không insert, nhưng cũng không mất chữ. Topic đỗ ở 'qc_failed' để
        // lượt cron sau không nhặt lại (popTopics chỉ lấy status='pending');
        // muốn viết lại thì đặt tay về 'pending'.
        results.blocked++;
        results.errors.push(
          `QC chặn "${t.topic.slice(0, 30)}": ${gate.violations.filter(v => v.severity === 'block').map(v => v.rule).join(', ')}`,
        );
        await updateStatus(t.id, 'qc_failed');
        continue;
      }

      const saved = await sbFetch('/khao_luan', {
        method:'POST', headers:{'Prefer':'resolution=ignore-duplicates'},
        body:JSON.stringify({slug:article.slug, title:article.title, excerpt:article.excerpt, category:article.category, tags:article.tags, featured:article.featured||false, content:article.content, master_id:masterId, created_at:new Date().toISOString()}),
      });
      if (saved.ok) { results.saved++; await updateStatus(t.id, 'done'); }
      else { results.errors.push(`DB: ${JSON.stringify(saved.body).slice(0,80)}`); await updateStatus(t.id, 'error'); }
    } catch(e:unknown) { results.errors.push(`${t.topic.slice(0,30)}: ${(e as Error).message.slice(0,60)}`); await updateStatus(t.id, 'error'); }
    await new Promise(r => setTimeout(r, 1500));
  }

  return ok({ message: 'OK', duration_ms: Date.now() - startTime, ...results });
}

export async function GET(request: NextRequest) {
  return withCronLog('cron-khao-luan', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) { return handle(request); }
