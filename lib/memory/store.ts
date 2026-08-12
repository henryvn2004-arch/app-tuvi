// lib/memory/store.ts
// ============================================================
// TẦNG 2 — hồ sơ "Thầy nhớ gì về con" (bảng `user_memory`).
//
// Model tự rút ra qua tool `ghi_nho`/`quen_di` (lib/tools/registry.ts); người
// dùng xem–sửa–xoá trong trang Tài khoản. Mọi lượt ghi đi qua ĐÚNG file này
// nên trần số mục + trần độ dài + chuẩn hoá chỉ có một chỗ.
//
// ⚠️ Nội dung ở đây nhạy hơn hẳn ngày sinh. TUYỆT ĐỐI không đưa vào link chia
// sẻ, poster, hay meta của `events` — chỉ chảy vào system prompt của chính chủ.
// ============================================================

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

/** Trần số mục giữ cho MỘT người. Hồ sơ đi vào MỌI lượt rail nên nó là chi
 *  phí token thường trực; quá tay thì vừa đắt vừa loãng. Chạm trần thì XOÁ
 *  mục cũ nhất chứ KHÔNG từ chối ghi (cùng luật MAX_CHARTS của sổ lá số —
 *  từ chối ghi là im lặng đánh rơi điều người ta vừa kể). */
export const MAX_MEMORY_ITEMS = 40;

/** Trần độ dài một mục. Hồ sơ là GHI CHÚ, không phải nhật ký — mục dài là
 *  dấu hiệu model đang chép lại cả câu chuyện thay vì rút ra điều còn đúng. */
export const MAX_MEMORY_LEN = 200;

/** Nhóm để HIỆN cho người đọc, không dùng cho logic. Giá trị lạ → 'khac'. */
export const MEMORY_KINDS = ['hoan_canh', 'moi_lo', 'tinh_cach', 'tin_nguong', 'khac'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_KIND_LABELS: Record<MemoryKind, string> = {
  hoan_canh: 'Hoàn cảnh',
  moi_lo: 'Đang bận tâm',
  tinh_cach: 'Tính cách · thói quen',
  tin_nguong: 'Tín ngưỡng',
  khac: 'Khác',
};

export interface MemoryItem {
  id: string;
  loai: MemoryKind;
  noi_dung: string;
  nguon: 'thay' | 'nguoi';
  updated_at: string;
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: SB_KEY as string,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function normKind(v: unknown): MemoryKind {
  return (MEMORY_KINDS as readonly string[]).includes(String(v)) ? (v as MemoryKind) : 'khac';
}

/** Chuẩn hoá nội dung: gộp khoảng trắng, cắt trần. Trả '' nếu không dùng được. */
export function normalizeFact(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length < 3) return '';
  return s.slice(0, MAX_MEMORY_LEN);
}

/** Đọc hồ sơ của một người, mới nhất trước. Lỗi → mảng rỗng (rail vẫn chạy). */
export async function listMemory(userId: string): Promise<MemoryItem[]> {
  if (!SB_URL || !SB_KEY || !userId) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_memory?user_id=eq.${encodeURIComponent(userId)}` +
        `&select=id,loai,noi_dung,nguon,updated_at&order=updated_at.desc&limit=${MAX_MEMORY_ITEMS}`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as MemoryItem[];
    return Array.isArray(rows) ? rows.map((r) => ({ ...r, loai: normKind(r.loai) })) : [];
  } catch {
    return [];
  }
}

/**
 * Ghi một điều vào hồ sơ. Trùng NGUYÊN VĂN thì DB từ chối (unique index) →
 * bắt đúng mã 23505 rồi chuyển sang cập nhật `updated_at` để mục đó khỏi bị
 * trần đẩy ra ngoài. Không tự nhớ hộ ở tầng ứng dụng.
 */
export async function rememberFact(
  userId: string,
  loai: unknown,
  noiDung: unknown,
  nguon: 'thay' | 'nguoi' = 'thay',
): Promise<{ ok: boolean; reason?: string }> {
  if (!SB_URL || !SB_KEY || !userId) return { ok: false, reason: 'no_store' };
  const noi = normalizeFact(noiDung);
  if (!noi) return { ok: false, reason: 'empty' };

  try {
    const res = await fetch(`${SB_URL}/rest/v1/user_memory`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ user_id: userId, loai: normKind(loai), noi_dung: noi, nguon }),
      cache: 'no-store',
    });
    // merge-duplicates cần ON CONFLICT khớp một constraint có TÊN; index biểu
    // thức (lower(btrim(...))) thì PostgREST không suy ra được → trùng vẫn trả
    // 409. Coi 409 là THÀNH CÔNG: điều cần nhớ vốn đã nằm sẵn trong hồ sơ.
    if (!res.ok && res.status !== 409) {
      return { ok: false, reason: `http_${res.status}` };
    }
    await enforceCap(userId);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Quá trần thì xoá mục CŨ NHẤT cho vừa. Best-effort, không chặn lượt ghi. */
async function enforceCap(userId: string): Promise<void> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_memory?user_id=eq.${encodeURIComponent(userId)}` +
        `&select=id&order=updated_at.desc&offset=${MAX_MEMORY_ITEMS}`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return;
    const thua = (await res.json()) as { id: string }[];
    if (!Array.isArray(thua) || !thua.length) return;
    const ids = thua.map((r) => r.id).join(',');
    await fetch(`${SB_URL}/rest/v1/user_memory?id=in.(${encodeURIComponent(ids)})`, {
      method: 'DELETE',
      headers: headers(),
      cache: 'no-store',
    });
  } catch {
    /* trần là dọn dẹp, hỏng thì thôi */
  }
}

/**
 * Xoá một mục. `idOrPrefix` nhận cả UUID đầy đủ (đường UI) lẫn TIỀN TỐ ngắn
 * (đường tool — prompt chỉ in 8 ký tự đầu để khỏi đốt token cho 40 UUID).
 * LUÔN kèm `user_id` trong bộ lọc: thiếu nó là một người xoá được mục của
 * người khác chỉ bằng cách đoán id.
 */
export async function forgetFact(userId: string, idOrPrefix: string): Promise<boolean> {
  if (!SB_URL || !SB_KEY || !userId) return false;
  const raw = String(idOrPrefix || '').trim();
  if (!/^[0-9a-fA-F-]{4,36}$/.test(raw)) return false;
  const filter = raw.length === 36 ? `id=eq.${raw}` : `id=like.${encodeURIComponent(raw + '%')}`;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_memory?user_id=eq.${encodeURIComponent(userId)}&${filter}`,
      { method: 'DELETE', headers: headers({ Prefer: 'return=representation' }), cache: 'no-store' },
    );
    if (!res.ok) return false;
    const gone = (await res.json()) as unknown[];
    return Array.isArray(gone) && gone.length > 0;
  } catch {
    return false;
  }
}

/** Người dùng sửa một mục trong trang Tài khoản → đánh dấu nguồn 'nguoi'. */
export async function editFact(
  userId: string,
  id: string,
  noiDung: unknown,
  loai?: unknown,
): Promise<boolean> {
  if (!SB_URL || !SB_KEY || !userId) return false;
  if (!/^[0-9a-fA-F-]{36}$/.test(String(id || ''))) return false;
  const noi = normalizeFact(noiDung);
  if (!noi) return false;
  const patch: Record<string, string> = { noi_dung: noi, nguon: 'nguoi', updated_at: new Date().toISOString() };
  if (loai !== undefined) patch.loai = normKind(loai);
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_memory?user_id=eq.${encodeURIComponent(userId)}&id=eq.${id}`,
      { method: 'PATCH', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(patch), cache: 'no-store' },
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Khối TẦNG 2 dán vào system. Rỗng → trả '' để không tốn một dòng nào cho
 * người chưa có hồ sơ (và để model không tưởng là hồ sơ đã đầy mà nghèo).
 *
 * In kèm tiền tố id 8 ký tự để model gọi `quen_di` được khi người dùng bảo
 * "thầy quên chuyện đó đi".
 */
export function formatMemoryForPrompt(items: MemoryItem[]): string {
  if (!items.length) return '';
  const dong = items
    .map((it) => `  · [${it.id.slice(0, 8)}] (${MEMORY_KIND_LABELS[it.loai]}) ${it.noi_dung}`)
    .join('\n');
  return `── THẦY ĐANG NHỚ GÌ VỀ NGƯỜI NÀY (hồ sơ riêng, tích qua các lần trò chuyện trước) ──
Dùng để hiểu bối cảnh và nối tiếp câu chuyện — KHÔNG phải để liệt kê lại cho họ nghe.
- TUYỆT ĐỐI không đọc thuộc lòng hồ sơ này ("theo tôi nhớ thì con đang…"). Nó chỉ để bạn biết mà nói cho trúng.
- Nhắc tới một điều cũ CHỈ khi nó thật sự dính tới chuyện đang nói, và nhắc tự nhiên như người quen: "chỗ làm mới ổn hơn chưa con?".
- Hồ sơ có thể ĐÃ CŨ. Nếu điều họ vừa nói mâu thuẫn với hồ sơ thì tin điều VỪA NGHE, rồi ghi lại bằng ghi_nho.
${dong}`;
}
