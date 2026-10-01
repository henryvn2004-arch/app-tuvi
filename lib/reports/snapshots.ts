// lib/reports/snapshots.ts
// ============================================================
// Bản chụp báo cáo cho trang Báo cáo (`/app/bao-cao`) — bảng
// `report_snapshots` (_patches/migration-report-snapshots.sql).
//
// Hai nguồn, MỘT hình dạng khối {header, image, text}:
//   1. `report_snapshots` — shell.js chụp payload nút Chia sẻ mỗi khi một công
//      cụ hiện kết quả (mọi công cụ, kể cả bản xem trước).
//   2. Bản CŨ trước khi có (1): Luận Giải / Chu Trình trong `laso_public`
//      (`luan_giai` khoá theo số phần — `buildPhans`). Tử Bình / Vận Hạn Năm
//      dùng cùng bảng nhưng khoá phần mang nghĩa KHÁC nên không dựng từ đây.
// Không nguồn nào ⇒ không có dòng: Henry chốt "chưa lưu thì bỏ dòng đó".
// ============================================================
import { createHash } from 'node:crypto';
import { buildPhans } from '@/lib/pdf/phan-labels';

export interface ReportBlock {
  header: string | null;
  image: string | null;
  text: string | null;
}

// Trần: 40 khối × 12.000 ký tự, tổng 120.000 — luận giải 24 phần đã mở khoá
// vẫn lọt; rác nhồi qua endpoint thì bị cắt. Shell (`SHARE_BLOCK_CAP`/
// `SHARE_TEXT_CAP`) chụp ít hơn trần này, nên không có gì bị cắt trong im lặng.
const MAX_BLOCKS = 40;
const MAX_BLOCK_TEXT = 12000;
const MAX_TOTAL_TEXT = 120000;

/** Chuẩn hoá khối từ client — CHỈ chữ/URL thô, không bao giờ HTML (trang xem
 *  escape lúc vẽ). Ảnh chỉ nhận https. */
export function sanitizeBlocks(raw: unknown): ReportBlock[] {
  if (!Array.isArray(raw)) return [];
  let total = 0;
  const out: ReportBlock[] = [];
  for (const item of raw.slice(0, MAX_BLOCKS)) {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const header = r.header ? String(r.header).trim().slice(0, 120) : null;
    const imageRaw = r.image ? String(r.image).slice(0, 500) : '';
    const image = /^https:\/\//.test(imageRaw) ? imageRaw : null;
    let text = r.text ? String(r.text).trim().slice(0, MAX_BLOCK_TEXT) : null;
    if (text && total + text.length > MAX_TOTAL_TEXT) text = text.slice(0, Math.max(0, MAX_TOTAL_TEXT - total)) || null;
    total += text ? text.length : 0;
    if (header || image || text) out.push({ header: header || null, image, text: text || null });
  }
  return out;
}

/** Khoá chủ thể: cùng công cụ + cùng lá số ⇒ cùng dòng (chạy lại là cập nhật).
 *  Khoá JSON sắp theo tên để thứ tự thuộc tính phía client không đẻ khoá mới. */
export function subjectKey(toolId: string, subject: unknown, title: string): string {
  const stable = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.keys(o).sort().reduce<Record<string, unknown>>((acc, k) => {
        if (o[k] !== undefined && o[k] !== null && o[k] !== '') acc[k] = stable(o[k]);
        return acc;
      }, {});
    }
    return v;
  };
  const s = subject && typeof subject === 'object' && Object.keys(subject as object).length
    ? JSON.stringify(stable(subject))
    : 'title:' + title;
  return createHash('sha256').update(toolId + '|' + s).digest('hex').slice(0, 40);
}

/** Dòng luận CÓ thẻ nhãn `[TỐT|…] **câu hook** phần còn lại` (định dạng của
 *  app-luan-giai.html `renderMarkdown`) → câu hook trong ngoặc kép. Thiếu bước
 *  này là thẻ thô `[CẢNH BÁO|ĐỔI MÌNH|ban-than]` lộ ra (ảnh Henry 2026-09-27). */
function cleanLuanText(t: string): string {
  return t
    .split('\n')
    .map((line) => {
      const m = /^\[(TỐT|CẢNH BÁO|TRUNG TÍNH)(?:\|[^\]]{0,40})?\]\s*\*\*(.+?)\*\*([\s\S]*)$/.exec(line.trim());
      return m ? `**“${m[2].trim()}”**${m[3]}` : line;
    })
    .join('\n');
}

/** Nhãn + công cụ mở lại cho bản cũ trong `laso_public` (khoá = classifyLuanGiaiSlug).
 *  Chép nhãn thay vì import `TOOL_META` (lib/pdf/luan-giai.tsx) — module đó kéo
 *  theo cả react-pdf chỉ để lấy hai chuỗi. */
export const LEGACY_TOOL: Record<string, { label: string; toolId: string }> = {
  laso: { label: 'Luận Giải Lá Số', toolId: 'luan-giai' },
  'chu-trinh-cuoc-doi': { label: 'Chu Trình Cuộc Đời', toolId: 'chu-trinh-cuoc-doi' },
};

/** Khối từ `laso_public.luan_giai` (bản cũ). Rỗng ⇒ không có gì để xem. */
export function legacyLuanBlocks(luanGiai: unknown): ReportBlock[] {
  return buildPhans(luanGiai as Record<string, unknown> | null).map((p) => ({
    header: p.title,
    image: null,
    text: cleanLuanText(p.text).slice(0, MAX_BLOCK_TEXT),
  }));
}

// ── Dựng + ghi MỘT dòng `report_snapshots` — dùng chung cho /api/reports/snapshot
// (shell chụp ngầm) và /api/reports/pdf (chụp ngay rồi dựng PDF, cần `id`). ──
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface SnapshotRow {
  user_id: string;
  tool_id: string;
  subject_key: string;
  tool_label: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  blocks: ReportBlock[];
  updated_at: string;
}

/** Body client (payload `reportSnapshot()` của shell.js) → dòng; chuỗi = lỗi 400. */
export function snapshotRow(userId: string, b: Record<string, unknown>): SnapshotRow | string {
  const toolId = String(b.toolId || '').trim().slice(0, 40);
  if (!/^[a-z0-9-]+$/.test(toolId)) return 'toolId không hợp lệ';
  const title = String(b.title || '').trim().slice(0, 160) || 'Báo cáo';
  const blocks = sanitizeBlocks(b.blocks);
  if (!blocks.some((x) => x.text || x.image)) return 'Chưa có nội dung';
  const imageRaw = b.imageUrl ? String(b.imageUrl).slice(0, 500) : '';
  return {
    user_id: userId,
    tool_id: toolId,
    subject_key: subjectKey(toolId, b.subject, title),
    tool_label: b.toolLabel ? String(b.toolLabel).trim().slice(0, 80) : null,
    title,
    subtitle: b.subtitle ? String(b.subtitle).trim().slice(0, 160) : null,
    image_url: /^https:\/\//.test(imageRaw) ? imageRaw : null,
    blocks,
    updated_at: new Date().toISOString(),
  };
}

/** Upsert theo (user, công cụ, chủ thể). Trả `id` dòng; null khi lỗi (đã log). */
export async function saveSnapshot(row: SnapshotRow): Promise<string | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/report_snapshots?on_conflict=user_id,tool_id,subject_key&select=id`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY || '',
        Authorization: `Bearer ${SB_KEY || ''}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[reports/snapshot] upsert', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const rows = (await res.json()) as { id?: string }[];
    return rows[0]?.id || null;
  } catch (e) {
    console.error('[reports/snapshot] upsert', e);
    return null;
  }
}
