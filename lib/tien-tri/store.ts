// lib/tien-tri/store.ts
// ============================================================
// SỔ TIÊN TRI (docs/DAC-TRUNG-PLAN.md) — bảng `loi_tien_tri`
// (_patches/migration-loi-tien-tri.sql). Cửa DUY NHẤT đọc/ghi bảng này.
//
// userId LUÔN do server truyền (đã xác thực) — tool chỉ đưa nội dung + ngày,
// không bao giờ nhận danh tính qua tham số (cùng luật MemoryPort).
// Kết quả Đúng/Chưa chỉ để đo NỘI BỘ — Henry chốt không công khai tỉ lệ trúng.
// ============================================================

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

export const MAX_TIEN_TRI_LEN = 300;
/** Hỏi lại sớm nhất sau 7 ngày, muộn nhất ~13 tháng — ngoài khoảng đó là model đoán ngày bừa. */
export const MIN_NGAY = 7;
export const MAX_NGAY = 400;
/** Trần số lời phán ĐANG CHỜ mỗi người — sổ là vài điều đáng nhớ, không phải nhật ký mọi câu. */
export const MAX_CHO = 12;

export interface LoiTienTri {
  id: string;
  noi_dung: string;
  hoi_lai_ngay: string;
  author_id: string | null;
  created_at: string;
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: SB_KEY as string,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Ngày hôm nay theo giờ VN, dạng YYYY-MM-DD. */
export function homNayVN(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

function soNgay(tu: string, den: string): number {
  return Math.round((Date.parse(den + 'T00:00:00Z') - Date.parse(tu + 'T00:00:00Z')) / 864e5);
}

/** Kiểm ngày hỏi lại model đưa: đúng dạng, là ngày có thật, trong [MIN_NGAY, MAX_NGAY] ngày tới. */
export function kiemNgayHoiLai(raw: unknown, homNay = homNayVN()): { ok: true; ngay: string } | { ok: false; lyDo: string } {
  const s = String(raw ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return { ok: false, lyDo: 'hoi_lai_ngay phải có dạng YYYY-MM-DD (dương lịch)' };
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    return { ok: false, lyDo: 'ngày không có thật' };
  }
  const n = soNgay(homNay, s);
  if (n < MIN_NGAY) return { ok: false, lyDo: `ngày hỏi lại phải cách hôm nay (${homNay}) ít nhất ${MIN_NGAY} ngày` };
  if (n > MAX_NGAY) return { ok: false, lyDo: `ngày hỏi lại quá xa (tối đa ${MAX_NGAY} ngày tới)` };
  return { ok: true, ngay: s };
}

export async function ghiLoiTienTri(
  userId: string,
  noiDungRaw: unknown,
  ngayRaw: unknown,
  meta: { authorId?: string | null; sessionId?: string | null } = {},
): Promise<{ ok: true; ngay: string } | { ok: false; lyDo: string }> {
  if (!SB_URL || !SB_KEY || !userId) return { ok: false, lyDo: 'no_store' };
  const noi = String(noiDungRaw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TIEN_TRI_LEN);
  if (noi.length < 10) return { ok: false, lyDo: 'lời phán quá ngắn' };
  const kn = kiemNgayHoiLai(ngayRaw);
  if (!kn.ok) return kn;
  try {
    const cho = await fetch(
      `${SB_URL}/rest/v1/loi_tien_tri?user_id=eq.${encodeURIComponent(userId)}&trang_thai=eq.cho&select=id`,
      { headers: headers({ Prefer: 'count=exact', Range: '0-0' }), cache: 'no-store' },
    );
    const tong = Number((cho.headers.get('content-range') || '').split('/')[1] || 0);
    if (tong >= MAX_CHO) return { ok: false, lyDo: 'sổ đã đủ lời phán đang chờ' };
    const res = await fetch(`${SB_URL}/rest/v1/loi_tien_tri`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        user_id: userId,
        noi_dung: noi,
        hoi_lai_ngay: kn.ngay,
        author_id: meta.authorId || null,
        session_id: meta.sessionId || null,
      }),
      cache: 'no-store',
    });
    // 409 = trùng nguyên văn (loi_tien_tri_dedupe_idx) — lời phán đã có trong sổ.
    if (res.status === 409) return { ok: true, ngay: kn.ngay };
    if (!res.ok) {
      console.error('[tien-tri] ghi hỏng:', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return { ok: false, lyDo: `http_${res.status}` };
    }
    return { ok: true, ngay: kn.ngay };
  } catch (e) {
    console.error('[tien-tri] ghi lỗi:', (e as Error)?.message);
    return { ok: false, lyDo: 'network' };
  }
}

/** Lời phán ĐẾN HẠN mà khách chưa trả lời, cũ nhất trước. Lỗi → []. */
export async function listDenHan(userId: string, limit = 1): Promise<LoiTienTri[]> {
  if (!SB_URL || !SB_KEY || !userId) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/loi_tien_tri?user_id=eq.${encodeURIComponent(userId)}&trang_thai=eq.cho` +
        `&hoi_lai_ngay=lte.${homNayVN()}&select=id,noi_dung,hoi_lai_ngay,author_id,created_at` +
        `&order=hoi_lai_ngay.asc&limit=${Math.max(1, Math.min(limit, 20))}`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as LoiTienTri[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Khách trả lời: 'dung' | 'chua' → đóng mục; 'de_sau' → lùi ngày hỏi 3 hôm.
 * LUÔN lọc kèm `user_id` — service key bỏ qua RLS, thiếu điều kiện này là một
 * người sửa được mục của người khác chỉ bằng cách đoán id.
 */
export async function traLoi(userId: string, id: string, kq: 'dung' | 'chua' | 'de_sau'): Promise<boolean> {
  if (!SB_URL || !SB_KEY || !userId || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const lui = new Date(Date.parse(homNayVN() + 'T00:00:00Z') + 3 * 864e5).toISOString().slice(0, 10);
  const body =
    kq === 'de_sau'
      ? { hoi_lai_ngay: lui }
      : { trang_thai: 'da_hoi', ket_qua: kq, answered_at: new Date().toISOString() };
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/loi_tien_tri?id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}&trang_thai=eq.cho`,
      { method: 'PATCH', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(body), cache: 'no-store' },
    );
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}
