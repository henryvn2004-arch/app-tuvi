// lib/nghiem-chung/db.ts — kho hồ sơ Nghiệm Chứng trong Supabase (nc_ho_so · nc_loai_tru · nc_claim).
// Schema: _patches/migration-nghiem-chung-db.sql. Chỉ chạy phía server (service key).
// Mọi GET đều `cache:'no-store'` — Next bọc fetch toàn cục, quên là đọc phải bản cũ (đã cắn 3 lần).
import { dem, datNguongIndex, type HoSoNghiemChung } from './index';

const URL_ = () => process.env.SUPABASE_URL || '';
const KEY = () => process.env.SUPABASE_SERVICE_KEY || '';

export interface MucDb {
  slug: string;
  ten: string;
  ngheNghiep: string;
  namSinh: number;
  anhCommons?: string;
  tyLeBM: number | null;
  tyLeDV: number | null;
  gioDoan?: string;
  indexed: boolean;
}

async function sb(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${URL_()}/rest/v1${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: KEY(),
      Authorization: `Bearer ${KEY()}`,
      ...((init.headers as Record<string, string>) || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

const coDb = () => !!URL_() && !!KEY();

/** Hồ sơ MỚI (do cron sinh). Lỗi DB → null + console.error, để trang rơi về 404 thay vì 500. */
export async function dbTaiHoSo(slug: string): Promise<HoSoNghiemChung | null> {
  if (!coDb()) return null;
  try {
    const r = await sb(`/nc_ho_so?slug=eq.${encodeURIComponent(slug)}&select=data&limit=1`);
    if (!r.ok) {
      console.error(`[nghiem-chung] đọc nc_ho_so ${slug}: ${r.status}`);
      return null;
    }
    const rows = r.body as { data: HoSoNghiemChung }[];
    return rows[0]?.data || null;
  } catch (e) {
    console.error(`[nghiem-chung] đọc nc_ho_so ${slug}:`, (e as Error).message);
    return null;
  }
}

export async function dbDanhMuc(): Promise<MucDb[]> {
  if (!coDb()) return [];
  const out: MucDb[] = [];
  try {
    for (let from = 0; ; from += 1000) {
      const r = await sb(
        `/nc_ho_so?select=slug,ten,nghe_nghiep,nam_sinh,anh_commons,ty_le_bm,ty_le_dv,gio_doan,indexed&order=slug.asc&limit=1000&offset=${from}`,
      );
      if (!r.ok) {
        console.error(`[nghiem-chung] đọc danh mục nc_ho_so: ${r.status}`);
        break;
      }
      const rows = r.body as {
        slug: string;
        ten: string;
        nghe_nghiep: string;
        nam_sinh: number;
        anh_commons: string | null;
        ty_le_bm: number | null;
        ty_le_dv: number | null;
        gio_doan: string | null;
        indexed: boolean;
      }[];
      for (const x of rows)
        out.push({
          slug: x.slug,
          ten: x.ten,
          ngheNghiep: x.nghe_nghiep,
          namSinh: x.nam_sinh,
          ...(x.anh_commons ? { anhCommons: x.anh_commons } : {}),
          tyLeBM: x.ty_le_bm,
          tyLeDV: x.ty_le_dv,
          ...(x.gio_doan ? { gioDoan: x.gio_doan } : {}),
          indexed: x.indexed,
        });
      if (rows.length < 1000) break;
    }
  } catch (e) {
    console.error('[nghiem-chung] đọc danh mục nc_ho_so:', (e as Error).message);
  }
  return out;
}

/** Slug đã có hồ sơ HOẶC đã bị loại trừ trong DB — cron dùng để khỏi làm lại. */
export async function dbDaXong(): Promise<Set<string>> {
  const s = new Set<string>();
  for (const bang of ['nc_ho_so', 'nc_loai_tru']) {
    for (let from = 0; ; from += 1000) {
      const r = await sb(`/${bang}?select=slug&order=slug.asc&limit=1000&offset=${from}`);
      if (!r.ok) throw new Error(`đọc ${bang}: ${r.status}`);
      const rows = r.body as { slug: string }[];
      for (const x of rows) s.add(x.slug);
      if (rows.length < 1000) break;
    }
  }
  return s;
}

export async function dbLuuHoSo(h: HoSoNghiemChung, qid: string): Promise<void> {
  const muc = h.gioDoan ? 'xac-dinh-gio-sinh' : 'nghiem-chung';
  const r = await sb('/nc_ho_so?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      slug: h.slug,
      qid,
      muc,
      ten: h.ten,
      nghe_nghiep: h.ngheNghiep,
      nam_sinh: Number(h.sinh.ngay.slice(0, 4)),
      anh_commons: h.anhCommons || null,
      ty_le_bm: dem(h.banMenh).tyLe,
      ty_le_dv: dem(h.daiVan).tyLe,
      gio_doan: h.gioDoan?.chon || null,
      indexed: datNguongIndex(h),
      data: h,
    }),
  });
  if (!r.ok) throw new Error(`ghi nc_ho_so ${h.slug}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
}

export async function dbLuuLoaiTru(slug: string, qid: string, lyDo: string, muc: 'nghiem-chung' | 'xac-dinh-gio-sinh'): Promise<void> {
  const r = await sb('/nc_loai_tru?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ slug, qid, ly_do: lyDo, muc }),
  });
  if (!r.ok) throw new Error(`ghi nc_loai_tru ${slug}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
}

// ── Mutex: một người chỉ một lượt cron xử lý cùng lúc ─────────────────────────────
// Chốt bằng INSERT trên PRIMARY KEY (slug) — ignore-duplicates trả hàng rỗng khi đã có người giữ.
// Lượt chết giữa chừng (`dang` quá STALE) hoặc lỗi tạm (`loi`, lan < LAN_TOI_DA) thì được giành lại
// bằng so-và-đặt nguyên tử (PATCH có điều kiện) — `lan` đếm số lần thử, hết LAN_TOI_DA thì bỏ.
const STALE_PHUT = 20;
export const LAN_TOI_DA = 3;

export async function dbGiu(slug: string): Promise<boolean> {
  const moi = await sb('/nc_claim?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ slug }),
  });
  if (!moi.ok) throw new Error(`giữ ${slug}: ${moi.status}`);
  if ((moi.body as unknown[]).length) return true;
  const r = await sb(`/nc_claim?slug=eq.${encodeURIComponent(slug)}&select=trang_thai,lan,claimed_at`);
  const c = (r.body as { trang_thai: string; lan: number; claimed_at: string }[])?.[0];
  if (!r.ok || !c || c.lan >= LAN_TOI_DA) return false;
  const treo = c.trang_thai === 'dang' && Date.now() - new Date(c.claimed_at).getTime() > STALE_PHUT * 60000;
  if (c.trang_thai !== 'loi' && !treo) return false;
  // So-và-đặt nguyên tử: chỉ thắng nếu hàng vẫn đúng như vừa đọc (`lan` + `claimed_at`). `lan` tăng ở ĐÂY
  // (mỗi lần giành lại), nên lượt chết giữa chừng — không bao giờ gọi dbLoi — vẫn bị đếm.
  const cu = await sb(
    `/nc_claim?slug=eq.${encodeURIComponent(slug)}&lan=eq.${c.lan}&claimed_at=eq.${encodeURIComponent(c.claimed_at)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ trang_thai: 'dang', claimed_at: new Date().toISOString(), lan: c.lan + 1 }),
    },
  );
  return cu.ok && (cu.body as unknown[]).length > 0;
}

export async function dbLoi(slug: string, loi: string): Promise<void> {
  await sb(`/nc_claim?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify({ trang_thai: 'loi', loi: loi.slice(0, 300) }),
  });
}

/** Slug còn giữ chỗ vĩnh viễn (hết lượt thử) — cron bỏ qua để khỏi kẹt đầu hàng. */
export async function dbHetLuot(): Promise<Set<string>> {
  const r = await sb(`/nc_claim?lan=gte.${LAN_TOI_DA}&select=slug&limit=1000`);
  return new Set(((r.body as { slug: string }[]) || []).map((x) => x.slug));
}
