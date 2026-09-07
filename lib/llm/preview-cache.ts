// lib/llm/preview-cache.ts
// ============================================================
// CACHE BẢN LUẬN XEM TRƯỚC (hard paywall)
// ============================================================
// Cửa DUY NHẤT vào `luan_preview_cache` (_patches/migration-anon-preview.sql).
//
// Việc chính KHÔNG phải là tiết kiệm giữa những người dùng khác nhau — tỉ lệ hai
// người trùng cả lá số lẫn tên rất thấp. Việc chính là: một người TẢI LẠI TRANG
// (hoặc bấm chạy lại cùng ngày sinh) không được đốt thêm một lượt model VÀ một
// suất trong `preview.free_runs` — trần đời chỉ có 3, ba lần F5 là hết, và với
// người dùng thì đó đọc như tool bị hỏng.
//
// ⚠️ Thứ tự BẮT BUỘC ở nơi gọi: TRA CACHE TRƯỚC → trúng thì trả luôn (không
// đụng cầu dao) → trượt mới xin `previewGate`. Xin quota trước rồi mới tra cache
// là tự bóp phễu bằng một con số không có thật.
//
// KHÔNG phải kho quyền sở hữu: `portrait_cache` (qua `cacheFor`) và
// `laso_public` mới là nơi trả lời "ai đã TRẢ TIỀN cho lá số này". Đừng đọc
// bảng này để quyết định cho ai xem cái gì.
// ============================================================

import { createHash } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/**
 * Khoá một bản xem trước.
 *
 * Băm THẲNG `laSoText` thay vì dựng lại slug lá số từ ngày/giờ/giới tính:
 * `laSoText` do chính engine sinh ra và deterministic theo lá số, nên nó đã là
 * một khoá hoàn hảo — mà lại tránh được hẳn họ bẫy "slug sai định dạng ⇒
 * cache-miss vĩnh viễn, im lặng" đã cắn ở `readCachedLuanGiaiPhan`.
 *
 * `namXem` vào khoá vì phần tổng quan có nhắc đại vận/tiểu hạn của năm đang
 * xem; `hoTen`/`gioiTinh` vào khoá vì prompt xưng hô theo chúng (xem chú thích
 * bảng trong migration).
 */
export function previewKey(p: {
  laSoText: string;
  phan: number;
  namXem?: number | string;
  hoTen?: string;
  gioiTinh?: string;
}): string {
  const raw = [
    p.laSoText || '',
    String(p.phan),
    String(p.namXem ?? ''),
    (p.hoTen || '').trim().toLowerCase(),
    p.gioiTinh === 'nu' ? 'nu' : 'nam',
  ].join(' ');
  return createHash('sha256').update(raw).digest('hex');
}

/** Bản đã có, hoặc null. Lỗi/mạng hỏng → null (rơi về gọi model như thường). */
export async function previewCacheGet(key: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !key) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/luan_preview_cache?key=eq.${encodeURIComponent(key)}&select=noi_dung&limit=1`,
      // Next bọc `fetch` toàn cục và nhớ cả trong route `force-dynamic` — đã
      // cắn 3 lần trong repo này (xem CLAUDE.md, đường tiền).
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { noi_dung?: string }[];
    const text = rows?.[0]?.noi_dung;
    if (typeof text !== 'string' || !text.trim()) return null;
    // Đếm lượt trúng — best-effort, KHÔNG chờ: nó chỉ để biết cache có đáng giữ.
    void fetch(`${SUPABASE_URL}/rest/v1/rpc/luan_preview_cache_touch`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_key: key }),
    }).catch(() => {});
    return text;
  } catch (e) {
    console.error('[previewCache] doc loi:', (e as Error)?.message);
    return null;
  }
}

/**
 * Ghi bản vừa sinh. Best-effort và KHÔNG chặn response — nhưng vẫn phải
 * `console.error` khi hỏng: bắt lỗi rỗng trên đường có tiền là cấm
 * (CLAUDE.md), và ghi hụt ở đây nghĩa là lượt sau đốt lại tiền model.
 *
 * `resolution=ignore-duplicates`: hai tab chạy song song cùng một lá số thì bản
 * về đích trước thắng, bản sau bỏ qua — không có gì để tranh chấp vì nội dung
 * cùng nguồn.
 */
export function previewCachePut(p: {
  key: string;
  toolId: string;
  phan: number;
  text: string;
}): void {
  if (!SUPABASE_URL || !SUPABASE_KEY || !p.key || !p.text?.trim()) return;
  void fetch(`${SUPABASE_URL}/rest/v1/luan_preview_cache`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ key: p.key, tool_id: p.toolId, phan: p.phan, noi_dung: p.text }),
  })
    .then((r) => {
      if (!r.ok) console.error('[previewCache] ghi hong', r.status);
    })
    .catch((e) => console.error('[previewCache] ghi loi:', (e as Error)?.message));
}
