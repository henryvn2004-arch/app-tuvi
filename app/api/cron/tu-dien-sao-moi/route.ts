// app/api/cron/tu-dien-sao-moi/route.ts
// Viết bài cho các sao có trong STAR_DATA nhưng CHƯA có trang riêng trong
// tu_dien.
//
// Bối cảnh: đối chiếu 88 sao tu_dien ↔ 111 sao engine (PR #954) từng báo "33
// mới thật". Rà lại kỹ hơn phát hiện con số đó SAI:
//   - 12 tên là các giai đoạn Vòng Trường Sinh (Tràng Sinh…Dưỡng) — ĐÃ có
//     trang gộp "12 Sao Trường Sinh" (sao-truong-sinh). Tách riêng là trùng.
//   - "Thiên La"/"Địa Võng" — ĐÃ gộp trong "Thiên La Địa Võng"
//     (sao-thien-la-dia-vong). Tách riêng là trùng.
//   - "Tuần"/"Triệt" — ĐÃ gộp trong "Tuần Triệt" (sao-tuan-triet). Tách riêng
//     là trùng.
//   - "Phúc Đức" — KHÔNG thiếu, chỉ là tu_dien đặt tên "Sao Phúc Đức (Lưu
//     Niên)" (sao-phuc-duc-ls) nên bộ đối chiếu tên KHÔNG khớp ra. Route này
//     backfill `xuong` cho dòng đó thay vì tạo trang trùng.
// Còn lại ĐÚNG 16 sao thật sự chưa có bài — NEW_STARS bên dưới.
//
// 🔴 tu_dien KHÔNG có publish_status (khác thu_vien_muc) — insert xong LÊN
// THẲNG trang, không có cửa draft. Route CHỈ có 16+1 việc, tự dừng (skip) khi
// hết — cùng kiểu bounded-backlog với viral-seo-pages.
//
// 🔴 KHÔNG đụng `ten_han` — comment cột trong migration-thu-vien.sql ghi rõ
// "KHÔNG suy từ trí nhớ, phải đối chiếu nguồn". Để NULL. Cùng lý do, prompt
// CẤM chèn Hán tự trong `content`.
//
// 🔴 2 slug PHẢI ghi tay, không dùng slugify mặc định — trùng slug ASCII với
// 2 dòng đã có (chỉ khác dấu thanh, không phải lỗi chính tả — xem
// migration-thu-vien.sql "Tả Phù"≠"Tả Phụ"):
//   'Tả Phụ'  → slugify mặc định ra "sao-ta-phu", trùng "Sao Tả Phù" đã có.
//   'Quan Phủ' → slugify mặc định ra "sao-quan-phu", trùng "Sao Quan Phù"
//                (1 trong 12 sao lưu niên) đã có.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ok, err, options } from '@/lib/cors';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { parseLlmJson } from '@/lib/llm/json';
import { withCronLog } from '@/lib/cron/log';
import { brandCheck } from '@/lib/content/brand-check';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

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

const NEW_STARS: Array<{ ten: string; slug: string }> = [
  { ten: 'Lưu Hà', slug: 'sao-luu-ha' },
  { ten: 'Thiên Riêu', slug: 'sao-thien-rieu' },
  { ten: 'Thiên Thương', slug: 'sao-thien-thuong' },
  { ten: 'Thiên Sứ', slug: 'sao-thien-su' },
  { ten: 'Tả Phụ', slug: 'sao-ta-phu-tinh' },
  { ten: 'Thiên Giải', slug: 'sao-thien-giai' },
  { ten: 'Địa Giải', slug: 'sao-dia-giai' },
  { ten: 'Thiên Y', slug: 'sao-thien-y' },
  { ten: 'Hoa Cái', slug: 'sao-hoa-cai' },
  { ten: 'Thiên Trù', slug: 'sao-thien-tru' },
  { ten: 'Quốc Ấn', slug: 'sao-quoc-an' },
  { ten: 'Đường Phù', slug: 'sao-duong-phu' },
  { ten: 'Tuế Phá', slug: 'sao-tue-pha' },
  { ten: 'Đẩu Quân', slug: 'sao-dau-quan' },
  { ten: 'Quan Phủ', slug: 'sao-quan-phu-tinh' },
  { ten: 'Lưu Niên Văn Tinh', slug: 'sao-luu-nien-van-tinh' },
];

const XUONG_BACKFILL_SLUG = 'sao-phuc-duc-ls';
const XUONG_BACKFILL_STAR = 'Phúc Đức';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface StarFacts {
  type: string;
  element?: string;
  weight: number;
  traits: string[];
  positions?: { dac?: string[]; ham?: string[] };
}

let starDataCache: Record<string, StarFacts> | null = null;
function loadStarData(): Record<string, StarFacts> {
  if (starDataCache) return starDataCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  g.window = g;
  starDataCache = (
    new Function('window', 'globalThis', code + '\nreturn { STAR_DATA };')(g, g) as {
      STAR_DATA: Record<string, StarFacts>;
    }
  ).STAR_DATA;
  return starDataCache;
}

interface Bio {
  seo_title: string;
  seo_desc: string;
  content: string;
  tags: string[];
}

async function writeBio(ten: string, facts: StarFacts): Promise<Bio> {
  const factLines = [
    `Loại: ${facts.type}`,
    facts.element ? `Hành: ${facts.element}` : '',
    `Đặc tính: ${facts.traits.join(', ')}`,
    facts.positions?.dac ? `Đắc địa tại: ${facts.positions.dac.join(', ')}` : '',
    facts.positions?.ham ? `Hãm địa tại: ${facts.positions.ham.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `Viết mục từ điển Tử Vi Đẩu Số cho sao "${ten}" trên tuviminhbao.com — cùng thể loại các mục sao khác đã có (markdown, đầu mục "## ", KHÔNG dùng "# ").

Dữ kiện tất định (BẮT BUỘC bám sát, không bịa thêm ngoài đây):
${factLines}

Viết đúng cấu trúc:
## Thuộc Tính Cơ Bản
[hành + loại sao + ý nghĩa cốt lõi rút từ "Đặc tính" — 2-3 câu]

## Ý Nghĩa Trong Lá Số
[ý nghĩa khi sao này xuất hiện trong lá số — chủ về điều gì, ảnh hưởng ra sao — bám sát "Đặc tính", KHÔNG bịa thêm ý nghĩa không có căn cứ]
${facts.positions ? '\n## Miếu, Vượng, Đắc, Hãm Địa\n[dựa đúng "Đắc địa tại"/"Hãm địa tại" ở trên, KHÔNG bịa thêm vị trí khác]\n' : ''}
## Tổng Kết
[1-2 câu chốt]

Luật BẮT BUỘC:
- KHÔNG chèn chữ Hán/Hán tự (chưa có nguồn đối chiếu, không suy từ trí nhớ).
- KHÔNG bịa trích dẫn cổ thư (không gán tên sách/tác giả cụ thể).
- KHÔNG bịa tên sao khác không có trong dữ kiện để làm ví dụ kết hợp.
- KHÔNG tự xưng "tôi", KHÔNG gọi người đọc là "bạn" — ngôi thứ ba khách quan.
- Độ dài 260-380 từ.

Trả về JSON thuần (KHÔNG backtick, KHÔNG câu dẫn):
{"seo_title":"[Tên sao] Là Gì? Ý Nghĩa Theo Cổ Pháp Tử Vi | Tử Vi Minh Bảo (≤70 ký tự)","seo_desc":"tóm tắt ≤155 ký tự","content":"markdown như trên","tags":["3-4 từ khoá liên quan, chữ thường"]}`;

  const r = await llmTextFull({ prompt, maxTokens: 2200, json: true });
  void logLlmUsage(
    'tu-dien-sao-moi',
    r.model,
    {
      input_tokens: r.usage.input_tokens,
      output_tokens: r.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    r.durationMs,
  );
  const bio = parseLlmJson(r.text) as Bio | null;
  if (!bio) throw new Error(`parse hỏng (${r.text.length} ký tự): ${r.text.slice(0, 120)}`);
  return bio;
}

async function processStar(
  item: { ten: string; slug: string },
  facts: StarFacts,
): Promise<{ ok: boolean; slug: string; error?: string }> {
  try {
    const bio = await writeBio(item.ten, facts);

    const gate = await brandCheck({
      content: bio.content,
      title: item.ten,
      slug: item.slug,
      profile: 'thu-vien',
      payload: bio,
    });
    if (!gate.pass) {
      return {
        ok: false,
        slug: item.slug,
        error: `QC chặn: ${gate.violations.filter((v) => v.severity === 'block').map((v) => v.rule).join(', ')}`,
      };
    }

    const xuong = {
      type: facts.type,
      element: facts.element,
      weight: facts.weight,
      traits: facts.traits,
      positions: facts.positions,
    };
    const inserted = await sbFetch('/tu_dien', {
      method: 'POST',
      // ignore-duplicates an toàn NHỜ constraint `slug unique` có thật trên
      // tu_dien — không phải mutex tự chế không có gì đỡ bên dưới.
      headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({
        slug: item.slug,
        loai: 'sao-tu-vi',
        ten: `Sao ${item.ten}`,
        seo_title: bio.seo_title,
        seo_desc: bio.seo_desc,
        content: gate.content,
        tags: bio.tags,
        xuong,
      }),
    });
    if (!inserted.ok) return { ok: false, slug: item.slug, error: `DB POST ${inserted.status}` };
    return { ok: true, slug: item.slug };
  } catch (e: unknown) {
    return { ok: false, slug: item.slug, error: (e as Error).message.slice(0, 120) };
  }
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

export async function OPTIONS() {
  return options();
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);

  const startTime = Date.now();
  const STAR_DATA = loadStarData();

  // Backfill xuong cho "Sao Phúc Đức (Lưu Niên)" — CHỈ khi chưa có (idempotent
  // thủ công vì đây là PATCH, không có constraint nào đỡ như insert bên dưới).
  let backfillNote = 'đã có xuong, bỏ qua';
  const existing = await sbFetch(`/tu_dien?slug=eq.${XUONG_BACKFILL_SLUG}&select=id,xuong`);
  const row = existing.ok ? existing.body?.[0] : null;
  if (row && (row.xuong == null || Object.keys(row.xuong).length === 0)) {
    const facts = STAR_DATA[XUONG_BACKFILL_STAR];
    if (facts) {
      const patched = await sbFetch(`/tu_dien?slug=eq.${XUONG_BACKFILL_SLUG}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          xuong: { type: facts.type, element: facts.element, weight: facts.weight, traits: facts.traits },
        }),
      });
      backfillNote = patched.ok ? 'đã backfill xuong' : `backfill lỗi ${patched.status}`;
    } else {
      backfillNote = `không tìm thấy "${XUONG_BACKFILL_STAR}" trong STAR_DATA`;
    }
  }

  // Chỉ xử lý sao CHƯA có dòng — tự dừng khi hết việc, an toàn chạy lại mỗi ngày.
  const slugList = NEW_STARS.map((s) => s.slug).join(',');
  const already = await sbFetch(`/tu_dien?slug=in.(${slugList})&select=slug`);
  const doneSlugs = new Set((already.ok ? already.body : []).map((r: { slug: string }) => r.slug));
  const pending = NEW_STARS.filter((s) => !doneSlugs.has(s.slug));

  if (!pending.length) {
    return ok({ message: `Hết sao cần viết — 16/16 đã có. ${backfillNote}`, results: { ok: 0, fail: 0 } });
  }

  const outcomes = await runWithConcurrency(
    pending,
    (item) => processStar(item, STAR_DATA[item.ten]),
    4,
  );
  const okCount = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.filter((o) => !o.ok);

  return ok({
    message: 'OK',
    duration_ms: Date.now() - startTime,
    backfill: backfillNote,
    results: {
      ok: okCount,
      fail: failed.length,
      errors: failed.slice(0, 10).map((f) => `${f.slug}: ${f.error}`),
    },
  });
}

export async function GET(request: NextRequest) {
  return withCronLog('tu-dien-sao-moi', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) {
  return handle(request);
}
