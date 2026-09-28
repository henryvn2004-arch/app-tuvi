// lib/pdf/paid-reports.ts
// ============================================================
// BẢN LUẬN GIẢI ĐÃ TRẢ TIỀN của một tài khoản → PDF, để gửi thẳng vào kênh chat
// (Zalo/Messenger/WhatsApp/Telegram) hoặc từ nút "Gửi về Zalo" trên web.
//
// 🔴 CỔNG LÀ THANH TOÁN, không phải "có nội dung": `laso_public.luan_giai` được
// lưu cả khi khách chỉ đọc PHẦN MIỄN PHÍ, và `laso_public.user_id` chỉ là người
// LƯU ĐẦU TIÊN. Một phần chỉ vào PDF khi có giao dịch TRỪ Lượng của CHÍNH người
// này cho: slug BÓ (mua trọn) hoặc slug PHẦN của đúng số phần đó —
// `laso-pNN-<slug>` (public/app-luan-giai.html `_partSlug`) /
// `chu-trinh-cuoc-doi-pNN-<slug>` (public/app-chu-trinh-cuoc-doi.html). Khớp
// CHÍNH XÁC từng slug như `hasAnySlugAccess` (lib/billing/credits.ts).
// Nội dung đọc thẳng `laso_public.luan_giai` — KHÔNG gọi lại LLM/engine.
// ============================================================

import { paywallDisabled } from '@/lib/billing/credits';
import { renderLuanGiaiPdf, TOOL_META, type LuanGiaiToolId } from '@/lib/pdf/luan-giai';
import { buildPhans } from '@/lib/pdf/phan-labels';
import { classifyLuanGiaiSlug } from '@/lib/pdf/luan-giai-slug';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${SUPABASE_KEY || ''}` };
/** Số bản gần nhất xét — chat chỉ cần vài bản mới nhất, mỗi bản một lượt tra giao dịch. */
const MAX_REPORTS = 8;
/** Phần miễn phí của Luận Giải (FREE_PHAN của app-luan-giai.html) — chỉ kèm khi đã mua ít nhất một phần. */
const FREE_PHAN_LASO = 1;

type Row = {
  slug: string;
  person_name?: string | null;
  gioi_tinh?: string | null;
  ngay_sinh?: number | null;
  thang_sinh?: number | null;
  nam_sinh?: number | null;
  gio_chi?: string | null;
  luan_giai?: Record<string, unknown> | null;
  created_at?: string | null;
};

export interface PaidReport {
  slug: string;
  toolId: LuanGiaiToolId;
  /** "Luận Giải Tử Vi · Minh Anh · 3/6/1998" — nhãn cho nút/tin. */
  label: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  phans: { title: string; text: string }[];
}

async function get<T>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H, cache: 'no-store' });
  if (!res.ok) {
    console.error('[paid-reports] đọc lỗi', path.split('?')[0], res.status);
    return [];
  }
  return (await res.json()) as T[];
}

const partSlug = (toolId: LuanGiaiToolId, slug: string, n: number) =>
  `${toolId === 'laso' ? 'laso' : 'chu-trinh-cuoc-doi'}-p${String(n).padStart(2, '0')}-${slug}`;

/** Slug nào (bó / phần) người này ĐÃ TRẢ cho bản `slug` — một lượt tra `credit_transactions`. */
async function paidSlugs(userId: string, toolId: LuanGiaiToolId, slug: string): Promise<Set<string>> {
  const cands = [slug, ...Array.from({ length: 24 }, (_, i) => partSlug(toolId, slug, i + 1))];
  const inList = cands.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',');
  const rows = await get<{ slug: string }>(
    `credit_transactions?user_id=eq.${encodeURIComponent(userId)}&slug=in.(${encodeURIComponent(inList)})&amount=lt.0&select=slug`,
  );
  return new Set(rows.map((r) => r.slug));
}

/** Họ tên + "d/m/y, giờ X" từ một dòng laso_public — cùng định dạng route gửi lại PDF qua email. */
export function pdfMeta(row: Row): { hoTen: string; ngaySinh: string; gioiTinh: string } {
  const hoTen = row.person_name ? String(row.person_name) : '';
  const ngaySinh = [row.ngay_sinh, row.thang_sinh, row.nam_sinh].every((v) => v != null)
    ? `${row.ngay_sinh}/${row.thang_sinh}/${row.nam_sinh}${row.gio_chi ? ', giờ ' + row.gio_chi : ''}`
    : '';
  return { hoTen, ngaySinh, gioiTinh: row.gioi_tinh ? String(row.gioi_tinh) : '' };
}

/**
 * Các bản luận giải người này đã trả tiền (mới → cũ), mỗi bản chỉ giữ các PHẦN
 * đã mua. Nguồn slug: `laso_public` người này lưu + `user_reports` (người đó mua
 * nhưng lá số do người khác lưu trước). Lỗi mạng → danh sách rỗng.
 */
export async function listPaidReports(userId: string): Promise<PaidReport[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return [];
  const cols = 'slug,person_name,gioi_tinh,ngay_sinh,thang_sinh,nam_sinh,gio_chi,luan_giai,created_at';
  const uid = encodeURIComponent(userId);
  const [own, reps] = await Promise.all([
    get<Row>(`laso_public?user_id=eq.${uid}&luan_giai=not.is.null&select=${cols}&order=created_at.desc&limit=${MAX_REPORTS}`),
    get<{ slug: string | null }>(
      `user_reports?user_id=eq.${uid}&tool_id=in.(laso,chu-trinh-cuoc-doi)&select=slug&order=updated_at.desc&limit=${MAX_REPORTS}`,
    ),
  ]);
  const have = new Set(own.map((r) => r.slug));
  const more = reps.map((r) => r.slug || '').filter((s) => s && !have.has(s));
  const extra = more.length
    ? await get<Row>(
        `laso_public?slug=in.(${encodeURIComponent(more.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(','))})&select=${cols}`,
      )
    : [];
  const rows = [...own, ...extra]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, MAX_REPORTS);

  const free = paywallDisabled();
  const out: PaidReport[] = [];
  for (const row of rows) {
    const toolId = classifyLuanGiaiSlug(row.slug);
    if (!toolId) continue;
    const all = buildPhans(row.luan_giai || null);
    if (!all.length) continue;
    let keep = all;
    if (!free) {
      const paid = await paidSlugs(userId, toolId, row.slug);
      if (!paid.size) continue;
      const bundle = paid.has(row.slug);
      keep = all.filter((p) => {
        const n = Number(p.key);
        return bundle || paid.has(partSlug(toolId, row.slug, n)) || (toolId === 'laso' && n === FREE_PHAN_LASO);
      });
      if (!keep.some((p) => Number(p.key) !== FREE_PHAN_LASO || toolId !== 'laso')) continue;
    }
    const meta = pdfMeta(row);
    out.push({
      slug: row.slug,
      toolId,
      label: [TOOL_META[toolId].title, meta.hoTen, meta.ngaySinh.split(',')[0]].filter(Boolean).join(' · '),
      ...meta,
      phans: keep.map((p) => ({ title: p.title, text: p.text.slice(0, 50_000) })),
    });
  }
  return out;
}

/** Dựng PDF cho một bản đã trả tiền. */
export async function paidReportPdf(r: PaidReport): Promise<{ data: Buffer; filename: string }> {
  const data = await renderLuanGiaiPdf({
    toolId: r.toolId,
    hoTen: r.hoTen,
    ngaySinh: r.ngaySinh,
    gioiTinh: r.gioiTinh,
    phans: r.phans,
  });
  return { data, filename: `${r.toolId}-tu-vi-minh-bao.pdf` };
}
