// app/api/cron/viral-seo-pages/route.ts
// Viết lại `content`/`title`/`meta_description` của seo_pages (category
// tuong-hop-hon-nhan · tuong-hop-lam-an — 7.080/8.958 dòng) bằng viral-core.
//
// 🔴 VÌ SAO CẦN JOB NÀY: nội dung hiện tại của 2 category này do
// `scripts/rewrite-tuvi-compat.mjs` sinh — một bộ TEMPLATE TẤT ĐỊNH (không
// LLM), có tiêu đề con "### 1. Phân Tích Thiên Can", đánh số mục — đúng thứ
// `lib/content/viral-core.ts` CẤM ("không tiêu đề con, không đánh số mục, mở
// bằng hook"). Job này KHÔNG thay công thức tính tương hợp — `analyze()` (từ
// chính `scripts/tuvi-compat/analyze.mjs`, dùng lại nguyên bản, không chép
// lại) vẫn là NGUỒN DUY NHẤT cho can/chi/nạp âm/điểm/xếp loại; job chỉ đổi
// LỚP VĂN bọc quanh các con số đó, giống hệt ranh giới engine/render mà
// `van-han-12.ts` và các route luận giải khác đã giữ.
//
// maxDuration 300: cùng trần các cron LLM khác (cron-khao-luan/master-write).
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { parseLlmJson } from '@/lib/llm/json';
import { withCronLog } from '@/lib/cron/log';
import { brandCheck } from '@/lib/content/brand-check';
import { BRAND_FORMAT_RULES } from '@/lib/content/brand-rules';
import { ARC_SEO_VAN_DAP, HOOK_RULES } from '@/lib/content/viral-core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs thuần, không có type khai báo; `analyze()`/`parseSlug()`
// là NGUỒN SỐ DUY NHẤT (xem chú thích ở đầu file), cố ý KHÔNG chép lại ở đây.
import { parseSlug, analyze } from '../../../../scripts/tuvi-compat/analyze.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// 7.080 dòng / ~120 dòng-mỗi-ngày ≈ 59 ngày. Cố ý CHẬM: đây là viết lại nội
// dung ĐÃ index, không phải trang mới — không có gì gấp, và rải nhiều ngày là
// ĐIỀU KIỆN để tránh `lastmod` toàn site nhảy một lượt (xem migration kèm job
// này). Nếu cần nhanh hơn, tăng con số này chứ ĐỪNG thêm suất chạy/ngày — mỗi
// suất là một lượt PATCH `content`, tăng suất/ngày mới thật sự làm lastmod dồn cục.
const BATCH_PER_RUN = 120;
// Concurrency cho LLM call — thấp hơn hẳn CONC=20 mặc định của
// rewrite-tuvi-compat.mjs vì đây là gọi LLM thật (giây/lượt), không phải
// ghép chuỗi tất định (mili-giây/lượt).
const CONCURRENCY = 6;
const CATS = ['tuong-hop-hon-nhan', 'tuong-hop-lam-an'];

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

interface SeoPageRow {
  id: number;
  slug: string;
  category: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VERDICT_LABEL: Record<string, string> = {
  'rat-hop': 'rất hợp',
  hop: 'hợp',
  kha: 'khá',
  'trung-binh': 'trung bình',
  'khong-hop': 'không hợp',
};

// Bọc facts đã tính (KHÔNG diễn giải, KHÔNG suy luận thêm) thành khối tài liệu
// cho LLM bám vào — cùng khuôn "BẮT BUỘC bám sát, không bịa ngoài tài liệu"
// mà cron-khao-luan đang dùng.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFactContext(a: any): string {
  const hoaCan = a.canRel.hoaHanh ? ` (hóa ${a.canRel.hoaHanh})` : '';
  const hoaChi = a.chiRel.hoaHanh ? ` (hóa ${a.chiRel.hoaHanh})` : '';
  return [
    `Người A — ${a.tuoiAName}: Can ${a.canA.name} (hành ${a.canA.hanh}, ${a.canA.am ? 'âm' : 'dương'}); Chi ${a.chiA.name} (hành ${a.chiA.hanh}, mùa ${a.chiA.mua}); Nạp Âm ${a.naA.napAm} (${a.naA.napAmHanh}).`,
    `Người B — ${a.tuoiBName}: Can ${a.canB.name} (hành ${a.canB.hanh}, ${a.canB.am ? 'âm' : 'dương'}); Chi ${a.chiB.name} (hành ${a.chiB.hanh}, mùa ${a.chiB.mua}); Nạp Âm ${a.naB.napAm} (${a.naB.napAmHanh}).`,
    `Quan hệ Thiên Can: ${a.canRel.desc}${hoaCan}.`,
    `Quan hệ Địa Chi: ${a.chiRel.desc}${hoaChi}.`,
    `Quan hệ Nạp Âm: ${a.naRel.desc}.`,
    `Điểm tương hợp tổng (đã tính sẵn, KHÔNG suy đoán lại): ${a.score}/100 — xếp loại "${VERDICT_LABEL[a.verdict] || a.verdict}".`,
  ].join('\n');
}

interface ViralArticle {
  title: string;
  excerpt: string;
  content: string;
}

async function writeArticle(cat: string, ctx: string, tuoiAName: string, tuoiBName: string): Promise<ViralArticle> {
  const cauHoi =
    cat === 'honnhan'
      ? `Tuổi ${tuoiAName} và ${tuoiBName} có hợp nhau trong hôn nhân không?`
      : `Tuổi ${tuoiAName} và ${tuoiBName} có hợp nhau khi hợp tác làm ăn, kinh doanh không?`;
  const prompt = `Bạn là chuyên gia Tử Vi/Tử Bình, nhưng VIẾT như một content creator tâm lý học: người đọc phải thấy "đúng mình", nhận được một góc nhìn mới, và hiểu được mà không cần biết một thuật ngữ nào.
Câu hỏi: ${cauHoi}
Tài liệu (BẮT BUỘC bám sát, không bịa ngoài tài liệu):
${ctx}

${ARC_SEO_VAN_DAP}

${HOOK_RULES}

${BRAND_FORMAT_RULES}
Trả về JSON thuần (KHÔNG backtick):
{"title":"Tiêu đề ≤60 ký tự theo luật ở trên","excerpt":"Tóm tắt ≤155 ký tự theo luật ở trên","content":"markdown 1.200–1.600 ký tự"}`;

  const r = await llmTextFull({ prompt, maxTokens: 3000, json: true });
  void logLlmUsage(
    'viral-seo-pages',
    r.model,
    {
      input_tokens: r.usage.input_tokens,
      output_tokens: r.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    r.durationMs,
  );
  const article = parseLlmJson(r.text) as ViralArticle | null;
  if (!article) throw new Error(`parse hỏng (${r.text.length} ký tự): ${r.text.slice(0, 120)}`);
  return article;
}

async function runWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function processRow(row: SeoPageRow): Promise<{ ok: boolean; slug: string; error?: string }> {
  const parsed = parseSlug(row.slug);
  if (!parsed) return { ok: false, slug: row.slug, error: 'slug-parse-failed' };
  const a = analyze(parsed.A, parsed.B);
  const ctx = buildFactContext(a);

  try {
    const article = await writeArticle(parsed.cat, ctx, a.tuoiAName, a.tuoiBName);

    // Cùng profile 'khao-luan': cùng khuôn arc (ARC_SEO_VAN_DAP), cùng dải độ
    // dài ~1.200-1.600 ký tự, cùng ngôi thứ ba — không phải bề mặt mới cần
    // profile riêng trong brand-check.ts.
    const gate = await brandCheck({
      content: article.content,
      title: article.title,
      slug: row.slug,
      profile: 'khao-luan',
      payload: article,
    });
    article.content = gate.content;
    if (!gate.pass) {
      return {
        ok: false,
        slug: row.slug,
        error: `QC chặn: ${gate.violations.filter((v) => v.severity === 'block').map((v) => v.rule).join(', ')}`,
      };
    }

    const patched = await sbFetch(`/seo_pages?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        title: article.title,
        meta_description: article.excerpt,
        content: article.content,
        viral_applied: true,
      }),
    });
    if (!patched.ok) return { ok: false, slug: row.slug, error: `DB PATCH ${patched.status}` };
    return { ok: true, slug: row.slug };
  } catch (e: unknown) {
    return { ok: false, slug: row.slug, error: (e as Error).message.slice(0, 120) };
  }
}

export async function OPTIONS() {
  return options();
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);

  const startTime = Date.now();
  const catFilter = `category=in.(${CATS.join(',')})`;
  const rowsRes = await sbFetch(
    `/seo_pages?${catFilter}&viral_applied=eq.false&select=id,slug,category&order=id.asc&limit=${BATCH_PER_RUN}`,
  );
  if (!rowsRes.ok) return err(`Đọc seo_pages lỗi: ${rowsRes.status}`, 500);
  const rows = (rowsRes.body || []) as SeoPageRow[];
  if (!rows.length) return ok({ message: 'Hết dòng cần viết lại — đã xong toàn bộ.', results: { ok: 0, fail: 0 } });

  const outcomes = await runWithConcurrency(rows, processRow, CONCURRENCY);
  const okCount = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.filter((o) => !o.ok);

  return ok({
    message: 'OK',
    duration_ms: Date.now() - startTime,
    results: {
      ok: okCount,
      fail: failed.length,
      errors: failed.slice(0, 10).map((f) => `${f.slug}: ${f.error}`),
    },
  });
}

export async function GET(request: NextRequest) {
  return withCronLog('viral-seo-pages', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) {
  return handle(request);
}
