// app/api/cron/thu-vien-build/route.ts
// Đắp văn cho thu_vien_muc: đọc dòng draft (đã seed `xuong` tất định bởi
// scripts/gen-thu-vien-index.mjs / scripts/seed-khai-niem.mjs), nhờ LLM viết
// tra_loi_ngan (đoạn passage-first ~40-60 từ, để LLM khác trích dẫn) + than
// (thân giải thích) + hoi_dap (FAQ thật), qua cửa brandCheck profile
// 'thu-vien' rồi mới publish_status='published'. QC KHÔNG qua → giữ draft,
// không đăng bản dở.
//
// 🔑 `ten_han` CỐ Ý không đụng ở đây — comment cột trong
// _patches/migration-thu-vien.sql ghi rõ "KHÔNG suy từ trí nhớ, phải đối
// chiếu nguồn". LLM tự bịa Hán tự cho một thuật ngữ là đúng kiểu "sửa mò
// công thức cổ pháp" CLAUDE.md cấm — để NULL, chờ một lượt tay có nguồn đối
// chiếu thật.
//
// `lien_quan` KHÔNG hỏi LLM — suy TẤT ĐỊNH từ `xuong` của các dòng khác
// (cùng sao/cùng cung/cùng hành/cùng nhóm khái niệm). LLM đoán slug thì có
// slug không tồn tại, hỏng liên kết nội bộ mà không ai báo.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { parseLlmJson } from '@/lib/llm/json';
import { withCronLog } from '@/lib/cron/log';
import { brandCheck } from '@/lib/content/brand-check';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// 197 dòng hiện có (113 sao-cung + 54 khai-niem + 30 nap-am) / 25 dòng-mỗi-lượt
// ≈ 8 lượt chạy. Rải theo NGÀY — cùng lý do viral-seo-pages: chi phí LLM theo
// lượt gọi, muốn theo dõi chất lượng dần, không có gì gấp (nội dung MỚI,
// không phải nội dung cũ cần viết lại nhanh).
const BATCH_PER_RUN = 25;
const CONCURRENCY = 5;

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

type BoSuuTap = 'sao-cung' | 'khai-niem' | 'nap-am';

interface ThuVienRow {
  id: number;
  slug: string;
  bo_suu_tap: BoSuuTap;
  ten: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xuong: any;
}

// ── Ngữ cảnh tất định (BẮT BUỘC LLM bám sát, không bịa ngoài) ──────────────

function factContextSaoCung(ten: string, xuong: ThuVienRow['xuong']): string {
  const cachCuc: Array<{ c: string; s: string[]; p: string; t: string; d?: string }> = Array.isArray(
    xuong?.cachCuc,
  )
    ? xuong.cachCuc
    : [];
  const lines = [`Tổ hợp: sao ${xuong?.sao} tại cung ${xuong?.cung}.`];
  if (!cachCuc.length) {
    lines.push('Không có cách cục cổ văn nào ghi lại cho tổ hợp này trong nguồn.');
  } else {
    lines.push(`${cachCuc.length} cách cục cổ văn ghi lại (BẮT BUỘC bám sát, không bịa thêm ngoài các đoạn dưới):`);
    cachCuc.slice(0, 12).forEach((cc, i) => {
      const dieuKien = cc.d ? ` (điều kiện: ${cc.d})` : '';
      lines.push(`${i + 1}. [${cc.p}] ${cc.t}${dieuKien}`);
    });
    if (cachCuc.length > 12) lines.push(`… và ${cachCuc.length - 12} cách cục khác cùng chủ đề, không liệt kê hết.`);
  }
  return lines.join('\n');
}

function factContextNapAm(ten: string, xuong: ThuVienRow['xuong']): string {
  const canChi: string[] = Array.isArray(xuong?.canChi) ? xuong.canChi : [];
  return [
    `Nạp âm: ${ten}.`,
    `Hành: ${xuong?.hanh}.`,
    canChi.length === 2
      ? `Thuộc hai năm ${canChi[0]} và ${canChi[1]} trong chu kỳ Lục Thập Hoa Giáp (mỗi tên nạp âm phủ đúng 2 năm liền kề, không phải 1).`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function factContextKhaiNiem(ten: string, xuong: ThuVienRow['xuong']): string {
  return [
    `Thuật ngữ: ${ten}.`,
    `Nhóm chủ đề: ${xuong?.nhom || '(không rõ)'}.`,
    'Không có dữ kiện tất định riêng cho thuật ngữ này — viết theo tri thức Tử Vi/Bát Tự/Kỳ Môn/Hoàng lịch ĐÃ ĐƯỢC XÁC LẬP RỘNG RÃI, không suy diễn riêng, không gán một công thức/con số cụ thể nào chưa được xác nhận.',
  ].join('\n');
}

function buildFactContext(row: ThuVienRow): string {
  if (row.bo_suu_tap === 'sao-cung') return factContextSaoCung(row.ten, row.xuong);
  if (row.bo_suu_tap === 'nap-am') return factContextNapAm(row.ten, row.xuong);
  return factContextKhaiNiem(row.ten, row.xuong);
}

// ── Liên quan — suy TẤT ĐỊNH từ xuong của các dòng khác, KHÔNG hỏi LLM ─────

function computeLienQuan(row: ThuVienRow, all: ThuVienRow[]): string[] {
  const others = all.filter((r) => r.id !== row.id && r.bo_suu_tap === row.bo_suu_tap);
  if (row.bo_suu_tap === 'sao-cung') {
    const sameSao = others.filter((r) => r.xuong?.sao === row.xuong?.sao).slice(0, 2);
    const sameCung = others.filter((r) => r.xuong?.cung === row.xuong?.cung).slice(0, 2);
    return [...sameSao, ...sameCung].map((r) => r.slug);
  }
  if (row.bo_suu_tap === 'nap-am') {
    return others
      .filter((r) => r.xuong?.hanh === row.xuong?.hanh)
      .slice(0, 4)
      .map((r) => r.slug);
  }
  return others
    .filter((r) => r.xuong?.nhom === row.xuong?.nhom)
    .slice(0, 4)
    .map((r) => r.slug);
}

// ── Viết + QC ────────────────────────────────────────────────────────────

interface Article {
  tra_loi_ngan: string;
  than: string;
  hoi_dap: Array<{ cau_hoi: string; tra_loi: string }>;
}

const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const RE_MOJIBAKE = /â€|Ã¡|ï¿½|Æ°|Ä‘/;

function countWords(s: string): number {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

/** tra_loi_ngan không qua brandCheck — hình dạng khác hẳn (một đoạn ngắn, không
 * phải một bài), kiểm nhẹ tại chỗ thay vì ép qua cỗ máy soi bài dài. */
function checkTraLoiNgan(s: string): string | null {
  const t = String(s || '').trim();
  if (!t) return 'trống';
  const words = countWords(t);
  if (words < 20 || words > 100) return `độ dài ${words} từ, ngoài dải 20-100`;
  if (RE_EMOJI.test(t)) return 'có emoji';
  if (RE_MOJIBAKE.test(t)) return 'mojibake';
  return null;
}

function checkHoiDap(arr: Article['hoi_dap']): string | null {
  if (!Array.isArray(arr) || arr.length < 2 || arr.length > 4) return `số câu ${arr?.length ?? 0}, cần 2-4`;
  for (const [i, qa] of arr.entries()) {
    const cauHoi = String(qa?.cau_hoi || '').trim();
    const traLoi = String(qa?.tra_loi || '').trim();
    if (!cauHoi || !traLoi) return `câu ${i + 1} thiếu cau_hoi/tra_loi`;
    if (traLoi.length < 10 || traLoi.length > 500) return `câu ${i + 1}: tra_loi ${traLoi.length} ký tự, ngoài dải 10-500`;
    if (RE_EMOJI.test(cauHoi) || RE_EMOJI.test(traLoi)) return `câu ${i + 1}: có emoji`;
    if (RE_MOJIBAKE.test(cauHoi) || RE_MOJIBAKE.test(traLoi)) return `câu ${i + 1}: mojibake`;
  }
  return null;
}

async function writeConcept(row: ThuVienRow): Promise<Article> {
  const ctx = buildFactContext(row);
  const cauHoi = `${row.ten}?`;
  const prompt = `Bạn là biên tập viên viết mục từ điển tham khảo về Tử Vi Đẩu Số/Bát Tự/huyền học phương Đông cho một thư viện tra cứu — KHÔNG phải bài luận giải cá nhân, không có "đương số" nào ở đây.

Mục từ: "${row.ten}"
Ngữ cảnh (${row.bo_suu_tap === 'khai-niem' ? 'tri thức nền, không phải dữ kiện tất định' : 'BẮT BUỘC bám sát, không bịa ngoài đây'}):
${ctx}

Viết đúng BA phần:
1. tra_loi_ngan: đoạn 40-60 từ trả lời THẲNG câu hỏi "${cauHoi}" — đây là đoạn máy tìm kiếm/AI khác sẽ trích dẫn nguyên văn, phải tự đứng độc lập (không cần đọc phần sau mới hiểu), không mở đầu bằng "Đây là" hay lặp lại câu hỏi.
2. than: thân giải thích đầy đủ, 300-700 từ, ngôi thứ ba khách quan (không tự xưng "tôi", không gọi người đọc là "bạn"), KHÔNG lặp lại y nguyên đoạn tra_loi_ngan — mở rộng, cho ví dụ nếu hợp lý, KHÔNG bịa trích dẫn cổ thư (không gán tên sách/tác giả cụ thể trừ khi có trong ngữ cảnh).
3. hoi_dap: 2-4 câu hỏi thường gặp THẬT (dạng người dùng thật sẽ gõ vào Google) kèm trả lời 40-80 từ mỗi câu — không lặp lại câu hỏi chính ở trên.

Cấm: emoji, đánh số mục kiểu giáo trình ("### 1. ..."), đổ điểm số/bảng tra vào văn xuôi.

Trả về JSON thuần (KHÔNG backtick, KHÔNG câu dẫn):
{"tra_loi_ngan":"...","than":"...","hoi_dap":[{"cau_hoi":"...","tra_loi":"..."}]}`;

  const r = await llmTextFull({ prompt, maxTokens: 3000, json: true });
  void logLlmUsage(
    'thu-vien-build',
    r.model,
    {
      input_tokens: r.usage.input_tokens,
      output_tokens: r.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    r.durationMs,
  );
  const article = parseLlmJson(r.text) as Article | null;
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

async function processRow(row: ThuVienRow, all: ThuVienRow[]): Promise<{ ok: boolean; slug: string; error?: string }> {
  try {
    const article = await writeConcept(row);

    const tlnErr = checkTraLoiNgan(article.tra_loi_ngan);
    if (tlnErr) return { ok: false, slug: row.slug, error: `tra_loi_ngan: ${tlnErr}` };

    const hdErr = checkHoiDap(article.hoi_dap);
    if (hdErr) return { ok: false, slug: row.slug, error: `hoi_dap: ${hdErr}` };

    const gate = await brandCheck({
      content: article.than,
      title: row.ten,
      slug: row.slug,
      profile: 'thu-vien',
      payload: article,
    });
    if (!gate.pass) {
      return {
        ok: false,
        slug: row.slug,
        error: `QC chặn: ${gate.violations.filter((v) => v.severity === 'block').map((v) => v.rule).join(', ')}`,
      };
    }

    const lienQuan = computeLienQuan(row, all);
    const patched = await sbFetch(`/thu_vien_muc?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        tra_loi_ngan: article.tra_loi_ngan,
        than: gate.content,
        hoi_dap: article.hoi_dap,
        lien_quan: lienQuan,
        publish_status: 'published',
        updated_at: new Date().toISOString(),
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

  const rowsRes = await sbFetch(
    `/thu_vien_muc?publish_status=eq.draft&select=id,slug,bo_suu_tap,ten,xuong&order=id.asc&limit=${BATCH_PER_RUN}`,
  );
  if (!rowsRes.ok) return err(`Đọc thu_vien_muc lỗi: ${rowsRes.status}`, 500);
  const rows = (rowsRes.body || []) as ThuVienRow[];
  if (!rows.length) return ok({ message: 'Hết dòng draft — đã đắp văn toàn bộ.', results: { ok: 0, fail: 0 } });

  // Bảng tra cứu CHO computeLienQuan — cần thấy MỌI dòng (kể cả draft chưa
  // tới lượt), không chỉ batch đang xử lý, để gợi ý liên quan không hụt.
  const allRes = await sbFetch(`/thu_vien_muc?select=id,slug,bo_suu_tap,xuong`);
  const all = (allRes.ok ? allRes.body : []) as ThuVienRow[];

  const outcomes = await runWithConcurrency(rows, (row) => processRow(row, all.length ? all : rows), CONCURRENCY);
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
  return withCronLog('thu-vien-build', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) {
  return handle(request);
}
