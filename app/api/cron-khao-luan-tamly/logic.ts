// app/api/cron-khao-luan-tamly/logic.ts
// ============================================================
// NHÁNH TÂM LÝ/XÃ HỘI của bài Vấn Đáp — cùng bảng `khao_luan`, cùng định dạng
// (~1.400 ký tự, ngôi thứ ba), NHƯNG khác `cron-khao-luan` ở đúng MỘT chỗ:
// mỗi lượt chỉ pop ĐÚNG 1 CHỦ ĐỀ RỘNG (`topic_queue.type = 'khao-luan-tamly'`,
// xem `TAMLY_THEMES` trong `lib/content/topic-topup.ts`), rồi nhờ MỘT lượt Kimi
// nở nó thành 3–5 bài Vấn Đáp góc khác nhau — mỗi góc neo vào một cung/sao
// riêng lấy từ RAG, để chúng thực sự là 5 bài khác nhau chứ không phải 1 bài
// viết lại 5 lần.
//
// Vì sao BẮT BUỘC Kimi (`provider: 'kimi'` — xem `lib/llm/complete.ts`): đề tài
// tâm lý cần một hơi văn khác hẳn — Kimi được chọn thử nghiệm riêng cho nhánh
// này, ĐỘC LẬP với `chat.standalone_provider` đang quyết định provider cho
// toàn site (hiện là Gemini, xem header `lib/llm/complete.ts`). Có override thì
// vẫn giữ NGUYÊN chuỗi fallback nếu Kimi lỗi/timeout — không phải "chỉ dùng
// đúng Kimi rồi bỏ cuộc".
//
// 🔴 RANH GIỚI AN TOÀN — đọc trước khi sửa prompt: đề tài này chạm cảm xúc/
// quan hệ/áp lực sống, nên brand-check ở đây dùng profile RIÊNG
// `khao-luan-tamly` (`lib/content/brand-check.ts`), ghim cứng `mode:'block'`
// bất kể cấu hình chung, và có 2 luật thêm mà 2 bề mặt kia không có:
// `chan-doan-y-khoa` (cấm gán chẩn đoán tâm thần cụ thể như sự thật rút từ lá
// số) và `khung-hoang-that` (nhắc khủng hoảng thật mà không chỉ đường ra thì
// chặn). Prompt bên dưới lặp lại 2 luật đó ở TẦNG SINH (phòng trước khi phải
// bắt), gate là lớp chặn CUỐI, không phải lớp duy nhất.
//
// 🔴 TRẦN TUẦN — nhánh mới, chưa ai đọc qua ngoài chính Henry lúc soát. Trước
// khi pop chủ đề, hàm này đọc `app_config['content.khao_luan_tamly_weekly_cap']`
// (mặc định 2) đếm số CHỦ ĐỀ đã xong trong 7 ngày qua; chạm trần thì bỏ qua
// lượt này, KHÔNG pop. Đây là một cầu dao VẬN HÀNH độc lập với lịch cron (đổi
// bằng một câu SQL, không cần deploy) — phòng trường hợp lịch bị nới sau này
// mà quên xét lại quy mô nhánh còn non này.
//
// 🔑 File này CỐ Ý KHÔNG import `next/server` (trực tiếp hay gián tiếp qua
// `@/lib/cors`) — xem chú thích tại khai báo `processOneRun` dưới đây. Toàn bộ
// nghiệp vụ THẬT của route sống ở đây; `route.ts` chỉ còn lại lớp vỏ mỏng
// (đọc header, gọi hàm này, bọc `NextResponse`).
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { parseLlmJson } from '@/lib/llm/json';
import { brandCheck } from '@/lib/content/brand-check';
import { BRAND_FORMAT_RULES } from '@/lib/content/brand-rules';
import { ARC_SEO_VAN_DAP, HOOK_RULES } from '@/lib/content/viral-core';
import { initialPublishStatus } from '@/lib/content/publish-filter';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

const CAP_CONFIG_KEY = 'content.khao_luan_tamly_weekly_cap';
// khớp 2 lịch/tuần × 1 chủ đề/lượt — T4 (bám sát ngay sau lượt topic-topup
// gieo chủ đề mỗi T4 sáng, xem vercel.json) + T7 (còn dư 3 ngày trước lượt
// gieo kế tiếp).
const CAP_DEFAULT = 2;

async function sbFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

function toSlug(str: string) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function popOneTopic() {
  const r = await sbFetch(
    '/topic_queue?status=eq.pending&type=eq.khao-luan-tamly&order=priority.asc,created_at.asc&limit=1&select=id,topic,type,priority',
  );
  if (!r.ok || !r.body?.length) return null;
  const row = r.body[0] as { id: string; topic: string; type: string; priority: number };
  await sbFetch(`/topic_queue?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'processing' }) });
  return row;
}

async function updateTopicStatus(id: string, status: string) {
  await sbFetch(`/topic_queue?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, used_at: new Date().toISOString() }),
  });
}

/** Đếm CHỦ ĐỀ (không phải BÀI) đã xong trong 7 ngày qua — đơn vị của trần tuần. */
async function countDoneLast7Days(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
  const r = await sbFetch(
    `/topic_queue?type=eq.khao-luan-tamly&status=eq.done&used_at=gte.${encodeURIComponent(cutoff)}&select=id`,
  );
  return r.ok && Array.isArray(r.body) ? r.body.length : 0;
}

async function slugExists(slug: string) {
  const r = await sbFetch(`/khao_luan?slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`);
  return r.ok && r.body?.length > 0;
}

async function embedText(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
  return (await res.json() as { data: { embedding: number[] }[] }).data[0].embedding;
}

// match_count nâng lên 10 (gấp đôi cron-khao-luan) — 1 CHỦ ĐỀ RỘNG cần đủ chất
// liệu để gieo 3–5 GÓC KHÁC NHAU, mỗi góc neo một cung/sao riêng; 6 tài liệu
// (mức của cron-khao-luan, viết đúng 1 bài) thường không đủ đa dạng cho việc đó.
async function ragSearch(topic: string) {
  if (!OPENAI_KEY) return '';
  try {
    const embedding = await embedText(topic);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 10, match_threshold: 0.25 }),
    });
    if (!res.ok) return '';
    const docs = (await res.json()) as { source: string; content: string }[];
    return docs.map((d) => `[${d.source}]\n${d.content}`).join('\n\n---\n\n');
  } catch {
    return '';
  }
}

const VALID_TAMLY_CATS = ['tinh-cach', 'quan-he', 'benh-tat'];

/** Shape MỘT bài trong bộ 3–5 — cùng shape `khao_luan` như cron-khao-luan. */
interface TamLyArticle {
  title: string;
  slug?: string;
  excerpt?: string;
  category: string;
  tags: unknown;
  featured?: boolean;
  content: string;
}

/**
 * MỘT lượt Kimi, MỘT chủ đề rộng vào, 3–5 bài Vấn Đáp ra — mỗi bài đã được
 * chuẩn hoá category/tags giống hệt cách `writeArticle()` của cron-khao-luan
 * làm cho MỘT bài, chỉ lặp lại cho từng phần tử của mảng.
 */
async function writeQaSet(theme: string, ctx: string): Promise<TamLyArticle[]> {
  const ctxBlock = ctx || '(Dùng kiến thức Tử Vi Đẩu Số tổng quát)';

  const prompt = `Bạn là chuyên gia Tử Vi, nhưng VIẾT như một content creator TÂM LÝ HỌC: người đọc phải thấy "đúng mình", nhận được một góc nhìn mới, và hiểu được mà không cần biết một thuật ngữ nào.

CHỦ ĐỀ RỘNG (một khung tâm lý/xã hội, KHÔNG PHẢI một câu hỏi đơn lẻ): ${theme}
Tài liệu (BẮT BUỘC bám sát, không bịa ngoài tài liệu):
${ctxBlock}

NHIỆM VỤ: viết TỪ 3 ĐẾN 5 bài Vấn Đáp ngắn, mỗi bài là MỘT GÓC CỤ THỂ khác nhau
trong chủ đề trên — KHÔNG PHẢI 3–5 cách diễn đạt lại CÙNG một ý. Mỗi bài phải:
- Neo vào MỘT cung/sao/cách cục RIÊNG lấy từ tài liệu, KHÁC nhau giữa các bài —
  đây là thứ làm chúng thực sự là những bài khác nhau, không phải một bài bị
  viết lại nhiều lần.
- Có một câu hỏi cụ thể làm tiêu đề, và nội dung KHÔNG trùng ý với bài khác
  trong CÙNG bộ này.
- ƯU TIÊN ĐỦ VÀ ĐÚNG HƠN NHIỀU: nếu tài liệu không đủ chất liệu cho 5 góc THỰC
  SỰ khác nhau thì viết 3 bài tốt vẫn hơn ép đủ 5 bài trùng ý.

${ARC_SEO_VAN_DAP}

${HOOK_RULES}

${BRAND_FORMAT_RULES}

── RANH GIỚI AN TOÀN (đề tài này chạm cảm xúc/quan hệ/áp lực sống — bắt buộc, áp cho MỌI bài trong bộ) ──
- KHÔNG gán một chẩn đoán tâm thần/y khoa CỤ THỂ (trầm cảm, rối loạn lo âu, rối
  loạn lưỡng cực, PTSD, tâm thần phân liệt...) cho người đọc/đương số NHƯ MỘT
  SỰ THẬT rút ra từ lá số. Nói "cung X dễ mang tâm trạng nặng nề, dễ suy nghĩ
  nhiều" là NGÔN NGỮ TỬ VI BÌNH THƯỜNG, ĐƯỢC. Gọi thẳng TÊN một bệnh cụ thể làm
  chẩn đoán ("bạn đang bị trầm cảm") thì KHÔNG.
- Bàn về nỗi buồn, mất mát, áp lực sống, xung đột gia đình như đề tài đời
  thường LÀ ĐÚNG mảng bài này viết — đừng né tránh chúng.
- CHỈ KHI một bài chạm tới dấu hiệu KHỦNG HOẢNG THẬT (ý định tự hại, một khủng
  hoảng đang diễn ra) thì bài đó PHẢI có câu hướng người đọc tới người thân,
  bạn bè, chuyên gia tâm lý, hoặc số 115 — và TUYỆT ĐỐI không ngầm ý rằng lá
  số/tử vi thay được sự giúp đỡ đó. TUYỆT ĐỐI không bịa thêm số điện thoại hay
  tên tổ chức nào khác ngoài 115.

Trả về JSON thuần (KHÔNG backtick), mảng "articles" có TỪ 3 ĐẾN 5 phần tử:
{"articles":[{"title":"Tiêu đề ≤60 ký tự theo luật ở trên","slug":"slug-ascii","excerpt":"Tóm tắt ≤155 ký tự theo luật ở trên","category":"CHỌN 1 TRONG: tinh-cach|quan-he|benh-tat","tags":["tag1","tag2"],"featured":false,"content":"markdown 1.200–1.600 ký tự"}]}`;

  // `provider:'kimi'` (task #16) — ép Kimi lên đầu cho ĐÚNG lượt này, không đụng
  // `chat.standalone_provider` (đang là 'gemini' cho toàn site); Kimi lỗi thì
  // vẫn rơi đúng xuống 2 provider còn lại trong CANONICAL_ORDER.
  const r = await llmTextFull({ prompt, maxTokens: 15000, json: true, provider: 'kimi' });
  void logLlmUsage(
    'cron-khao-luan-tamly',
    r.model,
    {
      input_tokens: r.usage.input_tokens,
      output_tokens: r.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    r.durationMs,
  );

  const parsed = parseLlmJson(r.text) as { articles?: TamLyArticle[] } | null;
  if (!parsed?.articles?.length) {
    console.warn(
      `[cron-khao-luan-tamly] parse hỏng (${r.text.length} ký tự). Đầu: ${r.text.slice(0, 120)}`,
    );
    throw new Error('khao-luan-tamly: không parse được JSON hoặc mảng articles rỗng');
  }

  return parsed.articles
    .filter((a) => a && a.title && a.content)
    .map((a) => {
      const category = VALID_TAMLY_CATS.includes(a.category) ? a.category : 'tinh-cach';
      const rawTags = Array.isArray(a.tags) ? (a.tags as unknown[]) : [];
      const tags = rawTags.filter((t): t is string => typeof t === 'string' && VALID_TAMLY_CATS.includes(t));
      if (!tags.includes(category)) tags.unshift(category);
      return { ...a, category, tags: tags.length ? tags : [category] };
    });
}

// ── Chống trùng TRONG CÙNG MỘT BỘ ────────────────────────────────────────────
// Model được dặn viết 5 góc khác nhau, nhưng "dặn" không phải "chắc chắn" — đây
// là chốt kiểm rẻ, RIÊNG cho việc so 3–5 tiêu đề với NHAU (không phải so với
// toàn bộ khao_luan — phạm vi đó thuộc `lib/content/topic-topup.ts`, module
// private nên không kéo sang đây được, và không cần: batch này nhỏ, so trong
// batch là đủ chặn ca "ép đủ 5 bài bằng cách viết lại cùng một ý").
function tamlyTokens(s: string): Set<string> {
  const flat = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ');
  return new Set(flat.split(/\s+/).filter((w) => w.length > 2));
}
function tamlyOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / Math.min(a.size, b.size);
}
const TAMLY_DUP_THRESHOLD = 0.7;

export interface TamLyRunResult {
  message: string;
  results: { written: number; saved: number; blocked: number; errors: string[] };
}

/**
 * TOÀN BỘ nghiệp vụ của một lượt cron, tách khỏi `NextRequest`/`NextResponse`
 * (`next/server`) một cách CÓ CHỦ ĐÍCH — không phải refactor cho gọn.
 *
 * `next/server` biên dịch NGOÀI runtime Next thật (vd harness test chạy bằng
 * `tsc` + `node` trần) từng làm V8 OOM lúc biên dịch regex nội bộ của nó (nợ
 * đã ghi ở track CMO Digest). File NÀY không import `next/server` (trực tiếp
 * hay gián tiếp qua `@/lib/cors`) nên compile+chạy trần được — verify #17 chạy
 * đúng cách này. `route.ts` chỉ còn lại đúng phần vỏ (đọc header, gọi hàm này,
 * bọc `NextResponse`) — thứ đã có tiền lệ đúng ở `cron-khao-luan/route.ts`.
 */
export async function processOneRun(): Promise<TamLyRunResult> {
  const results = { written: 0, saved: 0, blocked: 0, errors: [] as string[] };

  const cap = await getConfigValue<number>(CAP_CONFIG_KEY, CAP_DEFAULT);
  if (cap > 0) {
    const doneRecent = await countDoneLast7Days();
    if (doneRecent >= cap) {
      return {
        message: `Đã chạm trần tuần (${doneRecent}/${cap} chủ đề đã xong trong 7 ngày qua) — bỏ qua lượt này`,
        results,
      };
    }
  }

  const topic = await popOneTopic();
  if (!topic) return { message: 'No pending topics', results };

  try {
    const ctx = await ragSearch(topic.topic);
    const articles = await writeQaSet(topic.topic, ctx);
    results.written = articles.length;

    const batchTitles: Set<string>[] = [];
    const batchSlugs = new Set<string>();
    let savedAny = false;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const tks = tamlyTokens(article.title);
      if (batchTitles.some((t) => tamlyOverlap(tks, t) >= TAMLY_DUP_THRESHOLD)) {
        results.errors.push(`Bỏ bài trùng ý trong cùng bộ: "${article.title.slice(0, 40)}"`);
        continue;
      }
      batchTitles.push(tks);

      let slug = article.slug || toSlug(article.title);
      if (batchSlugs.has(slug) || (await slugExists(slug))) {
        slug = `${slug}-${Date.now().toString().slice(-4)}-${i}`;
      }
      batchSlugs.add(slug);
      article.slug = slug;

      // ── BRAND-CHECK GATE, profile RIÊNG cho nhánh tâm lý (task #16) ──
      // `khao-luan-tamly` ghim `mode:'block'` bất kể `content.brand_check`
      // đang set gì cho 2 bề mặt kia, và soi lại CẢ tầng LLM sau repair (lỗ
      // hổng đã vá — xem chú thích trong `brand-check.ts`).
      const gate = await brandCheck({
        content: article.content,
        title: article.title,
        slug: article.slug,
        profile: 'khao-luan-tamly',
        payload: article,
      });
      article.content = gate.content;
      if (!gate.pass) {
        results.blocked++;
        results.errors.push(
          `QC chặn "${article.title.slice(0, 30)}": ${gate.violations
            .filter((v) => v.severity === 'block')
            .map((v) => v.rule)
            .join(', ')}`,
        );
        continue;
      }

      const savedRow = await sbFetch('/khao_luan', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          category: article.category,
          tags: article.tags,
          featured: article.featured || false,
          content: article.content,
          master_id: null,
          created_at: new Date().toISOString(),
          publish_status: await initialPublishStatus(),
        }),
      });
      if (savedRow.ok) {
        results.saved++;
        savedAny = true;
      } else {
        results.errors.push(`DB "${article.title.slice(0, 30)}": ${JSON.stringify(savedRow.body).slice(0, 80)}`);
      }
    }

    // Trạng thái CHỦ ĐỀ (không phải BÀI): ít nhất 1 bài lên được coi là chủ đề
    // đã xong — nở hụt (3 thay vì 5) không phải lỗi. 0 bài lên vì gate chặn hết
    // → 'qc_failed' (giữ nguyên vocab của cron-khao-luan, khác 'error' kỹ thuật).
    if (savedAny) await updateTopicStatus(topic.id, 'done');
    else if (results.blocked > 0) await updateTopicStatus(topic.id, 'qc_failed');
    else await updateTopicStatus(topic.id, 'error');
  } catch (e: unknown) {
    results.errors.push(`${topic.topic.slice(0, 30)}: ${(e as Error).message.slice(0, 80)}`);
    await updateTopicStatus(topic.id, 'error');
  }

  return { message: 'OK', results };
}
