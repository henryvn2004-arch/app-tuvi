// lib/channels/catalog.ts
// Danh mục công cụ cho menu "Công cụ" của kênh chat — CÙNG cách xếp nhóm với
// /app/cong-cu: nhóm = bảng `tool_groups` (tên, thứ tự), công cụ = `tool_pricing`
// (`app_path`, `home_rank`). Một công cụ thuộc nhóm theo đúng luật `groupsOf()`
// của public/tool-prices.js: `need_tags` khai rõ trước, không có thì nhóm mặc
// định suy từ `category` (`tool_groups.default_categories`). Đổi luật ở web thì
// sửa cả ở đây. Không chép tay nhóm/công cụ nào (luật `check:groups`).
// Nhớ 10 phút; đọc hụt → danh sách rỗng (menu tự lùi về link /app/cong-cu).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TTL_MS = 10 * 60_000;

export interface CatalogTool {
  toolId: string;
  label: string;
  path: string;
  /** `tool_pricing.is_free` — đọc thẳng cột, KHÔNG suy từ credits<=0 (xem priceLabel ở tool-prices.js). */
  isFree: boolean;
  description: string | null;
}
export interface CatalogGroup {
  key: string;
  title: string;
  tools: CatalogTool[];
}

interface GroupRow {
  key: string;
  title: string;
  default_categories: string | null;
}
interface ToolRow {
  tool_id: string;
  label: string | null;
  category: string | null;
  need_tags: string | null;
  app_path: string;
  home_rank: number | null;
  sort_order: number | null;
  is_free: boolean | null;
  description: string | null;
}

let cache: { at: number; groups: CatalogGroup[] } | null = null;

async function get<T>(path: string): Promise<T[] | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: 'no-store',
    headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${SUPABASE_KEY || ''}` },
  });
  if (!res.ok) {
    console.error('[catalog] đọc lỗi', path.split('?')[0], res.status);
    return null;
  }
  return (await res.json()) as T[];
}

const tach = (s: string | null) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export async function toolCatalog(): Promise<CatalogGroup[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.groups;
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const [gs, ts] = await Promise.all([
      get<GroupRow>('tool_groups?enabled=eq.true&select=key,title,default_categories&order=sort_order.asc'),
      get<ToolRow>(
        'tool_pricing?enabled=eq.true&app_path=not.is.null&select=tool_id,label,category,need_tags,app_path,home_rank,sort_order,is_free,description',
      ),
    ]);
    if (!gs || !ts) return [];
    const rank = (r: ToolRow) => [r.home_rank ?? 999, r.sort_order ?? 999];
    ts.sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1]);
    const groups: CatalogGroup[] = gs.map((g) => ({ key: g.key, title: g.title, tools: [] }));
    const known = new Set(gs.map((g) => g.key));
    for (const t of ts) {
      if (!t.app_path.startsWith('/')) continue;
      let keys = tach(t.need_tags).filter((k) => known.has(k));
      if (!keys.length && t.category) {
        const hit = gs.find((g) => tach(g.default_categories).includes(String(t.category).trim()));
        keys = hit ? [hit.key] : [];
      }
      for (const k of keys) {
        groups.find((g) => g.key === k)?.tools.push({
          toolId: t.tool_id,
          label: t.label || t.tool_id,
          path: t.app_path,
          isFree: t.is_free === true,
          description: t.description || null,
        });
      }
    }
    const out = groups.filter((g) => g.tools.length);
    cache = { at: Date.now(), groups: out };
    return out;
  } catch (e) {
    console.error('[catalog] đọc danh mục lỗi mạng', e);
    return [];
  }
}
