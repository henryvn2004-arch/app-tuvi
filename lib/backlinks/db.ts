// lib/backlinks/db.ts
// Helper REST DÙNG CHUNG cho 3 module backlink (prospecting/content/tracker)
// + route admin — cùng lối `lib/media/seeding.ts`, tách ra vì ở đây có BA
// bảng thay vì hai nên viết 3 lần dễ trôi khỏi nhau hơn.

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function headers(prefer?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

export function sbConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function sbGet<T>(qs: string): Promise<T[]> {
  if (!sbConfigured()) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${qs}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${qs}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Insert 1 dòng, trả dòng vừa ghi (hoặc `null` nếu server không trả gì — vd 409 unique). */
export async function sbInsert<T>(table: string, row: Record<string, unknown>): Promise<T | null> {
  if (!sbConfigured()) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers('return=representation'),
    body: JSON.stringify(row),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as T[];
  return rows[0] || null;
}

export async function sbPatch(table: string, filter: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!sbConfigured()) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers('return=minimal'),
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function sbDelete(table: string, filter: string): Promise<boolean> {
  if (!sbConfigured()) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: headers('return=minimal'),
  });
  return res.ok;
}
